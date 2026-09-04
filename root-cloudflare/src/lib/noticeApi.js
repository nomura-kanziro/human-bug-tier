// 공지 API (GET /api/notices, /api/notices/:id) — 읽기 전용. 작성/수정은 관리자 영역.
// 목록에서 받은 데이터를 메모리에 캐시해 상세 진입 시 재요청을 줄인다(notice.js cachedNotices 이식).
import { apiRequest } from './api';
import { getNoticeId } from './noticeFormat';

let cachedNotices = [];

export async function fetchNotices(category, limit) {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (limit) params.set('limit', String(limit));
  const query = params.toString();
  const res = await apiRequest(`/api/notices${query ? `?${query}` : ''}`, { auth: false });
  if (!res.ok) throw new Error('공지 목록 조회 실패');
  const list = Array.isArray(res.data) ? res.data : [];
  cachedNotices = [...cachedNotices.filter((n) => !list.some((m) => getNoticeId(m) === getNoticeId(n))), ...list];
  return list;
}

export async function fetchNoticeById(id) {
  const cached = cachedNotices.find((n) => getNoticeId(n) === id);
  if (cached) return cached;
  const res = await apiRequest(`/api/notices/${encodeURIComponent(id)}`, { auth: false });
  if (!res.ok) throw new Error('공지 조회 실패');
  return res.data;
}
