const mongoose = require('mongoose');

/* ====== TierLike 스키마 ======
 * 커스텀 티어 게시글(TierList)에 대한 "좋아요" 1건을 나타내는 문서.
 * TierList.likeCount는 이 컬렉션의 문서 수를 집계해 캐시해두는 값이며(비정규화 카운터),
 * 실제 "누가 좋아요를 눌렀는지"의 원본 데이터는 이 컬렉션이 갖는다.
 */
const tierLikeSchema = new mongoose.Schema({
  // 좋아요가 눌린 대상 게시글. 게시글별 좋아요 목록/개수 조회를 위해 index 부여.
  tierListId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TierList',
    required: true,
    index: true,
  },
  // 좋아요를 누른 주체를 식별하는 키. 좋아요는 로그인 유저만 가능하며(비로그인은 401),
  // getVoterKey 헬퍼가 "email:xxx" / "admin:닉네임" / "nick:닉네임" 형태로 생성한다.
  // 이메일 우선 → 없으면 관리자/일반 유저 구분해 닉네임 기반으로 만들어, 일반 회원의
  // 닉네임이 우연히 "admin"이거나 서로 다른 유형의 유저 닉네임이 같아도 키가 충돌하지 않게 한다.
  voterKey: {
    type: String,
    required: true,
    trim: true,
  },
}, {
  timestamps: true,
});

// (게시글, 투표자) 조합이 유일하도록 강제 — 같은 사람이 같은 글에 좋아요를
// 중복으로 누르는 것을 DB 레벨에서 원천 차단(중복 클릭/중복 요청 방지).
tierLikeSchema.index({ tierListId: 1, voterKey: 1 }, { unique: true });

const TierLike = mongoose.model('TierLike', tierLikeSchema);

module.exports = TierLike;