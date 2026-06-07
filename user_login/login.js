// ============================================
// login.js - 로그인 프론트엔드 로직
// ============================================

function goHome() {
  window.location.href = "../index.html";
}

function goBack() {
  window.history.back();
}

// 회원가입 페이지로 이동
function goToSignup() {
  window.location.href = "sign_up.html";
}

// 회원 계정 찾기
function findAccount() {
  window.location.href = "find_account.html";
}

// 로그인 처리 (현재는 프론트엔드 검증만)
function login() {
  const userId = document.getElementById('userId').value.trim();
  const userPw = document.getElementById('userPw').value.trim();

  if (!userId || !userPw) {
    alert('아이디와 비밀번호를 모두 입력해주세요.');
    return;
  }

  // TODO: 나중에 backend (Express + MongoDB) 연동 시 fetch로 교체 예정
  console.log('🔐 로그인 시도:', {
    userId,
    timestamp: new Date().toISOString()
  });

  alert('로그인 기능은 아직 backend와 연결되지 않았습니다.\n(추후 login.js + backend 라우터에서 구현 예정)');
}

// 페이지 로드 시 실행
window.addEventListener('load', () => {
  // 첫 번째 입력창에 자동 포커스 (UX 개선)
  const idInput = document.getElementById('userId');
  if (idInput) {
    idInput.focus();
  }

  console.log('✅ login.js 로드 완료 - 로그인 프론트엔드 준비됨');
});