// ========================================================
// notice.js - 공지사항 통합 스크립트 (notice 폴더 + index 홈)
// ========================================================
// 이 스크립트는 두 곳에서 동시에 로드된다.
//   1. notice/notice.html, all_notices.html, news.html, notice-detail.html
//      → 각 페이지 전용 렌더 함수(renderNoticeMainPage 등)를 실행
//   2. root-render/index.html (홈 화면 공지 미리보기 위젯)
//      → renderHomeNotices()만 사용
// 아래 detectPageType()이 현재 페이지에 있는 DOM 요소를 보고 어느 쪽인지 자동 판별해서
// 알맞은 렌더 함수만 골라 실행한다. 공지는 관리자만 작성/수정/고정/삭제할 수 있고,
// 이 파일은 "읽기 전용" 조회만 다룬다(작성/수정 로직은 admin 쪽 스크립트).
// ========================================================

// 공지 전용 API 베이스 판별 함수. common.js의 getApiBase()와 로직은 동일하지만,
// notice.js가 index.html(공통 스크립트 common.js 포함)뿐 아니라 notice 폴더의
// 단독 페이지에서도 단독으로 동작해야 하므로 의존성을 없애기 위해 자체적으로 하나 더 둔다.
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

// 공지 카테고리(2종류: 전체 공지 / 새 소식)의 한글 라벨과 배지 색상.
// 서버 데이터의 category 필드값('notice' | 'news')을 키로 사용해 화면 표시용 텍스트/색을 얻는다.
const CATEGORY_LABELS = {
  notice: '전체 공지',
  news: '새 소식',
};

const CATEGORY_COLORS = {
  notice: '#10b981',
  news: '#8b5cf6',
};

// 최근에 불러온 공지 목록을 메모리에 캐싱해둔다.
// 목록 페이지에서 상세 페이지로 이동할 때, 이미 받아온 데이터가 있으면
// fetchNoticeById()가 재요청 없이 여기서 바로 찾아 쓴다(아래 fetchNoticeById 참고).
let cachedNotices = [];
// 상세 페이지로 이동하기 직전에 클릭한 공지의 id를 sessionStorage에 잠깐 저장해두는 키.
// URL의 쿼리스트링이 유실되는 경로(예: 일부 정적 호스팅 리라이트)에서도
// 뒤로가기/새로고침 시 어떤 공지를 보고 있었는지 복구하기 위한 보조 수단.
const NOTICE_ID_STORAGE_KEY = 'selectedNoticeId';

// HTML 특수문자를 엔티티로 이스케이프한다. 공지 제목/본문은 관리자가 자유 텍스트로 입력하므로,
// 그대로 innerHTML에 꽂으면 XSS 위험이 있어 화면에 그리기 전 항상 이 함수를 거친다.
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 줄바꿈(\n)만 <br>로 바꿔주는 단순 변환. 현재 renderNoticeContent가 더 정교한 렌더러라
// 본문에는 쓰이지 않지만, 서식 없이 텍스트만 줄바꿈 유지해서 보여줘야 할 곳을 위해 남겨둔 유틸.
function nl2br(text) {
  if (!text) return '';
  return escapeHtml(text).replace(/\n/g, '<br>');
}

// 공지 본문 경량 서식 렌더러.
// 지원: # 제목, - / 1. 목록, > 인용, --- 구분선, **굵게**, *기울임*, `코드`, [텍스트](링크)
// 입력은 먼저 escapeHtml로 이스케이프한 뒤 문법 기호만 치환하므로 안전하다.

// 인용문(>) 라인은 escapeHtml을 거치고 나면 '>'가 '&gt;'로 바뀌어 있으므로,
// 링크 URL을 실제로 파싱해서 안전 여부(isSafeNoticeUrl)를 검사하기 전에 되돌려주는 헬퍼.
function unescapeNoticeUrl(url) {
  return String(url || '').replace(/&amp;/g, '&');
}

// 관리자가 입력한 링크/이미지 URL이 http/https 프로토콜인지 검증한다.
// javascript: 같은 위험한 스킴으로 <a href>나 <img src>가 만들어지는 것을 막기 위한 화이트리스트 검사.
// URL 생성자가 던지는 예외(잘못된 형식)는 그대로 "안전하지 않음"으로 처리한다.
function isSafeNoticeUrl(url) {
  try {
    const parsed = new URL(unescapeNoticeUrl(url));
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// 한 줄 전체가 오직 이미지 마크다운(![alt](url)) 하나뿐인 경우를 감지한다.
// renderNoticeContent에서 이런 줄은 본문 문단이 아니라 별도의 <figure>/갤러리 블록으로 묶어 렌더링한다.
function parseNoticeImageMarkdown(escapedLine) {
  const match = String(escapedLine || '').trim().match(/^!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)$/);
  if (!match || !isSafeNoticeUrl(match[2])) return null;
  return { alt: match[1] || '이미지', url: match[2] };
}

// 실제 <img> 태그 문자열을 생성한다. loading="lazy"로 뷰포트에 들어올 때만 로드하고,
// referrerpolicy="no-referrer"로 외부 이미지 호스트에 우리 사이트 주소가 노출되지 않게 한다.
function renderNoticeImageTag(alt, escapedUrl) {
  return `<img class="notice-content-img" src="${escapedUrl}" alt="${alt}" loading="lazy" referrerpolicy="no-referrer">`;
}

// 한 줄(이미 escapeHtml 처리됨) 안에서 인라인 마크다운 문법을 순서대로 치환한다.
// 순서가 중요: 이미지(![]())를 먼저 처리해야 뒤의 링크([]()) 패턴과 충돌하지 않고,
// **굵게**를 *기울임*보다 먼저 처리해야 별표 두 개가 기울임 정규식에 잘못 걸리지 않는다.
// 링크/이미지 URL은 매번 isSafeNoticeUrl로 검증하고, 안전하지 않으면 태그 대신 텍스트만 남긴다.
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

// 공지 본문 전체를 블록 단위 HTML로 변환하는 메인 렌더러.
// 한 줄씩 훑으면서 지금 어떤 블록(문단/목록/인용/이미지)을 짓고 있는지 상태를 들고 있다가,
// 블록이 끝나는 시점(빈 줄, 다른 종류의 줄 시작, 끝까지 읽음)에 flush*() 함수로 완성된
// HTML 조각을 blocks 배열에 밀어 넣는 방식이다. 간단한 상태 기계(state machine) 구조.
function renderNoticeContent(text) {
  if (!text) return '';

  const lines = escapeHtml(text).split(/\r?\n/);
  const blocks = [];
  let paragraph = [];
  let listItems = [];
  let listTag = '';
  let quote = [];
  let images = [];

  // 지금까지 모은 문단 줄들을 <p>로 묶어 blocks에 추가하고 버퍼를 비운다.
  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push(`<p>${paragraph.join('<br>')}</p>`);
      paragraph = [];
    }
  };
  // 지금까지 모은 목록 항목들을 <ul>/<ol>(listTag)로 묶어 blocks에 추가한다.
  const flushList = () => {
    if (listItems.length) {
      blocks.push(`<${listTag}>${listItems.map(item => `<li>${item}</li>`).join('')}</${listTag}>`);
      listItems = [];
      listTag = '';
    }
  };
  // 지금까지 모은 인용 줄들을 <blockquote>로 묶어 blocks에 추가한다.
  const flushQuote = () => {
    if (quote.length) {
      blocks.push(`<blockquote>${quote.join('<br>')}</blockquote>`);
      quote = [];
    }
  };
  // 연속으로 나온 이미지 전용 줄들을 하나로 묶는다: 이미지가 1장이면 <figure>,
  // 2장 이상 연속되면 그리드 갤러리(<div class="notice-content-gallery">)로 렌더링한다.
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
  // 네 종류의 버퍼를 한 번에 모두 비운다. 빈 줄을 만났거나 본문을 다 읽었을 때 호출.
  const flushAll = () => {
    flushParagraph();
    flushList();
    flushQuote();
    flushImages();
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    // 빈 줄 = 현재 블록의 끝. 지금까지 쌓인 모든 버퍼를 확정하고 다음 블록을 새로 시작한다.
    if (!line) {
      flushAll();
      continue;
    }

    // 줄 전체가 이미지 하나뿐이면 images 버퍼에 쌓아둔다(문단/목록/인용은 먼저 flush).
    // 바로 뒤에 또 이미지 줄이 이어지면 flushImages()가 갤러리로 한꺼번에 묶어준다.
    const imageOnly = parseNoticeImageMarkdown(line);
    if (imageOnly) {
      flushParagraph();
      flushList();
      flushQuote();
      images.push(imageOnly);
      continue;
    }

    // ---/***/___ 세 글자 이상 = 구분선(<hr>). 단독 블록이므로 모든 버퍼를 flush한 뒤 바로 추가.
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
      flushAll();
      blocks.push('<hr>');
      continue;
    }

    // # / ## / ### = 제목. #의 개수(1~3)에 +1을 해서 h2~h4로 렌더링한다(h1은 공지 제목 전용이므로 제외).
    const headingMatch = line.match(/^(#{1,3})\s+(.*)/);
    if (headingMatch) {
      flushAll();
      const level = headingMatch[1].length + 1; // # -> h2 (h1은 공지 제목이 사용)
      blocks.push(`<h${level}>${applyInlineNoticeFormatting(headingMatch[2])}</h${level}>`);
      continue;
    }

    // '> ' = 인용문 줄. escapeHtml을 거쳤기 때문에 '>'가 '&gt;'로 바뀐 상태로 매칭한다.
    const quoteMatch = line.match(/^&gt;\s?(.*)/);
    if (quoteMatch) {
      flushParagraph();
      flushList();
      flushImages();
      quote.push(applyInlineNoticeFormatting(quoteMatch[1]));
      continue;
    }

    // '- '/'* ' = 순서 없는 목록, '1. ' = 순서 있는 목록.
    // 목록 종류가 도중에 바뀌면(ul→ol 등) 먼저 flushList()로 이전 목록을 끊고 새 태그로 이어간다.
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

    // 위 어느 문법에도 해당하지 않는 일반 텍스트 줄 = 문단. 연속된 일반 줄은 <br>로 이어붙여
    // 하나의 <p>로 합쳐진다(paragraph 배열에 계속 push되다가 flushParagraph에서 join).
    flushList();
    flushQuote();
    flushImages();
    paragraph.push(applyInlineNoticeFormatting(line));
  }

  // 마지막 줄까지 다 읽은 뒤 남아있는 버퍼(마무리 문단/목록/인용/이미지)를 전부 확정한다.
  flushAll();

  return blocks.join('');
}

// 상세 페이지 인라인 스크립트 등 다른 곳에서도 재사용할 수 있도록 전역에 노출한다.
window.renderNoticeContent = renderNoticeContent;

// 목록/카드용 짧은 날짜 표기: "2024.03.15" 형태.
// toLocaleDateString의 기본 출력("2024. 3. 15.")에서 공백과 마지막 점을 정규식으로 다듬는다.
function formatDate(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace(/\.$/, '');
}

// 상세 페이지 작성자 정보란에 쓰이는 풀 날짜/시간 표기: "2024년 3월 15일 오후 2:30" 형태.
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

// 홈 화면 미리보기 카드에 쓰이는 상대 시간 표기("방금 전", "3시간 전", "2주 전" 등).
// 일정 기간(30일)이 지나면 상대 표기 대신 formatDate()의 절대 날짜로 대체해 너무 오래된
// 글까지 "몇 주 전"처럼 애매하게 표시되지 않도록 한다.
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

// 공지 객체에서 MongoDB ObjectId를 문자열로 안전하게 꺼낸다.
// 서버가 이미 문자열로 직렬화해서 보낼 수도 있고(_id: "abc..."), 드물게 { $oid: "..." } 형태의
// extended JSON으로 올 수도 있어서 두 경우 모두 대응한다.
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

// MongoDB ObjectId 형식(16진수 24자)인지 검사한다.
// 사용자가 URL을 직접 조작해 이상한 id를 넣거나, 저장소에 손상된 값이 남아있는 경우를
// 걸러내기 위한 방어 로직 — 이 검사를 통과하지 못하면 API 호출 자체를 하지 않는다.
function isValidNoticeId(id) {
  return typeof id === 'string' && /^[a-fA-F0-9]{24}$/.test(id);
}

// 공지 id로부터 상세 페이지 링크를 만든다. file:// 로 직접 열어 테스트하는 경우와
// 서버로 서빙되는 경우(:5000, Render 등)의 상대/절대 경로가 다르기 때문에 분기한다.
//   - file:// 이면서 현재 이미 notice 폴더 안이면 → 같은 폴더 상대경로
//   - file:// 이면서 루트(index.html 등)에서 열렸으면 → notice/ 하위로 내려가는 상대경로
//   - 그 외(정상 서버 서빙)에는 항상 절대경로 /notice/notice-detail.html 사용
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

// 상세 페이지가 지금 어떤 공지를 보여줘야 하는지 id를 여러 경로로 추정해서 찾아낸다.
// 우선순위: ?id=(또는 noticeId/notice_id) 쿼리스트링 → /notice-detail/<id> 형태의 경로 →
// #id=... 해시 → 마지막으로 sessionStorage에 남겨둔 값(getNoticeIdFromURL 실패 시 호출부에서
// consumeStoredNoticeId()로 한 번 더 시도). 여러 형태를 지원하는 이유는 정적 호스팅 환경마다
// 쿼리스트링/경로 처리 방식이 달라 어느 하나만으로는 링크 공유·새로고침이 깨질 수 있기 때문.
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

// 유튜브 커뮤니티 글을 번역해서 올린 공지(youtubeOriginalContent가 있는 경우)에서
// "일본어 원문 보기" ↔ "한국어 번역 보기" 토글 버튼의 동작을 연결한다.
// 클릭할 때마다 showingOriginal 플래그를 뒤집고, 그 값에 따라 제목/요약/본문 DOM을
// 원문과 번역본 사이에서 즉시 바꿔치기한다(재요청 없이 이미 받아온 notice 객체 데이터만 사용).
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

// 목록에서 공지를 클릭하는 순간, 이동할 상세 페이지가 URL만으로 id를 못 읽는 상황에 대비해
// sessionStorage에 미리 저장해둔다(getNoticeIdFromURL의 최후 수단으로 소비됨).
function rememberNoticeId(id) {
  if (!isValidNoticeId(id)) return;
  sessionStorage.setItem(NOTICE_ID_STORAGE_KEY, id);
}

// sessionStorage에 저장해둔 id를 한 번 읽고 즉시 지운다(1회성 소비).
// 재사용하면 새로고침이나 다른 공지로 이동할 때 옛날 id가 계속 남아 잘못된 글을 보여줄 수 있어서
// 읽자마자 삭제하는 "소비형" 패턴을 쓴다.
function consumeStoredNoticeId() {
  const stored = sessionStorage.getItem(NOTICE_ID_STORAGE_KEY);
  if (!stored || !isValidNoticeId(stored)) return null;
  sessionStorage.removeItem(NOTICE_ID_STORAGE_KEY);
  return stored;
}

// 다른 페이지(예: 홈, admin)에서 인라인 onclick 등으로 특정 공지 상세로 바로 이동시킬 때 쓰는
// 전역 헬퍼. 공지 객체 전체를 넘기거나 id 문자열을 넘기거나 둘 다 허용한다.
window.goToNoticeDetail = function(id) {
  const noticeId = typeof id === 'object' ? getNoticeId(id) : String(id || '');
  if (!isValidNoticeId(noticeId)) return;
  rememberNoticeId(noticeId);
  window.location.href = getNoticeDetailUrl(noticeId);
};

// 공지 목록을 서버(GET /api/notices)에서 가져온다. category로 '전체 공지'/'새 소식'만 걸러 받고,
// limit으로 개수를 제한(홈 미리보기처럼 몇 개만 필요한 경우)할 수 있다. 둘 다 선택적 쿼리스트링.
async function fetchNotices(category, limit) {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (limit) params.set('limit', String(limit));

  const query = params.toString();
  const response = await fetch(`${getNoticeApiBase()}/api/notices${query ? `?${query}` : ''}`);
  if (!response.ok) throw new Error('공지 목록 조회 실패');
  return response.json();
}

// id 하나로 공지 상세 데이터를 가져온다. 목록 페이지에서 이미 받아둔 데이터가 cachedNotices에
// 있으면(같은 세션에서 목록→상세로 이동한 흔한 경우) 네트워크 요청 없이 즉시 반환해 체감 속도를 높이고,
// 캐시에 없으면(직접 URL 진입, 새로고침 등) 서버에 개별 조회(GET /api/notices/:id)를 보낸다.
async function fetchNoticeById(id) {
  const cached = cachedNotices.find(n => getNoticeId(n) === id);
  if (cached) return cached;

  const response = await fetch(`${getNoticeApiBase()}/api/notices/${encodeURIComponent(id)}`);
  if (!response.ok) throw new Error('공지 조회 실패');
  return response.json();
}

// 카테고리 뱃지(전체 공지/새 소식) HTML을 만든다. CATEGORY_COLORS의 색상 뒤에 16진 알파값
// ('20', '40')을 이어붙여 배경은 연하게, 테두리는 살짝 진하게 하는 방식으로 톤을 맞춘다.
function getCategoryBadge(category) {
  const label = CATEGORY_LABELS[category] || category;
  const color = CATEGORY_COLORS[category] || '#6c757d';
  return `<span class="notice-category-badge" style="background:${color}20;color:${color};border:1px solid ${color}40;">${label}</span>`;
}

// 상세 페이지의 "목록으로" 링크가 어디로 돌아가야 할지 카테고리별로 결정한다.
function getBackLinkForCategory(category) {
  if (category === 'news') return 'news.html';
  return 'all_notices.html';
}

// 공지 하나를 목록 항목(카드/링크) HTML로 렌더링한다. 같은 데이터를 세 가지 다른 레이아웃으로
// 그려야 해서(homeStyle: 홈 미리보기, fullList: 전체목록 페이지, 기본: 공지 메인 페이지 컬럼)
// options 플래그로 분기한다. 공통으로 하는 일: id 유효성 검사 → 상세 링크 생성 → 요약문 길이 제한 →
// 고정(📌)/유튜브 뱃지 조합 → escapeHtml로 안전하게 이스케이프.
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

  // 홈 화면 미리보기 카드용 레이아웃: 제목+상대시간을 한 줄에, 요약을 아래에 간략히 표시.
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

  // 전체목록/새소식 전체 페이지용 카드 레이아웃: 카테고리 뱃지까지 함께 보여주고
  // 요약이 더 길게(200자) 잘린다(homeStyle/기본 레이아웃은 120자로 더 짧음).
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

  // 기본 레이아웃(공지 메인 페이지 notice.html의 두 컬럼): 제목/요약/절대날짜를 세로로 쌓는 카드.
  return `
    <a href="${detailUrl}" data-notice-id="${id}" class="notice-item notice-item-link ${notice.isPinned ? 'notice-item-pinned' : ''}">
      ${pinBadge}
      ${youtubeBadge}
      <span class="notice-link">${escapeHtml(notice.title)}</span>
      <p class="notice-desc">${escapeHtml(shortSummary)}</p>
      <span class="notice-date">${formatDate(notice.createdAt)}</span>
    </a>`;
}

// [notice-detail.html 전용] 상세 페이지 초기화 함수.
// URL/세션 스토리지에서 id를 알아내고 → 서버에서 공지 데이터를 가져와 →
// 상세 카드 전체 HTML(제목/작성자/날짜/뱃지/본문/뒤로가기 등)을 한 번에 그려 넣는다.
// id가 아예 없거나 형식이 잘못됐으면 API를 호출하지 않고 바로 안내 메시지를 보여주고,
// API 호출이 실패하면 네트워크 오류인지(서버 미실행 등) 단순 조회 실패인지 구분해서 메시지를 다르게 낸다.
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
    // 이 상세 페이지에 정상적으로 도달했으니, 다음 진입을 위해 남겨뒀던 임시 id는 정리한다.
    sessionStorage.removeItem(NOTICE_ID_STORAGE_KEY);
    setupNoticeOriginalToggle(notice);
  } catch (err) {
    console.error(err);
    // fetch 자체가 실패(TypeError, 네트워크 끊김 등)했는지 vs. 응답은 왔지만 404 등으로
    // '공지를 찾을 수 없음'인지 구분해서, 사용자에게 좀 더 정확한 안내 문구를 보여준다.
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

// [notice.html 전용] 공지 메인 페이지: '전체 공지'/'새 소식' 두 컬럼에 각각 최신 5개씩 미리보기.
// 두 카테고리를 Promise.all로 동시에 요청해 순차 요청보다 빠르게 로딩한다.
// "문서 N개 모두 보기" 링크의 개수 텍스트는 미리보기와 별도로 전체 개수를 다시 조회해서 채운다
// (limit 없이 재요청 → allNotices.length로 정확한 총 개수를 얻음).
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

// [all_notices.html / news.html 공용] 특정 카테고리 하나의 전체 목록을 그린다.
// 두 페이지 모두 이 함수 하나를 재사용하며(뒤쪽 initNoticePage에서 category만 다르게 넘김),
// limit 없이 요청하므로 해당 카테고리의 모든 공지를 한 번에 받아온다(별도 페이지네이션 API 없음 —
// 하단 paginationEl에는 실제 페이지 넘김이 아니라 총 개수만 텍스트로 표시).
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

// [index.html 홈 화면 전용] 홈페이지 공지 미리보기 위젯을 채운다.
// 각 카테고리 최신 2개만 가져와 homeStyle 카드로 그린다. 홈은 부가 요소이므로 실패 시(catch)
// 별도 오류 메시지를 넣지 않고 콘솔 로그만 남긴다 — 홈 화면 전체가 깨지지 않도록 조용히 넘어간다.
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

// 현재 페이지가 공지 상세 페이지인지 판별한다. 세 가지 신호를 OR로 검사해서
// (body의 data-page 속성, 상세 컨테이너 DOM 존재, URL 경로 패턴) 어느 하나라도 맞으면
// 상세 페이지로 인정 — 배포 환경마다 URL 형태가 조금씩 달라질 수 있어 다중 신호로 안전하게 판별.
function isNoticeDetailPage() {
  const path = window.location.pathname || '';
  return document.body?.dataset?.page === 'notice-detail'
    || !!document.getElementById('notice-detail-container')
    || /notice[-_]detail(?:\.html)?/i.test(path);
}

// 이 스크립트가 로드된 페이지가 어떤 종류인지(상세/홈/전체공지/새소식/공지메인) DOM과 경로를
// 보고 자동으로 판별한다. notice.js 하나가 여러 HTML 파일 + index.html에서 공유되기 때문에,
// "지금 내가 어느 페이지에 있는가"를 스스로 알아내야 알맞은 렌더 함수를 실행할 수 있다.
function detectPageType() {
  const path = window.location.pathname || '';

  if (isNoticeDetailPage()) return 'detail';
  if (document.getElementById('home-notice-items')) return 'home';
  if (path.includes('all_notices')) return 'all_notices';
  if (path.includes('news.html') || path.endsWith('/news')) return 'news';
  if (path.includes('notice.html') || (path.includes('/notice/') && !path.includes('notice-detail'))) return 'notice_main';
  return 'unknown';
}

// detectPageType()의 결과에 따라 딱 맞는 렌더 함수 하나만 실행하는 디스패처.
// DOMContentLoaded 시점에 한 번 호출된다(아래 이벤트 리스너 참고).
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

// 공지 카드([data-notice-id] 속성을 가진 <a>)를 클릭하는 순간을 문서 전체에서 한 번만
// 위임(event delegation) 방식으로 감시한다. 목록이 동적으로 다시 그려져도(innerHTML 교체)
// 매번 리스너를 새로 붙일 필요 없이 이 하나로 모든 카드 클릭을 잡아 rememberNoticeId()를 호출한다.
function setupNoticeLinkDelegation() {
  document.addEventListener('click', (event) => {
    const link = event.target.closest('[data-notice-id]');
    if (!link?.dataset.noticeId) return;
    if (!isValidNoticeId(link.dataset.noticeId)) return;
    rememberNoticeId(link.dataset.noticeId);
  });
}

// notice-detail.html이 <script> 인라인 코드로 initNoticeDetailPage()를 한 번 더 호출할 수 있어
// (DOMContentLoaded 리스너와 중복 가능) 실제 렌더링이 두 번 일어나지 않도록 막는 가드 플래그.
let noticeDetailInitialized = false;

function initNoticeDetailPage() {
  if (noticeDetailInitialized) return;
  noticeDetailInitialized = true;
  renderNoticeDetailPage();
}

// 진입점: DOM 로드가 끝나면 링크 클릭 위임을 걸어두고, 현재 페이지에 맞는 렌더링을 시작한다.
document.addEventListener('DOMContentLoaded', () => {
  setupNoticeLinkDelegation();
  initNoticePage();
});

// index.html의 인라인 스크립트나 notice-detail.html의 인라인 스크립트 등, 이 파일 밖에서도
// 필요할 때 호출할 수 있도록 주요 함수를 전역(window)에 노출한다.
window.initNoticePage = initNoticePage;
window.initNoticeDetailPage = initNoticeDetailPage;
window.renderNoticeDetailPage = renderNoticeDetailPage;
window.fetchNotices = fetchNotices;
window.NOTICE_CATEGORY_LABELS = CATEGORY_LABELS;