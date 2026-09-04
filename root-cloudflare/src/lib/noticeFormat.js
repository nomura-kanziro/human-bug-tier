// ========================================================
// noticeFormat.js — 공지 본문 경량 마크다운 렌더러 + 날짜 포맷 (바닐라 notice.js 이식)
// ========================================================
// 지원: # 제목, - / 1. 목록, > 인용, --- 구분선, **굵게**, *기울임*, `코드`, ~~취소~~,
// [텍스트](링크), ![alt](이미지). 입력은 먼저 escapeHtml 을 거치므로 innerHTML 로 넣어도 안전하다.
export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function unescapeNoticeUrl(url) {
  return String(url || '').replace(/&amp;/g, '&');
}

// http/https 만 허용 — javascript: 등 위험 스킴으로 <a>/<img> 가 만들어지는 것을 막는다.
function isSafeNoticeUrl(url) {
  try {
    const parsed = new URL(unescapeNoticeUrl(url));
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function parseNoticeImageMarkdown(escapedLine) {
  const match = String(escapedLine || '').trim().match(/^!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)$/);
  if (!match || !isSafeNoticeUrl(match[2])) return null;
  return { alt: match[1] || '이미지', url: match[2] };
}

function renderNoticeImageTag(alt, escapedUrl) {
  return `<img class="notice-content-img" src="${escapedUrl}" alt="${alt}" loading="lazy" referrerpolicy="no-referrer">`;
}

// 순서 중요: 이미지 → 코드 → 굵게 → 기울임 → 취소선 → 링크
function applyInlineNoticeFormatting(escapedLine) {
  return escapedLine
    .replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g, (_, alt, url) => (
      isSafeNoticeUrl(url) ? renderNoticeImageTag(alt || '이미지', url) : (alt || '')
    ))
    .replace(/`([^`]+?)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*(?!\*)([^*]+?)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, label, url) => (
      isSafeNoticeUrl(url)
        ? `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`
        : label
    ));
}

// 줄 단위 상태 기계: 문단/목록/인용/이미지 버퍼를 들고 있다가 블록이 끝나면 flush.
export function renderNoticeContent(text) {
  if (!text) return '';

  const lines = escapeHtml(text).split(/\r?\n/);
  const blocks = [];
  let paragraph = [];
  let listItems = [];
  let listTag = '';
  let quote = [];
  let images = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push(`<p>${paragraph.join('<br>')}</p>`);
      paragraph = [];
    }
  };
  const flushList = () => {
    if (listItems.length) {
      blocks.push(`<${listTag}>${listItems.map((item) => `<li>${item}</li>`).join('')}</${listTag}>`);
      listItems = [];
      listTag = '';
    }
  };
  const flushQuote = () => {
    if (quote.length) {
      blocks.push(`<blockquote>${quote.join('<br>')}</blockquote>`);
      quote = [];
    }
  };
  const flushImages = () => {
    if (!images.length) return;
    if (images.length === 1) {
      blocks.push(`<figure class="notice-content-figure">${renderNoticeImageTag(images[0].alt, images[0].url)}</figure>`);
    } else {
      blocks.push(`<div class="notice-content-gallery">${images.map((img) => renderNoticeImageTag(img.alt, img.url)).join('')}</div>`);
    }
    images = [];
  };
  const flushAll = () => {
    flushParagraph();
    flushList();
    flushQuote();
    flushImages();
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) { flushAll(); continue; }

    const imageOnly = parseNoticeImageMarkdown(line);
    if (imageOnly) {
      flushParagraph(); flushList(); flushQuote();
      images.push(imageOnly);
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
      flushAll();
      blocks.push('<hr>');
      continue;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.*)/);
    if (headingMatch) {
      flushAll();
      const level = headingMatch[1].length + 1; // h1 은 공지 제목 전용
      blocks.push(`<h${level}>${applyInlineNoticeFormatting(headingMatch[2])}</h${level}>`);
      continue;
    }

    const quoteMatch = line.match(/^&gt;\s?(.*)/);
    if (quoteMatch) {
      flushParagraph(); flushList(); flushImages();
      quote.push(applyInlineNoticeFormatting(quoteMatch[1]));
      continue;
    }

    const bulletMatch = line.match(/^[-*]\s+(.*)/);
    const orderedMatch = line.match(/^\d+\.\s+(.*)/);
    if (bulletMatch || orderedMatch) {
      const tag = bulletMatch ? 'ul' : 'ol';
      flushParagraph(); flushQuote(); flushImages();
      if (listTag && listTag !== tag) flushList();
      listTag = tag;
      listItems.push(applyInlineNoticeFormatting((bulletMatch || orderedMatch)[1]));
      continue;
    }

    flushList(); flushQuote(); flushImages();
    paragraph.push(applyInlineNoticeFormatting(line));
  }

  flushAll();
  return blocks.join('');
}

// ---- 날짜 표기 ----
export function formatDate(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
    .replace(/\. /g, '.').replace(/\.$/, '');
}

export function formatFullDate(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function formatRelativeDate(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days === 0) return '오늘';
  if (days === 1) return '1일 전';
  if (days < 7) return `${days}일 전`;
  if (days < 30) return `${Math.floor(days / 7)}주 전`;
  return formatDate(dateStr);
}

// 알림 시각: 1주 안쪽은 상대시간, 그 이상은 날짜
export function formatNotificationTime(dateStr) {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return date.toLocaleDateString('ko-KR');
}

// ---- 공지 공통 ----
export const CATEGORY_LABELS = { notice: '전체 공지', news: '새 소식' };
export const CATEGORY_COLORS = { notice: '#10b981', news: '#8b5cf6' };
export const NOTICE_ID_STORAGE_KEY = 'selectedNoticeId';

// _id 가 문자열 / { $oid } / ObjectId 어떤 형태로 와도 문자열 id 로 통일
export function getNoticeId(notice) {
  if (!notice) return '';
  const raw = notice._id ?? notice.id;
  if (!raw) return '';
  if (typeof raw === 'object') {
    if (raw.$oid) return String(raw.$oid);
    if (typeof raw.toString === 'function') return raw.toString();
  }
  return String(raw);
}

export function isValidNoticeId(id) {
  return typeof id === 'string' && /^[a-fA-F0-9]{24}$/.test(id);
}

// 목록 → 상세 이동 직전에 id 백업(쿼리 유실 대비). 상세 페이지가 consumeStoredNoticeId 로 1회 소비.
export function rememberNoticeId(id) {
  if (!isValidNoticeId(id)) return;
  sessionStorage.setItem(NOTICE_ID_STORAGE_KEY, id);
}

export function consumeStoredNoticeId() {
  const stored = sessionStorage.getItem(NOTICE_ID_STORAGE_KEY);
  if (!stored || !isValidNoticeId(stored)) return null;
  sessionStorage.removeItem(NOTICE_ID_STORAGE_KEY);
  return stored;
}
