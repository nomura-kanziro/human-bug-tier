// ============================================
// find_account.js - 아이디/비밀번호 찾기
// ============================================

// 좌상단 로고 클릭 → 홈(메인 티어표)으로 이동
function goHome() {
  window.location.href = '../index.html';
}

// '⟳ 돌아가기' 버튼 → 브라우저 히스토리상 이전 페이지로 이동
function goBack() {
  window.history.back();
}

// '로그인 페이지로 돌아가기' 링크 → 로그인 페이지로 이동
function goToLogin() {
  window.location.href = 'login.html';
}

// 상단 탭('아이디 찾기' / '비밀번호 찾기') 전환.
// 실제로는 두 폼을 서버에 다시 요청하지 않고, 이미 DOM에 그려진 두 폼(#id-form, #pw-form)의
// display를 토글해서 보여줄 뿐이다. 동시에 탭 버튼 중 선택된 것에만 active 클래스를 준다.
function showTab(tabIndex) {
  document.getElementById('id-form').style.display = tabIndex === 0 ? 'flex' : 'none';
  document.getElementById('pw-form').style.display = tabIndex === 1 ? 'flex' : 'none';

  document.querySelectorAll('.tab-btn').forEach((btn, index) => {
    btn.classList.toggle('active', index === tabIndex);
  });
}

// findId/findPassword 요청이 실패했을 때 보여줄 메시지를 서버 응답 코드에 맞춰 골라주는 헬퍼.
// 실제 이메일 발송은 서버(backend/utils/mail.js)가 여러 발송 경로를 순서대로 시도하는데,
// 여기서는 그 결과로 내려온 에러 코드/detail만 보고 사용자에게 보여줄 문구를 결정한다.
function accountFindErrorMessage(data, fallback) {
  if (!data) return fallback;
  if (data.code === 'EMAIL_NOT_CONFIGURED') {
    return data.error || '이메일 발송이 서버에 설정되어 있지 않습니다. 관리자에게 문의해주세요.';
  }
  if (data.code === 'EMAIL_SEND_FAILED') {
    const base = data.error || '이메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.';
    // 서버 SMTP 에러 코드를 화면에 노출해 Render 로그 없이도 원인 파악 가능하게 함
    return data.detail ? `${base} (${data.detail})` : base;
  }
  return data.error || fallback;
}

// '아이디 찾기' 탭의 제출 처리.
// 이메일만으로 아이디를 조회하되, 계정 존재 여부를 응답에서 직접 드러내지 않고
// (보안상 이메일 존재 여부 추측 방지) "등록되어 있다면 발송했다"는 식의 문구를 보여준다.
// 실제 이메일 발송은 서버가 담당하며, 이 함수는 요청을 보내고 성공/실패 UI만 그린다.
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

// '비밀번호 찾기' 탭의 제출 처리.
// 아이디(닉네임)+이메일이 모두 일치하는 계정이 있으면 서버가 1회용 재설정 토큰을 발급해
// SHA-256 해시만 DB에 저장하고, 원문 토큰이 담긴 링크(reset_password.html?token=...)를
// 이메일로 보낸다. 이 함수는 그 요청을 보내고 성공/실패 UI만 그리며, 토큰 자체는 다루지 않는다.
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

// 관리자 로그인 페이지로 이동. 별도 버튼 없이 페이지 제목(h2)을 클릭했을 때만
// 호출되는 숨겨진 진입점으로, 일반 사용자 화면에는 관리자 링크를 노출하지 않기 위함.
function goToAdminLogin() {
  window.location.href = '../admin/admin-login.html';
}

// 페이지 로드 시: 기본으로 '아이디 찾기' 탭을 보여주고,
// 제목 클릭 시 관리자 로그인으로 이동하는 숨은 링크를 연결한다.
window.addEventListener('load', () => {
  showTab(0);

  const title = document.getElementById('find-account-title');
  if (title) {
    title.addEventListener('click', goToAdminLogin);
  }
});