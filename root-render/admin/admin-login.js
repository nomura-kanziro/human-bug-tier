// ========================================================
// admin-login.js - Admin 로그인 (백엔드 연동)
// ========================================================
// 일반 유저 로그인(user_login/, common.js의 authToken)과는 별개의 화면·별개의 토큰 체계다.
// 이 페이지에서 로그인에 성공하면 서버가 isAdmin=true가 포함된 JWT를 발급하고,
// 그 토큰을 localStorage.adminAuthToken에 저장한다. 이후 admin/ 하위의 모든 화면은
// admin_api.js의 getAdminAuthHeaders()로 이 토큰을 실어 API를 호출한다.
// ========================================================

// ========================================================
// 로그인 버튼(또는 엔터키) 클릭 시 실행되는 로그인 처리 함수
// ========================================================
// 흐름: 입력값 검증 → /api/admin/login POST 요청 → 성공 시 관리자 상태를
// localStorage에 저장하고 댓글 관리 페이지로 이동, 실패 시 알림만 띄운다.
async function login() {
    const id = document.getElementById("adminId").value.trim();
    const pw = document.getElementById("adminPw").value.trim();

    if (!id || !pw) {
        alert("아이디와 비밀번호를 모두 입력해주세요.");
        return;
    }

    try {
        const response = await fetch(`${getApiBase()}/api/admin/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                loginId: id,
                password: pw,
            }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // 혹시 남아있던 일반 유저 세션 정보는 제거 (관리자와 일반 유저 로그인 상태를 혼동하지 않도록)
            localStorage.removeItem("user");
            // 관리자 로그인 상태 표시(isAdmin) + 헤더 등에서 표시할 관리자 이름/접속 IP 저장
            localStorage.setItem("isAdmin", "true");
            localStorage.setItem("adminName", data.admin.name || "관리자");
            localStorage.setItem("adminIp", data.admin.ip || "unknown");
            if (data.token) {
                // adminAuthToken: admin_api.js의 getAdminAuthHeaders()가 실제로 사용하는 정본 키.
                // authToken: 일부 레거시 코드/공통 유틸이 이 키를 참조할 수 있어 호환용으로 같이 저장해둔다.
                //            (admin_api.js의 getAdminAuthToken()도 authToken을 fallback으로 읽어 승격시킴)
                localStorage.setItem("adminAuthToken", data.token);
                localStorage.setItem("authToken", data.token);
            }

            alert("✅ 관리자 로그인 성공!");
            window.location.href = getBasePath() + "admin/comments/comment-management.html";
        } else {
            alert("❌ " + (data.error || "아이디 또는 비밀번호가 틀렸습니다."));
        }
    } catch (err) {
        console.error(err);
        alert("❌ 서버와 연결할 수 없습니다. 백엔드가 실행 중인지 확인해주세요.");
    }
}

// 돌아가기 버튼 (⟳ 아이콘) - 로그인 화면을 벗어나 일반 홈(home.html)으로 이동.
// getBasePath()는 common.js가 정의하는 함수라 로드 순서 문제로 아직 없을 수도 있으니
// 없을 경우를 대비해 안전하게 '../'로 폴백한다.
function goBack() {
    const base = (typeof getBasePath === 'function') ? getBasePath() : '../';
    window.location.href = base + 'home.html';
}

// 비밀번호 입력창에서 엔터키를 누르면 로그인 버튼을 누른 것과 동일하게 동작하도록 지원
document.addEventListener("DOMContentLoaded", () => {
    const pwInput = document.getElementById("adminPw");
    if (pwInput) {
        pwInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") login();
        });
    }
});