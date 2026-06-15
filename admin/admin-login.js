// ========================================================
// admin-login.js - Admin 로그인 (백엔드 연동)
// ========================================================

async function login() {
    const id = document.getElementById("adminId").value.trim();
    const pw = document.getElementById("adminPw").value.trim();

    if (!id || !pw) {
        alert("아이디와 비밀번호를 모두 입력해주세요.");
        return;
    }

    try {
        const response = await fetch("http://localhost:5000/api/admin/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                loginId: id,
                password: pw,
            }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
            localStorage.setItem("isAdmin", "true");
            localStorage.setItem("adminName", data.admin.name || "관리자");
            localStorage.setItem("adminIp", data.admin.ip || "unknown");
            if (data.token) localStorage.setItem("authToken", data.token);

            alert("✅ 관리자 로그인 성공!");
            window.location.href = "/admin/comments/comment-management.html";
        } else {
            alert("❌ " + (data.error || "아이디 또는 비밀번호가 틀렸습니다."));
        }
    } catch (err) {
        console.error(err);
        alert("❌ 서버와 연결할 수 없습니다. 백엔드가 실행 중인지 확인해주세요.");
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