function getTokenFromUrl() {
  return new URLSearchParams(window.location.search).get('token')?.trim() || '';
}

function setFormEnabled(enabled) {
  document.getElementById('newPassword')?.toggleAttribute('disabled', !enabled);
  document.getElementById('confirmPassword')?.toggleAttribute('disabled', !enabled);
  document.getElementById('reset-btn')?.toggleAttribute('disabled', !enabled);
}

function showStatus(message, isError) {
  const statusEl = document.getElementById('reset-status');
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.style.color = isError ? '#dc2626' : '#059669';
  statusEl.style.display = message ? 'block' : 'none';
}

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
    const response = await fetch(`${getAuthApiBase()}/reset-password`, {
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
window.addEventListener('load', validateTokenOnLoad);