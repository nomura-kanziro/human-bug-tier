// ========================================================
// notice.js - 공지사항 통합 스크립트 (notice 폴더 + index 홈)
// ========================================================

function getNoticeApiBase() {
  const { protocol, hostname, port } = window.location;

  if (/\.github\.io$/i.test(hostname)) {
    return 'GITHUB_STATIC';
  }

  // file:// 또는 일반 로컬 개발 서버(5500, 3000, Vite 등)에서 여는 경우
  // → 별도 실행 중인 백엔드(localhost:5000)로 요청
  if (
    protocol === 'file:' ||
    port === '5500' || port === '3000' || port === '5173' ||
    port === '8080' || port === '4200' || port === '8000'
  ) {
    return 'http://localhost:5000';
  }

  // 그 외 모든 경우 (백엔드가 직접 서빙하는 경우, Render.com, 프로덕션 등)
  // → 같은 오리진 상대 경로 사용 (가장 안전)
  return '';
}

const CATEGORY_LABELS = {
  notice: '전체 공지',
  news: '새 소식',
};

const CATEGORY_COLORS = {
  notice: '#10b981',
  news: '#8b5cf6',
};

let cachedNotices = [];
const NOTICE_ID_STORAGE_KEY = 'selectedNoticeId';

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function nl2br(text) {
  if (!text) return '';
  return escapeHtml(text).replace(/\n/g, '<br>');
}

// 공지 본문 경량 서식 렌더러.
// 지원: # 제목, - / 1. 목록, > 인용, --- 구분선, **굵게**, *기울임*, `코드`, [텍스트](링크)
// 입력은 먼저 escapeHtml로 이스케이프한 뒤 문법 기호만 치환하므로 안전하다.
function unescapeNoticeUrl(url) {
  return String(url || '').replace(/&amp;/g, '&');
}

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

function applyInlineNoticeFormatting(escapedLine) {
  return escapedLine
    .replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g, (_, alt, url) => (
      isSafeNoticeUrl(url) ? renderNoticeImageTag(alt || '이미지', url) : (alt || '')
    ))
    .replace(/`([^`]+?)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*(?!\*)([^*]+?)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      (_, label, url) => (
        isSafeNoticeUrl(url)
          ? `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`
          : label
      ));
}

function renderNoticeContent(text) {
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
      blocks.push(`<${listTag}>${listItems.map(item => `<li>${item}</li>`).join('')}</${listTag}>`);
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
      blocks.push(
        `<div class="notice-content-gallery">${images.map((img) => renderNoticeImageTag(img.alt, img.url)).join('')}</div>`
      );
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

    if (!line) {
      flushAll();
      continue;
    }

    const imageOnly = parseNoticeImageMarkdown(line);
    if (imageOnly) {
      flushParagraph();
      flushList();
      flushQuote();
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
      const level = headingMatch[1].length + 1; // # -> h2 (h1은 공지 제목이 사용)
      blocks.push(`<h${level}>${applyInlineNoticeFormatting(headingMatch[2])}</h${level}>`);
      continue;
    }

    const quoteMatch = line.match(/^&gt;\s?(.*)/);
    if (quoteMatch) {
      flushParagraph();
      flushList();
      flushImages();
      quote.push(applyInlineNoticeFormatting(quoteMatch[1]));
      continue;
    }

    const bulletMatch = line.match(/^[-*]\s+(.*)/);
    const orderedMatch = line.match(/^\d+\.\s+(.*)/);
    if (bulletMatch || orderedMatch) {
      const tag = bulletMatch ? 'ul' : 'ol';
      flushParagraph();
      flushQuote();
      flushImages();
      if (listTag && listTag !== tag) flushList();
      listTag = tag;
      listItems.push(applyInlineNoticeFormatting((bulletMatch || orderedMatch)[1]));
      continue;
    }

    flushList();
    flushQuote();
    flushImages();
    paragraph.push(applyInlineNoticeFormatting(line));
  }

  flushAll();

  return blocks.join('');
}

window.renderNoticeContent = renderNoticeContent;

function formatDate(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace(/\.$/, '');
}

function formatFullDate(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRelativeDate(dateStr) {
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

function getNoticeId(notice) {
  if (!notice) return '';
  const raw = notice._id ?? notice.id;
  if (!raw) return '';
  if (typeof raw === 'object') {
    if (raw.$oid) return String(raw.$oid);
    if (typeof raw.toString === 'function') return raw.toString();
  }
  return String(raw);
}

function isValidNoticeId(id) {
  return typeof id === 'string' && /^[a-fA-F0-9]{24}$/.test(id);
}

function getNoticeDetailUrl(id) {
  const safeId = encodeURIComponent(id);

  if (window.location.protocol === 'file:') {
    const path = window.location.pathname || '';
    if (path.includes('/notice/') || path.includes('\\notice\\')) {
      return `notice-detail.html?id=${safeId}`;
    }
    return `notice/notice-detail.html?id=${safeId}`;
  }

  return `/notice/notice-detail.html?id=${safeId}`;
}

function getNoticeIdFromURL() {
  try {
    const search = window.location.search || '';
    if (search.length > 1) {
      const params = new URLSearchParams(search);
      for (const key of ['id', 'noticeId', 'notice_id']) {
        const raw = params.get(key);
        if (!raw) continue;
        const decoded = decodeURIComponent(raw).trim();
        if (decoded) return decoded;
      }
    }

    const pathMatch = (window.location.pathname || '').match(/notice-detail(?:\.html)?[/?]([a-fA-F0-9]{24})\/?$/i);
    if (pathMatch?.[1]) return pathMatch[1];

    const hash = window.location.hash.replace(/^#\/?/, '');
    if (hash) {
      const hashParams = new URLSearchParams(hash.includes('=') ? hash : `id=${hash}`);
      for (const key of ['id', 'noticeId', 'notice_id']) {
        const raw = hashParams.get(key);
        if (!raw) continue;
        const decoded = decodeURIComponent(raw).trim();
        if (decoded) return decoded;
      }
    }
    const stored = sessionStorage.getItem(NOTICE_ID_STORAGE_KEY);
    if (stored) {
      const decoded = decodeURIComponent(stored).trim();
      if (decoded) return decoded;
    }
  } catch (err) {
    console.error('공지 ID 파싱 실패:', err);
  }

  return null;
}

function setupNoticeOriginalToggle(notice) {
  const toggle = document.getElementById('notice-original-toggle');
  const titleEl = document.getElementById('notice-detail-title');
  const summaryEl = document.getElementById('notice-detail-summary');
  const contentEl = document.getElementById('notice-detail-content');
  if (!toggle || !contentEl || !notice.youtubeOriginalContent) return;

  let showingOriginal = false;
  toggle.addEventListener('click', () => {
    showingOriginal = !showingOriginal;
    toggle.setAttribute('aria-pressed', showingOriginal ? 'true' : 'false');
    toggle.textContent = showingOriginal ? '한국어 번역 보기' : '일본어 원문 보기';
    if (titleEl) {
      titleEl.textContent = showingOriginal
        ? (notice.youtubeOriginalTitle || notice.title)
        : notice.title;
    }
    if (summaryEl && !showingOriginal && notice.summary) {
      summaryEl.textContent = notice.summary;
      summaryEl.hidden = false;
    } else if (summaryEl) {
      summaryEl.hidden = showingOriginal;
    }
    contentEl.innerHTML = renderNoticeContent(
      showingOriginal ? notice.youtubeOriginalContent : notice.content
    );
  });
}

function rememberNoticeId(id) {
  if (!isValidNoticeId(id)) return;
  sessionStorage.setItem(NOTICE_ID_STORAGE_KEY, id);
}

function consumeStoredNoticeId() {
  const stored = sessionStorage.getItem(NOTICE_ID_STORAGE_KEY);
  if (!stored || !isValidNoticeId(stored)) return null;
  sessionStorage.removeItem(NOTICE_ID_STORAGE_KEY);
  return stored;
}

window.goToNoticeDetail = function(id) {
  const noticeId = typeof id === 'object' ? getNoticeId(id) : String(id || '');
  if (!isValidNoticeId(noticeId)) return;
  rememberNoticeId(noticeId);
  window.location.href = getNoticeDetailUrl(noticeId);
};

async function fetchNotices(category, limit) {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (limit) params.set('limit', String(limit));

  const query = params.toString();
  const response = await fetch(`${getNoticeApiBase()}/api/notices${query ? `?${query}` : ''}`);
  if (!response.ok) throw new Error('공지 목록 조회 실패');
  return response.json();
}

async function fetchNoticeById(id) {
  const cached = cachedNotices.find(n => getNoticeId(n) === id);
  if (cached) return cached;

  const response = await fetch(`${getNoticeApiBase()}/api/notices/${encodeURIComponent(id)}`);
  if (!response.ok) throw new Error('공지 조회 실패');
  return response.json();
}

function getCategoryBadge(category) {
  const label = CATEGORY_LABELS[category] || category;
  const color = CATEGORY_COLORS[category] || '#6c757d';
  return `<span class="notice-category-badge" style="background:${color}20;color:${color};border:1px solid ${color}40;">${label}</span>`;
}

function getBackLinkForCategory(category) {
  if (category === 'news') return 'news.html';
  return 'all_notices.html';
}

function renderNoticeListItem(notice, options = {}) {
  const id = getNoticeId(notice);
  if (!isValidNoticeId(id)) return '';

  const detailUrl = getNoticeDetailUrl(id);
  const summary = notice.summary || notice.content || '';
  const shortSummary = summary.length > 120 ? `${summary.slice(0, 120)}...` : summary;

  const pinBadge = notice.isPinned
    ? '<span class="notice-pin-label">📌</span>'
    : '';
  const youtubeBadge = notice.source === 'youtube'
    ? '<span class="notice-yt-badge">YouTube</span>'
    : '';

  if (options.homeStyle) {
    return `
      <a href="${detailUrl}" data-notice-id="${id}" class="notice-item notice-item-link ${notice.isPinned ? 'notice-item-pinned' : ''}">
        <div class="title">
          <span class="notice-item-title">${pinBadge}${youtubeBadge}${escapeHtml(notice.title)}</span>
          <span class="date">${formatRelativeDate(notice.createdAt)}</span>
        </div>
        <p class="desc">${escapeHtml(shortSummary)}</p>
      </a>`;
  }

  if (options.fullList) {
    const desc = notice.summary || notice.content || '';
    return `
      <a href="${detailUrl}" data-notice-id="${id}" class="notice-item notice-item-link ${notice.isPinned ? 'notice-item-pinned' : ''}">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
          ${pinBadge}
          ${getCategoryBadge(notice.category)}
          ${youtubeBadge}
          <span class="notice-link">${escapeHtml(notice.title)}</span>
        </div>
        ${desc ? `<p class="notice-desc">${escapeHtml(desc.length > 200 ? desc.slice(0, 200) + '...' : desc)}</p>` : ''}
        <span class="notice-date">${formatDate(notice.createdAt)}</span>
      </a>`;
  }

  return `
    <a href="${detailUrl}" data-notice-id="${id}" class="notice-item notice-item-link ${notice.isPinned ? 'notice-item-pinned' : ''}">
      ${pinBadge}
      ${youtubeBadge}
      <span class="notice-link">${escapeHtml(notice.title)}</span>
      <p class="notice-desc">${escapeHtml(shortSummary)}</p>
      <span class="notice-date">${formatDate(notice.createdAt)}</span>
    </a>`;
}

async function renderNoticeDetailPage() {
  const container = document.getElementById('notice-detail-container');
  if (!container) return;

  const noticeId = getNoticeIdFromURL() || consumeStoredNoticeId();
  if (!noticeId || !isValidNoticeId(noticeId)) {
    container.innerHTML = `
      <div class="notice-detail-error">
        <h2>잘못된 접근입니다</h2>
        <p style="margin-top:12px;">공지 목록에서 항목을 선택해주세요.</p>
        <a href="notice.html" class="notice-detail-back" style="margin-top:24px;display:inline-flex;">← 공지사항으로</a>
      </div>`;
    return;
  }

  try {
    const notice = await fetchNoticeById(noticeId);
    const backLink = getBackLinkForCategory(notice.category);
    const isNews = notice.category === 'news';
    const summary = notice.summary || '';

    container.innerHTML = `
      <article class="notice-detail-card ${isNews ? 'notice-detail-news' : 'notice-detail-general'}">
        <div class="notice-detail-topbar">
          <a href="${backLink}" class="notice-detail-back">← 목록으로</a>
          <div class="notice-detail-meta-row">
            ${notice.isPinned ? '<span class="badge badge-pinned" style="background:#fef3c7;color:#b45309;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600;">📌 고정</span>' : ''}
            ${getCategoryBadge(notice.category)}
            ${notice.source === 'youtube' ? '<span class="notice-yt-badge">YouTube 커뮤니티</span>' : ''}
            ${notice.youtubeTranslated ? '<span class="notice-yt-badge">한국어 번역</span>' : ''}
          </div>
        </div>

        <div class="notice-detail-body">
          <h1 class="notice-detail-title" id="notice-detail-title">${escapeHtml(notice.title)}</h1>

          <div class="notice-detail-info">
            <span class="notice-detail-author">${escapeHtml(notice.author || '관리자')}</span>
            <span>·</span>
            <span>${formatFullDate(notice.createdAt)}</span>
            ${notice.youtubeOriginalContent ? '<button type="button" class="notice-original-toggle" id="notice-original-toggle" aria-pressed="false">일본어 원문 보기</button>' : ''}
          </div>

          ${summary ? `<div class="notice-detail-summary ${isNews ? 'news-summary' : ''}" id="notice-detail-summary">${escapeHtml(summary)}</div>` : ''}

          <div class="notice-detail-content" id="notice-detail-content">${renderNoticeContent(notice.content)}</div>

          <div class="notice-detail-footer">
            <a href="${backLink}" class="notice-detail-list-btn">${CATEGORY_LABELS[notice.category]} 목록 보기</a>
          </div>
        </div>
      </article>`;

    document.title = `${notice.title} - 휴버대 티어표`;
    sessionStorage.removeItem(NOTICE_ID_STORAGE_KEY);
    setupNoticeOriginalToggle(notice);
  } catch (err) {
    console.error(err);
    const isNetworkError = err instanceof TypeError || /fetch|network|Failed/i.test(err.message || '');
    container.innerHTML = `
      <div class="notice-detail-error">
        <h2>${isNetworkError ? '서버에 연결할 수 없습니다' : '공지를 찾을 수 없습니다'}</h2>
        <p style="margin-top:12px;">${isNetworkError
          ? '백엔드 서버가 실행 중인지 확인해주세요. (backend 폴더에서 npm start)'
          : '삭제되었거나 잘못된 링크일 수 있습니다.'}</p>
        <a href="notice.html" class="notice-detail-back" style="margin-top:24px;display:inline-flex;">← 공지사항으로</a>
      </div>`;
  }
}

async function renderNoticeMainPage() {
  const noticeListEl = document.getElementById('notice-list-general');
  const newsListEl = document.getElementById('notice-list-news');
  const noticeCountEl = document.getElementById('notice-count-general');
  const newsCountEl = document.getElementById('notice-count-news');

  if (!noticeListEl && !newsListEl) return;

  try {
    const [notices, news] = await Promise.all([
      fetchNotices('notice', 5),
      fetchNotices('news', 5),
    ]);

    cachedNotices = [...notices, ...news];

    if (noticeListEl) {
      noticeListEl.innerHTML = notices.length
        ? notices.map(n => renderNoticeListItem(n)).join('')
        : '<p class="notice-empty">등록된 전체 공지가 없습니다.</p>';
    }

    if (newsListEl) {
      newsListEl.innerHTML = news.length
        ? news.map(n => renderNoticeListItem(n)).join('')
        : '<p class="notice-empty">등록된 새 소식이 없습니다.</p>';
    }

    if (noticeCountEl) {
      const allNotices = await fetchNotices('notice');
      noticeCountEl.textContent = `문서 ${allNotices.length}개 모두 보기 →`;
    }

    if (newsCountEl) {
      const allNews = await fetchNotices('news');
      newsCountEl.textContent = `문서 ${allNews.length}개 모두 보기 →`;
    }
  } catch (err) {
    console.error(err);
    if (noticeListEl) noticeListEl.innerHTML = '<p class="notice-empty">공지를 불러올 수 없습니다.</p>';
    if (newsListEl) newsListEl.innerHTML = '<p class="notice-empty">새 소식을 불러올 수 없습니다.</p>';
  }
}

async function renderNoticeFullPage(category) {
  const listEl = document.getElementById('notice-full-list');
  const paginationEl = document.getElementById('notice-pagination');
  if (!listEl) return;

  try {
    const notices = await fetchNotices(category);
    cachedNotices = notices;

    if (!notices.length) {
      listEl.innerHTML = `<p class="notice-empty">${CATEGORY_LABELS[category]} 항목이 없습니다.</p>`;
      if (paginationEl) paginationEl.innerHTML = '';
      return;
    }

    listEl.innerHTML = notices.map(n => renderNoticeListItem(n, { fullList: true })).join('');
    if (paginationEl) {
      paginationEl.innerHTML = `<span>총 ${notices.length}개</span>`;
    }
  } catch (err) {
    console.error(err);
    listEl.innerHTML = '<p class="notice-empty">목록을 불러올 수 없습니다.</p>';
  }
}

async function renderHomeNotices() {
  const noticeCol = document.getElementById('home-notice-items');
  const newsCol = document.getElementById('home-news-items');
  if (!noticeCol && !newsCol) return;

  try {
    const [notices, news] = await Promise.all([
      fetchNotices('notice', 2),
      fetchNotices('news', 2),
    ]);

    cachedNotices = [...notices, ...news];

    if (noticeCol) {
      noticeCol.innerHTML = notices.length
        ? notices.map(n => renderNoticeListItem(n, { homeStyle: true })).join('')
        : '<p class="notice-empty">등록된 공지가 없습니다.</p>';
    }

    if (newsCol) {
      newsCol.innerHTML = news.length
        ? news.map(n => renderNoticeListItem(n, { homeStyle: true })).join('')
        : '<p class="notice-empty">등록된 새 소식이 없습니다.</p>';
    }
  } catch (err) {
    console.error(err);
  }
}

function isNoticeDetailPage() {
  const path = window.location.pathname || '';
  return document.body?.dataset?.page === 'notice-detail'
    || !!document.getElementById('notice-detail-container')
    || /notice[-_]detail(?:\.html)?/i.test(path);
}

function detectPageType() {
  const path = window.location.pathname || '';

  if (isNoticeDetailPage()) return 'detail';
  if (document.getElementById('home-notice-items')) return 'home';
  if (path.includes('all_notices')) return 'all_notices';
  if (path.includes('news.html') || path.endsWith('/news')) return 'news';
  if (path.includes('notice.html') || (path.includes('/notice/') && !path.includes('notice-detail'))) return 'notice_main';
  return 'unknown';
}

function initNoticePage() {
  const pageType = detectPageType();

  switch (pageType) {
    case 'detail':
      initNoticeDetailPage();
      break;
    case 'home':
      renderHomeNotices();
      break;
    case 'all_notices':
      renderNoticeFullPage('notice');
      break;
    case 'news':
      renderNoticeFullPage('news');
      break;
    case 'notice_main':
      renderNoticeMainPage();
      break;
    default:
      break;
  }
}

function setupNoticeLinkDelegation() {
  document.addEventListener('click', (event) => {
    const link = event.target.closest('[data-notice-id]');
    if (!link?.dataset.noticeId) return;
    if (!isValidNoticeId(link.dataset.noticeId)) return;
    rememberNoticeId(link.dataset.noticeId);
  });
}

let noticeDetailInitialized = false;

function initNoticeDetailPage() {
  if (noticeDetailInitialized) return;
  noticeDetailInitialized = true;
  renderNoticeDetailPage();
}

document.addEventListener('DOMContentLoaded', () => {
  setupNoticeLinkDelegation();
  initNoticePage();
});

window.initNoticePage = initNoticePage;
window.initNoticeDetailPage = initNoticeDetailPage;
window.renderNoticeDetailPage = renderNoticeDetailPage;
window.fetchNotices = fetchNotices;
window.NOTICE_CATEGORY_LABELS = CATEGORY_LABELS;