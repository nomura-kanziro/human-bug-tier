// ========================================================
// 줄바꿈(\n)을 <br>로 변환하는 헬퍼 함수 (detail 페이지 전용)
// ========================================================
function nl2br(text) {
  if (!text) return '';
  return text.replace(/\n/g, '<br>');
}

// ========================================================
// comment-detail.js
// 댓글 상세 관리 페이지 (comment-detail.html 전용)
// ========================================================

// ==================== 필터 상태 (최상단 선언 필수) ====================
let detailTypeFilter = 'all';
let detailReportFilter = '';

document.addEventListener("DOMContentLoaded", () => {
  renderCommentDetail();
});

// URL에서 commentId 가져오기
function getCommentIdFromURL() {
  // npx serve가 .html을 제거해도 동작하도록 전체 href에서 파싱
  const href = window.location.href;
  const match = href.match(/[?&]id=([^&]+)/);
  const id = match ? match[1] : null;
  console.log('🔍 [debug] 현재 URL의 id 값:', id);
  return id;
}

// ==================== 상세 페이지 렌더링 ====================
function renderCommentDetail() {
  const commentId = getCommentIdFromURL();

  // ID가 없으면 → 테스트용 전체 댓글 목록 보여주기 (바로 클릭해서 테스트 가능)
  if (!commentId) {
    let comments = JSON.parse(localStorage.getItem("comments")) || [];
    let listHTML = comments.map(c => `
      <div style="border:3px solid #111; border-radius:12px; padding:20px; margin-bottom:15px; cursor:pointer;" 
           onclick="window.location.href='comment-detail?id=${c.id}'">
        <strong>No.${c.id.slice(-4)}</strong> | 
        작성자: ${c.userId} 
        <span style="color:#007bff">[${c.isAdmin ? 'Admin' : 'NR User'}]</span><br>
        제목: ${c.title}<br>
        <small style="color:#666">${c.date}</small>
      </div>
    `).join('');

    document.getElementById('comment-detail').innerHTML = `
      <div style="text-align:center; padding:120px 40px; color:#dc3545;">
        <h2 style="margin-bottom:20px;">❌ 잘못된 접근입니다.</h2>
        <p style="font-size:17px; line-height:1.6;">
          관리자 댓글 목록에서<br>
          원하는 댓글의 <strong style="color:#111;">📋 상세</strong> 버튼을 클릭해주세요.
        </p>
        <button onclick="window.location.href='comment-management'" 
                style="margin-top:40px; padding:14px 36px; background:#007bff; color:white; border:none; 
                       border-radius:8px; font-size:16px; cursor:pointer;">
          ← 관리 목록으로 돌아가기
        </button>
      </div>`;
    return;
  }

  // 정상 ID가 있을 때 상세 표시 (기존 코드)
  let comments = JSON.parse(localStorage.getItem("comments")) || [];
  const comment = comments.find(c => c.id === commentId);

  if (!comment) {
    document.getElementById('comment-detail').innerHTML = `
      <div style="text-align:center; padding:80px; font-size:18px; color:#dc3545;">
        ❌ 해당 댓글이 존재하지 않습니다.
      </div>`;
    return;
  }

  // ... (나머지 renderCommentDetail 기존 로직은 그대로 유지)
  // ==================== 답변 필터링 + 토글 (안전 버전) ====================
    let answersHTML = '';
    const answerCount = comment.answers ? comment.answers.length : 0;

    if (answerCount > 0) {
      let filteredAnswers = comment.answers;

      // 1. 타입 필터 (신고된 답변만)
      if (detailTypeFilter === 'reported') {
        filteredAnswers = filteredAnswers.filter(a => a.reported === true);
      }

      // 2. 신고 사유 필터
      if (detailReportFilter) {
        filteredAnswers = filteredAnswers.filter(a => 
          a.reported && a.reportReason === detailReportFilter
        );
      }

      // 3. 검색어 필터
      const searchTerm = (document.getElementById('detail-search-input')?.value || '').toLowerCase().trim();
      if (searchTerm) {
        filteredAnswers = filteredAnswers.filter(a => 
          (a.message || '').toLowerCase().includes(searchTerm)
        );
      }

      // 기존 map 코드 그대로 유지 (기능 삭제 방지)
      const answersList = filteredAnswers.map(answer => {
        const quoteHTML = answer.quotedMessage ? `
          <div class="quote">
            <strong>${answer.quotedUser} &gt;&gt;</strong><br>
            ${nl2br(answer.quotedMessage)}
          </div>` : '';

        return `
          <div class="answer-card" data-id="${answer.id}">
            <div class="user-info" style="display:flex; align-items:center; gap:12px; margin-bottom:16px;">
              <div class="user-avatar" style="width:42px;height:42px;background:linear-gradient(135deg,#007bff,#8faadc);border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:22px;">👤</div>
              <div class="user-name" style="font-weight:700;">${answer.userId || '관리자'}</div>
              ${answer.isAdmin ? '<span class="user-badge admin-user">Admin User</span>' : '<span class="user-badge nr-user">NR User</span>'}
            </div>
            
            ${quoteHTML}
            
            <div class="answer-text" style="font-size:15px; line-height:1.7; margin-bottom:20px;">${nl2br(answer.message)}</div>
            
            <div class="action-buttons" style="display:flex; gap:8px; align-items:center;">
              ${answer.reported ? `
                <span onclick="showReportTooltip(this, '${answer.reportReason} ${answer.reportDetail ? `(${answer.reportDetail})` : ''}')" 
                      title="신고사유 : ${answer.reportReason} ${answer.reportDetail ? `(${answer.reportDetail})` : ''}"
                      style="color:#dc3545; cursor:pointer; font-size:24px; font-weight:bold; vertical-align:middle;">
                  ⚠️
                </span>` : ''}
              
              <button onclick="deleteAnswer('${answer.id}', '${commentId}')" 
                      style="background:#dc3545;color:white;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;">
                🗑️ 답변 삭제
              </button>
            </div>
          </div>`;
      }).join('');

      answersHTML = `
        <div class="answer-toggle-header" onclick="toggleDetailAnswers('${commentId}')" 
             style="background:#f8f8f8; border:3px solid #111; border-radius:8px; padding:14px 20px; margin:25px 0 15px 0; cursor:pointer; display:flex; justify-content:space-between; align-items:center; font-weight:700;">
          <span>📬 답변 보기 (${filteredAnswers.length}개)</span>
          <span class="toggle-arrow" id="detail-arrow-${commentId}" style="font-size:18px;">▼</span>
        </div>
        <div class="answers-container" id="detail-answers-${commentId}" style="display:none; margin-left:30px;">
          ${answersList}
        </div>
      `;
    } else {
      answersHTML = '<p style="text-align:center; color:#888; padding:40px 0;">아직 답변이 없습니다.</p>';
    }

  const html = `
    <!-- ==================== 파란 네비게이션 바 (상세 페이지용) ==================== -->
    <div class="filter-nav" style="margin-bottom: 25px;">
      <div class="filter-left">
        <span class="filter-title">답변 탐색 기능</span>
       <button onclick="setDetailTypeFilter('all')" id="detail-filter-all" class="filter-btn">전체 답변</button>
       <button onclick="setDetailTypeFilter('reported')" id="detail-filter-reported" class="filter-btn">신고된 답변</button>
      </div>

      <div class="filter-right">
        <div style="display:flex; gap:8px; align-items:center;">
          <input type="text" id="detail-search-input" placeholder="답변 내용 검색..." 
                 onkeyup="if(event.key==='Enter') applyDetailFilters()" 
                 style="flex:1; padding:10px 14px; border:2px solid #fff; border-radius:6px; font-size:14px;">

          <button onclick="applyDetailFilters()" 
                  style="padding:10px 24px; background:#fff; color:#007bff; border:2px solid #fff; border-radius:6px; cursor:pointer; font-weight:700;">
            🔍 검색
          </button>
        </div>

        <select id="detail-report-filter" onchange="applyDetailFilters()" style="padding:10px 12px; border:2px solid #fff; border-radius:6px; font-size:14px;">
          <option value="">없음</option>
          <option value="도배 및 테러행위">도배 및 테러행위</option>
          <option value="비방 및 모욕행위">비방 및 모욕행위</option>
          <option value="광고형 댓글">광고형 댓글</option>
          <option value="기타">기타</option>
        </select>
      </div>
    </div>

    <div class="detail-card">
      <!-- 원본 댓글 -->
      <div style="margin-bottom:30px;">
        <div class="user-info" style="display:flex; align-items:center; gap:14px; margin-bottom:20px;">
          <div class="user-avatar" style="width:48px;height:48px;background:linear-gradient(135deg,#007bff,#8faadc);border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:26px;">👤</div>
          <div>
            <div class="user-name" style="font-size:19px;font-weight:700;">${comment.userId}</div>
            ${comment.isAdmin ? '<span class="user-badge admin-user">Admin User</span>' : '<span class="user-badge nr-user">NR User</span>'}
          </div>
        </div>
        <div style="font-size:22px; font-weight:800; margin-bottom:12px;">제목 : ${comment.title}</div>
        <div style="font-size:16px; line-height:1.7; margin-bottom:20px;">${nl2br(comment.message)}</div>
        <div style="color:#666; font-size:14px;">작성일 : ${comment.date}</div>
      </div>
      
      ${answersHTML || '<p style="text-align:center; color:#888; padding:40px 0;">아직 답변이 없습니다.</p>'}
    </div>

    <div style="text-align:center; margin-top:40px;">
      <button onclick="deleteWholeComment('${commentId}')" style="background:#dc3545;color:white;border:none;padding:16px 40px;font-size:17px;font-weight:700;border-radius:8px;cursor:pointer;margin-right:15px;">
        🗑️ 이 댓글 전체 삭제
      </button>
      <button onclick="window.location.href='comment-management'" style="background:#111;color:white;border:none;padding:16px 40px;font-size:17px;font-weight:700;border-radius:8px;cursor:pointer;">
        ← 목록으로 돌아가기
      </button>
    </div>
  `;

  document.getElementById('comment-detail').innerHTML = html;

  // ==================== 필터 상태 강제 복원 ====================
  setTimeout(() => {
    // select value 복원
    const select = document.getElementById('detail-report-filter');
    if (select) select.value = detailReportFilter || '';

    // 버튼 active 복원
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`detail-filter-${detailTypeFilter}`);
    if (activeBtn) activeBtn.classList.add('active');
  }, 30);
}

// ==================== 삭제 함수 (기존 그대로) ====================
window.deleteAnswer = function(answerId, commentId) {
  if (!confirm("정말 이 답변을 삭제하시겠습니까?")) return;
  let comments = JSON.parse(localStorage.getItem("comments")) || [];
  const comment = comments.find(c => c.id === commentId);
  if (!comment) return;
  comment.answers = comment.answers.filter(a => a.id !== answerId);
  localStorage.setItem("comments", JSON.stringify(comments));
  alert("✅ 답변이 삭제되었습니다.");
  renderCommentDetail();
};

window.deleteWholeComment = function(commentId) {
  if (!confirm("⚠️ 이 댓글과 모든 답변을 완전히 삭제하시겠습니까?")) return;
  let comments = JSON.parse(localStorage.getItem("comments")) || [];
  comments = comments.filter(c => c.id !== commentId);
  localStorage.setItem("comments", JSON.stringify(comments));
  alert("✅ 댓글이 전체 삭제되었습니다.");
  window.location.href = "comment-management";
};

// ========================================================
// 신고 느낌표 클릭 → 상자 유지 + 바깥/더블클릭으로 닫기
// ========================================================

window.showReportTooltip = function(element, reason) {
  // 이미 상자가 열려있으면 닫기 (토글)
  const existing = document.querySelector('.report-popup');
  if (existing) {
    existing.remove();
    return;
  }

  // 신고 사유 상자 생성 (사진과 동일한 스타일)
  const popup = document.createElement('div');
  popup.className = 'report-popup';
  popup.innerHTML = `<strong>신고사유 : ${reason}</strong>`;
  document.body.appendChild(popup);

  // 느낌표 위치 바로 아래에 표시
  const rect = element.getBoundingClientRect();
  popup.style.left = `${rect.left + window.scrollX + 30}px`;
  popup.style.top = `${rect.bottom + window.scrollY + 10}px`;

  // 다른 곳 클릭하면 사라짐
  const hidePopup = (e) => {
    if (!popup.contains(e.target)) {
      popup.remove();
      document.removeEventListener('click', hidePopup);
    }
  };
  setTimeout(() => document.addEventListener('click', hidePopup), 10);

  // 더블클릭해도 사라짐
  popup.addEventListener('dblclick', () => popup.remove());
};

// ========================================================
// detail 페이지 답변 토글 (열기/닫기)
// ========================================================
window.toggleDetailAnswers = function(commentId) {
  const container = document.getElementById(`detail-answers-${commentId}`);
  const arrow = document.getElementById(`detail-arrow-${commentId}`);
  
  if (!container || !arrow) return;

  if (container.style.display === 'none' || container.style.display === '') {
    container.style.display = 'block';
    arrow.textContent = '▲';
  } else {
    container.style.display = 'none';
    arrow.textContent = '▼';
  }
};

// ==================== 상세 페이지 필터 함수 ====================

window.setDetailTypeFilter = function(type) {
  detailTypeFilter = type;

  // 모든 버튼 active 제거
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  // 선택된 버튼에 active 추가
  const activeBtn = document.getElementById(`detail-filter-${type}`);
  if (activeBtn) {
    activeBtn.classList.add('active');
  }

  applyDetailFilters();
};

window.applyDetailFilters = function() {
  detailReportFilter = document.getElementById('detail-report-filter').value || '';
  renderCommentDetail();
};