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

function getBasePath() {
  const path = window.location.pathname;
  console.log('📍 [common.js] 현재 페이지 경로:', path);

  // [admin/comments 폴더 전용 처리] → root까지 2단계 올라감
  if (path.includes('/admin/') || path.includes('/admin\\')) {
    return '../../';
  }
  // ←←← 여기 추가!!!
  if (path.includes('/tier-class/') || path.includes('/tier-class\\') || 
      path.includes('/Contact_us/') || path.includes('/Contact_us\\') ||
      path.includes('/custom-maker/') || path.includes('/custom-maker\\') ||
      path.includes('/notice/') || path.includes('/notice\\') ||
      path.includes('/all_notices/') || path.includes('/all_notices\\') ||
      path.includes('/news/') || path.includes('/news\\')
    ) {
    return '../../';
  }
  return './';
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
  // 현재 상태에 따라 열기/닫기
  if (menu.style.right === "0px" || menu.style.right === "") {
    menu.style.right = "-100%";   // 닫기
  } else {
    menu.style.right = "0px";     // 열기
  }
}

function closeMenu() {
  const menu = document.getElementById("sideMenu");
  if (menu) menu.style.right = "-100%";
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

    // ★★★ 핵심: 이벤트 부착 + 이미지 보정 + 푸터 링크 보정
    attachHeaderEvents();
    fixImagePaths(base);
    fixFooterLinks(base);

    // ★★★ 여기 추가 ★★★
    renderUserProfile();     // ← 프로필 아이콘 표시

    initSideMenuDropdowns();     // ← 이 줄이 있어야 합니다

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
    
    attachHeaderEvents();
    fixImagePaths(base);
    fixFooterLinks(base);

    // [★ 여기 추가 ★] ←←← 프로필 아이콘 렌더링
    renderAdminProfile();

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

// ========================================================
// 헤더에 프로필 아이콘 동적으로 추가
// ========================================================
function renderUserProfile() {
  if (localStorage.getItem("isAdmin") !== "true") return;

  const header = document.getElementById('header-placeholder');
  if (!header) return;

  // 햄버거 메뉴 버튼 찾기 (여러 클래스명 대비)
  const menuBtn = header.querySelector('#menuBtn') || 
                  header.querySelector('.menu-btn') || 
                  header.querySelector('.menu-button') ||
                  header.querySelector('button[onclick*="toggleMenu"]');

  if (!menuBtn) {
    console.warn('⚠️ 햄버거 메뉴 버튼을 찾지 못했습니다. header.html 구조 확인 필요');
    return;
  }

  const profileHTML = `
    <div id="user-profile" style="
      margin-left: auto;           /* ← 오른쪽 끝으로 강제 밀기 */
      margin-right: 20px;           /* 햄버거와 간격 */
      cursor: pointer; 
      display: flex; 
      align-items: center;
      flex-shrink: 0;
    ">
      <div style="
        width: 36px; 
        height: 36px; 
        background: linear-gradient(135deg, #007bff, #8faadc); 
        border-radius: 50%; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        color: white; 
        font-size: 20px; 
        box-shadow: 0 3px 10px rgba(0,123,255,0.4);
        border: 2px solid #fff;
      ">
        👑
      </div>
    </div>
  `;

  // 햄버거 버튼 바로 앞에 삽입 → 오른쪽 끝에 정확히 고정
  menuBtn.insertAdjacentHTML('beforebegin', profileHTML);

  // 클릭 이벤트 연결
  const profileEl = document.getElementById('user-profile');
  if (profileEl) {
    profileEl.addEventListener('click', showAdminModal);
    console.log('✅ 👑 프로필 아이콘 → 햄버거 메뉴 바로 왼쪽에 정확히 배치 완료!');
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
        
        <button onclick="window.location.href='/admin/comments/comment-management.html'" style="
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
  window.location.href = "/admin/comments/comment-management.html";
  console.log('✅ goToAdminPage 실행 → /admin/comments/comment-management.html');
}

function logoutAdmin() {
  if (confirm("로그아웃 하시겠습니까?")) {
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