const mongoose = require('mongoose');

/* ====== LuckPokerRound 스키마 ======
 * "행운 티어 포커" 한 판(딜 → 카드 선택 → 정산)을 담는 문서.
 *
 * 포커는 유저가 공개된 후보 카드 중 3장을 직접 골라 자기 패를 만들기 때문에,
 * 한 번의 요청으로 끝낼 수 없고 두 단계로 나뉜다.
 *   1) deal  — 서버가 후보 카드·자동 카드·딜러 카드를 "미리 전부" 뽑아 이 문서에 저장하고,
 *              유저에게는 공개 후보(choices)만 보여준다.
 *   2) play  — 유저가 고른 인덱스(picks)를 받아 이 문서에 저장된 카드로만 패를 만들어 정산한다.
 * 카드를 이렇게 먼저 확정해 두기 때문에, 프론트가 유리한 카드를 지어내 보내도 통하지 않는다
 * (서버는 "몇 번째 후보를 골랐는지"만 받고, 카드 값은 이 문서에서 읽는다).
 *
 * 배팅액은 deal 시점에 LuckProfile.points 에서 미리 빠진다(에스크로). 그래야 후보가
 * 마음에 들 때까지 딜을 다시 돌려보는 악용을 막을 수 있다 — 정산 때 승리면 원금 + 배당,
 * 무승부면 원금만 돌려주고, 패배면 돌려주지 않는다(= 배팅액 손실).
 * 유저당 status:'open' 문서는 최대 1건이며, 새 딜 요청이 와도 열린 판이 있으면 그 판을
 * 그대로 돌려준다(새로고침·재접속 시 이어서 진행하기 위함).
 */

// 카드 한 장 = 티어 숫자(1~9) + 무늬 id. 자체 _id 는 필요 없으므로 끈다.
const pokerCardSchema = new mongoose.Schema({
  tier: {
    type: Number,
    required: true,
  },
  suit: {
    type: String,
    required: true,
  },
}, { _id: false });

const luckPokerRoundSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  // deal 시점에 미리 차감한 배팅액. 정산은 이 값으로만 한다(중간에 바뀌지 않음).
  bet: {
    type: Number,
    required: true,
  },
  // 유저에게 공개하는 후보 카드(기본 5장). 이 중 3장이 내 패가 된다.
  choices: {
    type: [pokerCardSchema],
    required: true,
  },
  // 유저가 3장을 고른 뒤 자동으로 붙는 4·5번째 카드. 후보와 무관하게 따로 뽑는다.
  autoCards: {
    type: [pokerCardSchema],
    required: true,
  },
  // 딜러 패 5장. deal 시점에 이미 확정돼 있고, 정산 전까지 유저에게 내려보내지 않는다.
  dealerCards: {
    type: [pokerCardSchema],
    required: true,
  },
  // 유저가 고른 후보 인덱스(고른 순서대로). 정산 전에는 빈 배열.
  picks: {
    type: [Number],
    default: [],
  },
  // 'open' = 카드 선택 대기 중, 'settled' = 정산 완료(재정산 불가)
  status: {
    type: String,
    enum: ['open', 'settled'],
    default: 'open',
    index: true,
  },
}, {
  timestamps: true,
});

// 유저당 열려 있는 판은 1건까지 — 딜을 다시 돌려 후보를 고르는 악용을 막는다.
// (status 가 'settled' 인 과거 판은 얼마든지 쌓여도 되므로 partial 인덱스로 'open' 만 제한)
luckPokerRoundSchema.index(
  { userId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'open' } },
);

const LuckPokerRound = mongoose.model('LuckPokerRound', luckPokerRoundSchema);

module.exports = LuckPokerRound;
