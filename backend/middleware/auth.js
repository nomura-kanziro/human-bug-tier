const { requireAuth, optionalAuth } = require('../utils/jwtAuth');

/**
 * 관리자 전용 미들웨어
 * requireAuth 통과 후 관리자 여부(isAdmin)를 확인한다.
 */
function requireAdmin(req, res, next) {
  // requireAuth가 실패하면 내부에서 응답을 보내고 반환하므로
  // 여기까지 도달했다면 인증은 성공한 상태이다.
  requireAuth(req, res, () => {
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
