const mongoose = require('mongoose');

/* ====== Notification 스키마 ======
 * 헤더 알림(종 아이콘)에 표시되는 개별 알림 문서. 커스텀 티어 게시판 댓글/답글/멘션,
 * 문의 답변/멘션, 공지·뉴스 게시 등 서로 다른 이벤트를 하나의 컬렉션에 통합해서 담고,
 * type/category로 종류를 구분한다(notificationService가 이벤트 발생 시 생성).
 */
const notificationSchema = new mongoose.Schema({
  // 알림 수신자를 (userId가 아니라) 닉네임 문자열로 식별한다. 목록 조회가 항상
  // "내 닉네임 기준"으로 이뤄지므로 index를 걸어 조회 성능을 확보.
  recipientNickname: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  recipientEmail: {
    type: String,
    default: '',
    trim: true,
    lowercase: true,
  },
  // 알림의 세부 종류. category(아래)보다 더 구체적으로 어떤 이벤트인지 나타내며,
  // 프론트에서 알림별 문구/아이콘/딥링크 처리를 분기하는 데 사용된다.
  type: {
    type: String,
    required: true,
    enum: [
      'tier_post_comment',    // 내 커스텀 티어 게시글에 댓글이 달림
      'tier_comment_reply',   // 내 댓글에 답글이 달림
      'tier_comment_mention', // 댓글에서 내가 인용/멘션됨
      'inquiry_answer',       // 내 문의에 답변이 달림
      'inquiry_mention',      // 문의 답변에서 내가 인용/멘션됨
      'notice',                // 새 공지 게시
      'news',                  // 새 소식/뉴스 게시
    ],
  },
  // type을 상위 3개 카테고리로 묶은 값. User/Admin의 notificationSettings
  // (tierBoard / inquiry / noticeNews) 카테고리별 on-off 설정과 1:1로 대응되어,
  // 알림 생성 전에 수신자가 해당 카테고리 알림을 꺼뒀는지 확인하는 데 쓰인다.
  category: {
    type: String,
    required: true,
    enum: ['tierBoard', 'inquiry', 'noticeNews'],
  },
  actorNickname: {
    type: String,
    default: '',
    trim: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  message: {
    type: String,
    default: '',
    trim: true,
  },
  // 알림 클릭 시 이동할 상대 경로(딥링크). getBasePath 등으로 프론트에서 보정해 사용.
  link: {
    type: String,
    default: '',
    trim: true,
  },
  // 알림이 가리키는 대상 문서(TierList, TierPostComment, Inquiry 등)의 ObjectId.
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  // resourceId가 어떤 컬렉션/타입을 가리키는지 표시하는 문자열(예: 'tierList', 'comment').
  resourceType: {
    type: String,
    default: '',
    trim: true,
  },
  // 읽음 여부. 안읽은 알림 개수 배지 표시/필터링에 사용되므로 index를 걸어둠.
  read: {
    type: Boolean,
    default: false,
    index: true,
  },
}, {
  timestamps: true,
});

// "특정 유저의 안읽은 알림을 최신순으로" 조회하는 패턴(헤더 알림 드롭다운)에 맞춘
// 복합 인덱스. recipientNickname 단일 인덱스만으로는 read 필터 + createdAt 정렬을
// 함께 커버하지 못해 별도로 추가.
notificationSchema.index({ recipientNickname: 1, read: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;