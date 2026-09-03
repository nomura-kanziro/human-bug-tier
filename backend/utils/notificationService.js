/* ====================================================================
 * 알림(Notification) 생성 서비스
 * ------------------------------------------------------------------
 * 헤더 알림 벨(Notification 모델)에 들어갈 알림 문서를 만드는 로직을 한 곳에
 * 모아둔다. 개별 라우트(댓글 작성, 문의 답변 등)는 아래 notify* 함수만 호출하면
 * 되고, "본인에게는 알림을 보내지 않는다" / "카테고리별 알림 설정을 존중한다"
 * 같은 공통 규칙은 createNotification() 내부에서 일괄 처리된다.
 * ==================================================================== */
const Notification = require('../models/Notification');
const User = require('../models/User');
const Admin = require('../models/Admin');
const { isSameAuthor, isTierListOwner, isCommentOwner } = require('./ownership');

// actor(알림을 유발한 행위자)를 { nickname, email } 형태로 통일한다.
// 호출부마다 문자열(닉네임만)로 넘기거나 객체로 넘기는 등 형태가 제각각이라
// 이후 로직(isSameAuthor 비교 등)에서 항상 같은 모양을 가정할 수 있도록 정규화한다.
function normalizeActor(actor) {
  if (!actor) return { nickname: '', email: '' };
  if (typeof actor === 'string') {
    return { nickname: actor.trim(), email: '' };
  }
  return {
    nickname: String(actor.nickname || actor.userId || '').trim(),
    email: String(actor.email || '').trim().toLowerCase(),
  };
}

// "수신자 = 행위자"인 경우(자기 글에 자기가 댓글을 다는 등)를 걸러내기 위한 체크.
// ownership.js의 isSameAuthor를 재사용하되, 수신자 정보를 그 함수가 기대하는
// record 형태(author/authorEmail/userId)로 감싸서 넘긴다.
function isSelfNotification(recipientNickname, recipientEmail, actor) {
  const normalizedActor = normalizeActor(actor);
  if (!normalizedActor.nickname && !normalizedActor.email) return false;

  return isSameAuthor(
    {
      author: recipientNickname,
      authorEmail: recipientEmail,
      userId: recipientNickname,
    },
    normalizedActor,
  );
}

// 알림 설정이 아예 없는 사용자(신규 가입 등)에게 적용할 기본값 — 전체 켜짐.
const DEFAULT_SETTINGS = {
  enabled: true,
  tierBoard: true,
  inquiry: true,
  noticeNews: true,
};

// 닉네임으로 알림 설정을 조회한다. 일반 회원(User)뿐 아니라 관리자(Admin) 계정도
// 알림을 받을 수 있으므로 User에서 못 찾으면 Admin 컬렉션도 확인한다.
// 저장된 notificationSettings는 일부 필드만 있을 수 있어 DEFAULT_SETTINGS와
// 스프레드로 병합해 누락된 필드는 기본값(켜짐)으로 채운다.
async function getUserSettings(nickname) {
  const trimmed = nickname.trim();
  const user = await User.findOne({ nickname: trimmed });
  if (user) return { ...DEFAULT_SETTINGS, ...(user.notificationSettings || {}) };

  const admin = await Admin.findOne({ name: trimmed });
  if (admin) return { ...DEFAULT_SETTINGS, ...(admin.notificationSettings || {}) };

  // 회원도 관리자도 아니면(탈퇴 등) 기본값 기준으로 판단
  return { ...DEFAULT_SETTINGS };
}

// 특정 카테고리(tierBoard/inquiry/noticeNews)의 알림이 이 사용자에게 켜져 있는지 확인.
// 전체 스위치(enabled)가 꺼져 있으면 카테고리와 무관하게 무조건 차단.
async function isNotificationEnabled(nickname, category) {
  const settings = await getUserSettings(nickname);
  if (!settings.enabled) return false;
  if (category === 'tierBoard') return settings.tierBoard !== false;
  if (category === 'inquiry') return settings.inquiry !== false;
  if (category === 'noticeNews') return settings.noticeNews !== false;
  return true;
}

// 알림 목록에서 미리보기로 보여줄 본문을 길이 제한해 자른다(DB 저장 용량도 절약).
function truncate(text, max = 80) {
  const value = (text || '').trim();
  if (value.length <= max) return value;
  return `${value.slice(0, max)}...`;
}

// 커스텀 티어 게시글 상세로 이동하는 딥링크 생성. commentId가 있으면 해당
// 댓글로 스크롤/포커스할 수 있도록 쿼리스트링에 함께 실어 보낸다.
function buildTierPostDetailLink(tierListId, commentId = null) {
  const id = encodeURIComponent(String(tierListId || '').trim());
  let link = `/custom-maker/custom-maker_post/post_detail.html?id=${id}`;
  if (commentId) {
    link += `&comment=${encodeURIComponent(String(commentId))}`;
  }
  return link;
}

// 문의(Contact_us) 상세로 이동하는 딥링크 생성. answerId가 있으면 해당 답변으로
// 바로 이동할 수 있게 함께 실어 보낸다.
function buildInquiryLink(inquiryId, answerId = null) {
  const id = encodeURIComponent(String(inquiryId || '').trim());
  let link = `/Contact_us/contact_us.html?inquiry=${id}`;
  if (answerId) {
    link += `&answer=${encodeURIComponent(String(answerId))}`;
  }
  return link;
}

// 모든 알림 생성의 최종 관문. 아래 notify* 함수들은 각자의 도메인 지식(누가 수신자인지,
// 어떤 링크로 보낼지)만 계산하고, 실제 저장 여부 판단(본인 제외·설정 확인)과
// Notification.create() 호출은 전부 여기서 공통 처리한다.
// 순서: 수신자 유효성 → 자기 자신에게 보내는 알림인지 → 카테고리 알림 설정 켜져 있는지
// 세 조건을 모두 통과해야 실제로 문서가 생성된다(하나라도 걸리면 null 반환, 에러 아님).
async function createNotification({
  recipientNickname,
  recipientEmail = '',
  type,
  category,
  actorNickname = '',
  actorEmail = '',
  actor = null,
  title,
  message = '',
  link = '',
  resourceId = null,
  resourceType = '',
}) {
  const recipient = (recipientNickname || '').trim();
  const normalizedActor = normalizeActor(actor || { nickname: actorNickname, email: actorEmail });

  if (!recipient) return null;
  if (isSelfNotification(recipient, recipientEmail, normalizedActor)) return null;
  if (!(await isNotificationEnabled(recipient, category))) return null;

  try {
    return await Notification.create({
      recipientNickname: recipient,
      recipientEmail: (recipientEmail || '').trim().toLowerCase(),
      type,
      category,
      actorNickname: normalizedActor.nickname,
      title,
      message: truncate(message),
      link,
      resourceId,
      resourceType,
    });
  } catch (err) {
    // 알림 생성 실패가 원래 하려던 동작(댓글 작성 등)까지 실패시켜서는 안 되므로
    // 예외를 여기서 삼키고 로그만 남긴 뒤 null을 반환한다(호출부는 알림 실패를 무시해도 안전).
    console.error('알림 생성 실패:', err.message);
    return null;
  }
}

// 문의에 관리자가 답변을 남겼을 때 문의 작성자에게 알림.
async function notifyInquiryAnswer(inquiry, actor, message, answerId = null) {
  const normalizedActor = normalizeActor(actor);
  const owner = (inquiry.userId || '').trim();
  if (!owner || isSameAuthor({ userId: owner }, normalizedActor)) return;

  await createNotification({
    recipientNickname: owner,
    type: 'inquiry_answer',
    category: 'inquiry',
    actor: normalizedActor,
    title: '문의사항에 새 답변이 달렸습니다',
    message,
    link: buildInquiryLink(inquiry._id, answerId),
    resourceId: answerId || inquiry._id,
    resourceType: answerId ? 'inquiryAnswer' : 'inquiry',
  });
}

// 문의 답변 본문에서 다른 회원이 @언급(인용)되었을 때 그 회원에게 알림.
async function notifyInquiryMention(quotedUser, actor, message, inquiryId, answerId = null) {
  const normalizedActor = normalizeActor(actor);
  const quoted = (quotedUser || '').trim();
  if (!quoted || isSameAuthor({ userId: quoted }, normalizedActor)) return;

  await createNotification({
    recipientNickname: quoted,
    type: 'inquiry_mention',
    category: 'inquiry',
    actor: normalizedActor,
    title: '문의사항 답변에서 회원님이 언급되었습니다',
    message,
    link: buildInquiryLink(inquiryId, answerId),
    resourceId: answerId || inquiryId,
    resourceType: answerId ? 'inquiryAnswer' : 'inquiry',
  });
}

// 커스텀 티어 게시글에 새 댓글이 달렸을 때 게시글 작성자에게 알림.
async function notifyTierPostComment(tierList, actor, content, commentId = null) {
  const normalizedActor = normalizeActor(actor);
  if (isTierListOwner(tierList, normalizedActor)) return;

  await createNotification({
    recipientNickname: tierList.author,
    recipientEmail: tierList.authorEmail,
    type: 'tier_post_comment',
    category: 'tierBoard',
    actor: normalizedActor,
    title: '내 게시글에 댓글이 달렸습니다',
    message: content,
    link: buildTierPostDetailLink(tierList._id, commentId),
    resourceId: commentId || tierList._id,
    resourceType: commentId ? 'tierComment' : 'tierList',
  });
}

// 댓글에 답글(대댓글)이 달렸을 때 원 댓글 작성자에게 알림.
async function notifyTierCommentReply(parentComment, actor, content, tierListId, commentId = null) {
  const normalizedActor = normalizeActor(actor);
  if (isCommentOwner(parentComment, normalizedActor)) return;

  await createNotification({
    recipientNickname: parentComment.author,
    recipientEmail: parentComment.authorEmail,
    type: 'tier_comment_reply',
    category: 'tierBoard',
    actor: normalizedActor,
    title: '내 댓글에 답글이 달렸습니다',
    message: content,
    link: buildTierPostDetailLink(tierListId, commentId),
    resourceId: commentId || parentComment._id,
    resourceType: 'tierComment',
  });
}

// 게시판 댓글 본문에서 다른 회원이 @언급(인용)되었을 때 그 회원에게 알림.
async function notifyTierCommentMention(quotedUser, actor, content, tierListId, commentId = null) {
  const normalizedActor = normalizeActor(actor);
  const quoted = (quotedUser || '').trim();
  if (!quoted || isSameAuthor({ author: quoted }, normalizedActor)) return;

  await createNotification({
    recipientNickname: quoted,
    type: 'tier_comment_mention',
    category: 'tierBoard',
    actor: normalizedActor,
    title: '게시판 댓글에서 회원님이 언급되었습니다',
    message: content,
    link: buildTierPostDetailLink(tierListId, commentId),
    resourceId: commentId || tierListId,
    resourceType: 'tierComment',
  });
}

// 새 공지/소식(Notice)이 등록되면 전체 회원에게 알림을 뿌린다(팬아웃).
// 회원 수만큼 createNotification 호출이 발생하므로 개별 실패(설정으로 인한 스킵 포함)가
// 다른 회원에게 영향을 주지 않도록 Promise.all로 병렬 처리한다.
// 유튜브 커뮤니티 동기화(youtubeCommunitySync.js)에서 새 글을 Notice로 만들 때도 이 함수를 호출한다.
async function broadcastNoticeNotification(notice) {
  const users = await User.find({}, 'nickname email notificationSettings');
  const type = notice.category === 'news' ? 'news' : 'notice';
  const title = notice.category === 'news' ? '새 소식이 등록되었습니다' : '새 공지가 등록되었습니다';

  await Promise.all(users.map((user) => createNotification({
    recipientNickname: user.nickname,
    recipientEmail: user.email,
    type,
    category: 'noticeNews',
    actorNickname: notice.author || '관리자',
    title,
    message: notice.title,
    link: `/notice/notice-detail.html?id=${notice._id}`,
    resourceId: notice._id,
    resourceType: 'notice',
  })));
}

module.exports = {
  DEFAULT_SETTINGS,
  getUserSettings,
  createNotification,
  notifyInquiryAnswer,
  notifyInquiryMention,
  notifyTierPostComment,
  notifyTierCommentReply,
  notifyTierCommentMention,
  broadcastNoticeNotification,
};