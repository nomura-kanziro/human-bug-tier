let comments = JSON.parse(localStorage.getItem('comments')) || [];
let blockedList = JSON.parse(localStorage.getItem('blocked')) || [];

// ==================== 필터 상태 ====================
let currentTypeFilter = 'all';        // all, user, admin, reported
let currentReportFilter = '';         // 신고 사유 또는 빈 문자열

// 테이블 렌더링
function renderComments() {
    const tbody = document.querySelector('#comment-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    let filtered = comments.filter(comment => {
        // 1. 타입 필터
        if (currentTypeFilter === 'user') {
            if (comment.isAdmin) return false;
        }
        if (currentTypeFilter === 'admin') {
            if (!comment.isAdmin) return false;
        }
        if (currentTypeFilter === 'reported') {
            if (!comment.reported) return false;
        }

        // 2. 신고 사유 필터
        if (currentReportFilter) {
            if (!comment.reported || comment.reportReason !== currentReportFilter) return false;
        }

        // 3. 검색어 필터
        const searchTerm = document.getElementById('search-input').value.toLowerCase().trim();
        if (searchTerm) {
            const text = (comment.title + ' ' + comment.message + ' ' + (comment.userId || '')).toLowerCase();
            if (!text.includes(searchTerm)) return false;
        }

        return true;
    });

    filtered.forEach((comment, index) => {
        const isBlocked = blockedList.includes(comment.userId || '') || blockedList.includes(comment.ip || '');

        let reportHTML = '';
        if (comment.reported) {
            const reason = comment.reportReason 
                ? `${comment.reportReason} ${comment.reportDetail ? `(${comment.reportDetail})` : ''}` 
                : '신고됨';
            reportHTML = `
                <span onclick="showReportTooltip(this, '${reason}')" 
                      style="color:#dc3545; cursor:pointer; margin-left:6px; font-size:20px; font-weight:bold;">
                    ⚠️
                </span>`;
        }

        const row = `
            <tr ${isBlocked ? 'style="background:#ffebee; opacity:0.7;"' : ''}>
                <td>${index + 1}</td>
                <td>${comment.userId || '익명'}</td>
                <td>${comment.ip || 'Unknown'}</td>
                <td style="text-align:center;">${comment.title ? `<strong>${comment.title}</strong><br>` : ''}${comment.message || ''}</td>
                <td>${comment.date || 'N/A'}</td>
                <td style="text-align: center; white-space: nowrap;">
                    <button onclick="event.stopImmediatePropagation(); window.location.href='comment-detail.html?id=${comment.id}'" 
                            style="background:#6c757d; color:white; border:none; padding:8px 16px; border-radius:6px; cursor:pointer; margin-right:8px; font-size:13px; font-weight:600;">
                        📋 상세
                    </button>
                    <button onclick="event.stopImmediatePropagation(); deleteComment(${index})" class="danger-btn">삭제</button>
                    ${reportHTML}
                </td>
            </tr>`;
        tbody.innerHTML += row;
    });
}

// 댓글 삭제
window.deleteComment = function(index) {
    if (confirm('정말 이 댓글을 삭제하시겠습니까?')) {
        comments.splice(index, 1);
        localStorage.setItem('comments', JSON.stringify(comments));
        renderComments();
    }
};

// 모든 댓글 삭제
document.getElementById('delete-all-btn').addEventListener('click', () => {
    if(confirm('⚠️ 정말 모든 댓글을 삭제하시겠습니까? (복구 불가)')) {
        comments = [];
        localStorage.setItem('comments', JSON.stringify(comments));
        renderComments();
    }
});

// 차단 추가
document.getElementById('add-block-btn').addEventListener('click', () => {
    const value = document.getElementById('block-input').value.trim();
    if(value && !blockedList.includes(value)) {
        blockedList.push(value);
        localStorage.setItem('blocked', JSON.stringify(blockedList));
        renderBlockList();
        renderComments();   // 테이블도 바로 업데이트
        document.getElementById('block-input').value = '';
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

// 페이지 로드 시 실행
window.onload = () => {
    // Header_Footer.css가 제대로 적용되면 header/footer 내용 채움 (기존 방식 그대로)
    renderComments();
    renderBlockList();
};

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
    window.location.href = `comment-detail.html?id=${commentId}`;
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
    renderComments();
};