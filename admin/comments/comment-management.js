let comments = JSON.parse(localStorage.getItem('comments')) || [];
let blockedList = JSON.parse(localStorage.getItem('blocked')) || [];

// 테이블 렌더링
function renderComments() {
    const tbody = document.querySelector('#comment-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    comments.forEach((comment, index) => {
        const isBlocked = blockedList.includes(comment.userId || '') || blockedList.includes(comment.ip || '');
        
        const row = `
            <tr ${isBlocked ? 'style="background:#ffebee; opacity:0.7;"' : ''}>
                <td>${index + 1}</td>
                <td>${comment.userId || '익명'}</td>
                <td>${comment.ip || 'Unknown'}</td>
                <td style="text-align:left;">${comment.text || ''}</td>
                <td>${comment.date || 'N/A'}</td>
                <td>
                    <button onclick="deleteComment(${index})" class="danger-btn">삭제</button>
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