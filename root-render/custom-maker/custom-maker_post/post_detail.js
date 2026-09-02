// post_detail.js
// 커스텀 티어 게시글 "상세" 페이지 스크립트. 크게 세 파트로 구성된다:
//   1) 게시글 조회/렌더링 — 읽기 전용 티어표(renderReadOnlyTier), 조회수·추천·작성자 표시
//   2) 게시글 액션 — 추천(좋아요), 공유, 수정(작성자만), 삭제(작성자만), 신고
//   3) 댓글 — 목록 조회, 새 댓글/답글(대댓글) 작성, 수정, 삭제, 신고, 알림 딥링크로 특정 댓글 스크롤
// 서버가 최종 권한(작성자 검증 등)을 검사하므로, 이 파일의 isPostOwner/isSameAuthor 같은
// 클라이언트 판정은 버튼 노출 여부를 정하는 UX용이며 보안 경계가 아니다.

const POST_ID_STORAGE_KEY = 'selectedPostId';
const REPORT_REASONS = ['도배 및 테러행위', '비방 및 모욕행위', '광고형 댓글', '기타'];

const DEFAULT_TIER_DEFINITIONS = [
  { id: 1, title: '1등급 - 신계 / 슈퍼 그랜드 마스터', subTiers: ['갑급', '을급', '병급', '정급'] },
  { id: 2, title: '2등급 - 뒷세계의 전설 / 그랜드 마스터', subTiers: ['갑급', '을급', '병급', '정급'] },
  { id: 3, title: '3등급 - 톱 클래스 무투파 / 마스터', subTiers: ['갑급', '을급', '병급', '정급'] },
  { id: 4, title: '4등급 - 준 톱클래스 무투파 / 다이아몬드', subTiers: ['갑급', '을급', '병급', '정급'] },
  { id: 5, title: '5등급 - 중견급 무투파 & 탈사제급 / 플레티넘', subTiers: ['갑급', '을급', '병급'] },
  { id: 6, title: '6등급 - 중하위권 무투파 or 정예 사제 / 골드', subTiers: ['갑급', '을급', '병급'] },
  { id: 7, title: '7등급 - 하위권 무투파 or 우수한 사제 / 실버', subTiers: ['갑급', '을급', '병급'] },
  { id: 8, title: '8등급 - 평범한 사제 수준의 전투력 / 브론즈', subTiers: ['갑급', '을급', '병급'] },
  { id: 9, title: '9등급 - 비전투원 또는 전투력 측정 단서 없음 / 언랭크', subTiers: ['미묘사 인원들'] },
];

let currentPost = null;
let currentTierIndex = 0;
let tierDefinitions = DEFAULT_TIER_DEFINITIONS;
let savedTierState = {};

// 게시글/댓글 API 호출용 서버 주소 판별 (common.js getApiBase()와 동일 로직의 자체 fallback)
function getTierApiBase() {
  const { protocol, hostname, port } = window.location;

  if (/\.github\.io$/i.test(hostname)) {
    return 'GITHUB_STATIC';
  }

  if (
    protocol === 'file:' ||
    port === '5500' || port === '3000' || port === '5173' ||
    port === '8080' || port === '4200' || port === '8000'
  ) {
    return 'http://localhost:5000';
  }
  return '';
}

// 로그인 토큰(Authorization 헤더)을 붙인 API 헤더를 만든다. common.js가 로드돼 있으면
// getAuthHeaders()를 그대로 위임하고, 없으면 최소한 Content-Type만 있는 헤더로 대체한다.
function apiHeaders(extra = {}) {
  if (typeof getAuthHeaders === 'function') return getAuthHeaders(extra);
  return { 'Content-Type': 'application/json', ...extra };
}

function isAdminLoggedIn() {
  return localStorage.getItem('isAdmin') === 'true';
}

function getLoggedInUser() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (user?.nickname) {
      return { ...user, isAdmin: false };
    }
  } catch (err) {
    console.warn('로그인 정보 파싱 실패:', err);
  }

  if (isAdminLoggedIn()) {
    return {
      nickname: localStorage.getItem('adminName') || '관리자',
      email: '',
      isAdmin: true,
    };
  }

  return null;
}

// 게시글 소유자 판정 (isSameAuthor의 게시글 전용 alias)
function isPostOwner(post, user) {
  return isSameAuthor(post, user);
}

// 게시글/댓글 공용 "작성자 == 현재 로그인 사용자" 판정.
// 이메일이 둘 다 있으면 이메일로 정확 비교(가장 신뢰도 높음), 없으면 닉네임 문자열로 대체 비교한다.
// 닉네임 비교는 동명이인일 경우 오탐 가능성이 있지만, 이메일이 없던 과거 데이터 호환을 위해
// 의도적으로 남겨둔 완화된 규칙이다 — 실제 수정/삭제 권한은 서버가 다시 검증한다.
function isSameAuthor(record, user) {
  if (!record || !user) return false;

  const recordEmail = (record.authorEmail || '').trim().toLowerCase();
  const userEmail = (user.email || '').trim().toLowerCase();
  if (recordEmail && userEmail) {
    return recordEmail === userEmail;
  }

  const recordAuthor = (record.author || record.userId || '').trim();
  const userName = (user.nickname || '').trim();
  return Boolean(recordAuthor && userName && recordAuthor === userName);
}

// 사용자 입력 텍스트를 이스케이프한 뒤 줄바꿈만 <br>로 되살려 HTML로 안전하게 표시한다
// (contenteditable로 입력받은 댓글은 순수 텍스트로 저장되므로, 표시할 때 줄바꿈을 복원해야 함)
function nl2br(text) {
  if (!text) return '';
  return escapeHtml(text).replace(/\n/g, '<br>');
}

function formatCommentDate(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// 현재 로드된 게시글(currentPost)의 id를 문자열로 반환. 댓글 API 호출 등 곳곳에서 재사용
function getCurrentPostId() {
  if (!currentPost) return '';
  const raw = currentPost._id ?? currentPost.id;
  if (!raw) return '';
  return typeof raw === 'object' && typeof raw.toString === 'function' ? raw.toString() : String(raw);
}

// 헤더의 "댓글 N"과 댓글 섹션 제목의 "(N)" 두 곳을 동시에 갱신
function updateCommentCount(count) {
  const headerCount = document.getElementById('comment-count-header');
  const sectionCount = document.getElementById('comment-count');
  if (headerCount) headerCount.textContent = count;
  if (sectionCount) sectionCount.textContent = `(${count})`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatFullDate(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function isValidPostId(id) {
  return typeof id === 'string' && /^[a-fA-F0-9]{24}$/.test(id);
}

// 이 페이지에 어떤 게시글을 보여줘야 하는지, 여러 경로를 순서대로 시도해서 id를 찾는다.
// 우선순위: ?id=/?postId=/?post_id= 쿼리 → path 안에 24자리 id가 박혀있는 경우 →
// 해시(#id=... 또는 #24자리id) → 마지막으로 목록 페이지에서 클릭 시 저장해둔 sessionStorage.
// 이렇게 여러 경로를 지원하는 이유는 알림 딥링크, 구버전 링크, 목록 카드 클릭 등 진입 경로가
// 다양해서 어떤 방식으로 들어와도 게시글을 찾을 수 있게 하기 위함이다.
function getPostIdFromURL() {
  try {
    const search = window.location.search || '';
    if (search.length > 1) {
      const params = new URLSearchParams(search);
      for (const key of ['id', 'postId', 'post_id']) {
        const raw = params.get(key);
        if (!raw) continue;
        const decoded = decodeURIComponent(raw).trim();
        if (decoded) return decoded;
      }
    }

    const pathMatch = (window.location.pathname || '').match(/post[-_]detail(?:\.html)?[/?]([a-fA-F0-9]{24})\/?$/i);
    if (pathMatch?.[1]) return pathMatch[1];

    const hash = window.location.hash.replace(/^#\/?/, '');
    if (hash) {
      const hashParams = new URLSearchParams(hash.includes('=') ? hash : `id=${hash}`);
      for (const key of ['id', 'postId', 'post_id']) {
        const raw = hashParams.get(key);
        if (!raw) continue;
        const decoded = decodeURIComponent(raw).trim();
        if (decoded) return decoded;
      }
    }

    const stored = sessionStorage.getItem(POST_ID_STORAGE_KEY);
    if (stored) {
      const decoded = decodeURIComponent(stored).trim();
      if (decoded) return decoded;
    }
  } catch (err) {
    console.error('게시글 ID 파싱 실패:', err);
  }

  return null;
}

// sessionStorage에 남아있는 "방금 클릭한 게시글 id"를 한 번 읽고 즉시 지운다(소비형).
// getPostIdFromURL()이 URL에서 id를 못 찾았을 때의 최후 수단으로 쓰인다.
function consumeStoredPostId() {
  const stored = sessionStorage.getItem(POST_ID_STORAGE_KEY);
  if (!stored || !isValidPostId(stored)) return null;
  sessionStorage.removeItem(POST_ID_STORAGE_KEY);
  return stored;
}

// URL에 ?id=가 없는 경로(해시나 sessionStorage)로 게시글을 찾은 경우, 주소창을 ?id=형태로
// 맞춰준다. replaceState라 히스토리를 새로 쌓지 않고 현재 URL만 정리하는 방식 — 새로고침해도
// 같은 게시글이 열리고, 링크를 복사해도 올바른 주소가 공유된다.
function syncPostIdToUrl(postId) {
  if (!isValidPostId(postId)) return;
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get('id') === postId) return;
    url.searchParams.set('id', postId);
    window.history.replaceState(null, '', url.toString());
  } catch (err) {
    console.warn('게시글 ID URL 동기화 실패:', err);
  }
}

async function fetchPostDetail(id) {
  const response = await fetch(`${getTierApiBase()}/api/tierlists/${encodeURIComponent(id)}`, {
    headers: apiHeaders(),
  });
  if (!response.ok) throw new Error('게시글 조회 실패');
  return response.json();
}

function resolveAssetPath(path) {
  if (!path) return getBasePath() + 'tier-image/logo.webp';
  if (path.startsWith('http')) return path;
  if (path.startsWith('/')) {
    // GH Pages subpath or root deploys: prefix correctly
    return getBasePath() + path.slice(1);
  }
  if (path.startsWith('../')) {
    // strip leading ../ and let getBasePath handle depth
    return getBasePath() + path.replace(/^\.\.\//, '');
  }
  return getBasePath() + path;
}

// custom-maker.js의 createCharElement()와 같은 역할이지만, draggable/dataset.id 등 편집용
// 속성 없이 순수 표시용 카드만 만든다 (상세 페이지는 배치를 바꿀 수 없으므로)
function createReadOnlyCharElement(char) {
  const div = document.createElement('div');
  div.className = 'char';
  const imgSrc = resolveAssetPath(char.img);
  div.innerHTML = `
    <img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(char.name)}" onerror="this.src=(window.getBasePath ? getBasePath() : '../../') + 'tier-image/logo.webp'">
    <p>${escapeHtml(char.name)}</p>
  `;
  return div;
}

// 현재 currentTierIndex 등급의 세부 등급 칸을 그리고, savedTierState(게시글에 저장된 배치)를
// 그대로 채워 넣는다. custom-maker.js의 renderTier()와 거의 동일한 구조지만 읽기 전용이라
// 드래그/탭 이벤트가 전혀 없다.
function renderReadOnlyTier() {
  const container = document.getElementById('tier-list');
  const titleEl = document.getElementById('tier-title');
  if (!container || !titleEl) return;

  const current = tierDefinitions[currentTierIndex];
  if (!current) return;

  titleEl.textContent = current.title;

  let html = '';
  current.subTiers.forEach(subName => {
    html += `
      <div class="tier">
        <div class="tier-name">${escapeHtml(subName)}</div>
        <div class="characters drop-zone" data-tier="${escapeHtml(subName)}"></div>
      </div>`;
  });
  container.innerHTML = html;

  container.querySelectorAll('.characters').forEach(zone => {
    const subTierName = zone.getAttribute('data-tier');
    const storageKey = `${currentTierIndex}_${subTierName}`;
    const chars = savedTierState[storageKey] || [];

    chars.forEach(char => {
      zone.appendChild(createReadOnlyCharElement(char));
    });
  });
}

// 이전/다음 등급 버튼에 리스너를 등록. 게시글이 저장하고 있는 tierDefinitions 기준으로 순환한다
function setupTierNavigation() {
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      currentTierIndex = (currentTierIndex - 1 + tierDefinitions.length) % tierDefinitions.length;
      renderReadOnlyTier();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      currentTierIndex = (currentTierIndex + 1) % tierDefinitions.length;
      renderReadOnlyTier();
    });
  }
}

// 게시글 헤더/제목/설명/조회수/추천수를 화면에 채우고, 브라우저 탭 제목도 게시글 제목으로 바꾼다
function renderPostMeta(post) {
  const titleEl = document.querySelector('.post-title');
  const authorEl = document.getElementById('author-name');
  const dateEl = document.getElementById('post-date');
  const viewsEl = document.getElementById('post-views');
  const likesEl = document.getElementById('post-likes');
  const likeCountEl = document.getElementById('like-count');

  if (titleEl) titleEl.textContent = post.title;
  const descEl = document.getElementById('post-description');
  if (descEl) {
    const desc = (post.description || '').trim();
    if (desc) {
      descEl.hidden = false;
      descEl.textContent = desc;
    } else {
      descEl.hidden = true;
      descEl.textContent = '';
    }
  }
  if (authorEl) authorEl.textContent = post.author || '익명';
  if (dateEl) dateEl.textContent = formatFullDate(post.createdAt);
  if (viewsEl) viewsEl.textContent = post.viewCount || 0;
  if (likesEl) likesEl.textContent = post.likeCount || 0;
  if (likeCountEl) likeCountEl.textContent = post.likeCount || 0;

  document.title = `${post.title} - 커스텀 티어 상세`;
}

// 게시글을 찾지 못하거나(삭제됨/잘못된 id) 서버 연결이 안 될 때, 페이지 전체를 안내 메시지 +
// 게시판으로 돌아가는 링크로 갈아치운다. 헤더/댓글 등은 데이터가 없어 애매하게 반쪽만 남기는
// 대신, 아예 명확한 에러 화면으로 대체하는 방식을 택했다.
function showPostError(message) {
  const container = document.querySelector('.post-detail-container');
  if (!container) return;
  container.innerHTML = `
    <div class="empty-message" style="padding:120px 20px;text-align:center;">
      <h2>${escapeHtml(message)}</h2>
      <p style="margin-top:12px;"><a href="${getBasePath()}custom-maker/custom-maker_post/custom-maker_post.html">← 게시판으로 돌아가기</a></p>
    </div>`;
}

// 상세 페이지의 메인 진입점. 게시글 id를 찾아 서버에서 조회한 뒤, 티어 정의/배치 상태를
// currentPost에서 뽑아내 모든 하위 렌더링(메타/액션버튼/댓글폼/티어표/댓글목록)을 순서대로 실행한다.
// 성공하면 sessionStorage에 남아있던 임시 id를 지워 다음 진입에 영향이 없게 정리한다.
async function loadPostDetail() {
  const postId = getPostIdFromURL() || consumeStoredPostId();
  if (!postId || !isValidPostId(postId)) {
    showPostError('잘못된 접근입니다.');
    return;
  }

  syncPostIdToUrl(postId);

  try {
    currentPost = await fetchPostDetail(postId);

    tierDefinitions = currentPost.tierData?.tierDefinitions || DEFAULT_TIER_DEFINITIONS;
    savedTierState = currentPost.tierData?.tierState || {};

    renderPostMeta(currentPost);
    updatePostActions();
    updateCommentFormState();
    renderReadOnlyTier();
    setupTierNavigation();
    await loadComments();
    sessionStorage.removeItem(POST_ID_STORAGE_KEY);
  } catch (err) {
    console.error(err);
    const isNetworkError = err instanceof TypeError || /fetch|network|Failed/i.test(err.message || '');
    showPostError(isNetworkError
      ? '서버에 연결할 수 없습니다. backend에서 npm start를 실행해주세요.'
      : '게시글을 찾을 수 없거나 삭제되었습니다.');
  }
}

// "유저관련 게시글 보기" 버튼: 이 게시글 작성자로 필터링된 게시판 목록으로 이동
function goToUserPosts() {
  if (!currentPost?.author) return;
  // Use getBasePath() to support GitHub Pages subpath deploys (/repo-name/...)
  window.location.href = `${getBasePath()}custom-maker/custom-maker_post/custom-maker_post.html?author=${encodeURIComponent(currentPost.author)}`;
}

// 헤더의 "댓글 N" 클릭: 페이지 아래 댓글 섹션으로 부드럽게 스크롤만 이동 (하이라이트 없음)
function scrollToComments() {
  const commentSection = document.querySelector('.comment-section');
  if (commentSection) {
    commentSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// 페이지 진입 시 "특정 댓글로 바로 스크롤해야 하는지" 그 대상 댓글 id를 결정한다.
// 1순위: URL의 ?comment=댓글id (직접 공유된 링크)
// 2순위: 알림(notifications)을 클릭해 들어온 경우 common.js가 남겨둔 스크롤 타겟 정보
function resolveCommentScrollTarget() {
  try {
    const params = new URLSearchParams(window.location.search || '');
    const fromUrl = (params.get('comment') || '').trim();
    if (fromUrl) return fromUrl;
  } catch (err) {
    console.warn('댓글 스크롤 URL 파싱 실패:', err);
  }

  const stored = typeof getNotificationScrollTarget === 'function'
    ? getNotificationScrollTarget()
    : null;
  if (stored?.page === 'tierPost' && stored.commentId) {
    return String(stored.commentId).trim();
  }
  return '';
}

// 대상 댓글 DOM에 하이라이트 클래스를 붙여 시각적으로 강조하고, 2.8초 후 자동으로 제거한다
function highlightScrollTarget(element) {
  if (!element) return;
  element.classList.add('notification-scroll-highlight');
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  setTimeout(() => element.classList.remove('notification-scroll-highlight'), 2800);
}

// 지정한 commentId를 가진 댓글 DOM을 찾아 스크롤+하이라이트한다.
// 댓글 목록은 비동기로 로드되므로, 페이지 진입 직후엔 아직 DOM에 없을 수 있다 — 그럴 땐
// 150ms 간격으로 최대 40번(약 6초) 재시도해서, 로딩이 끝난 뒤에도 확실히 스크롤되게 한다.
function scrollToCommentTarget(commentId, retries = 40) {
  if (!commentId) return;

  const safeId = CSS.escape(String(commentId));
  const element = document.querySelector(`.post-comment-item[data-comment-id="${safeId}"]`);

  if (element) {
    const section = document.querySelector('.comment-section');
    if (section) {
      section.scrollIntoView({ behavior: 'auto', block: 'start' });
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        highlightScrollTarget(element);
        if (typeof clearNotificationScrollTarget === 'function') {
          clearNotificationScrollTarget();
        }
      });
    });
    return;
  }

  if (retries > 0) {
    setTimeout(() => scrollToCommentTarget(commentId, retries - 1), 150);
  }
}

// resolveCommentScrollTarget() + scrollToCommentTarget()을 묶어서 실행하는 헬퍼.
// loadComments() 완료 직후, 그리고 window load 이벤트에서(보험 차원으로) 각각 호출된다.
function runNotificationCommentScroll() {
  const commentTarget = resolveCommentScrollTarget();
  if (commentTarget) {
    scrollToCommentTarget(commentTarget);
  }
}

// 로그인이 필요한 동작(추천/댓글/신고 등) 진입점에서 공통으로 쓰는 가드.
// 로그인 안 돼 있으면 확인창을 띄우고 동의 시 로그인 페이지로 보낸 뒤 null을 반환해서
// 호출부가 즉시 동작을 중단하게 한다.
function requireLoggedIn(message) {
  const user = getLoggedInUser();
  if (user) return user;

  if (confirm(`${message}\n로그인 페이지로 이동할까요?`)) {
    window.location.href = getBasePath() + 'user_login/login.html';
  }
  return null;
}

// 열려있는 모든 답글/수정 입력 박스를 닫는다. 새로운 답글/수정 박스를 열기 전에 먼저 호출해서
// 화면에 입력창이 여러 개 동시에 떠 있지 않도록 한다 (한 번에 하나만 편집 가능)
function closeAllCommentActionBoxes() {
  document.querySelectorAll('.post-comment-action-box').forEach(box => box.remove());
}

// 댓글 객체에서 id를 문자열로 뽑아낸다 (getPostId와 동일한 목적의 댓글 버전)
function getCommentId(comment) {
  const raw = comment?._id ?? comment?.id;
  if (!raw) return '';
  return typeof raw === 'object' && typeof raw.toString === 'function' ? raw.toString() : String(raw);
}

// 신고 사유 선택 모달. custom-maker_post.js의 openReportModal()과 거의 동일한 마크업/동작이지만,
// 이 페이지에서는 게시글 신고와 댓글 신고 양쪽에서 재사용한다(title/onSubmit으로 구분)
function openReportModal({ title, onSubmit }) {
  closeReportModal();

  const modalHTML = `
    <div id="report-modal" class="report-modal-overlay">
      <div class="report-modal-card">
        <h3>${escapeHtml(title)}</h3>
        <div class="report-modal-reasons">
          ${REPORT_REASONS.map(reason => `
            <button type="button" class="report-reason-btn" data-reason="${escapeHtml(reason)}">${escapeHtml(reason)}</button>
          `).join('')}
        </div>
        <button type="button" class="report-modal-cancel" id="report-modal-cancel">취소</button>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', modalHTML);

  const modal = document.getElementById('report-modal');
  modal.querySelector('#report-modal-cancel')?.addEventListener('click', closeReportModal);
  modal.querySelectorAll('.report-reason-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      let reason = btn.dataset.reason || '';
      let detail = '';

      if (reason === '기타') {
        detail = prompt('기타 사유를 입력해주세요:') || '';
        if (!detail.trim()) {
          closeReportModal();
          return;
        }
      }

      closeReportModal();
      await onSubmit(reason, detail.trim());
    });
  });
}

function closeReportModal() {
  document.getElementById('report-modal')?.remove();
}

// 로그인 상태·작성자 여부에 따라 수정/삭제/신고/이벤트 버튼의 노출과 추천 버튼 상태를
// 한 번에 갱신한다. loadPostDetail() 완료 직후, 그리고 신고 성공 후에도 다시 호출된다.
function updatePostActions() {
  const user = getLoggedInUser();
  const isOwner = isPostOwner(currentPost, user);
  const deleteBtn = document.getElementById('delete-btn');
  const editBtn = document.getElementById('edit-btn');
  const eventBtn = document.getElementById('event-btn');
  const reportBtn = document.getElementById('report-post-btn');

  if (deleteBtn) deleteBtn.hidden = !isOwner;
  if (editBtn) editBtn.hidden = !isOwner;

  if (reportBtn) {
    reportBtn.hidden = Boolean(isOwner);
    reportBtn.disabled = Boolean(currentPost?.reported);
    reportBtn.textContent = currentPost?.reported ? '신고됨' : '🚨 신고하기';
  }

  updateEventButtonVisibility();
  updateLikeButtonState();
}

// 이벤트 참여 버튼은 작성자 본인에게만 보인다 (기능 자체는 handleEventParticipation()에서
// "준비 중" 안내만 뜨는 미구현 기획 스텁이지만, 노출 로직은 이미 작성자 검사를 반영해둔 상태)
function updateEventButtonVisibility() {
  const eventBtn = document.getElementById('event-btn');
  const user = getLoggedInUser();
  if (!eventBtn) return;

  const isOwner = isPostOwner(currentPost, user);
  eventBtn.hidden = !isOwner;
  if (isOwner) {
    eventBtn.disabled = false;
    eventBtn.textContent = '🎉 이벤트 참여';
  }
}

// currentPost.likedByMe 값에 따라 추천 버튼을 비활성화한다 (한 사람당 한 번만 추천 가능,
// 서버가 최종 검증하지만 UX상 이미 눌렀다는 걸 바로 보여주기 위한 낙관적(optimistic) 갱신)
function updateLikeButtonState() {
  const likeBtn = document.getElementById('like-btn');
  if (!likeBtn || !currentPost) return;

  if (currentPost.likedByMe) {
    likeBtn.disabled = true;
    likeBtn.title = '이미 추천한 게시글입니다.';
  } else {
    likeBtn.disabled = false;
    likeBtn.title = '';
  }
}

// 게시글 신고 버튼 클릭 핸들러: 로그인 확인 → 본인 글이면 차단 → 이미 신고했으면 차단 →
// 사유 모달을 띄우고 선택 결과를 서버로 전송. 성공 시 currentPost.reported를 true로 바꿔
// 버튼을 "신고됨" 비활성 상태로 즉시 반영한다.
async function handleReportPost() {
  const postId = getCurrentPostId();
  const user = requireLoggedIn('게시글을 신고하려면 로그인이 필요합니다.');
  if (!postId || !user) return;

  if (isPostOwner(currentPost, user)) {
    alert('본인 게시글은 신고할 수 없습니다.');
    return;
  }

  if (currentPost?.reported) {
    alert('이미 신고된 게시글입니다.');
    return;
  }

  openReportModal({
    title: '게시글 신고 사유 선택',
    onSubmit: async (reason, detail) => {
      try {
        const response = await fetch(`${getTierApiBase()}/api/tierlists/${encodeURIComponent(postId)}/report`, {
          method: 'POST',
          headers: apiHeaders(),
          body: JSON.stringify({ reason, detail }),
        });
        const data = await response.json();

        if (response.ok && data.success) {
          currentPost.reported = true;
          updatePostActions();
          alert('신고가 접수되었습니다.');
          return;
        }

        alert(data.error || '신고에 실패했습니다.');
      } catch (err) {
        console.error(err);
        alert('서버에 연결할 수 없습니다.');
      }
    },
  });
}

// "수정하기" 버튼 클릭: 로그인·작성자 확인 후, 게시글 전체 데이터를 sessionStorage에 스냅샷으로
// 저장해두고 전용 수정 페이지(post_edit.html)로 이동한다. custom-maker.js의 enterEditMode()가
// 이 스냅샷으로 먼저 화면을 채운 뒤 서버에서 최신본을 재조회해 덮어쓴다.
function handleEditPost() {
  if (!currentPost) return;

  const user = getLoggedInUser();
  if (!user) {
    if (confirm('수정하려면 로그인이 필요합니다.\n로그인 페이지로 이동할까요?')) {
      window.location.href = getBasePath() + 'user_login/login.html';
    }
    return;
  }

  if (!isPostOwner(currentPost, user)) {
    alert('본인 게시글만 수정할 수 있습니다.');
    return;
  }

  const id = getCurrentPostId();
  if (!id) {
    alert('게시글 정보를 확인할 수 없습니다.');
    return;
  }

  // 메이커에서 원본 tierData를 바로 복원할 수 있도록 스냅샷 저장
  try {
    sessionStorage.setItem(
      'customMakerEditPost',
      JSON.stringify({
        _id: id,
        id,
        title: currentPost.title || '',
        description: currentPost.description || '',
        author: currentPost.author || '',
        authorEmail: currentPost.authorEmail || '',
        thumbnail: currentPost.thumbnail || '',
        tierData: currentPost.tierData || null,
      })
    );
  } catch (err) {
    console.warn('수정용 게시글 스냅샷 저장 실패:', err);
  }

  // 전용 수정 페이지로 이동 (게시 티어표 로드 → 수정완료)
  const base = typeof getBasePath === 'function' ? getBasePath() : '/';
  window.location.href = `${base}custom-maker/post_edit.html?id=${encodeURIComponent(id)}`;
}

// "삭제하기" 버튼 클릭: 로그인·작성자·확인창을 통과하면 DELETE 요청. 게시글이 삭제되면
// 서버 쪽에서 딸린 댓글들도 함께 삭제되는 것을 전제로 하며(연쇄 삭제), 성공 시 목록으로 이동한다.
async function handleDeletePost() {
  if (!currentPost) return;

  const user = getLoggedInUser();
  if (!user) {
    if (confirm('삭제하려면 로그인이 필요합니다.\n로그인 페이지로 이동할까요?')) {
      window.location.href = getBasePath() + 'user_login/login.html';
    }
    return;
  }

  if (!isPostOwner(currentPost, user)) {
    alert('본인 게시글만 삭제할 수 있습니다.');
    return;
  }

  if (!confirm('이 게시글을 삭제할까요?\n삭제 후에는 복구할 수 없습니다.')) return;

  const id = currentPost._id || currentPost.id;
  try {
    const response = await fetch(`${getTierApiBase()}/api/tierlists/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: apiHeaders(),
      body: JSON.stringify({}),
    });
    const data = await response.json();

    if (response.ok && data.success) {
      alert('게시글이 삭제되었습니다.');
      window.location.href = getBasePath() + 'custom-maker/custom-maker_post/custom-maker_post.html';
      return;
    }

    alert(data.error || '삭제에 실패했습니다.');
  } catch (err) {
    console.error(err);
    alert('서버에 연결할 수 없습니다. backend에서 npm start를 실행해주세요.');
  }
}

// "이벤트 참여" 버튼: 기능 자체는 아직 구현되지 않은 기획 스텁이라 안내 알림만 띄운다
function handleEventParticipation() {
  alert('이벤트 기능은 준비 중입니다.');
}

// "추천하기" 버튼 클릭: 로그인 확인 후 PATCH로 좋아요 토글 요청.
// 서버가 이미 추천했다고 응답하면(likedByMe/에러 메시지로 판단) 클라이언트 상태도 맞춰
// likedByMe를 true로 동기화해서 버튼이 다시 눌리지 않게 한다.
async function handleLike() {
  if (!currentPost) return;

  const user = getLoggedInUser();
  if (!user) {
    requireLoggedIn('추천하려면 로그인이 필요합니다.');
    return;
  }

  const id = currentPost._id || currentPost.id;
  try {
    const response = await fetch(`${getTierApiBase()}/api/tierlists/${encodeURIComponent(id)}/like`, {
      method: 'PATCH',
      headers: apiHeaders(),
    });
    const data = await response.json();

    if (response.ok && data.success) {
      currentPost.likeCount = data.likeCount;
      currentPost.likedByMe = true;
      document.getElementById('post-likes').textContent = data.likeCount;
      document.getElementById('like-count').textContent = data.likeCount;
      updateLikeButtonState();
      return;
    }

    if (data.likedByMe || /이미 추천/.test(data.error || '')) {
      currentPost.likedByMe = true;
      updateLikeButtonState();
      alert(data.error || '이미 추천한 게시글입니다.');
      return;
    }
  } catch (err) {
    console.error(err);
    alert('추천 처리에 실패했습니다.');
  }
}

// 게시글 액션 버튼(추천/공유/수정/삭제/신고/이벤트)에 클릭 리스너를 한 번에 등록.
// 공유 버튼은 클립보드 API로 현재 페이지 URL을 복사하는 가장 단순한 구현이다.
function setupActionButtons() {
  const likeBtn = document.getElementById('like-btn');
  const shareBtn = document.getElementById('share-btn');
  const eventBtn = document.getElementById('event-btn');
  const editBtn = document.getElementById('edit-btn');
  const deleteBtn = document.getElementById('delete-btn');

  if (likeBtn) likeBtn.addEventListener('click', handleLike);
  if (editBtn) editBtn.addEventListener('click', handleEditPost);
  if (deleteBtn) deleteBtn.addEventListener('click', handleDeletePost);

  const reportPostBtn = document.getElementById('report-post-btn');
  if (reportPostBtn) reportPostBtn.addEventListener('click', handleReportPost);

  if (shareBtn) {
    shareBtn.addEventListener('click', () => {
      navigator.clipboard?.writeText(window.location.href);
      alert('현재 페이지 링크가 복사되었습니다.');
    });
  }

  if (eventBtn) eventBtn.addEventListener('click', handleEventParticipation);
}

// 로그인 여부에 따라 댓글 입력창을 활성/비활성화한다. 비로그인이면 contenteditable을 꺼서
// 입력 자체를 막고, 로그인 안내 문구(comment-login-hint)를 보여준다.
function updateCommentFormState() {
  const user = getLoggedInUser();
  const loginHint = document.getElementById('comment-login-hint');
  const inputBox = document.getElementById('comment-input');
  const submitBtn = document.getElementById('comment-submit-btn');

  if (loginHint) loginHint.hidden = Boolean(user);
  if (inputBox) {
    inputBox.contentEditable = user ? 'true' : 'false';
    if (!user) inputBox.innerHTML = '';
  }
  if (submitBtn) submitBtn.disabled = !user;
}

async function fetchComments(postId) {
  const response = await fetch(`${getTierApiBase()}/api/tierlists/${encodeURIComponent(postId)}/comments`);
  if (!response.ok) throw new Error('댓글 목록 조회 실패');
  return response.json();
}

// 댓글 하나에 붙는 액션 버튼들을 만든다. 비로그인이면 아예 버튼을 안 보여주고(빈 문자열),
// 로그인 상태에서는 누구나 "답변"은 가능, 본인 댓글이면 "수정/삭제", 남의 댓글이면
// 이미 신고했는지(comment.reported)에 따라 "신고" 또는 비활성화된 "신고됨"을 보여준다.
function renderCommentActions(comment) {
  const user = getLoggedInUser();
  if (!user) return '';

  const commentId = getCommentId(comment);
  const isMine = isSameAuthor(comment, user);
  const buttons = [];

  buttons.push(`<button type="button" class="post-comment-action-btn" data-action="reply" data-comment-id="${escapeHtml(commentId)}">답변</button>`);

  if (isMine) {
    buttons.push(`<button type="button" class="post-comment-action-btn" data-action="edit" data-comment-id="${escapeHtml(commentId)}">수정</button>`);
    buttons.push(`<button type="button" class="post-comment-action-btn danger" data-action="delete" data-comment-id="${escapeHtml(commentId)}">삭제</button>`);
  } else if (comment.reported) {
    buttons.push('<button type="button" class="post-comment-action-btn" disabled>신고됨</button>');
  } else {
    buttons.push(`<button type="button" class="post-comment-action-btn" data-action="report" data-comment-id="${escapeHtml(commentId)}">신고</button>`);
  }

  return `<div class="post-comment-actions">${buttons.join('')}</div>`;
}

// 댓글 카드 하나의 HTML을 생성. 답글(parentCommentId가 있음)이면 is-reply 클래스로 들여쓰고
// 원댓글 인용 블록(quotedMessage)을 위에 붙인다. 댓글 본문에는 id를 붙여(comment-body-*)
// 답글 작성 시 원문 스니펫을 다시 읽어올 수 있게 한다(getCommentDataFromElement에서 사용).
function renderCommentItem(comment) {
  const commentId = getCommentId(comment);
  const isReply = Boolean(comment.parentCommentId);
  const quoteHTML = comment.quotedMessage ? `
    <div class="post-comment-quote">
      <strong>${escapeHtml(comment.quotedUser || '익명')} &gt;&gt;</strong><br>
      ${nl2br(comment.quotedMessage)}
    </div>` : '';

  return `
    <article class="post-comment-item${isReply ? ' is-reply' : ''}" data-comment-id="${escapeHtml(commentId)}">
      <div class="post-comment-header">
        <span class="post-comment-author">${escapeHtml(comment.author || '익명')}</span>
        <span class="post-comment-date">${formatCommentDate(comment.createdAt)}</span>
      </div>
      ${quoteHTML}
      <div class="post-comment-body" id="comment-body-${escapeHtml(commentId)}">${nl2br(comment.content)}</div>
      ${renderCommentActions(comment)}
    </article>`;
}

// 댓글 목록 컨테이너 하나에 클릭 이벤트를 한 번만 위임 등록한다. loadComments()가 목록을
// 통째로 innerHTML로 다시 그려도(각 댓글 버튼에 리스너를 다시 붙일 필요 없이) data-action
// 속성만 보고 reply/edit/delete/report를 분기 처리한다. dataset.actionsBound로 중복 등록 방지.
function setupCommentListActions() {
  const list = document.getElementById('comment-list');
  if (!list || list.dataset.actionsBound === 'true') return;

  list.dataset.actionsBound = 'true';
  list.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-action]');
    if (!btn || !list.contains(btn)) return;

    const { action, commentId } = btn.dataset;
    if (!commentId) return;

    if (action === 'reply') openReplyBox(commentId);
    if (action === 'edit') openEditBox(commentId);
    if (action === 'delete') deleteComment(commentId);
    if (action === 'report') reportComment(commentId);
  });
}

function getCommentElement(commentId) {
  return document.querySelector(`.post-comment-item[data-comment-id="${commentId}"]`);
}

// 답글을 작성할 때 "원댓글 작성자/내용"을 서버에 다시 물어보지 않고, 이미 화면에 렌더링된
// DOM에서 바로 읽어와 인용문(quotedUser/quotedMessage)으로 재사용한다
function getCommentDataFromElement(commentId) {
  const el = getCommentElement(commentId);
  if (!el) return null;

  const bodyEl = el.querySelector('.post-comment-body');
  return {
    author: el.querySelector('.post-comment-author')?.textContent?.trim() || '익명',
    content: bodyEl?.innerText?.trim() || '',
  };
}

// "답변" 버튼 클릭: 로그인 확인 후 해당 댓글 아래에 답글 입력 박스를 동적으로 삽입한다.
// 이미 열려있는 다른 답글/수정 박스는 먼저 닫고(closeAllCommentActionBoxes), 같은 댓글에
// 중복으로 박스가 열리지 않도록 존재 여부를 확인한다.
function openReplyBox(commentId) {
  if (!requireLoggedIn('답변을 작성하려면 로그인이 필요합니다.')) return;

  const commentEl = getCommentElement(commentId);
  if (!commentEl) return;

  closeAllCommentActionBoxes();
  if (commentEl.querySelector('.reply-box')) return;

  const box = document.createElement('div');
  box.className = 'post-comment-action-box reply-box';
  box.innerHTML = `
    <div id="reply-input-${escapeHtml(commentId)}" class="comment-input-box" contenteditable="true" data-placeholder="답변을 입력하세요"></div>
    <div class="post-comment-action-btns">
      <button type="button" class="cancel-btn" data-cancel-reply="${escapeHtml(commentId)}">취소</button>
      <button type="button" class="submit-btn" data-submit-reply="${escapeHtml(commentId)}">답변 올리기</button>
    </div>`;

  commentEl.appendChild(box);
  box.querySelector(`[data-cancel-reply="${commentId}"]`)?.addEventListener('click', () => box.remove());
  box.querySelector(`[data-submit-reply="${commentId}"]`)?.addEventListener('click', () => submitReply(commentId));
}

// "수정" 버튼 클릭: 본인 댓글의 기존 텍스트를 그대로 채운 편집 박스를 삽입한다.
// openReplyBox와 마찬가지로 다른 박스를 먼저 닫고 중복 삽입을 방지한다.
function openEditBox(commentId) {
  const user = requireLoggedIn('댓글을 수정하려면 로그인이 필요합니다.');
  if (!user) return;

  const commentEl = getCommentElement(commentId);
  if (!commentEl) return;

  closeAllCommentActionBoxes();
  if (commentEl.querySelector('.edit-box')) return;

  const currentText = commentEl.querySelector('.post-comment-body')?.innerText?.trim() || '';
  const box = document.createElement('div');
  box.className = 'post-comment-action-box edit-box';

  const editInput = document.createElement('div');
  editInput.id = `edit-input-${commentId}`;
  editInput.className = 'comment-input-box';
  editInput.contentEditable = 'true';
  editInput.textContent = currentText;

  const btnGroup = document.createElement('div');
  btnGroup.className = 'post-comment-action-btns';
  btnGroup.innerHTML = `
    <button type="button" class="cancel-btn" data-cancel-edit="${escapeHtml(commentId)}">취소</button>
    <button type="button" class="submit-btn" data-submit-edit="${escapeHtml(commentId)}">수정 완료</button>`;

  box.appendChild(editInput);
  box.appendChild(btnGroup);
  commentEl.appendChild(box);
  box.querySelector(`[data-cancel-edit="${commentId}"]`)?.addEventListener('click', () => box.remove());
  box.querySelector(`[data-submit-edit="${commentId}"]`)?.addEventListener('click', () => submitEdit(commentId));
}

// 답글 등록: 원댓글의 작성자/내용을 스니펫(최대 200자 + "...")으로 잘라 quotedMessage로 함께
// 전송한다. 서버는 parentCommentId로 이 댓글이 답글임을 알고, quotedUser/quotedMessage는
// 화면에 인용 블록을 보여주기 위한 스냅샷 데이터로 그대로 저장된다(원댓글이 나중에 수정/삭제돼도
// 답글의 인용문은 작성 당시 내용 그대로 남는다).
async function submitReply(parentCommentId) {
  const user = getLoggedInUser();
  const postId = getCurrentPostId();
  const input = document.getElementById(`reply-input-${parentCommentId}`);
  if (!user || !postId || !input) return;

  const text = input.innerText.trim();
  if (!text) {
    alert('답변 내용을 입력해주세요.');
    return;
  }

  const parentData = getCommentDataFromElement(parentCommentId);
  const quotedMessage = parentData?.content || '';
  const snippet = quotedMessage.length > 200 ? `${quotedMessage.slice(0, 200)}...` : quotedMessage;

  try {
    const response = await fetch(`${getTierApiBase()}/api/tierlists/${encodeURIComponent(postId)}/comments`, {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify({
        content: text,
        parentCommentId,
        quotedUser: parentData?.author || '',
        quotedMessage: snippet,
      }),
    });
    const data = await response.json();

    if (response.ok && data.success) {
      closeAllCommentActionBoxes();
      await loadComments();
      return;
    }

    if (data.blocked) {
      alert('관리자로 인해 차단당했습니다.');
      return;
    }

    alert(data.error || '답변 등록에 실패했습니다.');
  } catch (err) {
    console.error(err);
    alert('서버에 연결할 수 없습니다.');
  }
}

// 댓글 수정 완료: PATCH로 내용만 갱신하고, 성공하면 편집 박스를 닫은 뒤 목록을 통째로 새로 불러온다
async function submitEdit(commentId) {
  const user = getLoggedInUser();
  const postId = getCurrentPostId();
  const input = document.getElementById(`edit-input-${commentId}`);
  if (!user || !postId || !input) return;

  const text = input.innerText.trim();
  if (!text) {
    alert('댓글 내용을 입력해주세요.');
    return;
  }

  if (text.length > 1000) {
    alert('댓글은 1000자 이하로 작성해주세요.');
    return;
  }

  try {
    const response = await fetch(
      `${getTierApiBase()}/api/tierlists/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`,
      {
        method: 'PATCH',
        headers: apiHeaders(),
        body: JSON.stringify({ content: text }),
      },
    );
    const data = await response.json();

    if (response.ok && data.success) {
      closeAllCommentActionBoxes();
      await loadComments();
      return;
    }

    alert(data.error || '댓글 수정에 실패했습니다.');
  } catch (err) {
    console.error(err);
    alert('서버에 연결할 수 없습니다.');
  }
}

// 댓글 신고: 로그인 확인 후 사유 모달을 띄우고 결과를 서버로 전송, 성공 시 목록을 새로고침해서
// "신고됨" 상태(disabled 버튼)를 즉시 반영한다. 게시글 신고와 달리 본인 댓글 신고 차단이나
// 이미 신고했는지 사전 검사는 renderCommentActions()가 버튼 자체를 다르게 그려서 처리한다.
function reportComment(commentId) {
  const postId = getCurrentPostId();
  const user = requireLoggedIn('댓글을 신고하려면 로그인이 필요합니다.');
  if (!postId || !user) return;

  openReportModal({
    title: '댓글 신고 사유 선택',
    onSubmit: async (reason, detail) => {
      try {
        const response = await fetch(
          `${getTierApiBase()}/api/tierlists/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}/report`,
          {
            method: 'POST',
            headers: apiHeaders(),
            body: JSON.stringify({ reason, detail }),
          },
        );
        const data = await response.json();

        if (response.ok && data.success) {
          alert('신고가 접수되었습니다.');
          await loadComments();
          return;
        }

        alert(data.error || '신고에 실패했습니다.');
      } catch (err) {
        console.error(err);
        alert('서버에 연결할 수 없습니다.');
      }
    },
  });
}

// 댓글 목록을 서버에서 받아 통째로 다시 그린다. 로딩 중/빈 목록/에러 세 가지 상태를 각각
// 다른 안내 문구로 처리하고, 렌더링 후 액션 위임 리스너를 (재)바인딩한 뒤 알림 딥링크로
// 들어왔다면 해당 댓글로 자동 스크롤한다.
async function loadComments() {
  const list = document.getElementById('comment-list');
  const postId = getCurrentPostId();
  if (!list || !postId) return;

  list.innerHTML = '<p class="comment-loading">댓글을 불러오는 중...</p>';

  try {
    const comments = await fetchComments(postId);
    updateCommentCount(comments.length);

    if (!comments.length) {
      list.innerHTML = '<p class="comment-empty">아직 댓글이 없습니다. 첫 댓글을 남겨보세요!</p>';
      return;
    }

    list.innerHTML = comments.map(renderCommentItem).join('');
    setupCommentListActions();

    runNotificationCommentScroll();
  } catch (err) {
    console.error(err);
    updateCommentCount(0);
    list.innerHTML = '<p class="comment-error">댓글을 불러올 수 없습니다.</p>';
  }
}

// 새 댓글(최상위, 답글 아님) 등록. 1000자 제한을 프론트에서도 미리 검사해 불필요한 요청을
// 막고, 제출 중 버튼을 잠깐 비활성화해 중복 클릭으로 인한 중복 등록을 방지한다.
async function submitComment() {
  const inputBox = document.getElementById('comment-input');
  const postId = getCurrentPostId();
  if (!inputBox || !postId) return;

  const user = requireLoggedIn('댓글을 작성하려면 로그인이 필요합니다.');
  if (!user) return;

  const text = inputBox.innerText.trim();
  if (!text) {
    alert('댓글 내용을 입력해주세요.');
    return;
  }

  if (text.length > 1000) {
    alert('댓글은 1000자 이하로 작성해주세요.');
    return;
  }

  const submitBtn = document.getElementById('comment-submit-btn');
  if (submitBtn) submitBtn.disabled = true;

  try {
    const response = await fetch(`${getTierApiBase()}/api/tierlists/${encodeURIComponent(postId)}/comments`, {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify({ content: text }),
    });
    const data = await response.json();

    if (response.ok && data.success) {
      inputBox.innerHTML = '';
      await loadComments();
      return;
    }

    if (data.blocked) {
      alert('관리자로 인해 차단당했습니다.');
      return;
    }

    alert(data.error || '댓글 등록에 실패했습니다.');
  } catch (err) {
    console.error(err);
    alert('서버에 연결할 수 없습니다. backend에서 npm start를 실행해주세요.');
  } finally {
    if (submitBtn) submitBtn.disabled = !getLoggedInUser();
  }
}

// 댓글 삭제: 확인창 통과 후 DELETE 요청, 성공 시 목록을 다시 불러온다.
// (답글이 딸린 댓글을 지울 때의 처리는 서버 쪽 정책을 따른다)
async function deleteComment(commentId) {
  const postId = getCurrentPostId();
  const user = getLoggedInUser();
  if (!postId || !commentId || !user) return;

  if (!confirm('이 댓글을 삭제할까요?')) return;

  try {
    const response = await fetch(
      `${getTierApiBase()}/api/tierlists/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`,
      {
        method: 'DELETE',
        headers: apiHeaders(),
        body: JSON.stringify({}),
      },
    );
    const data = await response.json();

    if (response.ok && data.success) {
      await loadComments();
      return;
    }

    alert(data.error || '댓글 삭제에 실패했습니다.');
  } catch (err) {
    console.error(err);
    alert('서버에 연결할 수 없습니다.');
  }
}

// 댓글 입력 폼 초기화: 등록 버튼 클릭 및 Enter 키(Shift+Enter는 줄바꿈으로 남겨두고 일반
// Enter만 즉시 등록)로 submitComment()를 호출하도록 바인딩한다.
function setupCommentForm() {
  const submitBtn = document.getElementById('comment-submit-btn');
  const inputBox = document.getElementById('comment-input');

  setupCommentListActions();

  if (submitBtn) submitBtn.addEventListener('click', submitComment);

  if (inputBox) {
    inputBox.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        submitComment();
      }
    });
  }

  updateCommentFormState();
}

let postDetailInitialized = false;

// 페이지 부트스트랩. postDetailInitialized 플래그로 중복 호출을 막는다 —
// post_detail.html 하단 인라인 스크립트가 DOMContentLoaded에서 한 번 더 호출하기 때문에
// (스크립트 로드 순서 이슈에 대한 안전망) 이 가드가 없으면 리스너·요청이 두 번씩 실행된다.
function initPostDetailPage() {
  if (postDetailInitialized) return;
  postDetailInitialized = true;
  if (typeof loadCommon === 'function') loadCommon();
  loadPostDetail();
  setupActionButtons();
  setupCommentForm();
}

document.addEventListener('DOMContentLoaded', () => {
  initPostDetailPage();
});

// 알림 딥링크로 들어온 경우, 댓글 목록이 아직 로드되기 전 시점을 대비해 페이지 전체가 완전히
// 로드된(load 이벤트) 뒤에도 한 번 더 스크롤을 시도한다 (loadComments() 완료 후 실행되는
// runNotificationCommentScroll() 호출과는 별개의 보험성 재시도)
window.addEventListener('load', () => {
  if (resolveCommentScrollTarget()) {
    setTimeout(runNotificationCommentScroll, 400);
  }
});

window.initPostDetailPage = initPostDetailPage;
window.goToUserPosts = goToUserPosts;
window.scrollToComments = scrollToComments;
window.submitComment = submitComment;
window.deleteComment = deleteComment;
window.reportComment = reportComment;