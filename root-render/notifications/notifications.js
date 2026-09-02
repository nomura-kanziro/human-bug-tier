// ========================================================
// 알림 전체보기 페이지 (notifications.html) 동작 스크립트
// ========================================================
// 전체 흐름:
//   1) initNotificationsPage()가 로그인 체크 후 fetchAllNotifications()로 최근 100건을 한 번에 받아온다
//      (헤더 벨 드롭다운의 50건 미리보기와 달리 이 페이지는 넉넉히 100건을 받아 전부 클라이언트에서 필터링).
//   2) 받아온 원본은 notifAllItems에 그대로 캐시해두고, 화면에 뿌릴 목록은 매번
//      filterByTab() → applySortFilter() 순으로 다시 계산한다 (서버에 재요청하지 않음).
//   3) 탭 클릭(bindNotifTabs)이나 정렬 셀렉트 변경(bindNotifSortSelect)은 상태값만 바꾸고
//      renderNotifList()를 다시 호출해 위 계산을 재실행 + 다시 그린다.
//   4) 알림 항목을 클릭하면 common.js의 handleNotificationClick()이 읽음 처리 + 딥링크 이동을 담당한다
//      (딥링크 해석 로직 자체는 common.js에 있고 여기서는 그대로 호출만 함).

let notifAllItems = [];   // 서버에서 받아온 알림 원본 배열(필터링 전). 탭/정렬 전환 시 재요청 없이 이걸 재사용.
let notifCurrentTab = 'all';      // 현재 선택된 탭(all/notice/mention/event) — .notif-tab의 data-tab 값과 동일.
let notifCurrentFilter = 'all';   // 현재 선택된 정렬/읽음 필터 — #notif-sort-select의 value와 동일.

// 로그인한 유저의 최근 알림 최대 100건을 서버에서 가져온다.
// 헤더 드롭다운(loadNotificationList, common.js)은 50건만 가져오는 미리보기이고,
// 이 페이지는 "전체보기"이므로 더 넉넉한 limit을 사용한다.
async function fetchAllNotifications() {
  const res = await fetch(`${getApiBase()}/api/notifications?limit=100`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('알림 목록 조회 실패');
  return res.json();
}

// 탭 필터: 'all'이면 그대로 두고, 그 외에는 common.js의 getNotificationGroup()으로
// 알림의 type을 4개 탭 카테고리(notice/mention/event) 중 하나로 매핑해서 일치하는 것만 남긴다.
function filterByTab(items, tab) {
  if (tab === 'all') return items;
  return items.filter((item) => getNotificationGroup(item.type) === tab);
}

// createdAt 기준으로 오름차순('asc')/내림차순(그 외) 정렬한 새 배열을 반환.
// slice()로 원본 배열은 건드리지 않고 복사본만 정렬한다(notifAllItems 원본 보존).
function sortByDate(items, dir) {
  return items.slice().sort((a, b) => {
    const diff = new Date(a.createdAt) - new Date(b.createdAt);
    return dir === 'asc' ? diff : -diff;
  });
}

// 정렬 셀렉트(#notif-sort-select)의 value에 따라 목록을 가공한다.
// - oldest: 오래된 순으로 정렬
// - read/unread: 읽음 상태로 먼저 걸러낸 뒤 최신순 정렬
// - latest/all/그 외 기본값: 최신순 정렬(필터링 없음)
// 즉 'all'과 'latest'는 결과가 동일하지만, 셀렉트에는 "기본값(전체)"과 "명시적 최신순"을
// 구분해서 보여주기 위해 옵션을 따로 둔 것.
function applySortFilter(items, mode) {
  switch (mode) {
    case 'oldest':
      return sortByDate(items, 'asc');
    case 'read':
      return sortByDate(items.filter((item) => item.read), 'desc');
    case 'unread':
      return sortByDate(items.filter((item) => !item.read), 'desc');
    case 'latest':
    case 'all':
    default:
      return sortByDate(items, 'desc');
  }
}

// notifAllItems를 현재 탭/필터 상태에 맞게 가공해서 #notif-list를 다시 그린다.
// 탭 전환, 정렬 변경, 알림 클릭(읽음 처리) 등 상태가 바뀔 때마다 매번 통째로 재호출된다
// (부분 갱신이 아니라 매번 innerHTML을 새로 작성하는 방식 — 목록 규모가 최대 100건이라 단순하게 처리).
function renderNotifList() {
  const container = document.getElementById('notif-list');
  if (!container) return;

  // 탭 필터 → 정렬/읽음 필터 순서로 적용. notifAllItems 원본은 그대로 두고 파생 배열만 만든다.
  const tabbed = filterByTab(notifAllItems, notifCurrentTab);
  const finalList = applySortFilter(tabbed, notifCurrentFilter);

  if (!finalList.length) {
    container.innerHTML = '<p class="notif-empty">표시할 알림이 없습니다.</p>';
    return;
  }

  // 각 알림을 클릭 가능한 <button>으로 렌더링. 이동에 필요한 정보(알림 id, 딥링크,
  // 관련 리소스 id/타입)는 전부 data-* 속성에 담아두고, 실제 클릭 리스너는 아래에서
  // DOM 구성이 끝난 뒤 한 번에 붙인다(문자열 조립 → 이벤트 바인딩 순서로 나눠 더 빠르게 처리).
  container.innerHTML = finalList.map((item) => {
    const id = item._id || item.id;
    const label = NOTIFICATION_LABELS[item.type] || '알림';
    const actor = item.actorNickname ? `${item.actorNickname} · ` : '';
    return `
      <button type="button" class="notif-item ${item.read ? '' : 'unread'}"
              data-notification-id="${id}"
              data-link="${escapeNotificationHtml(item.link || '')}"
              data-resource-id="${item.resourceId || ''}"
              data-resource-type="${escapeNotificationHtml(item.resourceType || '')}">
        <div class="notif-item-top">
          <span class="notif-item-label">${label}</span>
          <span class="notif-item-time">${formatNotificationTime(item.createdAt)}</span>
        </div>
        <div class="notif-item-title">${escapeNotificationHtml(item.title || '')}</div>
        <div class="notif-item-message">${escapeNotificationHtml(actor)}${escapeNotificationHtml(item.message || '')}</div>
      </button>
    `;
  }).join('');

  // innerHTML로 목록 전체를 그린 뒤, data-notification-id가 있는 버튼마다 클릭 리스너를 붙인다.
  // (innerHTML 재작성 시 이전 리스너는 자동으로 사라지므로 매 렌더링마다 새로 등록해야 함.)
  container.querySelectorAll('[data-notification-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-notification-id');
      // 실제 "읽음 처리 API 호출 + 딥링크 URL 계산 + 페이지 이동"은 common.js의
      // handleNotificationClick()이 전담한다(헤더 벨 드롭다운과 동일 로직 재사용).
      handleNotificationClick(
        id,
        btn.getAttribute('data-link'),
        btn.getAttribute('data-resource-id'),
        btn.getAttribute('data-resource-type'),
      );

      // 링크가 없어 페이지 이동이 안 일어나는 경우를 대비해 읽음 상태만 즉시 반영.
      const target = notifAllItems.find((n) => String(n._id || n.id) === id);
      if (target) target.read = true;
      renderNotifList();
    });
  });
}

// 상단 탭(전체/공지/멘션/이벤트) 클릭 이벤트 등록.
// 클릭한 탭에만 active 클래스를 남기고 나머지는 지운 뒤, 전역 상태(notifCurrentTab)를
// 갱신해서 renderNotifList()를 다시 호출한다 — 서버 재요청 없이 캐시된 notifAllItems를 재필터링.
function bindNotifTabs() {
  document.querySelectorAll('.notif-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.notif-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      notifCurrentTab = tab.dataset.tab;
      renderNotifList();
    });
  });
}

// 정렬/읽음 필터 셀렉트(#notif-sort-select)의 change 이벤트 등록.
// 값이 바뀌면 notifCurrentFilter를 갱신하고 목록을 다시 그린다(탭과 마찬가지로 재요청 없음).
function bindNotifSortSelect() {
  const select = document.getElementById('notif-sort-select');
  select?.addEventListener('change', () => {
    notifCurrentFilter = select.value;
    renderNotifList();
  });
}

// 페이지 진입점. DOMContentLoaded에서 호출된다.
// 순서: 로그인 가드 → 탭/셀렉트 이벤트 바인딩 → (정적 배포 환경이면 안내만 띄우고 중단) →
//       서버에서 알림 100건 로드 → 최초 렌더링.
async function initNotificationsPage() {
  // 비로그인 상태면 알림 자체가 없으므로 즉시 로그인 페이지로 돌려보낸다.
  if (!isUserLoggedIn()) {
    alert('알림은 로그인 후 이용할 수 있습니다.');
    window.location.href = getBasePath() + 'user_login/login.html';
    return;
  }

  bindNotifTabs();
  bindNotifSortSelect();

  const listEl = document.getElementById('notif-list');

  // GitHub Pages 같은 정적 호스팅(백엔드 서버 없음) 환경에서는 API 호출이 애초에 불가능하므로,
  // 데이터를 요청하는 대신 안내 메시지만 띄우고 종료한다. getApiBase()가 이 값을 반환하는 조건은
  // common.js에 정의돼 있음.
  if (getApiBase() === 'GITHUB_STATIC') {
    if (listEl) listEl.innerHTML = '<p class="notif-empty">이 기능은 서버가 필요합니다. 로컬(:5000) 또는 배포된 사이트에서 이용해주세요.</p>';
    return;
  }

  if (listEl) listEl.innerHTML = '<p class="notif-empty">불러오는 중...</p>';

  try {
    notifAllItems = await fetchAllNotifications();
  } catch (err) {
    console.error('알림 목록 조회 실패:', err);
    if (listEl) listEl.innerHTML = '<p class="notif-empty">알림을 불러올 수 없습니다.</p>';
    return;
  }

  renderNotifList();
}

// 페이지 로드 시 자동 실행 — 이 페이지에는 다른 진입 트리거가 없으므로 DOMContentLoaded 하나로 충분.
document.addEventListener('DOMContentLoaded', initNotificationsPage);
