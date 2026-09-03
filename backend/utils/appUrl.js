/* ====================================================================
 * 앱의 절대 base URL을 알아내는 유틸
 * ------------------------------------------------------------------
 * 이메일 본문에 넣는 링크(예: 비밀번호 재설정, 알림 딥링크)는 상대경로가 아니라
 * "https://도메인/..." 형태의 절대 URL이어야 하므로, 현재 서버가 어떤 주소로
 * 접근되고 있는지를 아래 우선순위로 추론한다.
 *   1) APP_URL 환경변수 — 운영자가 명시적으로 지정한 값 (가장 신뢰도 높음)
 *   2) RENDER_EXTERNAL_URL — Render.com이 배포 시 자동으로 주입하는 서비스 URL
 *      (별도 설정 없이도 Render 배포본에서는 정확한 값이 잡힌다)
 *   3) 요청 헤더(req) — 프록시/로드밸런서를 거치면 origin 정보가
 *      x-forwarded-proto / x-forwarded-host 에 담겨 오므로 이를 우선 사용하고,
 *      없으면 req.protocol / host 헤더로 대체
 *   4) 위 모두 실패 시 로컬 개발 기본값(http://localhost:PORT)으로 폴백
 * ==================================================================== */
function getAppBaseUrl(req) {
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, '');
  }

  // Render는 웹 서비스마다 RENDER_EXTERNAL_URL을 자동으로 주입한다 (설정 불필요).
  if (process.env.RENDER_EXTERNAL_URL) {
    return process.env.RENDER_EXTERNAL_URL.replace(/\/$/, '');
  }

  // req가 주어졌다면(즉, 실제 HTTP 요청 처리 중이라면) 그 요청이 들어온
  // 프로토콜/호스트를 그대로 되돌려준다 — 프록시 뒤에서도 정확한 origin을 얻기 위해
  // x-forwarded-* 헤더를 req.protocol/req.get('host')보다 우선 확인한다.
  if (req) {
    const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
    const host = req.get('x-forwarded-host') || req.get('host');
    if (host) {
      return `${proto}://${host}`;
    }
  }

  // req도 없고 환경변수도 없는 경우(예: 서버 기동 시점의 크론/스케줄러 컨텍스트) 대비 최후 폴백
  const port = process.env.PORT || 5000;
  return `http://localhost:${port}`;
}

module.exports = { getAppBaseUrl };