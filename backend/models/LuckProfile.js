const mongoose = require('mongoose');

// 뽑기 이력(LuckDraw)은 최근 5건만 남기고 자동 삭제되므로, 누적 포인트·총 횟수·
// 최고 티어·오늘 진행 상황은 이 컬렉션에 별도로 보관한다 (이력 삭제와 무관하게 유지).
const luckProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  points: {
    type: Number,
    default: 0,
  },
  totalDraws: {
    type: Number,
    default: 0,
  },
  tierCounts: {
    type: Object,
    default: () => ({}),
  },
  bestTier: {
    type: Number,
    default: null,
  },
  todayCount: {
    type: Number,
    default: 0,
  },
  todayDate: {
    type: String,
    default: '',
  },
  lastDrawAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

const LuckProfile = mongoose.model('LuckProfile', luckProfileSchema);

module.exports = LuckProfile;
