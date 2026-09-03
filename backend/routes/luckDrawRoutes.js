// ========================================================
// routes/luckDrawRoutes.js - "오늘의 행운 티어" 뽑기 API 라우터 (/api/luck-draw)
// ========================================================
// optionalAuth: 토큰이 있으면 req.auth를 채우고, 없거나 유효하지 않아도 에러 없이
//   그냥 통과시킨다(비로그인 게스트도 뽑기 자체는 가능하게 하기 위함).
// requireAuth: 토큰이 없으면 401로 막는다 — 이력/통계 등 "회원 전용" 기능에 사용.
//
// 서버 측 뽑기 제한(회원만 적용): 하루 20회 + 뽑기 간 3분 쿨다운(luckDrawController의
// MEMBER_DAILY_LIMIT / MEMBER_COOLDOWN_MS). 게스트는 서버가 신원을 특정할 수 없어
// (계정이 없으므로) 이 제한을 걸지 않는다 — 게스트용 "24시간" 안내는 프론트
// localStorage 기반 UX일 뿐 서버가 강제하는 값이 아니다.
// ========================================================
const express = require('express');
const router = express.Router();
const luckDrawController = require('../controllers/luckDrawController');
const { requireAuth, optionalAuth } = require('../middleware/auth');

// 공개 — 로그인 시 todayDrawn 포함
router.get('/config', optionalAuth, luckDrawController.getConfig);

// 비로그인(게스트) = 결과만 계산해서 반환(DB 저장 없음, 제한 없음)
// 로그인 = LuckProfile/LuckDraw에 저장하며 1일 20회 제한 + 3분 쿨다운 적용
router.post('/daily', optionalAuth, luckDrawController.drawDailyTier);

// ====== 로그인 전용 (requireAuth) ======
router.get('/today', requireAuth, luckDrawController.getToday);     // 오늘 남은 횟수/쿨다운/마지막 결과 조회
router.get('/history', requireAuth, luckDrawController.getHistory); // 뽑기 이력 조회 (최근 5건만 보관, 초과분 자동 삭제)
router.get('/stats', requireAuth, luckDrawController.getStats);     // 마이페이지용 누적 통계(총 횟수/티어별 카운트/포인트)

module.exports = router;
