// ========================================================
// common-v2.js - Contact_us 전용 스크립트 (contenteditable 버전)
// ========================================================
// 목적:
//   1. 문의하기(Contact_us) 폼 렌더링 + 문의/답변 목록 백엔드 연동
//   2. 댓글(문의)·답변에 대한 등록/수정/삭제/신고 CRUD 처리
//   3. 알림(Notification)에서 딥링크로 들어왔을 때 특정 문의/답변으로 자동 스크롤
// 이 스크립트는 항상 common.js 다음에 로드되므로(HTML의 <script> 순서 참고)
// getBasePath()/getAuthHeaders() 등 common.js의 전역 헬퍼를 그대로 사용할 수 있다.
// ========================================================

// common.js의 getApiBase()와 동일한 판별 로직을 이 파일 안에 별도로 복제해둔 함수.
// (GitHub Pages 정적 배포 → 'GITHUB_STATIC', 로컬 라이브서버 포트 → localhost:5000 고정,
//  그 외(Render/​backend 통합 실행) → 같은 오리진이므로 빈 문자열 반환)
// common.js가 먼저 로드되어 getApiBase()도 쓸 수 있지만, Contact_us 페이지 전용으로
// 이름을 구분해 별도 유지하고 있다. 아래 fetch 호출들은 대부분 이 함수를 사용한다.
function getContactApiBase() {
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

// 페이지 진입 시 최초 1회: 로그인 상태에 맞는 문의 작성 폼을 그리고,
// 백엔드에서 문의/답변 목록을 불러와 렌더링한다.
document.addEventListener("DOMContentLoaded", () => {
  renderInquiryForm();
  loadComments();
});

// 알림(Notification)의 "문의 답변 도착" 등에서 링크를 타고 들어온 경우,
// URL(?inquiry=...&answer=...)이나 sessionStorage에 저장된 딥링크 타깃이 있으면
// 해당 문의/답변까지 자동 스크롤 + 하이라이트한다.
// loadComments()의 fetch가 끝나 DOM에 댓글 목록이 그려질 시간을 벌기 위해
// window 'load' 이후 400ms 지연을 두고 실행한다(자세한 재시도 로직은 scrollToInquiryTarget 참고).
window.addEventListener('load', () => {
  const target = resolveInquiryScrollTarget();
  if (target.inquiryId) {
    setTimeout(runNotificationInquiryScroll, 400);
  }
});

// 스크롤 타깃(문의 id / 답변 id)을 두 가지 경로에서 읽어와 합친다:
//   1) 현재 페이지 URL의 쿼리스트링 (?inquiry=xxx&answer=yyy)
//   2) common.js가 알림 클릭 시 sessionStorage 등에 저장해두는 getNotificationScrollTarget()
// URL 쿼리를 우선하되, 비어 있는 값만 stored 값으로 보충한다.
function resolveInquiryScrollTarget() {
  let inquiryId = '';
  let answerId = '';

  try {
    const params = new URLSearchParams(window.location.search || '');
    inquiryId = (params.get('inquiry') || '').trim();
    answerId = (params.get('answer') || '').trim();
  } catch (err) {
    console.warn('문의 스크롤 URL 파싱 실패:', err);
  }

  const stored = typeof getNotificationScrollTarget === 'function'
    ? getNotificationScrollTarget()
    : null;
  if (stored?.page === 'inquiry') {
    if (!inquiryId && stored.inquiryId) inquiryId = String(stored.inquiryId).trim();
    if (!answerId && stored.answerId) answerId = String(stored.answerId).trim();
  }

  return { inquiryId, answerId };
}

// 대상 엘리먼트로 부드럽게 스크롤한 뒤, CSS의 notification-scroll-highlight 클래스로
// 잠깐(2.8초) 파란 테두리를 표시해 "여기입니다"를 시각적으로 알려준다.
function highlightScrollTarget(element) {
  if (!element) return;
  element.classList.add('notification-scroll-highlight');
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  setTimeout(() => element.classList.remove('notification-scroll-highlight'), 2800);
}

// 답변 목록은 기본적으로 접혀있는(display:none) 상태이므로, 특정 답변으로 스크롤하기 전에
// 해당 문의의 답변 패널을 강제로 펼쳐야(display:block) 그 안의 답변 엘리먼트가 보이고
// scrollIntoView도 의미가 있다. toggleAnswers()의 "펼치기" 쪽 동작만 재사용한 헬퍼.
function openAnswersPanel(inquiryId) {
  const container = document.getElementById(`answers-${inquiryId}`);
  const arrow = document.getElementById(`arrow-${inquiryId}`);
  if (container) container.style.display = 'block';
  if (arrow) arrow.textContent = '▲';
}

// 알림 딥링크로 지정된 문의/답변 엘리먼트를 찾아 스크롤 + 하이라이트하는 핵심 함수.
// loadComments()의 fetch가 비동기라서 이 함수가 처음 실행될 때 DOM에 아직 댓글이
// 렌더링되지 않았을 수 있다. 그래서 대상을 못 찾으면 즉시 실패 처리하지 않고
// 150ms 간격으로 최대 40회(약 6초) 재시도하며 DOM이 채워지길 기다린다.
function scrollToInquiryTarget(inquiryId, answerId, retries = 40) {
  if (!inquiryId) return;

  // data-id 값을 CSS.escape로 이스케이프해 특수문자가 섞여도 셀렉터가 깨지지 않게 한다.
  const safeInquiryId = CSS.escape(String(inquiryId));
  const inquiryEl = document.querySelector(`.comment[data-id="${safeInquiryId}"]`);
  if (!inquiryEl) {
    if (retries > 0) {
      setTimeout(() => scrollToInquiryTarget(inquiryId, answerId, retries - 1), 150);
    }
    return;
  }

  // 문의를 찾았으면 그 안의 답변 패널부터 펼쳐서, 이어지는 답변 스크롤이 보이도록 준비한다.
  openAnswersPanel(inquiryId);

  // answerId까지 지정된 경우: 특정 답변을 정확히 짚어서 보여준다.
  if (answerId) {
    const safeAnswerId = CSS.escape(String(answerId));
    const answerEl = document.querySelector(`.answer[data-id="${safeAnswerId}"]`);
    if (answerEl) {
      // 먼저 문의(부모) 위치로 즉시(behavior:auto) 이동해 레이아웃을 자리잡게 한 뒤,
      // 2중 requestAnimationFrame으로 브라우저가 펼쳐진 답변 패널의 레이아웃을
      // 완전히 반영할 때까지 한 프레임 더 기다렸다가 부드럽게 답변으로 하이라이트 스크롤한다.
      // (한 번의 rAF만 쓰면 display:none→block 전환 직후라 위치 계산이 어긋날 수 있어 이렇게 처리)
      inquiryEl.scrollIntoView({ behavior: 'auto', block: 'start' });
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          highlightScrollTarget(answerEl);
          // 딥링크 처리가 끝났으므로 저장해뒀던 스크롤 타깃 정보를 지워
          // 다음에 이 페이지를 새로고침해도 같은 스크롤이 반복되지 않게 한다.
          if (typeof clearNotificationScrollTarget === 'function') {
            clearNotificationScrollTarget();
          }
        });
      });
      return;
    }
    // 답변 엘리먼트를 아직 못 찾았다면(목록이 늦게 그려짐) 재시도.
    if (retries > 0) {
      setTimeout(() => scrollToInquiryTarget(inquiryId, answerId, retries - 1), 150);
      return;
    }
  }

  // answerId가 없거나 끝내 못 찾은 경우의 대체(fallback) 동작:
  // 문의에 달린 답변이 있으면 가장 최근(마지막) 답변으로, 없으면 문의 자체로 스크롤한다.
  const answers = inquiryEl.querySelectorAll('.answer');
  const fallbackAnswer = answers.length ? answers[answers.length - 1] : null;
  if (fallbackAnswer) {
    highlightScrollTarget(fallbackAnswer);
  } else {
    highlightScrollTarget(inquiryEl);
  }

  if (typeof clearNotificationScrollTarget === 'function') {
    clearNotificationScrollTarget();
  }
}

// resolveInquiryScrollTarget()으로 딥링크 대상을 구해 실제 스크롤을 트리거하는 진입점.
// window 'load' 리스너와, 페이지 진입 후 늦게 알림을 처리해야 할 때 재사용된다.
function runNotificationInquiryScroll() {
  const target = resolveInquiryScrollTarget();
  if (target.inquiryId) {
    scrollToInquiryTarget(target.inquiryId, target.answerId);
  }
}

// 로그인 여부 판단: localStorage에 관리자 플래그(isAdmin) 또는 일반 유저 정보(user)
// 둘 중 하나라도 있으면 로그인 상태로 취급한다. (인증 여부 자체를 서버에 재검증하진 않음 —
// 화면 표시용 판단이며, 실제 쓰기 요청은 서버 측 인증 미들웨어가 별도로 검증한다.)
function isLoggedIn() {
  // 기존 admin 체크 + 새로 만든 user 체크 병행
  return localStorage.getItem("isAdmin") === "true" ||
         !!localStorage.getItem("user");
}

// 줄바꿈 문자(\n)를 <br> 태그로 바꿔 innerHTML에 그대로 꽂아 넣을 수 있게 하는 헬퍼.
// 문의/답변 내용은 contenteditable div에서 innerText로 뽑아 저장하므로 줄바꿈이 \n으로만
// 남는데, 렌더링할 때는 HTML이므로 이 변환이 없으면 줄바꿈이 화면에 반영되지 않는다.
function nl2br(text) {
  if (!text) return '';
  return text.replace(/\n/g, '<br>');
}

// 현재 브라우저가 "관리자로 로그인"한 상태인지만 좁게 확인한다.
// 관리자 배지 표시, 답변 작성 권한(canAnswer), 삭제 권한 등 UI 분기에 두루 쓰인다.
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

// MongoDB 문서는 _id를 쓰지만, 서버 응답 가공 방식에 따라 id로 내려오는 경우도 있어
// 두 필드를 모두 허용해 안전하게 답변 식별자를 뽑아낸다.
function getAnswerId(answer) {
  return answer._id || answer.id;
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
  window.location.href = getBasePath() + 'user_login/login.html';
};

// ==================== 상단 폼 ====================
// 로그인 상태에 따라 #inquiry-form-container 내부를 통째로 다시 그린다.
//   - 로그인 상태: 제목/본문 입력창 + 등록 버튼이 있는 문의 작성 폼(form-card)
//   - 비로그인 상태: "로그인이 필요합니다" 안내 + 로그인 페이지로 이동하는 버튼
// DOMContentLoaded 시점에 한 번 호출되며, 로그인/로그아웃으로 상태가 바뀌는 경우는
// 이 페이지 자체에서 처리하지 않고(페이지 이동/새로고침 시 다시 반영됨).
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

  // GitHub Pages 정적 미리보기에는 백엔드가 없으므로 문의 등록 자체를 막고 안내만 띄운다.
  const apiBase = getContactApiBase();
  if (apiBase === 'GITHUB_STATIC' || isGitHubPagesPreview?.()) {
    alert("GitHub Pages 정적 배포에서는 문의 등록 기능이 지원되지 않습니다.\n전체 기능을 사용하려면 Render 배포를 이용해주세요.");
    return;
  }

  try {
    // 문의 등록은 별도 인증 헤더 없이 body에 userId(닉네임/관리자명 문자열)만 실어 보낸다.
    // 서버는 이 값을 문의 작성자 이름으로 그대로 저장한다(로그인 세션 검증은 하지 않는 구조).
    const response = await fetch(`${apiBase}/api/inquiries`, {
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
// 서버에서 전체 문의(inquiries) 목록을 받아와 #commentList를 통째로 다시 그린다.
// 등록/수정/삭제/신고/답변 등 무언가 변경될 때마다 이 함수를 다시 호출해서
// "서버 상태를 다시 받아와 그대로 반영"하는 단순한 리렌더 방식을 쓰고 있다
// (부분 DOM 패치 없이 매번 전체를 새로 그림).
async function loadComments() {
  const listEl = document.getElementById("commentList");

  const apiBase = getContactApiBase();
  if (apiBase === 'GITHUB_STATIC' || (typeof isGitHubPagesPreview === 'function' && isGitHubPagesPreview())) {
    listEl.innerHTML = '<p style="color:#666; padding:20px; text-align:center;">GitHub Pages 정적 배포에서는 문의사항을 불러올 수 없습니다.<br>전체 기능을 사용하려면 Render 배포 주소를 이용해주세요.</p>';
    return;
  }

  try {
    const response = await fetch(`${apiBase}/api/inquiries`);
    const inquiries = await response.json();

    if (!Array.isArray(inquiries)) {
      listEl.innerHTML = '<p>문의사항을 불러오는데 실패했습니다.</p>';
      return;
    }

    listEl.innerHTML = inquiries.map(c => {
      // 문의마다 현재 로그인한 사용자 기준으로 버튼 노출 권한을 다시 계산한다.
      //   - canAnswer: 관리자만 답변 작성 가능
      //   - canEdit/canDelete: 본인이 작성한 문의만 수정/삭제 가능 (userId 문자열 비교)
      const currentUser = getCurrentUserName();
      const isMyComment = c.userId === currentUser;
      const canAnswer = isAdminUser();
      const canDelete = isMyComment;
      const canEdit = isMyComment;

      // 답변이 하나 이상 있을 때만 "답변 보기" 토글 헤더 + 답변 목록 블록을 만든다.
      // 답변 목록은 기본적으로 style="display:none"으로 접혀 있고, toggleAnswers()로 펼친다.
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

      // 문의 카드 하나(.comment)의 최종 HTML. data-id에 MongoDB _id를 심어두면
      // scrollToInquiryTarget() 등에서 `.comment[data-id="..."]`로 다시 찾을 수 있다.
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
            ${isLoggedIn() ? (
              c.reported
                ? `<button class="report-btn" disabled style="background:#ccc; color:#666; cursor:not-allowed;">신고됨</button>`
                : `<button onclick="reportComment('${c._id}')" class="report-btn">신고</button>`
            ) : ""}
            ${canEdit ? `<button onclick="editComment('${c._id}')">수정</button>` : ""}
            ${canDelete ? `<button onclick="deleteComment('${c._id}')">삭제</button>` : ""}
          </div>
        </div>
      `;
    }).join('');

    // 목록을 새로 그린 직후, 알림 딥링크로 지정된 문의/답변이 있으면 그쪽으로 스크롤한다.
    // (URL에 ?inquiry=...가 있는 상태로 새로고침/재조회될 때도 항상 다시 시도되도록
    //  loadComments()가 끝날 때마다 호출)
    runNotificationInquiryScroll();
  } catch (err) {
    console.error(err);
    listEl.innerHTML = '<p>서버와 연결할 수 없습니다.</p>';
  }
}

// ========================================================
// replyComment (contenteditable 버전)
// ========================================================
// 문의(댓글) 카드 안에 "답변 작성용 입력 상자(action-box)"를 동적으로 만들어 붙인다.
// 이미 열려 있으면(다시 클릭) 토글처럼 닫고, 다른 문의/답변에 열려있던 입력 상자는
// closeAllActionBoxes()로 먼저 정리해 화면에 입력창이 여러 개 동시에 떠 있지 않게 한다.
// textarea 대신 contenteditable div(.comment-input-box)를 쓰는 이유는 자동 줄바꿈/placeholder를
// CSS(:empty:before)만으로 처리하기 위함(상세 스타일은 contact_us.css 참고).
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

// 답변 작성 상자를 취소(닫기)만 하는 헬퍼. 입력된 내용은 저장하지 않고 그냥 버린다.
window.cancelReply = function(commentId) {
  const commentEl = document.querySelector(`.comment[data-id="${commentId}"]`);
  if (!commentEl) return;
  const box = commentEl.querySelector('.reply-box');
  if (box) box.remove();
};

// ==================== 답변 등록 ====================
// replyComment()가 만들어둔 입력 상자의 내용을 읽어 POST /api/inquiries/:id/answers로 전송한다.
// getAuthHeaders()(common.js)로 로그인 토큰(Authorization)을 실어 보내므로, 서버는 이 토큰으로
// 실제 작성자를 검증할 수 있다(관리자 여부 isAdmin도 함께 보내 답변에 관리자 배지를 붙인다).
window.submitReply = async function(commentId) {
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

  try {
    const response = await fetch(`${getContactApiBase()}/api/inquiries/${commentId}/answers`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        message: replyText,
        userId: getCurrentUserName(),
        isAdmin: isAdminUser()
      })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      alert("✅ 답변이 등록되었습니다.");

      // reply-box 닫기
      const commentEl = document.querySelector(`.comment[data-id="${commentId}"]`);
      if (commentEl) {
        const box = commentEl.querySelector('.reply-box');
        if (box) box.remove();
      }

      loadComments(); // 목록 새로고침
    } else {
      alert("❌ 답변 등록 실패: " + (data.error || "알 수 없는 오류"));
    }
  } catch (err) {
    console.error(err);
    alert("❌ 서버와 연결할 수 없습니다. (백엔드에 POST /answers 라우트가 있는지 확인 필요)");
  }
};

// ========================================================
// renderAnswer
// ========================================================
// 문의 하나에 달린 답변 한 건을 .answer 카드 HTML로 렌더링한다. loadComments()가
// c.answers 배열을 map()으로 순회하며 이 함수를 호출해 answersHTML을 조립한다.
// 답변에 quotedMessage/quotedUser가 있으면(= "답변에 대한 답변"으로 등록된 경우)
// 원본 답변을 인용 블록(answer-quote)으로 위에 붙여 대화 맥락을 보여준다.
function renderAnswer(answer, parentCommentId) {
  const answerId = getAnswerId(answer);
  const isMyAnswer = answer.userId === getCurrentUserName();
  const canDelete = isMyAnswer || isAdminUser();

  const quoteHTML = answer.quotedMessage ? `
    <div class="answer-quote">
      <strong>${answer.quotedUser} &gt;&gt;</strong><br>
      ${nl2br(answer.quotedMessage)}
    </div>
  ` : '';

  // 로그인 상태 + 이미 신고했는지 여부에 따라 신고 버튼 상태를 3단계로 분기:
  //   비로그인 → 버튼 자체 없음 / 신고됨 → 비활성 버튼 / 그 외 → 클릭 가능한 신고 버튼
  let reportHTML = '';
  if (isLoggedIn()) {
    if (answer.reported) {
      reportHTML = `<button class="report-btn" disabled style="background:#ccc; color:#666; cursor:not-allowed;">신고됨</button>`;
    } else {
      reportHTML = `<button onclick="reportAnswer('${answerId}', '${parentCommentId}')" class="report-btn">신고</button>`;
    }
  }

  return `
    <div class="answer" data-id="${answerId}" data-parent="${parentCommentId}">
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
        ${isLoggedIn() ? `<button onclick="replyToAnswer('${answerId}', '${parentCommentId}')">답변</button>` : ""}
        ${reportHTML}
        ${isMyAnswer ? `<button onclick="editAnswer('${answerId}', '${parentCommentId}')">수정</button>` : ''}
        ${canDelete ? `<button onclick="deleteAnswer('${answerId}', '${parentCommentId}')">삭제</button>` : ''}
      </div>
    </div>
  `;
}

// ========================================================
// 신고 기능 (생략 - 기존과 동일) (백엔드 연동)
// ========================================================
// 문의(댓글) 신고 흐름: reportComment(모달 열기) → selectReason(사유 선택) →
//   submitReport(서버로 전송) → closeReportModal(모달 닫기) 4단계로 나뉜다.
// 모달을 별도 <div id="report-modal">로 body 끝에 붙였다 떼는 방식이라 페이지의
// 다른 레이아웃에 영향을 주지 않고, 신고 대상(commentId)은 각 버튼의 onclick 인자로 넘겨
// 별도 상태 저장 없이 함수 호출 체인만으로 어떤 문의를 신고하는지 추적한다.
window.reportComment = function(commentId) {
  const reasons = ["도배 및 테러행위", "비방 및 모욕행위", "광고형 댓글", "기타"];

  const modalHTML = `
    <div id="report-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:9999; display:flex; align-items:center; justify-content:center;">
      <div style="background:white; width:420px; border-radius:12px; padding:30px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
        <h3 style="margin-bottom:20px; font-weight:700;">신고 사유 선택</h3>
        
        ${reasons.map(r => `
          <button onclick="selectReason('${r}', '${commentId}')" 
                  style="width:100%; margin:6px 0; padding:14px; border:2px solid #111; background:white; border-radius:8px; font-size:15px; cursor:pointer;">
            ${r}
          </button>
        `).join('')}
        
        <button onclick="closeReportModal()" 
                style="margin-top:20px; width:100%; padding:14px; background:#dc3545; color:white; border:none; border-radius:8px; font-size:15px;">
          취소
        </button>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);
};

// 사용자가 신고 사유 버튼 중 하나를 클릭했을 때 실행된다.
// "기타"를 고르면 브라우저 기본 prompt()로 상세 사유를 추가로 입력받고(취소 시 신고 중단),
// 그 외 사유는 바로 submitReport로 넘긴다. 어떤 경로든 마지막에 모달을 닫는다.
window.selectReason = function(reason, commentId) {
  if (reason === "기타") {
    const detail = prompt("기타 사유를 입력해주세요:");
    if (!detail) {
      closeReportModal();
      return;
    }
    submitReport(commentId, reason, detail);
  } else {
    submitReport(commentId, reason, "");
  }
  closeReportModal();
};

// 실제로 신고를 서버에 전송하는 함수. 성공하면 목록을 새로고침해 "신고됨" 비활성 버튼이
// 즉시 반영되도록 한다(서버가 해당 문의의 reported 플래그를 true로 바꿔주는 구조).
async function submitReport(commentId, reason, detail) {
  try {
    const response = await fetch(`${getContactApiBase()}/api/inquiries/${commentId}/report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reason: reason,
        detail: detail
      })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      alert("✅ 신고가 접수되었습니다.");
      loadComments();
    } else {
      alert("❌ 신고 실패: " + (data.error || "알 수 없는 오류"));
    }
  } catch (err) {
    console.error(err);
    alert("❌ 서버와 연결할 수 없습니다.");
  }
}

// 신고 사유 선택 모달을 DOM에서 제거한다(선택 완료/취소 양쪽 경로에서 모두 호출됨).
function closeReportModal() {
  const modal = document.getElementById('report-modal');
  if (modal) modal.remove();
}

// ========================================================
// editComment (contenteditable 버전)
// ========================================================
// 문의 카드에 "수정 모드" 입력 상자(edit-box)를 만든다. replyComment()와 구조는 같지만,
// 기존 제목(.title)/본문(.msg)의 현재 텍스트를 읽어와 입력창에 미리 채워 넣는 점이 다르다
// (제목은 "제목 : " 접두사가 CSS ::before로 붙는 시각적 요소일 뿐 textContent에는 없으므로
//  그대로 title 값을 써도 된다).
window.editComment = function(commentId) {
  const commentEl = document.querySelector(`.comment[data-id="${commentId}"]`);
  if (!commentEl) return;

  let editBox = commentEl.querySelector('.edit-box');
  if (editBox) {
    editBox.remove();
    return;
  }

  closeAllActionBoxes();

  const title = commentEl.querySelector('.title')?.textContent?.trim() || '';
  const message = commentEl.querySelector('.msg')?.innerText?.trim() || '';

  const box = document.createElement('div');
  box.className = 'action-box edit-box';

  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.id = `edit-title-${commentId}`;
  titleInput.value = title;
  titleInput.placeholder = '제목을 입력하세요';
  titleInput.style.cssText = 'width:100%; padding:12px; border:3px solid #111; border-radius:8px; margin-bottom:12px; box-sizing:border-box;';

  const messageInput = document.createElement('div');
  messageInput.id = `edit-message-${commentId}`;
  messageInput.className = 'comment-input-box';
  messageInput.contentEditable = 'true';
  messageInput.dataset.placeholder = '내용을 입력하세요';
  messageInput.textContent = message;

  box.appendChild(titleInput);
  box.appendChild(messageInput);

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

// 수정 상자를 취소(닫기)만 하고 변경 내용은 저장하지 않는다.
window.cancelEdit = function(commentId) {
  const commentEl = document.querySelector(`.comment[data-id="${commentId}"]`);
  if (!commentEl) return;
  const box = commentEl.querySelector('.edit-box');
  if (box) box.remove();
};

// ==================== 댓글 수정 완료 (백엔드 연동) ====================
// editComment()가 만든 입력창의 최종 값을 읽어 PUT /api/inquiries/:id로 전송한다.
// 아래 console.log들은 "입력창을 못 찾음/fetch 실패" 등 문제 진단을 위해 남겨둔
// 디버그 로그로, 실제 동작(로직)에는 영향이 없다.
window.submitEdit = async function(commentId) {
  console.log("✅ submitEdit 호출됨 - commentId:", commentId);

  const titleInput = document.getElementById(`edit-title-${commentId}`);
  const messageInput = document.getElementById(`edit-message-${commentId}`);

  console.log("titleInput 존재 여부:", !!titleInput);
  console.log("messageInput 존재 여부:", !!messageInput);

  if (!titleInput || !messageInput) {
    alert("입력창을 찾을 수 없습니다. (ID 문제)");
    return;
  }

  const newTitle = titleInput.value.trim();
  const newMessage = messageInput.innerText.trim();

  console.log("newTitle:", newTitle);
  console.log("newMessage:", newMessage);

  if (!newMessage) {
    alert("내용을 입력해주세요.");
    return;
  }

  try {
    console.log("fetch 시작...");
    const response = await fetch(`${getContactApiBase()}/api/inquiries/${commentId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        title: newTitle || "제목 없음",
        message: newMessage
      })
    });

    console.log("fetch 응답 상태:", response.status);

    const data = await response.json();
    console.log("서버 응답 데이터:", data);

    if (response.ok && data.success) {
      alert("✅ 수정이 완료되었습니다.");
      loadComments();
    } else {
      alert("❌ 수정 실패: " + (data.error || "알 수 없는 오류"));
    }
  } catch (err) {
    console.error("catch 에러:", err);
    alert("❌ 서버 통신 중 에러 발생 (콘솔 확인)");
  }
};

// ========================================================
// deleteComment (기존 유지)
// 댓글 삭제 (백엔드 연동)
// ========================================================
// 브라우저 기본 confirm()으로 한 번 더 확인받은 뒤 DELETE 요청을 보낸다.
// 서버 쪽에서 실제 작성자/관리자 여부를 다시 검증하므로, 이 확인창은 실수 클릭 방지용이고
// 최종 권한 판단은 어디까지나 백엔드가 담당한다.
window.deleteComment = async function(commentId) {
  if (!confirm("정말 이 댓글을 삭제하시겠습니까?")) return;

  try {
    const response = await fetch(`${getContactApiBase()}/api/inquiries/${commentId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    const data = await response.json();

    if (response.ok && data.success) {
      alert("✅ 댓글이 삭제되었습니다.");
      loadComments(); // 목록 새로고침
    } else {
      alert("❌ 삭제 실패: " + (data.error || "알 수 없는 오류"));
    }
  } catch (err) {
    console.error(err);
    alert("❌ 서버와 연결할 수 없습니다.");
  }
};

// ========================================================
// closeAllActionBoxes
// ========================================================
// 화면 어디에 열려 있든(답변 작성/수정 상자 등) 모든 action-box를 한 번에 제거한다.
// 새 입력 상자를 열기 전에 항상 먼저 호출해서, 여러 개의 답변/수정 입력창이
// 동시에 열려 화면이 지저분해지거나 사용자가 헷갈리는 상황을 막는다.
function closeAllActionBoxes() {
  document.querySelectorAll('.action-box').forEach(box => box.remove());
}

// ========================================================
// replyToAnswer (contenteditable 버전)
// ========================================================
// "답변에 대한 답변(대댓글)" 입력 상자를 만든다. replyComment()와 거의 같은 구조지만,
// 원본 답변 텍스트(originalText)를 answer-quote 블록으로 위에 미리 붙여 보여줘서
// 무엇에 대한 답변인지 맥락을 유지한다. 실제 quotedUser/quotedMessage는
// submitReplyToAnswer()에서 다시 읽어 서버로 함께 전송한다.
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

// 대댓글(답변에 대한 답변)을 서버로 전송한다. 일반 답변(submitReply)과 API 엔드포인트는
// 같지만, 원본 답변의 작성자(quotedUser)와 내용(quotedMessage)을 함께 실어 보내는 점이
// 다르다 — 서버가 이 두 값을 저장해두면 renderAnswer()가 인용 블록으로 다시 보여줄 수 있다.
window.submitReplyToAnswer = async function(answerId, parentCommentId) {
  const input = document.getElementById(`sub-reply-input-${answerId}`);
  if (!input) { alert("입력창을 찾을 수 없습니다."); return; }

  const replyText = input.innerText.trim();
  if (!replyText) { alert("내용을 입력해주세요."); return; }

  const answerEl = document.querySelector(`.answer[data-id="${answerId}"]`);
  const quotedUser = answerEl?.querySelector('.user-name')?.textContent?.trim() || '';
  const quotedMessage = answerEl?.querySelector('.answer-text')?.innerText?.trim() || '';

  try {
    const response = await fetch(`${getContactApiBase()}/api/inquiries/${parentCommentId}/answers`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        message: replyText,
        userId: getCurrentUserName(),
        isAdmin: isAdminUser(),
        quotedUser,
        quotedMessage
      })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      alert("✅ 답변이 등록되었습니다.");
      loadComments();
    } else {
      alert("❌ 답변 등록 실패: " + (data.error || "알 수 없는 오류"));
    }
  } catch (err) {
    console.error(err);
    alert("❌ 서버와 연결할 수 없습니다.");
  }
};

// ========================================================
// reportAnswer (기존 유지)
// ========================================================
// reportComment 계열과 동일한 4단계 모달 흐름(reportAnswer → selectReasonForAnswer →
// submitReportForAnswer → closeReportModal)을 답변(answer) 대상으로 그대로 반복한 것.
// parentCommentId까지 함께 넘기는 이유는, 답변은 문의 하위 리소스라 서버 API가
// /api/inquiries/:commentId/answers/:answerId/report 처럼 부모 id를 경로에 요구하기 때문이다.
window.reportAnswer = function(answerId, parentCommentId) {
  const reasons = ["도배 및 테러행위", "비방 및 모욕행위", "광고형 댓글", "기타"];

  const modalHTML = `
    <div id="report-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:9999; display:flex; align-items:center; justify-content:center;">
      <div style="background:white; width:420px; border-radius:12px; padding:30px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
        <h3 style="margin-bottom:20px; font-weight:700;">신고 사유 선택</h3>
        ${reasons.map(r => `
          <button onclick="selectReasonForAnswer('${r}', '${answerId}', '${parentCommentId}')"
                  style="width:100%; margin:6px 0; padding:14px; border:2px solid #111; background:white; border-radius:8px; font-size:15px; cursor:pointer;">
            ${r}
          </button>
        `).join('')}
        <button onclick="closeReportModal()"
                style="margin-top:20px; width:100%; padding:14px; background:#dc3545; color:white; border:none; border-radius:8px; font-size:15px;">
          취소
        </button>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);
};

// selectReason()의 답변 버전: "기타" 선택 시 상세 사유를 prompt로 추가 입력받는다.
window.selectReasonForAnswer = function(reason, answerId, parentCommentId) {
  if (reason === "기타") {
    const detail = prompt("기타 사유를 입력해주세요:");
    if (!detail) {
      closeReportModal();
      return;
    }
    submitReportForAnswer(answerId, parentCommentId, reason, detail);
  } else {
    submitReportForAnswer(answerId, parentCommentId, reason, "");
  }
  closeReportModal();
};

// 답변 신고를 실제로 서버에 전송한다. submitReport()와 동일한 패턴이지만 엔드포인트가
// 답변 하위 경로(/answers/:answerId/report)라는 점만 다르다.
async function submitReportForAnswer(answerId, parentCommentId, reason, detail) {
  try {
    const response = await fetch(`${getContactApiBase()}/api/inquiries/${parentCommentId}/answers/${answerId}/report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reason: reason,
        detail: detail
      })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      alert("✅ 답변이 신고되었습니다.");
      loadComments();
    } else {
      alert("❌ 신고 실패: " + (data.error || "알 수 없는 오류"));
    }
  } catch (err) {
    console.error(err);
    alert("❌ 서버와 연결할 수 없습니다.");
  }
}

// ========================================================
// editAnswer (contenteditable 버전)
// ========================================================
// 답변 카드에 수정 입력 상자를 만든다. editComment()와 같은 패턴이지만 답변에는
// 별도 제목이 없어 본문(answer-text) 하나만 편집한다.
window.editAnswer = function(answerId, parentCommentId) {
  const answerEl = document.querySelector(`.answer[data-id="${answerId}"]`);
  if (!answerEl) return;

  let editBox = answerEl.querySelector('.edit-box');
  if (editBox) {
    editBox.remove();
    return;
  }

  closeAllActionBoxes();

  const message = answerEl.querySelector('.answer-text')?.innerText?.trim() || '';

  const box = document.createElement('div');
  box.className = 'action-box edit-box';

  const messageInput = document.createElement('div');
  messageInput.id = `edit-answer-${answerId}`;
  messageInput.className = 'comment-input-box';
  messageInput.contentEditable = 'true';
  messageInput.dataset.placeholder = '내용을 입력하세요';
  messageInput.textContent = message;

  box.appendChild(messageInput);

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

// 답변 수정 상자를 취소(닫기)만 하고 저장하지 않는다.
window.cancelEditForAnswer = function(answerId) {
  const answerEl = document.querySelector(`.answer[data-id="${answerId}"]`);
  if (answerEl) {
    const box = answerEl.querySelector('.edit-box');
    if (box) box.remove();
  }
};

// 수정된 답변 내용을 PUT /api/inquiries/:parentCommentId/answers/:answerId로 전송한다.
// (답변은 문의에 종속된 하위 리소스라 URL에 부모 문의 id도 함께 넘겨야 한다.)
window.submitEditForAnswer = async function(answerId, parentCommentId) {
  const textarea = document.getElementById(`edit-answer-${answerId}`);
  if (!textarea) return;

  const newMessage = textarea.innerText.trim();
  if (!newMessage) {
    alert("내용을 입력해주세요.");
    return;
  }

  try {
    const response = await fetch(`${getContactApiBase()}/api/inquiries/${parentCommentId}/answers/${answerId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ message: newMessage })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      alert("✅ 답변 수정이 완료되었습니다.");
      loadComments();
    } else {
      alert("❌ 답변 수정 실패: " + (data.error || "알 수 없는 오류"));
    }
  } catch (err) {
    console.error(err);
    alert("❌ 서버와 연결할 수 없습니다.");
  }
};

// ========================================================
// deleteAnswer (기존 유지)
// ========================================================
// 답변 삭제도 confirm()으로 확인 후 DELETE 요청. 작성자 본인 또는 관리자만 이 버튼이
// 노출되지만(renderAnswer의 canDelete), 최종 권한 검증은 서버에서 다시 이뤄진다.
window.deleteAnswer = async function(answerId, parentCommentId) {
  if (!confirm("정말 이 답변을 삭제하시겠습니까?")) return;

  try {
    const response = await fetch(`${getContactApiBase()}/api/inquiries/${parentCommentId}/answers/${answerId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    const data = await response.json();

    if (response.ok && data.success) {
      alert("✅ 답변이 삭제되었습니다.");
      loadComments();
    } else {
      alert("❌ 삭제 실패: " + (data.error || "알 수 없는 오류"));
    }
  } catch (err) {
    console.error(err);
    alert("❌ 서버와 연결할 수 없습니다.");
  }
};

// ========================================================
// toggleAnswers
// ========================================================
// "답변 보기" 헤더를 클릭했을 때 답변 목록(answers-container)을 접었다 펼쳤다 하는 토글.
// display 인라인 스타일을 직접 읽고 뒤집는 방식이라 별도 상태 변수 없이 DOM 자체가
// "펼침/접힘" 상태를 갖고 있으며, 화살표(▲/▼) 문자도 함께 바꿔 방향을 표시한다.
// openAnswersPanel()이 "펼치기"만 담당하는 것과 달리 이 함수는 펼침/접힘 양방향을 처리한다.
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