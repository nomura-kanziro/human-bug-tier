const AUTH_API_BASE = 'http://localhost:5000/api/auth';

function getTokenFromUrl() {
  return new URLSearchParams(window.location.search).get('token') || '';
}

async function submitReset() {
  const token = getTokenFromUrl();
  const password = document.getElementById('newPassword')?.value || '';
  const confirm = document.getElementById('confirmPassword')?.value || '';

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
    const response = await fetch(`${AUTH_API_BASE}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });
    const data = await response.json();

    if (response.ok && data.success) {
      alert(data.message || '비밀번호가 변경되었습니다.');
      window.location.href = 'login.html';
      return;
    }

    alert(data.error || '비밀번호 재설정에 실패했습니다.');
  } catch (err) {
    console.error(err);
    alert('서버와 연결할 수 없습니다.');
  }
}

document.getElementById('reset-btn')?.addEventListener('click', submitReset);