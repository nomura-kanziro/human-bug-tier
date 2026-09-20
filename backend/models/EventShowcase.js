const mongoose = require('mongoose');

/* ====== EventShowcase 스키마 ======
 * 이벤트 "제작한 티어표 공개" 한 회차.
 *
 * ⚠ 2026-09-21 현재 **뼈대만 만들어 둔 상태이고 정식 공개는 하지 않았다.**
 * 라우터(routes/eventRoutes.js)에서 조회·참가·관리 전부 requireAdmin 으로 막혀 있어
 * 관리자만 들어갈 수 있다. 정식 오픈할 때 그 미들웨어만 바꾸면 된다.
 *
 * 진행 흐름(관리자가 조작):
 *   draft   — 만들어만 둔 상태. 참가 불가.
 *   open    — 참가 접수 중. deadlineAt 이 지나면 스케줄러가 closed 로 바꾼다.
 *   closed  — 접수 마감. 결과 공개를 기다리는 구간(revealAt 까지, 보통 30~60분).
 *             관리자가 원하면 기다리지 않고 바로 공개할 수 있다.
 *   revealed— 당첨자 발표 완료. 이때 참가자 전원에게 알림이 나간다.
 */
const showcaseWinnerSchema = new mongoose.Schema({
  rank: { type: Number, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  nickname: { type: String, required: true, trim: true },
  tierListId: { type: mongoose.Schema.Types.ObjectId, ref: 'TierList' },
  title: { type: String, default: '' },
}, { _id: false });

const eventShowcaseSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  status: {
    type: String,
    enum: ['draft', 'open', 'closed', 'revealed'],
    default: 'draft',
    index: true,
  },
  // 접수 마감 시각. 이 시각이 지나면 등록 버튼이 닫힌다(스케줄러가 status 를 closed 로).
  deadlineAt: { type: Date, default: null },
  // 결과 공개 예정 시각. 기본은 마감 + REVEAL_DELAY_MS(30분)이며 관리자가 바꿀 수 있다.
  revealAt: { type: Date, default: null },
  revealedAt: { type: Date, default: null },
  winners: { type: [showcaseWinnerSchema], default: [] },
  // 관리자가 발표와 함께 남기는 한마디(선택).
  resultNote: { type: String, default: '', trim: true },
}, {
  timestamps: true,
});

const EventShowcase = mongoose.model('EventShowcase', eventShowcaseSchema);

module.exports = EventShowcase;
