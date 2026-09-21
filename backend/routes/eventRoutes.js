// ========================================================
// routes/eventRoutes.js - 이벤트 API 라우터 (/api/events)
// ========================================================
// 이벤트는 전부 포인트·기록이 걸려 있어 로그인 없이는 의미가 없으므로 requireAuth 가 기본이다.
// 예외적인 접근 제어:
//
//  1) 조회만 optionalAuth — 메모리 게임 순위표와 티어표 공개 현황은 비회원도 구경할 수 있고,
//     로그인 상태면 "내 최고 기록" / "내 출품·내 투표"가 같이 내려온다.
//  2) 관리자 전용(requireAdmin) — 메모리 기록 이벤트 회차 관리, 티어표 공개 회차 예약·열기·마감·선정·발표.
//     (티어표 공개는 예전에 관리자 전용 뼈대였다가 회원에게 정식 공개됐다 — 참가·투표 라우트가 requireAuth 인 이유.)
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
// 기록 이벤트 회차는 관리자 페이지에서 관리자가 직접 열고 닫고 정산한다.
router.get('/memory/admin', requireAdmin, eventController.listMemoryPeriods);            // 최근 회차 목록
router.post('/memory/period', requireAdmin, eventController.saveMemoryPeriod);           // 회차 생성/수정
router.post('/memory/period/status', requireAdmin, eventController.setMemoryPeriodStatus); // 열기/닫기/정산/삭제

// ====== 제작한 티어표 공개 ======
// 회원: 진행 중인 회차 조회(optionalAuth — 비로그인도 구경 가능) / 출품 / 출품 취소 / 투표 (참가·투표는 컨트롤러가
//       이메일 인증을 마친 일반 회원만 통과시킨다). 관리자: 회차 예약·열기·마감·선정·발표.
router.get('/showcase', optionalAuth, eventController.getShowcase);
router.get('/showcase/my-posts', requireAuth, eventController.getMyShowcasePosts);         // 출품할 내 게시글 목록
router.post('/showcase/entry', requireAuth, eventController.enterShowcase);                // 내 게시글로 출품
router.post('/showcase/entry/cancel', requireAuth, eventController.cancelShowcaseEntry);   // 접수 중 출품 취소
router.post('/showcase/vote', requireAuth, eventController.voteShowcase);                  // 한 회차 한 표(같은 작품이면 취소)
router.get('/showcase/admin', requireAdmin, eventController.listShowcasesAdmin);           // 회차 목록 + 출품작·표 수
router.post('/showcase/save', requireAdmin, eventController.saveShowcase);                 // 회차 생성/수정
router.post('/showcase/status', requireAdmin, eventController.setShowcaseStatus);          // 예약/열기/닫기/선정/발표/삭제

module.exports = router;
