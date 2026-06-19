// custom-maker_post/custom-maker_post.js

let allPosts = [];
const POST_ID_STORAGE_KEY = 'selectedPostId';
const REPORT_REASONS = ['도배 및 테러행위', '비방 및 모욕행위', '광고형 댓글', '기타'];

function getTierApiBase() {
  const { protocol, hostname, port } = window.location;
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

function isValidPostId(id) {
  return typeof id === 'string' && /^[a-fA-F0-9]{24}$/.test(id);
}

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

function getLoggedInUser() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (user?.nickname) return user;
  } catch (err) {
    console.warn('로그인 정보 파싱 실패:', err);
  }
  return null;
}

function isMineMode() {
  return new URLSearchParams(window.location.search).get('mine') === '1';
}

function getActiveAuthorFilter() {
  if (isMineMode()) {
    return getLoggedInUser()?.nickname || '';
  }
  return new URLSearchParams(window.location.search).get('author') || '';
}

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
    if (searchInput) searchInput.placeholder = '내 게시글 제목 검색';
    return;
  }

  const urlAuthor = new URLSearchParams(window.location.search).get('author');
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
  if (searchInput) searchInput.placeholder = '제목 또는 작성자 검색';
}

function goAllPosts() {
  window.location.href = '/custom-maker/custom-maker_post/custom-maker_post.html';
}

function isPostOwner(post, user) {
  if (!post || !user) return false;

  const postEmail = (post.authorEmail || '').trim().toLowerCase();
  const userEmail = (user.email || '').trim().toLowerCase();
  if (postEmail && userEmail) return postEmail === userEmail;

  return (post.author || '').trim() === (user.nickname || '').trim();
}

function closeReportModal() {
  document.getElementById('report-modal')?.remove();
}

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

async function reportPost(postId) {
  const user = getLoggedInUser();
  if (!user) {
    if (confirm('게시글을 신고하려면 로그인이 필요합니다.\n로그인 페이지로 이동할까요?')) {
      window.location.href = '/user_login/login.html';
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

function getThumbnail(post) {
  if (post.thumbnail) return resolveAssetPath(post.thumbnail);
  const firstChar = post.tierData?.tierState
    ? Object.values(post.tierData.tierState).flat().find(c => c?.img)
    : null;
  return resolveAssetPath(firstChar?.img);
}

function resolveAssetPath(path) {
  if (!path) return '../../tier-image/logo.webp';
  if (path.startsWith('http') || path.startsWith('/')) return path;
  if (path.startsWith('../')) return '..' + path;
  return '../../' + path;
}

async function fetchPosts(search, author) {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (author) params.set('author', author);

  const query = params.toString();
  const response = await fetch(`${getTierApiBase()}/api/tierlists${query ? `?${query}` : ''}`);
  if (!response.ok) throw new Error('게시글 목록 조회 실패');
  return response.json();
}

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
      <img src="${escapeHtml(getThumbnail(post))}" alt="${escapeHtml(post.title)}" onerror="this.src='../../tier-image/logo.webp'">
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
  if (user && !isPostOwner(post, user)) {
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

function setupPostLinkDelegation() {
  document.addEventListener('click', (event) => {
    const link = event.target.closest('[data-post-id]');
    if (!link?.dataset.postId) return;
    if (!isValidPostId(link.dataset.postId)) return;
    rememberPostId(link.dataset.postId);
  });
}

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

async function searchPosts() {
  const keyword = document.getElementById('search-input')?.value.trim() || '';
  const author = getActiveAuthorFilter();

  try {
    allPosts = await fetchPosts(keyword, author);
    loadPosts();
  } catch (err) {
    console.error(err);
    alert('게시글을 불러올 수 없습니다. 백엔드 서버를 확인해주세요.');
  }
}

function goWritePage() {
  window.location.href = '../custom-maker.html';
}

async function initBoard() {
  if (isMineMode()) {
    const user = getLoggedInUser();
    if (!user?.nickname) {
      if (confirm('내 게시글을 보려면 로그인이 필요합니다.\n로그인 페이지로 이동할까요?')) {
        window.location.href = '/user_login/login.html';
      } else {
        window.location.href = '/custom-maker/custom-maker_post/custom-maker_post.html';
      }
      return;
    }
  }

  const authorFilter = getActiveAuthorFilter();

  updateBoardHeader();

  try {
    allPosts = await fetchPosts('', authorFilter);
    loadPosts();
  } catch (err) {
    console.error(err);
    const grid = document.getElementById('post-grid');
    if (grid) {
      grid.innerHTML = '<div class="empty-message">게시글을 불러올 수 없습니다.<br>backend에서 npm start를 실행해주세요.</div>';
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (typeof loadCommon === 'function') loadCommon();
  setupPostLinkDelegation();
  initBoard();

  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') searchPosts();
    });
  }
});

window.loadPosts = loadPosts;
window.searchPosts = searchPosts;
window.goWritePage = goWritePage;
window.goAllPosts = goAllPosts;
window.goToPostDetail = goToPostDetail;