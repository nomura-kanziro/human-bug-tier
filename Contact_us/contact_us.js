// ========================================================
// common-v2.js - Contact_us 전용 스크립트 (contenteditable 버전)
// ========================================================

document.addEventListener("DOMContentLoaded", () => {
  renderInquiryForm();
  loadComments();
});

function isLoggedIn() {
  // 기존 admin 체크 + 새로 만든 user 체크 병행
  return localStorage.getItem("isAdmin") === "true" || 
         !!localStorage.getItem("user");
}

function nl2br(text) {
  if (!text) return '';
  return text.replace(/\n/g, '<br>');
}

function isAdminUser() {
  return localStorage.getItem("isAdmin") === "true";
}

function getCurrentUserName() {
  // adminName 우선, 없으면 user.nickname 사용
  if (localStorage.getItem("isAdmin") === "true") {
    return localStorage.getItem("adminName") || "관리자";
  }

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  return user.nickname || "익명 사용자";
}

// 페이지 내 인라인 버튼에서 호출되는 전역 로그인 이동 함수
// Contact_us 폴더에서 호출되는 경우 상위 폴더의 admin 로그인 페이지로 이동하도록 처리
window.goToLogin = function() {
  const path = window.location.pathname || '';
  // Contact_us 폴더 경로일 때는 상대 경로로 상위(admin) 폴더로 이동
  if (path.includes('/Contact_us/') || path.includes('\\Contact_us\\')) {
    window.location.href = '../user_login/login.html';
    return;
  }
  // 그 외의 경우 루트 기반 admin 경로로 이동
  window.location.href = '/user_login/login.html';
};

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
        <div id="message"
             class="comment-input-box"
             contenteditable="true"
             data-placeholder="버그 내용이나 문의사항을 자세히 적어주세요..."></div>
        <button id="submitBtn">등록하기</button>
      </div>
    `;

    document.getElementById("submitBtn").addEventListener("click", addComment);
  } else {
    container.innerHTML = `
      <div class="login-required">
        <p>🚫 이용하시려면 로그인이 필요합니다.</p>
        <button onclick="goToLogin()">로그인 하러 가기</button>
      </div>
    `;
  }
}

// ==================== 댓글 등록 (백엔드 연동) ====================
async function addComment() {
  const title = document.getElementById("inquiry-title")?.value.trim() || "제목 없음";
  const message = document.getElementById("message").innerText.trim();

  if (!message) {
    alert("내용을 입력해주세요.");
    return;
  }

  try {
    const response = await fetch('http://localhost:5000/api/inquiries', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: title,
        message: message,
        userId: getCurrentUserName()   // 현재 로그인한 유저 이름
      })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      alert("✅ 문의사항이 등록되었습니다.");
      document.getElementById("message").innerHTML = "";
      if (document.getElementById("inquiry-title")) {
        document.getElementById("inquiry-title").value = "";
      }
      loadComments(); // 목록 새로고침
    } else {
      alert("❌ 등록 실패: " + (data.error || "알 수 없는 오류"));
    }
  } catch (err) {
    console.error(err);
    alert("❌ 서버와 연결할 수 없습니다.");
  }
}

// ==================== 댓글 목록 (백엔드 연동) ====================
async function loadComments() {
  const listEl = document.getElementById("commentList");

  try {
    const response = await fetch('http://localhost:5000/api/inquiries');
    const inquiries = await response.json();

    if (!Array.isArray(inquiries)) {
      listEl.innerHTML = '<p>문의사항을 불러오는데 실패했습니다.</p>';
      return;
    }

    listEl.innerHTML = inquiries.map(c => {
      const currentUser = getCurrentUserName();
      const isMyComment = c.userId === currentUser;
      const canAnswer = isAdminUser();
      const canDelete = isMyComment;
      const canEdit = isMyComment;

      let answersHTML = '';
      const answerCount = c.answers ? c.answers.length : 0;

      if (answerCount > 0) {
        const answersList = c.answers.map(answer => 
          renderAnswer(answer, c._id)   // ← _id 사용 (MongoDB)
        ).join('');

        answersHTML = `
          <div class="answer-toggle-header" onclick="toggleAnswers('${c._id}')">
            <span>📬 답변 보기 (${answerCount}개)</span>
            <span class="toggle-arrow" id="arrow-${c._id}">▼</span>
          </div>
          <div class="answers-container" id="answers-${c._id}" style="display: none;">
            ${answersList}
          </div>
        `;
      }

      return `
        <div class="comment" data-id="${c._id}">
          <div class="name">
            ${c.userId} 
            ${c.isAdmin ? '<span style="color:#007bff">Admin</span>' : ''}
          </div>
          
          <div class="title">${c.title}</div>
          
          <div class="msg">${nl2br(c.message)}</div>
          
          ${answersHTML}

          <div class="comment-actions">
            ${canAnswer ? `<button onclick="replyComment('${c._id}')">답변</button>` : ""}
            ${isLoggedIn() ? `<button onclick="reportComment('${c._id}')" class="report-btn">신고</button>` : ""}
            ${canEdit ? `<button onclick="editComment('${c._id}')">수정</button>` : ""}
            ${canDelete ? `<button onclick="deleteComment('${c._id}')">삭제</button>` : ""}
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error(err);
    listEl.innerHTML = '<p>서버와 연결할 수 없습니다.</p>';
  }
}

// ========================================================
// replyComment (contenteditable 버전)
// ========================================================
window.replyComment = function(commentId) {
  const commentEl = document.querySelector(`.comment[data-id="${commentId}"]`);
  if (!commentEl) return;

  let replyBox = commentEl.querySelector('.reply-box');
  if (replyBox) {
    replyBox.remove();
    return;
  }

  closeAllActionBoxes();

  const box = document.createElement('div');
  box.className = 'action-box reply-box';

  box.innerHTML = `
    <div id="reply-input-${commentId}" 
         class="comment-input-box" 
         contenteditable="true"
         data-placeholder="댓글을 입력하세요"></div>
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

window.cancelReply = function(commentId) {
  const commentEl = document.querySelector(`.comment[data-id="${commentId}"]`);
  if (!commentEl) return;
  const box = commentEl.querySelector('.reply-box');
  if (box) box.remove();
};

// ==================== 답변 등록 ====================
window.submitReply = function(commentId) {
  const input = document.getElementById(`reply-input-${commentId}`);
  if (!input) {
    alert("입력창을 찾을 수 없습니다.");
    return;
  }

  const replyText = input.innerText.trim();
  if (!replyText) {
    alert("답변 내용을 입력해주세요.");
    return;
  }

  let comments = JSON.parse(localStorage.getItem("comments")) || [];
  const comment = comments.find(c => c.id === commentId);

  if (comment) {
    if (!comment.answers) comment.answers = [];
    
    const newAnswer = {
      id: Date.now().toString(),
      userId: getCurrentUserName(),
      isAdmin: isAdminUser(),
      message: replyText,
      date: new Date().toLocaleString('ko-KR'),
      replies: []
    };

    comment.answers.push(newAnswer);
    localStorage.setItem("comments", JSON.stringify(comments));
    
    loadComments();
    alert("✅ 답변이 등록되었습니다.");
  }
};

// ========================================================
// renderAnswer
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

// ========================================================
// 신고 기능 (생략 - 기존과 동일)
// ========================================================
window.reportComment = function(commentId) { /* 기존 코드 유지 */ };
window.selectReason = function(reason, commentId) { /* 기존 코드 유지 */ };
function submitReport(commentId, reason, detail) { /* 기존 코드 유지 */ };
function closeReportModal() { /* 기존 코드 유지 */ };

// ========================================================
// editComment (contenteditable 버전)
// ========================================================
window.editComment = function(commentId) {
  const commentEl = document.querySelector(`.comment[data-id="${commentId}"]`);
  if (!commentEl) return;

  let editBox = commentEl.querySelector('.edit-box');
  if (editBox) {
    editBox.remove();
    return;
  }

  closeAllActionBoxes();

  let comments = JSON.parse(localStorage.getItem("comments")) || [];
  const comment = comments.find(c => c.id === commentId);
  if (!comment) return;

  const box = document.createElement('div');
  box.className = 'action-box edit-box';

  box.innerHTML = `
    <input type="text" id="edit-title-${commentId}" 
           value="${comment.title || ''}" 
           placeholder="제목을 입력하세요"
           style="width:100%; padding:12px; border:3px solid #111; border-radius:8px; margin-bottom:12px; box-sizing:border-box;">
    
    <div id="edit-message-${commentId}" 
         class="comment-input-box" 
         contenteditable="true"
         data-placeholder="내용을 입력하세요">${comment.message}</div>
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

window.cancelEdit = function(commentId) {
  const commentEl = document.querySelector(`.comment[data-id="${commentId}"]`);
  if (!commentEl) return;
  const box = commentEl.querySelector('.edit-box');
  if (box) box.remove();
};

window.submitEdit = function(commentId) {
  const titleInput = document.getElementById(`edit-title-${commentId}`);
  const messageInput = document.getElementById(`edit-message-${commentId}`);

  if (!titleInput || !messageInput) return;

  const newTitle = titleInput.value.trim();
  const newMessage = messageInput.innerText.trim();

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

// ========================================================
// deleteComment (기존 유지)
// ========================================================
window.deleteComment = function(commentId) {
  if (!confirm("정말 이 댓글을 삭제하시겠습니까?")) return;

  let comments = JSON.parse(localStorage.getItem("comments")) || [];
  comments = comments.filter(c => c.id !== commentId);
  localStorage.setItem("comments", JSON.stringify(comments));
  loadComments();
  alert("✅ 댓글이 삭제되었습니다.");
};

// ========================================================
// closeAllActionBoxes
// ========================================================
function closeAllActionBoxes() {
  document.querySelectorAll('.action-box').forEach(box => box.remove());
}

// ========================================================
// replyToAnswer (contenteditable 버전)
// ========================================================
window.replyToAnswer = function(answerId, parentCommentId) {
  const answerEl = document.querySelector(`.answer[data-id="${answerId}"]`);
  if (!answerEl) return;

  let subBox = answerEl.querySelector('.reply-box');
  if (subBox) {
    subBox.remove();
    return;
  }

  closeAllActionBoxes();

  const originalText = answerEl.querySelector('.answer-text')?.textContent || '';

  const box = document.createElement('div');
  box.className = 'action-box reply-box';

  box.innerHTML = `
    <div class="answer-quote">
      <strong>원래 답변 &lt;&lt;</strong><br>
      ${originalText}
    </div>

    <div id="sub-reply-input-${answerId}" 
         class="comment-input-box" 
         contenteditable="true"
         data-placeholder="답변에 대한 답변을 입력하세요"></div>
  `;

  const btnGroup = document.createElement('div');
  btnGroup.style.cssText = 'margin-top:12px; display:flex; justify-content:flex-end; gap:10px;';

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = '취소';
  cancelBtn.style.cssText = 'padding:10px 22px; background:#fff; border:2px solid #111; border-radius:8px; cursor:pointer;';
  cancelBtn.onclick = () => box.remove();

  const submitBtn = document.createElement('button');
  submitBtn.textContent = '답변 올리기';
  submitBtn.style.cssText = 'padding:10px 26px; background:#111; color:white; border:none; border-radius:8px; font-weight:bold; cursor:pointer;';
  submitBtn.onclick = () => submitReplyToAnswer(answerId, parentCommentId);

  btnGroup.appendChild(cancelBtn);
  btnGroup.appendChild(submitBtn);
  box.appendChild(btnGroup);

  answerEl.appendChild(box);
};

window.submitReplyToAnswer = function(answerId, parentCommentId) {
  const input = document.getElementById(`sub-reply-input-${answerId}`);
  if (!input) { alert("입력창을 찾을 수 없습니다."); return; }

  const replyText = input.innerText.trim();
  if (!replyText) { alert("내용을 입력해주세요."); return; }

  let comments = JSON.parse(localStorage.getItem("comments")) || [];
  const comment = comments.find(c => c.id === parentCommentId);
  if (!comment) return;

  const answer = comment.answers.find(a => a.id === answerId);
  if (!answer) return;

  const newSubReply = {
    id: Date.now().toString(),
    userId: getCurrentUserName(),
    isAdmin: isAdminUser(),
    message: replyText,
    date: new Date().toLocaleString('ko-KR'),
    quotedUser: answer.userId,
    quotedMessage: answer.message,
    replies: []
  };

  comment.answers.push(newSubReply);
  localStorage.setItem("comments", JSON.stringify(comments));

  loadComments();
  alert("✅ 답변이 등록되었습니다.");
};

// ========================================================
// reportAnswer (기존 유지)
// ========================================================
window.reportAnswer = function(answerId, parentCommentId) { /* 기존 코드 유지 */ };
window.selectReasonForAnswer = function(reason, answerId, parentCommentId) { /* 기존 코드 유지 */ };
function submitReportForAnswer(answerId, parentCommentId, reason, detail) { /* 기존 코드 유지 */ };

// ========================================================
// editAnswer (contenteditable 버전)
// ========================================================
window.editAnswer = function(answerId, parentCommentId) {
  const answerEl = document.querySelector(`.answer[data-id="${answerId}"]`);
  if (!answerEl) return;

  let editBox = answerEl.querySelector('.edit-box');
  if (editBox) {
    editBox.remove();
    return;
  }

  closeAllActionBoxes();

  let comments = JSON.parse(localStorage.getItem("comments")) || [];
  const comment = comments.find(c => c.id === parentCommentId);
  if (!comment) return;

  const answer = comment.answers.find(a => a.id === answerId);
  if (!answer) return;

  const box = document.createElement('div');
  box.className = 'action-box edit-box';

  box.innerHTML = `
    <div id="edit-answer-${answerId}" 
         class="comment-input-box" 
         contenteditable="true"
         data-placeholder="내용을 입력하세요">${answer.message}</div>
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

window.cancelEditForAnswer = function(answerId) {
  const answerEl = document.querySelector(`.answer[data-id="${answerId}"]`);
  if (answerEl) {
    const box = answerEl.querySelector('.edit-box');
    if (box) box.remove();
  }
};

window.submitEditForAnswer = function(answerId, parentCommentId) {
  const textarea = document.getElementById(`edit-answer-${answerId}`);
  if (!textarea) return;

  const newMessage = textarea.innerText.trim();
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
    loadComments();
    alert("✅ 답변 수정이 완료되었습니다.");
  }
};

// ========================================================
// deleteAnswer (기존 유지)
// ========================================================
window.deleteAnswer = function(answerId, parentCommentId) {
  if (!confirm("정말 이 답변을 삭제하시겠습니까?")) return;

  let comments = JSON.parse(localStorage.getItem("comments")) || [];
  const comment = comments.find(c => c.id === parentCommentId);
  if (!comment || !comment.answers) return;

  comment.answers = comment.answers.filter(a => a.id !== answerId);
  localStorage.setItem("comments", JSON.stringify(comments));
  loadComments();
  alert("✅ 답변이 삭제되었습니다.");
};

// ========================================================
// toggleAnswers
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