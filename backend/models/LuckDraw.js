const mongoose = require('mongoose');

const luckDrawSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  nickname: {
    type: String,
    required: true,
    trim: true,
  },
  mode: {
    type: String,
    enum: ['daily_tier', 'random_char'],
    required: true,
  },
  tier: {
    type: Number,
    required: true,
    min: 1,
    max: 9,
  },
  characterName: {
    type: String,
    required: true,
    trim: true,
  },
  imagePath: {
    type: String,
    required: true,
    trim: true,
  },
  drawDate: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
});

// 1일 다회(최대 20회) 허용 — unique 아님. 당일 횟수 집계용 인덱스.
luckDrawSchema.index({ userId: 1, mode: 1, drawDate: 1 });
// 쿨다운(마지막 뽑기 시각) 조회용 인덱스.
luckDrawSchema.index({ userId: 1, mode: 1, createdAt: -1 });

const LuckDraw = mongoose.model('LuckDraw', luckDrawSchema);

module.exports = LuckDraw;
