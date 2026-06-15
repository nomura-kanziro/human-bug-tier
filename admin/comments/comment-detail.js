const API_BASE = 'http://localhost:5000';

function nl2br(text) {
  if (!text) return '';
  return text.replace(/\n/g, '<br>');
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

let detailTypeFilter = 'all';
let detailReportFilter = '';
let currentComment = null;

document.addEventListener('DOMContentLoaded', () => {
  renderCommentDetail();
});

function getCommentIdFromURL() {
  const href = window.location.href;
  const match = href.match(/[?&]id=([^&]+)/);
  return match ? match[1] : null;
}

async function fetchComment(commentId) {
  const response = await fetch(`${API_BASE}/api/inquiries/${commentId}`);
  if (!response.ok) return null;
  return response.json();
}

async function renderCommentDetail() {
  const commentId = getCommentIdFromURL();
  const container = document.getElementById('comment-detail');

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

  try {
    currentComment = await fetchComment(commentId);
  } catch (err) {
    console.error(err);
    container.innerHTML = `<div style="text-align:center; padding:80px; color:#dc3545;">❌ 서버와 연결할 수 없습니다.</div>`;
    return;
  }

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
    let filteredAnswers = comment.answers;

    if (detailTypeFilter === 'reported') {
      filteredAnswers = filteredAnswers.filter(a => a.reported === true);
    }

    if (detailReportFilter) {
      filteredAnswers = filteredAnswers.filter(a =>
        a.reported && a.reportReason === detailReportFilter
      );
    }

    const searchTerm = (document.getElementById('detail-search-input')?.value || '').toLowerCase().trim();
    if (searchTerm) {
      filteredAnswers = filteredAnswers.filter(a =>
        (a.message || '').toLowerCase().includes(searchTerm)
      );
    }

    const answersList = filteredAnswers.map(answer => {
      const answerId = answer._id || answer.id;
      const quoteHTML = answer.quotedMessage ? `
        <div class="quote">
          <strong>${escapeHtml(answer.quotedUser)} &gt;&gt;</strong><br>
          ${nl2br(escapeHtml(answer.quotedMessage))}
        </div>` : '';

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
    answersHTML = '<p style="text-align:center; color:#888; padding:40px 0;">아직 답변이 없습니다.</p>';
  }

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

  setTimeout(() => {
    const select = document.getElementById('detail-report-filter');
    if (select) select.value = detailReportFilter || '';

    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`detail-filter-${detailTypeFilter}`);
    if (activeBtn) activeBtn.classList.add('active');
  }, 30);
}

window.deleteAnswer = async function(answerId, commentId) {
  if (!confirm('정말 이 답변을 삭제하시겠습니까?')) return;

  try {
    const response = await fetch(`${API_BASE}/api/inquiries/${commentId}/answers/${answerId}`, {
      method: 'DELETE',
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

window.deleteWholeComment = async function(commentId) {
  if (!confirm('⚠️ 이 댓글과 모든 답변을 완전히 삭제하시겠습니까?')) return;

  try {
    const response = await fetch(`${API_BASE}/api/inquiries/${commentId}`, { method: 'DELETE' });
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
  popup.style.left = `${rect.left + window.scrollX + 30}px`;
  popup.style.top = `${rect.bottom + window.scrollY + 10}px`;

  const hidePopup = (e) => {
    if (!popup.contains(e.target)) {
      popup.remove();
      document.removeEventListener('click', hidePopup);
    }
  };
  setTimeout(() => document.addEventListener('click', hidePopup), 10);
  popup.addEventListener('dblclick', () => popup.remove());
};

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

window.setDetailTypeFilter = function(type) {
  detailTypeFilter = type;
  document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById(`detail-filter-${type}`);
  if (activeBtn) activeBtn.classList.add('active');
  applyDetailFilters();
};

window.applyDetailFilters = function() {
  detailReportFilter = document.getElementById('detail-report-filter')?.value || '';
  renderCommentDetail();
};