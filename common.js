// ========================================================
// common.js - 모든 페이지 공통 스크립트 (Header / Footer 관리)
// ========================================================
// 목적: 
//   1. header.html / footer.html 동적 로드
//   2. admin/comments, Contact_us, tier-class 등 모든 하위 폴더에서 경로 자동 보정
//   3. 로고/제목 클릭 → [home.html -> index.html] 이동
//   4. 네비게이션(햄버거) 버튼 → 사이드 메뉴 열기/닫기
//   5. 푸터 '문의하기' 링크 → Contact_us/[index.html -> contact_us.html] 이동
// ========================================================

function getApiBase() {
  const { protocol, hostname, port } = window.location;

  // GitHub Pages (static preview only - no backend)
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

function isGitHubPagesPreview() {
  return /\.github\.io$/i.test(window.location.hostname);
}
let notificationPollTimer = null;

function getAuthHeaders(extraHeaders = {}) {
  const headers = { ...extraHeaders };
  const token = localStorage.getItem('authToken');
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
  return headers;
}

function getBasePath() {
  let pathname = window.location.pathname;
  console.log('📍 [common.js] 현재 페이지 경로:', pathname);

  // Remove filename if present to get directory
  if (pathname.includes('.')) {
    pathname = pathname.substring(0, pathname.lastIndexOf('/') + 1);
  }

  const segments = pathname.split('/').filter(Boolean);
  const isGitHubPages = /\.github\.io$/i.test(window.location.hostname);

  let ups;
  if (isGitHubPages && segments.length > 0) {
    // GitHub Pages project site: first segment is repo name, treat as site root
    // ups = total segments after repo = segments.length - 1
    ups = Math.max(0, segments.length - 1);
  } else {
    // Local / root deploy / custom domain: segments are the depth
    ups = segments.length;
  }

  return ups > 0 ? '../'.repeat(ups) : './';
}

// Fix root-absolute internal links (href starting with /) by prefixing getBasePath()
// This is critical for GitHub Pages project sites and sub-directory deploys.
function fixRootLinksInElement(container) {
  if (!container) return;
  const base = getBasePath();
  // Fix anchors
  container.querySelectorAll('a[href]').forEach(link => {
    let href = link.getAttribute('href');
    if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('javascript:')) return;
    if (href.startsWith('/')) {
      link.setAttribute('href', base + href.substring(1));
    } else if (!href.startsWith('.') && !href.startsWith('/') && !href.includes(':')) {
      link.setAttribute('href', base + href);
    }
  });
  // Fix images and other assets that may use root-relative paths without leading /
  container.querySelectorAll('img[src], link[href]').forEach(el => {
    const attr = el.hasAttribute('src') ? 'src' : 'href';
    let val = el.getAttribute(attr);
    if (!val || val.startsWith('http') || val.startsWith('#') || val.startsWith('data:') || val.startsWith('../') || val.startsWith('./')) return;
    if (val.startsWith('/')) {
      el.setAttribute(attr, base + val.substring(1));
    } else if (!val.includes('/')) {
      // e.g. "tier-image/xx.png" or just "logo.webp" treat as root relative
      el.setAttribute(attr, base + val);
    }
  });
}

function isUserLoggedIn() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  return !!user.nickname || localStorage.getItem('isAdmin') === 'true';
}

function buildTierPostDetailUrl(postId, commentId = null) {
  const safeId = encodeURIComponent(String(postId || '').trim());
  if (!safeId) return null;

  let query = `id=${safeId}`;
  if (commentId) {
    query += `&comment=${encodeURIComponent(String(commentId))}`;
  }

  if (window.location.protocol === 'file:') {
    const path = window.location.pathname || '';
    if (path.includes('custom-maker_post') || path.includes('custom-maker\\custom-maker_post')) {
      return `post_detail.html?${query}`;
    }
    return `${getBasePath()}custom-maker/custom-maker_post/post_detail.html?${query}`;
  }

  // Use getBasePath() so it works on GitHub Pages project sites (subpath) and root deploys.
  return `${getBasePath()}custom-maker/custom-maker_post/post_detail.html?${query}`;
}

function resolveNotificationLink(link) {
  if (!link) return null;

  const trimmed = String(link).trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const tierMatch = trimmed.match(/post_detail\.html\?([^#]+)/i);
  if (tierMatch?.[1]) {
    const params = new URLSearchParams(tierMatch[1]);
    const postId = params.get('id');
    if (postId) {
      const resolved = buildTierPostDetailUrl(postId, params.get('comment'));
      if (resolved.startsWith('/') && window.location.protocol.startsWith('http')) {
        return `${window.location.origin}${resolved}`;
      }
      return resolved;
    }
  }

  if (trimmed.startsWith('/')) {
    if (window.location.protocol.startsWith('http')) {
      return `${window.location.origin}${trimmed}`;
    }
    return `${getBasePath()}${trimmed.slice(1)}`;
  }

  return `${getBasePath()}${trimmed}`;
}

const NOTIFICATION_SCROLL_KEY = 'notificationScrollTarget';

function rememberTierPostIdFromLink(link) {
  const resolved = resolveNotificationLink(link);
  if (!resolved) return;

  const match = resolved.match(/[?&]id=([a-fA-F0-9]{24})/i);
  if (match?.[1]) {
    sessionStorage.setItem('selectedPostId', match[1]);
  }
}

function enrichNotificationUrl(link, resourceId, resourceType) {
  const resolved = resolveNotificationLink(link);
  if (!resolved) return null;

  try {
    const url = new URL(resolved, window.location.href);

    if (url.pathname.includes('post_detail')) {
      if (!url.searchParams.get('comment') && resourceType === 'tierComment' && resourceId) {
        url.searchParams.set('comment', String(resourceId));
      }
    } else if (url.pathname.includes('contact_us')) {
      if (!url.searchParams.get('inquiry') && resourceType === 'inquiry' && resourceId) {
        url.searchParams.set('inquiry', String(resourceId));
      }
      if (!url.searchParams.get('answer') && resourceType === 'inquiryAnswer' && resourceId) {
        url.searchParams.set('answer', String(resourceId));
      }
    }

    if (url.origin === window.location.origin || window.location.protocol.startsWith('http')) {
      return `${url.origin}${url.pathname}${url.search}`;
    }
    return `${url.pathname}${url.search}`;
  } catch (err) {
    return resolved;
  }
}

function storeNotificationScrollTarget(link, resourceId, resourceType) {
  const targetUrl = enrichNotificationUrl(link, resourceId, resourceType) || resolveNotificationLink(link);
  if (!targetUrl) return null;

  try {
    const url = new URL(targetUrl, window.location.href);
    const payload = { page: null };

    if (url.pathname.includes('post_detail')) {
      payload.page = 'tierPost';
      payload.postId = url.searchParams.get('id') || '';
      payload.commentId = url.searchParams.get('comment')
        || (resourceType === 'tierComment' ? String(resourceId || '') : '');
    } else if (url.pathname.includes('contact_us')) {
      payload.page = 'inquiry';
      payload.inquiryId = url.searchParams.get('inquiry')
        || (resourceType === 'inquiry' ? String(resourceId || '') : '');
      payload.answerId = url.searchParams.get('answer')
        || (resourceType === 'inquiryAnswer' ? String(resourceId || '') : '');
    }

    if (payload.page) {
      sessionStorage.setItem(NOTIFICATION_SCROLL_KEY, JSON.stringify(payload));
    }
  } catch (err) {
    console.warn('알림 스크롤 타겟 저장 실패:', err);
  }

  return targetUrl;
}

window.getNotificationScrollTarget = function getNotificationScrollTarget() {
  try {
    const raw = sessionStorage.getItem(NOTIFICATION_SCROLL_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
};

window.clearNotificationScrollTarget = function clearNotificationScrollTarget() {
  sessionStorage.removeItem(NOTIFICATION_SCROLL_KEY);
};

function getProfileImageSrc() {
  const stored = localStorage.getItem('profileImage');
  if (stored) return stored;
  return getBasePath() + 'tier-image/logo.webp';
}

function bindProfileImageFallback(img) {
  if (!img) return;
  const fallback = getBasePath() + 'tier-image/logo.webp';
  img.addEventListener('error', () => {
    if (img.src !== fallback) img.src = fallback;
  }, { once: true });
}

// ========================================================
// 홈 이동 함수 (로고 + 제목 클릭용)
// ========================================================
function goHome() {
  const base = getBasePath();
  console.log('🏠 [common.js] goHome 실행 → base:', base);
  
  // admin, Contact_us 모두 정상 이동
  if (base === '../' || base === '../../') {
    window.location.href = base + 'index.html';
  } else {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

// ========================================================
// 사이드 메뉴 (네비게이션) 열고 닫기
// ========================================================
function toggleMenu() {
  const menu = document.getElementById("sideMenu");
  if (!menu) {
    console.warn('⚠️ sideMenu 요소를 찾지 못했습니다.');
    return;
  }
  // 인라인 style이 비어 있으면 CSS 기본(닫힘)으로 보고 연다
  const isOpen = menu.style.right === "0px" || menu.classList.contains("is-open");
  if (isOpen) {
    menu.style.right = "-100%";
    menu.classList.remove("is-open");
  } else {
    menu.style.right = "0px";
    menu.classList.add("is-open");
  }
}

function closeMenu() {
  const menu = document.getElementById("sideMenu");
  if (menu) {
    menu.style.right = "-100%";
    menu.classList.remove("is-open");
  }
}

// ========================================================
// 이미지 경로 자동 보정 (로고 404 해결)
// ========================================================
function fixImagePaths(base) {
  const logoImg = document.querySelector('#header-placeholder .logo-img');
  if (logoImg) {
    logoImg.src = base + 'tier-image/logo.webp';
    console.log('✅ [common.js] 로고 이미지 경로 보정 완료 →', logoImg.src);
  }
}

// ====================== 공지사항 모달 (common.js로 이동) ======================
function showNoticeModal(id) {
  const modal = document.getElementById('notice-modal');
  if (!modal) {
    console.error('❌ notice-modal 요소를 찾을 수 없습니다.');
    return;
  }

  const titleEl = document.getElementById('notice-modal-title');
  const dateEl = document.getElementById('notice-modal-date');
  const contentEl = document.getElementById('notice-modal-content');

  const notices = {
    1: { title: "v1.3.0 업데이트 안내", date: "2일 전", content: "새로운 티어 계산 로직 적용 및 전체 UI/UX 개선 작업이 완료되었습니다." },
    2: { title: "이미지 로딩 최적화 완료", date: "5일 전", content: "티어 카드 및 캐릭터 이미지 로딩 속도가 크게 개선되었습니다." },
    3: { title: "커스텀 메이커 제작 이벤트 오픈", date: "오늘", content: "나만의 티어를 만들어 공유하고 특별 뱃지를 받아보세요!" },
    4: { title: "행운 뽑기 2배 이벤트 진행 중", date: "3일 전", content: "이벤트 기간 동안 행운의 티어 뽑기 보상이 2배로 지급됩니다." }
  };

  const notice = notices[id];
  if (notice) {
    titleEl.textContent = notice.title;
    dateEl.textContent = notice.date;
    contentEl.textContent = notice.content;
  }

  modal.style.display = 'flex';   // ← 모달 표시
  console.log('✅ 모달 열림 (id:', id, ')');
}

function closeNoticeModal() {
  const modal = document.getElementById('notice-modal');
  if (modal) modal.style.display = 'none';
}

// ========================================================
// header / footer 실제 로드 + 이벤트 부착
// ========================================================
function loadCommon() {
  const base = getBasePath();
  console.log('🔄 [common.js] loadCommon 시작 - base:', base);

  Promise.all([
    fetch(base + 'header.html').then(r => { 
      if (!r.ok) throw new Error('header.html 404'); 
      return r.text(); 
    }),
    fetch(base + 'footer.html').then(r => { 
      if (!r.ok) throw new Error('footer.html 404'); 
      return r.text(); 
    })
  ])
  .then(([headerHTML, footerHTML]) => {
    // HTML 삽입
    document.getElementById('header-placeholder').innerHTML = headerHTML;
    document.getElementById('footer-placeholder').innerHTML = footerHTML;

    // Fix any root-absolute links in the loaded header/footer for GitHub Pages / subpath deploys
    fixRootLinksInElement(document.getElementById('header-placeholder'));
    fixRootLinksInElement(document.getElementById('footer-placeholder'));

    // ★★★ 핵심: 이벤트 부착 + 이미지 보정 + 푸터 링크 보정
    attachHeaderEvents();
    fixImagePaths(base);
    fixFooterLinks(base);

    renderUserProfile();
    renderNotificationBell();
    renderHeaderLoginButton();

    initSideMenuDropdowns();     // ← 이 줄이 있어야 합니다

    ensurePwaAssets(base);

    console.log('✅ [common.js] Header & Footer + 모든 이벤트 완전 로드 완료!');
  })
  .catch(err => {
    console.error('❌ [common.js] fetch 실패:', err);
    console.log('⚠️ fallback으로 다시 시도합니다...');
    fallbackLoadHeaderFooter(base);
  });
}

// fallback (fetch가 실패했을 때 안전장치)
function fallbackLoadHeaderFooter(base) {
  Promise.all([
    fetch(base + 'header.html').then(r => r.text()),
    fetch(base + 'footer.html').then(r => r.text())
  ]).then(([headerHTML, footerHTML]) => {
    document.getElementById('header-placeholder').innerHTML = headerHTML;
    document.getElementById('footer-placeholder').innerHTML = footerHTML;

    fixRootLinksInElement(document.getElementById('header-placeholder'));
    fixRootLinksInElement(document.getElementById('footer-placeholder'));
    
    attachHeaderEvents();
    fixImagePaths(base);
    fixFooterLinks(base);

    renderUserProfile();
    renderNotificationBell();
    renderHeaderLoginButton();

    console.log('✅ Header & Footer + 모든 이벤트 완전 로드 완료!');
  })
}

// ========================================================
// 헤더 이벤트 부착 (로고 클릭 + 메뉴 버튼)
// ========================================================
function attachHeaderEvents() {
  // 1. 로고 (id="logo" 또는 class="logo")
  const logoById = document.getElementById('logo');
  const logoByClass = document.querySelector('#header-placeholder .logo');

  if (logoById) {
    logoById.addEventListener('click', goHome);
    console.log('✅ id="logo" 클릭 이벤트 등록');
  }
  if (logoByClass) {
    logoByClass.style.cursor = 'pointer';
    logoByClass.addEventListener('click', goHome);
    console.log('✅ class="logo" 클릭 이벤트 등록 (제목+로고 전체 클릭 가능)');
  }

  // 2. 네비게이션 버튼 (햄버거 메뉴)
  const menuBtn = document.getElementById('menuBtn');
  const closeBtn = document.getElementById('closeBtn');
  if (menuBtn) menuBtn.addEventListener('click', toggleMenu);
  if (closeBtn) closeBtn.addEventListener('click', closeMenu);
}

// ========================================================
// 푸터 '문의하기' 링크 보정
// ========================================================
function fixFooterLinks(base) {
  const contactLink = document.getElementById('contact-link');
  if (contactLink) {
    contactLink.href = base + 'Contact_us/contact_us.html';
    console.log('✅ [common.js] 문의하기 링크 보정 완료 →', contactLink.href);
  }
}

// ========================================================
// PWA: manifest 링크 + Service Worker 등록
// ========================================================
function ensurePwaAssets(base) {
  try {
    if (!document.querySelector('meta[name="theme-color"]')) {
      const theme = document.createElement('meta');
      theme.name = 'theme-color';
      theme.content = '#111111';
      document.head.appendChild(theme);
    }

    if (!document.querySelector('link[rel="manifest"]')) {
      const link = document.createElement('link');
      link.rel = 'manifest';
      link.href = base + 'manifest.webmanifest';
      document.head.appendChild(link);
    }

    if (!document.querySelector('link[rel="apple-touch-icon"]')) {
      const apple = document.createElement('link');
      apple.rel = 'apple-touch-icon';
      apple.href = base + 'tier-image/pwa/icon-192.png';
      document.head.appendChild(apple);
    }

    registerServiceWorker(base);
  } catch (e) {
    console.warn('[PWA] ensurePwaAssets failed', e);
  }
}

function registerServiceWorker(base) {
  if (!('serviceWorker' in navigator)) return;
  // file:// 또는 GitHub Pages 정적 프리뷰(API 없음)에서도 SW는 등록 가능하나,
  // API 의존 기능은 여전히 백엔드 배포 URL 사용을 권장.
  if (window.location.protocol === 'file:') return;

  const swUrl = new URL((base || './') + 'sw.js', window.location.href);
  const scopeUrl = new URL(base || './', window.location.href);

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(swUrl.href, { scope: scopeUrl.href })
      .then((reg) => {
        console.log('[PWA] SW registered', reg.scope);
      })
      .catch((err) => {
        console.warn('[PWA] SW register failed', err);
      });
  });
}

// 페이지 로드되면 자동 실행
document.addEventListener('DOMContentLoaded', loadCommon);


// ========================================================
// [추가] Admin 프로필 + 모달 기능 (헤더에 동적으로 삽입)
// ========================================================

function isAdminLoggedIn() {
  return localStorage.getItem("isAdmin") === "true";
}

function getAdminInfo() {
  return {
    name: localStorage.getItem("adminName") || "관리자",
    ip: localStorage.getItem("adminIp") || "공유 IP"
  };
}

function renderHeaderLoginButton() {
  const loginBtn = document.querySelector('#header-placeholder #header-login-btn');
  if (!loginBtn) return;

  if (isUserLoggedIn()) {
    loginBtn.hidden = true;
    return;
  }

  loginBtn.hidden = false;
  loginBtn.href = `${getBasePath()}user_login/login.html`;
}

// ========================================================
// 로그인한 사용자 프로필 아이콘 표시 (일반 유저 + 어드민 공통)
// ========================================================
function renderUserProfile() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = localStorage.getItem("isAdmin") === "true";

  if (!user.nickname && !isAdmin) return;

  const header = document.getElementById('header-placeholder');
  if (!header) return;

  // 햄버거 메뉴 버튼 찾기
  const menuBtn = header.querySelector('#menuBtn') || 
                  header.querySelector('.menu-btn') || 
                  header.querySelector('button[onclick*="toggleMenu"]');

  if (!menuBtn) {
    console.warn('햄버거 메뉴 버튼을 찾을 수 없습니다.');
    return;
  }

  const profileHTML = `
    <div id="header-user-actions" class="header-user-actions">
      <div id="user-profile" class="user-profile-btn">
        <div class="user-profile-avatar">
          <img id="profile-img"
               src="${getProfileImageSrc()}"
               alt="프로필">
        </div>
      </div>
    </div>
  `;

  menuBtn.insertAdjacentHTML('beforebegin', profileHTML);

  bindProfileImageFallback(document.getElementById('profile-img'));

  // 클릭 이벤트
  const profileEl = document.getElementById('user-profile');
  if (profileEl) {
    profileEl.addEventListener('click', () => {
      if (isAdmin) {
        showAdminModal();      // 어드민 전용 모달
      } else {
        showUserModal();       // 일반 유저 모달
      }
    });
  }
}

function escapeNotificationHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const NOTIFICATION_LABELS = {
  tier_post_comment: '메이커 게시판',
  tier_comment_reply: '메이커 게시판',
  tier_comment_mention: '메이커 게시판',
  inquiry_answer: '문의사항',
  inquiry_mention: '문의사항',
  notice: '공지사항',
  news: '새 소식',
};

function formatNotificationTime(dateStr) {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return date.toLocaleDateString('ko-KR');
}

function renderNotificationBell() {
  if (!isUserLoggedIn()) return;
  if (isGitHubPagesPreview && isGitHubPagesPreview()) return; // static preview has no backend

  const profileEl = document.getElementById('user-profile');
  if (!profileEl) return;

  if (document.getElementById('notification-bell')) return;

  const bellHTML = `
    <div id="notification-bell" class="notification-bell">
      <button type="button" id="notification-bell-btn" class="notification-bell-btn" aria-label="알림">
        <span class="notification-bell-icon">🔔</span>
        <span id="notification-badge" class="notification-badge" hidden>0</span>
      </button>
      <div id="notification-panel" class="notification-panel">
        <div class="notification-panel-header">
          <strong>알림</strong>
          <button type="button" id="notification-settings-btn" class="notification-settings-btn" aria-label="알림 설정">⚙</button>
        </div>
        <div id="notification-list" class="notification-list">
          <div class="notification-empty">알림을 불러오는 중...</div>
        </div>
      </div>
    </div>
  `;

  profileEl.insertAdjacentHTML('beforebegin', bellHTML);

  const bellBtn = document.getElementById('notification-bell-btn');
  const panel = document.getElementById('notification-panel');
  const settingsBtn = document.getElementById('notification-settings-btn');

  bellBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleNotificationPanel();
  });

  settingsBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    openNotificationSettingsModal();
  });

  document.addEventListener('click', closeNotificationPanelOnOutsideClick);
  refreshNotificationBadge();
  startNotificationPolling();
}

function isNotificationPanelOpen() {
  return document.getElementById('notification-panel')?.classList.contains('is-open') ?? false;
}

function toggleNotificationPanel() {
  const panel = document.getElementById('notification-panel');
  if (!panel) return;

  const willOpen = !panel.classList.contains('is-open');
  panel.classList.toggle('is-open', willOpen);

  if (willOpen) {
    loadNotificationList();
  }
}

function closeNotificationPanel() {
  const panel = document.getElementById('notification-panel');
  if (panel) panel.classList.remove('is-open');
}

function closeNotificationPanelOnOutsideClick(e) {
  const bell = document.getElementById('notification-bell');
  const panel = document.getElementById('notification-panel');
  if (!bell || !panel || !isNotificationPanelOpen()) return;
  if (!bell.contains(e.target)) {
    closeNotificationPanel();
  }
}

async function refreshNotificationBadge() {
  const badge = document.getElementById('notification-badge');
  if (!badge || !isUserLoggedIn()) return;
  if (isGitHubPagesPreview && isGitHubPagesPreview()) return;

  const apiBase = getApiBase();
  if (apiBase === 'GITHUB_STATIC') return;

  try {
    const response = await fetch(`${apiBase}/api/notifications/unread-count`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) return;

    const data = await response.json();
    const count = data.count || 0;
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : String(count);
      badge.hidden = false;
    } else {
      badge.hidden = true;
    }
  } catch (err) {
    console.error('알림 배지 갱신 실패:', err);
  }
}

async function loadNotificationList() {
  const listEl = document.getElementById('notification-list');
  if (!listEl) return;

  listEl.innerHTML = '<div class="notification-empty">알림을 불러오는 중...</div>';

  try {
    const response = await fetch(`${getApiBase()}/api/notifications?limit=50`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('알림 목록 조회 실패');

    const notifications = await response.json();
    if (!notifications.length) {
      listEl.innerHTML = '<div class="notification-empty">새 알림이 없습니다.</div>';
      return;
    }

    listEl.innerHTML = notifications.map((item) => {
      const id = item._id || item.id;
      const label = NOTIFICATION_LABELS[item.type] || '알림';
      const actor = item.actorNickname ? `${item.actorNickname} · ` : '';
      return `
        <button type="button" class="notification-item ${item.read ? '' : 'unread'}"
                data-notification-id="${id}"
                data-link="${escapeNotificationHtml(item.link || '')}"
                data-resource-id="${item.resourceId || ''}"
                data-resource-type="${escapeNotificationHtml(item.resourceType || '')}">
          <div class="notification-item-top">
            <span class="notification-item-label">${label}</span>
            <span class="notification-item-time">${formatNotificationTime(item.createdAt)}</span>
          </div>
          <div class="notification-item-title">${escapeNotificationHtml(item.title || '')}</div>
          <div class="notification-item-message">${escapeNotificationHtml(actor)}${escapeNotificationHtml(item.message || '')}</div>
        </button>
      `;
    }).join('');

    listEl.querySelectorAll('[data-notification-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        handleNotificationClick(
          btn.getAttribute('data-notification-id'),
          btn.getAttribute('data-link'),
          btn.getAttribute('data-resource-id'),
          btn.getAttribute('data-resource-type'),
        );
      });
    });
  } catch (err) {
    console.error(err);
    listEl.innerHTML = '<div class="notification-empty">알림을 불러올 수 없습니다.</div>';
  }
}

async function handleNotificationClick(notificationId, link, resourceId, resourceType) {
  closeNotificationPanel();

  fetch(`${getApiBase()}/api/notifications/${notificationId}/read`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  }).catch((err) => console.error('알림 읽음 처리 실패:', err));

  const targetUrl = storeNotificationScrollTarget(link, resourceId, resourceType);
  if (targetUrl) {
    rememberTierPostIdFromLink(targetUrl);
    window.location.href = targetUrl;
    return;
  }

  refreshNotificationBadge();
}

function startNotificationPolling() {
  if (notificationPollTimer) clearInterval(notificationPollTimer);
  if (!isUserLoggedIn()) return;

  notificationPollTimer = setInterval(() => {
    refreshNotificationBadge();
  }, 60000);
}

async function openNotificationSettingsModal() {
  closeNotificationPanel();

  let settings = {
    enabled: true,
    tierBoard: true,
    inquiry: true,
    noticeNews: true,
  };

  try {
    const response = await fetch(`${getApiBase()}/api/notifications/settings`, {
      headers: getAuthHeaders(),
    });
    if (response.ok) {
      settings = await response.json();
    }
  } catch (err) {
    console.error('알림 설정 조회 실패:', err);
  }

  const existing = document.getElementById('notification-settings-modal');
  if (existing) existing.remove();

  const modalHTML = `
    <div id="notification-settings-modal" class="notification-settings-modal">
      <div class="notification-settings-backdrop"></div>
      <div class="notification-settings-card">
        <div class="notification-settings-header">
          <h3>알림 설정</h3>
          <button type="button" class="notification-settings-close" aria-label="닫기">×</button>
        </div>
        <label class="notification-setting-row master">
          <span>알림 받기</span>
          <input type="checkbox" id="notif-setting-enabled" ${settings.enabled ? 'checked' : ''}>
        </label>
        <button type="button" id="notif-specific-toggle" class="notification-specific-toggle">
          특정 알림만 받기 <span class="arrow">▼</span>
        </button>
        <div id="notif-specific-list" class="notification-specific-list" hidden>
          <label class="notification-setting-row">
            <span>메이커 게시판</span>
            <input type="checkbox" id="notif-setting-tierBoard" ${settings.tierBoard ? 'checked' : ''}>
          </label>
          <label class="notification-setting-row">
            <span>문의사항 댓글</span>
            <input type="checkbox" id="notif-setting-inquiry" ${settings.inquiry ? 'checked' : ''}>
          </label>
          <label class="notification-setting-row">
            <span>공지사항 &amp; 새소식</span>
            <input type="checkbox" id="notif-setting-noticeNews" ${settings.noticeNews ? 'checked' : ''}>
          </label>
        </div>
        <button type="button" id="notif-settings-save" class="notification-settings-save">저장</button>
        <div class="notification-settings-divider"></div>
        <button type="button" id="notif-settings-delete" class="notification-settings-delete">알림 기록 삭제</button>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);

  const modal = document.getElementById('notification-settings-modal');
  const specificToggle = document.getElementById('notif-specific-toggle');
  const specificList = document.getElementById('notif-specific-list');

  modal.querySelector('.notification-settings-close')?.addEventListener('click', closeNotificationSettingsModal);
  modal.querySelector('.notification-settings-backdrop')?.addEventListener('click', closeNotificationSettingsModal);

  specificToggle?.addEventListener('click', () => {
    const isHidden = specificList.hidden;
    specificList.hidden = !isHidden;
    specificToggle.classList.toggle('open', isHidden);
  });

  document.getElementById('notif-settings-save')?.addEventListener('click', saveNotificationSettings);
  document.getElementById('notif-settings-delete')?.addEventListener('click', deleteNotificationHistory);
}

function closeNotificationSettingsModal() {
  document.getElementById('notification-settings-modal')?.remove();
}

async function deleteNotificationHistory() {
  if (!confirm('모든 알림 기록을 삭제할까요?\n삭제한 기록은 복구할 수 없습니다.')) return;

  try {
    const response = await fetch(`${getApiBase()}/api/notifications`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const data = await response.json();

    if (response.ok && data.success) {
      const listEl = document.getElementById('notification-list');
      if (listEl) {
        listEl.innerHTML = '<div class="notification-empty">새 알림이 없습니다.</div>';
      }
      refreshNotificationBadge();
      alert('알림 기록이 삭제되었습니다.');
      closeNotificationSettingsModal();
    } else {
      alert('❌ ' + (data.error || '알림 기록 삭제에 실패했습니다.'));
    }
  } catch (err) {
    console.error(err);
    alert('❌ 서버와 연결할 수 없습니다.');
  }
}

async function saveNotificationSettings() {
  const payload = {
    enabled: document.getElementById('notif-setting-enabled')?.checked ?? true,
    tierBoard: document.getElementById('notif-setting-tierBoard')?.checked ?? true,
    inquiry: document.getElementById('notif-setting-inquiry')?.checked ?? true,
    noticeNews: document.getElementById('notif-setting-noticeNews')?.checked ?? true,
  };

  try {
    const response = await fetch(`${getApiBase()}/api/notifications/settings`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await response.json();

    if (response.ok && data.success) {
      alert('알림 설정이 저장되었습니다.');
      closeNotificationSettingsModal();
    } else {
      alert('❌ ' + (data.error || '설정 저장에 실패했습니다.'));
    }
  } catch (err) {
    console.error(err);
    alert('❌ 서버와 연결할 수 없습니다.');
  }
}


// 일반 유저 프로필 모달
function showUserModal() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const modalHTML = `
    <div id="user-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 9999; display: flex; align-items: center; justify-content: center;">
      <div style="background: white; width: 360px; border-radius: 16px; padding: 30px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
        
        <!-- 프로필 사진 -->
        <div style="margin-bottom: 20px;">
          <img id="modal-profile-img" 
               src="${getProfileImageSrc()}" 
               alt="프로필"
               style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 3px solid #8faadc;">
        </div>

        <h2 style="margin: 0 0 8px 0; color: #333;">${user.nickname || '사용자'}</h2>
        <p style="color: #666; font-size: 14px; margin-bottom: 25px;">${user.email || ''}</p>

        <button onclick="goToCustomBoard()" style="
          width: 100%; padding: 14px; background: #8faadc; color: white; border: none; 
          border-radius: 8px; font-size: 16px; cursor: pointer; margin-bottom: 12px;">
          📋 커스텀 게시판 보기
        </button>

        <button onclick="changeProfileImage()" style="
          width: 100%; padding: 14px; background: #6c757d; color: white; border: none; 
          border-radius: 8px; font-size: 16px; cursor: pointer; margin-bottom: 12px;">
          📷 프로필 사진 변경
        </button>

        <button onclick="logout()" style="
          width: 100%; padding: 14px; background: #dc3545; color: white; border: none; 
          border-radius: 8px; font-size: 16px; cursor: pointer;">
          로그아웃
        </button>

        <div onclick="closeUserModal()" style="margin-top: 20px; color: #999; cursor: pointer; font-size: 14px;">
          ✕ 닫기
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);
  bindProfileImageFallback(document.getElementById('modal-profile-img'));
}

function closeUserModal() {
  const modal = document.getElementById('user-modal');
  if (modal) modal.remove();
}

function goToCustomBoard() {
  closeUserModal();

  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('user') || 'null');
  } catch (err) {
    user = null;
  }

  if (!user?.nickname) {
    alert('내 게시글을 보려면 로그인이 필요합니다.');
    window.location.href = `${getBasePath()}user_login/login.html`;
    return;
  }

  const nickname = encodeURIComponent(user.nickname);
  window.location.href = getBasePath() + `custom-maker/custom-maker_post/custom-maker_post.html?search=@${nickname}`;
}

// 프로필 사진 변경
function changeProfileImage() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';

  input.onchange = function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(ev) {
      const base64 = ev.target.result;
      localStorage.setItem('profileImage', base64);

      // 현재 보이는 프로필 이미지 즉시 변경
      const img = document.getElementById('profile-img');
      if (img) img.src = base64;

      // 모달 안의 이미지들도 변경
      const modalImg = document.getElementById('modal-profile-img');
      if (modalImg) modalImg.src = base64;

      closeUserModal();
    };
    reader.readAsDataURL(file);
  };

  input.click();
}

// 로그아웃
function logout() {
  if (confirm("정말 로그아웃 하시겠습니까?")) {
    localStorage.removeItem("user");
    localStorage.removeItem("authToken");
    localStorage.removeItem("adminAuthToken");
    localStorage.removeItem("isAdmin");
    localStorage.removeItem("adminName");
    localStorage.removeItem("adminIp");
    localStorage.removeItem("profileImage");
    closeUserModal();
    location.reload();
  }
}


// ========================================================
// 어드민 모달 (이름 + 파란 체크 + 공유 IP + 관리하기 버튼)
// ========================================================
function getAdminInfo() {
  return {
    name: localStorage.getItem("adminName") || "관리자",
    ip: localStorage.getItem("adminIp") || "공유 IP"
  };
}

function showAdminModal() {
  const admin = getAdminInfo();

  const modalHTML = `
    <div id="admin-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 9999; display: flex; align-items: center; justify-content: center;">
      <div style="background: white; width: 380px; border-radius: 16px; padding: 30px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
        <div style="font-size: 60px; margin-bottom: 15px;">👑</div>
        <h2 style="margin: 0 0 8px 0; color: #333;">
          <span style="color: #007bff;">✔</span> ${admin.name}
        </h2>
        <p style="color: #666; font-size: 15px; margin: 0 0 25px 0;">
          공유 IP: <strong>${admin.ip}</strong>
        </p>
        
        <button onclick="window.location.href=getBasePath() + 'admin/comments/comment-management.html'" style="
          width: 100%; padding: 14px; background: #007bff; color: white; border: none; 
          border-radius: 8px; font-size: 16px; cursor: pointer; margin-bottom: 12px;">
          📋 관리하기 (댓글 관리)
        </button>
        
        <button onclick="logoutAdmin()" style="
          width: 100%; padding: 14px; background: #dc3545; color: white; border: none; 
          border-radius: 8px; font-size: 16px; cursor: pointer; margin-bottom: 12px;">
          로그아웃
        </button>
        
        <div onclick="closeAdminModal()" style="margin-top: 20px; color: #999; cursor: pointer; font-size: 14px;">
          ✕ 닫기
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeAdminModal() {
  const modal = document.getElementById('admin-modal');
  if (modal) modal.remove();
}

function logoutAdmin() {
  if (confirm("로그아웃 하시겠습니까?")) {
    localStorage.removeItem("authToken");
    localStorage.removeItem("adminAuthToken");
    localStorage.removeItem("isAdmin");
    localStorage.removeItem("adminName");
    localStorage.removeItem("adminIp");
    closeAdminModal();
    location.reload();
  }
}

// ========================================================
// 백업용 goToAdminPage (모달에서 직접 href를 사용하므로 거의 호출 안 됨)
// ========================================================
function goToAdminPage() {
  closeAdminModal();
  window.location.href = getBasePath() + "admin/comments/comment-management.html";
  console.log('✅ goToAdminPage 실행 → admin/comments/comment-management.html');
}

function logoutAdmin() {
  if (confirm("로그아웃 하시겠습니까?")) {
    localStorage.removeItem("authToken");
    localStorage.removeItem("adminAuthToken");
    localStorage.removeItem("isAdmin");
    localStorage.removeItem("adminName");
    localStorage.removeItem("adminIp");
    closeAdminModal();
    location.reload();
  }
}

// ========================================================
// loadCommon() 끝난 후 프로필 렌더링 호출 (기존 loadCommon 함수 안에 추가)
// ========================================================
// loadCommon()의 .then() 블록 맨 마지막에 아래 한 줄 추가:
    // renderAdminProfile();   // ← 이 줄 추가



// ========================================================
// 사이드 메뉴 드롭다운 클릭 토글 (모바일용)
// ========================================================
function initSideMenuDropdowns() {
  const toggles = document.querySelectorAll('.side-dropdown .dropdown-toggle');
  
  toggles.forEach(toggle => {
    toggle.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopImmediatePropagation();   // ← 호버 이벤트 차단 강화
      
      const parent = this.parentElement;
      
      // 다른 드롭다운 모두 닫기
      document.querySelectorAll('.side-dropdown').forEach(item => {
        if (item !== parent) item.classList.remove('active');
      });
      
      // 현재 항목 토글
      parent.classList.toggle('active');
    });
  });
}

// loadCommon() 함수의 .then() 블록 안에 아래 한 줄 추가
// attachHeaderEvents(); 아래에 넣어주세요
    // initSideMenuDropdowns();