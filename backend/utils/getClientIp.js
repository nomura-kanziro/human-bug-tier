/* ====================================================================
 * 요청자의 실제 클라이언트 IP 추출 유틸
 * ------------------------------------------------------------------
 * Render 등 클라우드 호스팅에서는 서버가 리버스 프록시/로드밸런서 뒤에 있어
 * req.socket.remoteAddress 가 프록시 자신의 내부 IP를 가리키게 된다.
 * 따라서 프록시가 원본 클라이언트 IP를 기록해두는 x-forwarded-for 헤더를
 * 우선 신뢰하고, 없을 때만 소켓 정보로 폴백한다.
 * (차단 기능(checkBlocked.js)·행운 뽑기 게스트 식별 등에서 사용)
 * ==================================================================== */
function getClientIp(req) {
  // x-forwarded-for는 "클라이언트, 프록시1, 프록시2, ..." 형태로 여러 홉이
  // 콤마로 이어질 수 있어, 맨 앞(최초 발신자)의 값만 취한다.
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const ip = req.socket?.remoteAddress || req.ip || 'unknown';
  // IPv4-매핑 IPv6 주소(::ffff:1.2.3.4) 형태로 들어오는 경우가 있어
  // 접두사를 제거해 순수 IPv4 표기로 정규화한다(동일 IP를 다르게 저장/비교하지 않도록).
  return ip.replace(/^::ffff:/, '');
}

module.exports = getClientIp;