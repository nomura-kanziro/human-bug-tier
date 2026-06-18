// ============================================
// sign_up.js - 회원가입 (백엔드 연동 버전)
// ============================================

function goHome() {
  window.location.href = "../index.html";
}

function goBack() {
  window.history.back();
}

function goToLogin() {
  window.location.href = "login.html";
}

// 비밀번호 확인 실시간 체크
function setupPasswordConfirmCheck() {
  const pwInput = document.getElementById('userPw');
  const pwConfirmInput = document.getElementById('userPwConfirm');

  if (!pwInput || !pwConfirmInput) return;

  pwConfirmInput.addEventListener('input', () => {
    if (pwInput.value && pwConfirmInput.value) {
      pwConfirmInput.style.borderColor = pwInput.value === pwConfirmInput.value ? '#8faadc' : '#e74c3c';
    } else {
      pwConfirmInput.style.borderColor = '#ccc';
    }
  });
}

// 회원가입 처리 (백엔드 호출)
async function signUp() {
  const userId = document.getElementById('userId').value.trim();     // nickname으로 사용
  const userPw = document.getElementById('userPw').value.trim();
  const userPwConfirm = document.getElementById('userPwConfirm').value.trim();
  const userEmail = document.getElementById('userEmail').value.trim();

  // 유효성 검사
  if (!userId || !userPw || !userPwConfirm || !userEmail) {
    alert('아이디, 비밀번호, 비밀번호 확인, 이메일은 모두 필수입니다.');
    return;
  }

  if (userPw !== userPwConfirm) {
    alert('비밀번호가 일치하지 않습니다.');
    return;
  }

  // 백엔드에 전송
  try {
    const response = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: userEmail,
        password: userPw,
        nickname: userId          // 아이디를 nickname으로 사용
      })
    });

    const data = await response.json();

    if (response.ok) {
      alert('✅ 인증 메일이 발송되었습니다.\n메일함을 확인해주세요.');
      // 로그인 페이지로 이동
      setTimeout(() => {
        window.location.href = "login.html";
      }, 1500);
    } else {
      alert('❌ ' + (data.error || '회원가입에 실패했습니다.'));
    }
  } catch (err) {
    console.error(err);
    alert('❌ 서버와 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.');
  }
}

// 페이지 로드
window.addEventListener('load', () => {
  setupPasswordConfirmCheck();
  console.log('✅ sign_up.js 백엔드 연동 버전 로드 완료');
});