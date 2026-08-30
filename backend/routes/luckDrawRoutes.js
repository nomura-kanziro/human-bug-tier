const express = require('express');
const router = express.Router();
const luckDrawController = require('../controllers/luckDrawController');
const { requireAuth, optionalAuth } = require('../middleware/auth');

// 공개 — 로그인 시 todayDrawn 포함
router.get('/config', optionalAuth, luckDrawController.getConfig);

// 비로그인(게스트) = 체크만, 로그인 = 저장 (1일 1회)
router.post('/daily', optionalAuth, luckDrawController.drawDailyTier);

// 로그인 전용
router.get('/today', requireAuth, luckDrawController.getToday);
router.get('/history', requireAuth, luckDrawController.getHistory);

module.exports = router;
