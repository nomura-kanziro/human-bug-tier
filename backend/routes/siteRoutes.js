// ========================================================
// routes/siteRoutes.js — 사이트 운영 설정 공개 조회 (/api/site)
// ========================================================
// 바꾸는 쪽(관리자 전용)은 routes/adminRoutes.js 의 /api/admin/site/* 에 있다.
const express = require('express');
const router = express.Router();
const { getSiteSettings } = require('../controllers/siteSettingController');

// 현재 이벤트 디자인(계절 배경) — 로그인 없이 모든 방문자가 읽는다
router.get('/settings', getSiteSettings);

module.exports = router;
