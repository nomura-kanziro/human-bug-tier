/* ====================================================================
 * Express 라우트 보호 미들웨어 모음
 * ------------------------------------------------------------------
 * 실제 JWT 서명·검증 로직은 utils/jwtAuth.js 에 있고, 이 파일은 그 위에서
 * "라우트에 next()로 연결되는 미들웨어" 형태만 감싸서 재노출/조합한다.
 *   - requireAuth  : jwtAuth.js 원본 그대로 재노출 (로그인 필수 라우트용)
 *   - optionalAuth : jwtAuth.js 원본 그대로 재노출 (로그인 여부만 참고하는 라우트용)
 *   - requireAdmin : 이 파일에서 새로 정의 — requireAuth 위에 관리자 권한 체크를 추가
 * ==================================================================== */
const { requireAuth, optionalAuth } = require('../utils/jwtAuth');

/**
 * 관리자 전용 미들웨어
 * requireAuth 통과 후 관리자 여부(isAdmin)를 확인한다.
 */
function requireAdmin(req, res, next) {
  // requireAuth가 실패하면 내부에서 응답을 보내고 반환하므로
  // 여기까지 도달했다면 인증은 성공한 상태이다.
  requireAuth(req, res, () => {
    // req.auth 는 requireAuth 내부에서 verifyToken() 결과로 채워진 JWT payload.
    // 관리자 토큰(signAdminToken)만 isAdmin: true 를 담고 있으므로,
    // 일반 회원 토큰으로는 이 지점에서 항상 403이 된다.
    if (!req.auth?.isAdmin) {
      return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    }
    next();
  });
}

module.exports = {
  requireAuth,
  optionalAuth,
  requireAdmin,
};
