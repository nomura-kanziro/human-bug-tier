// ========================================================
// comment-detail.js - 문의(댓글) 상세 관리 화면 로직
// ========================================================
// comments/comment-management.html 목록에서 "📋 상세" 버튼을 누르면 이 페이지
// (comment-detail.html?id=...)로 이동해 온다. 이 스크립트는 URL의 id로 문의 1건을
// /api/inquiries/:id에서 가져와, 그 문의(질문)와 거기 달린 답변들을 렌더링하고,
// 답변 검색/필터, 답변·문의 삭제, 신고 사유 툴팁 등 상세 화면의 모든 동작을 담당한다.
// 목록 화면(comment-management.js)에도 거의 동일한 헬퍼(escapeHtml, showReportTooltip 등)가
// 있는데, 두 화면이 서로 다른 페이지에서 독립적으로 로드되므로 각자 파일에 중복 정의해 둔 것.
// ========================================================

// 사용자가 입력한 줄바꿈(\n)을 HTML의 <br>로 바꿔 화면에 그대로 줄바꿈되어 보이게 한다.
// (textarea 값은 줄바꿈이 \n으로만 들어있고, innerHTML에 그대로 넣으면 한 줄로 붙어버리기 때문)
function nl2br(text) {
  if (!text) return '';
  return text.replace(/\n/g, '<br>');
}

// 사용자가 입력한 텍스트(제목/내용/닉네임 등)를 innerHTML로 그대로 꽂아 넣기 전에
// HTML 특수문자를 이스케이프해서 XSS(악성 스크립트 삽입)를 방지한다.
// 이 파일의 모든 렌더링 함수는 서버에서 받아온 값을 반드시 이 함수를 거쳐서 출력한다.
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ---- 화면 상태(필터/현재 문의) ----
// 서버에 다시 요청하지 않고, 이미 받아온 currentComment.answers 배열을 이 상태값 기준으로
// 매번 다시 필터링해서 렌더링하는 방식이다(= 클라이언트 사이드 필터링).
let detailTypeFilter = 'all';      // 'all' | 'reported' - 답변 탐색 버튼(전체/신고된 답변)
let detailReportFilter = '';       // 신고 사유 select 값 (빈 문자열이면 필터 없음)
let currentComment = null;         // 현재 화면에 표시 중인 문의(질문) 전체 객체 (재렌더링 시 재사용)

// 페이지 로드 시 바로 상세 내용을 그려준다.
document.addEventListener('DOMContentLoaded', () => {
  renderCommentDetail();
});

// 현재 URL의 쿼리스트링에서 ?id=... 값을 뽑아낸다.
// (comment-detail.html?id=64f... 형태로 목록 화면에서 링크를 만들어 넘어옴)
function getCommentIdFromURL() {
  const href = window.location.href;
  const match = href.match(/[?&]id=([^&]+)/);
  return match ? match[1] : null;
}

// 문의 1건 상세를 서버에서 가져온다. 실패(404 등) 시 null을 반환해
// 호출부(renderCommentDetail)가 "존재하지 않는 문의" 안내를 보여줄 수 있게 한다.
async function fetchComment(commentId) {
  const response = await fetch(`${getApiBase()}/api/inquiries/${commentId}`);
  if (!response.ok) return null;
  return response.json();
}

// ========================================================
// 상세 화면 전체를 그리는 메인 함수
// ========================================================
// 이 함수는 필터 변경, 답변 삭제 등 "화면을 다시 그려야 하는" 모든 시점에 반복 호출된다.
// 매번 URL의 id로 서버에서 새로 데이터를 가져와(fetchComment) 최신 상태를 반영하는
// 방식이라, 다른 관리자가 동시에 답변을 지워도 새로고침 없이 최신 상태를 보게 된다.
async function renderCommentDetail() {
  const commentId = getCommentIdFromURL();
  const container = document.getElementById('comment-detail');

  // id가 아예 없는 잘못된 접근(주소창에 직접 comment-detail.html만 친 경우 등) 처리
  if (!commentId) {
    container.innerHTML = `
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

  // 네트워크 자체가 실패한 경우(백엔드 다운 등) - fetch()가 예외를 던짐
  try {
    currentComment = await fetchComment(commentId);
  } catch (err) {
    console.error(err);
    container.innerHTML = `<div style="text-align:center; padding:80px; color:#dc3545;">❌ 서버와 연결할 수 없습니다.</div>`;
    return;
  }

  // 요청은 성공했지만 해당 id의 문의가 없는 경우(이미 삭제됐거나 잘못된 id)
  if (!currentComment) {
    container.innerHTML = `
      <div style="text-align:center; padding:80px; font-size:18px; color:#dc3545;">
        ❌ 해당 댓글이 존재하지 않습니다.
      </div>`;
    return;
  }

  const comment = currentComment;
  let answersHTML = '';
  const answerCount = comment.answers ? comment.answers.length : 0;

  if (answerCount > 0) {
    // ---- 답변 목록 필터링 (서버 재요청 없이 클라이언트에서 3단계로 좁혀나감) ----
    let filteredAnswers = comment.answers;

    // 1) "신고된 답변" 탭이 선택된 경우 신고된 것만 남김
    if (detailTypeFilter === 'reported') {
      filteredAnswers = filteredAnswers.filter(a => a.reported === true);
    }

    // 2) 신고 사유 select에서 특정 사유를 골랐다면 그 사유로 신고된 답변만 추가로 좁힘
    if (detailReportFilter) {
      filteredAnswers = filteredAnswers.filter(a =>
        a.reported && a.reportReason === detailReportFilter
      );
    }

    // 3) 검색어가 있으면 답변 본문(message)에 포함되는지로 추가 필터링 (대소문자 무시)
    const searchTerm = (document.getElementById('detail-search-input')?.value || '').toLowerCase().trim();
    if (searchTerm) {
      filteredAnswers = filteredAnswers.filter(a =>
        (a.message || '').toLowerCase().includes(searchTerm)
      );
    }

    // 필터링된 답변들을 답변 카드(HTML) 문자열 배열로 변환
    const answersList = filteredAnswers.map(answer => {
      const answerId = answer._id || answer.id;
      // 이 답변이 다른 답변/원글을 인용(답장)한 경우, 인용문 박스를 함께 표시
      const quoteHTML = answer.quotedMessage ? `
        <div class="quote">
          <strong>${escapeHtml(answer.quotedUser)} &gt;&gt;</strong><br>
          ${nl2br(escapeHtml(answer.quotedMessage))}
        </div>` : '';

      // 신고 사유 + 상세 사유(선택 입력분)를 한 줄로 합쳐 툴팁에 보여줄 텍스트 구성
      const reportReason = `${answer.reportReason || ''} ${answer.reportDetail ? `(${answer.reportDetail})` : ''}`.trim();

      return `
        <div class="answer-card" data-id="${answerId}">
          <div class="user-info" style="display:flex; align-items:center; gap:12px; margin-bottom:16px;">
            <div class="user-avatar" style="width:42px;height:42px;background:linear-gradient(135deg,#007bff,#8faadc);border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:22px;">👤</div>
            <div class="user-name" style="font-weight:700;">${escapeHtml(answer.userId || '관리자')}</div>
            ${answer.isAdmin ? '<span class="user-badge admin-user">Admin User</span>' : '<span class="user-badge nr-user">NR User</span>'}
          </div>

          ${quoteHTML}

          <div class="answer-text" style="font-size:15px; line-height:1.7; margin-bottom:20px;">${nl2br(escapeHtml(answer.message))}</div>

          <div class="action-buttons" style="display:flex; gap:8px; align-items:center;">
            ${answer.reported ? `
              <span onclick="showReportTooltip(this, '${escapeHtml(reportReason)}')"
                    style="color:#dc3545; cursor:pointer; font-size:24px; font-weight:bold; vertical-align:middle;">
                ⚠️
              </span>` : ''}

            <button onclick="deleteAnswer('${answerId}', '${commentId}')"
                    style="background:#dc3545;color:white;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;">
              🗑️ 답변 삭제
            </button>
          </div>
        </div>`;
    }).join('');

    // 답변 개수를 보여주는 접이식(토글) 헤더 + 실제 답변 카드들을 담는 컨테이너.
    // 컨테이너는 기본 display:none으로 접혀있고, toggleDetailAnswers()가 펼침/접힘을 전환한다.
    answersHTML = `
      <div class="answer-toggle-header" onclick="toggleDetailAnswers('${commentId}')"
           style="background:#f8f8f8; border:3px solid #111; border-radius:8px; padding:14px 20px; margin:25px 0 15px 0; cursor:pointer; display:flex; justify-content:space-between; align-items:center; font-weight:700;">
        <span>📬 답변 보기 (${filteredAnswers.length}개)</span>
        <span class="toggle-arrow" id="detail-arrow-${commentId}" style="font-size:18px;">▼</span>
      </div>
      <div class="answers-container" id="detail-answers-${commentId}" style="display:none; margin-left:30px;">
        ${answersList}
      </div>`;
  } else {
    // 답변이 아예 없는 문의는 필터 UI 없이 안내 문구만 표시
    answersHTML = '<p style="text-align:center; color:#888; padding:40px 0;">아직 답변이 없습니다.</p>';
  }

  // 최종적으로 화면에 그릴 전체 HTML: 상단 필터 바 + 문의 원글 카드(+답변 목록) + 하단 액션 버튼
  const html = `
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
      <div style="margin-bottom:30px;">
        <div class="user-info" style="display:flex; align-items:center; gap:14px; margin-bottom:20px;">
          <div class="user-avatar" style="width:48px;height:48px;background:linear-gradient(135deg,#007bff,#8faadc);border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:26px;">👤</div>
          <div>
            <div class="user-name" style="font-size:19px;font-weight:700;">${escapeHtml(comment.userId)}</div>
            ${comment.isAdmin ? '<span class="user-badge admin-user">Admin User</span>' : '<span class="user-badge nr-user">NR User</span>'}
          </div>
        </div>
        <div style="font-size:22px; font-weight:800; margin-bottom:12px;">제목 : ${escapeHtml(comment.title)}</div>
        <div style="font-size:16px; line-height:1.7; margin-bottom:20px;">${nl2br(escapeHtml(comment.message))}</div>
        <div style="color:#666; font-size:14px;">작성일 : ${escapeHtml(comment.date)}</div>
        <div style="color:#666; font-size:14px;">IP : ${escapeHtml(comment.ip || 'unknown')}</div>
      </div>

      ${answersHTML}
    </div>

    <div style="text-align:center; margin-top:40px;">
      <button onclick="deleteWholeComment('${commentId}')" style="background:#dc3545;color:white;border:none;padding:16px 40px;font-size:17px;font-weight:700;border-radius:8px;cursor:pointer;margin-right:15px;">
        🗑️ 이 댓글 전체 삭제
      </button>
      <button onclick="window.location.href='comment-management'" style="background:#111;color:white;border:none;padding:16px 40px;font-size:17px;font-weight:700;border-radius:8px;cursor:pointer;">
        ← 목록으로 돌아가기
      </button>
    </div>`;

  container.innerHTML = html;

  // innerHTML을 막 갈아끼운 직후라 DOM이 아직 브라우저에 완전히 반영되지 않았을 수 있어
  // setTimeout(0에 가까운 30ms)으로 한 틱 미뤄서, 방금 그려진 select/버튼 요소에
  // 현재 필터 상태(select 값, active 버튼)를 다시 반영해준다.
  setTimeout(() => {
    const select = document.getElementById('detail-report-filter');
    if (select) select.value = detailReportFilter || '';

    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`detail-filter-${detailTypeFilter}`);
    if (activeBtn) activeBtn.classList.add('active');
  }, 30);
}

// 답변 1개만 삭제 (관리자 권한 필요 → getAdminAuthHeaders()로 관리자 토큰 첨부).
// 성공하면 전체 화면을 다시 그려서(renderCommentDetail) 삭제된 답변이 목록에서 사라진 걸 반영한다.
// window. 으로 등록하는 이유: HTML의 onclick="deleteAnswer(...)" 인라인 핸들러에서
// 전역 스코프 함수로 바로 호출할 수 있어야 하기 때문(모듈 스코프가 아닌 인라인 attribute 호출).
window.deleteAnswer = async function(answerId, commentId) {
  if (!confirm('정말 이 답변을 삭제하시겠습니까?')) return;

  try {
    const response = await fetch(`${getApiBase()}/api/inquiries/${commentId}/answers/${answerId}`, {
      method: 'DELETE',
      headers: getAdminAuthHeaders()
    });
    const data = await response.json();

    if (response.ok && data.success) {
      alert('✅ 답변이 삭제되었습니다.');
      await renderCommentDetail();
    } else {
      alert('❌ 삭제 실패: ' + (data.error || '알 수 없는 오류'));
    }
  } catch (err) {
    console.error(err);
    alert('❌ 서버와 연결할 수 없습니다.');
  }
};

// 문의(원글) + 그에 달린 모든 답변을 통째로 삭제. 답변 1개 삭제와 달리
// 삭제 후에는 더 이상 볼 상세 내용이 없으므로 목록 화면으로 이동시킨다.
window.deleteWholeComment = async function(commentId) {
  if (!confirm('⚠️ 이 댓글과 모든 답변을 완전히 삭제하시겠습니까?')) return;

  try {
    const response = await fetch(`${getApiBase()}/api/inquiries/${commentId}`, {
      method: 'DELETE',
      headers: getAdminAuthHeaders()
    });
    const data = await response.json();

    if (response.ok && data.success) {
      alert('✅ 댓글이 전체 삭제되었습니다.');
      window.location.href = 'comment-management';
    } else {
      alert('❌ 삭제 실패: ' + (data.error || '알 수 없는 오류'));
    }
  } catch (err) {
    console.error(err);
    alert('❌ 서버와 연결할 수 없습니다.');
  }
};

// 신고 사유(⚠️ 아이콘) 클릭 시 그 요소 바로 아래에 말풍선 형태의 신고 사유 팝업을 띄운다.
// 같은 종류의 팝업은 화면에 하나만 존재하도록, 이미 열려있으면(existing) 새로 만들지 않고
// 그냥 닫아버린다(토글 동작) — 같은 아이콘을 두 번 누르면 닫히는 흔한 UX 패턴.
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

  // 클릭한 아이콘의 화면상 위치(getBoundingClientRect)를 기준으로 팝업을 바로 아래에 배치.
  // scrollX/scrollY를 더하는 이유: getBoundingClientRect는 "현재 보이는 뷰포트" 기준 좌표라
  // 페이지가 스크롤되어 있으면 문서 전체 기준 절대좌표로 변환해줘야 위치가 어긋나지 않는다.
  const rect = element.getBoundingClientRect();
  popup.style.left = `${rect.left + window.scrollX + 30}px`;
  popup.style.top = `${rect.bottom + window.scrollY + 10}px`;

  // 팝업 바깥을 클릭하면 자동으로 닫히도록 document에 임시 클릭 리스너를 건다.
  const hidePopup = (e) => {
    if (!popup.contains(e.target)) {
      popup.remove();
      document.removeEventListener('click', hidePopup);
    }
  };
  // setTimeout(10ms)으로 리스너 등록을 살짝 지연시키는 이유: 이 팝업을 연 클릭 이벤트
  // 자체가 아직 document까지 버블링되는 도중인데, 리스너를 즉시 등록하면 "지금 막 연" 그
  // 클릭이 곧바로 hidePopup에 잡혀서 팝업이 열리자마자 닫혀버리는 문제가 생기기 때문.
  setTimeout(() => document.addEventListener('click', hidePopup), 10);
  // 더블클릭으로도 즉시 닫을 수 있는 보조 수단 제공
  popup.addEventListener('dblclick', () => popup.remove());
};

// "📬 답변 보기" 헤더 클릭 시 답변 목록 컨테이너를 펼치거나(block) 접는다(none).
// 화살표 아이콘(▲/▼)도 같이 뒤집어서 현재 펼침 상태를 시각적으로 표시.
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

// "전체 답변" / "신고된 답변" 탭 버튼 클릭 처리: 전역 필터 상태(detailTypeFilter)를 바꾸고
// 눌린 버튼에 active 클래스를 입힌 뒤, applyDetailFilters()를 통해 화면을 다시 그린다.
window.setDetailTypeFilter = function(type) {
  detailTypeFilter = type;
  document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById(`detail-filter-${type}`);
  if (activeBtn) activeBtn.classList.add('active');
  applyDetailFilters();
};

// 신고 사유 select 값(현재 선택)을 detailReportFilter 상태에 반영한 뒤 전체 재렌더링.
// 검색어(detail-search-input)는 별도 상태 없이 renderCommentDetail 안에서 그때그때
// DOM에서 직접 읽어오므로(상단 필터링 로직 참고) 여기서 따로 저장하지 않는다.
window.applyDetailFilters = function() {
  detailReportFilter = document.getElementById('detail-report-filter')?.value || '';
  renderCommentDetail();
};