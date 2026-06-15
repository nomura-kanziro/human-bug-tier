const mongoose = require('mongoose');
const TierList = require('../models/TierList');
const TierPostComment = require('../models/TierPostComment');
const getClientIp = require('../utils/getClientIp');
const { isUserBlocked } = require('../utils/checkBlocked');
const { getActor } = require('../utils/jwtAuth');
const { isCommentOwner } = require('../utils/ownership');

const getTierComments = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: '유효하지 않은 게시글 ID입니다.' });
    }

    const tierList = await TierList.findById(id);
    if (!tierList) {
      return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
    }

    const comments = await TierPostComment.find({ tierListId: id }).sort({ createdAt: 1 });
    res.json(comments);
  } catch (err) {
    console.error('티어 게시글 댓글 목록 조회 실패:', err);
    res.status(500).json({ error: '댓글 목록 조회 실패' });
  }
};

const createTierComment = async (req, res) => {
  try {
    const { id } = req.params;
    const actor = getActor(req);

    if (!actor?.nickname) {
      return res.status(401).json({ error: '로그인이 필요합니다.' });
    }

    const {
      content,
      parentCommentId = null,
      quotedUser = '',
      quotedMessage = '',
    } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: '유효하지 않은 게시글 ID입니다.' });
    }

    const trimmedContent = (content || '').trim();
    if (!trimmedContent) {
      return res.status(400).json({ error: '댓글 내용을 입력해주세요.' });
    }

    if (trimmedContent.length > 1000) {
      return res.status(400).json({ error: '댓글은 1000자 이하로 작성해주세요.' });
    }

    const tierList = await TierList.findById(id);
    if (!tierList) {
      return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
    }

    if (parentCommentId) {
      if (!mongoose.Types.ObjectId.isValid(parentCommentId)) {
        return res.status(400).json({ error: '유효하지 않은 부모 댓글 ID입니다.' });
      }

      const parentComment = await TierPostComment.findOne({ _id: parentCommentId, tierListId: id });
      if (!parentComment) {
        return res.status(404).json({ error: '답변할 댓글을 찾을 수 없습니다.' });
      }
    }

    const clientIp = getClientIp(req);
    const block = await isUserBlocked(actor.nickname, clientIp);
    if (block) {
      return res.status(403).json({
        error: '관리자로 인해 차단당했습니다.',
        blocked: true,
      });
    }

    const comment = await TierPostComment.create({
      tierListId: id,
      author: actor.nickname,
      authorEmail: actor.email || '',
      content: trimmedContent,
      ip: clientIp,
      parentCommentId: parentCommentId || null,
      quotedUser: (quotedUser || '').trim(),
      quotedMessage: (quotedMessage || '').trim(),
    });

    res.status(201).json({ success: true, comment });
  } catch (err) {
    console.error('티어 게시글 댓글 등록 실패:', err);
    res.status(500).json({ error: '댓글 등록 실패' });
  }
};

const updateTierComment = async (req, res) => {
  try {
    const { id, commentId } = req.params;
    const actor = getActor(req);

    if (!actor?.nickname) {
      return res.status(401).json({ error: '로그인이 필요합니다.' });
    }

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ error: '유효하지 않은 ID입니다.' });
    }

    const trimmedContent = (req.body?.content || '').trim();
    if (!trimmedContent) {
      return res.status(400).json({ error: '댓글 내용을 입력해주세요.' });
    }

    if (trimmedContent.length > 1000) {
      return res.status(400).json({ error: '댓글은 1000자 이하로 작성해주세요.' });
    }

    const comment = await TierPostComment.findOne({ _id: commentId, tierListId: id });
    if (!comment) {
      return res.status(404).json({ error: '댓글을 찾을 수 없습니다.' });
    }

    if (!isCommentOwner(comment, actor)) {
      return res.status(403).json({ error: '본인 댓글만 수정할 수 있습니다.' });
    }

    comment.content = trimmedContent;
    await comment.save();

    res.json({ success: true, comment });
  } catch (err) {
    console.error('티어 게시글 댓글 수정 실패:', err);
    res.status(500).json({ error: '댓글 수정 실패' });
  }
};

const deleteTierComment = async (req, res) => {
  try {
    const { id, commentId } = req.params;
    const actor = getActor(req);

    if (!actor?.nickname) {
      return res.status(401).json({ error: '로그인이 필요합니다.' });
    }

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ error: '유효하지 않은 ID입니다.' });
    }

    const comment = await TierPostComment.findOne({ _id: commentId, tierListId: id });
    if (!comment) {
      return res.status(404).json({ error: '댓글을 찾을 수 없습니다.' });
    }

    if (!isCommentOwner(comment, actor)) {
      return res.status(403).json({ error: '본인 댓글만 삭제할 수 있습니다.' });
    }

    await TierPostComment.deleteMany({
      tierListId: id,
      $or: [{ _id: commentId }, { parentCommentId: commentId }],
    });

    res.json({ success: true });
  } catch (err) {
    console.error('티어 게시글 댓글 삭제 실패:', err);
    res.status(500).json({ error: '댓글 삭제 실패' });
  }
};

const reportTierComment = async (req, res) => {
  try {
    const { id, commentId } = req.params;
    const actor = getActor(req);

    if (!actor?.nickname) {
      return res.status(401).json({ error: '로그인이 필요합니다.' });
    }

    const { reason = '', detail = '' } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ error: '유효하지 않은 ID입니다.' });
    }

    const comment = await TierPostComment.findOne({ _id: commentId, tierListId: id });
    if (!comment) {
      return res.status(404).json({ error: '댓글을 찾을 수 없습니다.' });
    }

    if (isCommentOwner(comment, actor)) {
      return res.status(400).json({ error: '본인 댓글은 신고할 수 없습니다.' });
    }

    if (comment.reported) {
      return res.status(400).json({ error: '이미 신고된 댓글입니다.' });
    }

    comment.reported = true;
    comment.reportReason = (reason || '').trim();
    comment.reportDetail = (detail || '').trim();
    await comment.save();

    res.json({ success: true, message: '신고가 접수되었습니다.' });
  } catch (err) {
    console.error('티어 게시글 댓글 신고 실패:', err);
    res.status(500).json({ error: '댓글 신고 실패' });
  }
};

module.exports = {
  getTierComments,
  createTierComment,
  updateTierComment,
  deleteTierComment,
  reportTierComment,
};