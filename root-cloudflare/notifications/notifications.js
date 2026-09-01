let notifAllItems = [];
let notifCurrentTab = 'all';
let notifCurrentFilter = 'all';

async function fetchAllNotifications() {
  const res = await fetch(`${getApiBase()}/api/notifications?limit=100`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('알림 목록 조회 실패');
  return res.json();
}

function filterByTab(items, tab) {
  if (tab === 'all') return items;
  return items.filter((item) => getNotificationGroup(item.type) === tab);
}

function sortByDate(items, dir) {
  return items.slice().sort((a, b) => {
    const diff = new Date(a.createdAt) - new Date(b.createdAt);
    return dir === 'asc' ? diff : -diff;
  });
}

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

function renderNotifList() {
  const container = document.getElementById('notif-list');
  if (!container) return;

  const tabbed = filterByTab(notifAllItems, notifCurrentTab);
  const finalList = applySortFilter(tabbed, notifCurrentFilter);

  if (!finalList.length) {
    container.innerHTML = '<p class="notif-empty">표시할 알림이 없습니다.</p>';
    return;
  }

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

  container.querySelectorAll('[data-notification-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-notification-id');
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

function bindNotifSortSelect() {
  const select = document.getElementById('notif-sort-select');
  select?.addEventListener('change', () => {
    notifCurrentFilter = select.value;
    renderNotifList();
  });
}

async function initNotificationsPage() {
  if (!isUserLoggedIn()) {
    alert('알림은 로그인 후 이용할 수 있습니다.');
    window.location.href = getBasePath() + 'user_login/login.html';
    return;
  }

  bindNotifTabs();
  bindNotifSortSelect();

  const listEl = document.getElementById('notif-list');

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

document.addEventListener('DOMContentLoaded', initNotificationsPage);
