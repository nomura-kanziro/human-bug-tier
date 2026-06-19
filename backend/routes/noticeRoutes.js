const express = require('express');
const router = express.Router();
const noticeController = require('../controllers/noticeController');
const { requireAdmin } = require('../middleware/auth');

// 공개 조회
router.get('/', noticeController.getNotices);
router.get('/:id', noticeController.getNoticeById);

// 관리자 전용 (공지 작성/수정/삭제)
router.post('/', requireAdmin, noticeController.createNotice);
router.patch('/:id/pin', requireAdmin, noticeController.togglePin);
router.delete('/:id', requireAdmin, noticeController.deleteNotice);

module.exports = router;