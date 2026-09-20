const mongoose = require('mongoose');

/* ====== EventShowcaseEntry 스키마 ======
 * "제작한 티어표 공개" 이벤트에 유저가 낸 출품작 1건.
 * 회차당 유저 1명이 1개만 낼 수 있도록 {showcaseId, userId} 를 unique 로 묶는다.
 * 결과 발표 때 이 컬렉션을 훑어 참가자 전원에게 알림을 보낸다.
 * (EventShowcase 와 마찬가지로 아직 관리자 전용 — routes/eventRoutes.js 참고)
 */
const eventShowcaseEntrySchema = new mongoose.Schema({
  showcaseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EventShowcase',
    required: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // 알림 수신자를 닉네임으로 찾으므로(Notification.recipientNickname) 같이 저장해 둔다.
  nickname: { type: String, required: true, trim: true },
  // 출품한 커스텀 티어표 게시글
  tierListId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TierList',
    required: true,
  },
  title: { type: String, default: '' },
  thumbnail: { type: String, default: '' },
}, {
  timestamps: true,
});

// 회차당 1인 1작품
eventShowcaseEntrySchema.index({ showcaseId: 1, userId: 1 }, { unique: true });

const EventShowcaseEntry = mongoose.model('EventShowcaseEntry', eventShowcaseEntrySchema);

module.exports = EventShowcaseEntry;
