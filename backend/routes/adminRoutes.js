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
const { requireAuth } = require('../utils/jwtAuth');

const requireAdmin = (req, res, next) => {
  requireAuth(req, res, () => {
    if (!req.auth?.isAdmin) {
      return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    }
    return next();
  });
};

router.post('/login', login);
router.get('/users', getUsers);
router.get('/blocks', getBlocks);
router.post('/blocks', addBlock);
router.delete('/blocks/:id', removeBlock);
router.get('/tier-reports/posts', getReportedPosts);
router.get('/tier-reports/comments', getReportedComments);
router.patch('/tier-reports/posts/:id/dismiss', requireAdmin, dismissPostReport);
router.patch('/tier-reports/comments/:id/dismiss', requireAdmin, dismissCommentReport);
router.delete('/tier-reports/posts/:id', requireAdmin, deleteReportedPost);
router.delete('/tier-reports/comments/:id', requireAdmin, deleteReportedComment);

module.exports = router;