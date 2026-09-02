// ============================================
// login.js - 로그인 (백엔드 연동 버전)
// ============================================

// 좌상단 로고 클릭 → 홈(메인 티어표)으로 이동
function goHome() {
  window.location.href = "../index.html";
}

// '⟳ 돌아가기' 버튼 → 브라우저 히스토리상 이전 페이지로 이동
function goBack() {
  window.history.back();
}

// '회원가입' 버튼 → 회원가입 페이지로 이동
function goToSignup() {
  window.location.href = "sign_up.html";
}

// '아이디 및 비밀번호 찾기' 링크 → find_account.html로 이동
function findAccount() {
  window.location.href = "find_account.html";
}

// '로그인' 버튼 클릭 시 실행. 아이디(닉네임)+비밀번호를 서버로 보내 검증받고,
// 성공하면 서버가 발급한 JWT(authToken)와 유저 정보를 localStorage에 저장한다.
async function login() {
  const userId = document.getElementById('userId').value.trim();
  const userPw = document.getElementById('userPw').value.trim();

  if (!userId || !userPw) {
    alert('아이디와 비밀번호를 모두 입력해주세요.');
    return;
  }

  try {
    const response = await fetch(`${getAuthApiBase()}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: userId,     // nickname
        password: userPw
      })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      alert('로그인 성공!');
      // 일반 회원 로그인 성공 시, 남아있을 수 있는 관리자 세션 흔적을 모두 지워
      // 이후 페이지에서 관리자 권한과 혼동되지 않도록 한다.
      localStorage.removeItem('isAdmin');
      localStorage.removeItem('adminAuthToken');
      localStorage.removeItem('adminName');
      localStorage.removeItem('adminIp');
      // 유저 정보와 JWT를 저장. 이후 페이지들은 getAuthHeaders()(common.js)가
      // localStorage의 authToken을 자동으로 Authorization 헤더에 실어 보낸다.
      localStorage.setItem('user', JSON.stringify(data.user));
      if (data.token) localStorage.setItem('authToken', data.token);
      window.location.href = "../index.html";
    } else if (data.blocked) {
      // 관리자가 해당 계정을 차단 처리한 경우 서버가 success:false와 함께 blocked 플래그로 응답
      alert('🚫 관리자로 인해 차단당했습니다.');
    } else {
      alert('❌ ' + (data.error || '로그인에 실패했습니다.'));
    }
  } catch (err) {
    console.error(err);
    alert('❌ 서버와 연결할 수 없습니다.');
  }
}