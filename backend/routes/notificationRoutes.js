// ========================================================
// routes/notificationRoutes.js - 헤더 알림 API 라우터 (/api/notifications)
// ========================================================
// 전 라우트가 requireAuth로 보호된다 — 알림은 항상 "로그인한 특정 계정"에게
// 귀속되는 데이터이므로(recipientNickname 기준 조회), 비로그인 접근을 허용할
// 이유가 없다. requireAuth를 통과한 req.auth의 nickname으로 본인 알림만 걸러진다
// (notificationController.getRecipient 참고). isAdmin 여부에 관계없이 로그인만
// 되어 있으면 통과하므로, 관리자 계정도 같은 엔드포인트로 자신의 알림을 조회한다.
//
// /:id/read 같은 동적 파라미터 라우트보다 /settings, /unread-count, /read-all
// 같은 구체적인 경로를 먼저 선언해 라우팅 충돌을 피하고 있다.
// ========================================================
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteAllNotifications,
  getSettings,
  updateSettings,
} = require('../controllers/notificationController');

router.get('/', requireAuth, getNotifications);           // 최근 알림 목록 (기본 50건, 최대 100건)
router.delete('/', requireAuth, deleteAllNotifications);  // 본인 알림 전체 삭제 (알림함 비우기)
router.get('/unread-count', requireAuth, getUnreadCount); // 헤더 배지에 표시할 미읽음 개수
router.get('/settings', requireAuth, getSettings);        // 알림 종류별(티어게시판/문의/공지) on-off 설정 조회
router.patch('/settings', requireAuth, updateSettings);   // 알림 설정 변경 (User 또는 Admin 문서에 저장)
router.patch('/read-all', requireAuth, markAllAsRead);    // 전체 읽음 처리
router.patch('/:id/read', requireAuth, markAsRead);       // 단일 알림 읽음 처리

module.exports = router;