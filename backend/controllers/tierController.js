const TierList = require('../models/TierList');
const TierLike = require('../models/TierLike');
const TierPostComment = require('../models/TierPostComment');
const { getActor } = require('../utils/jwtAuth');
const { isTierListOwner, getVoterKey } = require('../utils/ownership');

const getAllTierLists = async (req, res) => {
  try {
    const { search, author } = req.query;
    const filter = { isPublic: true };

    if (author) {
      filter.author = author;
    }

    if (search) {
      const keyword = search.trim();
      filter.$or = [
        { title: { $regex: keyword, $options: 'i' } },
        { author: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } },
      ];
    }

    const tierLists = await TierList.find(filter).sort({ createdAt: -1 });
    res.json(tierLists);
  } catch (err) {
    console.error('티어 리스트 목록 조회 실패:', err);
    res.status(500).json({ error: '티어 리스트 불러오기 실패' });
  }
};

const getTierListById = async (req, res) => {
  try {
    const tierList = await TierList.findById(req.params.id);
    if (!tierList) {
      return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
    }

    tierList.viewCount += 1;
    await tierList.save();

    const actor = getActor(req);
    let likedByMe = false;
    if (actor?.nickname) {
      const voterKey = getVoterKey(actor);
      likedByMe = Boolean(await TierLike.findOne({ tierListId: tierList._id, voterKey }));
    }

    const payload = tierList.toObject();
    payload.likedByMe = likedByMe;

    res.json(payload);
  } catch (err) {
    console.error('티어 리스트 상세 조회 실패:', err);
    res.status(500).json({ error: '티어 리스트 조회 실패' });
  }
};

const createTierList = async (req, res) => {
  try {
    const actor = getActor(req);
    if (!actor?.nickname) {
      return res.status(401).json({ error: '로그인이 필요합니다.' });
    }

    const {
      title,
      description = '',
      tierData,
      thumbnail = '',
      isPublic = true,
      tags = [],
    } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ error: '제목은 필수입니다.' });
    }

    if (!tierData || typeof tierData !== 'object') {
      return res.status(400).json({ error: '티어 데이터가 필요합니다.' });
    }

    const newTierList = new TierList({
      title: title.trim(),
      description: description.trim(),
      tierData,
      author: actor.nickname,
      authorEmail: actor.email || '',
      thumbnail,
      isPublic,
      tags,
    });

    const savedTierList = await newTierList.save();
    res.status(201).json({ success: true, tierList: savedTierList });
  } catch (err) {
    console.error('티어 리스트 저장 실패:', err);
    res.status(500).json({ error: '티어 리스트 저장 실패' });
  }
};

const likeTierList = async (req, res) => {
  try {
    const actor = getActor(req);
    if (!actor?.nickname) {
      return res.status(401).json({ error: '로그인이 필요합니다.' });
    }

    const tierList = await TierList.findById(req.params.id);
    if (!tierList) {
      return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
    }

    const voterKey = getVoterKey(actor);
    const existingLike = await TierLike.findOne({ tierListId: tierList._id, voterKey });

    if (existingLike) {
      return res.status(400).json({
        error: '이미 추천한 게시글입니다.',
        likeCount: tierList.likeCount,
        likedByMe: true,
      });
    }

    await TierLike.create({ tierListId: tierList._id, voterKey });
    tierList.likeCount += 1;
    await tierList.save();

    res.json({ success: true, likeCount: tierList.likeCount, likedByMe: true });
  } catch (err) {
    console.error('티어 리스트 추천 실패:', err);
    res.status(500).json({ error: '추천 처리 실패' });
  }
};

/** 본인 게시글만 제목·설명·티어 배치·썸네일 수정 */
const updateTierList = async (req, res) => {
  try {
    const actor = getActor(req);
    if (!actor?.nickname) {
      return res.status(401).json({ error: '로그인이 필요합니다.' });
    }

    const tierList = await TierList.findById(req.params.id);
    if (!tierList) {
      return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
    }

    if (!isTierListOwner(tierList, actor)) {
      return res.status(403).json({ error: '본인 게시글만 수정할 수 있습니다.' });
    }

    const {
      title,
      description,
      tierData,
      thumbnail,
      isPublic,
      tags,
    } = req.body || {};

    if (title !== undefined) {
      const t = String(title).trim();
      if (!t) {
        return res.status(400).json({ error: '제목은 비울 수 없습니다.' });
      }
      tierList.title = t;
    }

    if (description !== undefined) {
      tierList.description = String(description).trim();
    }

    if (tierData !== undefined) {
      if (!tierData || typeof tierData !== 'object') {
        return res.status(400).json({ error: '티어 데이터가 필요합니다.' });
      }
      tierList.tierData = tierData;
    }

    if (thumbnail !== undefined) {
      tierList.thumbnail = String(thumbnail || '');
    }

    if (isPublic !== undefined) {
      tierList.isPublic = Boolean(isPublic);
    }

    if (tags !== undefined) {
      tierList.tags = Array.isArray(tags) ? tags : [];
    }

    // author / likeCount / viewCount / reported 는 유지
    const saved = await tierList.save();
    res.json({ success: true, tierList: saved });
  } catch (err) {
    console.error('티어 리스트 수정 실패:', err);
    res.status(500).json({ error: '게시글 수정 실패' });
  }
};

const deleteTierList = async (req, res) => {
  try {
    const actor = getActor(req);
    if (!actor?.nickname) {
      return res.status(401).json({ error: '로그인이 필요합니다.' });
    }

    const tierList = await TierList.findById(req.params.id);
    if (!tierList) {
      return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
    }

    if (!isTierListOwner(tierList, actor)) {
      return res.status(403).json({ error: '본인 게시글만 삭제할 수 있습니다.' });
    }

    await Promise.all([
      TierList.findByIdAndDelete(req.params.id),
      TierPostComment.deleteMany({ tierListId: req.params.id }),
      TierLike.deleteMany({ tierListId: req.params.id }),
    ]);

    res.json({ success: true });
  } catch (err) {
    console.error('티어 리스트 삭제 실패:', err);
    res.status(500).json({ error: '게시글 삭제 실패' });
  }
};

const reportTierList = async (req, res) => {
  try {
    const actor = getActor(req);
    if (!actor?.nickname) {
      return res.status(401).json({ error: '로그인이 필요합니다.' });
    }

    const { reason = '', detail = '' } = req.body || {};
    const tierList = await TierList.findById(req.params.id);

    if (!tierList) {
      return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
    }

    if (isTierListOwner(tierList, actor)) {
      return res.status(400).json({ error: '본인 게시글은 신고할 수 없습니다.' });
    }

    if (tierList.reported) {
      return res.status(400).json({ error: '이미 신고된 게시글입니다.' });
    }

    tierList.reported = true;
    tierList.reportReason = (reason || '').trim();
    tierList.reportDetail = (detail || '').trim();
    await tierList.save();

    res.json({ success: true, message: '신고가 접수되었습니다.' });
  } catch (err) {
    console.error('티어 리스트 신고 실패:', err);
    res.status(500).json({ error: '게시글 신고 실패' });
  }
};

module.exports = {
  getAllTierLists,
  getTierListById,
  createTierList,
  updateTierList,
  likeTierList,
  deleteTierList,
  reportTierList,
};