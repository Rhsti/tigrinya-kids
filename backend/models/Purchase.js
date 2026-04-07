const mongoose = require('mongoose');

const PurchaseSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    email: { type: String },
    courseId: {
      type: String,
      required: true,
      enum: [
        'basic',
        'intermediate',
        'advanced',
        // Legacy IDs kept for backward compatibility with older purchase rows.
        'standard',
        'premium',
        'family',
        'mastery',
        'phonics',
        'reading',
        'conversation',
      ],
      index: true,
    },
    paymentId: { type: String, index: true },
    purchaseDate: { type: Date, default: Date.now },
    provider: { type: String, required: true, default: 'stripe' },
    checkoutSessionId: { type: String, required: true, unique: true, index: true },
    paymentIntentId: { type: String },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'usd' },
    status: { type: String, default: 'paid' },
    receiptUrl: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Purchase', PurchaseSchema);
