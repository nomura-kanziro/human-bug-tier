// ========================================================
// Cloudflare Pages Function — /api/* 요청을 Oracle 백엔드로 넘긴다(리버스 프록시).
// ========================================================
// 프론트 getApiBase() 는 배포 주소에서 ''(동일 오리진)를 돌려주므로 요청이 <pages 주소>/api/... 로 온다.
// Pages 에는 Express 가 없으니 여기서 그대로 백엔드(nginx → Node :5000)로 전달하고 응답을 돌려준다.
// 백엔드 주소는 Pages 환경변수 API_ORIGIN 으로 바꿀 수 있다(없으면 아래 기본값).
const DEFAULT_API_ORIGIN = 'https://hbt-tier.duckdns.org';

export async function onRequest({ request, env }) {
  const origin = (env && env.API_ORIGIN) || DEFAULT_API_ORIGIN;
  const url = new URL(request.url);
  const target = new URL(url.pathname + url.search, origin);

  const headers = new Headers(request.headers);
  // backend/utils/getClientIp.js 가 x-forwarded-for 맨 앞 값을 방문자 IP 로 쓴다(차단 기능).
  // 클라이언트가 보낸 값은 믿지 않고 Cloudflare 가 확인한 실제 IP 로 덮어쓴다.
  const clientIp = request.headers.get('cf-connecting-ip');
  if (clientIp) {
    headers.set('X-Forwarded-For', clientIp);
    headers.set('X-Real-IP', clientIp);
  }
  headers.set('X-Forwarded-Host', url.host);
  headers.delete('host');

  // 본문은 스트림 대신 한 번 읽어서 넘긴다(nginx client_max_body_size 5m 이하라 부담 없음, 런타임 간 차이 없음)
  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  return fetch(target.toString(), {
    method: request.method,
    headers,
    body: hasBody ? await request.arrayBuffer() : undefined,
    redirect: 'manual',
  });
}
