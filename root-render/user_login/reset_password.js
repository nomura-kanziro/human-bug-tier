// ============================================
// reset_password.js - 비밀번호 재설정 (이메일 링크로 열리는 페이지)
// ============================================
// 사용자가 find_account.html에서 "비밀번호 재설정 링크 받기"를 누르면 서버가
// 이메일로 `reset_password.html?token=랜덤값` 링크를 보낸다. 이 파일은 그 링크로
// 들어온 페이지의 동작을 담당한다.
//   1) 페이지 로드 즉시 URL의 token이 아직 유효한지 서버에 먼저 물어본다 (validateTokenOnLoad)
//   2) 유효할 때만 새 비밀번호 입력폼을 열어주고, 제출 시 서버에 새 비밀번호를 전송한다 (submitReset)
// 실제 "이메일 발송"과 "토큰 검증/해시 비교/비밀번호 저장" 로직은 전부 백엔드
// (backend/utils/mail.js, backend/controllers/authController.js)에 있고, 이 파일은
// API를 호출해서 결과를 화면 문구로 보여주는 역할만 한다.
// 보안 참고: 서버는 이 토큰의 원문이 아니라 SHA-256 해시만 DB에 저장하므로, 프론트에서도
// 토큰 값을 별도로 저장하거나 로그로 남기지 않는다(URL에서 읽어서 그대로 전달만 함).

// URL 쿼리스트링(?token=...)에서 재설정 토큰 문자열을 꺼내는 헬퍼.
// 이 페이지의 모든 함수가 매번 새로 파싱해서 쓰기 때문에 별도 변수로 캐시하지 않는다
// (토큰이 바뀔 일은 없지만, 호출부마다 "지금 URL에 뭐가 들어있는지"를 그대로 반영하기 위함).
function getTokenFromUrl() {
  return new URLSearchParams(window.location.search).get('token')?.trim() || '';
}

// 새 비밀번호 입력창 2개와 변경 버튼을 한번에 켜고/끈다.
// 토큰이 없거나 만료된 경우 폼 자체를 잠가서, 사용자가 비밀번호를 입력한 뒤에야
// "링크가 유효하지 않습니다"를 알게 되는 상황을 막는다.
function setFormEnabled(enabled) {
  document.getElementById('newPassword')?.toggleAttribute('disabled', !enabled);
  document.getElementById('confirmPassword')?.toggleAttribute('disabled', !enabled);
  document.getElementById('reset-btn')?.toggleAttribute('disabled', !enabled);
}

// 상단 안내 문구(#reset-status)를 표시/숨김하는 공용 헬퍼.
// isError가 true면 빨간색, false면 초록색으로 색만 바꿔서 성공/실패 상태를 구분해준다.
function showStatus(message, isError) {
  const statusEl = document.getElementById('reset-status');
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.style.color = isError ? '#dc2626' : '#059669';
  statusEl.style.display = message ? 'block' : 'none';
}

// 페이지가 열리자마자(window load) 실행되는 사전 검증 단계.
// 토큰을 제출 시점까지 그냥 들고 있는 게 아니라, 먼저 /validate-reset-token으로
// 서버에 물어봐서 "이미 만료됐거나 한 번 사용된 링크"인지 미리 확인한다.
// → 유효하면 폼을 열어주고, 아니면 안내 문구만 띄우고 폼을 계속 잠가둔다.
async function validateTokenOnLoad() {
  const token = getTokenFromUrl();
  if (!token) {
    showStatus('유효하지 않은 재설정 링크입니다.', true);
    setFormEnabled(false);
    return false;
  }

  try {
    const response = await fetch(
      `${getAuthApiBase()}/validate-reset-token?token=${encodeURIComponent(token)}`,
    );
    const data = await response.json();

    if (!response.ok || !data.valid) {
      showStatus(data.error || '만료되었거나 유효하지 않은 링크입니다.', true);
      setFormEnabled(false);
      return false;
    }

    showStatus('새 비밀번호를 입력해주세요.', false);
    setFormEnabled(true);
    return true;
  } catch (err) {
    console.error(err);
    showStatus('서버와 연결할 수 없습니다. backend에서 npm start를 실행해주세요.', true);
    setFormEnabled(false);
    return false;
  }
}

// '비밀번호 변경' 버튼 클릭 시 실행되는 제출 로직.
// 프론트에서는 최소한의 형식 검사(토큰 존재 여부, 길이, 확인란 일치)만 하고,
// 토큰이 실제로 유효한지·비밀번호를 어떻게 저장할지는 전부 서버가 판단한다.
async function submitReset() {
  const token = getTokenFromUrl();
  const password = document.getElementById('newPassword')?.value || '';
  const confirm = document.getElementById('confirmPassword')?.value || '';

  // 페이지 로드 시 이미 검증했더라도, 그 사이 토큰이 만료됐을 수 있으므로 제출 직전에도 재확인
  if (!token) {
    alert('유효하지 않은 재설정 링크입니다.');
    return;
  }

  if (!password || password.length < 4) {
    alert('비밀번호는 4자 이상 입력해주세요.');
    return;
  }

  if (password !== confirm) {
    alert('비밀번호가 일치하지 않습니다.');
    return;
  }

  try {
    // 서버가 token(원문)을 받아 SHA-256으로 해시한 뒤 DB에 저장된 해시와 비교/검증하고,
    // 일치하면 새 비밀번호를 해시해서 저장한다. 원문 토큰은 이 요청 이후로는 쓸모없어진다(1회용).
    const response = await fetch(`${getAuthApiBase()}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });
    const data = await response.json();

    if (response.ok && data.success) {
      alert(data.message || '비밀번호가 변경되었습니다.');
      // 변경된 비밀번호로 바로 로그인하도록 로그인 페이지로 이동
      window.location.href = 'login.html';
      return;
    }

    alert(data.error || '비밀번호 재설정에 실패했습니다.');
  } catch (err) {
    console.error(err);
    alert('서버와 연결할 수 없습니다.');
  }
}

// 변경 버튼 클릭 → 제출 로직 연결
document.getElementById('reset-btn')?.addEventListener('click', submitReset);
// 페이지가 완전히 로드되면 곧바로 토큰 유효성부터 확인(위 validateTokenOnLoad)
window.addEventListener('load', validateTokenOnLoad);