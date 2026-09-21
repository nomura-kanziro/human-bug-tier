const mongoose = require('mongoose');

/* ====== EventShowcase 스키마 ======
 * 이벤트 "제작한 티어표 공개" 한 회차. 회원이 커스텀 티어표를 출품하고, 다른 회원이 투표하고,
 * 결과 발표일에 우승자가 정해져 상금(포인트)이 지급된다.
 *
 * 진행 흐름(관리자가 관리자 페이지에서 조작):
 *   draft     — 만들어만 둔 상태. 회원에게는 보이지 않는다.
 *   scheduled — **접수 시작 예약**. opensAt 이 되면 스케줄러가 자동으로 open 으로 바꾼다. 회원에게는 "예정" 안내로 보인다.
 *   open      — 접수 중. 출품(제작해서 올리거나 이미 올린 게시글로 참가)과 투표가 모두 가능. deadlineAt 이 지나면 closed.
 *   closed    — 접수 마감. 새 출품은 못 하지만 **투표는 결과 공개일(revealAt)까지 계속**된다.
 *   revealed  — 결과 발표 완료. 우승자에게 상금이 지급되고 참가자·투표자 전원에게 알림이 나간다.
 *
 * 우승자 결정(winnerMode):
 *   votes  — 결과 공개일에 **투표 수가 가장 많은 작품**을 자동 집계해 발표(동률이면 먼저 출품한 작품).
 *            관리자가 미리 selectedEntryId 를 골라 두면 그 작품이 우선한다.
 *   manual — 관리자가 참가작 중에서 직접 선정해야 발표된다(선정 전에는 공개일이 지나도 "선정 대기"로 남는다).
 * 동시에 진행 중(scheduled/open/closed)인 회차는 하나뿐이다.
 */
const showcaseWinnerSchema = new mongoose.Schema({
  rank: { type: Number, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  nickname: { type: String, required: true, trim: true },
  entryId: { type: mongoose.Schema.Types.ObjectId, ref: 'EventShowcaseEntry' },
  tierListId: { type: mongoose.Schema.Types.ObjectId, ref: 'TierList' },
  title: { type: String, default: '' },
  votes: { type: Number, default: 0 },
  awardedPoints: { type: Number, default: 0 },
}, { _id: false });

const eventShowcaseSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'open', 'closed', 'revealed'],
    default: 'draft',
    index: true,
  },
  // 접수 시작 예약 시각(scheduled 일 때 의미). 지금 바로 열면 openedAt 만 찍힌다.
  opensAt: { type: Date, default: null },
  openedAt: { type: Date, default: null },
  // 접수 마감 시각. 이 시각이 지나면 출품 버튼이 닫힌다(스케줄러가 status 를 closed 로).
  deadlineAt: { type: Date, default: null },
  // 결과 공개 예정 시각(= 투표 종료 시각). 기본은 마감 + 30분이며 관리자가 바꿀 수 있다.
  revealAt: { type: Date, default: null },
  revealedAt: { type: Date, default: null },
  // 우승 상금(포인트). 우승자 1명의 LuckProfile.points 에 지급된다.
  awardPoints: { type: Number, default: 1000 },
  winnerMode: { type: String, enum: ['votes', 'manual'], default: 'votes' },
  // 관리자가 직접 고른 우승 작품(EventShowcaseEntry). 있으면 winnerMode 와 상관없이 이 작품이 우승한다.
  selectedEntryId: { type: mongoose.Schema.Types.ObjectId, ref: 'EventShowcaseEntry', default: null },
  winners: { type: [showcaseWinnerSchema], default: [] },
  // 발표와 함께 남기는 한마디(예: "투표가 없어 우승자 없음").
  resultNote: { type: String, default: '', trim: true },
}, {
  timestamps: true,
});

const EventShowcase = mongoose.model('EventShowcase', eventShowcaseSchema);

module.exports = EventShowcase;
