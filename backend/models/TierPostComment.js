const mongoose = require('mongoose');

const tierPostCommentSchema = new mongoose.Schema({
  tierListId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TierList',
    required: true,
    index: true,
  },
  author: {
    type: String,
    required: true,
    trim: true,
  },
  authorEmail: {
    type: String,
    default: '',
    trim: true,
  },
  content: {
    type: String,
    required: true,
    trim: true,
  },
  ip: {
    type: String,
    default: 'unknown',
  },
  parentCommentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TierPostComment',
    default: null,
  },
  quotedUser: {
    type: String,
    default: '',
    trim: true,
  },
  quotedMessage: {
    type: String,
    default: '',
    trim: true,
  },
  reported: {
    type: Boolean,
    default: false,
  },
  reportReason: {
    type: String,
    default: '',
    trim: true,
  },
  reportDetail: {
    type: String,
    default: '',
    trim: true,
  },
}, {
  timestamps: true,
});

const TierPostComment = mongoose.model('TierPostComment', tierPostCommentSchema);

module.exports = TierPostComment;