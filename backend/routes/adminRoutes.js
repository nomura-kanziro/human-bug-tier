const express = require('express');
const router = express.Router();
const { login, getUsers } = require('../controllers/adminController');
const { getBlocks, addBlock, removeBlock } = require('../controllers/blockController');
const {
  getReportedPosts,
  getReportedComments,
  dismissPostReport,
  dismissCommentReport,
  deleteReportedPost,
  deleteReportedComment,
} = require('../controllers/adminTierReportController');
const { requireAdmin } = require('../middleware/auth');

// 공개
router.post('/login', login);

// 관리자 전용
router.get('/users', requireAdmin, getUsers);
router.get('/blocks', requireAdmin, getBlocks);
router.post('/blocks', requireAdmin, addBlock);
router.delete('/blocks/:id', requireAdmin, removeBlock);

router.get('/tier-reports/posts', requireAdmin, getReportedPosts);
router.get('/tier-reports/comments', requireAdmin, getReportedComments);
router.patch('/tier-reports/posts/:id/dismiss', requireAdmin, dismissPostReport);
router.patch('/tier-reports/comments/:id/dismiss', requireAdmin, dismissCommentReport);
router.delete('/tier-reports/posts/:id', requireAdmin, deleteReportedPost);
router.delete('/tier-reports/comments/:id', requireAdmin, deleteReportedComment);

module.exports = router;