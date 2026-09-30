const mongoose = require('mongoose');

/* ====== LuckPointLog 스키마 ======
 * 행운 뽑기 포인트(LuckProfile.points)의 증감 원장. 포인트가 바뀌는 곳마다 1건씩 남긴다.
 * LuckProfile 은 "현재 잔액"만 들고 있어서, 언제 무엇으로 얼마가 늘고 줄었는지는 이 컬렉션으로만 알 수 있다.
 * 관리자 페이지 "행운 뽑기 관리"의 포인트 내역이 이 데이터를 보여준다(controllers/adminLuckController.js).
 *
 * 기록하는 곳(source) — utils/luckPointLog.js 의 recordPointChange() 한 곳을 거친다:
 *   daily_tier      오늘의 행운 티어 결과(티어별 증감)          controllers/luckDrawController.js
 *   poker_bet       행운 티어 포커 배팅 차감                    controllers/luckPokerController.js
 *   poker_payout    행운 티어 포커 정산 지급(승리·무승부)       controllers/luckPokerController.js
 *   ladder          랜덤 뽑기 라운드 정산(승리 +, 패배 -)       controllers/luckLadderController.js
 *   quiz            이벤트 매일 퀴즈 상금                       controllers/eventController.js
 *   memory_award    이벤트 메모리 기록 1위 상금                 controllers/eventController.js
 *   showcase_award  이벤트 티어표 공개 우승 상금                controllers/eventController.js
 *
 * delta 는 실제로 반영된 증감이다(포인트는 0 밑으로 내려가지 않으므로 계산값과 다를 수 있다).
 * 증감이 0 인 경우는 남기지 않는다. 이 원장은 기능이 추가된 뒤(2026-10)부터 쌓이며, 그 전 증감은 없다.
 */
const luckPointLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  source: {
    type: String,
    enum: ['daily_tier', 'poker_bet', 'poker_payout', 'ladder', 'quiz', 'memory_award', 'showcase_award'],
    required: true,
  },
  delta: { type: Number, required: true },
  // 이 증감이 반영된 직후의 잔액
  balanceAfter: { type: Number, required: true },
  // 사람이 읽는 한 줄 설명(예: "3티어 · 캐릭터명", "12회차 짝수 배팅 승리")
  detail: { type: String, default: '' },
  // 관련 문서 id(포커 판·랜덤 뽑기 배팅·퀴즈 기록 등). 없으면 null.
  refId: { type: mongoose.Schema.Types.ObjectId, default: null },
}, {
  timestamps: true,
});

// 유저별 최신순 조회(관리자 포인트 내역)
luckPointLogSchema.index({ userId: 1, createdAt: -1 });

const LuckPointLog = mongoose.model('LuckPointLog', luckPointLogSchema);

module.exports = LuckPointLog;
