const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { users } = require('../data/store');
const User = require('../models/User');
const Purchase = require('../models/Purchase');
const Course = require('../models/Course');
const defaultCourses = require('../data/defaultCourses');
const { enqueuePurchaseEmail } = require('../queue/emailQueue');
const store = require('../data/store');
const {
  validateStripeConfig,
  createStripeClient,
} = require('../utils/stripeConfig');
const DEMO_MODE = process.env.ENABLE_DEMO_MODE === 'true';
const REQUIRE_WEBHOOK_VERIFICATION = process.env.REQUIRE_WEBHOOK_VERIFICATION === 'true';

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const stripe = createStripeClient();

function ensureDemoUser(decoded, demoUsers) {
  if (!DEMO_MODE) {
    return null;
  }

  if (!decoded?.id || !String(decoded.id).startsWith('demo_')) {
    return null;
  }

  const recoveredUser = {
    _id: decoded.id,
    id: decoded.id,
    email: decoded.email || `${decoded.id}@demo.local`,
    password: '',
    purchasedCourses: [],
    learnedLetters: [],
    subscriptionActive: false
  };

  demoUsers.set(recoveredUser._id, recoveredUser);
  return recoveredUser;
}

const getCourseById = async (courseId) => {
  if (mongoose.connection.readyState === 1) {
    const dbCourse = await Course.findOne({ courseId, isActive: true }).lean();
    if (dbCourse) {
      return {
        id: dbCourse.courseId,
        title: dbCourse.title,
        description: dbCourse.description,
        price: dbCourse.price,
        currency: dbCourse.currency || 'usd',
      };
    }
  }

  const fallback = defaultCourses.find((c) => c.courseId === courseId && c.isActive);
  if (!fallback) return null;
  return {
    id: fallback.courseId,
    title: fallback.title,
    description: fallback.description,
    price: fallback.price,
    currency: fallback.currency || 'usd',
  };
};

const getActiveCourses = async () => {
  if (mongoose.connection.readyState === 1) {
    const dbCourses = await Course.find({ isActive: true }).sort({ price: 1 }).lean();
    if (dbCourses.length) {
      return dbCourses.map((c) => ({
        id: c.courseId,
        title: c.title,
        description: c.description,
        price: c.price,
        currency: c.currency || 'usd',
      }));
    }
  }

  return defaultCourses
    .filter((c) => c.isActive)
    .map((c) => ({
      id: c.courseId,
      title: c.title,
      description: c.description,
      price: c.price,
      currency: c.currency || 'usd',
    }));
};

const getAdminEmails = () =>
  String(process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);

const isMongoReady = () => mongoose.connection.readyState === 1;

const buildStoredPurchase = ({ user, course, checkoutSession, provider, receiptUrl }) => ({
  userId: String(user._id),
  email: user.email,
  courseId: course.id,
  provider,
  checkoutSessionId: checkoutSession.id,
  paymentIntentId: String(checkoutSession.payment_intent || ''),
  amount: (checkoutSession.amount_total || Math.round(course.price * 100)) / 100,
  currency: String(checkoutSession.currency || 'usd'),
  status: checkoutSession.payment_status || 'paid',
  receiptUrl: receiptUrl || null,
  createdAt: new Date().toISOString(),
});

const buildDemoCheckoutUrl = (courseId, sessionId) =>
  `${FRONTEND_URL}/checkout/success?provider=demo&session_id=${encodeURIComponent(sessionId)}&course=${encodeURIComponent(courseId)}&method=card`;

async function persistUserPurchase(user, userSource, courseId) {
  if (!user.purchasedCourses) {
    user.purchasedCourses = [];
  }

  if (!user.purchasedCourses.includes(courseId)) {
    user.purchasedCourses.push(courseId);
  }

  user.subscriptionActive = true;
  user.purchaseDate = new Date();

  if (userSource === 'mongodb') {
    await User.findByIdAndUpdate(user._id, {
      purchasedCourses: user.purchasedCourses,
      subscriptionActive: true,
      purchaseDate: user.purchaseDate,
    });
  } else {
    users.set(user._id, user);
  }
}

async function savePurchaseRecord({ user, course, checkoutSession, provider = 'stripe' }) {
  if (isMongoReady()) {
    const existing = await Purchase.findOne({ checkoutSessionId: checkoutSession.id });
    if (existing) {
      return existing;
    }
  } else {
    const existing = store.findPurchaseBySessionId(checkoutSession.id);
    if (existing) {
      return existing;
    }
  }

  let receiptUrl = null;
  if (provider === 'stripe' && stripe && checkoutSession.payment_intent) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(String(checkoutSession.payment_intent), {
        expand: ['latest_charge'],
      });
      receiptUrl = paymentIntent?.latest_charge?.receipt_url || null;
    } catch {
      receiptUrl = null;
    }
  }

  const purchaseData = buildStoredPurchase({ user, course, checkoutSession, provider, receiptUrl });
  purchaseData.paymentId = String(checkoutSession.payment_intent || checkoutSession.id || '');
  purchaseData.purchaseDate = new Date();

  if (!isMongoReady()) {
    if (!purchaseData._id) {
      purchaseData._id = `${provider}_${checkoutSession.id}`;
    }
    return store.addPurchase(purchaseData);
  }

  // Defensive guard: let Mongo generate ObjectId to avoid cast errors.
  if (Object.prototype.hasOwnProperty.call(purchaseData, '_id')) {
    delete purchaseData._id;
  }

  const purchase = await Purchase.create(purchaseData);

  return purchase;
}

const formatPurchaseCsv = (rows) => {
  const header = ['purchaseId', 'userId', 'email', 'courseId', 'provider', 'amount', 'currency', 'status', 'checkoutSessionId', 'paymentIntentId', 'receiptUrl', 'createdAt'];
  const escape = (v) => {
    const val = v == null ? '' : String(v);
    if (/[",\n]/.test(val)) return `"${val.replace(/"/g, '""')}"`;
    return val;
  };
  const lines = [header.join(',')];
  for (const row of rows) {
    lines.push([
      row._id,
      row.userId,
      row.email,
      row.courseId,
      row.provider,
      row.amount,
      row.currency,
      row.status,
      row.checkoutSessionId,
      row.paymentIntentId,
      row.receiptUrl,
      row.createdAt,
    ].map(escape).join(','));
  }
  return lines.join('\n');
};

const isAdminUser = (email) => {
  if (!email) return false;
  return getAdminEmails().includes(String(email).toLowerCase());
};

// Auth middleware - verifies JWT and attaches user to req.user
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    // Verify the JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret-key');

    // Get fresh reference to store
    const store = require('../data/store');
    const demoUsers = store.users;
    const findByEmail = store.findUserByEmail;

    let user = null;
    let source = 'unknown';

    // Try to find user in MongoDB first
    try {
      user = await User.findById(decoded.id);
      if (user) {
        source = 'mongodb';
      }
    } catch {
      // Continue to demo-mode fallback.
    }

    // Fallback to demo store if not found in MongoDB (demo mode only)
    if (!user && DEMO_MODE) {
      if (demoUsers.has(decoded.id)) {
        user = demoUsers.get(decoded.id);
        source = 'demo';
      }
    }

    // Also try finding by email if we have it in the decoded token
    if (!user && decoded.email) {
      try {
        user = await User.findOne({ email: decoded.email });
        if (user) {
          source = 'mongodb';
        }
      } catch {
        // Continue to demo-mode fallback.
      }

      if (!user && DEMO_MODE) {
        user = findByEmail(decoded.email);
        if (user) {
          source = 'demo';
        }
      }
    }

    if (!user && DEMO_MODE) {
      const recovered = ensureDemoUser(decoded, demoUsers);
      if (recovered) {
        user = recovered;
        source = 'demo';
      }
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Attach user to request
    req.user = user;
    req.userSource = source;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    if (err.name === 'JsonWebTokenError') {
      return res.status(403).json({ message: 'Invalid token' });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    return res.status(500).json({ message: 'Server error' });
  }
};

// GET /payment/my-courses - Get user's purchased courses
router.get('/my-courses', authenticateToken, async (req, res) => {
  try {
    const user = req.userSource === 'mongodb'
      ? await User.findById(req.user._id).lean()
      : req.user;
    res.json({
      purchasedCourses: user?.purchasedCourses || [],
      courses: await getActiveCourses(),
    });
  } catch (err) {
    console.error('Error fetching courses:', err);
    res.status(500).json({ message: 'Server error', purchasedCourses: [] });
  }
});

// GET /payment/public-config - expose non-sensitive payment readiness to frontend
router.get('/public-config', (req, res) => {
  const status = validateStripeConfig({ requireWebhook: false, requirePublishable: true });
  const stripeEnabled = Boolean(stripe && status.secretConfigured && status.publishableConfigured);
  const paymentsEnabled = stripeEnabled || DEMO_MODE;
  const checkoutMode = stripeEnabled ? 'stripe' : DEMO_MODE ? 'demo' : 'offline';

  return res.json({
    provider: 'stripe',
    paymentsEnabled,
    checkoutMode,
    stripeMode: status.mode,
    publishableConfigured: status.publishableConfigured,
    message: paymentsEnabled
      ? checkoutMode === 'demo'
        ? 'Demo checkout available for all courses.'
        : 'Checkout available'
      : 'Online checkout is temporarily unavailable.',
  });
});

// GET /payment/success - backward-compatible redirect for legacy checkout URLs
router.get('/success', (req, res) => {
  const queryStart = req.originalUrl.indexOf('?');
  const query = queryStart >= 0 ? req.originalUrl.slice(queryStart) : '';
  return res.redirect(302, `${FRONTEND_URL}/checkout/success${query}`);
});

// GET /payment/courses - list active course catalog
router.get('/courses', async (req, res) => {
  try {
    const courses = await getActiveCourses();
    res.json({ courses });
  } catch (err) {
    console.error('Error fetching course catalog:', err.message);
    res.status(500).json({ message: 'Failed to fetch courses' });
  }
});

// GET /payment/access/:courseId - access check for course content
router.get('/access/:courseId', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const user = req.userSource === 'mongodb'
      ? await User.findById(req.user._id).lean()
      : req.user;
    const purchased = Array.isArray(user?.purchasedCourses) && user.purchasedCourses.includes(courseId);

    if (!purchased) {
      return res.status(403).json({
        hasAccess: false,
        message: 'You must purchase this course to access the content.',
      });
    }

    return res.json({ hasAccess: true, courseId });
  } catch (err) {
    console.error('Error checking course access:', err.message);
    return res.status(500).json({ message: 'Failed to check access' });
  }
});

// GET /payment/my-receipts - list current user's purchase history
router.get('/my-receipts', authenticateToken, async (req, res) => {
  try {
    const records = isMongoReady()
      ? await Purchase.find({ userId: String(req.user._id) }).sort({ createdAt: -1 })
      : store.getPurchasesByUserId(String(req.user._id));
    res.json({ purchases: records });
  } catch (err) {
    console.error('Error fetching my receipts:', err.message);
    res.status(500).json({ message: 'Failed to fetch receipts' });
  }
});

// GET /payment/my-receipts/export.csv - download current user's receipt history
router.get('/my-receipts/export.csv', authenticateToken, async (req, res) => {
  try {
    const records = isMongoReady()
      ? await Purchase.find({ userId: String(req.user._id) }).sort({ createdAt: -1 })
      : store.getPurchasesByUserId(String(req.user._id));
    const csv = formatPurchaseCsv(records);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="my-receipts.csv"');
    return res.status(200).send(csv);
  } catch (err) {
    console.error('Error exporting my receipts:', err.message);
    return res.status(500).json({ message: 'Failed to export receipts' });
  }
});

// GET /payment/admin/purchases - admin purchase logs
router.get('/admin/access', authenticateToken, async (req, res) => {
  try {
    const isAdmin = isAdminUser(req.user.email);
    if (!isAdmin) {
      return res.status(403).json({ message: 'Admin access required', isAdmin: false });
    }

    return res.json({ isAdmin: true });
  } catch (err) {
    console.error('Error checking admin access:', err.message);
    return res.status(500).json({ message: 'Failed to check admin access' });
  }
});

// GET /payment/admin/purchases - admin purchase logs
router.get('/admin/purchases', authenticateToken, async (req, res) => {
  try {
    if (!isAdminUser(req.user.email)) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const page = Math.max(Number(req.query.page || 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 100);
    const skip = (page - 1) * limit;

    const allPurchases = isMongoReady()
      ? await Purchase.find({}).sort({ createdAt: -1 })
      : store.getAllPurchases();
    const total = allPurchases.length;
    const purchases = allPurchases.slice(skip, skip + limit);

    res.json({
      page,
      limit,
      total,
      purchases,
    });
  } catch (err) {
    console.error('Error fetching admin purchase logs:', err.message);
    res.status(500).json({ message: 'Failed to fetch purchase logs' });
  }
});

// GET /payment/admin/purchases/export.csv - admin downloadable receipt history
router.get('/admin/purchases/export.csv', authenticateToken, async (req, res) => {
  try {
    if (!isAdminUser(req.user.email)) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const purchases = isMongoReady()
      ? await Purchase.find({}).sort({ createdAt: -1 })
      : store.getAllPurchases();
    const csv = formatPurchaseCsv(purchases);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="purchase-history.csv"');
    return res.status(200).send(csv);
  } catch (err) {
    console.error('Error exporting admin purchase history:', err.message);
    return res.status(500).json({ message: 'Failed to export purchase history' });
  }
});

// POST /payment/create-stripe-session - Create Stripe checkout session
router.post('/create-stripe-session', authenticateToken, async (req, res) => {
  try {
    const { courseId, paymentMethod = 'card' } = req.body;
    const user = req.user;
    const allowedMethods = ['card'];

    if (!allowedMethods.includes(paymentMethod)) {
      return res.status(400).json({ message: 'Invalid payment method' });
    }

    const course = await getCourseById(courseId);
    if (!course) {
      return res.status(400).json({ message: 'Course not found' });
    }

    // Check if already purchased
    if (user.purchasedCourses && user.purchasedCourses.includes(courseId)) {
      return res.status(400).json({ message: 'Course already purchased' });
    }

    const stripeStatus = validateStripeConfig({ requireWebhook: false, requirePublishable: true });
    const stripeEnabled = Boolean(stripe && stripeStatus.secretConfigured && stripeStatus.publishableConfigured);

    if (!stripeEnabled) {
      if (!DEMO_MODE) {
        return res.status(503).json({
          message: 'Stripe is not configured correctly. Please check environment variables.',
        });
      }

      const demoSessionId = `demo_${courseId}_${Date.now()}`;
      const demoSession = {
        id: demoSessionId,
        payment_intent: demoSessionId,
        amount_total: Math.round(course.price * 100),
        currency: course.currency || 'usd',
        payment_status: 'paid',
      };

      await persistUserPurchase(user, req.userSource, courseId);
      const storedPurchase = await savePurchaseRecord({
        user,
        course,
        checkoutSession: demoSession,
        provider: 'demo',
      });

      try {
        const purchaseForEmail = storedPurchase?.toObject ? storedPurchase.toObject() : storedPurchase;
        await enqueuePurchaseEmail({
          toEmail: user.email,
          course,
          paymentMethod: 'card',
          receiptUrl: null,
          checkoutSessionId: demoSession.id,
          purchase: {
            purchaseId: purchaseForEmail?._id,
            email: purchaseForEmail?.email || user.email,
            courseId: purchaseForEmail?.courseId || course.id,
            courseTitle: course.title,
            provider: purchaseForEmail?.provider || 'demo',
            amount: purchaseForEmail?.amount ?? course.price,
            currency: purchaseForEmail?.currency || course.currency || 'usd',
            status: purchaseForEmail?.status || 'paid',
            checkoutSessionId: purchaseForEmail?.checkoutSessionId || demoSession.id,
            paymentIntentId: purchaseForEmail?.paymentIntentId || String(demoSession.payment_intent || ''),
            receiptUrl: purchaseForEmail?.receiptUrl || null,
            createdAt: purchaseForEmail?.createdAt || new Date().toISOString(),
          },
        });
      } catch (emailErr) {
        console.error('Demo purchase email failed:', emailErr.message);
      }

      return res.json({
        sessionId: demoSessionId,
        url: buildDemoCheckoutUrl(courseId, demoSessionId),
        paymentMethod: 'card',
        provider: 'demo',
      });
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: course.title },
            unit_amount: Math.round(course.price * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${FRONTEND_URL}/checkout/success?provider=stripe&session_id={CHECKOUT_SESSION_ID}&course=${courseId}&method=card`,
      cancel_url: `${FRONTEND_URL}/pricing?payment=cancelled&course=${courseId}`,
      client_reference_id: String(user._id),
      metadata: {
        userId: String(user._id),
        courseId,
        paymentMethod: 'card',
      },
    });

    return res.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
      paymentMethod: 'card',
      provider: 'stripe',
    });
  } catch (err) {
    console.error('Error creating session:', err.message || err);
    const isStripeAuthError =
      err?.type === 'StripeAuthenticationError' ||
      /Invalid API Key provided/i.test(String(err?.message || ''));

    if (isStripeAuthError) {
      return res.status(503).json({
        message: 'Stripe is not configured correctly. Please check environment variables.',
      });
    }

    res.status(500).json({ message: err.message || 'Server error' });
  }
});

// GET /payment/verify/:courseId - Verify purchase
router.get('/verify/:courseId', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { provider = 'stripe', session_id: sessionId } = req.query;
    const user = req.user;
    const course = await getCourseById(courseId);

    if (!course) {
      return res.status(400).json({ message: 'Course not found' });
    }

    if (provider === 'demo') {
      if (!DEMO_MODE) {
        return res.status(400).json({ message: 'Unsupported payment provider' });
      }

      if (!sessionId) {
        return res.status(400).json({ message: 'Missing demo session id' });
      }

      const purchaseRecord = isMongoReady()
        ? await Purchase.findOne({ checkoutSessionId: String(sessionId) }).lean()
        : store.findPurchaseBySessionId(String(sessionId));

      if (!purchaseRecord) {
        return res.status(404).json({ message: 'Demo purchase record not found' });
      }

      if (String(purchaseRecord.userId) !== String(user._id) || String(purchaseRecord.courseId) !== String(courseId)) {
        return res.status(403).json({ message: 'Payment verification mismatch' });
      }

      const freshUser = req.userSource === 'mongodb'
        ? await User.findById(user._id).lean()
        : req.user;

      return res.json({
        success: true,
        purchasedCourses: freshUser?.purchasedCourses || [],
        courseId,
        paymentMethod: 'card',
        receipt: {
          provider: 'demo',
          checkoutSessionId: purchaseRecord.checkoutSessionId,
          amount: purchaseRecord.amount,
          currency: purchaseRecord.currency || 'usd',
          receiptUrl: null,
        },
        accessUrl: `${FRONTEND_URL}/lessons/${courseId}`,
        emailSent: false,
      });
    }

    if (provider !== 'stripe') {
      return res.status(400).json({ message: 'Unsupported payment provider' });
    }

    const requireWebhook = REQUIRE_WEBHOOK_VERIFICATION;
    const stripeStatus = validateStripeConfig({ requireWebhook, requirePublishable: true });
    if (!stripe || !stripeStatus.secretConfigured || !stripeStatus.publishableConfigured || (requireWebhook && !stripeStatus.webhookConfigured)) {
      return res.status(503).json({
        message: 'Stripe is not configured correctly. Please check environment variables.',
      });
    }

    if (!sessionId) {
      return res.status(400).json({ message: 'Missing Stripe session id' });
    }

    const session = await stripe.checkout.sessions.retrieve(String(sessionId));
    if (!session || session.payment_status !== 'paid') {
      return res.status(400).json({ message: 'Stripe payment is not completed' });
    }

    const paidCourseId = session.metadata?.courseId;
    const paidUserId = session.metadata?.userId || session.client_reference_id;
    if (paidCourseId !== courseId || String(paidUserId) !== String(user._id)) {
      return res.status(403).json({ message: 'Payment verification mismatch' });
    }

    let purchaseRecord = await Purchase.findOne({ checkoutSessionId: String(sessionId) }).lean();
    let createdPurchaseInRequest = false;

    if (!purchaseRecord) {
      if (stripeStatus.webhookConfigured) {
        return res.json({
          success: false,
          pendingWebhook: true,
          message: 'Payment received. Waiting for secure confirmation from payment webhook.',
        });
      }

      await persistUserPurchase(user, req.userSource, courseId);
      const storedPurchase = await savePurchaseRecord({
        user,
        course,
        checkoutSession: session,
        provider: 'stripe',
      });
      purchaseRecord = storedPurchase?.toObject ? storedPurchase.toObject() : storedPurchase;
      createdPurchaseInRequest = true;
    }

    if (String(purchaseRecord.userId) !== String(user._id) || String(purchaseRecord.courseId) !== String(courseId)) {
      return res.status(403).json({ message: 'Payment verification mismatch' });
    }

    const freshUser = req.userSource === 'mongodb'
      ? await User.findById(user._id).lean()
      : req.user;

    if (createdPurchaseInRequest) {
      try {
        await enqueuePurchaseEmail({
          toEmail: purchaseRecord?.email || user.email,
          course,
          paymentMethod: 'card',
          receiptUrl: purchaseRecord?.receiptUrl || null,
          checkoutSessionId: session.id,
          purchase: {
            purchaseId: purchaseRecord?._id,
            email: purchaseRecord?.email || user.email,
            courseId: purchaseRecord?.courseId || course.id,
            courseTitle: course.title,
            provider: purchaseRecord?.provider || 'stripe',
            amount: purchaseRecord?.amount ?? course.price,
            currency: purchaseRecord?.currency || course.currency || 'usd',
            status: purchaseRecord?.status || 'paid',
            checkoutSessionId: purchaseRecord?.checkoutSessionId || session.id,
            paymentIntentId: purchaseRecord?.paymentIntentId || String(session.payment_intent || ''),
            receiptUrl: purchaseRecord?.receiptUrl || null,
            createdAt: purchaseRecord?.createdAt || new Date().toISOString(),
          },
        });
      } catch (emailErr) {
        console.error('Purchase email queue failed:', emailErr.message);
      }
    }

    res.json({
      success: true,
      purchasedCourses: freshUser?.purchasedCourses || [],
      courseId,
      paymentMethod: 'card',
      receipt: {
        provider: 'stripe',
        checkoutSessionId: session.id,
        amount: purchaseRecord.amount,
        currency: purchaseRecord.currency || 'usd',
        receiptUrl: purchaseRecord?.receiptUrl || null,
      },
      accessUrl: `${FRONTEND_URL}/lessons/${courseId}`,
      emailSent: true,
    });
  } catch (err) {
    console.error('Error verifying purchase:', err.message || err);
    const isStripeAuthError =
      err?.type === 'StripeAuthenticationError' ||
      /Invalid API Key provided/i.test(String(err?.message || ''));

    if (isStripeAuthError) {
      return res.status(503).json({
        message: 'Stripe is not configured correctly. Please check environment variables.',
      });
    }

    res.status(500).json({ message: err.message || 'Server error' });
  }
});

module.exports = router;

