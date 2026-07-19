// post_detail.js

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

function apiHeaders(extra = {}) {
  if (typeof getAuthHeaders === 'function') return getAuthHeaders(extra);
  return { 'Content-Type': 'application/json', ...extra };
}

function isAdminLoggedIn() {
  return localStorage.getItem('isAdmin') === 'true';
}

function getLoggedInUser() {
  try {
    if (isAdminLoggedIn()) {
      return {
        nickname: localStorage.getItem('adminName') || '관리자',
        email: '',
        isAdmin: true,
      };
    }

    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (user?.nickname) {
      return { ...user, isAdmin: false };
    }
  } catch (err) {
    console.warn('로그인 정보 파싱 실패:', err);
  }
  return null;
}

function isPostOwner(post, user) {
  return isSameAuthor(post, user);
}

function isSameAuthor(record, user) {
  if (!record || !user) return false;

  const recordEmail = (record.authorEmail || '').trim().toLowerCase();
  const userEmail = (user.email || '').trim().toLowerCase();
  if (recordEmail && userEmail) {
    return recordEmail === userEmail;
  }

  const recordAuthor = (record.author || record.userId || '').trim();
  const userName = (user.nickname || '').trim();

  return recordAuthor === userName;
}

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

function getCurrentPostId() {
  if (!currentPost) return '';
  const raw = currentPost._id ?? currentPost.id;
  if (!raw) return '';
  return typeof raw === 'object' && typeof raw.toString === 'function' ? raw.toString() : String(raw);
}

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

function consumeStoredPostId() {
  const stored = sessionStorage.getItem(POST_ID_STORAGE_KEY);
  if (!stored || !isValidPostId(stored)) return null;
  sessionStorage.removeItem(POST_ID_STORAGE_KEY);
  return stored;
}

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

function renderPostMeta(post) {
  const titleEl = document.querySelector('.post-title');
  const authorEl = document.getElementById('author-name');
  const dateEl = document.getElementById('post-date');
  const viewsEl = document.getElementById('post-views');
  const likesEl = document.getElementById('post-likes');
  const likeCountEl = document.getElementById('like-count');

  if (titleEl) titleEl.textContent = post.title;
  if (authorEl) authorEl.textContent = post.author || '익명';
  if (dateEl) dateEl.textContent = formatFullDate(post.createdAt);
  if (viewsEl) viewsEl.textContent = post.viewCount || 0;
  if (likesEl) likesEl.textContent = post.likeCount || 0;
  if (likeCountEl) likeCountEl.textContent = post.likeCount || 0;

  document.title = `${post.title} - 커스텀 티어 상세`;
}

function showPostError(message) {
  const container = document.querySelector('.post-detail-container');
  if (!container) return;
  container.innerHTML = `
    <div class="empty-message" style="padding:120px 20px;text-align:center;">
      <h2>${escapeHtml(message)}</h2>
      <p style="margin-top:12px;"><a href="${getBasePath()}custom-maker/custom-maker_post/custom-maker_post.html">← 게시판으로 돌아가기</a></p>
    </div>`;
}

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

function goToUserPosts() {
  if (!currentPost?.author) return;
  // Use getBasePath() to support GitHub Pages subpath deploys (/repo-name/...)
  window.location.href = `${getBasePath()}custom-maker/custom-maker_post/custom-maker_post.html?author=${encodeURIComponent(currentPost.author)}`;
}

function scrollToComments() {
  const commentSection = document.querySelector('.comment-section');
  if (commentSection) {
    commentSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

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

function highlightScrollTarget(element) {
  if (!element) return;
  element.classList.add('notification-scroll-highlight');
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  setTimeout(() => element.classList.remove('notification-scroll-highlight'), 2800);
}

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

function runNotificationCommentScroll() {
  const commentTarget = resolveCommentScrollTarget();
  if (commentTarget) {
    scrollToCommentTarget(commentTarget);
  }
}

function requireLoggedIn(message) {
  const user = getLoggedInUser();
  if (user) return user;

  if (confirm(`${message}\n로그인 페이지로 이동할까요?`)) {
    window.location.href = getBasePath() + 'user_login/login.html';
  }
  return null;
}

function closeAllCommentActionBoxes() {
  document.querySelectorAll('.post-comment-action-box').forEach(box => box.remove());
}

function getCommentId(comment) {
  const raw = comment?._id ?? comment?.id;
  if (!raw) return '';
  return typeof raw === 'object' && typeof raw.toString === 'function' ? raw.toString() : String(raw);
}

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
    const canReport = Boolean(user && !isOwner && !currentPost?.reported);
    reportBtn.hidden = !canReport;
    reportBtn.disabled = Boolean(currentPost?.reported);
    reportBtn.textContent = currentPost?.reported ? '신고됨' : '🚨 신고하기';
  }

  updateEventButtonVisibility();
  updateLikeButtonState();
}

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

  // 메이커에서 배치·제목 수정 후 PUT 저장
  const base = typeof getBasePath === 'function' ? getBasePath() : '/';
  window.location.href = `${base}custom-maker/custom-maker.html?edit=${encodeURIComponent(id)}`;
}

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

function handleEventParticipation() {
  alert('이벤트 기능은 준비 중입니다.');
}

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

function getCommentDataFromElement(commentId) {
  const el = getCommentElement(commentId);
  if (!el) return null;

  const bodyEl = el.querySelector('.post-comment-body');
  return {
    author: el.querySelector('.post-comment-author')?.textContent?.trim() || '익명',
    content: bodyEl?.innerText?.trim() || '',
  };
}

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