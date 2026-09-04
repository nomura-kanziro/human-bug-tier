// custom-maker_post/custom-maker_post.js
// 커스텀 티어 게시판 "목록" 페이지 스크립트. 서버(/api/tierlists)에서 게시글 목록을 받아
// 카드 그리드로 그리고, 검색(제목/@작성자)·전체보기·글쓰기·신고 기능을 담당한다.
// 게시글 "상세" 페이지 로직은 post_detail.js에 별도로 있다.

let allPosts = [];
const POST_ID_STORAGE_KEY = 'selectedPostId';
const REPORT_REASONS = ['도배 및 테러행위', '비방 및 모욕행위', '광고형 댓글', '기타'];

// 게시글 API(/api/tierlists) 호출용 서버 주소 판별. common.js의 getApiBase()와 동일한 로직을
// 이 페이지에서도 독립적으로 갖고 있다(로드 순서 이슈 대비 fallback).
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

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatPostDate(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace(/\.$/, '');
}

// 게시글 객체에서 MongoDB ObjectId를 문자열로 뽑아낸다. 서버 응답 형태가
// 문자열(post._id), ObjectId 인스턴스, {$oid: '...'} (일부 직렬화 경로) 등으로 섞여 올 수 있어
// 어떤 형태든 최종적으로 문자열 id 하나로 정규화한다.
function getPostId(post) {
  if (!post) return '';
  const raw = post._id ?? post.id;
  if (!raw) return '';
  if (typeof raw === 'object') {
    if (raw.$oid) return String(raw.$oid);
    if (typeof raw.toString === 'function') return raw.toString();
  }
  return String(raw);
}

// MongoDB ObjectId 형식(16진수 24자)인지 검사. URL 조작이나 잘못된 값으로
// API를 호출하는 것을 프론트에서 미리 걸러낸다.
function isValidPostId(id) {
  return typeof id === 'string' && /^[a-fA-F0-9]{24}$/.test(id);
}

// 게시글 상세 페이지 URL을 만든다. file://로 로컬에서 직접 연 경우(정적 미리보기)엔 절대경로가
// 안 통하므로 상대경로를 쓰고, 그 외(로컬 서버·Render 배포)엔 항상 루트 기준 절대경로를 사용한다.
function getPostDetailUrl(id) {
  const safeId = encodeURIComponent(id);

  if (window.location.protocol === 'file:') {
    const path = window.location.pathname || '';
    if (path.includes('custom-maker_post') || path.includes('custom-maker\\custom-maker_post')) {
      return `post_detail.html?id=${safeId}`;
    }
    return `custom-maker/custom-maker_post/post_detail.html?id=${safeId}`;
  }

  return `/custom-maker/custom-maker_post/post_detail.html?id=${safeId}`;
}

// 방금 클릭한 게시글 id를 sessionStorage에 저장. post_detail.js가 URL에 id가 없는 예외
// 상황(예: 상대경로 이동 등)에서도 "방금 어떤 글을 클릭했는지"를 알 수 있게 하는 보조 경로다.
function rememberPostId(id) {
  if (!isValidPostId(id)) return;
  sessionStorage.setItem(POST_ID_STORAGE_KEY, id);
}

function goToPostDetail(id) {
  const postId = typeof id === 'object' ? getPostId(id) : String(id || '');
  if (!isValidPostId(postId)) return;
  rememberPostId(postId);
  window.location.href = getPostDetailUrl(postId);
}

// localStorage에 저장된 일반 회원 로그인 정보를 읽는다 (관리자 로그인은 여기서 다루지 않음 —
// 게시판 목록에서는 "내 글인지" 판단에 일반 회원 닉네임/이메일만 쓰면 충분)
function getLoggedInUser() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (user?.nickname) return user;
  } catch (err) {
    console.warn('로그인 정보 파싱 실패:', err);
  }
  return null;
}

// 마이페이지 등에서 "?mine=1"로 들어왔는지 여부 (내 게시글만 보기 모드)
function isMineMode() {
  return new URLSearchParams(window.location.search).get('mine') === '1';
}

// 지금 목록에 적용해야 할 작성자 필터를 하나로 결정한다.
// 우선순위: ?mine=1(로그인한 내 닉네임) > ?author=닉네임 > 검색창에 입력된 "@닉네임"
function getActiveAuthorFilter() {
  if (isMineMode()) {
    return getLoggedInUser()?.nickname || '';
  }
  const params = new URLSearchParams(window.location.search);
  let author = params.get('author') || '';
  if (!author) {
    const searchParam = params.get('search') || '';
    const parsed = parseSearchForAuthor(searchParam);
    author = parsed.author || '';
  }
  return author;
}

// Parse @username from search input. Returns { searchKeyword, author }
function parseSearchForAuthor(input) {
  const trimmed = (input || '').trim();
  if (!trimmed) return { searchKeyword: '', author: '' };

  // Match @username (until whitespace, supports Korean etc.)
  const atMatch = trimmed.match(/@(\S+)/);
  if (atMatch) {
    const extractedAuthor = atMatch[1];
    // Remove the @username part from keyword
    let remaining = trimmed.replace(atMatch[0], '').trim();
    remaining = remaining.replace(/\s*@\s*/, ' ').trim();
    return {
      searchKeyword: remaining,
      author: extractedAuthor
    };
  }

  return { searchKeyword: trimmed, author: '' };
}

// 현재 모드(전체/내 글/작성자 필터)에 맞춰 게시판 헤더의 부제목, "전체 게시판" 버튼,
// 검색창 placeholder·초기값을 갱신한다. initBoard()가 목록을 불러오기 전에 먼저 호출한다.
function updateBoardHeader() {
  const subtitle = document.getElementById('board-subtitle');
  const viewAllBtn = document.getElementById('view-all-board-btn');
  const searchInput = document.getElementById('search-input');
  const user = getLoggedInUser();

  if (isMineMode()) {
    if (subtitle) {
      subtitle.hidden = false;
      subtitle.textContent = user?.nickname
        ? `${user.nickname}님이 작성한 게시글`
        : '내 게시글';
    }
    if (viewAllBtn) viewAllBtn.hidden = false;
    if (searchInput) {
      searchInput.placeholder = '제목 검색 (또는 @작성자)';
    }
    return;
  }

  const urlAuthor = getActiveAuthorFilter();
  console.log('[custom board] updateBoardHeader urlAuthor:', urlAuthor);
  if (subtitle) {
    if (urlAuthor) {
      subtitle.hidden = false;
      subtitle.textContent = `${urlAuthor}님의 게시글`;
    } else {
      subtitle.hidden = true;
      subtitle.textContent = '';
    }
  }
  if (viewAllBtn) viewAllBtn.hidden = !urlAuthor;
  if (searchInput) {
    searchInput.placeholder = '제목 또는 @작성자 검색';
    const urlSearch = new URLSearchParams(window.location.search).get('search') || '';
    if (urlSearch) {
      searchInput.value = urlSearch;
    } else if (urlAuthor && !searchInput.value) {
      searchInput.value = `@${urlAuthor} `;
    }
  }
}

// "전체 게시판" 버튼: author/mine 필터를 다 떼고 순수 목록 페이지로 이동
function goAllPosts() {
  window.location.href = getBasePath() + 'custom-maker/custom-maker_post/custom-maker_post.html';
}

// 카드에 "수정" 버튼을 보여줄지 "신고" 버튼을 보여줄지 결정하는 소유권 판정.
// post_detail.js/custom-maker.js와 동일한 규칙(이메일 우선, 없으면 닉네임 비교)을 쓴다 —
// 실제 수정/삭제 권한은 서버가 다시 검증하므로 이건 어디까지나 버튼 노출용 UX 판단이다.
function isPostOwner(post, user) {
  if (!post || !user) return false;

  const postEmail = (post.authorEmail || '').trim().toLowerCase();
  const userEmail = (user.email || '').trim().toLowerCase();
  if (postEmail && userEmail) return postEmail === userEmail;

  const postAuthor = (post.author || '').trim();
  const userName = (user.nickname || '').trim();
  return Boolean(postAuthor && userName && postAuthor === userName);
}

// 카드의 "수정" 버튼 클릭 시: 게시글 전체 데이터를 sessionStorage에 스냅샷으로 저장해두고
// 전용 수정 페이지(post_edit.html)로 이동한다. custom-maker.js의 enterEditMode()가 이 스냅샷을
// 즉시 읽어 화면을 채운 뒤, 서버에서 최신본을 다시 받아 덮어쓴다.
function goToEditPost(post) {
  const id = getPostId(post);
  if (!isValidPostId(id)) return;

  try {
    sessionStorage.setItem(
      'customMakerEditPost',
      JSON.stringify({
        _id: id,
        id,
        title: post.title || '',
        description: post.description || '',
        author: post.author || '',
        authorEmail: post.authorEmail || '',
        thumbnail: post.thumbnail || '',
        tierData: post.tierData || null,
      })
    );
  } catch (err) {
    console.warn('수정용 게시글 스냅샷 저장 실패:', err);
  }

  const base = typeof getBasePath === 'function' ? getBasePath() : '/';
  window.location.href = `${base}custom-maker/post_edit.html?id=${encodeURIComponent(id)}`;
}

function closeReportModal() {
  document.getElementById('report-modal')?.remove();
}

// 신고 사유 선택 모달을 동적으로 만들어 body에 붙인다. 사유 버튼을 누르면 즉시 콜백(onSubmit)을
// 실행하는 방식이라 "확인" 버튼이 따로 없다. "기타"를 고르면 prompt()로 상세 사유를 추가로 받는다.
function openReportModal(title, onSubmit) {
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

// 게시글 신고 처리: 로그인 필요 → 본인 글이면 차단 → 이미 신고했으면 차단 → 사유 모달을 띄우고
// 선택 결과를 /api/tierlists/:id/report로 전송한다. 신고 자체는 정지가 아니라 접수일 뿐이며,
// 실제 처리는 관리자 페이지(admin tier-reports)에서 이루어진다.
async function reportPost(postId) {
  const user = getLoggedInUser();
  if (!user) {
    if (confirm('게시글을 신고하려면 로그인이 필요합니다.\n로그인 페이지로 이동할까요?')) {
      window.location.href = getBasePath() + 'user_login/login.html';
    }
    return;
  }

  const post = allPosts.find(item => getPostId(item) === postId);
  if (post && isPostOwner(post, user)) {
    alert('본인 게시글은 신고할 수 없습니다.');
    return;
  }

  if (post?.reported) {
    alert('이미 신고된 게시글입니다.');
    return;
  }

  openReportModal('게시글 신고 사유 선택', async (reason, detail) => {
    try {
      const headers = typeof getAuthHeaders === 'function'
        ? getAuthHeaders()
        : { 'Content-Type': 'application/json' };

      const response = await fetch(`${getTierApiBase()}/api/tierlists/${encodeURIComponent(postId)}/report`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ reason, detail }),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        if (post) post.reported = true;
        loadPosts();
        alert('신고가 접수되었습니다.');
        return;
      }

      alert(data.error || '신고에 실패했습니다.');
    } catch (err) {
      console.error(err);
      alert('서버에 연결할 수 없습니다.');
    }
  });
}

// 카드에 보여줄 썸네일을 결정한다: 게시글에 저장된 thumbnail이 있으면 그걸 쓰고,
// 없으면(과거 데이터 등) tierState 전체를 뒤져 이미지가 있는 첫 캐릭터로 대체한다.
function getThumbnail(post) {
  if (post.thumbnail) return resolveAssetPath(post.thumbnail);
  const firstChar = post.tierData?.tierState
    ? Object.values(post.tierData.tierState).flat().find(c => c?.img)
    : null;
  return resolveAssetPath(firstChar?.img);
}

// DB에 저장된 이미지 경로(루트 절대경로 '/...', data:/blob:, 절대 URL 등)를 이 페이지의
// 배포 깊이에 맞는 실제 표시 경로로 변환한다. custom-maker.js의 resolveMakerPreviewPath와
// 같은 역할을 게시판 목록 페이지에서 담당하는 버전.
function resolveAssetPath(path) {
  if (!path) return getBasePath() + 'tier-media/tier-image/logo.webp';
  // 폴더 구조가 두 번 바뀌었으므로(① tier-image → ② tier-media → ③ tier-media/tier-image, 2026-09)
  // DB에 남아있는 옛 접두사(둘 중 하나)를 최신 접두사로 보정한다.
  path = path.replace(/^(\.{2}\/|\/)?(?:tier-media\/tier-image\/|tier-image\/|tier-media\/)/, '$1tier-media/tier-image/');
  if (path.startsWith('data:') || path.startsWith('blob:')) return path;
  if (path.startsWith('http')) return path;
  if (path.startsWith('/')) {
    return getBasePath() + path.slice(1);
  }
  if (path.startsWith('../')) {
    return getBasePath() + path.replace(/^\.\.\//, '');
  }
  return getBasePath() + path;
}

// 검색어/작성자 필터를 쿼리스트링으로 붙여 게시글 목록을 조회한다. 필터링은 서버(DB 쿼리)가
// 수행하고, 프론트는 결과를 그대로 렌더링만 한다.
async function fetchPosts(search, author) {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (author) params.set('author', author);

  const query = params.toString();
  const response = await fetch(`${getTierApiBase()}/api/tierlists${query ? `?${query}` : ''}`);
  if (!response.ok) throw new Error('게시글 목록 조회 실패');
  return response.json();
}

// 게시글 카드 하나(썸네일+제목+작성자+통계) + 그 위에 겹쳐지는 수정/신고 버튼을 만든다.
// 카드 자체는 <a>라서 클릭하면 상세로 이동하고, 겹쳐진 버튼은 stopPropagation으로 그 이동을 막고
// 자기 동작(수정 이동 / 신고 모달)만 실행한다.
function createPostCard(post) {
  const id = getPostId(post);
  if (!isValidPostId(id)) return null;

  const wrapper = document.createElement('div');
  wrapper.className = 'post-card-wrapper';

  const card = document.createElement('a');
  card.className = 'post-card';
  card.href = getPostDetailUrl(id);
  card.dataset.postId = id;
  card.innerHTML = `
    <div class="post-thumbnail">
      <img src="${escapeHtml(getThumbnail(post))}" alt="${escapeHtml(post.title)}" onerror="this.src='../../tier-media/tier-image/logo.webp'">
    </div>
    <div class="post-info">
      <h3 class="post-title">${escapeHtml(post.title)}</h3>
      <div class="post-meta">
        <span class="post-author">${escapeHtml(post.author || '익명')}</span>
        <span class="post-date">${formatPostDate(post.createdAt)}</span>
      </div>
      <div class="post-stats">
        <span>조회 ${post.viewCount || 0}</span>
        <span>추천 ${post.likeCount || 0}</span>
      </div>
    </div>
  `;

  wrapper.appendChild(card);

  const user = getLoggedInUser();
  if (user && isPostOwner(post, user)) {
    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'post-card-edit-btn';
    editBtn.textContent = '수정';
    editBtn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      goToEditPost(post);
    });
    wrapper.appendChild(editBtn);
  } else if (user && !isPostOwner(post, user)) {
    const reportBtn = document.createElement('button');
    reportBtn.type = 'button';
    reportBtn.className = 'post-card-report-btn';
    reportBtn.textContent = post.reported ? '신고됨' : '신고';
    reportBtn.disabled = Boolean(post.reported);
    reportBtn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      reportPost(id);
    });
    wrapper.appendChild(reportBtn);
  }

  return wrapper;
}

// data-post-id 속성이 붙은 아무 요소나 클릭하면 해당 id를 sessionStorage에 기억해두는
// 전역 위임 리스너. (개별 카드마다 클릭 리스너를 새로 붙이지 않고 한 번만 등록)
function setupPostLinkDelegation() {
  document.addEventListener('click', (event) => {
    const link = event.target.closest('[data-post-id]');
    if (!link?.dataset.postId) return;
    if (!isValidPostId(link.dataset.postId)) return;
    rememberPostId(link.dataset.postId);
  });
}

// 게시글 목록(allPosts 또는 검색으로 필터링된 목록)을 카드 그리드에 그린다.
// 결과가 없으면 모드에 맞는 안내 문구(내 글 없음 / 등록된 글 없음)를 보여준다.
function loadPosts(filteredPosts = null) {
  const grid = document.getElementById('post-grid');
  if (!grid) return;

  grid.innerHTML = '';

  const postsToShow = filteredPosts || allPosts;

  if (!postsToShow.length) {
    const emptyMessage = isMineMode()
      ? '아직 작성한 게시글이 없습니다.<br>커스텀 메이커에서 티어표를 만들어 업로드해보세요!'
      : '등록된 게시글이 없습니다.<br>커스텀 메이커에서 티어표를 만들어 업로드해보세요!';
    grid.innerHTML = `<div class="empty-message">${emptyMessage}</div>`;
    return;
  }

  postsToShow.forEach(post => {
    const card = createPostCard(post);
    if (card) grid.appendChild(card);
  });
}

// 검색 버튼/엔터 클릭 시: 입력값에서 "@작성자"를 분리해내고, URL이 이미 작성자 필터를
// 강제하고 있으면(?mine=1, ?author=) 그 필터를 우선시한 채 키워드만 새로 적용한다.
async function searchPosts() {
  const rawInput = document.getElementById('search-input')?.value || '';
  const parsed = parseSearchForAuthor(rawInput);

  // Priority: URL author (from ?author or ?mine) > parsed from @ in search
  let author = getActiveAuthorFilter();
  let keyword = parsed.searchKeyword;

  if (!author && parsed.author) {
    author = parsed.author;
  }

  try {
    allPosts = await fetchPosts(keyword, author);
    loadPosts();
  } catch (err) {
    console.error(err);
    alert('게시글을 불러올 수 없습니다. 백엔드 서버를 확인해주세요.');
  }
}

// "직접 만들기" 버튼: 신규 제작 페이지(custom-maker.html)로 이동
function goWritePage() {
  window.location.href = '../custom-maker.html';
}

// 페이지 최초 진입 시 목록을 채우는 메인 초기화 함수.
// URL의 ?search=@닉네임 형태(마이페이지 프로필에서 넘어오는 링크)까지 고려해서 검색창을
// 미리 채우고, ?mine=1이면 비로그인 시 로그인 페이지로 유도한 뒤 내 닉네임으로 강제 필터링한다.
async function initBoard() {
  const urlParams = new URLSearchParams(window.location.search);
  const urlSearch = urlParams.get('search') || '';
  const parsed = parseSearchForAuthor(urlSearch);

  // Force set the search input value immediately for ?search=@name links (from profile)
  const earlyInput = document.getElementById('search-input');
  if (earlyInput && urlSearch) {
    earlyInput.value = urlSearch;
  }

  console.log('[custom board] initBoard urlSearch:', urlSearch, 'parsed:', parsed);

  // Support legacy ?mine=1 or ?author=
  const authorFromUrl = getActiveAuthorFilter();
  let initialAuthor = parsed.author || authorFromUrl;
  let initialKeyword = parsed.searchKeyword || '';

  if (isMineMode()) {
    const user = getLoggedInUser();
    if (!user?.nickname) {
      if (confirm('내 게시글을 보려면 로그인이 필요합니다.\n로그인 페이지로 이동할까요?')) {
        window.location.href = getBasePath() + 'user_login/login.html';
      } else {
        window.location.href = getBasePath() + 'custom-maker/custom-maker_post/custom-maker_post.html';
      }
      return;
    }
    // For mine, force author to current user
    initialAuthor = user.nickname;
    // If no specific search, prefill with @name
    if (!initialKeyword) {
      initialKeyword = `@${user.nickname}`;
    }
  }

  console.log('[custom board] initialAuthor:', initialAuthor, 'initialKeyword:', initialKeyword);

  updateBoardHeader();

  try {
    allPosts = await fetchPosts(initialKeyword, initialAuthor);
    loadPosts();
  } catch (err) {
    console.error(err);
    const grid = document.getElementById('post-grid');
    if (grid) {
      grid.innerHTML = '<div class="empty-message">게시글을 불러올 수 없습니다.<br>backend에서 npm start를 실행해주세요.</div>';
    }
  }
}

// 페이지 부트스트랩: 헤더/푸터 로드(loadCommon) + 링크 위임 등록 + 목록 초기화 + 검색창
// 엔터 키 처리. 아래 여러 즉시실행함수들은 모두 "?search=@닉네임" 링크로 들어왔을 때 검색창에
// 값이 확실히 채워지도록 여러 타이밍(스크립트 실행 시점/DOM 준비 시점)에서 중복으로 시도하는
// 방어적 코드다 — 프로필 페이지 등 외부에서 넘어오는 딥링크가 안정적으로 동작하게 하기 위함.
function initCustomBoard() {
  if (typeof loadCommon === 'function') loadCommon();
  setupPostLinkDelegation();
  initBoard();

  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') searchPosts();
    });
  }

  // Extra safeguard: if ?search param exists (e.g. from profile ?search=@name), ensure input has the value
  const urlSearchForInput = new URLSearchParams(window.location.search).get('search');
  if (searchInput && urlSearchForInput) {
    searchInput.value = urlSearchForInput;
  }

  // One more direct set right after DOM ready logic
  const directSearch = new URLSearchParams(window.location.search).get('search');
  if (directSearch) {
    const inp = document.getElementById('search-input');
    if (inp) inp.value = directSearch;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCustomBoard);
} else {
  initCustomBoard();
}

window.loadPosts = loadPosts;
window.searchPosts = searchPosts;
window.goWritePage = goWritePage;
window.goAllPosts = goAllPosts;
window.goToPostDetail = goToPostDetail;

// 강제 프리필: 프로필에서 ?search=@닉네임 으로 왔을 때 검색창에 @ASD 가 입력되도록
// 스크립트가 HTML 끝에서 로드되므로 DOM이 준비된 상태
(function forcePrefillSearchFromProfile() {
  const params = new URLSearchParams(window.location.search);
  const searchVal = params.get('search');
  if (searchVal && searchVal.startsWith('@')) {
    const input = document.getElementById('search-input');
    if (input) {
      input.value = searchVal;
      // 필터링이 이미 init에서 되었지만, 확실히 하기 위해 한 번 더
      // (필요 시 searchPosts() 호출 가능하지만 초기 로드는 이미 author 필터 적용됨)
    } else {
      // 극단적 타이밍 대비
      setTimeout(() => {
        const i = document.getElementById('search-input');
        if (i) i.value = searchVal;
      }, 50);
    }
  }
})();

// Robust immediate prefill from ?search param (script is at end of HTML so DOM is ready)
(function () {
  try {
    const params = new URLSearchParams(window.location.search);
    const searchVal = params.get('search');
    if (searchVal) {
      const input = document.getElementById('search-input');
      if (input) {
        input.value = searchVal;
      }
    }
  } catch (e) {}
})();

// Immediate prefill for search input if ?search param is present (runs as soon as script executes at bottom of HTML)
(function prefillSearchFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const s = params.get('search');
  if (s) {
    const setValue = () => {
      const input = document.getElementById('search-input');
      if (input) {
        input.value = s;
      } else {
        setTimeout(setValue, 30);
      }
    };
    setValue();
  }
})();