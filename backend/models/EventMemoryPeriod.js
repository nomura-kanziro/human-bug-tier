const mongoose = require('mongoose');

/* ====== EventMemoryPeriod 스키마 ======
 * 이벤트 "메모리 게임"의 **기록 이벤트 한 회차**(= 순위를 겨루는 기간).
 *
 * 예전에는 "정산 안 된 완주 기록 전부"가 암묵적으로 한 기간이었고 게임은 언제나 열려 있었다.
 * 지금은 **관리자가 관리자 페이지에서 직접 열고 닫는다.** 열려 있는 회차가 있을 때만 게임을 시작할 수 있고,
 * 그 회차 동안의 완주 기록만 순위에 들어간다(EventMemorySession.periodId).
 *
 * 진행 흐름(관리자가 조작):
 *   draft   — 만들어만 둔 상태. 게임 불가.
 *   open    — 진행 중. endsAt 이 있으면 그 시각에 스케줄러가 closed 로 바꾼다.
 *   closed  — 기록 접수 끝. 순위는 확정됐고 상금 지급(정산)을 기다린다.
 *   settled — 1위에게 상금을 지급하고 알림을 보낸 상태.
 * 동시에 열려 있는 회차는 하나뿐이다(순위·상금이 섞이지 않게).
 */
const memoryWinnerSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  nickname: { type: String, required: true, trim: true },
  totalMs: { type: Number, required: true },
  awardedPoints: { type: Number, default: 0 },
}, { _id: false });

const eventMemoryPeriodSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  status: {
    type: String,
    enum: ['draft', 'open', 'closed', 'settled'],
    default: 'draft',
    index: true,
  },
  // 1위 상금. 요구사항이 "1000 이상"이라 컨트롤러가 1000 미만 입력을 막는다.
  awardPoints: { type: Number, default: 1000 },
  // 자동 마감 시각(선택). 비워 두면 관리자가 직접 닫을 때까지 열려 있다.
  endsAt: { type: Date, default: null },
  openedAt: { type: Date, default: null },
  closedAt: { type: Date, default: null },
  settledAt: { type: Date, default: null },
  winner: { type: memoryWinnerSchema, default: null },
}, {
  timestamps: true,
});

const EventMemoryPeriod = mongoose.model('EventMemoryPeriod', eventMemoryPeriodSchema);

module.exports = EventMemoryPeriod;
