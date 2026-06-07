const mongoose = require('mongoose');

const tierListSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  tierData: {
    type: Object,           // 프론트에서 보내는 전체 티어 데이터 (S, A, B, C... + 항목들)
    required: true
  },
  author: {
    type: String,           // 나중에 사용자 인증 넣을 때 username 또는 userId
    default: 'anonymous'
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  likeCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true          // createdAt, updatedAt 자동 생성
});

const TierList = mongoose.model('TierList', tierListSchema);

module.exports = TierList;