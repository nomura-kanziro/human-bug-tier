// ========================================================
// admin-login.js - Admin 로그인 (순수 클라이언트 사이드)
// ========================================================
// 나중에 Node.js Express API로 교체할 때 이 부분만 fetch로 바꾸면 끝
// ========================================================

// 임시 계정 (Node.js 백엔드 완성되면 여기서 fetch("/api/admin/login") 호출로 변경)
const ADMIN_ID = "admin";
const ADMIN_PW = "1234";   // ← 실제 배포 전 반드시 변경!

async function login() {
    const id = document.getElementById("adminId").value.trim();
    const pw = document.getElementById("adminPw").value.trim();

    if (id === ADMIN_ID && pw === ADMIN_PW) {
        // 로그인 성공 → localStorage에 정보 저장
        localStorage.setItem("isAdmin", "true");
        localStorage.setItem("adminName", "관리자");   // 나중에 DB에서 가져올 이름
        localStorage.setItem("adminIp", "192.168.1.100"); // 공유 IP 예시

        alert("✅ 관리자 로그인 성공!");
        window.location.href = "/admin/comments/comment-management.html"; // 바로 댓글 관리 페이지로 이동
    } else {
        alert("❌ 아이디 또는 비밀번호가 틀렸습니다.");
    }
}

// 돌아가기 버튼
function goBack() {
    window.location.href = "../home.html";
}

// 엔터키 지원
document.addEventListener("DOMContentLoaded", () => {
    const pwInput = document.getElementById("adminPw");
    if (pwInput) {
        pwInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") login();
        });
    }
});