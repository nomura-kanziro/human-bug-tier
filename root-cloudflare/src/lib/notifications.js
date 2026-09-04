// ========================================================
// notifications.js — 알림 딥링크 처리 (바닐라 common.js 의 storeNotificationScrollTarget 계열 이식)
// ========================================================
// 서버가 알림에 저장한 link 는 바닐라 경로(post_detail.html?id=… 등)이다. 여기서
//   1) resourceId/resourceType 으로 빠진 comment/inquiry/answer 쿼리를 보충하고
//   2) 도착 페이지가 스크롤할 위치를 sessionStorage(notificationScrollTarget) 에 남긴 뒤
//   3) legacyToRoute() 로 React 라우트 경로를 돌려준다.
import { legacyToRoute } from './paths';

export const NOTIFICATION_SCROLL_KEY = 'notificationScrollTarget';

export const NOTIFICATION_LABELS = {
  tier_post_comment: '메이커 게시판',
  tier_comment_reply: '메이커 게시판',
  tier_comment_mention: '메이커 게시판',
  inquiry_answer: '문의사항',
  inquiry_mention: '문의사항',
  notice: '공지사항',
  news: '새 소식',
};

const NOTIFICATION_GROUPS = {
  notice: 'notice',
  news: 'notice',
  tier_post_comment: 'mention',
  tier_comment_reply: 'mention',
  tier_comment_mention: 'mention',
  inquiry_answer: 'mention',
  inquiry_mention: 'mention',
};

export function getNotificationGroup(type) {
  return NOTIFICATION_GROUPS[type] || 'event';
}

function enrichNotificationUrl(link, resourceId, resourceType) {
  if (!link) return null;
  try {
    const url = new URL(String(link).trim(), window.location.origin);
    if (url.pathname.includes('post_detail')) {
      if (!url.searchParams.get('comment') && resourceType === 'tierComment' && resourceId) {
        url.searchParams.set('comment', String(resourceId));
      }
    } else if (url.pathname.includes('contact_us')) {
      if (!url.searchParams.get('inquiry') && resourceType === 'inquiry' && resourceId) {
        url.searchParams.set('inquiry', String(resourceId));
      }
      if (!url.searchParams.get('answer') && resourceType === 'inquiryAnswer' && resourceId) {
        url.searchParams.set('answer', String(resourceId));
      }
    }
    return url;
  } catch {
    return null;
  }
}

// 반환: React 라우트 경로(문자열) 또는 null
export function resolveNotificationTarget(link, resourceId, resourceType) {
  const url = enrichNotificationUrl(link, resourceId, resourceType);
  if (!url) return null;

  const payload = { page: null };
  if (url.pathname.includes('post_detail')) {
    payload.page = 'tierPost';
    payload.postId = url.searchParams.get('id') || '';
    payload.commentId = url.searchParams.get('comment') || (resourceType === 'tierComment' ? String(resourceId || '') : '');
    if (payload.postId) sessionStorage.setItem('selectedPostId', payload.postId);
  } else if (url.pathname.includes('contact_us')) {
    payload.page = 'inquiry';
    payload.inquiryId = url.searchParams.get('inquiry') || (resourceType === 'inquiry' ? String(resourceId || '') : '');
    payload.answerId = url.searchParams.get('answer') || (resourceType === 'inquiryAnswer' ? String(resourceId || '') : '');
  } else if (url.pathname.includes('notice-detail')) {
    const id = url.searchParams.get('id');
    if (id && /^[a-fA-F0-9]{24}$/.test(id)) sessionStorage.setItem('selectedNoticeId', id);
  }
  if (payload.page) {
    try { sessionStorage.setItem(NOTIFICATION_SCROLL_KEY, JSON.stringify(payload)); } catch { /* ignore */ }
  }

  if (url.origin !== window.location.origin) return url.href;
  return legacyToRoute(`${url.pathname}${url.search}`);
}

export function getNotificationScrollTarget() {
  try {
    const raw = sessionStorage.getItem(NOTIFICATION_SCROLL_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearNotificationScrollTarget() {
  sessionStorage.removeItem(NOTIFICATION_SCROLL_KEY);
}
