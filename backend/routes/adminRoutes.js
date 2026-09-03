// ========================================================
// routes/adminRoutes.js - 관리자 전용 API 라우터 (/api/admin)
// ========================================================
// 관리자 로그인 자체는 공개 엔드포인트지만, 그 외 모든 라우트는
// requireAdmin 미들웨어(middleware/auth.js)를 거친다.
// requireAdmin은 내부적으로 requireAuth로 JWT를 검증한 뒤 payload의
// isAdmin 플래그가 true인지 추가로 확인한다 — 즉 일반 회원 토큰(authToken)으로는
// 절대 통과할 수 없고, adminController.login()이 발급하는 관리자 전용 토큰
// (signAdminToken, 유효기간 24h)만 통과한다. 일반 회원 로그인 토큰(signUserToken,
// 유효기간 7d)과는 서명 payload의 isAdmin 값만 다를 뿐 같은 JWT 검증 로직을 공유한다.
// ========================================================
const express = require('express');
const router = express.Router();
const { login, getUsers, deleteUser } = require('../controllers/adminController');
const { getBlocks, addBlock, removeBlock } = require('../controllers/blockController');
const {
  getReportedPosts,
  getReportedComments,
  dismissPostReport,
  dismissCommentReport,
  deleteReportedPost,
  deleteReportedComment,
} = require('../controllers/adminTierReportController');
const { requireAdmin } = require('../middleware/auth');

// ====== 공개 ======
// 관리자 아이디/비번 검증 후 관리자용 JWT 발급 (adminController.login).
// 성공 시 프론트는 이 토큰을 authToken과 별도로 localStorage.adminAuthToken에 저장해 사용한다.
router.post('/login', login);

// ====== 관리자 전용 (requireAdmin) ======
// 회원 목록 조회 / 회원 강제 탈퇴(작성 글·댓글·좋아요·알림·차단·문의까지 함께 정리)
router.get('/users', requireAdmin, getUsers);
router.delete('/users/:id', requireAdmin, deleteUser);
// 닉네임 또는 IP 차단 목록 조회/추가/해제 (blockController — 만료된 차단은 조회 시 자동 정리)
router.get('/blocks', requireAdmin, getBlocks);
router.post('/blocks', requireAdmin, addBlock);
router.delete('/blocks/:id', requireAdmin, removeBlock);

// 커스텀 티어 게시글/댓글 신고 관리 — 목록 조회, 신고 기각(dismiss), 강제 삭제
router.get('/tier-reports/posts', requireAdmin, getReportedPosts);
router.get('/tier-reports/comments', requireAdmin, getReportedComments);
router.patch('/tier-reports/posts/:id/dismiss', requireAdmin, dismissPostReport);
router.patch('/tier-reports/comments/:id/dismiss', requireAdmin, dismissCommentReport);
router.delete('/tier-reports/posts/:id', requireAdmin, deleteReportedPost);
router.delete('/tier-reports/comments/:id', requireAdmin, deleteReportedComment);

module.exports = router;