// ========================================================
// comment-management.js - 관리자 대시보드 메인 로직
// ========================================================
// comments/comment-management.html 한 페이지 안에 4개의 서로 다른 관리 섹션 로직이
// 모두 들어있다: (1) 문의/댓글 목록·검색·삭제, (2) 커스텀 메이커 게시글/댓글 신고 관리,
// (3) 공지(공지사항/새 소식) 작성·수정·고정·유튜브 자동 가져오기, (4) 회원/IP 차단 관리.
// 전부 관리자 전용이라 서버 호출 시 admin_api.js의 getAdminAuthHeaders()로 관리자
// 토큰을 실어 보내며, 화면 진입 자체는 이 파일 하단 comment-management.html의
// checkAdminAuth()가 막아준다. 각 섹션은 자신만의 상태 배열/필터 변수를 따로 가지고,
// initAdminData()에서 한 번에 모든 데이터를 병렬로 불러온 뒤 각자 렌더링한다.
// ========================================================

// ---- 각 섹션이 서버에서 받아와 화면에 그리는 데이터 원본(캐시) ----
// 모두 "서버 응답 그대로"를 담아두고, 검색/필터는 이 배열을 매번 다시 걸러서
// 화면을 다시 그리는 방식(클라이언트 사이드 필터링)이라 필터를 바꿔도 재요청이 없다.
let comments = [];         // 문의(댓글) 목록 전체
let blockedList = [];      // 차단된 ID/IP 목록
let registeredUsers = [];  // 가입한 회원 목록
let adminNotices = [];     // 공지사항/새 소식 목록

// 공지 category 값(notice/news)을 화면에 보여줄 한글 라벨로 변환하는 매핑 테이블
const NOTICE_CATEGORY_LABELS = {
  notice: '전체 공지',
  news: '새 소식',
};

// 상단 고정(핀) 가능한 공지 최대 개수. 서버도 동일한 제한을 두므로 이 값은
// UI에서 "더 이상 고정할 수 없음" 버튼을 미리 비활성화하는 용도로만 쓰인다.
const MAX_PINNED_NOTICES = 5;

// 공지 목록 정렬: 고정된 공지 우선 → 그중에서는 고정한 시각이 최신인 순 →
// 고정되지 않은 공지끼리는 작성일이 최신인 순으로 정렬한다.
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

// ---- 문의(댓글) 목록 섹션의 필터/정렬/페이지 상태 ----
let currentTypeFilter = 'all';    // 'all' | 'user' | 'admin' | 'reported'
let currentReportFilter = '';     // 신고 사유 select 값
let currentSort = 'newest';       // 'newest' | 'oldest'

const ITEMS_PER_PAGE = 25;
let currentPage = 1;

// ---- 공지 목록 섹션의 페이지/필터 + 수정 모드 상태 ----
const NOTICE_ITEMS_PER_PAGE = 10;
let currentNoticePage = 1;
let currentNoticeFilter = 'all';
/** 수정 중인 공지 id (null이면 신규 등록 모드) */
let editingNoticeId = null;

// 현재 선택된 공지 분류 필터(all/notice/news)에 맞게 adminNotices를 걸러낸다.
function getFilteredAdminNotices() {
  if (currentNoticeFilter === 'all') return adminNotices;
  return adminNotices.filter(n => n.category === currentNoticeFilter);
}

function getNoticeEmptyMessage() {
  if (currentNoticeFilter === 'notice') return '전체 공지 항목이 없습니다.';
  if (currentNoticeFilter === 'news') return '새 소식 항목이 없습니다.';
  return '등록된 공지가 없습니다.';
}

// MongoDB는 _id, 일부 목업/변환 데이터는 id를 쓸 수 있어 두 경우 모두 대응
function getCommentId(comment) {
  return comment._id || comment.id;
}

// 사용자 입력값(닉네임, 문의 내용 등)을 innerHTML에 넣기 전 이스케이프해서 XSS 방지.
// comment-detail.js에도 동일한 함수가 있는데, 두 페이지가 완전히 독립적으로 로드되므로
// 파일마다 각자 정의해 둔 것(공유 모듈을 별도로 만들 정도는 아닌 순수 유틸이라 중복 허용).
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ---- 차단(block) 관련 헬퍼 ----
// 차단 레코드는 expiresAt(만료 시각)이 없으면 "영구 차단", 있으면 그 시각이
// 지나면 자동으로 무효가 된다. 서버가 만료된 레코드를 즉시 지우지 않을 수 있으므로
// 화면에서는 항상 이 함수로 "지금 시점에 실제로 유효한지"를 다시 확인한다.
function isBlockActive(block) {
  if (!block?.expiresAt) return true;
  return new Date(block.expiresAt) > new Date();
}

// 만료되지 않은(현재 유효한) 차단 레코드만 골라낸다
function getActiveBlocks() {
  return blockedList.filter(isBlockActive);
}

function findBlockByValue(value) {
  return getActiveBlocks().find(b => b.value === value);
}

// 닉네임 또는 IP 둘 중 하나라도 활성 차단 목록에 매칭되면 차단된 사용자로 간주
function isBlockedUser(userId, ip) {
  const active = getActiveBlocks();
  return active.some(b => b.value === (userId || '') || b.value === (ip || ''));
}

// 문의 작성자의 닉네임(userId)으로 registeredUsers에서 매칭되는 회원을 찾아 이메일을 표시.
// 문의 데이터 자체에는 이메일이 저장되지 않으므로, 관리자 화면에서만 회원 목록과
// 대조해서 부가 정보로 보여주는 것 (탈퇴했거나 비회원 문의면 '-' 표시).
function getUserEmail(userId) {
  if (!userId) return '-';
  const user = registeredUsers.find(u => u.nickname === userId);
  return user?.email || '-';
}

// ISO 날짜 문자열을 한국어 로캘의 사람이 읽기 쉬운 형식으로 변환. 값이 없거나
// 파싱 불가능한 문자열이면(Invalid Date) 'N/A'로 안전하게 표시한다.
function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return 'N/A';
  return d.toLocaleString('ko-KR');
}

// 차단 만료까지 남은 기간을 "n일 남음" 또는 "n시간 남음"으로 표시(24시간 미만이면 시간 단위로 전환).
// 이미 만료된 경우 '만료됨'을 반환한다.
function getRemainingLabel(expiresAt) {
  const diff = new Date(expiresAt) - new Date();
  if (diff <= 0) return '만료됨';

  const days = Math.ceil(diff / (24 * 60 * 60 * 1000));
  if (days >= 1) return `${days}일 남음`;

  const hours = Math.ceil(diff / (60 * 60 * 1000));
  return `${hours}시간 남음`;
}

// 차단 추가 폼에서 선택된 차단 기간(일수)을 읽어온다.
// select 값이 'custom'이면 별도 숫자 입력창(block-custom-days)의 값을 검증해서 사용하고,
// 범위(1~9999일)를 벗어나면 alert 후 null을 반환해 호출부가 요청을 보내지 않도록 막는다.
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

// 차단 기간 select에서 "관리자 지정"을 고르면 숨겨져 있던 커스텀 일수 입력창을 보여주고,
// 그 외 값을 고르면 다시 숨기면서 입력값을 비운다(직전에 입력했던 값이 실수로 재사용되지 않도록).
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

// ========================================================
// 서버 데이터 로딩 함수들
// ========================================================
// 각 함수는 대응하는 API를 호출해 전역 캐시 배열을 갱신하고, 관련 렌더 함수를 호출한다.
// 문의 목록(loadComments)만 인증 헤더 없이 호출되는데, 이는 백엔드의 /api/inquiries GET이
// 공개 조회를 허용하기 때문(문의 삭제 등 쓰기 작업에는 반드시 관리자 헤더가 필요).
async function loadComments() {
  try {
    const response = await fetch(`${getApiBase()}/api/inquiries`);
    if (!response.ok) throw new Error('댓글 목록 조회 실패');
    comments = await response.json();
    renderComments();
  } catch (err) {
    console.error(err);
    alert('❌ 댓글 목록을 불러올 수 없습니다. 백엔드 서버를 확인해주세요.');
  }
}

// 차단 목록을 다시 불러오는 김에, 차단 여부가 표시에 영향을 주는 다른 두 목록
// (사용자 목록의 "차단중" 배지, 문의 목록의 차단된 작성자 행 스타일)도 함께 다시 그린다.
async function loadBlocks() {
  try {
    const response = await fetch(`${getApiBase()}/api/admin/blocks`, {
      headers: getAdminAuthHeaders()
    });
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
    const response = await fetch(`${getApiBase()}/api/admin/users`, {
      headers: getAdminAuthHeaders()
    });
    if (!response.ok) throw new Error('사용자 목록 조회 실패');
    registeredUsers = await response.json();
    renderUserList();
    renderComments();
  } catch (err) {
    console.error(err);
  }
}

// 공지 목록도 loadComments처럼 조회는 공개 API라 인증 헤더 없이 호출한다
// (쓰기/수정/삭제/고정 액션에서만 getAdminAuthHeaders()를 사용).
async function loadNotices() {
  try {
    const response = await fetch(`${getApiBase()}/api/notices`);
    if (!response.ok) throw new Error('공지 목록 조회 실패');
    adminNotices = await response.json();
    renderAdminNoticeList();
  } catch (err) {
    console.error(err);
  }
}

// ---- 유튜브 커뮤니티 게시판 자동 가져오기 상태 표시 텍스트 조립 ----
// 서버가 주기적으로(백그라운드 스케줄러) 유튜브 채널 커뮤니티 글을 확인해서
// 새 소식으로 자동 등록하는 기능이 있는데, 그 상태(켜짐/꺼짐, 마지막 실행 시각,
// 마지막 결과)를 한 줄 문구로 합쳐서 youtube-sync-status 영역에 보여주기 위한 함수.
function formatYoutubeSyncStatus(status, result) {
  const parts = [];
  if (status) {
    parts.push(status.enabled === false ? '자동 동기화 꺼짐' : '자동 동기화 켜짐');
    if (status.lastFinishedAt) {
      parts.push(`마지막 확인: ${formatDate(status.lastFinishedAt)}`);
    }
  }
  const payload = result || status?.lastResult;
  if (payload?.ok) {
    parts.push(`가져온 글 ${payload.fetched || 0}개, 새 소식 등록 ${payload.created || 0}개, 번역 ${payload.translated || 0}개, 이미 있음 ${payload.skipped || 0}개`);
  } else if (payload?.error) {
    parts.push(`마지막 오류: ${payload.error}`);
  }
  return parts.join(' · ') || '휴먼버그대학교 채널 게시판 글을 새 소식에 가져옵니다.';
}

// 페이지 진입 시 현재 자동 동기화 상태(마지막 실행 결과 포함)를 조회해 상태 문구를 채운다.
// getAdminAuthHeaders가 아직 로드되지 않았을 극단적 상황(로딩 순서 문제) 대비 typeof 체크.
async function loadYoutubeSyncStatus() {
  const statusEl = document.getElementById('youtube-sync-status');
  if (!statusEl || typeof getAdminAuthHeaders !== 'function') return;
  try {
    const response = await fetch(`${getApiBase()}/api/notices/youtube-sync/status`, {
      headers: getAdminAuthHeaders(),
    });
    if (!response.ok) return;
    const data = await response.json();
    statusEl.textContent = formatYoutubeSyncStatus(data.status);
  } catch (err) {
    console.error(err);
  }
}

// "유튜브 게시판 가져오기" 버튼 클릭 시 즉시(스케줄을 기다리지 않고) 동기화를 1회 실행.
// 버튼을 눌러놓고 중복 클릭하지 못하도록 요청 중엔 비활성화(disabled)했다가 finally에서 복구.
async function syncYoutubePostsNow() {
  const btn = document.getElementById('youtube-sync-btn');
  const statusEl = document.getElementById('youtube-sync-status');
  if (btn) btn.disabled = true;
  if (statusEl) statusEl.textContent = '유튜브 게시판을 확인하는 중...';

  try {
    const response = await fetch(`${getApiBase()}/api/notices/youtube-sync`, {
      method: 'POST',
      headers: getAdminAuthHeaders(),
    });
    const data = await response.json();
    if (response.ok && data.success) {
      if (statusEl) statusEl.textContent = formatYoutubeSyncStatus(null, data.result);
      await loadNotices();
      const created = data.result?.created || 0;
      const translated = data.result?.translated || 0;
      if (created) {
        alert(`✅ 유튜브 게시판에서 새 소식 ${created}개를 등록했습니다.`);
      } else if (translated) {
        alert(`✅ 기존 유튜브 글 ${translated}개를 한국어로 번역했습니다.`);
      } else {
        alert('✅ 확인할 새 유튜브 게시글이 없습니다. 이미 가져온 글은 건너뜁니다.');
      }
    } else {
      const message = data.error || '유튜브 동기화 실패';
      if (statusEl) statusEl.textContent = message;
      alert('❌ ' + message);
    }
  } catch (err) {
    console.error(err);
    if (statusEl) statusEl.textContent = '서버와 연결할 수 없습니다.';
    alert('❌ 서버와 연결할 수 없습니다.');
  } finally {
    if (btn) btn.disabled = false;
  }
}

// ========================================================
// 공지 목록 테이블 렌더링
// ========================================================
// 정렬(고정 우선) → 페이지네이션(10개씩) → 각 행에 고정/수정/삭제 버튼을 그린 뒤,
// 이벤트 위임 대신 매 렌더링마다 각 버튼에 직접 addEventListener를 다시 붙인다
// (innerHTML을 통째로 교체하는 방식이라 이전에 붙였던 리스너는 자동으로 사라지므로
//  렌더링할 때마다 새로 붙여줘야 클릭이 동작한다).
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
        <td><strong>${escapeHtml(notice.title)}</strong>${notice.source === 'youtube' ? ' <span class="badge badge-youtube">YouTube</span>' : ''}</td>
        <td>${escapeHtml(notice.summary || '-')}</td>
        <td>${formatDate(notice.createdAt)}</td>
        <td style="white-space:nowrap;">
          <button type="button" class="notice-edit-btn" data-edit-id="${id}">수정</button>
          ${notice.isPinned
            ? `<button class="pin-btn unpin" data-pin-id="${id}">고정 해제</button>`
            : `<button class="pin-btn" data-pin-id="${id}" ${canPin ? '' : 'disabled style="opacity:0.4;cursor:not-allowed;"'}>📌 고정</button>`
          }
          <button class="danger-btn" data-notice-id="${id}">삭제</button>
        </td>
      </tr>`;
  }).join('');

  tbody.querySelectorAll('[data-edit-id]').forEach(btn => {
    btn.addEventListener('click', () => startEditAdminNotice(btn.dataset.editId));
  });

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

// 공지 작성 폼의 입력 필드를 전부 비우고 카테고리를 기본값(notice)으로 되돌린다.
// 새 공지 등록 성공 직후, 또는 수정 취소 시 호출된다.
function clearNoticeFormFields() {
  const titleEl = document.getElementById('notice-title-input');
  const summaryEl = document.getElementById('notice-summary-input');
  const contentEl = document.getElementById('notice-content-input');
  const categoryEl = document.getElementById('notice-category');
  if (titleEl) titleEl.value = '';
  if (summaryEl) summaryEl.value = '';
  if (contentEl) contentEl.value = '';
  if (categoryEl) categoryEl.value = 'notice';
  updateNoticePreview();
}

// ========================================================
// ===== 공지 에디터: 서식 툴바 + 미리보기 =====
// ========================================================
// 공지 내용(notice-content-input)은 실제로는 순수 텍스트 <textarea>이고, 여기에
// 마크다운과 비슷한 기호(**굵게**, # 제목, - 목록 등)를 직접 써넣는 방식이다.
// 툴바 버튼들은 그 기호를 커서 위치/선택 영역에 자동으로 삽입해주는 "타이핑 도우미"일 뿐,
// 실제 굵게/제목 렌더링은 노출 화면(notice/notice.js의 window.renderNoticeContent)이
// 저장된 텍스트를 파싱해서 HTML로 바꿀 때 이루어진다. 여기 미리보기 패널도 같은
// renderNoticeContent 함수를 재사용해 "실제로 어떻게 보일지"를 그대로 보여준다.

// 인라인 서식(선택한 텍스트 앞뒤를 기호로 감싸는 것): 굵게/기울임/취소선/코드
const NOTICE_INLINE_FORMATS = {
  bold: { wrap: '**', placeholder: '굵은 텍스트' },
  italic: { wrap: '*', placeholder: '기울인 텍스트' },
  strike: { wrap: '~~', placeholder: '취소선 텍스트' },
  code: { wrap: '`', placeholder: '코드' },
};

// 줄 단위 서식(그 줄 맨 앞에 접두어를 붙이는 것): 제목/소제목/목록/인용
const NOTICE_LINE_FORMATS = {
  h2: { prefix: '# ', placeholder: '제목' },
  h3: { prefix: '## ', placeholder: '소제목' },
  ul: { prefix: '- ', placeholder: '항목' },
  ol: { prefix: '1. ', placeholder: '항목' },
  quote: { prefix: '> ', placeholder: '인용문' },
};

// 미리보기 패널이 열려있을 때만(hidden이 아닐 때만) textarea 내용을 다시 파싱해서 그린다.
// 매 키 입력마다 호출되므로, 패널이 닫혀있으면 불필요한 렌더링을 건너뛰어 성능을 아낀다.
function updateNoticePreview() {
  const pane = document.getElementById('notice-preview-pane');
  if (!pane || pane.hidden) return;

  const content = document.getElementById('notice-content-input')?.value || '';
  pane.innerHTML = content.trim()
    ? window.renderNoticeContent(content)
    : '<p class="notice-preview-empty">내용을 입력하면 실제 공지 화면처럼 보입니다.</p>';
}

// textarea의 현재 선택 영역을 newText로 교체하는 공통 헬퍼.
// setRangeText는 브라우저 네이티브 API로, 실행취소(Ctrl+Z) 스택을 깨지 않으면서
// 텍스트를 바꿔주는 장점이 있어 직접 value를 대입하는 대신 이걸 사용한다.
// 교체 후 selStart~selEnd 범위를 다시 선택 상태로 만들어(예: 방금 감싼 텍스트를 그대로
// 선택 유지) 사용자가 바로 이어서 다른 서식을 겹쳐 적용하거나 타이핑할 수 있게 한다.
function replaceNoticeSelection(textarea, newText, selStart, selEnd) {
  textarea.setRangeText(newText, textarea.selectionStart, textarea.selectionEnd, 'end');
  textarea.focus();
  if (selStart !== undefined) textarea.setSelectionRange(selStart, selEnd ?? selStart);
  updateNoticePreview();
}

// 인라인 서식 적용: 선택한 텍스트가 있으면 그 텍스트를, 없으면 placeholder 문구를
// wrap 기호로 앞뒤를 감싸 삽입한다(예: 선택 없이 "굵게" 버튼 누르면 **굵은 텍스트** 삽입).
function applyNoticeInlineFormat(textarea, format) {
  const { wrap, placeholder } = NOTICE_INLINE_FORMATS[format];
  const start = textarea.selectionStart;
  const selected = textarea.value.slice(start, textarea.selectionEnd);
  const body = selected || placeholder;

  replaceNoticeSelection(
    textarea,
    `${wrap}${body}${wrap}`,
    start + wrap.length,
    start + wrap.length + body.length
  );
}

// 줄 단위 서식 적용: 커서/선택 영역이 걸쳐있는 "줄 전체"(lineStart~lineEnd)를 찾아서,
// 각 줄 맨 앞에 이미 붙어있던 다른 줄 서식 기호(#, -, 1., > 등)를 정규식으로 벗겨낸 뒤
// 새 접두어를 붙인다. 이렇게 해야 "이미 목록인 줄을 인용문으로 바꾸기" 같은 경우에도
// 접두어가 중첩되지 않고 깔끔하게 치환된다. 번호 목록(ol)은 각 줄마다 1., 2., 3...으로
// 순번을 새로 매겨준다.
function applyNoticeLineFormat(textarea, format) {
  const { prefix, placeholder } = NOTICE_LINE_FORMATS[format];
  const value = textarea.value;
  const lineStart = value.lastIndexOf('\n', textarea.selectionStart - 1) + 1;
  const lineEndIndex = value.indexOf('\n', textarea.selectionEnd);
  const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex;

  const formatted = value
    .slice(lineStart, lineEnd)
    .split('\n')
    .map((line, index) => {
      const stripped = line.replace(/^(#{1,3}\s+|[-*]\s+|\d+\.\s+|>\s?)/, '');
      const linePrefix = format === 'ol' ? `${index + 1}. ` : prefix;
      return `${linePrefix}${stripped || placeholder}`;
    })
    .join('\n');

  textarea.setSelectionRange(lineStart, lineEnd);
  replaceNoticeSelection(textarea, formatted, lineStart, lineStart + formatted.length);
}

// 툴바 버튼 클릭의 실제 진입점. format 값에 따라 인라인/줄 서식 헬퍼로 분기하고,
// 그 외 특수 서식(link, hr)은 여기서 직접 처리한다.
function applyNoticeFormat(format) {
  const textarea = document.getElementById('notice-content-input');
  if (!textarea) return;

  if (NOTICE_INLINE_FORMATS[format]) {
    applyNoticeInlineFormat(textarea, format);
    return;
  }
  if (NOTICE_LINE_FORMATS[format]) {
    applyNoticeLineFormat(textarea, format);
    return;
  }

  if (format === 'link') {
    // 링크는 URL을 별도로 물어봐야 하므로 prompt()로 입력받는다.
    // http(s)로 시작하지 않는 값은 잘못된 입력으로 보고 조용히 취소(return)한다.
    const start = textarea.selectionStart;
    const label = textarea.value.slice(start, textarea.selectionEnd) || '링크 텍스트';
    const url = prompt('연결할 주소를 입력하세요 (https://로 시작)', 'https://');
    if (!url || !/^https?:\/\//i.test(url)) return;
    replaceNoticeSelection(textarea, `[${label}](${url})`, start + 1, start + 1 + label.length);
    return;
  }

  if (format === 'hr') {
    // 구분선(---)은 앞뒤로 빈 줄이 있어야 마크다운 파서가 올바르게 인식하므로,
    // 커서 바로 앞이 줄바꿈이 아니면 줄바꿈을 하나 더 넣어준 뒤 삽입한다.
    const needsLeadingBreak = textarea.selectionStart > 0
      && textarea.value[textarea.selectionStart - 1] !== '\n';
    replaceNoticeSelection(textarea, `${needsLeadingBreak ? '\n' : ''}\n---\n\n`);
  }
}

// "👁 미리보기" 토글 버튼: 미리보기 패널을 보이기/숨기기 하고, 버튼 텍스트와
// aria-pressed(스크린리더용 접근성 상태)도 함께 전환한다.
function toggleNoticePreview() {
  const pane = document.getElementById('notice-preview-pane');
  const toggle = document.getElementById('notice-preview-toggle');
  if (!pane || !toggle) return;

  pane.hidden = !pane.hidden;
  toggle.setAttribute('aria-pressed', String(!pane.hidden));
  toggle.classList.toggle('is-active', !pane.hidden);
  toggle.textContent = pane.hidden ? '👁 미리보기' : '✏️ 편집만 보기';
  updateNoticePreview();
}

// 공지 에디터 툴바/텍스트영역에 필요한 이벤트 리스너들을 한 번에 연결한다.
// (버튼 클릭, 입력 시 실시간 미리보기 갱신, Ctrl+B/Ctrl+I 단축키)
function setupNoticeEditor() {
  const toolbar = document.getElementById('notice-editor-toolbar');
  const textarea = document.getElementById('notice-content-input');
  if (!toolbar || !textarea) return;

  // 툴바 안의 버튼 개수가 많아 각각에 리스너를 달지 않고, 툴바 컨테이너 하나에만
  // 클릭 이벤트를 걸고 event.target.closest로 어떤 버튼이 눌렸는지 판별하는
  // "이벤트 위임" 패턴을 사용한다.
  toolbar.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-format]');
    if (btn) applyNoticeFormat(btn.dataset.format);
  });

  const previewToggle = document.getElementById('notice-preview-toggle');
  if (previewToggle) previewToggle.addEventListener('click', toggleNoticePreview);

  textarea.addEventListener('input', updateNoticePreview);
  // Ctrl(Windows/Linux) 또는 Cmd(Mac, metaKey)를 누른 상태로 B/I를 누르면
  // 브라우저 기본 동작(굵게 서식 등)을 막고 우리 서식 삽입 로직으로 대체한다.
  textarea.addEventListener('keydown', (event) => {
    if (!event.ctrlKey && !event.metaKey) return;
    const shortcut = { b: 'bold', i: 'italic' }[event.key.toLowerCase()];
    if (!shortcut) return;
    event.preventDefault();
    applyNoticeFormat(shortcut);
  });
}

// 공지 작성/수정 폼의 문구·버튼 라벨을 현재 모드(신규 작성 vs 기존 수정)에 맞게 갱신.
// editingNoticeId 유무 하나로 "작성 모드"와 "수정 모드"를 구분하는 단일 폼 재사용 구조라,
// 폼 자체는 하나뿐이고 이 함수가 매번 겉모습(제목/버튼 텍스트/취소 버튼 노출)만 바꿔준다.
function updateNoticeFormModeUI() {
  const isEdit = Boolean(editingNoticeId);
  const heading = document.getElementById('notice-section-heading');
  const modeLabel = document.getElementById('notice-form-mode-label');
  const postBtn = document.getElementById('post-notice-btn');
  const cancelBtn = document.getElementById('cancel-notice-edit-btn');
  const formCard = document.getElementById('notice-form-card');
  const editIdEl = document.getElementById('notice-edit-id');

  if (editIdEl) editIdEl.value = editingNoticeId || '';
  if (heading) heading.textContent = isEdit ? '✏️ 공지 수정' : '📢 공지 올리기';
  if (modeLabel) modeLabel.textContent = isEdit ? '공지 수정 중' : '공지 작성';
  if (postBtn) postBtn.textContent = isEdit ? '💾 수정 저장' : '📢 공지 등록';
  if (cancelBtn) cancelBtn.hidden = !isEdit;
  if (formCard) formCard.classList.toggle('is-editing', isEdit);
}

// 수정 모드를 빠져나와 신규 작성 모드로 되돌린다 (폼 초기화 + UI 갱신)
function cancelEditAdminNotice() {
  editingNoticeId = null;
  clearNoticeFormFields();
  updateNoticeFormModeUI();
}

// "수정" 버튼 클릭 시 해당 공지 내용을 폼에 채워 넣고 수정 모드로 전환한다.
async function startEditAdminNotice(noticeId) {
  let notice = adminNotices.find(n => String(n._id || n.id) === String(noticeId));

  // 목록 API 응답에는 본문(content)이 생략되어 있을 수 있어(목록 화면에서는 요약만
  // 필요하므로 서버가 가볍게 응답하는 구조), 본문이 비어 있으면 상세 API를 한 번 더
  // 조회해서 채워 넣는다.
  if (!notice || !(notice.content || '').trim()) {
    try {
      const response = await fetch(`${getApiBase()}/api/notices/${noticeId}`);
      if (!response.ok) throw new Error('공지 조회 실패');
      notice = await response.json();
      const index = adminNotices.findIndex(n => String(n._id || n.id) === String(noticeId));
      if (index !== -1) adminNotices[index] = notice;
      else adminNotices.unshift(notice);
    } catch (err) {
      console.error(err);
      alert('❌ 공지 내용을 불러올 수 없습니다.');
      return;
    }
  }

  editingNoticeId = String(notice._id || notice.id);
  const titleEl = document.getElementById('notice-title-input');
  const summaryEl = document.getElementById('notice-summary-input');
  const contentEl = document.getElementById('notice-content-input');
  const categoryEl = document.getElementById('notice-category');

  if (titleEl) titleEl.value = notice.title || '';
  if (summaryEl) summaryEl.value = notice.summary || '';
  if (contentEl) contentEl.value = notice.content || '';
  if (categoryEl) categoryEl.value = notice.category === 'news' ? 'news' : 'notice';

  updateNoticeFormModeUI();
  updateNoticePreview();

  const formCard = document.getElementById('notice-form-card');
  if (formCard) {
    formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  if (titleEl) titleEl.focus();
}

// 공지 고정/고정 해제 토글. 서버가 MAX_PINNED_NOTICES 제한을 실제로 검증하며,
// 성공 응답에 담겨오는 최신 notice 객체로 캐시 배열의 해당 항목을 교체한다.
async function toggleAdminNoticePin(noticeId) {
  try {
    const response = await fetch(`${getApiBase()}/api/notices/${noticeId}/pin`, { 
      method: 'PATCH',
      headers: getAdminAuthHeaders()
    });
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

// 공지 등록 버튼(📢 공지 등록 / 💾 수정 저장)의 실제 처리 함수.
// editingNoticeId 유무로 신규 등록(POST)인지 기존 수정(PUT)인지를 판별해 하나의
// 함수에서 두 흐름을 모두 처리한다 (URL/HTTP 메서드/요청 바디만 분기).
async function postAdminNotice() {
  const title = document.getElementById('notice-title-input')?.value.trim();
  const summary = document.getElementById('notice-summary-input')?.value.trim();
  const content = document.getElementById('notice-content-input')?.value.trim();
  const category = document.getElementById('notice-category')?.value || 'notice';

  if (!title || !content) {
    alert('제목과 내용을 입력해주세요.');
    return;
  }

  const isEdit = Boolean(editingNoticeId);
  const url = isEdit
    ? `${getApiBase()}/api/notices/${editingNoticeId}`
    : `${getApiBase()}/api/notices`;
  const method = isEdit ? 'PUT' : 'POST';
  const body = isEdit
    ? { title, summary, content, category }
    : {
        title,
        summary,
        content,
        category,
        author: localStorage.getItem('adminName') || '관리자',
      };

  try {
    const response = await fetch(url, {
      method,
      headers: getAdminAuthHeaders(),
      body: JSON.stringify(body),
    });
    const data = await response.json();

    if (response.ok && data.success) {
      if (isEdit) {
        const index = adminNotices.findIndex(
          n => String(n._id || n.id) === String(editingNoticeId)
        );
        if (index !== -1) adminNotices[index] = data.notice;
        else adminNotices.unshift(data.notice);
        cancelEditAdminNotice();
        renderAdminNoticeList();
        alert(`✅ ${NOTICE_CATEGORY_LABELS[category] || category} 공지가 수정되었습니다.`);
      } else {
        adminNotices.unshift(data.notice);
        currentNoticePage = 1;
        clearNoticeFormFields();
        updateNoticeFormModeUI();
        renderAdminNoticeList();
        alert(`✅ ${NOTICE_CATEGORY_LABELS[category]} 공지가 등록되었습니다.`);
      }
    } else {
      alert('❌ ' + (data.error || (isEdit ? '공지 수정 실패' : '공지 등록 실패')));
    }
  } catch (err) {
    console.error(err);
    alert('❌ 서버와 연결할 수 없습니다.');
  }
}

// 공지 삭제. 지금 수정 폼에 열려있던 공지를 삭제한 경우엔 수정 모드를 취소해서
// 이미 사라진 공지를 계속 수정하려는 상태로 남아있지 않도록 정리한다.
async function deleteAdminNotice(noticeId) {
  if (!confirm('이 공지를 삭제하시겠습니까?')) return;

  try {
    const response = await fetch(`${getApiBase()}/api/notices/${noticeId}`, { 
      method: 'DELETE',
      headers: getAdminAuthHeaders()
    });
    const data = await response.json();

    if (response.ok && data.success) {
      adminNotices = adminNotices.filter(n => String(n._id || n.id) !== String(noticeId));
      if (editingNoticeId && String(editingNoticeId) === String(noticeId)) {
        cancelEditAdminNotice();
      }
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

// ========================================================
// 커스텀 메이커(custom-maker) 게시글/댓글 신고 관리 섹션
// ========================================================
// 커스텀 티어 게시판에 올라온 게시글·댓글 중 신고된 것을 관리자가 검토해서
// "신고 해제"(오신고였던 경우) 또는 "삭제"(실제 위반인 경우) 처리하는 영역이다.
// 문의(comments) 섹션과 구조는 비슷하지만 데이터 출처가 다른 API(tier-reports)이므로
// 완전히 별도의 상태 변수·렌더 함수를 사용한다.
let tierPosts = [];
let tierComments = [];
let currentTierPostFilter = 'all';      // 'all' | 'normal' | 'reported'
let currentTierCommentFilter = 'all';

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

// 게시글/댓글 신고 목록을 병렬로 조회한다. 전용 admin 신고 API(tier-reports)가
// 실패하는 경우(예: 구버전 백엔드, 권한 문제)를 대비해 게시글 쪽은 공개 API인
// /api/tierlists로 한 번 더 시도하는 fallback을 둬서, 최소한 목록이 완전히 비어
// 보이는 상황은 피하도록 되어 있다(단, 이 fallback 데이터에는 신고 정보가 없을 수 있음).
async function loadTierMakerData() {
  try {
    const headers = getAdminAuthHeaders();
    const [postsRes, commentsRes] = await Promise.all([
      fetch(`${getApiBase()}/api/admin/tier-reports/posts`, { headers }),
      fetch(`${getApiBase()}/api/admin/tier-reports/comments`, { headers }),
    ]);

    if (postsRes.ok) {
      tierPosts = await postsRes.json();
    } else {
      console.error('커스텀 메이커 게시글 조회 실패:', postsRes.status);
      const fallback = await fetch(`${getApiBase()}/api/tierlists`);
      tierPosts = fallback.ok ? await fallback.json() : [];
    }

    if (commentsRes.ok) {
      tierComments = await commentsRes.json();
    } else {
      console.error('커스텀 메이커 댓글 조회 실패:', commentsRes.status);
      tierComments = [];
    }

    renderTierMaker();
  } catch (err) {
    console.error(err);
    alert('커스텀 메이커 데이터를 불러오지 못했습니다. backend에서 npm start를 실행해주세요.');
  }
}

// 게시글 테이블 + 댓글 테이블을 각각 현재 필터에 맞게 그린다.
// 두 테이블 모두 onclick 인라인 핸들러(window.dismiss.../window.delete...)로 버튼을
// 처리하므로, comment-detail.js처럼 이벤트 위임을 따로 구성할 필요가 없다.
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
          <td style="white-space: nowrap;">
            ${post.reported ? `<button type="button" onclick="dismissTierPostReport('${id}')" class="action-btn">해제</button>` : ''}
            <button type="button" onclick="deleteTierPostReport('${id}')" class="danger-btn">삭제</button>
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
          <td style="white-space: nowrap;">
            ${comment.reported ? `<button type="button" onclick="dismissTierCommentReport('${id}')" class="action-btn">해제</button>` : ''}
            <button type="button" onclick="deleteTierCommentReport('${id}')" class="danger-btn">삭제</button>
          </td>
        </tr>`;
    }).join('');
  }
}

// ---- 분류 필터 버튼(전체/일반/신고) 클릭 처리 ----
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

// ---- 게시글/댓글 신고 처리(해제·삭제) 액션들 ----
// "해제"는 신고 표시만 지우고 게시글/댓글 자체는 남긴다(오신고 판정).
// "삭제"는 실제로 게시글/댓글 데이터를 제거한다(위반 확정). 두 액션 모두 처리 후
// loadTierMakerData()로 목록을 다시 불러와 최신 상태를 반영한다.
window.dismissTierPostReport = async function(id) {
  if (!confirm('이 게시글 신고를 해제할까요?')) return;
  const response = await fetch(`${getApiBase()}/api/admin/tier-reports/posts/${id}/dismiss`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
  });
  if (response.ok) loadTierMakerData();
  else alert('신고 해제에 실패했습니다.');
};

window.deleteTierPostReport = async function(id) {
  if (!confirm('이 게시글을 삭제할까요?')) return;
  const response = await fetch(`${getApiBase()}/api/admin/tier-reports/posts/${id}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (response.ok) loadTierMakerData();
  else alert('게시글 삭제에 실패했습니다.');
};

window.dismissTierCommentReport = async function(id) {
  if (!confirm('이 댓글 신고를 해제할까요?')) return;
  const response = await fetch(`${getApiBase()}/api/admin/tier-reports/comments/${id}/dismiss`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
  });
  if (response.ok) loadTierMakerData();
  else alert('신고 해제에 실패했습니다.');
};

window.deleteTierCommentReport = async function(id) {
  if (!confirm('이 댓글을 삭제할까요?')) return;
  const response = await fetch(`${getApiBase()}/api/admin/tier-reports/comments/${id}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (response.ok) loadTierMakerData();
  else alert('댓글 삭제에 실패했습니다.');
};

// ========================================================
// 관리자 대시보드 초기화 진입점
// ========================================================
// 페이지 하단 <script>의 window.load 리스너(checkAdminAuth 통과 후)에서 호출된다.
// 6개 섹션 데이터를 Promise.all로 동시에 요청해서, 순차 요청보다 훨씬 빠르게
// 전체 대시보드를 한 번에 채운다(서로 의존관계가 없는 독립적인 API들이라 병렬 처리 가능).
async function initAdminData() {
  await Promise.all([loadComments(), loadBlocks(), loadUsers(), loadNotices(), loadTierMakerData(), loadYoutubeSyncStatus()]);
}

// ========================================================
// 문의(댓글) 목록 테이블 렌더링
// ========================================================
// 필터(유형/신고사유/검색어) → 정렬(최신/오래된순) → 페이지네이션(25개씩) 순으로
// comments 배열을 가공한 뒤 테이블 행을 그린다. 검색어는 별도 상태 변수 없이
// 렌더링 시점에 매번 입력창(#search-input)에서 직접 읽어와 사용한다.
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

// 문의 1건 삭제. 성공 시 서버를 다시 조회하지 않고 로컬 comments 배열에서
// 바로 걸러낸 뒤 즉시 재렌더링해서(불필요한 재요청 없이) 반응성을 높인다.
window.deleteComment = async function(commentId) {
  if (!confirm('정말 이 댓글을 삭제하시겠습니까?')) return;

  try {
    const response = await fetch(`${getApiBase()}/api/inquiries/${commentId}`, {
      method: 'DELETE',
      headers: getAdminAuthHeaders()
    });
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

// ========================================================
// 페이지 로드 시 각종 버튼/셀렉트에 이벤트 리스너 연결
// ========================================================
// 이 리스너들은 DOM 구조 자체(버튼 존재 여부)에 의존하므로 DOMContentLoaded 시점에
// 한 번만 연결한다(각 섹션의 목록 렌더 함수처럼 매번 다시 그려지는 요소가 아니라
// HTML에 고정으로 박혀있는 버튼들이라 재연결이 필요 없음).
document.addEventListener('DOMContentLoaded', () => {
  setupDurationSelect();

  const deleteAllBtn = document.getElementById('delete-all-btn');
  if (deleteAllBtn) {
    deleteAllBtn.addEventListener('click', async () => {
      if (!confirm('⚠️ 정말 모든 댓글을 삭제하시겠습니까? (복구 불가)')) return;

      try {
        const response = await fetch(`${getApiBase()}/api/inquiries`, { 
          method: 'DELETE',
          headers: getAdminAuthHeaders()
        });
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

  const youtubeSyncBtn = document.getElementById('youtube-sync-btn');
  if (youtubeSyncBtn) {
    youtubeSyncBtn.addEventListener('click', syncYoutubePostsNow);
  }

  const cancelNoticeEditBtn = document.getElementById('cancel-notice-edit-btn');
  if (cancelNoticeEditBtn) {
    cancelNoticeEditBtn.addEventListener('click', cancelEditAdminNotice);
  }

  setupNoticeEditor();
  updateNoticeFormModeUI();

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

// ========================================================
// 회원 / IP 차단 관리 섹션
// ========================================================
// 차단 추가는 두 경로에서 재사용된다: (1) 상단 입력창에 직접 ID/IP를 적고 "차단 추가"
// 버튼을 누르는 경우(value 인자 없이 호출, DOM에서 직접 읽음), (2) 등록된 사용자 표에서
// 특정 회원의 "차단" 버튼을 누르는 경우(value=닉네임을 인자로 넘겨 호출). value 인자
// 유무로 두 경로를 구분해 입력창을 비울지 말지(마지막 줄의 if (!value))도 결정한다.
async function addBlockFromInput(value, durationDays) {
  const inputValue = (value ?? document.getElementById('block-input')?.value ?? '').trim();
  if (!inputValue) {
    alert('차단할 ID 또는 IP를 입력해주세요.');
    return;
  }

  const days = durationDays ?? getSelectedDurationDays();
  if (!days) return;

  try {
    const response = await fetch(`${getApiBase()}/api/admin/blocks`, {
      method: 'POST',
      headers: getAdminAuthHeaders(),
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

// 회원가입한 사용자 목록 테이블 렌더링. 각 사용자가 현재 차단되어 있는지를
// findBlockByValue(닉네임 매칭)로 매번 다시 계산해서 배지와 버튼(차단/차단해제)을 그린다.
// 렌더링 후 각 행의 버튼에 이벤트를 다시 붙이는 이유는 renderAdminNoticeList와 동일
// (innerHTML 교체로 이전 리스너가 사라지므로).
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
    const userId = user._id || user.id || '';

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
          ${user.isVerified
            ? ''
            : `<button type="button" class="verify-user-btn" data-user-id="${escapeHtml(String(userId))}" data-nickname="${escapeHtml(user.nickname)}">인증하기</button>`
          }
          ${isBlocked
            ? `<button type="button" class="unblock-btn" data-block-id="${block._id}">차단 해제</button>`
            : `<button type="button" class="block-btn block-user-btn" data-nickname="${escapeHtml(user.nickname)}">차단</button>`
          }
          <button type="button" class="danger-btn delete-user-btn" data-user-id="${escapeHtml(String(userId))}" data-nickname="${escapeHtml(user.nickname)}">삭제</button>
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

  tbody.querySelectorAll('.verify-user-btn').forEach(btn => {
    btn.addEventListener('click', () => verifyRegisteredUser(btn.dataset.userId, btn.dataset.nickname));
  });

  tbody.querySelectorAll('.delete-user-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteRegisteredUser(btn.dataset.userId, btn.dataset.nickname));
  });
}

// 회원 계정 자체를 삭제(탈퇴 처리)한다. 서버가 연쇄적으로 해당 회원의 커스텀 게시글·
// 댓글·문의까지 함께 지우므로(cascade delete) 되돌릴 수 없다는 경고 문구를 넣었다.
// 삭제 후에는 영향받은 4개 섹션(사용자/차단/문의/커스텀메이커)을 모두 다시 불러온다.
async function verifyRegisteredUser(userId, nickname) {
  if (!userId) {
    alert('❌ 사용자 정보를 찾을 수 없습니다.');
    return;
  }

  const label = nickname || '이 회원';
  if (!confirm(`${label} 님을 이메일 인증 완료 처리할까요?\n인증 메일을 받지 못한 경우 이 버튼으로 로그인할 수 있게 합니다.`)) {
    return;
  }

  try {
    const response = await fetch(`${getApiBase()}/api/admin/users/${encodeURIComponent(userId)}/verify`, {
      method: 'PATCH',
      headers: getAdminAuthHeaders(),
    });
    const data = await response.json().catch(() => ({}));

    if (response.ok) {
      alert('✅ ' + (data.message || '인증을 완료했습니다.'));
      await loadUsers();
    } else {
      alert('❌ ' + (data.error || '인증 처리 실패'));
    }
  } catch (err) {
    console.error(err);
    alert('❌ 서버와 연결할 수 없습니다.');
  }
}

async function deleteRegisteredUser(userId, nickname) {
  if (!userId) {
    alert('❌ 사용자 정보를 찾을 수 없습니다.');
    return;
  }

  const label = nickname || '이 회원';
  if (!confirm(`${label} 님의 회원 계정을 삭제할까요?\n커스텀 게시글·댓글·문의도 함께 삭제되며 복구할 수 없습니다.`)) {
    return;
  }

  try {
    const response = await fetch(`${getApiBase()}/api/admin/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      headers: getAdminAuthHeaders(),
    });
    const data = await response.json().catch(() => ({}));

    if (response.ok) {
      alert('✅ 회원이 삭제되었습니다.');
      await Promise.all([loadUsers(), loadBlocks(), loadComments(), loadTierMakerData()]);
    } else {
      alert('❌ ' + (data.error || '회원 삭제 실패'));
    }
  } catch (err) {
    console.error(err);
    alert('❌ 서버와 연결할 수 없습니다.');
  }
}

// 활성 차단 목록 테이블 렌더링 (만료된 차단은 getActiveBlocks가 이미 걸러낸 상태)
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

// 차단 해제(관리자 재량). 성공 시 세 목록(차단/사용자/문의)을 모두 다시 그려
// "차단중" 배지와 행 스타일이 즉시 반영되도록 한다.
async function unblock(blockId) {
  if (!confirm('관리자 재량으로 이 차단을 해제하시겠습니까?')) return;

  try {
    const response = await fetch(`${getApiBase()}/api/admin/blocks/${blockId}`, { 
      method: 'DELETE',
      headers: getAdminAuthHeaders()
    });
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

// 문의 목록의 신고 아이콘(⚠️) 클릭 시 사유 팝업 표시. comment-detail.js의 동일 이름
// 함수와 로직이 거의 같다(다른 페이지에서 독립 로드되므로 각자 파일에 중복 구현됨).
// 여기서는 팝업 위치를 좌측 여백(+30px) 없이 아이콘 바로 아래(rect.left 그대로)에 붙인다.
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

// "📋 상세" 버튼 클릭 시 comment-detail.html?id=... 로 이동 (id는 comment-detail.js의
// getCommentIdFromURL()이 다시 파싱해서 사용한다)
window.goToDetail = function(commentId) {
  window.location.href = `comment-detail?id=${commentId}`;
};

// 문의 유형 탭(전체/일반유저/관리자/신고한 댓글) 클릭 처리.
// 필터를 바꾸면 페이지를 1페이지로 되돌려서, 예를 들어 "신고한 댓글" 필터를 눌렀는데
// 결과가 적어 이전 필터의 5페이지 같은 곳에 그대로 머물러 빈 화면이 되는 걸 방지한다.
window.setTypeFilter = function(type) {
  currentTypeFilter = type;
  currentPage = 1;

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.id === `filter-${type}`);
  });

  applyFilters();
};

// 신고 사유 select / 정렬 select 변경, 검색 버튼(엔터 포함) 클릭 시 공통으로 호출되어
// 현재 select 값들을 상태에 반영하고 1페이지부터 다시 렌더링한다.
window.applyFilters = function() {
  currentReportFilter = document.getElementById('report-filter').value;
  currentSort = document.getElementById('sort-select').value;
  currentPage = 1;
  renderComments();
};

// ========================================================
// 페이지네이션(이전/숫자버튼/다음) HTML 생성 공통 함수
// ========================================================
// 문의 목록과 공지 목록 두 테이블이 똑같은 모양의 페이지네이션 UI를 쓰므로,
// 클릭 시 호출할 함수 이름(prevFn/nextFn/goFn)만 문자열로 받아 온클릭 속성에
// 그대로 꽂아 넣는 방식으로 로직을 하나로 통합했다. 현재 페이지 기준 앞뒤 3개씩만
// 숫자 버튼을 보여줘서(startPage~endPage) 페이지가 아주 많아져도 버튼이 한 줄을
// 넘치지 않게 한다.
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

// 공지 목록은 범위를 벗어난 페이지 번호(0이하 또는 총 페이지 초과)로의 이동을
// 명시적으로 막는다 (문의 목록의 goToPage는 renderComments 내부에서 clamp하지만,
// 여기서는 호출 전에 미리 걸러낸다).
window.goToNoticePage = function(page) {
  const totalPages = Math.ceil(getFilteredAdminNotices().length / NOTICE_ITEMS_PER_PAGE) || 1;
  if (page < 1 || page > totalPages) return;
  currentNoticePage = page;
  renderAdminNoticeList();
};

// 이 파일 밖(예: 브라우저 콘솔 디버깅, 다른 인라인 스크립트)에서도 호출할 수 있도록
// 주요 함수들을 전역(window) 객체에 다시 노출해둔다.
window.renderComments = renderComments;
window.renderBlockList = renderBlockList;
window.initAdminData = initAdminData;