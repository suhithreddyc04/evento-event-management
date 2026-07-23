const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'log_reg_form', required: true },
    name: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
});

// One review per user per event — resubmitting edits the existing review instead of duplicating.
ReviewSchema.index({ event: 1, user: 1 }, { unique: true });

const ReviewModel = mongoose.model('Review', ReviewSchema);

module.exports = ReviewModel;
