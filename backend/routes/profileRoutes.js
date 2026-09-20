// ========================================================
// routes/profileRoutes.js - 프로필 관리 API 라우터 (/api/profile)
// ========================================================
// authRoutes 는 전부 "비로그인 상태에서 부르는" 공개 엔드포인트라서, 로그인이 필수인
// 프로필 기능은 이 라우터로 분리했다. 전부 requireAuth 이며, 대상은 항상 토큰 주인 본인이다
// (경로/바디로 다른 회원을 지정할 수 없다 — 소유자 검증을 구조로 보장).
// ========================================================
const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { requireAuth } = require('../middleware/auth');

// 닉네임 변경 — 검증·복사본 전파·새 토큰 발급까지 한 번에 처리
router.post('/nickname', requireAuth, profileController.changeNickname);

module.exports = router;
