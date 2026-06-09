const express = require('express');
const router = express.Router();
const inquiryController = require('../controllers/inquiryController');

// 문의 등록
router.post('/', inquiryController.createInquiry);

// 전체 문의 목록 조회
router.get('/', inquiryController.getInquiries);

// 문의 수정
router.put('/:id', inquiryController.updateInquiry);

// 문의 삭제
router.delete('/:id', inquiryController.deleteInquiry);

// 답변 등록
router.post('/:id/answers', inquiryController.addAnswer);

module.exports = router;