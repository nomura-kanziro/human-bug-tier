// ============================================
// auth_api.js - 인증 관련(회원가입/로그인/찾기/재설정) API 베이스 주소 계산
// ============================================
// user_login/ 폴더의 모든 페이지(login.js, sign_up.js, find_account.js, reset_password.js)가
// `fetch(`${getAuthApiBase()}/register`)` 처럼 공통으로 불러다 쓰는 헬퍼.
// 이 페이지들은 헤더/푸터를 로드하지 않아 common.js를 불러오지 않으므로, common.js의
// getApiBase()와 같은 판별 로직(로컬/개발서버/GitHub Pages/Render)을 이 파일에 별도로 둔다.
// 차이점: getApiBase()는 오리진만 반환하지만, 이 함수는 auth 라우터 경로('/api/auth')까지
// 미리 붙여서 반환하므로 호출부에서는 엔드포인트 이름만 이어붙이면 된다.
function getAuthApiBase() {
  const { protocol, hostname, port } = window.location;

  // GitHub Pages 정적 미리보기(백엔드 없음) → 호출부가 요청을 아예 건너뛸 수 있게 특수값 반환
  if (/\.github\.io$/i.test(hostname)) {
    return 'GITHUB_STATIC';
  }

  // 로컬 파일 또는 로컬 전용 개발 서버(Live Server 등)로 열었을 때는
  // 항상 :5000 백엔드를 절대경로로 바라보게 고정한다.
  if (
    protocol === 'file:' ||
    port === '5500' || port === '3000' || port === '5173' ||
    port === '8080' || port === '4200' || port === '8000'
  ) {
    return 'http://localhost:5000/api/auth';
  }

  // Render, 프로덕션, 또는 백엔드가 프론트까지 같이 서빙하는 경우 → 같은 오리진이므로 상대경로만 반환
  return '/api/auth';
}