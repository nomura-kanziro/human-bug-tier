// ========================================================
// routes/eventRoutes.js - 이벤트 API 라우터 (/api/events)
// ========================================================
// 이벤트는 전부 포인트·기록이 걸려 있어 로그인 없이는 의미가 없으므로 requireAuth 가 기본이다.
// 두 가지 예외적인 접근 제어가 있다.
//
//  1) 메모리 게임 순위표만 optionalAuth — 비회원도 순위는 구경할 수 있고,
//     로그인 상태면 "내 최고 기록"이 같이 내려온다.
//  2) "제작한 티어표 공개"(showcase)는 아직 **정식 공개 전 뼈대**라 조회·출품까지 전부
//     requireAdmin 으로 막아 둔다. 정식 오픈할 때 조회/출품 두 줄만 requireAuth 로 바꾸면 된다.
// ========================================================
const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { requireAuth, optionalAuth, requireAdmin } = require('../middleware/auth');

// ====== 매일 간단 퀴즈 (회원 전용, 하루 1회) ======
router.get('/quiz/today', requireAuth, eventController.getQuizToday);   // 오늘 문제 + 상금 확률표
router.post('/quiz/answer', requireAuth, eventController.answerQuiz);   // 보기 번호 제출 → 채점·지급

// ====== 메모리 게임 (4×4 → 6×6 → 8×8) ======
router.post('/memory/start', requireAuth, eventController.startMemory);        // 새 판 + 1단계 카드
router.post('/memory/stage', requireAuth, eventController.clearMemoryStage);   // 단계 통과 신고(시간은 서버가 측정)
router.get('/memory/leaderboard', optionalAuth, eventController.getMemoryLeaderboard);
router.post('/memory/settle', requireAdmin, eventController.settleMemoryPeriod); // 기간 마감 + 1위 포인트 지급

// ====== 제작한 티어표 공개 (뼈대 — 지금은 관리자만) ======
router.get('/showcase', requireAdmin, eventController.getShowcase);
router.post('/showcase', requireAdmin, eventController.saveShowcase);          // 회차 생성/수정(마감·공개 시각)
router.post('/showcase/entry', requireAdmin, eventController.enterShowcase);   // 출품(정식 공개 시 requireAuth 로)
router.post('/showcase/reveal', requireAdmin, eventController.revealShowcase); // 즉시 결과 발표 + 참가자 알림

module.exports = router;
