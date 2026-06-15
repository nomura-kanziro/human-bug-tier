const mongoose = require('mongoose');

const tierLikeSchema = new mongoose.Schema({
  tierListId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TierList',
    required: true,
    index: true,
  },
  voterKey: {
    type: String,
    required: true,
    trim: true,
  },
}, {
  timestamps: true,
});

tierLikeSchema.index({ tierListId: 1, voterKey: 1 }, { unique: true });

const TierLike = mongoose.model('TierLike', tierLikeSchema);

module.exports = TierLike;