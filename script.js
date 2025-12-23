function goHome() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function toggleMenu() {
  const menu = document.getElementById("sideMenu");
  if (menu.style.right === "0px") {
    menu.style.right = "-260px";
  } else {
    menu.style.right = "0px";
  }
}

function goTier(num) {
  const target = document.getElementById(`tier${num}`);
  target.scrollIntoView({ behavior: "smooth" });
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