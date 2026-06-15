const express = require('express');
const router = express.Router();
const {
  getAllTierLists,
  getTierListById,
  createTierList,
  likeTierList,
  deleteTierList,
  reportTierList,
} = require('../controllers/tierController');
const {
  getTierComments,
  createTierComment,
  updateTierComment,
  deleteTierComment,
  reportTierComment,
} = require('../controllers/tierCommentController');

router.get('/', getAllTierLists);
router.get('/:id/comments', getTierComments);
router.post('/:id/comments', createTierComment);
router.patch('/:id/comments/:commentId', updateTierComment);
router.delete('/:id/comments/:commentId', deleteTierComment);
router.post('/:id/comments/:commentId/report', reportTierComment);
router.post('/:id/report', reportTierList);
router.get('/:id', getTierListById);
router.post('/', createTierList);
router.patch('/:id/like', likeTierList);
router.delete('/:id', deleteTierList);

module.exports = router;