const Notification = require('../models/Notification');
const User = require('../models/User');
const Admin = require('../models/Admin');
const { isSameAuthor, isTierListOwner, isCommentOwner } = require('./ownership');

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

const DEFAULT_SETTINGS = {
  enabled: true,
  tierBoard: true,
  inquiry: true,
  noticeNews: true,
};

async function getUserSettings(nickname) {
  const trimmed = nickname.trim();
  const user = await User.findOne({ nickname: trimmed });
  if (user) return { ...DEFAULT_SETTINGS, ...(user.notificationSettings || {}) };

  const admin = await Admin.findOne({ name: trimmed });
  if (admin) return { ...DEFAULT_SETTINGS, ...(admin.notificationSettings || {}) };

  return { ...DEFAULT_SETTINGS };
}

async function isNotificationEnabled(nickname, category) {
  const settings = await getUserSettings(nickname);
  if (!settings.enabled) return false;
  if (category === 'tierBoard') return settings.tierBoard !== false;
  if (category === 'inquiry') return settings.inquiry !== false;
  if (category === 'noticeNews') return settings.noticeNews !== false;
  return true;
}

function truncate(text, max = 80) {
  const value = (text || '').trim();
  if (value.length <= max) return value;
  return `${value.slice(0, max)}...`;
}

function buildTierPostDetailLink(tierListId, commentId = null) {
  const id = encodeURIComponent(String(tierListId || '').trim());
  let link = `/custom-maker/custom-maker_post/post_detail.html?id=${id}`;
  if (commentId) {
    link += `&comment=${encodeURIComponent(String(commentId))}`;
  }
  return link;
}

function buildInquiryLink(inquiryId, answerId = null) {
  const id = encodeURIComponent(String(inquiryId || '').trim());
  let link = `/Contact_us/contact_us.html?inquiry=${id}`;
  if (answerId) {
    link += `&answer=${encodeURIComponent(String(answerId))}`;
  }
  return link;
}

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
    console.error('알림 생성 실패:', err.message);
    return null;
  }
}

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