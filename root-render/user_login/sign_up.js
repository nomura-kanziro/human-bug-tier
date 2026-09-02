// ============================================
// sign_up.js - 회원가입 (백엔드 연동 버전)
// ============================================

// 좌상단 로고 클릭 → 홈(메인 티어표)으로 이동
function goHome() {
  window.location.href = "../index.html";
}

// '⟳ 돌아가기' 버튼 → 브라우저 히스토리상 이전 페이지로 이동
function goBack() {
  window.history.back();
}

// '이미 계정이 있으신가요? 로그인하기' 링크 → 로그인 페이지로 이동
function goToLogin() {
  window.location.href = "login.html";
}

// 비밀번호 확인 실시간 체크
// 두 입력창 모두에 값이 있을 때 실시간으로 일치 여부를 판단해 확인란 테두리 색으로
// 즉시 피드백을 준다(제출 전에는 별도 안내 문구 없이 색상으로만 알려줌).
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
  // 계정 생성 자체와 인증 메일 발송은 서버(backend/controllers/authController.js,
  // backend/utils/mail.js)가 처리한다. 메일은 여러 발송 경로(Brevo → Resend → Gmail SMTP
  // 순으로 순차 시도하는 폴백 체인)를 시도하지만, 그 내부 사정은 이 파일과 무관하며
  // 이 파일은 그 결과(성공 메시지 또는 detail에 담긴 실패 원인)를 그대로 보여주기만 한다.
  try {
    const response = await fetch(`${getAuthApiBase()}/register`, {
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
      // 계정 생성 자체는 성공했지만 메일 발송만 실패한 경우에도 서버는 201(ok)로 응답하고,
      // 그 실패 원인을 data.detail에 담아 보낸다. suffix로 붙여 사용자가 원인을 바로 알 수 있게 함.
      // 메일 발송 실패 시에도 201로 응답되므로 detail 유무로 실제 발송 성공 여부를 구분
      const suffix = data.detail ? ` (${data.detail})` : '';
      alert((data.message || '✅ 인증 메일이 발송되었습니다.\n메일함을 확인해주세요.') + suffix);
      // 사용자가 alert을 확인할 시간을 준 뒤 로그인 페이지로 이동
      setTimeout(() => {
        window.location.href = "login.html";
      }, 1500);
    } else {
      // 아이디/이메일 중복 등 회원가입 자체가 거부된 경우
      const suffix = data.detail ? ` (${data.detail})` : '';
      alert('❌ ' + (data.error || '회원가입에 실패했습니다.') + suffix);
    }
  } catch (err) {
    console.error(err);
    alert('❌ 서버와 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.');
  }
}

// 페이지 로드 시 비밀번호 확인 실시간 체크 리스너를 등록
window.addEventListener('load', () => {
  setupPasswordConfirmCheck();
  console.log('✅ sign_up.js 백엔드 연동 버전 로드 완료');
});