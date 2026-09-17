// ========================================================
// boardApi.js — 커스텀 티어 게시판 API + 공용 헬퍼
// ========================================================
// 바닐라 custom-maker_post.js / post_detail.js 의 fetch·판정 로직을 모은다.
// 권한(수정/삭제)은 서버가 다시 검증한다 — 여기 판정은 버튼 노출용일 뿐이다.
import { apiRequest } from './api';

export const POST_ID_STORAGE_KEY = 'selectedPostId';
export const REPORT_REASONS = ['도배 및 테러행위', '비방 및 모욕행위', '광고형 댓글', '기타'];

export function getPostId(post) {
  if (!post) return '';
  const raw = post._id ?? post.id;
  if (!raw) return '';
  if (typeof raw === 'object') {
    if (raw.$oid) return String(raw.$oid);
    if (typeof raw.toString === 'function') return raw.toString();
  }
  return String(raw);
}

export function isValidPostId(id) {
  return typeof id === 'string' && /^[a-fA-F0-9]{24}$/.test(id);
}

export function rememberPostId(id) {
  if (!isValidPostId(id)) return;
  try { sessionStorage.setItem(POST_ID_STORAGE_KEY, id); } catch { /* ignore */ }
}

export function consumeStoredPostId() {
  try {
    const stored = sessionStorage.getItem(POST_ID_STORAGE_KEY);
    if (!stored || !isValidPostId(stored)) return null;
    sessionStorage.removeItem(POST_ID_STORAGE_KEY);
    return stored;
  } catch {
    return null;
  }
}

export function formatPostDate(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
    .replace(/\. /g, '.').replace(/\.$/, '');
}

export function formatCommentDate(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

// 작성자 == 현재 로그인 사용자 판정.
// 이메일이 양쪽에 다 있으면 이메일로(가장 정확), 없으면 닉네임으로 비교한다.
// 닉네임 비교는 동명이인 오탐 가능성이 있지만 이메일이 없던 과거 데이터 호환을 위해 남겨둔 규칙 —
// 실제 수정/삭제 권한은 서버가 다시 검증한다.
export function isSameAuthor(record, user) {
  if (!record || !user) return false;
  const recordEmail = (record.authorEmail || '').trim().toLowerCase();
  const userEmail = (user.email || '').trim().toLowerCase();
  if (recordEmail && userEmail) return recordEmail === userEmail;
  const recordAuthor = (record.author || record.userId || '').trim();
  const userName = (user.nickname || '').trim();
  return Boolean(recordAuthor && userName && recordAuthor === userName);
}

// 검색창의 "@닉네임" 을 작성자 필터로 분리한다 → { searchKeyword, author }
export function parseSearchForAuthor(input) {
  const trimmed = (input || '').trim();
  if (!trimmed) return { searchKeyword: '', author: '' };
  const atMatch = trimmed.match(/@(\S+)/);
  if (atMatch) {
    let remaining = trimmed.replace(atMatch[0], '').trim();
    remaining = remaining.replace(/\s*@\s*/, ' ').trim();
    return { searchKeyword: remaining, author: atMatch[1] };
  }
  return { searchKeyword: trimmed, author: '' };
}

// ── API ────────────────────────────────────────────────────
export async function fetchPosts({ search, author, mine } = {}) {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (author) params.set('author', author);
  if (mine) params.set('mine', 'true');
  const query = params.toString();
  const res = await apiRequest(`/api/tierlists${query ? `?${query}` : ''}`);
  if (!res.ok) throw new Error('게시글 목록 조회 실패');
  return Array.isArray(res.data) ? res.data : [];
}

export async function fetchPostById(id) {
  const res = await apiRequest(`/api/tierlists/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error('게시글 조회 실패');
  return res.data;
}

export const updatePost = (id, payload) =>
  apiRequest(`/api/tierlists/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(payload) });

export const deletePost = (id) =>
  apiRequest(`/api/tierlists/${encodeURIComponent(id)}`, { method: 'DELETE' });

export const likePost = (id) =>
  apiRequest(`/api/tierlists/${encodeURIComponent(id)}/like`, { method: 'PATCH' });

export const reportPost = (id, reason) =>
  apiRequest(`/api/tierlists/${encodeURIComponent(id)}/report`, { method: 'POST', body: JSON.stringify({ reason }) });

export const fetchComments = (postId) =>
  apiRequest(`/api/tierlists/${encodeURIComponent(postId)}/comments`, { auth: false });

export const createComment = (postId, body) =>
  apiRequest(`/api/tierlists/${encodeURIComponent(postId)}/comments`, { method: 'POST', body: JSON.stringify(body) });

export const updateComment = (postId, commentId, content) =>
  apiRequest(`/api/tierlists/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`, {
    method: 'PATCH', body: JSON.stringify({ content }),
  });

export const deleteComment = (postId, commentId) =>
  apiRequest(`/api/tierlists/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`, { method: 'DELETE' });

export const reportComment = (postId, commentId, reason) =>
  apiRequest(`/api/tierlists/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}/report`, {
    method: 'POST', body: JSON.stringify({ reason }),
  });
