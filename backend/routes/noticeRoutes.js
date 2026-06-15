const express = require('express');
const router = express.Router();
const noticeController = require('../controllers/noticeController');

router.get('/', noticeController.getNotices);
router.get('/:id', noticeController.getNoticeById);
router.post('/', noticeController.createNotice);
router.patch('/:id/pin', noticeController.togglePin);
router.delete('/:id', noticeController.deleteNotice);

module.exports = router;