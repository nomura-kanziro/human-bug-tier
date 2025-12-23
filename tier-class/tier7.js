function goHome() {
  window.location.href = '../home.html'; // 본 사이트의 실제 경로로 수정
}

function toggleMenu() {
  const menu = document.getElementById("sideMenu");
  if (menu.style.right === "0px") {
    menu.style.right = "-260px";
  } else {
    menu.style.right = "0px";
  }
}

function toggleMenu() {
  const menu = document.getElementById("sideMenu");
  if (menu.style.right === "0px") {
    menu.style.right = "-100%";
  } else {
    menu.style.right = "0px";
  }
}

function closeMenu() {
  const menu = document.getElementById("sideMenu");
  menu.style.right = "-100%";
}