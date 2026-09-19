const mongoose = require('mongoose');

/* ====== LuckLadderBet 스키마 ======
 * "랜덤 뽑기"(사다리 게임) 라운드 한 건에 유저가 건 배팅 1건.
 * 라운드당 유저 1명이 배팅 1건만 걸 수 있도록 {roundNo,userId} 를 unique 로 묶는다.
 * 라운드가 정산되기 전에는 settled:false, outcome/pointsDelta 는 비어 있다.
 */
const luckLadderBetSchema = new mongoose.Schema({
  roundNo: {
    type: Number,
    required: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // 'group'(묶음 티어) | 'parity'(홀짝) | 'exact'(같은 티어)
  betType: {
    type: String,
    enum: ['group', 'parity', 'exact'],
    required: true,
  },
  // group: '123'|'456'|'789', parity: 'odd'|'even', exact: '1'~'9'(문자열로 저장)
  betValue: {
    type: String,
    required: true,
  },
  bet: {
    type: Number,
    required: true,
  },
  // 배팅 시점의 배수를 그대로 저장 — 이후 배수표가 바뀌어도 이미 건 배팅은 영향받지 않는다.
  mult: {
    type: Number,
    required: true,
  },
  settled: {
    type: Boolean,
    default: false,
  },
  outcome: {
    type: String,
    enum: ['win', 'lose', null],
    default: null,
  },
  pointsDelta: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// 라운드당 유저 1배팅만 허용 — 중복 배팅 방지.
luckLadderBetSchema.index({ roundNo: 1, userId: 1 }, { unique: true });

const LuckLadderBet = mongoose.model('LuckLadderBet', luckLadderBetSchema);

module.exports = LuckLadderBet;
