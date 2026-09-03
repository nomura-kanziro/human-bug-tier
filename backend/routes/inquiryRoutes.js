// ========================================================
// routes/inquiryRoutes.js - 문의하기(Contact_us) API 라우터 (/api/inquiries)
// ========================================================
// 문의 작성/조회/신고는 로그인 없이도 가능한 공개 라우트다(JWT 인증 미들웨어를
// 타지 않고, body에 실려 오는 userId를 그대로 신뢰하는 구조 — inquiryController
// 참고: createInquiry는 IP 기반 차단(isUserBlocked)만 확인한다).
// 문의 수정/삭제 및 "답변 등록"은 관리자만 가능하도록 requireAdmin으로 막는다.
// ========================================================
const express = require('express');
const router = express.Router();
const inquiryController = require('../controllers/inquiryController');
const { requireAdmin } = require('../middleware/auth');

// ===== 공개 =====
router.post('/', inquiryController.createInquiry);                    // 문의 등록 (IP 차단 여부만 확인)
router.get('/', inquiryController.getInquiries);                      // 전체 문의 목록
router.get('/:id', inquiryController.getInquiryById);                 // 단일 문의 조회
router.post('/:id/report', inquiryController.reportInquiry);          // 문의 신고
router.post('/:id/answers/:answerId/report', inquiryController.reportAnswer); // 답변 신고

// ===== 관리자 전용 (requireAdmin) =====
router.delete('/', requireAdmin, inquiryController.deleteAllInquiries); // 전체 문의 일괄 삭제
router.put('/:id', requireAdmin, inquiryController.updateInquiry);
router.delete('/:id', requireAdmin, inquiryController.deleteInquiry);

// 답변 등록 시 quotedUser(멘션 대상)가 있으면 알림 발송, 없으면 문의 작성자에게 답변 알림 발송
router.post('/:id/answers', requireAdmin, inquiryController.addAnswer);
router.put('/:id/answers/:answerId', requireAdmin, inquiryController.updateAnswer);
router.delete('/:id/answers/:answerId', requireAdmin, inquiryController.deleteAnswer);

module.exports = router;