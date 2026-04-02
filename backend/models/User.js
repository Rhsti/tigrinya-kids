const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  subscriptionActive: { type: Boolean, default: false },
  learnedLetters: { type: [String], default: [] },
  letterPracticeAnalytics: {
    totalAttempts: { type: Number, default: 0 },
    correctAttempts: { type: Number, default: 0 },
    perLetter: { type: mongoose.Schema.Types.Mixed, default: {} },
    history: { type: [mongoose.Schema.Types.Mixed], default: [] },
    updatedAt: { type: Date, default: null }
  },
  courseProgress: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  purchasedCourses: {
    type: [String],
    default: [],
    enum: ['basic', 'standard', 'premium', 'family', 'mastery', 'phonics', 'reading', 'conversation']
  },
  purchaseDate: { type: Date },
  resetPasswordToken: { type: String, default: null },
  resetPasswordExpires: { type: Date, default: null }
});

module.exports = mongoose.model('User', UserSchema);
