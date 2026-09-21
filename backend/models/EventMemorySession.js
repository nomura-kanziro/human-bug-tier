const mongoose = require('mongoose');

/* ====== EventMemorySession 스키마 ======
 * 이벤트 "메모리 게임" 한 판(3단계: 4×4 → 6×6 → 8×8).
 *
 * 기록이 곧 순위·포인트로 이어지므로 **걸린 시간을 프론트가 보내지 않는다.**
 * 서버가 시작 시각(startedAt)과 각 단계 통과 시각(stages[].clearedAt)을 자기 시계로 찍고,
 * 총 기록(totalMs)도 서버가 계산한다. 프론트는 "이 단계 다 맞췄다"는 신호만 보낸다.
 * 카드 배치도 서버가 만들어 내려준다(같은 판을 다시 받아 되돌려 보내는 식의 조작 방지).
 *
 * 완주하지 못하고 떠난 판은 status:'playing' 으로 남는다 — 순위 집계는 'done' 만 본다.
 */
const memoryStageSchema = new mongoose.Schema({
  size: { type: Number, required: true },   // 4 | 6 | 8 (한 변의 칸 수)
  clearedAt: { type: Date, required: true },
  ms: { type: Number, required: true },      // 이 단계에만 걸린 시간
}, { _id: false });

const eventMemorySessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  // 이 판이 속한 기록 이벤트 회차(EventMemoryPeriod). 관리자가 연 회차 동안의 판만 만들어지고, 순위는 회차별로 집계한다.
  periodId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EventMemoryPeriod',
    default: null,
    index: true,
  },
  // 순위표에 보여줄 이름. 닉네임이 바뀌면 profileController 가 여기까지 갱신한다.
  nickname: { type: String, required: true, trim: true },
  startedAt: { type: Date, required: true },
  // 지금 풀고 있는 단계(0=4×4, 1=6×6, 2=8×8). 완주하면 STAGE_SIZES.length 가 된다.
  stageIndex: { type: Number, default: 0 },
  stages: { type: [memoryStageSchema], default: [] },
  // 단계별 카드 배치(서버가 만든 정답표). 프론트에는 이미지 배열만 내려가고 여기 값이 정본이다.
  decks: { type: [[String]], default: [] },
  totalMs: { type: Number, default: null },
  finishedAt: { type: Date, default: null },
  status: {
    type: String,
    enum: ['playing', 'done'],
    default: 'playing',
    index: true,
  },
  // 관리자가 회차를 정산(상금 지급)하면 1위 기록에 그 시각이 찍힌다. (회차 도입 전에는 기간을 닫는 표시로도 썼다)
  settledAt: { type: Date, default: null },
  awardedPoints: { type: Number, default: 0 },
}, {
  timestamps: true,
});

// 순위표: 한 회차의 완주 기록을 빠른 순으로.
eventMemorySessionSchema.index({ periodId: 1, status: 1, totalMs: 1 });
// (예전 방식 — 회차 도입 전 기록 조회용)
eventMemorySessionSchema.index({ status: 1, settledAt: 1, totalMs: 1 });

const EventMemorySession = mongoose.model('EventMemorySession', eventMemorySessionSchema);

module.exports = EventMemorySession;
