// ========================================================
// routes/siteRoutes.js — 사이트 운영 설정 공개 조회 (/api/site)
// ========================================================
// 바꾸는 쪽(관리자 전용)은 routes/adminRoutes.js 의 /api/admin/site/* 에 있다.
const express = require('express');
const router = express.Router();
const { getSiteSettings } = require('../controllers/siteSettingController');

// 현재 이벤트 디자인(계절 배경) — 로그인 없이 모든 방문자가 읽는다
router.get('/settings', getSiteSettings);

// 가벼운 상태 확인 — 모바일 앱(mobile/)이 "서버에 닿는지 · DB 가 붙어 있는지"만 볼 때 쓴다.
// /health 는 /api 밖이라 Cloudflare Pages 프록시(/api/*)를 지나지 못해서, 같은 내용을 /api 아래에 아주 작게 둔다.
// 시크릿·설정 값은 넣지 않고, 응답을 작게 유지한다(모바일 데이터·배터리 절약).
router.get('/status', (req, res) => {
  const dbState = require('mongoose').connection.readyState;
  res.set('Cache-Control', 'no-store');
  res.json({
    ok: true,
    api: 'ok',
    db: { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' }[dbState] || 'unknown',
    time: new Date().toISOString(),
  });
});

module.exports = router;
