function getAuthApiBase() {
  const { protocol, hostname, port } = window.location;

  if (/\.github\.io$/i.test(hostname)) {
    return 'GITHUB_STATIC';
  }

  // 로컬 파일 또는 로컬 전용 개발 서버
  if (
    protocol === 'file:' ||
    port === '5500' || port === '3000' || port === '5173' ||
    port === '8080' || port === '4200' || port === '8000'
  ) {
    return 'http://localhost:5000/api/auth';
  }

  // Render, 프로덕션, 또는 백엔드가 서빙하는 경우 → 상대경로
  return '/api/auth';
}