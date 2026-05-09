// script.js - 모든 페이지 공통 (로고 경로 자동 보정 포함)

function getBasePath() {
  const path = window.location.pathname;

  // ←←← 여기가 핵심 수정! admin 폴더 지원 추가
  if (path.includes('/admin/') || path.includes('/admin\\')) {
    return '../../';        // admin/comments/ → root까지 2단계 올라감
  }
  // tier-class와 Contact_us 폴더 모두 ../ 처리
  if (path.includes('/tier-class/') || 
      path.includes('/tier-class\\') || 
      path.includes('/Contact_us/') || 
      path.includes('/Contact_us\\')) {
    return '../';
  }
  return './';
}

function goHome() {
  const base = getBasePath();
  if (base === '../' || base === '../../') {
    window.location.href = base + 'home.html';
  } else {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function toggleMenu() {
  const menu = document.getElementById("sideMenu");
  if (!menu) return;
  if (menu.style.right === "0px" || menu.style.right === "") {
    menu.style.right = "-100%";
  } else {
    menu.style.right = "0px";
  }
}

function closeMenu() {
  const menu = document.getElementById("sideMenu");
  if (menu) menu.style.right = "-100%";
}

// ==================== 이미지 경로 자동 보정 ====================
function fixImagePaths(base) {
  // header 로고 이미지 경로 수정
  const logoImg = document.querySelector('#header-placeholder .logo-img');
  if (logoImg) {
    logoImg.src = base + 'tier-image/logo.webp';
    console.log('✅ 로고 이미지 경로 보정 완료 →', logoImg.src);
  }

  // 필요하면 tier-card 아이콘들도 여기서 한 번에 고칠 수 있음
  const tierIcons = document.querySelectorAll('.tier-icon');
  tierIcons.forEach(icon => {
    if (icon.src.includes('logo2-')) {
      icon.src = base + icon.getAttribute('src').replace('./', '');
    }
  });
}

// ==================== header/footer 로드 ====================
function loadCommon() {
  const base = getBasePath();
  
  Promise.all([
    fetch(base + 'header.html').then(r => r.text()),
    fetch(base + 'footer.html').then(r => r.text())
  ])
  .then(([header, footer]) => {
    document.getElementById('header-placeholder').innerHTML = header;
    document.getElementById('footer-placeholder').innerHTML = footer;
    
    attachHeaderEvents();
    fixImagePaths(base);           // 로고 경로 보정
    fixFooterLinks(base);          // ←★ 문의하기 링크 보정 (추가!)

    console.log('✅ Header & Footer + 모든 링크 보정 완료!');
  })
  .catch(err => console.error('❌ 불러오기 실패:', err));
}

function attachHeaderEvents() {
  const menuBtn = document.getElementById('menuBtn');
  const closeBtn = document.getElementById('closeBtn');

  // [수정사항] id="logo" + class="logo" 둘 다 지원 (header.html 구조에 맞춤)
  const logoById = document.getElementById('logo');
  const logoByClass = document.querySelector('#header-placeholder .logo');

  if (logoById) {
    logoById.addEventListener('click', goHome);
  }
  if (logoByClass) {
    logoByClass.style.cursor = 'pointer';
    logoByClass.addEventListener('click', goHome);
    console.log('✅ class="logo" 클릭 이벤트 정상 등록');
  }


  if (menuBtn) menuBtn.addEventListener('click', toggleMenu);
  if (closeBtn) closeBtn.addEventListener('click', closeMenu);
}

document.addEventListener('DOMContentLoaded', loadCommon);

// ==================== 푸터 링크 보정 ====================
function fixFooterLinks(base) {
  const contactLink = document.getElementById('contact-link');
  if (contactLink) {
    contactLink.href = base + 'Contact_us/index.html';   // ← 여기 수정!
    console.log('✅ 문의하기 링크 보정됨:', contactLink.href);
  }
}

// DOMContentLoaded에서 자동 실행 (다른 페이지들도 그대로 동작)
document.addEventListener('DOMContentLoaded', loadCommon);