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

// ========================================================
// [설정] 후원 프로필 링크
// 헤더 커피 아이콘이 이 주소로 이동합니다. 본인 후원 페이지 URL을 넣으세요.
// 예: 'https://buymeacoffee.com/your_id'
// ========================================================
const SPONSOR_PROFILE_URL = 'buymeacoffee.com/limjinhengm';

// ========================================================
// API 서버 주소(base) 판별
// ========================================================
// 이 사이트는 배포 환경에 따라 API를 호출할 주소가 달라진다.
//   - GitHub Pages(정적 미리보기, 백엔드 없음) → 'GITHUB_STATIC' 이라는 특수 값을 반환해서
//     호출부(fetch 하는 곳들)가 "여긴 API가 아예 없다"를 알고 요청을 건너뛸 수 있게 함
//   - 로컬에서 Live Server 등 별도 정적 서버(5500/3000 등 포트)로 열었을 때
//     → 항상 http://localhost:5000 (백엔드 서버)을 바라보게 고정
//   - 그 외(Render 배포, 또는 backend가 프론트까지 같이 서빙하는 :5000 로컬 실행)
//     → 같은 오리진에서 API를 호출하면 되므로 빈 문자열('') 반환 (상대경로 /api/... 그대로 사용)
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

// GitHub Pages 정적 미리보기인지 여부만 따로 뗀 헬퍼 (여러 곳에서 재사용)
function isGitHubPagesPreview() {
  return /\.github\.io$/i.test(window.location.hostname);
}

// 알림 배지를 주기적으로 갱신하는 setInterval 타이머 id.
// startNotificationPolling()에서 세팅하고, 중복 등록 방지를 위해 재시작 전에 clearInterval 함.
let notificationPollTimer = null;

// ========================================================
// 로그인 API 요청용 헤더 생성
// ========================================================
// localStorage에 저장된 JWT(authToken)가 있으면 Authorization 헤더에 붙여준다.
// 로그인 안 한 상태에서 호출해도 에러 없이 그냥 토큰 없는 헤더만 반환(공개 API에도 그대로 재사용 가능).
function getAuthHeaders(extraHeaders = {}) {
  const headers = { ...extraHeaders };
  const token = localStorage.getItem('authToken');
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
  return headers;
}

// ========================================================
// 현재 페이지 깊이 기준 상대 경로(base) 계산
// ========================================================
// 이 사이트는 절대경로(/xxx)를 하드코딩하지 않고, 항상 "현재 페이지에서 사이트 루트까지 몇 단계
// 올라가야 하는지"를 계산해서 그만큼 '../'를 반복한 문자열을 돌려준다. 예)
//   루트(index.html)          → './'
//   tier-class/tier1.html     → '../'
//   custom-maker/custom-maker_post/post_detail.html → '../../'
// 이렇게 하면 로컬(:5000), Render 배포, GitHub Pages 서브패스 어디서 열어도
// 이미지/링크/스크립트 경로가 전부 올바르게 맞는다.
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

// ========================================================
// 컨테이너 안의 절대경로(/로 시작) 링크·이미지를 상대경로로 자동 보정
// ========================================================
// header.html/footer.html은 fetch로 통째로 불러와서 innerHTML로 끼워 넣는 방식이라,
// 그 안에 있는 <a href="/xxx">나 <img src="tier-media/...">처럼 "루트 기준" 경로는
// 페이지가 몇 단계 깊이에 있든 상관없이 항상 getBasePath() 결과를 앞에 붙여줘야 정확히 연결된다.
// loadCommon()에서 header/footer를 삽입한 직후 반드시 호출한다.
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
      // e.g. "tier-media/xx.png" or just "logo.webp" treat as root relative
      el.setAttribute(attr, base + val);
    }
  });
}

// 일반 유저(user.nickname 존재) 또는 관리자(isAdmin=true) 둘 중 하나라도 로그인 상태면 true.
// 헤더 프로필/알림 아이콘 표시 여부, 각 페이지의 "로그인 필요" 가드에서 두루 쓰인다.
function isUserLoggedIn() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  return !!user.nickname || localStorage.getItem('isAdmin') === 'true';
}

// ========================================================
// 커스텀 게시글 상세페이지 URL 조립
// ========================================================
// 게시글 ID(+선택적으로 댓글 ID)를 받아서 post_detail.html로 가는 링크를 만든다.
// file:// 로 직접 연 경우와 http(s)로 서빙되는 경우 상대경로 계산 방식이 달라서 따로 분기했고,
// 그 외에는 getBasePath()로 현재 깊이에 맞게 조립한다. 알림 클릭 시 딥링크로 이동할 때도 재사용됨.
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

// ========================================================
// 알림 딥링크 처리 (알림 클릭 → 정확한 상세 위치로 이동)
// ========================================================
// 백엔드가 알림에 저장해둔 link 값은 서버 기준 절대/루트경로 형태일 수 있어서, 그대로 쓰면
// 하위 폴더 깊이가 다른 페이지에서 클릭했을 때 경로가 깨진다. 아래 함수들은 그 link를
// "현재 페이지 기준으로 실제로 갈 수 있는 URL"로 변환하고, 필요하면 sessionStorage에
// 백업까지 남겨서(쿼리스트링이 리다이렉트 중 유실돼도) 상세 페이지가 정확한 위치로 스크롤/오픈되게 한다.

// 알림의 link 값 하나를 받아 "지금 여기서 실제로 이동 가능한 URL"로 변환.
// - 이미 http(s):// 절대주소면 그대로 사용
// - post_detail.html?id=... 형태면 buildTierPostDetailUrl()로 재조립(깊이 보정 포함)
// - /로 시작하는 루트경로면 getBasePath() 기준으로 상대경로화
// - 그 외 일반 상대경로도 getBasePath()를 붙여서 반환
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

// storeNotificationScrollTarget()이 "알림 클릭해서 이동 중"임을 기록해두는 sessionStorage 키.
// 상세 페이지 쪽 스크립트가 이 키를 읽어서 어느 댓글/문의로 스크롤할지 판단한다.
const NOTIFICATION_SCROLL_KEY = 'notificationScrollTarget';

// 게시글 상세로 가는 링크라면, URL의 id 쿼리값을 sessionStorage('selectedPostId')에도 백업.
// custom-maker_post.js 쪽에서 같은 키를 읽어 페이지 진입 시 해당 글을 열어준다 —
// 페이지 이동 중 쿼리스트링이 유실되는 경우(리다이렉트 등)에 대한 이중 안전장치.
function rememberTierPostIdFromLink(link) {
  const resolved = resolveNotificationLink(link);
  if (!resolved) return;
  if (!/post_detail/i.test(resolved)) return;

  const match = resolved.match(/[?&]id=([a-fA-F0-9]{24})/i);
  if (match?.[1]) {
    sessionStorage.setItem('selectedPostId', match[1]);
  }
}

// notice.js가 읽는 것과 동일한 키('selectedNoticeId')에 저장 — URL 쿼리가 유실돼도 상세 페이지에서 복구 가능
function rememberNoticeIdFromLink(link) {
  const resolved = resolveNotificationLink(link);
  if (!resolved) return;
  if (!/notice-detail/i.test(resolved)) return;

  const match = resolved.match(/[?&]id=([a-fA-F0-9]{24})/i);
  if (match?.[1]) {
    sessionStorage.setItem('selectedNoticeId', match[1]);
  }
}

// 알림 딥링크 URL에 comment/inquiry/answer 같은 세부 위치 쿼리가 빠져 있으면
// resourceId/resourceType 정보로 보충해서 채워 넣는다.
// 예) 댓글 알림인데 link에 &comment=가 없으면, resourceType==='tierComment'인 경우 resourceId를 채워줌.
// 이미 쿼리에 값이 있으면 덮어쓰지 않는다(서버가 이미 정확히 넣어준 경우 존중).
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

// 알림을 클릭해서 이동하기 직전에 호출 — "어느 글의 어느 댓글/문의로 가려는 중인지"를
// sessionStorage(NOTIFICATION_SCROLL_KEY)에 JSON으로 저장해둔다.
// 도착한 상세 페이지는 window.getNotificationScrollTarget()으로 이 값을 읽어 해당 위치로
// 자동 스크롤하고, 다 쓰고 나면 window.clearNotificationScrollTarget()으로 지운다(재방문 시 오작동 방지).
// 반환값은 실제로 이동해야 할 최종 URL(handleNotificationClick에서 location.href에 그대로 씀).
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

// 상세 페이지(post_detail.js, contact_us.js 등)가 "알림을 타고 들어왔는지, 어디로 스크롤할지"를
// 읽어가는 전역 함수. window에 붙여서 다른 <script> 파일에서도 바로 호출 가능하게 노출.
window.getNotificationScrollTarget = function getNotificationScrollTarget() {
  try {
    const raw = sessionStorage.getItem(NOTIFICATION_SCROLL_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
};

// 스크롤 타겟을 한 번 사용한 뒤 정리 — 안 지우면 새로고침/재방문 시에도 계속 같은 위치로
// 스크롤되는 오작동이 생긴다. 상세 페이지가 스크롤을 마친 직후 호출해야 함.
window.clearNotificationScrollTarget = function clearNotificationScrollTarget() {
  sessionStorage.removeItem(NOTIFICATION_SCROLL_KEY);
};

// ========================================================
// 프로필 이미지 헬퍼
// ========================================================
// 이 사이트는 서버에 프로필 사진을 업로드하지 않고, base64로 인코딩해 localStorage에만
// 저장한다(changeProfileImage() 참고) — 그래서 기기/브라우저를 바꾸면 초기화된다는 한계가 있음.
// 저장된 게 없으면 사이트 로고 이미지를 기본 아바타로 사용한다.
function getProfileImageSrc() {
  const stored = localStorage.getItem('profileImage');
  if (stored) return stored;
  return getBasePath() + 'tier-media/logo.webp';
}

// <img>가 깨졌을 때(저장된 base64가 손상됐거나 잘못된 URL일 때) 로고 이미지로 자동 대체.
// { once: true }라 한 번만 발동하고 리스너가 자동 해제됨(무한 루프 방지).
function bindProfileImageFallback(img) {
  if (!img) return;
  const fallback = getBasePath() + 'tier-media/logo.webp';
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
  // 루트·하위 폴더 모두 index.html 로 이동 (루트에서 스크롤만 하던 분기 제거)
  window.location.href = base + 'index.html';
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
    logoImg.src = base + 'tier-media/logo.webp';
    console.log('✅ [common.js] 로고 이미지 경로 보정 완료 →', logoImg.src);
  }
}

// ====================== 공지사항 모달 (common.js로 이동) ======================
// index.html 홈 화면의 "최근 공지" 미리보기 카드를 클릭했을 때 뜨는 간단한 모달.
// ⚠️ notices 객체 안의 내용은 실제 공지 API와 연동된 게 아니라 화면 데모용 더미 데이터다
// (진짜 공지사항 목록/상세는 notice/notice.html 쪽 API 연동 코드가 따로 있음).
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

    // 방금 막 삽입된 헤더 안의 다크모드 토글 스위치를 현재 테마 상태로 맞춘다
    // (theme.js는 <head>에서 먼저 로드되지만, 그 시점엔 이 버튼이 아직 DOM에 없었기 때문)
    if (window.syncThemeToggleUI) window.syncThemeToggleUI();

    // ★★★ 핵심: 이벤트 부착 + 이미지 보정 + 푸터 링크 보정
    attachHeaderEvents();
    fixImagePaths(base);
    fixFooterLinks(base);

    renderUserProfile();
    renderNotificationBell();
    renderHeaderLoginButton();
    renderSponsorButton();

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

    if (window.syncThemeToggleUI) window.syncThemeToggleUI();

    attachHeaderEvents();
    fixImagePaths(base);
    fixFooterLinks(base);

    renderUserProfile();
    renderNotificationBell();
    renderHeaderLoginButton();
    renderSponsorButton();

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
      apple.href = base + 'tier-media/pwa/icon-192.png';
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

// isAdmin 플래그만 확인하는 짧은 헬퍼(다른 페이지 스크립트들이 자체적으로 재정의하기도 함).
function isAdminLoggedIn() {
  return localStorage.getItem("isAdmin") === "true";
}

// 헤더 우측의 "로그인" 버튼 — 로그인 상태면 숨기고, 비로그인이면 로그인 페이지로 가는 링크를 채운다.
// (로그인 상태일 때는 이 자리에 renderUserProfile()이 만드는 프로필 아이콘이 대신 표시됨)
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
// 후원(커피) 버튼
// ========================================================
// SPONSOR_PROFILE_URL(파일 맨 위 상수)에 프로토콜(https://)이 없으면 자동으로 붙여준다.
// 값이 비어있거나 '#'이면 "설정 안 함"으로 보고 빈 문자열 반환.
function getSponsorProfileUrl() {
  const url = String(SPONSOR_PROFILE_URL || '').trim();
  if (!url || url === '#') return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return url;
  return `https://${url}`;
}

// 후원 링크가 설정돼 있으면 새 탭으로 열리는 버튼으로 활성화하고,
// 없으면 클릭이 안 먹는 비활성(aria-disabled) 상태로 둔다.
// 로그인 상태면 알림벨/프로필 아이콘 바로 옆으로, 비로그인이면 로그인 버튼 옆으로 위치를 옮겨서
// 항상 "로그인 상태 UI 그룹"과 나란히 보이게 한다(renderUserProfile·renderNotificationBell보다
// 나중에 호출되므로, 그 시점에 이미 만들어진 요소들 옆에 끼워 넣는 방식).
function renderSponsorButton() {
  const btn = document.querySelector('#header-placeholder #header-sponsor-btn');
  if (!btn) return;

  const url = getSponsorProfileUrl();
  if (url) {
    btn.href = url;
    btn.target = '_blank';
    btn.rel = 'noopener noreferrer';
    btn.removeAttribute('aria-disabled');
  } else {
    btn.href = '#';
    btn.removeAttribute('target');
    btn.removeAttribute('rel');
    btn.setAttribute('aria-disabled', 'true');
  }

  if (btn.dataset.sponsorBound !== '1') {
    btn.dataset.sponsorBound = '1';
    btn.addEventListener('click', (e) => {
      if (!getSponsorProfileUrl()) e.preventDefault();
    });
  }

  if (isUserLoggedIn()) {
    const anchor = document.getElementById('notification-bell')
      || document.getElementById('user-profile');
    if (anchor && anchor.parentNode) {
      anchor.parentNode.insertBefore(btn, anchor);
      return;
    }
  }

  const loginBtn = document.querySelector('#header-placeholder #header-login-btn');
  if (loginBtn && loginBtn.parentNode) {
    loginBtn.parentNode.insertBefore(btn, loginBtn);
  }
}

// ========================================================
// 로그인한 사용자 프로필 아이콘 표시 (일반 유저 + 어드민 공통)
// ========================================================
// 어드민도 일반 유저와 같은 신원 형태(nickname/email)로 다뤄서 프로필 UI를 완전히 통일한다 —
// 테스트 중에 "이 계정은 관리자다" 티가 나지 않도록, 관리자 로그인 표시(👑 등)는 두지 않는다.
function getCurrentIdentity() {
  const isAdmin = localStorage.getItem('isAdmin') === 'true';
  if (isAdmin) {
    return { nickname: localStorage.getItem('adminName') || '관리자', email: '', isAdmin: true };
  }

  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return { nickname: user.nickname || '', email: user.email || '', isAdmin: false };
  } catch (err) {
    return { nickname: '', email: '', isAdmin: false };
  }
}

// 헤더 우측에 로그인한 유저의 아바타 아이콘 + 드롭다운 메뉴(유튜브식)를 동적으로 삽입한다.
// 일반 유저와 관리자가 완전히 같은 메뉴 구성(마이페이지/게시판/사진변경/로그아웃)을 쓰고,
// 관리자일 때만 "🛠 관리하기" 항목이 하나 더 붙는다(의도적으로 관리자 티가 안 나게 설계).
// loadCommon()에서 매 페이지 로드마다 호출되며, 이미 렌더된 상태면 중복 생성을 막는다.
function renderUserProfile() {
  const identity = getCurrentIdentity();
  if (!identity.nickname) return;
  if (document.getElementById('user-profile')) return; // 중복 렌더 방지

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

  // 어드민도 마이페이지·게시판·사진변경 등 일반 메뉴를 그대로 쓴다.
  // "관리하기"만 관리자일 때 맨 끝에 하나 더 붙는다 — 그 외엔 일반 유저와 완전히 동일한 UI.
  const adminMenuItem = identity.isAdmin
    ? `<button type="button" class="user-profile-panel-item" data-action="admin-manage">🛠 관리하기</button>`
    : '';

  const panelHTML = `
        <div id="user-profile-panel" class="user-profile-panel">
          <div class="user-profile-panel-header">
            <div class="user-profile-panel-avatar">
              <img id="user-profile-panel-img" src="${getProfileImageSrc()}" alt="프로필">
            </div>
            <div class="user-profile-panel-info">
              <strong id="user-profile-panel-name"></strong>
              <span id="user-profile-panel-email"></span>
            </div>
          </div>
          <div class="user-profile-panel-menu">
            <button type="button" class="user-profile-panel-item" data-action="mypage">👤 마이페이지</button>
            <button type="button" class="user-profile-panel-item" data-action="board">📋 커스텀 게시판 보기</button>
            <button type="button" class="user-profile-panel-item" data-action="photo">📷 프로필 사진 변경</button>
            ${adminMenuItem}
            <button type="button" class="user-profile-panel-item user-profile-panel-item-danger" data-action="logout">로그아웃</button>
          </div>
        </div>`;

  const profileHTML = `
    <div id="header-user-actions" class="header-user-actions">
      <div id="user-profile" class="user-profile-btn">
        <div class="user-profile-avatar">
          <img id="profile-img" src="${getProfileImageSrc()}" alt="프로필">
        </div>${panelHTML}
      </div>
    </div>
  `;

  menuBtn.insertAdjacentHTML('beforebegin', profileHTML);

  bindProfileImageFallback(document.getElementById('profile-img'));
  bindProfileImageFallback(document.getElementById('user-profile-panel-img'));

  const profileEl = document.getElementById('user-profile');
  if (!profileEl) return;

  bindUserProfileMenuActions();

  profileEl.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleUserProfileMenu();
  });
  document.addEventListener('click', closeUserProfileMenuOnOutsideClick);
}

// 프로필 아이콘 클릭 시 드롭다운을 열고/닫는다(CSS의 .is-open 클래스로 표시 제어).
// 열릴 때는 닉네임/이메일을 최신값으로 채워 넣고, 알림 패널이 열려 있었다면 같이 닫아서
// 두 드롭다운이 동시에 겹쳐 보이지 않게 한다.
function toggleUserProfileMenu() {
  const panel = document.getElementById('user-profile-panel');
  if (!panel) return;

  const willOpen = !panel.classList.contains('is-open');
  panel.classList.toggle('is-open', willOpen);

  if (willOpen) {
    updateUserProfilePanelInfo();
    closeNotificationPanel(); // 알림 패널과 동시에 열리지 않도록
  }
}

// 프로필 드롭다운을 닫기만 하는 헬퍼 — 메뉴 항목 클릭, 로그아웃, 바깥 클릭 등 여러 곳에서 재사용.
function closeUserProfileMenu() {
  const panel = document.getElementById('user-profile-panel');
  if (panel) panel.classList.remove('is-open');
}

// document 전체에 걸어두는 클릭 리스너 — 드롭다운이 열려 있는 상태에서 그 바깥(패널 밖) 영역을
// 클릭하면 자동으로 닫는다. renderUserProfile()에서 한 번만 등록됨.
// ⚠️ 주의: 다른 헤더 버튼(알림 벨 등)의 클릭 핸들러가 e.stopPropagation()을 쓰면 이 리스너까지
// 이벤트가 안 올라와서 안 닫힐 수 있다 — 그래서 알림 벨 쪽은 toggleNotificationPanel()에서
// closeUserProfileMenu()를 "직접" 호출해 명시적으로 닫아준다(바깥클릭 감지에만 의존하지 않음).
function closeUserProfileMenuOnOutsideClick(e) {
  const profileEl = document.getElementById('user-profile');
  const panel = document.getElementById('user-profile-panel');
  if (!profileEl || !panel || !panel.classList.contains('is-open')) return;
  if (!profileEl.contains(e.target)) {
    closeUserProfileMenu();
  }
}

// 드롭다운을 열 때마다 패널 안의 이름/이메일 표시를 최신 상태로 갱신.
function updateUserProfilePanelInfo() {
  const identity = getCurrentIdentity();
  const nameEl = document.getElementById('user-profile-panel-name');
  const emailEl = document.getElementById('user-profile-panel-email');
  if (nameEl) nameEl.textContent = identity.nickname || '사용자';
  if (emailEl) emailEl.textContent = identity.email || '';
}

// 프로필 드롭다운 메뉴 안의 버튼들(마이페이지/게시판/사진변경/관리하기/로그아웃) 클릭을
// 이벤트 위임(delegation) 방식으로 한 번에 처리한다 — 메뉴 하나하나에 리스너를 따로 안 달고,
// 부모(.user-profile-panel-menu)에 한 번만 걸고 data-action 값으로 분기한다.
// dataset.bound 플래그로 중복 바인딩을 막는다(renderUserProfile이 다시 불려도 안전).
function bindUserProfileMenuActions() {
  const menu = document.querySelector('#user-profile-panel .user-profile-panel-menu');
  if (!menu || menu.dataset.bound === '1') return;
  menu.dataset.bound = '1';

  menu.addEventListener('click', (e) => {
    const btn = e.target.closest('.user-profile-panel-item');
    if (!btn) return;
    closeUserProfileMenu();

    switch (btn.dataset.action) {
      case 'mypage':
        window.location.href = getBasePath() + 'my-page/my-page.html';
        break;
      case 'board':
        goToCustomBoard();
        break;
      case 'photo':
        changeProfileImage();
        break;
      case 'logout':
        logout();
        break;
      case 'admin-manage':
        window.location.href = getBasePath() + 'admin/comments/comment-management.html';
        break;
    }
  });
}

// ========================================================
// 알림(Notification) 시스템 — 헤더 벨 아이콘 + 드롭다운 목록 + 설정 모달
// ========================================================
// 전체 흐름:
//   1) renderNotificationBell()이 헤더에 🔔 아이콘과 빈 드롭다운을 삽입 (로그인 유저만)
//   2) refreshNotificationBadge()가 안 읽은 알림 수를 가져와 배지에 표시,
//      startNotificationPolling()이 1분마다 이걸 반복 실행
//   3) 벨을 클릭하면 toggleNotificationPanel() → loadNotificationList()가 최근 50건을 불러와 렌더
//   4) 목록의 알림 하나를 클릭하면 handleNotificationClick()이 읽음 처리 + 원래 위치로 이동
//   5) 톱니바퀴 아이콘으로 openNotificationSettingsModal()을 열어 알림 종류별 on/off, 기록 삭제 가능
//   6) 상세 페이지 전체를 보고 싶으면 "전체보기" 링크로 notifications/notifications.html 로 이동
//      (탭 4개 + 정렬 필터가 있는 별도 페이지, notifications/notifications.js 참고)

// HTML로 그대로 넣으면 XSS 위험이 있는 사용자 입력(제목/메시지/닉네임 등)을 안전하게 이스케이프.
function escapeNotificationHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 백엔드 Notification.type 값 → 목록에 보여줄 한글 라벨 매핑.
// 새 알림 타입을 백엔드에 추가하면 여기도 같이 추가해야 라벨이 정상 표시된다.
const NOTIFICATION_LABELS = {
  tier_post_comment: '메이커 게시판',
  tier_comment_reply: '메이커 게시판',
  tier_comment_mention: '메이커 게시판',
  inquiry_answer: '문의사항',
  inquiry_mention: '문의사항',
  notice: '공지사항',
  news: '새 소식',
};

// 알림 상세 페이지(notifications/)의 4개 탭 분류. 공지/멘션에 안 걸리는 새 타입은
// 전부 "이벤트"로 떨어지도록 기본값을 둬서, 새 알림 종류가 추가돼도 탭 매핑을 안 잊게 한다.
const NOTIFICATION_GROUPS = {
  notice: 'notice',
  news: 'notice',
  tier_post_comment: 'mention',
  tier_comment_reply: 'mention',
  tier_comment_mention: 'mention',
  inquiry_answer: 'mention',
  inquiry_mention: 'mention',
};

function getNotificationGroup(type) {
  return NOTIFICATION_GROUPS[type] || 'event';
}

// 알림 생성 시각을 "방금 전 / N분 전 / N시간 전 / N일 전 / 날짜"로 사람이 읽기 쉽게 변환.
// 1주일 안쪽이면 상대시간, 그 이상 지났으면 그냥 날짜(ko-KR 형식)로 표시.
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

// 로그인 유저 헤더에 🔔 아이콘 + 안 읽음 배지 + (처음엔 비어있는) 드롭다운 패널을 삽입.
// 비로그인이거나 GitHub Pages 정적 미리보기(백엔드 없음)면 아예 렌더링하지 않는다.
// 프로필 아이콘(#user-profile) 바로 앞에 끼워 넣어서 항상 "프로필 아이콘 왼쪽에 벨"이 되게 배치.
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
          <div class="notification-panel-header-actions">
            <a href="${getBasePath()}notifications/notifications.html" class="notification-viewall-link">전체보기</a>
            <button type="button" id="notification-settings-btn" class="notification-settings-btn" aria-label="알림 설정">⚙</button>
          </div>
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

// 알림 패널이 현재 열려 있는지 여부만 확인하는 짧은 헬퍼.
function isNotificationPanelOpen() {
  return document.getElementById('notification-panel')?.classList.contains('is-open') ?? false;
}

// 벨 아이콘 클릭 시 패널을 열고/닫는다. 열릴 때마다 loadNotificationList()로 최신 목록을
// 다시 불러오고(캐시하지 않음, 항상 최신), 유저 프로필 드롭다운이 열려 있었다면 같이 닫는다.
function toggleNotificationPanel() {
  const panel = document.getElementById('notification-panel');
  if (!panel) return;

  const willOpen = !panel.classList.contains('is-open');
  panel.classList.toggle('is-open', willOpen);

  if (willOpen) {
    loadNotificationList();
    closeUserProfileMenu(); // 유저 프로필 패널과 동시에 열리지 않도록
  }
}

// 알림 패널을 닫기만 하는 헬퍼 — 여러 곳(항목 클릭, 프로필 드롭다운 열림, 바깥 클릭)에서 재사용.
function closeNotificationPanel() {
  const panel = document.getElementById('notification-panel');
  if (panel) panel.classList.remove('is-open');
}

// document 전체 클릭을 감시해서, 알림 패널이 열린 상태로 벨 바깥을 클릭하면 자동으로 닫는다.
// renderNotificationBell()에서 한 번만 등록.
function closeNotificationPanelOnOutsideClick(e) {
  const bell = document.getElementById('notification-bell');
  const panel = document.getElementById('notification-panel');
  if (!bell || !panel || !isNotificationPanelOpen()) return;
  if (!bell.contains(e.target)) {
    closeNotificationPanel();
  }
}

// 안 읽은 알림 개수를 서버에서 가져와 배지 숫자를 갱신(99개 넘으면 '99+'로 표시).
// 0개면 배지 자체를 숨긴다. renderNotificationBell() 최초 호출 시 + startNotificationPolling()의
// 1분 주기 타이머에서 반복 호출된다.
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

// 최근 알림 최대 50건을 서버에서 받아와 드롭다운 목록을 그린다.
// 각 항목은 클릭 가능한 <button>으로 만들고, 필요한 정보(알림 id, 이동할 링크, 관련 리소스
// id/타입)는 전부 data-* 속성에 담아뒀다가, 렌더링이 끝난 뒤 한 번에 클릭 리스너를 붙인다
// (innerHTML로 통째로 그린 다음 이벤트를 나중에 붙이는 방식 — DOM을 한 번에 구성해서 더 빠름).
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

// 알림 항목을 클릭했을 때 실행되는 전체 흐름:
//   1) 패널을 닫고
//   2) 서버에 "읽음 처리" PATCH 요청을 보내되, 응답을 기다리지 않고(fire-and-forget) 바로 진행
//      (사용자를 기다리게 하지 않기 위함 — 실패해도 콘솔에만 로그, 페이지 이동은 그대로 진행)
//   3) storeNotificationScrollTarget()으로 이동할 최종 URL을 계산 + 스크롤 타겟 정보 저장
//   4) 게시글/공지 딥링크라면 sessionStorage에 id를 추가로 백업(rememberXxxIdFromLink)
//   5) 이동할 URL이 있으면 그 페이지로 이동, 없으면(이상 케이스) 배지만 새로고침
// notifications/notifications.js의 상세 페이지 목록도 이 함수를 그대로 재사용한다.
async function handleNotificationClick(notificationId, link, resourceId, resourceType) {
  closeNotificationPanel();

  fetch(`${getApiBase()}/api/notifications/${notificationId}/read`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  }).catch((err) => console.error('알림 읽음 처리 실패:', err));

  const targetUrl = storeNotificationScrollTarget(link, resourceId, resourceType);
  if (targetUrl) {
    rememberTierPostIdFromLink(targetUrl);
    rememberNoticeIdFromLink(targetUrl);
    window.location.href = targetUrl;
    return;
  }

  refreshNotificationBadge();
}

// 60초마다 refreshNotificationBadge()를 반복 호출해서 배지 숫자를 최신 상태로 유지.
// 기존 타이머가 있으면 먼저 clearInterval로 정리한 뒤 새로 시작(중복 실행 방지).
function startNotificationPolling() {
  if (notificationPollTimer) clearInterval(notificationPollTimer);
  if (!isUserLoggedIn()) return;

  notificationPollTimer = setInterval(() => {
    refreshNotificationBadge();
  }, 60000);
}

// 톱니바퀴(⚙) 아이콘 클릭 시 여는 설정 모달 — 알림을 카테고리별(게시판/문의/공지)로
// 켜고 끌 수 있게 서버에서 현재 설정을 불러와 체크박스에 반영한 뒤 body 끝에 모달을 삽입한다.
// 이미 열려 있는 모달이 있으면 먼저 제거하고 새로 그림(중복 방지).
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

// 설정 모달을 DOM에서 완전히 제거(단순 숨김이 아니라 삭제 — 다음에 열 때 최신 설정으로 새로 그림).
function closeNotificationSettingsModal() {
  document.getElementById('notification-settings-modal')?.remove();
}

// "알림 기록 삭제" 버튼 — confirm으로 한 번 더 확인받은 뒤, 해당 유저의 알림을 서버에서
// 전부 삭제(DELETE /api/notifications)하고 목록/배지를 비운 상태로 갱신한다. 되돌릴 수 없음.
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

// 설정 모달의 체크박스 상태를 읽어 서버에 PATCH로 저장. 성공하면 모달을 닫고, 실패하면
// 서버가 준 에러 메시지(또는 기본 메시지)를 alert로 보여준다.
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


// ========================================================
// 프로필 드롭다운 메뉴 액션 함수들 (게시판 보기 / 사진 변경 / 로그아웃)
// ========================================================

// "커스텀 게시판 보기" 메뉴 클릭 시 — 내 닉네임으로 검색된 게시판 목록으로 이동.
// 비로그인 상태면(이론상 도달 안 하지만 방어적으로) 로그인 페이지로 대신 보낸다.
function goToCustomBoard() {
  closeUserProfileMenu();

  const identity = getCurrentIdentity();
  if (!identity.nickname) {
    alert('내 게시글을 보려면 로그인이 필요합니다.');
    window.location.href = `${getBasePath()}user_login/login.html`;
    return;
  }

  const nickname = encodeURIComponent(identity.nickname);
  window.location.href = getBasePath() + `custom-maker/custom-maker_post/custom-maker_post.html?search=@${nickname}`;
}

// "프로필 사진 변경" 메뉴 클릭 시 — 숨겨진 파일 입력을 즉석에서 만들어 클릭을 트리거하고,
// 사용자가 이미지를 선택하면 FileReader로 base64 문자열로 변환해 localStorage('profileImage')에
// 저장한다. 서버 업로드는 하지 않으므로 다른 기기/브라우저에서는 다시 설정해야 한다(알려진 한계).
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

      // 드롭다운 패널 안의 이미지도 변경
      const panelImg = document.getElementById('user-profile-panel-img');
      if (panelImg) panelImg.src = base64;

      closeUserProfileMenu();
    };
    reader.readAsDataURL(file);
  };

  input.click();
}

// 로그아웃 — 일반 유저/관리자 로컬스토리지 값을 전부(둘 다) 지운다.
// 어느 쪽으로 로그인했었는지 따지지 않고 한 번에 정리하는 이유는, 로그아웃 버튼이
// 일반 유저·관리자 공용 드롭다운 메뉴에 하나만 있기 때문 — 굳이 분기할 필요가 없다.
// confirm으로 실수 클릭을 방지하고, 확인되면 페이지를 새로고침해서 로그인 전 상태로 되돌린다.
function logout() {
  if (confirm("정말 로그아웃 하시겠습니까?")) {
    localStorage.removeItem("user");
    localStorage.removeItem("authToken");
    localStorage.removeItem("adminAuthToken");
    localStorage.removeItem("isAdmin");
    localStorage.removeItem("adminName");
    localStorage.removeItem("adminIp");
    localStorage.removeItem("profileImage");
    closeUserProfileMenu();
    location.reload();
  }
}

// ========================================================
// 사이드 메뉴(햄버거) 안의 드롭다운 항목 열고 닫기 — 모바일 네비게이션용
// ========================================================
// 데스크톱은 CSS :hover로 드롭다운이 열리지만, 모바일은 호버 개념이 없어서 클릭으로
// 열고 닫아야 한다. 하나를 열면 다른 열려있던 드롭다운은 자동으로 닫아서(아코디언 방식)
// 여러 개가 동시에 펼쳐져 화면을 다 차지하는 걸 방지한다.
// loadCommon()에서 header 삽입 직후 호출된다.
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