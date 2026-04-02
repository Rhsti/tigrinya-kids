const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

const createEmptyAnalytics = () => ({
  totalAttempts: 0,
  correctAttempts: 0,
  perLetter: {},
  history: [],
  updatedAt: new Date().toISOString(),
});

function sanitizeAnalytics(input) {
  const source = input && typeof input === "object" ? input : {};
  const totalAttempts = Number(source.totalAttempts || 0);
  const correctAttempts = Number(source.correctAttempts || 0);
  const safeTotal = Number.isFinite(totalAttempts) && totalAttempts > 0 ? Math.floor(totalAttempts) : 0;
  const safeCorrect = Number.isFinite(correctAttempts) && correctAttempts > 0 ? Math.min(Math.floor(correctAttempts), safeTotal) : 0;

  const perLetter = {};
  const rawPerLetter = source.perLetter && typeof source.perLetter === "object" ? source.perLetter : {};
  Object.entries(rawPerLetter).forEach(([letterId, stats]) => {
    const attempts = Number(stats?.attempts || 0);
    const correct = Number(stats?.correct || 0);
    const safeAttempts = Number.isFinite(attempts) && attempts > 0 ? Math.floor(attempts) : 0;
    const safeLetterCorrect = Number.isFinite(correct) && correct > 0 ? Math.min(Math.floor(correct), safeAttempts) : 0;
    if (safeAttempts > 0) {
      perLetter[letterId] = { attempts: safeAttempts, correct: safeLetterCorrect };
    }
  });

  const history = Array.isArray(source.history)
    ? source.history
      .slice(0, 50)
      .map((entry) => ({
        id: String(entry?.id || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`),
        letterId: String(entry?.letterId || "unknown"),
        type: String(entry?.type || "quiz"),
        correct: Boolean(entry?.correct),
        timestamp: entry?.timestamp || new Date().toISOString(),
      }))
    : [];

  return {
    totalAttempts: safeTotal,
    correctAttempts: safeCorrect,
    perLetter,
    history,
    updatedAt: new Date().toISOString(),
  };
}

// Demo letters - Extended Tigrinya alphabet
const letters = [
  { id: "h1", char: "ሀ", word: "ህበይ", meaning: "monkey", img: "/img/letter-words/monkey.jpg", sound: "/audio/tigrinya-er/h1.mp3" },
  { id: "l1", char: "ለ", word: "ለሚን", meaning: "citron", img: "/img/letter-words/Citron.jpg", sound: "" },
  { id: "hh1", char: "ሐ", word: "ሓርማዝ", meaning: "olifant", img: "/img/letter-words/olifant.jpg", sound: "" },
  { id: "m1", char: "መ", word: "ማይ", meaning: "water", img: "/img/letter-words/water.jpg", sound: "" },
  { id: "ss1", char: "ሠ", word: "ሰማይ", meaning: "sky", img: "/img/letter-words/sky.jpg", sound: "" },
  { id: "r1", char: "ረ", word: "ሩዝ", meaning: "rice", img: "/img/letter-words/rice.jpg", sound: "" },
  { id: "s1", char: "ሰ", word: "ሰላም", meaning: "peace", img: "/img/letter-words/hello.png", sound: "" },
  { id: "sh1", char: "ሸ", word: "ሸበጥ", meaning: "slipper", img: "/img/letter-words/slipper.png", sound: "" },
  { id: "q1", char: "ቀ", word: "ቀሺ", meaning: "priest", img: "/img/letter-words/priest.jpg", sound: "" },
  { id: "b1", char: "በ", word: "በጊዕ", meaning: "sheep", img: "/img/letter-words/sheep.svg", sound: "/audio/tigrinya-er/b1.mp3" },
  { id: "t1", char: "ተ", word: "ተማሃራይ", meaning: "student", img: "/img/letter-words/student.jpg", sound: "/audio/tigrinya-er/t1.mp3" },
  { id: "ch1", char: "ቸ", word: "ቸኮሌት", meaning: "chocolate", img: "/img/letter-words/chocolate.jpg", sound: "" },
  { id: "kh1", char: "ኀ", word: "ኀብሪ", meaning: "color", img: "/img/letter-words/color.jpg", sound: "" },
  { id: "n1", char: "ነ", word: "ንጉስ", meaning: "king", img: "/img/letter-words/king.svg", sound: "" },
  { id: "gn1", char: "ኘ", word: "ዳኛ", meaning: "judge", img: "/img/letter-words/judge.jpg", sound: "" },
  { id: "a1", char: "ኣ", word: "ኣቦ", meaning: "father", img: "/img/letter-words/father.jpg", sound: "/audio/tigrinya-er/a1.mp3" },
  { id: "k1", char: "ከ", word: "ከልቢ", meaning: "dog", img: "/img/letter-words/dog.jpg", sound: "" },
  { id: "x1", char: "ኸ", word: "ኾኾብ", meaning: "star", img: "/img/letter-words/star.jpg", sound: "" },
  { id: "w1", char: "ወ", word: "ወረቐት", meaning: "paper", img: "/img/letter-words/paper.jpg", sound: "" },
  { id: "aa1", char: "ዐ", word: "ዓይኒ", meaning: "eye", img: "/img/letter-words/eye.jpg", sound: "" },
  { id: "z1", char: "ዘ", word: "ዘይቲ", meaning: "oil", img: "/img/letter-words/oil.jpg", sound: "" },
  // { id: "zh1", char: "ዠ", word: "ዠምቡ", meaning: "bee", img: "/img/letter-words/default.svg", sound: "" },
  { id: "y1", char: "የ", word: "የማን", meaning: "right", img: "/img/letter-words/right.jpg", sound: "" },
  { id: "d1", char: "ደ", word: "ድሙ", meaning: "cat", img: "/img/letter-words/cat.jpg", sound: "/audio/tigrinya-er/d1.mp3" },
  { id: "j1", char: "ጀ", word: "ጀበና", meaning: "coffee pot", img: "/img/letter-words/coffee.jpg", sound: "" },
  { id: "g1", char: "ገ", word: "ገዛ", meaning: "house", img: "/img/letter-words/house.svg", sound: "/audio/tigrinya-er/g1.mp3" },
  { id: "tt1", char: "ጠ", word: "ጣፍ", meaning: "teff", img: "/img/letter-words/teff.jpg", sound: "" },
  { id: "chh1", char: "ጨ", word: "ጨው", meaning: "salt", img: "/img/letter-words/salt.jpg", sound: "" },
  // { id: "ph1", char: "ጰ", word: "ጵና", meaning: "cheek", img: "/img/letter-words/default.svg", sound: "" },
  { id: "ts1", char: "ጸ", word: "ጸባ", meaning: "milk", img: "/img/letter-words/milk.jpg", sound: "" },
  { id: "tss1", char: "ፀ", word: "ፀሓይ", meaning: "sun", img: "/img/letter-words/sun.jpeg", sound: "" },
  { id: "f1", char: "ፈ", word: "ፈረስ", meaning: "horse", img: "/img/letter-words/horse.jpg", sound: "/audio/tigrinya-er/f1.mp3" },
  { id: "p1", char: "ፐ", word: "ፓፓዮ", meaning: "papaya", img: "/img/letter-words/papaya.jpg", sound: "" },
  { id: "v1", char: "ቨ", word: "ቪድዮ", meaning: "video", img: "/img/letter-words/video.jpg", sound: "" },
];

// Helper to get user from MongoDB or demo store
async function getUser(query) {
  try {
    const User = require('../models/User');
    const user = await User.findOne(query);
    if (user) {
      return { user, source: 'mongodb' };
    }
  } catch (err) {
    console.log('MongoDB not available, using demo mode');
  }

  // Fallback to demo store
  const { users } = require('../data/store');
  const userId = query.email ? Array.from(users.values()).find(u => u.email === query.email)?._id : query._id;
  if (userId && users.has(userId)) {
    return { user: users.get(userId), source: 'demo' };
  }

  return null;
}

// GET /letters - Get all available letters
router.get("/", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    let learnedLetters = [];

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret-key');
        const result = await getUser({ _id: decoded.id });
        if (result && result.user.learnedLetters) {
          learnedLetters = result.user.learnedLetters;
        }
      } catch (err) {
        // Invalid token, continue without learned letters
      }
    }

    // Return letters with learned status
    const lettersWithStatus = letters.map(letter => ({
      ...letter,
      learned: learnedLetters.includes(letter.id)
    }));

    res.json(lettersWithStatus);
  } catch (err) {
    console.error('Error fetching letters:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /letters/learned - Save a learned letter
router.post("/learned", async (req, res) => {
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

    // Initialize learnedLetters if not exists
    if (!user.learnedLetters) {
      user.learnedLetters = [];
    }

    // Add letter if not already learned
    if (!user.learnedLetters.includes(letterId)) {
      user.learnedLetters.push(letterId);

      // Update in database or demo store
      if (result.source === 'mongodb') {
        const User = require('../models/User');
        await User.findByIdAndUpdate(user._id, { learnedLetters: user.learnedLetters });
      } else {
        const { users } = require('../data/store');
        users.set(user._id, user);
      }
    }

    res.json({
      message: 'Learned recorded',
      learnedLetters: user.learnedLetters
    });
  } catch (err) {
    console.error('Error saving learned letter:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get("/analytics", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "default-secret-key");
    const result = await getUser({ _id: decoded.id });
    if (!result) {
      return res.status(404).json({ message: "User not found" });
    }

    const analytics = sanitizeAnalytics(result.user.letterPracticeAnalytics || createEmptyAnalytics());
    return res.json(analytics);
  } catch (err) {
    console.error("Error fetching analytics:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

router.post("/analytics", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "default-secret-key");
    const result = await getUser({ _id: decoded.id });
    if (!result) {
      return res.status(404).json({ message: "User not found" });
    }

    const sanitized = sanitizeAnalytics(req.body || {});
    const { user } = result;
    user.letterPracticeAnalytics = sanitized;

    if (result.source === "mongodb") {
      const User = require("../models/User");
      await User.findByIdAndUpdate(user._id, { letterPracticeAnalytics: sanitized });
    } else {
      const { users } = require("../data/store");
      users.set(user._id, user);
    }

    return res.json({ message: "Analytics saved", analytics: sanitized });
  } catch (err) {
    console.error("Error saving analytics:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;

