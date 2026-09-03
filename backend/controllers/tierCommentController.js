/* ======================================================================
 * tierCommentController.js — 커스텀 메이커 게시글의 댓글/대댓글/신고 컨트롤러
 * ----------------------------------------------------------------------
 * post_detail.js(프론트, 이미 주석 완료)가 호출하는 댓글 CRUD + 신고 API다.
 * 댓글은 1단계 대댓글(parentCommentId)만 지원하며, 인용(quote) 기능도 있다
 * (quotedUser/quotedMessage — 특정 유저 멘션 인용 답글 작성 시 사용).
 * 소유권 검사는 isCommentOwner(comment, actor) 헬퍼로 "댓글 작성자 닉네임
 * === 현재 로그인 유저 닉네임"을 비교하는 방식이다.
 * 댓글 작성 시 차단 유저 체크(isUserBlocked)를 거치고, 성공 시
 * notificationService 를 통해 게시글 작성자/부모 댓글 작성자/멘션 대상에게
 * 알림을 비동기로 발송한다(실패해도 .catch(()=>{}) 로 무시 — 알림 실패가
 * 댓글 등록 자체를 막지 않도록 함).
 * ====================================================================== */
const mongoose = require('mongoose');
const TierList = require('../models/TierList');
const TierPostComment = require('../models/TierPostComment');
const getClientIp = require('../utils/getClientIp');
const { isUserBlocked } = require('../utils/checkBlocked');
const { getActor } = require('../utils/jwtAuth');
const { isCommentOwner } = require('../utils/ownership');
const {
  notifyTierPostComment,
  notifyTierCommentReply,
  notifyTierCommentMention,
} = require('../utils/notificationService');

// ====== 게시글의 댓글 전체 목록 조회 (작성순 오름차순) ======
// 대댓글도 같은 컬렉션에 parentCommentId 를 갖는 형태로 함께 저장되므로,
// 트리 구조로 가공하지 않고 평탄한 배열 그대로 내려준다(정렬만 작성 시간순).
// 프론트(post_detail.js)에서 parentCommentId 를 보고 들여쓰기/그룹핑을 처리하는 구조로 추정된다.
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

// ====== 댓글 작성 — 로그인 필수 + 검증 + 차단 체크 + 대댓글/멘션 알림 발송 ======
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

    // 내용 필수 + 공백 제거 후 빈 문자열 금지 + 최대 1000자 제한
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

    // parentCommentId 가 있으면 대댓글(답글) — 부모 댓글이 실제로 이 게시글에
    // 존재하는지까지 확인해서, 다른 글의 댓글 ID를 부모로 지정하는 것을 방지
    if (parentCommentId) {
      if (!mongoose.Types.ObjectId.isValid(parentCommentId)) {
        return res.status(400).json({ error: '유효하지 않은 부모 댓글 ID입니다.' });
      }

      const existingParent = await TierPostComment.findOne({ _id: parentCommentId, tierListId: id });
      if (!existingParent) {
        return res.status(404).json({ error: '답변할 댓글을 찾을 수 없습니다.' });
      }
    }

    // 관리자가 차단한 유저(닉네임 또는 IP 기준)는 댓글 작성 불가
    const clientIp = getClientIp(req);
    const block = await isUserBlocked(actor.nickname, clientIp);
    if (block) {
      return res.status(403).json({
        error: '관리자로 인해 차단당했습니다.',
        blocked: true,
      });
    }

    // 댓글 문서 생성 — quotedUser/quotedMessage 는 "인용 답글"(특정 유저를 지목해
    // 그 사람의 말을 인용하며 답하는) 기능용 필드로, parentCommentId 와는 별개로 존재 가능
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

    // 알림 발송 우선순위: ①인용 대상이 있으면 멘션 알림 ②없고 대댓글이면 부모 댓글
    // 작성자에게 답글 알림 ③둘 다 아니면(최상위 댓글) 게시글 작성자에게 댓글 알림.
    // 인용과 대댓글 알림은 동시에(둘 다) 발송될 수 있음 — if/else 는 대댓글 vs 최상위만 분기.
    const quoted = (quotedUser || '').trim();
    const parentComment = parentCommentId
      ? await TierPostComment.findOne({ _id: parentCommentId, tierListId: id })
      : null;

    if (quoted) {
      notifyTierCommentMention(quoted, actor, trimmedContent, id, comment._id).catch(() => {});
    }

    if (parentComment) {
      notifyTierCommentReply(parentComment, actor, trimmedContent, id, comment._id).catch(() => {});
    } else {
      notifyTierPostComment(tierList, actor, trimmedContent, comment._id).catch(() => {});
    }

    res.status(201).json({ success: true, comment });
  } catch (err) {
    console.error('티어 게시글 댓글 등록 실패:', err);
    res.status(500).json({ error: '댓글 등록 실패' });
  }
};

// ====== 댓글 수정 — 본인 댓글만 내용 수정 가능(다른 필드는 변경 안 함) ======
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

    // 댓글 작성자 닉네임과 요청자 닉네임이 다르면 수정 금지
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

// ====== 댓글 삭제 — 본인 댓글만 삭제 가능, 이 댓글에 달린 대댓글까지 함께 삭제 ======
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

    // 자기 자신 + 자신을 부모로 둔 대댓글까지 한 번에 삭제(고아 대댓글 방지)
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

// ====== 댓글 신고 — 본인 댓글 신고 금지 + 중복 신고 방지 (관리자 페이지에서 처리) ======
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

    // 본인 댓글은 신고 불가
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