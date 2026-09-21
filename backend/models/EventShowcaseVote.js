const mongoose = require('mongoose');

/* ====== EventShowcaseVote 스키마 ======
 * "제작한 티어표 공개" 이벤트의 투표 1표.
 * 한 회차에서 **한 사람은 한 표**(showcaseId + voterId 유니크)이고, 다른 작품에 다시 투표하면 표가 옮겨 간다(같은 작품이면 취소).
 * 자기 작품에는 투표할 수 없다(컨트롤러에서 검사). 투표 수는 이 컬렉션을 집계해서 구한다(중복 카운터를 두지 않아 어긋날 일이 없다).
 */
const eventShowcaseVoteSchema = new mongoose.Schema({
  showcaseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EventShowcase',
    required: true,
    index: true,
  },
  entryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EventShowcaseEntry',
    required: true,
    index: true,
  },
  voterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // 결과 알림 수신자를 닉네임으로 찾으므로 같이 저장해 둔다(닉네임이 바뀌면 profileController 가 갱신).
  voterNickname: { type: String, required: true, trim: true },
}, {
  timestamps: true,
});

// 회차당 1인 1표
eventShowcaseVoteSchema.index({ showcaseId: 1, voterId: 1 }, { unique: true });

const EventShowcaseVote = mongoose.model('EventShowcaseVote', eventShowcaseVoteSchema);

module.exports = EventShowcaseVote;
