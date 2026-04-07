const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { users } = require('../data/store');
const { hasRealSmtpConfig, sendWelcomeEmail, sendPasswordResetEmail } = require('../services/emailService');
const DEMO_MODE = process.env.ENABLE_DEMO_MODE === 'true';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Helper to get user from MongoDB or demo store
async function getUser(query) {
  // Get fresh store reference
  const store = require('../data/store');
  const demoUsers = store.users;
  const findByEmailFn = store.findUserByEmail;

  try {
    // Try MongoDB first
    const User = require('../models/User');
    const user = await User.findOne(query);
    if (user) {
      return { user, source: 'mongodb' };
    }
  } catch {
    // Fallback to demo mode if enabled.
  }

  // Fallback to shared demo store (only in demo mode)
  if (!DEMO_MODE) {
    return null;
  }

  if (query.email) {
    const user = findByEmailFn(query.email);
    if (user) {
      return { user, source: 'demo' };
    }
  }

  if (query._id) {
    if (demoUsers.has(query._id)) {
      return { user: demoUsers.get(query._id), source: 'demo' };
    }
  }

  return null;
}

// Helper to create user
async function createUser(email, password) {
  // Get fresh store reference
  const store = require('../data/store');
  const demoUsers = store.users;

  try {
    // Try MongoDB first
    const User = require('../models/User');
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ email, password: hashed });
    return { user, source: 'mongodb' };
  } catch {
    // Fallback to demo mode if enabled.
  }

  // Fallback to shared demo store (only in demo mode)
  if (!DEMO_MODE) {
    throw new Error('MongoDB create failed and demo mode is disabled');
  }

  const hashed = await bcrypt.hash(password, 10);
  const userId = `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const newUser = {
    _id: userId,
    id: userId,
    email,
    password: hashed,
    purchasedCourses: [],
    subscriptionActive: false,
    learnedLetters: []
  };
  demoUsers.set(userId, newUser);
  return { user: newUser, source: 'demo' };
}

async function persistAuthUser(user, source) {
  if (source === 'mongodb') {
    const User = require('../models/User');
    await User.findByIdAndUpdate(user._id, {
      learnedLetters: user.learnedLetters || [],
      courseProgress: user.courseProgress || {},
      resetPasswordToken: user.resetPasswordToken || null,
      resetPasswordExpires: user.resetPasswordExpires || null,
      password: user.password,
    });
    return;
  }

  users.set(user._id, user);
}

async function getUserByResetToken(tokenHash) {
  try {
    const User = require('../models/User');
    const mongoUser = await User.findOne({
      resetPasswordToken: tokenHash,
      resetPasswordExpires: { $gt: new Date() },
    });
    if (mongoUser) {
      return { user: mongoUser, source: 'mongodb' };
    }
  } catch {
    // Fallback to demo mode lookup.
  }

  if (!DEMO_MODE) {
    return null;
  }

  for (const user of users.values()) {
    const notExpired = user.resetPasswordExpires && new Date(user.resetPasswordExpires).getTime() > Date.now();
    if (user.resetPasswordToken === tokenHash && notExpired) {
      return { user, source: 'demo' };
    }
  }

  return null;
}

// POST /auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required' });

    // Check if user already exists
    const existing = await getUser({ email });
    if (existing) return res.status(400).json({ message: 'User already exists' });

    const result = await createUser(email, password);

    let welcomeEmailSent = false;
    try {
      welcomeEmailSent = await sendWelcomeEmail({
        toEmail: result.user.email,
        displayName: name,
      });
    } catch (emailErr) {
      console.warn('Welcome email failed:', emailErr.message);
    }

    const token = jwt.sign({ id: result.user._id, email: result.user.email }, process.env.JWT_SECRET || 'default-secret-key', { expiresIn: '1d' });

    res.status(201).json({
      message: 'User registered',
      userId: result.user._id,
      token,
      source: result.source,
      welcomeEmailSent,
      emailServiceConfigured: hasRealSmtpConfig(),
    });
  } catch (err) {
    console.error('Auth register failed:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const emailServiceConfigured = hasRealSmtpConfig();

    const result = await getUser({ email });
    if (!result) {
      return res.json({
        message: 'If the account exists, a reset email has been sent.',
        emailSent: false,
        emailServiceConfigured,
      });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    const user = result.user;
    user.resetPasswordToken = tokenHash;
    user.resetPasswordExpires = expiresAt;

    await persistAuthUser(user, result.source);

    const resetUrl = `${FRONTEND_URL}/reset-password?token=${encodeURIComponent(rawToken)}&email=${encodeURIComponent(email)}`;

    let emailSent = false;
    try {
      emailSent = await sendPasswordResetEmail({ toEmail: email, resetUrl });
    } catch (emailErr) {
      console.warn('Reset email failed:', emailErr.message);
    }

    const responsePayload = {
      message: 'If the account exists, a reset email has been sent.',
      emailSent,
      emailServiceConfigured,
    };

    // When SMTP is not configured, include the reset URL directly so the
    // frontend can redirect the user without needing email delivery.
    if (!emailServiceConfigured) {
      responsePayload.resetUrl = resetUrl;
    }

    return res.json(responsePayload);
  } catch (err) {
    console.error('Auth forgot password failed:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const token = String(req.body?.token || '').trim();
    const password = String(req.body?.password || '');

    if (!token || !password) {
      return res.status(400).json({ message: 'Token and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const result = await getUserByResetToken(tokenHash);

    if (!result) {
      return res.status(400).json({ message: 'Reset link is invalid or expired' });
    }

    const user = result.user;
    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

    await persistAuthUser(user, result.source);

    return res.json({ message: 'Password has been reset successfully' });
  } catch (err) {
    console.error('Auth reset password failed:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required' });

    let result = await getUser({ email });
    if (!result) {
      return res.status(400).json({ message: 'User not found' });
    }

    const { user } = result;

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ message: 'Wrong password' });

    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET || 'default-secret-key', { expiresIn: '1d' });
    res.json({ token, source: result.source });
  } catch (err) {
    console.error('Auth login failed:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /auth/learn - Save learned letter progress
router.post('/learn', async (req, res) => {
  try {
    const { letterId } = req.body;
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret-key');

    const result = await getUser({ _id: decoded.id });

    if (!result) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { user } = result;

    // Update learned letters
    if (!user.learnedLetters) {
      user.learnedLetters = [];
    }

    if (!user.learnedLetters.includes(letterId)) {
      user.learnedLetters.push(letterId);

      // Save to database or demo store
      if (result.source === 'mongodb') {
        const User = require('../models/User');
        await User.findByIdAndUpdate(user._id, { learnedLetters: user.learnedLetters });
      } else {
        users.set(user._id, user);
      }
    }

    res.json({ message: 'Progress saved', learnedLetters: user.learnedLetters });
  } catch (err) {
    console.error('Auth learn progress failed:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /auth/me - Get current user info including purchased courses
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret-key');
    const result = await getUser({ _id: decoded.id });

    if (!result) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { user } = result;
    res.json({
      email: user.email,
      name: user.name || '',
      avatarData: user.avatarData || '',
      learnedLetters: user.learnedLetters || [],
      purchasedCourses: user.purchasedCourses || [],
      subscriptionActive: user.subscriptionActive || false,
      purchaseDate: user.purchaseDate,
      createdAt: user.createdAt || null,
      source: result.source
    });
  } catch (err) {
    console.error('Auth me failed:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/course-progress/:courseId', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const { courseId } = req.params;

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret-key');
    const result = await getUser({ _id: decoded.id });

    if (!result) {
      return res.status(404).json({ message: 'User not found' });
    }

    const progress = result.user.courseProgress?.[courseId] || {
      completedLessons: [],
      lessonScores: {},
      lessonSteps: {},
      updatedAt: null,
    };

    return res.json(progress);
  } catch (err) {
    console.error('Auth get course progress failed:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.post('/course-progress/:courseId', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const { courseId } = req.params;

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret-key');
    const result = await getUser({ _id: decoded.id });

    if (!result) {
      return res.status(404).json({ message: 'User not found' });
    }

    const payload = req.body && typeof req.body === 'object' ? req.body : {};
    const progress = {
      completedLessons: Array.isArray(payload.completedLessons) ? payload.completedLessons : [],
      lessonScores: payload.lessonScores && typeof payload.lessonScores === 'object' ? payload.lessonScores : {},
      lessonSteps: payload.lessonSteps && typeof payload.lessonSteps === 'object' ? payload.lessonSteps : {},
      updatedAt: new Date().toISOString(),
    };

    const user = result.user;
    user.courseProgress = { ...(user.courseProgress || {}), [courseId]: progress };

    if (result.source === 'mongodb') {
      const User = require('../models/User');
      await User.findByIdAndUpdate(user._id, { courseProgress: user.courseProgress });
    } else {
      users.set(user._id, user);
    }

    return res.json({ message: 'Course progress saved', progress });
  } catch (err) {
    console.error('Auth save course progress failed:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// PUT /auth/profile - Update name and/or password
router.put('/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret-key');
    const result = await getUser({ _id: decoded.id });
    if (!result) return res.status(404).json({ message: 'User not found' });

    const { name, currentPassword, newPassword } = req.body || {};
    const user = result.user;

    // Validate name length
    if (name !== undefined) {
      const trimmed = String(name).trim();
      if (trimmed.length > 60) return res.status(400).json({ message: 'Name is too long' });
      user.name = trimmed;
    }

    // Handle password change
    if (newPassword !== undefined) {
      if (!currentPassword) return res.status(400).json({ message: 'Current password is required to set a new password' });
      if (String(newPassword).length < 6) return res.status(400).json({ message: 'New password must be at least 6 characters' });

      const valid = await bcrypt.compare(String(currentPassword), user.password);
      if (!valid) return res.status(400).json({ message: 'Current password is incorrect' });

      user.password = await bcrypt.hash(String(newPassword), 10);
    }

    if (result.source === 'mongodb') {
      const User = require('../models/User');
      await User.findByIdAndUpdate(user._id, { name: user.name, password: user.password });
    } else {
      users.set(user._id, user);
    }

    res.json({ message: 'Profile updated', name: user.name || '' });
  } catch (err) {
    console.error('Auth update profile failed:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /auth/avatar - Upload profile photo (base64 data URI)
router.post('/avatar', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret-key');
    const result = await getUser({ _id: decoded.id });
    if (!result) return res.status(404).json({ message: 'User not found' });

    const { avatarData } = req.body || {};
    if (!avatarData || typeof avatarData !== 'string') {
      return res.status(400).json({ message: 'No image data provided' });
    }

    // Validate it's a base64 data URI (jpeg or png only)
    if (!/^data:image\/(jpeg|png|webp);base64,/.test(avatarData)) {
      return res.status(400).json({ message: 'Invalid image format. Use JPEG, PNG, or WebP.' });
    }

    // Rough size guard: base64 of a 200x200 JPEG should be well under 100KB
    if (avatarData.length > 200 * 1024) {
      return res.status(400).json({ message: 'Image too large. Please use a smaller photo.' });
    }

    const user = result.user;
    user.avatarData = avatarData;

    if (result.source === 'mongodb') {
      const User = require('../models/User');
      await User.findByIdAndUpdate(user._id, { avatarData: user.avatarData });
    } else {
      users.set(user._id, user);
    }

    res.json({ message: 'Avatar updated', avatarData: user.avatarData });
  } catch (err) {
    console.error('Auth avatar upload failed:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

