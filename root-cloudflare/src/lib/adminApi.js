// 관리자 대시보드 공용 유틸 (admin/comments/comment-management.js 이식)
// API 호출은 전부 adminRequest(= adminAuthToken + 서버 requireAdmin)를 쓴다.
import { adminRequest, apiRequest } from './api';

export const NOTICE_CATEGORY_LABELS = { notice: '전체 공지', news: '새 소식' };
// 서버도 동일한 제한을 두므로 이 값은 UI 에서 고정 버튼을 미리 비활성화하는 용도로만 쓴다
export const MAX_PINNED_NOTICES = 5;
export const ITEMS_PER_PAGE = 25;
export const NOTICE_ITEMS_PER_PAGE = 10;

export const REPORT_REASON_OPTIONS = ['도배 및 테러행위', '비방 및 모욕행위', '광고형 댓글', '기타'];
export const BLOCK_DURATIONS = [1, 3, 7, 14, 30, 90];

export const rowId = (item) => String(item?._id || item?.id || '');

export function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return 'N/A';
  return d.toLocaleString('ko-KR');
}

export function formatJoinedAt(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// 차단은 expiresAt 이 없으면 영구. 서버가 만료 레코드를 즉시 지우지 않을 수 있으므로
// 화면에서는 항상 "지금 시점에 유효한지"를 다시 확인한다.
export const isBlockActive = (block) => (!block?.expiresAt ? true : new Date(block.expiresAt) > new Date());
export const getActiveBlocks = (list) => list.filter(isBlockActive);

export function getRemainingLabel(expiresAt) {
  const diff = new Date(expiresAt) - new Date();
  if (diff <= 0) return '만료됨';
  const days = Math.ceil(diff / (24 * 60 * 60 * 1000));
  if (days >= 1) return `${days}일 남음`;
  return `${Math.ceil(diff / (60 * 60 * 1000))}시간 남음`;
}

// 공지 정렬: 고정 우선 → 고정 시각 최신 → 작성일 최신
export function sortAdminNotices(notices) {
  return [...notices].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0);
    const pinDiff = new Date(b.pinnedAt || 0) - new Date(a.pinnedAt || 0);
    if (pinDiff) return pinDiff;
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });
}

export const filterTierItems = (items, filter) => {
  if (filter === 'normal') return items.filter((i) => !i.reported);
  if (filter === 'reported') return items.filter((i) => i.reported);
  return items;
};

export function reportReasonText(item) {
  if (!item.reported) return '-';
  return [item.reportReason, item.reportDetail].filter(Boolean).join(' / ') || '-';
}

// 유튜브 자동 동기화 상태 문구 조립 (켜짐/꺼짐 · 마지막 확인 · 마지막 결과)
export function formatYoutubeSyncStatus(status, result) {
  const parts = [];
  if (status) {
    parts.push(status.enabled === false ? '자동 동기화 꺼짐' : '자동 동기화 켜짐');
    if (status.lastFinishedAt) parts.push(`마지막 확인: ${formatDate(status.lastFinishedAt)}`);
  }
  const payload = result || status?.lastResult;
  if (payload?.ok) {
    parts.push(`가져온 글 ${payload.fetched || 0}개, 새 소식 등록 ${payload.created || 0}개, 번역 ${payload.translated || 0}개, 이미 있음 ${payload.skipped || 0}개`);
  } else if (payload?.error) {
    parts.push(`마지막 오류: ${payload.error}`);
  }
  return parts.join(' · ') || '휴먼버그대학교 채널 게시판 글을 새 소식에 가져옵니다.';
}

// ── 데이터 로더 ────────────────────────────────────────────
// 문의 목록(GET /api/inquiries)만 공개 조회라 인증 헤더 없이 호출한다(쓰기는 전부 관리자 헤더 필요).
export const fetchInquiries = async () => {
  const res = await apiRequest('/api/inquiries', { auth: false });
  return res.ok && Array.isArray(res.data) ? res.data : [];
};
export const fetchBlocks = async () => {
  const res = await adminRequest('/api/admin/blocks');
  return res.ok ? (res.data.blocks || res.data || []) : [];
};
export const fetchUsers = async () => {
  const res = await adminRequest('/api/admin/users');
  return res.ok ? (res.data.users || res.data || []) : [];
};
export const fetchNotices = async () => {
  const res = await apiRequest('/api/notices', { auth: false });
  return res.ok && Array.isArray(res.data) ? res.data : [];
};

// 전용 신고 API 가 실패하면(구버전 백엔드·권한 문제) 공개 목록으로 한 번 더 시도해
// 최소한 목록이 통째로 비어 보이는 상황은 피한다(단, 신고 정보는 없을 수 있음).
export async function fetchTierReports() {
  const [postsRes, commentsRes] = await Promise.all([
    adminRequest('/api/admin/tier-reports/posts'),
    adminRequest('/api/admin/tier-reports/comments'),
  ]);
  let posts = [];
  if (postsRes.ok) {
    posts = postsRes.data;
  } else {
    const fallback = await apiRequest('/api/tierlists', { auth: false }).catch(() => null);
    posts = fallback?.ok ? fallback.data : [];
  }
  return {
    posts: Array.isArray(posts) ? posts : [],
    comments: commentsRes.ok && Array.isArray(commentsRes.data) ? commentsRes.data : [],
  };
}
