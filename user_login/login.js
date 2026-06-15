// ============================================
// login.js - 로그인 (백엔드 연동 버전)
// ============================================

function goHome() {
  window.location.href = "../index.html";
}

function goBack() {
  window.history.back();
}

function goToSignup() {
  window.location.href = "sign_up.html";
}

function findAccount() {
  window.location.href = "find_account.html";
}

async function login() {
  const userId = document.getElementById('userId').value.trim();
  const userPw = document.getElementById('userPw').value.trim();

  if (!userId || !userPw) {
    alert('아이디와 비밀번호를 모두 입력해주세요.');
    return;
  }

  try {
    const response = await fetch('http://localhost:5000/api/auth/login', {
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
      localStorage.setItem('user', JSON.stringify(data.user));
      window.location.href = "../index.html";
    } else if (data.blocked) {
      alert('🚫 관리자로 인해 차단당했습니다.');
    } else {
      alert('❌ ' + (data.error || '로그인에 실패했습니다.'));
    }
  } catch (err) {
    console.error(err);
    alert('❌ 서버와 연결할 수 없습니다.');
  }
}