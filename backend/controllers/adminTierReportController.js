/* ======================================================================
 * adminTierReportController.js — 관리자용 커스텀 메이커 게시판 신고/관리 컨트롤러
 * ----------------------------------------------------------------------
 * 관리자 페이지의 "커스텀 티어 관리" 탭에서 사용하는 API 핸들러 모음이다.
 * 실제로는 신고된 것뿐 아니라 전체 게시글/댓글 목록도 함께 조회하며
 * (아래 getReportedPosts/getReportedComments 는 필터 없이 find({}) 전체 조회),
 * 신고 처리(해제)와 강제 삭제 기능을 제공한다.
 * 이 컨트롤러의 라우트는 관리자 인증 미들웨어(requireAdmin) 뒤에 연결되어
 * 있다는 전제 하에 동작하며, 이 파일 자체에는 별도의 권한 검사 코드가 없다
 * (라우터 레벨에서 관리자 여부를 이미 걸러준다는 뜻).
 * ====================================================================== */
const TierList = require('../models/TierList');
const TierPostComment = require('../models/TierPostComment');

// ====== 커스텀 메이커 게시글 전체 목록 조회 (관리자 대시보드 표시용) ======
// 신고 여부(reported)와 무관하게 전체 게시글을 최신 수정순으로 반환하고,
// 목록에 필요한 필드만 select 로 골라내어 응답 크기를 줄인다.
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

// ====== 커스텀 메이커 댓글 전체 목록 조회 (관리자 대시보드 표시용) ======
// 위 getReportedPosts 와 동일한 패턴으로, 전체 댓글을 최신 수정순으로 반환한다.
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

// ====== 게시글 신고 해제 — reported 플래그와 신고 사유를 초기화(게시글 자체는 유지) ======
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

// ====== 댓글 신고 해제 — reported 플래그와 신고 사유를 초기화(댓글 자체는 유지) ======
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

// ====== 게시글 관리자 강제 삭제 — 게시글 + 그에 달린 모든 댓글을 함께 제거 ======
// 소유권 검사가 없다(관리자 전용 라우트이므로 누구 글이든 삭제 가능).
const deleteReportedPost = async (req, res) => {
  try {
    const deleted = await TierList.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
    }

    // 게시글이 삭제됐으므로 연관된 댓글도 고아로 남지 않게 일괄 삭제
    await TierPostComment.deleteMany({ tierListId: req.params.id });
    res.json({ success: true });
  } catch (err) {
    console.error('신고 게시글 삭제 실패:', err);
    res.status(500).json({ error: '게시글 삭제 실패' });
  }
};

// ====== 댓글 관리자 강제 삭제 — 대상 댓글 + 그 댓글에 달린 대댓글(답글)까지 함께 제거 ======
const deleteReportedComment = async (req, res) => {
  try {
    const comment = await TierPostComment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ error: '댓글을 찾을 수 없습니다.' });
    }

    // parentCommentId 로 이 댓글을 부모로 삼는 대댓글까지 한 번에 삭제
    // (자기 자신 _id 이거나, parentCommentId 가 이 댓글을 가리키는 문서 전부)
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