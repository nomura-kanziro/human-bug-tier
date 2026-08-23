// ============================================
// find_account.js - 아이디/비밀번호 찾기
// ============================================

function goHome() {
  window.location.href = '../index.html';
}

function goBack() {
  window.history.back();
}

function goToLogin() {
  window.location.href = 'login.html';
}

function showTab(tabIndex) {
  document.getElementById('id-form').style.display = tabIndex === 0 ? 'flex' : 'none';
  document.getElementById('pw-form').style.display = tabIndex === 1 ? 'flex' : 'none';

  document.querySelectorAll('.tab-btn').forEach((btn, index) => {
    btn.classList.toggle('active', index === tabIndex);
  });
}

function accountFindErrorMessage(data, fallback) {
  if (!data) return fallback;
  if (data.code === 'EMAIL_NOT_CONFIGURED') {
    return data.error || '이메일 발송이 서버에 설정되어 있지 않습니다. 관리자에게 문의해주세요.';
  }
  if (data.code === 'EMAIL_SEND_FAILED') {
    return data.error || '이메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.';
  }
  return data.error || fallback;
}

async function findId() {
  const email = document.getElementById('findEmail').value.trim();

  if (!email) {
    alert('이메일을 입력해주세요.');
    return;
  }

  // Render 무료 플랜 슬립 후 첫 요청은 최대 1분까지 걸릴 수 있어 클릭 즉시 상태를 표시함
  const btn = document.getElementById('findIdBtn');
  const originalText = btn ? btn.textContent : '';
  if (btn) {
    btn.disabled = true;
    btn.textContent = '요청 중... (최대 1분 소요될 수 있어요)';
  }

  try {
    const response = await fetch(`${getAuthApiBase()}/find-id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await response.json().catch(() => ({}));

    if (response.ok && data.success) {
      alert(
        data.message ||
          '입력하신 정보가 등록되어 있다면 이메일로 안내를 발송했습니다. 스팸함도 확인해 주세요.'
      );
      return;
    }

    alert(accountFindErrorMessage(data, '아이디 찾기에 실패했습니다.'));
  } catch (err) {
    console.error(err);
    alert('서버와 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }
}

async function findPassword() {
  const userId = document.getElementById('findUserId').value.trim();
  const email = document.getElementById('findPwEmail').value.trim();

  if (!userId || !email) {
    alert('아이디와 이메일을 모두 입력해주세요.');
    return;
  }

  // Render 무료 플랜 슬립 후 첫 요청은 최대 1분까지 걸릴 수 있어 클릭 즉시 상태를 표시함
  const btn = document.getElementById('findPwBtn');
  const originalText = btn ? btn.textContent : '';
  if (btn) {
    btn.disabled = true;
    btn.textContent = '요청 중... (최대 1분 소요될 수 있어요)';
  }

  try {
    const response = await fetch(`${getAuthApiBase()}/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname: userId, email }),
    });
    const data = await response.json().catch(() => ({}));

    if (response.ok && data.success) {
      alert(
        data.message ||
          '입력하신 정보가 등록되어 있다면 이메일로 재설정 링크를 발송했습니다. 스팸함도 확인해 주세요.'
      );
      return;
    }

    alert(accountFindErrorMessage(data, '비밀번호 찾기에 실패했습니다.'));
  } catch (err) {
    console.error(err);
    alert('서버와 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }
}

function goToAdminLogin() {
  window.location.href = '../admin/admin-login.html';
}

window.addEventListener('load', () => {
  showTab(0);

  const title = document.getElementById('find-account-title');
  if (title) {
    title.addEventListener('click', goToAdminLogin);
  }
});