// script.js - 모든 페이지 공통 (로고 경로 자동 보정 포함)

function getBasePath() {
  const path = window.location.pathname;
  if (path.includes('/tier-class/') || path.includes('/tier-class\\')) {
    return '../';
  }
  return './';
}

function goHome() {
  const base = getBasePath();
  if (base === '../') {
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
  const logo = document.getElementById('logo');

  if (menuBtn) menuBtn.addEventListener('click', toggleMenu);
  if (closeBtn) closeBtn.addEventListener('click', closeMenu);
  if (logo) logo.addEventListener('click', goHome);
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