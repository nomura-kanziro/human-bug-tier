// ========================================================
// common-v2.js - Contact_us 전용 스크립트
// Node.js Express 백엔드 준비 완료 (지금은 localStorage 사용)
// ========================================================

document.addEventListener("DOMContentLoaded", () => {
  renderInquiryForm();
  loadComments();
});

function isLoggedIn() {
  return localStorage.getItem("isAdmin") === "true" || 
         !!localStorage.getItem("currentUser");   // 나중에 일반 유저 로그인 추가 대비
}

// ========================================================
// 줄바꿈(\n)을 HTML <br>로 변환하는 헬퍼 함수
// ========================================================
function nl2br(text) {
  if (!text) return '';
  return text.replace(/\n/g, '<br>');
}

function isAdminUser() {
  return localStorage.getItem("isAdmin") === "true";
}

function getCurrentUserName() {
  return localStorage.getItem("adminName") || "익명 사용자";
}

// ==================== 상단 폼 ====================
function renderInquiryForm() {
  const container = document.getElementById("inquiry-form-container");

  if (isLoggedIn()) {
    const userName = getCurrentUserName();
    const badge = isAdminUser() ? 
      `<span class="user-badge admin-user">Admin User</span>` : 
      `<span class="user-badge nr-user">NR User</span>`;

    container.innerHTML = `
      <div class="form-card">
        <div class="user-info">
          <div class="user-avatar">👤</div>
          <div class="user-name">${userName}</div>
          ${badge}
        </div>
        <input type="text" id="inquiry-title" placeholder="문의 제목을 입력하세요" />
        <textarea id="message" placeholder="버그 내용이나 문의사항을 자세히 적어주세요..."></textarea>
        <button id="submitBtn">등록하기</button>
      </div>
    `;

    document.getElementById("submitBtn").addEventListener("click", addComment);
  } else {
    container.innerHTML = `
      <div class="login-required">
        <p>🚫 이용하시려면 로그인이 필요합니다.</p>
        <button onclick="goAdminLogin()">로그인 하러 가기</button>
      </div>
    `;
  }
}

// ==================== 댓글 등록 ====================
async function addComment() {
  const title = document.getElementById("inquiry-title")?.value.trim() || "제목 없음";
  const message = document.getElementById("message").value.trim();

  if (!message) {
    alert("내용을 입력해주세요.");
    return;
  }

  let comments = JSON.parse(localStorage.getItem("comments")) || [];
  
  const newComment = {
    id: Date.now().toString(),
    userId: getCurrentUserName(),
    isAdmin: isAdminUser(),
    title: title,
    message: message,
    date: new Date().toLocaleString('ko-KR'),
    // [수정사항] answer → answers 배열로 변경 (답변 여러 개 지원 + 프로필 정보 저장)
    answers: [],
    reported: false,
    reportReason: "",
    reportDetail: ""
  };

  comments.unshift(newComment);
  localStorage.setItem("comments", JSON.stringify(comments));

  alert("✅ 문의사항이 등록되었습니다.");
  document.getElementById("message").value = "";
  if (document.getElementById("inquiry-title")) document.getElementById("inquiry-title").value = "";

  loadComments();
}

// ==================== 댓글 목록 ====================
function loadComments() {
  const listEl = document.getElementById("commentList");
  let comments = JSON.parse(localStorage.getItem("comments")) || [];

  listEl.innerHTML = comments.map(c => {
    const isMyComment = c.userId === getCurrentUserName();
    const canAnswer = isAdminUser();
    const canDelete = isMyComment;
    const canEdit = isMyComment;

    // [수정사항] 기존 단순 answer 문자열 대신 renderAnswer() 호출
    // =================== 답변 토글 기능 (교체) ===================
    let answersHTML = '';
    const answerCount = c.answers ? c.answers.length : 0;

    if (answerCount > 0) {
      const answersList = c.answers.map(answer => 
        renderAnswer(answer, c.id)
      ).join('');

      answersHTML = `
        <div class="answer-toggle-header" onclick="toggleAnswers('${c.id}')">
          <span>📬 답변 보기 (${answerCount}개)</span>
          <span class="toggle-arrow" id="arrow-${c.id}">▼</span>
        </div>
        <div class="answers-container" id="answers-${c.id}" style="display: none;">
          ${answersList}
        </div>
      `;
    }

    return `
      <div class="comment" data-id="${c.id}">
        <div class="name">
          ${c.userId} 
          ${c.isAdmin ? '<span style="color:#007bff">Admin</span>' : ''}
        </div>
        
        <!-- 제목 -->
        <div class="title">${c.title}</div>
        
        <!-- 내용 - 줄바꿈 적용 -->
        <div class="msg">${nl2br(c.message)}</div>
        
        <!-- [수정사항] renderAnswer로 프로필 + 4버튼이 포함된 답변 표시 -->
        ${answersHTML}

        <div class="comment-actions">
          ${canAnswer ? `<button onclick="replyComment('${c.id}')">답변</button>` : ""}

          <!-- ✅ 로그인한 유저(Admin 포함)만 신고 버튼 보이기 -->
          ${isLoggedIn() ? `<button onclick="reportComment('${c.id}')" class="report-btn">신고</button>` : ""}

          ${canEdit ? `<button onclick="editComment('${c.id}')">수정</button>` : ""}

          ${canDelete ? `<button onclick="deleteComment('${c.id}')">삭제</button>` : ""}
        </div>
      </div>
    `;
  }).join('');
}

// ========================================================
// 답변 기능 (1번 문제 해결 버전)
// [------------------------------------------]
// - 답변 버튼 클릭 시 상자가 댓글 내부에 제대로 표시됨
// - 다시 클릭하면 상자가 사라짐 (토글 기능)
// - 상자가 밖으로 튀어나오지 않도록 스타일 완전 제어
// - 토글 + 다른 상자 자동 닫기
// ========================================================

// ========================================================
// (완전 수정 버전)
// - 상자 튀어나옴 해결
// - "답변 올리기" 버튼 제대로 동작
// - 토글 기능 (한 번 더 클릭하면 상자 사라짐)
// ========================================================
// 답변 기능 (버튼 반응 문제 완전 해결 버전)
// - createElement 방식으로 버튼 생성 + addEventListener 직접 연결
// - "답변 올리기" 버튼이 제대로 동작함
// ========================================================

window.replyComment = function(commentId) {
  const commentEl = document.querySelector(`.comment[data-id="${commentId}"]`);
  if (!commentEl) return;
  
  // 1. 이미 답변 상자가 열려 있으면 제거 (두 번째 클릭 = 토글)
  let replyBox = commentEl.querySelector('.reply-box');
  if (replyBox) {
    replyBox.remove();
    return;
  }

  // 2. 다른 모든 액션 상자 먼저 닫기
  closeAllActionBoxes();
  
  // 3. 답변 상자 생성
  const box = document.createElement('div');
  box.className = 'action-box reply-box';
  box.innerHTML = `
    <textarea id="reply-input-${commentId}" 
              placeholder="댓글을 입력하세요" 
              style="width:100%; min-height:130px; padding:14px; border:3px solid #111; border-radius:8px; resize:vertical;"></textarea>
  `;

  const btnGroup = document.createElement('div');
  btnGroup.style.cssText = 'margin-top:12px; display:flex; justify-content:flex-end; gap:10px;';

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = '취소';
  cancelBtn.style.cssText = 'padding:10px 22px; background:#fff; border:2px solid #111; border-radius:8px; cursor:pointer;';
  cancelBtn.onclick = () => cancelReply(commentId);

  const submitBtn = document.createElement('button');
  submitBtn.textContent = '답변 올리기';
  submitBtn.style.cssText = 'padding:10px 26px; background:#111; color:white; border:none; border-radius:8px; font-weight:bold; cursor:pointer;';
  submitBtn.onclick = () => submitReply(commentId);

  btnGroup.appendChild(cancelBtn);
  btnGroup.appendChild(submitBtn);
  box.appendChild(btnGroup);

  commentEl.appendChild(box);
};

// 취소
window.cancelReply = function(commentId) {
  const commentEl = document.querySelector(`.comment[data-id="${commentId}"]`);
  if (!commentEl) return;
  const box = commentEl.querySelector('.reply-box');
  if (box) box.remove();
};

// ==================== 답변 등록 (버튼 클릭 문제 해결 + 답변 객체로 저장) ====================
window.submitReply = function(commentId) {
  console.log('🚨 submitReply 실행됨 - commentId:', commentId);

  const input = document.getElementById(`reply-input-${commentId}`);
  if (!input) {
    console.error('❌ 입력창을 찾을 수 없습니다. ID:', `reply-input-${commentId}`);
    alert("입력창을 찾을 수 없습니다.");
    return;
  }

  const replyText = input.value.trim();
  if (!replyText) {
    alert("답변 내용을 입력해주세요.");
    return;
  }

  let comments = JSON.parse(localStorage.getItem("comments")) || [];
  const comment = comments.find(c => c.id === commentId);

  if (comment) {
    // [수정사항] 단순 문자열이 아닌 **객체**로 저장 → renderAnswer에서 프로필·버튼 사용 가능
    if (!comment.answers) comment.answers = [];
    
    const newAnswer = {
      id: Date.now().toString(),
      userId: getCurrentUserName(),
      isAdmin: isAdminUser(),
      message: replyText,
      date: new Date().toLocaleString('ko-KR'),
      // [수정사항] 대댓글(답변의 답변)을 지원하기 위해 replies 배열 추가
      replies: []
    };

    comment.answers.push(newAnswer);
    localStorage.setItem("comments", JSON.stringify(comments));
    
    loadComments();           // 목록 새로고침
    alert("✅ 답변이 등록되었습니다.");
  } else {
    alert("댓글을 찾을 수 없습니다.");
  }
};

// ========================================================
// 답변 렌더링 (프로필 위, 내용 아래, 버튼 하단)
// ========================================================

function renderAnswer(answer, parentCommentId) {
  const isMyAnswer = answer.userId === getCurrentUserName();
  const canDelete = isMyAnswer || isAdminUser();

  const quoteHTML = answer.quotedMessage ? `
    <div class="answer-quote">
      <strong>${answer.quotedUser} &gt;&gt;</strong><br>
      ${nl2br(answer.quotedMessage)}
    </div>
  ` : '';

  let reportHTML = '';
  if (isLoggedIn()) {
    if (answer.reported) {
      reportHTML = `<button class="report-btn" disabled style="background:#ccc; color:#666; cursor:not-allowed;">신고됨</button>`;
    } else {
      reportHTML = `<button onclick="reportAnswer('${answer.id}', '${parentCommentId}')" class="report-btn">신고</button>`;
    }
  }

  return `
    <div class="answer" data-id="${answer.id}" data-parent="${parentCommentId}">
      <div class="user-info">
        <div class="user-avatar">👤</div>
        <div class="user-name">${answer.userId || '관리자'}</div>
        ${answer.isAdmin 
          ? '<span class="user-badge admin-user">Admin User</span>' 
          : '<span class="user-badge nr-user">NR User</span>'}
      </div>

      ${quoteHTML}

      <!-- 답변 내용 - 줄바꿈 적용 -->
      <div class="answer-text">${nl2br(answer.message)}</div>

      <div class="comment-actions">
        ${isLoggedIn() ? `<button onclick="replyToAnswer('${answer.id}', '${parentCommentId}')">답변</button>` : ""}
        ${reportHTML}
        ${isMyAnswer ? `<button onclick="editAnswer('${answer.id}', '${parentCommentId}')">수정</button>` : ''}
        ${canDelete ? `<button onclick="deleteAnswer('${answer.id}', '${parentCommentId}')">삭제</button>` : ''}
      </div>
    </div>
  `;
}

// ============================================================
// 신고 (모달 형태) 
// ============================================================

window.reportComment = function(commentId) {
  const reasons = ["도배 및 테러행위", "비방 및 모욕행위", "광고형 댓글", "기타"];
  let selectedReason = "";
  let detail = "";

  const modalHTML = `
    <div style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:9999; display:flex; align-items:center; justify-content:center;">
      <div style="background:white; width:420px; border-radius:12px; padding:30px;">
        <h3 style="margin-bottom:20px;">신고 사유 선택</h3>
        ${reasons.map(r => `<button onclick="selectReason('${r}', '${commentId}')" style="width:100%; margin:6px 0; padding:12px; border:2px solid #111; background:white; border-radius:8px;">${r}</button>`).join('')}
        <button onclick="closeReportModal()" style="margin-top:20px; width:100%; padding:12px; background:#dc3545; color:white; border:none; border-radius:8px;">취소</button>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);
};

window.selectReason = function(reason, commentId) {
  if (reason === "기타") {
    const detail = prompt("기타 사유를 입력해주세요:");
    if (!detail) return;
    submitReport(commentId, reason, detail);
  } else {
    submitReport(commentId, reason, "");
  }
  closeReportModal();
};

function submitReport(commentId, reason, detail) {
  let comments = JSON.parse(localStorage.getItem("comments")) || [];
  const comment = comments.find(c => c.id === commentId);
  if (comment) {
    comment.reported = true;
    comment.reportReason = reason;
    comment.reportDetail = detail;
    localStorage.setItem("comments", JSON.stringify(comments));
    alert("✅ 신고가 접수되었습니다.");
    loadComments();
  }
};

function closeReportModal() {
  const modal = document.querySelector('div[style*="z-index:9999"]');
  if (modal) modal.remove();
}

// ========================================================
// 수정 기능 (3번 문제 해결 - 답변과 동일한 하단 상자 형태)
// ========================================================

window.editComment = function(commentId) {
  const commentEl = document.querySelector(`.comment[data-id="${commentId}"]`);
  if (!commentEl) return;

  // 1. 이미 수정 상자가 열려 있으면 제거 (두 번째 클릭 = 토글)
  let editBox = commentEl.querySelector('.edit-box');
  
  if (editBox) {
    editBox.remove();
    return;
  }

  // 2. 다른 모든 액션 상자 먼저 닫기
  closeAllActionBoxes();
  
  // 3. 현재 댓글 데이터 가져오기
  let comments = JSON.parse(localStorage.getItem("comments")) || [];
  const comment = comments.find(c => c.id === commentId);
  if (!comment) return;

  // 4. 수정 상자 생성
  const box = document.createElement('div');
  box.className = 'action-box edit-box';
  box.innerHTML = `
    <input type="text" id="edit-title-${commentId}" 
           value="${comment.title}" 
           placeholder="제목을 입력하세요"
           style="width:100%; padding:12px; border:3px solid #111; border-radius:8px; margin-bottom:12px;">
    
    <textarea id="edit-message-${commentId}" 
              placeholder="내용을 입력하세요">${comment.message}</textarea>
  `;

  const btnGroup = document.createElement('div');
  btnGroup.style.cssText = 'margin-top:12px; display:flex; justify-content:flex-end; gap:10px;';

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = '취소';
  cancelBtn.style.cssText = 'padding:10px 22px; background:#fff; border:2px solid #111; border-radius:8px; cursor:pointer;';
  cancelBtn.onclick = () => cancelEdit(commentId);

  const submitBtn = document.createElement('button');
  submitBtn.textContent = '수정 완료';
  submitBtn.style.cssText = 'padding:10px 26px; background:#111; color:white; border:none; border-radius:8px; font-weight:bold; cursor:pointer;';
  submitBtn.onclick = () => submitEdit(commentId);

  btnGroup.appendChild(cancelBtn);
  btnGroup.appendChild(submitBtn);
  box.appendChild(btnGroup);

  commentEl.appendChild(box);
};

// 수정 취소
window.cancelEdit = function(commentId) {
  const commentEl = document.querySelector(`.comment[data-id="${commentId}"]`);
  if (!commentEl) return;
  const box = commentEl.querySelector('.edit-box');
  if (box) box.remove();
};

// 수정 완료
window.submitEdit = function(commentId) {
  const titleInput = document.getElementById(`edit-title-${commentId}`);
  const messageInput = document.getElementById(`edit-message-${commentId}`);

  if (!titleInput || !messageInput) return;

  const newTitle = titleInput.value.trim();
  const newMessage = messageInput.value.trim();

  if (!newMessage) {
    alert("내용을 입력해주세요.");
    return;
  }

  let comments = JSON.parse(localStorage.getItem("comments")) || [];
  const comment = comments.find(c => c.id === commentId);

  if (comment) {
    comment.title = newTitle || "제목 없음";
    comment.message = newMessage;
    localStorage.setItem("comments", JSON.stringify(comments));
    loadComments();
    alert("✅ 수정이 완료되었습니다.");
  }
};

// ====================================================================
// ==================== 삭제 기능 (4번 문제 해결) =======================
// ====================================================================

window.deleteComment = function(commentId) {
  console.log('🗑️ deleteComment 호출됨 - commentId:', commentId); // 디버깅용

  if (!confirm("정말 이 댓글을 삭제하시겠습니까?")) {
    return;
  }

  let comments = JSON.parse(localStorage.getItem("comments")) || [];
  
  // 실제 삭제
  comments = comments.filter(c => c.id !== commentId);
  
  localStorage.setItem("comments", JSON.stringify(comments));
  
  loadComments();   // 목록 새로고침
  
  alert("✅ 댓글이 삭제되었습니다.");
};

// ========================================================
// 모든 액션 상자 닫기 (중복 방지 핵심 함수)
// ========================================================
function closeAllActionBoxes() {
  document.querySelectorAll('.action-box').forEach(box => box.remove());
}

// ========================================================
// 답변(대댓글) 기능 - 답변 버튼 클릭 시 답변 아래에 입력 상자 생성
// ========================================================
// [수정사항] 답변 카드 안의 "답변" 버튼만 변경
// - 댓글의 replyComment()는 그대로 유지
// - 답변 카드 안에 진한 회색 "원래 답변 << " 인용 블록 + 입력창 표시
// ========================================================

window.replyToAnswer = function(answerId, parentCommentId) {
  const answerEl = document.querySelector(`.answer[data-id="${answerId}"]`);
  if (!answerEl) return;

  // 이미 열려있으면 토글 (두 번 클릭 = 닫기)
  let subBox = answerEl.querySelector('.reply-box');
  if (subBox) {
    subBox.remove();
    return;
  }

  // 다른 상자 모두 닫기
  closeAllActionBoxes();

  // 원래 답변 내용 가져오기 (DOM에서 직접 읽음)
  const originalText = answerEl.querySelector('.answer-text')?.textContent || '';

  // 인용 + 입력 상자 생성
  const box = document.createElement('div');
  box.className = 'action-box reply-box';
  box.innerHTML = `
    <!-- 진한 회색 인용 블록 -->
    <div class="answer-quote">
      <strong>원래 답변 &lt;&lt;</strong><br>
      ${originalText}
    </div>

    <!-- 새 답변 입력창 -->
    <textarea id="sub-reply-input-${answerId}" 
              placeholder="답변에 대한 답변을 입력하세요" 
              style="width:100%; min-height:120px; padding:14px; border:3px solid #111; border-radius:8px; resize:vertical; margin-top:16px;"></textarea>
  `;

  const btnGroup = document.createElement('div');
  btnGroup.style.cssText = 'margin-top:12px; display:flex; justify-content:flex-end; gap:10px;';

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = '취소';
  cancelBtn.style.cssText = 'padding:10px 22px; background:#fff; border:2px solid #111; border-radius:8px; cursor:pointer;';
  cancelBtn.onclick = () => { box.remove(); };

  const submitBtn = document.createElement('button');
  submitBtn.textContent = '답변 올리기';
  submitBtn.style.cssText = 'padding:10px 26px; background:#111; color:white; border:none; border-radius:8px; font-weight:bold; cursor:pointer;';
  submitBtn.onclick = () => submitReplyToAnswer(answerId, parentCommentId);

  btnGroup.appendChild(cancelBtn);
  btnGroup.appendChild(submitBtn);
  box.appendChild(btnGroup);

  answerEl.appendChild(box);
};

// ==================== 답변의 답변 등록 ====================
window.submitReplyToAnswer = function(answerId, parentCommentId) {
  const input = document.getElementById(`sub-reply-input-${answerId}`);
  if (!input) { alert("입력창을 찾을 수 없습니다."); return; }

  const replyText = input.value.trim();
  if (!replyText) { alert("내용을 입력해주세요."); return; }

  let comments = JSON.parse(localStorage.getItem("comments")) || [];
  const comment = comments.find(c => c.id === parentCommentId);
  if (!comment) return;

  const answer = comment.answers.find(a => a.id === answerId);
  if (!answer) return;

  // ✅ 핵심 변경: replies 대신 comment.answers에 같은 레벨로 추가
  const newSubReply = {
    id: Date.now().toString(),
    userId: getCurrentUserName(),
    isAdmin: isAdminUser(),
    message: replyText,
    date: new Date().toLocaleString('ko-KR'),
    // ✅ 인용 정보 저장
    quotedUser: answer.userId,
    quotedMessage: answer.message,
    replies: []
  };

  comment.answers.push(newSubReply);  // ← replies → answers로 변경
  localStorage.setItem("comments", JSON.stringify(comments));

  loadComments();
  alert("✅ 답변이 등록되었습니다.");
};

// ========================================================
// [추가] 답변 신고 기능 (reportAnswer)
// - 댓글 신고(reportComment)와 동일한 모달 사용
// - 답변 객체에 reported, reportReason, reportDetail 저장
// ========================================================

window.reportAnswer = function(answerId, parentCommentId) {
  const reasons = ["도배 및 테러행위", "비방 및 모욕행위", "광고형 댓글", "기타"];

  const modalHTML = `
    <div style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:9999; display:flex; align-items:center; justify-content:center;">
      <div style="background:white; width:420px; border-radius:12px; padding:30px;">
        <h3 style="margin-bottom:20px;">신고 사유 선택</h3>
        ${reasons.map(r => `<button onclick="selectReasonForAnswer('${r}', '${answerId}', '${parentCommentId}')" style="width:100%; margin:6px 0; padding:12px; border:2px solid #111; background:white; border-radius:8px;">${r}</button>`).join('')}
        <button onclick="closeReportModal()" style="margin-top:20px; width:100%; padding:12px; background:#dc3545; color:white; border:none; border-radius:8px;">취소</button>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);
};

window.selectReasonForAnswer = function(reason, answerId, parentCommentId) {
  if (reason === "기타") {
    const detail = prompt("기타 사유를 입력해주세요:");
    if (!detail) return;
    submitReportForAnswer(answerId, parentCommentId, reason, detail);
  } else {
    submitReportForAnswer(answerId, parentCommentId, reason, "");
  }
  closeReportModal();
};

function submitReportForAnswer(answerId, parentCommentId, reason, detail) {
  let comments = JSON.parse(localStorage.getItem("comments")) || [];
  const comment = comments.find(c => c.id === parentCommentId);
  if (!comment || !comment.answers) return;

  const answer = comment.answers.find(a => a.id === answerId);
  if (answer) {
    answer.reported = true;
    answer.reportReason = reason;
    answer.reportDetail = detail;
    localStorage.setItem("comments", JSON.stringify(comments));
    alert("✅ 답변이 신고되었습니다.");
    loadComments();   // 목록 새로고침
  }
}

// ========================================================
// 답변 수정 기능 (editAnswer)
// - 답변 카드 안에 수정 버튼 클릭 시 상자 생성
// - 내용만 수정 (답변은 제목 없음)
// - 토글 + 다른 상자 자동 닫기
// ========================================================
window.editAnswer = function(answerId, parentCommentId) {
  const answerEl = document.querySelector(`.answer[data-id="${answerId}"]`);
  if (!answerEl) return;

  // 1. 이미 수정 상자가 열려 있으면 제거 (두 번째 클릭 = 토글)
  let editBox = answerEl.querySelector('.edit-box');
  if (editBox) {
    editBox.remove();
    return;
  }

  // 2. 다른 모든 액션 상자 먼저 닫기
  closeAllActionBoxes();

  // 3. 현재 답변 데이터 가져오기
  let comments = JSON.parse(localStorage.getItem("comments")) || [];
  const comment = comments.find(c => c.id === parentCommentId);
  if (!comment) return;

  const answer = comment.answers.find(a => a.id === answerId);
  if (!answer) return;

  // 4. 수정 상자 생성
  const box = document.createElement('div');
  box.className = 'action-box edit-box';
  box.innerHTML = `
    <textarea id="edit-answer-${answerId}" 
              style="width:100%; min-height:130px; padding:14px; border:3px solid #111; border-radius:8px; resize:vertical;">${answer.message}</textarea>
  `;

  const btnGroup = document.createElement('div');
  btnGroup.style.cssText = 'margin-top:12px; display:flex; justify-content:flex-end; gap:10px;';

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = '취소';
  cancelBtn.style.cssText = 'padding:10px 22px; background:#fff; border:2px solid #111; border-radius:8px; cursor:pointer;';
  cancelBtn.onclick = () => cancelEditForAnswer(answerId);

  const submitBtn = document.createElement('button');
  submitBtn.textContent = '수정 완료';
  submitBtn.style.cssText = 'padding:10px 26px; background:#111; color:white; border:none; border-radius:8px; font-weight:bold; cursor:pointer;';
  submitBtn.onclick = () => submitEditForAnswer(answerId, parentCommentId);

  btnGroup.appendChild(cancelBtn);
  btnGroup.appendChild(submitBtn);
  box.appendChild(btnGroup);

  answerEl.appendChild(box);
};

// 수정 취소
window.cancelEditForAnswer = function(answerId) {
  const answerEl = document.querySelector(`.answer[data-id="${answerId}"]`);
  if (answerEl) {
    const box = answerEl.querySelector('.edit-box');
    if (box) box.remove();
  }
};

// 수정 완료
window.submitEditForAnswer = function(answerId, parentCommentId) {
  const textarea = document.getElementById(`edit-answer-${answerId}`);
  if (!textarea) return;

  const newMessage = textarea.value.trim();
  if (!newMessage) {
    alert("내용을 입력해주세요.");
    return;
  }

  let comments = JSON.parse(localStorage.getItem("comments")) || [];
  const comment = comments.find(c => c.id === parentCommentId);
  if (!comment) return;

  const answer = comment.answers.find(a => a.id === answerId);
  if (answer) {
    answer.message = newMessage;
    localStorage.setItem("comments", JSON.stringify(comments));
    loadComments();           // 목록 새로고침
    alert("✅ 답변 수정이 완료되었습니다.");
  }
};

// ========================================================
// [추가] 답변 카드 삭제 기능 (deleteAnswer)
// - 댓글 삭제(deleteComment)와 완전히 동일한 로직
// - comment.answers 배열에서 해당 답변만 제거
// - 인용 블록이 있는 답변도 정상 삭제됨
// ========================================================
window.deleteAnswer = function(answerId, parentCommentId) {
  console.log('🗑️ deleteAnswer 호출됨 - answerId:', answerId, 'parentCommentId:', parentCommentId);

  if (!confirm("정말 이 답변을 삭제하시겠습니까?")) {
    return;
  }

  let comments = JSON.parse(localStorage.getItem("comments")) || [];
  const comment = comments.find(c => c.id === parentCommentId);

  if (!comment || !comment.answers) {
    alert("답변을 찾을 수 없습니다.");
    return;
  }

  // 해당 답변만 필터링해서 제거
  comment.answers = comment.answers.filter(a => a.id !== answerId);

  localStorage.setItem("comments", JSON.stringify(comments));

  loadComments();   // 목록 새로고침
  alert("✅ 답변이 삭제되었습니다.");
};

// ========================================================
// 모든 textarea에서 Enter키 줄바꿈 강제 보장
// ========================================================
function ensureTextareaEnterBehavior() {
  document.querySelectorAll('textarea').forEach(textarea => {
    textarea.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.stopImmediatePropagation();  // 다른 이벤트가 Enter를 가로채는 것 방지
        // preventDefault() 하지 않음 → 자연스러운 줄바꿈
      }
    }, true); // capturing phase
  });
}

// 페이지 로드될 때 + 동적 생성 textarea에도 적용
document.addEventListener('DOMContentLoaded', ensureTextareaEnterBehavior);

// 동적으로 생성되는 textarea (답변, 수정 상자)에도 적용
const originalReplyComment = window.replyComment;
window.replyComment = function(commentId) {
  originalReplyComment(commentId);
  setTimeout(ensureTextareaEnterBehavior, 100);
};

const originalReplyToAnswer = window.replyToAnswer;
window.replyToAnswer = function(answerId, parentCommentId) {
  originalReplyToAnswer(answerId, parentCommentId);
  setTimeout(ensureTextareaEnterBehavior, 100);
};

const originalEditComment = window.editComment;
window.editComment = function(commentId) {
  originalEditComment(commentId);
  setTimeout(ensureTextareaEnterBehavior, 100);
};

const originalEditAnswer = window.editAnswer;
window.editAnswer = function(answerId, parentCommentId) {
  originalEditAnswer(answerId, parentCommentId);
  setTimeout(ensureTextareaEnterBehavior, 100);
};

// ========================================================
// 답변 토글 기능 (열기/닫기)
// ========================================================
window.toggleAnswers = function(commentId) {
  const container = document.getElementById(`answers-${commentId}`);
  const arrow = document.getElementById(`arrow-${commentId}`);
  
  if (!container || !arrow) return;

  if (container.style.display === 'none' || container.style.display === '') {
    container.style.display = 'block';
    arrow.textContent = '▲';
  } else {
    container.style.display = 'none';
    arrow.textContent = '▼';
  }
};