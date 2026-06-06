// ============================================
// user_login/sign_up.js
// sign_up.js - 회원가입 프론트엔드 로직
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

// 비밀번호 확인 실시간 체크 (프론트엔드 UX)
function setupPasswordConfirmCheck() {
  const pwInput = document.getElementById('userPw');
  const pwConfirmInput = document.getElementById('userPwConfirm');

  if (!pwInput || !pwConfirmInput) return;

  pwConfirmInput.addEventListener('input', () => {
    if (pwInput.value.length > 0 && pwConfirmInput.value.length > 0) {
      if (pwInput.value === pwConfirmInput.value) {
        pwConfirmInput.style.borderColor = '#8faadc';   // 일치하면 파란색
        pwConfirmInput.style.boxShadow = '0 0 0 2px rgba(143, 170, 220, 0.2)';
      } else {
        pwConfirmInput.style.borderColor = '#e74c3c';   // 불일치하면 빨간색
        pwConfirmInput.style.boxShadow = '0 0 0 2px rgba(231, 76, 60, 0.2)';
      }
    } else {
      pwConfirmInput.style.borderColor = '#ccc';
      pwConfirmInput.style.boxShadow = 'none';
    }
  });

  // 비밀번호 입력할 때도 확인창 초기화
  pwInput.addEventListener('input', () => {
    if (pwConfirmInput.value.length > 0) {
      pwConfirmInput.style.borderColor = '#ccc';
      pwConfirmInput.style.boxShadow = 'none';
    }
  });
}

// 회원가입 처리 (현재는 프론트엔드 검증만)
function signUp() {
  const userId = document.getElementById('userId').value.trim();
  const userPw = document.getElementById('userPw').value.trim();
  const userPwConfirm = document.getElementById('userPwConfirm').value.trim();
  const userEmail = document.getElementById('userEmail').value.trim();

  // 기본 유효성 검사
  if (!userId || !userPw || !userPwConfirm) {
    alert('아이디, 비밀번호, 비밀번호 확인은 필수 입력입니다.');
    return;
  }

  if (userPw !== userPwConfirm) {
    alert('비밀번호가 일치하지 않습니다.');
    document.getElementById('userPwConfirm').focus();
    return;
  }

  // TODO: 나중에 backend 연동 시 이 부분을 fetch로 교체 예정
  console.log('📝 회원가입 시도 데이터:', {
    userId,
    userEmail: userEmail || '(입력 안 함)',
    timestamp: new Date().toISOString()
  });

  // 현재는 임시 처리
  alert('회원가입이 완료되었습니다! (프론트엔드 검증 성공)\n\n※ 아직 backend와 연결되지 않았습니다.');

  // 성공 시 로그인 페이지로 이동 (선택)
  // setTimeout(() => { window.location.href = "login.html"; }, 1500);
}

// 페이지 로드 시 실행
window.addEventListener('load', () => {
  setupPasswordConfirmCheck();
  console.log('✅ sign_up.js 로드 완료 - 회원가입 프론트엔드 준비됨');
});