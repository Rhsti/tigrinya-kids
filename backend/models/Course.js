const mongoose = require('mongoose');

const CourseSchema = new mongoose.Schema(
    {
        courseId: { type: String, required: true, unique: true, index: true },
        title: { type: String, required: true },
        description: { type: String, default: '' },
        price: { type: Number, required: true },
        currency: { type: String, default: 'usd' },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Course', CourseSchema);
