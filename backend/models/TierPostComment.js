const mongoose = require('mongoose');

/* ====== TierPostComment 스키마 ======
 * 커스텀 티어 게시글(TierList)에 달리는 댓글/답글 1건.
 * 별도 컬렉션으로 분리되어 있어 게시글 문서 크기가 댓글 수에 비례해 커지지 않는다.
 */
const tierPostCommentSchema = new mongoose.Schema({
  // 댓글이 달린 게시글. 게시글별 댓글 목록 조회를 위해 index 부여.
  tierListId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TierList',
    required: true,
    index: true,
  },
  author: {
    type: String,
    required: true,
    trim: true,
  },
  // 작성자 이메일. 닉네임만으로 본인 여부를 판별할 수 없는 경우(동명이인)를 대비해
  // isSameAuthor/isCommentOwner 판별에 함께 쓰이는 보조 식별자.
  authorEmail: {
    type: String,
    default: '',
    trim: true,
  },
  content: {
    type: String,
    required: true,
    trim: true,
  },
  ip: {
    type: String,
    default: 'unknown',
  },
  // 1단계 대댓글(답글) 기능을 위한 자기 참조 필드. 최상위 댓글은 null, 답글은 부모
  // 댓글의 _id를 가리킨다(별도의 답글 컬렉션 없이 같은 컬렉션 안에서 표현).
  // 부모 댓글이 삭제되면 컨트롤러가 이 parentCommentId로 연결된 대댓글들도
  // 함께 지우므로(TierPostComment.deleteMany({ $or: [{_id}, {parentCommentId}] })),
  // 답글만 남고 부모가 사라지는 상태는 발생하지 않는다.
  parentCommentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TierPostComment',
    default: null,
  },
  // "인용 답글" 기능용 필드 — 특정 유저의 말을 지목/인용하며 답할 때 원문 작성자/내용을
  // 그대로 복사해서 저장한다. parentCommentId(트리 구조)와는 독립적으로 존재할 수 있으며,
  // 최상위 댓글에서도 다른 댓글을 인용할 수 있다.
  quotedUser: {
    type: String,
    default: '',
    trim: true,
  },
  quotedMessage: {
    type: String,
    default: '',
    trim: true,
  },
  // 이 댓글에 대한 신고 상태(게시글 자체 신고와는 별개로 댓글 단위 신고 지원).
  reported: {
    type: Boolean,
    default: false,
  },
  reportReason: {
    type: String,
    default: '',
    trim: true,
  },
  reportDetail: {
    type: String,
    default: '',
    trim: true,
  },
}, {
  timestamps: true,
});

const TierPostComment = mongoose.model('TierPostComment', tierPostCommentSchema);

module.exports = TierPostComment;