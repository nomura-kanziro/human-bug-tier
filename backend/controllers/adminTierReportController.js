const TierList = require('../models/TierList');
const TierPostComment = require('../models/TierPostComment');

const getReportedPosts = async (req, res) => {
  try {
    const posts = await TierList.find({})
      .sort({ updatedAt: -1 })
      .select('title author authorEmail reported reportReason reportDetail createdAt updatedAt viewCount likeCount');
    res.json(posts);
  } catch (err) {
    console.error('커스텀 메이커 게시글 목록 조회 실패:', err);
    res.status(500).json({ error: '게시글 목록 조회 실패' });
  }
};

const getReportedComments = async (req, res) => {
  try {
    const comments = await TierPostComment.find({})
      .sort({ updatedAt: -1 })
      .select('tierListId author authorEmail content reported reportReason reportDetail createdAt updatedAt');
    res.json(comments);
  } catch (err) {
    console.error('커스텀 메이커 댓글 목록 조회 실패:', err);
    res.status(500).json({ error: '댓글 목록 조회 실패' });
  }
};

const dismissPostReport = async (req, res) => {
  try {
    const post = await TierList.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
    }

    post.reported = false;
    post.reportReason = '';
    post.reportDetail = '';
    await post.save();

    res.json({ success: true });
  } catch (err) {
    console.error('게시글 신고 해제 실패:', err);
    res.status(500).json({ error: '신고 해제 실패' });
  }
};

const dismissCommentReport = async (req, res) => {
  try {
    const comment = await TierPostComment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ error: '댓글을 찾을 수 없습니다.' });
    }

    comment.reported = false;
    comment.reportReason = '';
    comment.reportDetail = '';
    await comment.save();

    res.json({ success: true });
  } catch (err) {
    console.error('댓글 신고 해제 실패:', err);
    res.status(500).json({ error: '신고 해제 실패' });
  }
};

const deleteReportedPost = async (req, res) => {
  try {
    const deleted = await TierList.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
    }

    await TierPostComment.deleteMany({ tierListId: req.params.id });
    res.json({ success: true });
  } catch (err) {
    console.error('신고 게시글 삭제 실패:', err);
    res.status(500).json({ error: '게시글 삭제 실패' });
  }
};

const deleteReportedComment = async (req, res) => {
  try {
    const comment = await TierPostComment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ error: '댓글을 찾을 수 없습니다.' });
    }

    await TierPostComment.deleteMany({
      $or: [{ _id: comment._id }, { parentCommentId: comment._id }],
    });

    res.json({ success: true });
  } catch (err) {
    console.error('신고 댓글 삭제 실패:', err);
    res.status(500).json({ error: '댓글 삭제 실패' });
  }
};

module.exports = {
  getReportedPosts,
  getReportedComments,
  dismissPostReport,
  dismissCommentReport,
  deleteReportedPost,
  deleteReportedComment,
};