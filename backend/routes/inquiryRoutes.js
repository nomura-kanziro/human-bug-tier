const express = require('express');
const router = express.Router();
const inquiryController = require('../controllers/inquiryController');
const { requireAdmin } = require('../middleware/auth');

// ===== 공개 =====
router.post('/', inquiryController.createInquiry);                    // 문의 등록
router.get('/', inquiryController.getInquiries);                      // 전체 문의 목록
router.get('/:id', inquiryController.getInquiryById);                 // 단일 문의 조회
router.post('/:id/report', inquiryController.reportInquiry);          // 문의 신고
router.post('/:id/answers/:answerId/report', inquiryController.reportAnswer); // 답변 신고

// ===== 관리자 전용 =====
router.delete('/', requireAdmin, inquiryController.deleteAllInquiries);
router.put('/:id', requireAdmin, inquiryController.updateInquiry);
router.delete('/:id', requireAdmin, inquiryController.deleteInquiry);

router.post('/:id/answers', requireAdmin, inquiryController.addAnswer);
router.put('/:id/answers/:answerId', requireAdmin, inquiryController.updateAnswer);
router.delete('/:id/answers/:answerId', requireAdmin, inquiryController.deleteAnswer);

module.exports = router;