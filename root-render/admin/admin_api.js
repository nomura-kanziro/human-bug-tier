// ========================================================
// admin_api.js - 관리자 전용 API 헤더/토큰 유틸리티
// ========================================================
// 목적:
//   일반 유저 인증(common.js의 authToken / getAuthHeaders())과는 완전히 분리된
//   "관리자 전용" 인증 토큰(adminAuthToken)을 관리한다.
//   admin-login.html, comments/comment-management.html, comments/comment-detail.html 등
//   관리자 화면에서 공통으로 불러 쓰는 저수준 유틸 스크립트다.
// 왜 common.js와 별도 파일인가:
//   관리자 기능은 일반 유저 기능과 권한 체계가 다르고(서버의 requireAdmin 미들웨어로 검증),
//   실수로 일반 유저 토큰을 관리자 API에 실어 보내는 사고를 막기 위해
//   토큰 저장 키(localStorage)부터 헤더 생성 함수까지 완전히 별도로 둔다.
//   아래 getApiBase()는 common.js에도 동일한 로직이 있지만, admin 화면들이
//   common.js 로드 여부와 무관하게 이 파일 하나만으로도 동작하도록 일부러 다시 정의해 둔 것.
// ========================================================

// ========================================================
// API 서버 주소(base) 판별 (common.js의 getApiBase()와 동일한 로직)
// ========================================================
// 어떤 호스트/포트에서 열렸는지에 따라 API를 어디로 쏠지 결정한다.
//   - GitHub Pages(정적 미리보기, 백엔드 없음) → 'GITHUB_STATIC' 특수값 반환
//   - 로컬 정적 서버(Live Server 등, 5500/3000/5173 등 포트)나 file://로 열었을 때
//     → 항상 http://localhost:5000(백엔드)을 바라보게 고정
//   - 그 외(Render 배포, backend가 프론트까지 서빙하는 :5000 로컬 실행)
//     → 같은 오리진이므로 빈 문자열('') 반환 → 상대경로 /api/... 그대로 사용
function getApiBase() {
  const { protocol, hostname, port } = window.location;

  if (/\.github\.io$/i.test(hostname)) {
    return 'GITHUB_STATIC';
  }

  if (
    protocol === 'file:' ||
    port === '5500' || port === '3000' || port === '5173' ||
    port === '8080' || port === '4200' || port === '8000'
  ) {
    return 'http://localhost:5000';
  }
  return '';
}

// ========================================================
// JWT가 "관리자 권한을 가진 토큰"인지 판별
// ========================================================
// JWT는 base64url로 인코딩된 payload를 담고 있으므로, 서버에 물어보지 않고도
// 클라이언트에서 payload만 디코딩해 isAdmin 플래그를 즉시 확인할 수 있다.
// (서명 검증은 하지 않음 — 이건 UI 분기용 가벼운 판별일 뿐이고, 실제 권한 검증은
//  항상 서버의 requireAdmin 미들웨어가 담당한다.)
// base64url(-, _)을 표준 base64(+, /)로 바꿔준 뒤 atob()으로 디코딩한다.
// 토큰이 없거나 형식이 깨져 있으면(구버전 토큰, 손상된 값 등) 예외를 잡아 false 처리.
function isAdminJwt(token) {
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.isAdmin === true;
  } catch (err) {
    return false;
  }
}

// ========================================================
// 저장된 관리자 토큰 가져오기 (구버전 마이그레이션 포함)
// ========================================================
// 1) localStorage.adminAuthToken이 있으면 그대로 사용 (정상 경로).
// 2) 없다면, 과거에 일반 authToken 자리에 관리자 토큰을 같이 저장하던
//    구버전 로그인 흐름과의 호환을 위해 authToken을 확인 →
//    그 토큰이 실제로 isAdmin=true인 관리자 토큰이면 adminAuthToken으로
//    "승격 저장"해 두고 반환한다. (한 번 승격되면 다음부터는 1)번 경로로 바로 조회됨)
// 3) 둘 다 없으면 빈 문자열 반환 → 호출부에서 "로그인 안 됨"으로 처리.
function getAdminAuthToken() {
  const saved = localStorage.getItem('adminAuthToken');
  if (saved) return saved;

  const legacy = localStorage.getItem('authToken');
  if (legacy && isAdminJwt(legacy)) {
    localStorage.setItem('adminAuthToken', legacy);
    return legacy;
  }

  return '';
}

// ========================================================
// 관리자 API 요청용 헤더 생성
// ========================================================
// getAdminAuthToken()으로 얻은 관리자 토큰을 Authorization: Bearer 헤더에 실어준다.
// comment-management.js / comment-detail.js 등 모든 관리자 fetch 호출이
// headers: getAdminAuthHeaders() 형태로 이 함수를 사용하며,
// 서버는 이 헤더의 토큰을 requireAdmin 미들웨어에서 검증한다.
// 토큰이 없어도 에러를 던지지 않고 Content-Type만 있는 헤더를 반환하므로,
// 로그인 전 화면 진입 시에도 호출 자체는 안전하다(단, 서버가 401을 돌려줄 뿐).
function getAdminAuthHeaders() {
  const token = getAdminAuthToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}
