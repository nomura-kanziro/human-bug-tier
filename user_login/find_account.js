// ============================================
// find_account.js - 아이디/비밀번호 찾기
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

// 탭 전환
function showTab(tabIndex) {
  document.getElementById('id-form').style.display = tabIndex === 0 ? 'flex' : 'none';
  document.getElementById('pw-form').style.display = tabIndex === 1 ? 'flex' : 'none';

  document.querySelectorAll('.tab-btn').forEach((btn, index) => {
    btn.classList.toggle('active', index === tabIndex);
  });
}

// 아이디 찾기
function findId() {
  const email = document.getElementById('findEmail').value.trim();

  if (!email) {
    alert('이메일을 입력해주세요.');
    return;
  }

  console.log('🔍 아이디 찾기 시도:', { email });
  alert('입력하신 이메일로 아이디 정보를 발송했습니다.\n(프론트엔드 데모)');
}

// 비밀번호 찾기
function findPassword() {
  const userId = document.getElementById('findUserId').value.trim();
  const email = document.getElementById('findPwEmail').value.trim();

  if (!userId || !email) {
    alert('아이디와 이메일을 모두 입력해주세요.');
    return;
  }

  console.log('🔑 비밀번호 찾기 시도:', { userId, email });
  alert('입력하신 이메일로 비밀번호 재설정 링크를 발송했습니다.\n(프론트엔드 데모)');
}

// 페이지 로드
window.addEventListener('load', () => {
  // 기본으로 아이디 찾기 탭 표시
  showTab(0);
  console.log('✅ find_account.js 로드 완료 - 아이디/비밀번호 찾기 준비됨');
});