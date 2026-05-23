let comments = JSON.parse(localStorage.getItem('comments')) || [];
let blockedList = JSON.parse(localStorage.getItem('blocked')) || [];

// ==================== 필터 상태 ====================
let currentTypeFilter = 'all';        // all, user, admin, reported
let currentReportFilter = '';         // 신고 사유 또는 빈 문자열
let currentSort = 'newest';   // newest or oldest

// ==================== 페이지네이션 ====================
const ITEMS_PER_PAGE = 25;
let currentPage = 1;

// 테이블 렌더링
function renderComments() {
    const tbody = document.querySelector('#comment-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    let filtered = comments.filter(comment => {
        // 1. 타입 필터
        if (currentTypeFilter === 'user' && comment.isAdmin) return false;
        if (currentTypeFilter === 'admin' && !comment.isAdmin) return false;
        if (currentTypeFilter === 'reported' && !comment.reported) return false;

        // 2. 신고 사유 필터
        if (currentReportFilter && (!comment.reported || comment.reportReason !== currentReportFilter)) {
            return false;
        }

        // 3. 검색어 필터
        const searchTerm = (document.getElementById('search-input')?.value || '').toLowerCase().trim();
        if (searchTerm) {
            const text = (comment.title + ' ' + comment.message + ' ' + (comment.userId || '')).toLowerCase();
            if (!text.includes(searchTerm)) return false;
        }
        return true;
    });

    // ==================== 정렬 ====================
    if (currentSort === 'newest') {
        filtered.sort((a, b) => parseInt(b.id) - parseInt(a.id));
    } else {
        filtered.sort((a, b) => parseInt(a.id) - parseInt(b.id));
    }

    // ==================== 페이지네이션 ====================
    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
    currentPage = Math.max(1, Math.min(currentPage, totalPages));

    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginated = filtered.slice(start, start + ITEMS_PER_PAGE);

    // ==================== 테이블 행 생성 ====================
    paginated.forEach((comment, idx) => {
        const realIndex = start + idx;   // 삭제할 때 정확한 index 사용
        const isBlocked = blockedList.includes(comment.userId || '') || blockedList.includes(comment.ip || '');

        let reportHTML = '';
        if (comment.reported) {
            const reason = comment.reportReason 
                ? `${comment.reportReason} ${comment.reportDetail ? `(${comment.reportDetail})` : ''}` 
                : '신고됨';
            reportHTML = `
                <span onclick="showReportTooltip(this, '${reason}')" 
                      style="color:#dc3545; cursor:pointer; margin-left:8px; font-size:20px; font-weight:bold;">
                    ⚠️
                </span>`;
        }

        const row = `
            <tr ${isBlocked ? 'style="background:#ffebee; opacity:0.7;"' : ''}>
                <td>${realIndex + 1}</td>
                <td>${comment.userId || '익명'}</td>
                <td>${comment.ip || 'Unknown'}</td>
                <td style="text-align:center;">${comment.title ? `<strong>${comment.title}</strong><br>` : ''}${comment.message || ''}</td>
                <td>${comment.date || 'N/A'}</td>
                <td style="text-align: center; white-space: nowrap;">
                    <button onclick="goToDetail('${comment.id}')" 
                            style="background:#6c757d; color:white; border:none; padding:8px 16px; border-radius:6px; cursor:pointer; margin-right:8px; font-size:13px; font-weight:600;">
                        📋 상세
                    </button>
                    <button onclick="event.stopImmediatePropagation(); deleteComment('${comment.id}')" class="danger-btn">삭제</button>
                    ${reportHTML}
                </td>
            </tr>`;
        tbody.innerHTML += row;
    });

    renderPagination(totalPages);
}

// 댓글 삭제
window.deleteComment = function(commentId) {
    if (confirm('정말 이 댓글을 삭제하시겠습니까?')) {
        comments = comments.filter(c => c.id !== commentId);
        localStorage.setItem('comments', JSON.stringify(comments));
        renderComments();
    }
};

// 모든 댓글 삭제 + 차단 추가 — DOM 준비 후 이벤트 등록
document.addEventListener('DOMContentLoaded', () => {
    const deleteAllBtn = document.getElementById('delete-all-btn');
    if (deleteAllBtn) {
        deleteAllBtn.addEventListener('click', () => {
            if(confirm('⚠️ 정말 모든 댓글을 삭제하시겠습니까? (복구 불가)')) {
                comments = [];
                localStorage.setItem('comments', JSON.stringify(comments));
                renderComments();
            }
        });
    }

    const addBlockBtn = document.getElementById('add-block-btn');
    if (addBlockBtn) {
        addBlockBtn.addEventListener('click', () => {
            const value = document.getElementById('block-input').value.trim();
            if(value && !blockedList.includes(value)) {
                blockedList.push(value);
                localStorage.setItem('blocked', JSON.stringify(blockedList));
                renderBlockList();
                renderComments();
                document.getElementById('block-input').value = '';
            }
        });
    }
});

// 차단 목록 렌더링
function renderBlockList() {
    const ul = document.getElementById('block-list');
    ul.innerHTML = blockedList.map((item, i) => `
        <li>
            ${item} 
            <button onclick="unblock(${i})" style="margin-left:10px; color:red;">해제</button>
        </li>
    `).join('');
}

window.unblock = function(i) {
    blockedList.splice(i, 1);
    localStorage.setItem('blocked', JSON.stringify(blockedList));
    renderBlockList();
    renderComments();
};

// window.onload는 comment-management.html에서 처리

// 신고사유 팝업 (Contact-us 스타일)
window.showReportTooltip = function(element, reason) {
    // 이미 팝업이 열려있으면 닫고 끝 (토글!)
    const existing = document.querySelector('.report-popup');
    if (existing) {
        existing.remove();
        return;
    }

    // 팝업 생성
    const popup = document.createElement('div');
    popup.className = 'report-popup';
    popup.innerHTML = `<strong>신고사유 : ${reason}</strong>`;

    document.body.appendChild(popup);

    // 위치 계산
    const rect = element.getBoundingClientRect();
    popup.style.left = `${rect.left + window.scrollX}px`;
    popup.style.top = `${rect.bottom + window.scrollY + 8}px`;

    // 다른 곳 클릭하면 사라지게
    const hidePopup = (e) => {
        if (!popup.contains(e.target)) {
            popup.remove();
            document.removeEventListener('click', hidePopup);
        }
    };
    setTimeout(() => {
        document.addEventListener('click', hidePopup);
    }, 10);
};

// ========================================================
// 상세 페이지로 이동하는 함수
// ========================================================
window.goToDetail = function(commentId) {
    window.location.href = `comment-detail?id=${commentId}`;
};

// ==================== 필터 제어 함수 ====================
window.setTypeFilter = function(type) {
    currentTypeFilter = type;
    
    // 버튼 active 스타일 토글
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.id === `filter-${type}`);
    });
    
    applyFilters();
};

window.applyFilters = function() {
    currentReportFilter = document.getElementById('report-filter').value;
    currentSort = document.getElementById('sort-select').value;
    renderComments();
};

// ========================================================
// 페이지네이션 UI 렌더링 (항상 보이게 + 1페이지일 때도 표시)
// ========================================================
function renderPagination(totalPages) {
  const container = document.getElementById('pagination');
  if (!container) return;

  let html = `<span style="margin-right:15px; color:#555; font-size:14px;">총 ${totalPages}페이지</span>`;

  // 이전 버튼
  html += `<button onclick="goToPage(${currentPage - 1})" 
                    style="padding:8px 16px; margin:0 4px; background:#007bff; color:white; border:none; border-radius:6px; cursor:pointer;"
                    ${currentPage === 1 ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''}>◀ 이전</button>`;

  // 페이지 번호
  const startPage = Math.max(1, currentPage - 3);
  const endPage = Math.min(totalPages, currentPage + 3);

  for (let i = startPage; i <= endPage; i++) {
    html += `<button onclick="goToPage(${i})" 
                      style="padding:8px 16px; margin:0 4px; background:${i === currentPage ? '#007bff' : '#f0f0f0'}; 
                             color:${i === currentPage ? 'white' : '#333'}; border:none; border-radius:6px; cursor:pointer; font-weight:${i === currentPage ? '700' : '400'};">
              ${i}
            </button>`;
  }

  // 다음 버튼
  html += `<button onclick="goToPage(${currentPage + 1})" 
                    style="padding:8px 16px; margin:0 4px; background:#007bff; color:white; border:none; border-radius:6px; cursor:pointer;"
                    ${currentPage === totalPages ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''}>다음 ▶</button>`;

  container.innerHTML = html;
}

// 페이지 이동
window.goToPage = function(page) {
  currentPage = page;
  renderComments();
};