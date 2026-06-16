const API_BASE = 'http://localhost:5000';

let comments = [];
let blockedList = [];
let registeredUsers = [];
let adminNotices = [];

const NOTICE_CATEGORY_LABELS = {
  notice: '전체 공지',
  news: '새 소식',
};

const MAX_PINNED_NOTICES = 5;

function sortAdminNotices(notices) {
  return [...notices].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return b.isPinned - a.isPinned;
    const aPin = new Date(a.pinnedAt || 0);
    const bPin = new Date(b.pinnedAt || 0);
    if (aPin !== bPin) return bPin - aPin;
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });
}

function getPinnedCount() {
  return adminNotices.filter(n => n.isPinned).length;
}

let currentTypeFilter = 'all';
let currentReportFilter = '';
let currentSort = 'newest';

const ITEMS_PER_PAGE = 25;
let currentPage = 1;

const NOTICE_ITEMS_PER_PAGE = 10;
let currentNoticePage = 1;
let currentNoticeFilter = 'all';

function getFilteredAdminNotices() {
  if (currentNoticeFilter === 'all') return adminNotices;
  return adminNotices.filter(n => n.category === currentNoticeFilter);
}

function getNoticeEmptyMessage() {
  if (currentNoticeFilter === 'notice') return '전체 공지 항목이 없습니다.';
  if (currentNoticeFilter === 'news') return '새 소식 항목이 없습니다.';
  return '등록된 공지가 없습니다.';
}

function getCommentId(comment) {
  return comment._id || comment.id;
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

function isBlockActive(block) {
  if (!block?.expiresAt) return true;
  return new Date(block.expiresAt) > new Date();
}

function getActiveBlocks() {
  return blockedList.filter(isBlockActive);
}

function findBlockByValue(value) {
  return getActiveBlocks().find(b => b.value === value);
}

function isBlockedUser(userId, ip) {
  const active = getActiveBlocks();
  return active.some(b => b.value === (userId || '') || b.value === (ip || ''));
}

function getUserEmail(userId) {
  if (!userId) return '-';
  const user = registeredUsers.find(u => u.nickname === userId);
  return user?.email || '-';
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return 'N/A';
  return d.toLocaleString('ko-KR');
}

function getRemainingLabel(expiresAt) {
  const diff = new Date(expiresAt) - new Date();
  if (diff <= 0) return '만료됨';

  const days = Math.ceil(diff / (24 * 60 * 60 * 1000));
  if (days >= 1) return `${days}일 남음`;

  const hours = Math.ceil(diff / (60 * 60 * 1000));
  return `${hours}시간 남음`;
}

function getSelectedDurationDays() {
  const select = document.getElementById('block-duration-select');
  const customInput = document.getElementById('block-custom-days');

  if (!select) return 1;

  if (select.value === 'custom') {
    const customDays = parseInt(customInput?.value, 10);
    if (!Number.isFinite(customDays) || customDays < 1 || customDays > 9999) {
      alert('관리자 지정 기간은 1일 이상 9999일 이하로 입력해주세요.');
      return null;
    }
    return customDays;
  }

  return parseInt(select.value, 10);
}

function setupDurationSelect() {
  const select = document.getElementById('block-duration-select');
  const customInput = document.getElementById('block-custom-days');
  if (!select || !customInput) return;

  const toggleCustom = () => {
    const isCustom = select.value === 'custom';
    customInput.classList.toggle('visible', isCustom);
    if (!isCustom) customInput.value = '';
  };

  select.addEventListener('change', toggleCustom);
  toggleCustom();
}

async function loadComments() {
  try {
    const response = await fetch(`${API_BASE}/api/inquiries`);
    if (!response.ok) throw new Error('댓글 목록 조회 실패');
    comments = await response.json();
    renderComments();
  } catch (err) {
    console.error(err);
    alert('❌ 댓글 목록을 불러올 수 없습니다. 백엔드 서버를 확인해주세요.');
  }
}

async function loadBlocks() {
  try {
    const response = await fetch(`${API_BASE}/api/admin/blocks`);
    if (!response.ok) throw new Error('차단 목록 조회 실패');
    blockedList = await response.json();
    renderBlockList();
    renderUserList();
    renderComments();
  } catch (err) {
    console.error(err);
  }
}

async function loadUsers() {
  try {
    const response = await fetch(`${API_BASE}/api/admin/users`);
    if (!response.ok) throw new Error('사용자 목록 조회 실패');
    registeredUsers = await response.json();
    renderUserList();
    renderComments();
  } catch (err) {
    console.error(err);
  }
}

async function loadNotices() {
  try {
    const response = await fetch(`${API_BASE}/api/notices`);
    if (!response.ok) throw new Error('공지 목록 조회 실패');
    adminNotices = await response.json();
    renderAdminNoticeList();
  } catch (err) {
    console.error(err);
  }
}

function renderAdminNoticeList() {
  const tbody = document.getElementById('admin-notice-list');
  const pinCountEl = document.getElementById('notice-pin-count');
  if (!tbody) return;

  const pinnedCount = getPinnedCount();
  if (pinCountEl) {
    pinCountEl.textContent = `(고정 ${pinnedCount}/${MAX_PINNED_NOTICES})`;
  }

  const sorted = sortAdminNotices(getFilteredAdminNotices());
  const totalPages = Math.ceil(sorted.length / NOTICE_ITEMS_PER_PAGE) || 1;
  currentNoticePage = Math.max(1, Math.min(currentNoticePage, totalPages));

  const start = (currentNoticePage - 1) * NOTICE_ITEMS_PER_PAGE;
  const paginated = sorted.slice(start, start + NOTICE_ITEMS_PER_PAGE);

  if (!paginated.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="7">${getNoticeEmptyMessage()}</td></tr>`;
    renderNoticePagination(totalPages);
    return;
  }

  tbody.innerHTML = paginated.map((notice, idx) => {
    const id = notice._id || notice.id;
    const isNews = notice.category === 'news';
    const canPin = pinnedCount < MAX_PINNED_NOTICES;
    const rowNo = start + idx + 1;

    return `
      <tr class="${notice.isPinned ? 'row-pinned' : ''}">
        <td>${rowNo}</td>
        <td>${notice.isPinned
          ? '<span class="badge badge-pinned">📌 고정</span>'
          : '<span style="color:#ccc;">-</span>'}</td>
        <td><span class="badge ${isNews ? 'badge-news' : 'badge-notice'}">${NOTICE_CATEGORY_LABELS[notice.category] || notice.category}</span></td>
        <td><strong>${escapeHtml(notice.title)}</strong></td>
        <td>${escapeHtml(notice.summary || '-')}</td>
        <td>${formatDate(notice.createdAt)}</td>
        <td style="white-space:nowrap;">
          ${notice.isPinned
            ? `<button class="pin-btn unpin" data-pin-id="${id}">고정 해제</button>`
            : `<button class="pin-btn" data-pin-id="${id}" ${canPin ? '' : 'disabled style="opacity:0.4;cursor:not-allowed;"'}>📌 고정</button>`
          }
          <button class="danger-btn" data-notice-id="${id}">삭제</button>
        </td>
      </tr>`;
  }).join('');

  tbody.querySelectorAll('[data-notice-id]').forEach(btn => {
    btn.addEventListener('click', () => deleteAdminNotice(btn.dataset.noticeId));
  });

  tbody.querySelectorAll('[data-pin-id]').forEach(btn => {
    if (!btn.disabled) {
      btn.addEventListener('click', () => toggleAdminNoticePin(btn.dataset.pinId));
    }
  });

  renderNoticePagination(totalPages);
}

async function toggleAdminNoticePin(noticeId) {
  try {
    const response = await fetch(`${API_BASE}/api/notices/${noticeId}/pin`, { method: 'PATCH' });
    const data = await response.json();

    if (response.ok && data.success) {
      const index = adminNotices.findIndex(n => (n._id || n.id) === noticeId);
      if (index !== -1) adminNotices[index] = data.notice;
      renderAdminNoticeList();
    } else {
      alert('❌ ' + (data.error || '고정 처리 실패'));
    }
  } catch (err) {
    console.error(err);
    alert('❌ 서버와 연결할 수 없습니다.');
  }
}

async function postAdminNotice() {
  const title = document.getElementById('notice-title-input')?.value.trim();
  const summary = document.getElementById('notice-summary-input')?.value.trim();
  const content = document.getElementById('notice-content-input')?.value.trim();
  const category = document.getElementById('notice-category')?.value || 'notice';

  if (!title || !content) {
    alert('제목과 내용을 입력해주세요.');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/notices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        summary,
        content,
        category,
        author: localStorage.getItem('adminName') || '관리자',
      }),
    });
    const data = await response.json();

    if (response.ok && data.success) {
      adminNotices.unshift(data.notice);
      currentNoticePage = 1;
      renderAdminNoticeList();
      document.getElementById('notice-title-input').value = '';
      document.getElementById('notice-summary-input').value = '';
      document.getElementById('notice-content-input').value = '';
      alert(`✅ ${NOTICE_CATEGORY_LABELS[category]} 공지가 등록되었습니다.`);
    } else {
      alert('❌ ' + (data.error || '공지 등록 실패'));
    }
  } catch (err) {
    console.error(err);
    alert('❌ 서버와 연결할 수 없습니다.');
  }
}

async function deleteAdminNotice(noticeId) {
  if (!confirm('이 공지를 삭제하시겠습니까?')) return;

  try {
    const response = await fetch(`${API_BASE}/api/notices/${noticeId}`, { method: 'DELETE' });
    const data = await response.json();

    if (response.ok && data.success) {
      adminNotices = adminNotices.filter(n => (n._id || n.id) !== noticeId);
      renderAdminNoticeList();
      alert('✅ 공지가 삭제되었습니다.');
    } else {
      alert('❌ ' + (data.error || '삭제 실패'));
    }
  } catch (err) {
    console.error(err);
    alert('❌ 서버와 연결할 수 없습니다.');
  }
}

let tierPosts = [];
let tierComments = [];
let currentTierPostFilter = 'all';
let currentTierCommentFilter = 'all';

function getAdminAuthHeaders() {
  if (typeof getAuthHeaders === 'function') return getAuthHeaders();
  const token = localStorage.getItem('authToken');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function getTierStatusBadge(reported) {
  return reported
    ? '<span class="badge badge-tier-reported">신고</span>'
    : '<span class="badge badge-tier-normal">일반</span>';
}

function filterTierItems(items, filter) {
  if (filter === 'normal') return items.filter(item => !item.reported);
  if (filter === 'reported') return items.filter(item => item.reported);
  return items;
}

function getTierPostEmptyMessage() {
  if (currentTierPostFilter === 'normal') return '일반 게시글이 없습니다.';
  if (currentTierPostFilter === 'reported') return '신고된 게시글이 없습니다.';
  return '등록된 게시글이 없습니다.';
}

function getTierCommentEmptyMessage() {
  if (currentTierCommentFilter === 'normal') return '일반 댓글이 없습니다.';
  if (currentTierCommentFilter === 'reported') return '신고된 댓글이 없습니다.';
  return '등록된 댓글이 없습니다.';
}

async function loadTierMakerData() {
  try {
    const [postsRes, commentsRes] = await Promise.all([
      fetch(`${API_BASE}/api/admin/tier-reports/posts`, { headers: getAdminAuthHeaders() }),
      fetch(`${API_BASE}/api/admin/tier-reports/comments`, { headers: getAdminAuthHeaders() }),
    ]);

    if (postsRes.ok) tierPosts = await postsRes.json();
    if (commentsRes.ok) tierComments = await commentsRes.json();

    renderTierMaker();
  } catch (err) {
    console.error(err);
  }
}

function renderTierMaker() {
  const postsBody = document.getElementById('tier-posts-body');
  const commentsBody = document.getElementById('tier-comments-body');
  if (!postsBody || !commentsBody) return;

  const filteredPosts = filterTierItems(tierPosts, currentTierPostFilter);
  const filteredComments = filterTierItems(tierComments, currentTierCommentFilter);

  if (!filteredPosts.length) {
    postsBody.innerHTML = `<tr class="empty-row"><td colspan="7">${getTierPostEmptyMessage()}</td></tr>`;
  } else {
    postsBody.innerHTML = filteredPosts.map((post, idx) => {
      const id = post._id || post.id;
      const reason = post.reported
        ? [post.reportReason, post.reportDetail].filter(Boolean).join(' / ') || '-'
        : '-';
      return `
        <tr class="${post.reported ? 'row-reported' : ''}">
          <td>${idx + 1}</td>
          <td>${getTierStatusBadge(post.reported)}</td>
          <td>${escapeHtml(post.title)}</td>
          <td>${escapeHtml(post.author || '-')}</td>
          <td>${escapeHtml(reason)}</td>
          <td>${formatDate(post.updatedAt || post.createdAt)}</td>
          <td>
            ${post.reported ? `<button onclick="dismissTierPostReport('${id}')">해제</button>` : ''}
            <button onclick="deleteTierPostReport('${id}')" class="danger-btn-inline">삭제</button>
          </td>
        </tr>`;
    }).join('');
  }

  if (!filteredComments.length) {
    commentsBody.innerHTML = `<tr class="empty-row"><td colspan="7">${getTierCommentEmptyMessage()}</td></tr>`;
  } else {
    commentsBody.innerHTML = filteredComments.map((comment, idx) => {
      const id = comment._id || comment.id;
      const reason = comment.reported
        ? [comment.reportReason, comment.reportDetail].filter(Boolean).join(' / ') || '-'
        : '-';
      const snippet = (comment.content || '').length > 80 ? `${comment.content.slice(0, 80)}...` : (comment.content || '');
      return `
        <tr class="${comment.reported ? 'row-reported' : ''}">
          <td>${idx + 1}</td>
          <td>${getTierStatusBadge(comment.reported)}</td>
          <td>${escapeHtml(String(comment.tierListId || '-'))}</td>
          <td>${escapeHtml(comment.author || '-')}</td>
          <td>${escapeHtml(snippet)}</td>
          <td>${escapeHtml(reason)}</td>
          <td>
            ${comment.reported ? `<button onclick="dismissTierCommentReport('${id}')">해제</button>` : ''}
            <button onclick="deleteTierCommentReport('${id}')" class="danger-btn-inline">삭제</button>
          </td>
        </tr>`;
    }).join('');
  }
}

window.setTierPostFilter = function(filter) {
  currentTierPostFilter = filter;
  ['all', 'normal', 'reported'].forEach(type => {
    const btn = document.getElementById(`tier-post-filter-${type}`);
    if (btn) btn.classList.toggle('active', type === filter);
  });
  renderTierMaker();
};

window.setTierCommentFilter = function(filter) {
  currentTierCommentFilter = filter;
  ['all', 'normal', 'reported'].forEach(type => {
    const btn = document.getElementById(`tier-comment-filter-${type}`);
    if (btn) btn.classList.toggle('active', type === filter);
  });
  renderTierMaker();
};

window.dismissTierPostReport = async function(id) {
  if (!confirm('이 게시글 신고를 해제할까요?')) return;
  const response = await fetch(`${API_BASE}/api/admin/tier-reports/posts/${id}/dismiss`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
  });
  if (response.ok) loadTierMakerData();
  else alert('신고 해제에 실패했습니다.');
};

window.deleteTierPostReport = async function(id) {
  if (!confirm('이 게시글을 삭제할까요?')) return;
  const response = await fetch(`${API_BASE}/api/admin/tier-reports/posts/${id}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (response.ok) loadTierMakerData();
  else alert('게시글 삭제에 실패했습니다.');
};

window.dismissTierCommentReport = async function(id) {
  if (!confirm('이 댓글 신고를 해제할까요?')) return;
  const response = await fetch(`${API_BASE}/api/admin/tier-reports/comments/${id}/dismiss`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
  });
  if (response.ok) loadTierMakerData();
  else alert('신고 해제에 실패했습니다.');
};

window.deleteTierCommentReport = async function(id) {
  if (!confirm('이 댓글을 삭제할까요?')) return;
  const response = await fetch(`${API_BASE}/api/admin/tier-reports/comments/${id}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (response.ok) loadTierMakerData();
  else alert('댓글 삭제에 실패했습니다.');
};

async function initAdminData() {
  await Promise.all([loadComments(), loadBlocks(), loadUsers(), loadNotices(), loadTierMakerData()]);
}

function renderComments() {
  const tbody = document.querySelector('#comment-table tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  let filtered = comments.filter(comment => {
    if (currentTypeFilter === 'user' && comment.isAdmin) return false;
    if (currentTypeFilter === 'admin' && !comment.isAdmin) return false;
    if (currentTypeFilter === 'reported' && !comment.reported) return false;

    if (currentReportFilter && (!comment.reported || comment.reportReason !== currentReportFilter)) {
      return false;
    }

    const searchTerm = (document.getElementById('search-input')?.value || '').toLowerCase().trim();
    if (searchTerm) {
      const email = getUserEmail(comment.userId);
      const text = (comment.title + ' ' + comment.message + ' ' + (comment.userId || '') + ' ' + email).toLowerCase();
      if (!text.includes(searchTerm)) return false;
    }
    return true;
  });

  if (currentSort === 'newest') {
    filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  } else {
    filtered.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  }

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  currentPage = Math.max(1, Math.min(currentPage, totalPages));

  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginated = filtered.slice(start, start + ITEMS_PER_PAGE);

  if (!paginated.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="6">표시할 댓글이 없습니다.</td></tr>';
    renderPagination(totalPages);
    return;
  }

  paginated.forEach((comment, idx) => {
    const commentId = getCommentId(comment);
    const realIndex = start + idx;
    const isBlocked = isBlockedUser(comment.userId, comment.ip);

    let reportHTML = '';
    if (comment.reported) {
      const reason = comment.reportReason
        ? `${comment.reportReason} ${comment.reportDetail ? `(${comment.reportDetail})` : ''}`
        : '신고됨';
      reportHTML = `
        <span onclick="showReportTooltip(this, '${escapeHtml(reason)}')"
              style="color:#dc3545; cursor:pointer; margin-left:8px; font-size:20px; font-weight:bold;">
          ⚠️
        </span>`;
    }

    const row = `
      <tr class="${isBlocked ? 'row-blocked' : ''}">
        <td>${realIndex + 1}</td>
        <td>${escapeHtml(comment.userId || '익명')}</td>
        <td>${escapeHtml(getUserEmail(comment.userId))}</td>
        <td style="text-align:center;">${comment.title ? `<strong>${escapeHtml(comment.title)}</strong><br>` : ''}${escapeHtml(comment.message || '')}</td>
        <td>${escapeHtml(comment.date || 'N/A')}</td>
        <td style="white-space: nowrap;">
          <button onclick="goToDetail('${commentId}')" class="action-btn">📋 상세</button>
          <button onclick="event.stopImmediatePropagation(); deleteComment('${commentId}')" class="danger-btn">삭제</button>
          ${reportHTML}
        </td>
      </tr>`;
    tbody.innerHTML += row;
  });

  renderPagination(totalPages);
}

window.deleteComment = async function(commentId) {
  if (!confirm('정말 이 댓글을 삭제하시겠습니까?')) return;

  try {
    const response = await fetch(`${API_BASE}/api/inquiries/${commentId}`, { method: 'DELETE' });
    const data = await response.json();

    if (response.ok && data.success) {
      comments = comments.filter(c => getCommentId(c) !== commentId);
      renderComments();
    } else {
      alert('❌ 삭제 실패: ' + (data.error || '알 수 없는 오류'));
    }
  } catch (err) {
    console.error(err);
    alert('❌ 서버와 연결할 수 없습니다.');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  setupDurationSelect();

  const deleteAllBtn = document.getElementById('delete-all-btn');
  if (deleteAllBtn) {
    deleteAllBtn.addEventListener('click', async () => {
      if (!confirm('⚠️ 정말 모든 댓글을 삭제하시겠습니까? (복구 불가)')) return;

      try {
        const response = await fetch(`${API_BASE}/api/inquiries`, { method: 'DELETE' });
        const data = await response.json();

        if (response.ok && data.success) {
          comments = [];
          renderComments();
        } else {
          alert('❌ 전체 삭제 실패: ' + (data.error || '알 수 없는 오류'));
        }
      } catch (err) {
        console.error(err);
        alert('❌ 서버와 연결할 수 없습니다.');
      }
    });
  }

  const addBlockBtn = document.getElementById('add-block-btn');
  if (addBlockBtn) {
    addBlockBtn.addEventListener('click', () => addBlockFromInput());
  }

  const postNoticeBtn = document.getElementById('post-notice-btn');
  if (postNoticeBtn) {
    postNoticeBtn.addEventListener('click', postAdminNotice);
  }

  const noticeListFilter = document.getElementById('notice-list-filter');
  if (noticeListFilter) {
    noticeListFilter.addEventListener('change', applyNoticeFilter);
  }
});

window.applyNoticeFilter = function() {
  currentNoticeFilter = document.getElementById('notice-list-filter')?.value || 'all';
  currentNoticePage = 1;
  renderAdminNoticeList();
};

async function addBlockFromInput(value, durationDays) {
  const inputValue = (value ?? document.getElementById('block-input')?.value ?? '').trim();
  if (!inputValue) {
    alert('차단할 ID 또는 IP를 입력해주세요.');
    return;
  }

  const days = durationDays ?? getSelectedDurationDays();
  if (!days) return;

  try {
    const response = await fetch(`${API_BASE}/api/admin/blocks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: inputValue, durationDays: days }),
    });
    const data = await response.json();

    if (response.ok && data.success) {
      blockedList = blockedList.filter(b => b.value !== data.block.value);
      blockedList.push(data.block);
      renderBlockList();
      renderUserList();
      renderComments();
      if (!value) document.getElementById('block-input').value = '';
      alert(`✅ ${inputValue} 님을 ${days}일간 차단했습니다.`);
    } else {
      alert('❌ ' + (data.error || '차단 추가 실패'));
    }
  } catch (err) {
    console.error(err);
    alert('❌ 서버와 연결할 수 없습니다.');
  }
}

function renderUserList() {
  const tbody = document.getElementById('user-list');
  if (!tbody) return;

  if (!registeredUsers.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="6">등록된 사용자가 없습니다.</td></tr>';
    return;
  }

  tbody.innerHTML = registeredUsers.map((user, idx) => {
    const block = findBlockByValue(user.nickname);
    const isBlocked = !!block;

    return `
      <tr class="${isBlocked ? 'row-blocked' : ''}">
        <td>${idx + 1}</td>
        <td><strong>${escapeHtml(user.nickname)}</strong></td>
        <td>${escapeHtml(user.email)}</td>
        <td>${user.isVerified
          ? '<span class="badge badge-verified">✔ 인증완료</span>'
          : '<span class="badge badge-unverified">미인증</span>'}</td>
        <td>${isBlocked
          ? `<span class="badge badge-blocked">차단중 (${getRemainingLabel(block.expiresAt)})</span>`
          : '<span class="badge badge-active">정상</span>'}</td>
        <td style="white-space:nowrap;">
          ${isBlocked
            ? `<button class="unblock-btn" data-block-id="${block._id}">차단 해제</button>`
            : `<button class="block-btn block-user-btn" data-nickname="${escapeHtml(user.nickname)}">차단</button>`
          }
        </td>
      </tr>`;
  }).join('');

  tbody.querySelectorAll('.block-user-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const days = getSelectedDurationDays();
      if (!days) return;
      if (!confirm(`${btn.dataset.nickname} 님을 ${days}일간 차단하시겠습니까?`)) return;
      addBlockFromInput(btn.dataset.nickname, days);
    });
  });

  tbody.querySelectorAll('.unblock-btn').forEach(btn => {
    btn.addEventListener('click', () => unblock(btn.dataset.blockId));
  });
}

function renderBlockList() {
  const tbody = document.getElementById('block-list');
  if (!tbody) return;

  const activeBlocks = getActiveBlocks();

  if (!activeBlocks.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="8">차단된 항목이 없습니다.</td></tr>';
    return;
  }

  tbody.innerHTML = activeBlocks.map((block, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td><strong>${escapeHtml(block.value)}</strong></td>
      <td><span class="badge badge-type">${block.type === 'ip' ? 'IP' : 'ID'}</span></td>
      <td>${block.durationDays}일</td>
      <td>${formatDate(block.blockedAt || block.createdAt)}</td>
      <td>${formatDate(block.expiresAt)}</td>
      <td>${getRemainingLabel(block.expiresAt)}</td>
      <td>
        <button class="unblock-btn" data-block-id="${block._id}">차단 해제</button>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.unblock-btn').forEach(btn => {
    btn.addEventListener('click', () => unblock(btn.dataset.blockId));
  });
}

async function unblock(blockId) {
  if (!confirm('관리자 재량으로 이 차단을 해제하시겠습니까?')) return;

  try {
    const response = await fetch(`${API_BASE}/api/admin/blocks/${blockId}`, { method: 'DELETE' });
    const data = await response.json();

    if (response.ok && data.success) {
      blockedList = blockedList.filter(b => b._id !== blockId);
      renderBlockList();
      renderUserList();
      renderComments();
      alert('✅ 차단이 해제되었습니다.');
    } else {
      alert('❌ 차단 해제 실패: ' + (data.error || '알 수 없는 오류'));
    }
  } catch (err) {
    console.error(err);
    alert('❌ 서버와 연결할 수 없습니다.');
  }
}

window.unblock = unblock;

window.showReportTooltip = function(element, reason) {
  const existing = document.querySelector('.report-popup');
  if (existing) {
    existing.remove();
    return;
  }

  const popup = document.createElement('div');
  popup.className = 'report-popup';
  popup.innerHTML = `<strong>신고사유 : ${reason}</strong>`;
  document.body.appendChild(popup);

  const rect = element.getBoundingClientRect();
  popup.style.left = `${rect.left + window.scrollX}px`;
  popup.style.top = `${rect.bottom + window.scrollY + 8}px`;

  const hidePopup = (e) => {
    if (!popup.contains(e.target)) {
      popup.remove();
      document.removeEventListener('click', hidePopup);
    }
  };
  setTimeout(() => document.addEventListener('click', hidePopup), 10);
};

window.goToDetail = function(commentId) {
  window.location.href = `comment-detail?id=${commentId}`;
};

window.setTypeFilter = function(type) {
  currentTypeFilter = type;
  currentPage = 1;

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.id === `filter-${type}`);
  });

  applyFilters();
};

window.applyFilters = function() {
  currentReportFilter = document.getElementById('report-filter').value;
  currentSort = document.getElementById('sort-select').value;
  currentPage = 1;
  renderComments();
};

function buildPaginationHtml(totalPages, page, prevFn, nextFn, goFn) {
  let html = `<span style="margin-right:15px; color:#555; font-size:14px;">총 ${totalPages}페이지</span>`;

  html += `<button onclick="${prevFn}(${page - 1})"
                    style="padding:8px 16px; margin:0 4px; background:#007bff; color:white; border:none; border-radius:6px; cursor:pointer;"
                    ${page === 1 ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''}>◀ 이전</button>`;

  const startPage = Math.max(1, page - 3);
  const endPage = Math.min(totalPages, page + 3);

  for (let i = startPage; i <= endPage; i++) {
    html += `<button onclick="${goFn}(${i})"
                      style="padding:8px 16px; margin:0 4px; background:${i === page ? '#007bff' : '#f0f0f0'};
                             color:${i === page ? 'white' : '#333'}; border:none; border-radius:6px; cursor:pointer; font-weight:${i === page ? '700' : '400'};">
              ${i}
            </button>`;
  }

  html += `<button onclick="${nextFn}(${page + 1})"
                    style="padding:8px 16px; margin:0 4px; background:#007bff; color:white; border:none; border-radius:6px; cursor:pointer;"
                    ${page === totalPages ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''}>다음 ▶</button>`;

  return html;
}

function renderPagination(totalPages) {
  const container = document.getElementById('pagination');
  if (!container) return;
  container.innerHTML = buildPaginationHtml(totalPages, currentPage, 'goToPage', 'goToPage', 'goToPage');
}

function renderNoticePagination(totalPages) {
  const container = document.getElementById('notice-pagination');
  if (!container) return;
  container.innerHTML = buildPaginationHtml(totalPages, currentNoticePage, 'goToNoticePage', 'goToNoticePage', 'goToNoticePage');
}

window.goToPage = function(page) {
  currentPage = page;
  renderComments();
};

window.goToNoticePage = function(page) {
  const totalPages = Math.ceil(getFilteredAdminNotices().length / NOTICE_ITEMS_PER_PAGE) || 1;
  if (page < 1 || page > totalPages) return;
  currentNoticePage = page;
  renderAdminNoticeList();
};

window.renderComments = renderComments;
window.renderBlockList = renderBlockList;
window.initAdminData = initAdminData;