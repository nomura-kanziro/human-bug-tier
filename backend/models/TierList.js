const mongoose = require('mongoose');

const tierListSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
    default: '',
  },
  tierData: {
    type: Object,
    required: true,
  },
  author: {
    type: String,
    default: 'anonymous',
  },
  authorEmail: {
    type: String,
    default: '',
  },
  thumbnail: {
    type: String,
    default: '',
  },
  isPublic: {
    type: Boolean,
    default: true,
  },
  tags: [{
    type: String,
    trim: true,
  }],
  likeCount: {
    type: Number,
    default: 0,
  },
  viewCount: {
    type: Number,
    default: 0,
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

const TierList = mongoose.model('TierList', tierListSchema);

module.exports = TierList;