const TierList = require('../models/TierList');

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

    res.json(tierList);
  } catch (err) {
    console.error('티어 리스트 상세 조회 실패:', err);
    res.status(500).json({ error: '티어 리스트 조회 실패' });
  }
};

const createTierList = async (req, res) => {
  try {
    const {
      title,
      description = '',
      tierData,
      author = 'anonymous',
      authorEmail = '',
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
      author: author.trim() || 'anonymous',
      authorEmail: authorEmail.trim(),
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
    const tierList = await TierList.findById(req.params.id);
    if (!tierList) {
      return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
    }

    tierList.likeCount += 1;
    await tierList.save();

    res.json({ success: true, likeCount: tierList.likeCount });
  } catch (err) {
    console.error('티어 리스트 추천 실패:', err);
    res.status(500).json({ error: '추천 처리 실패' });
  }
};

function isTierListOwner(tierList, { authorEmail = '', author = '' }) {
  const postEmail = (tierList.authorEmail || '').trim().toLowerCase();
  const requestEmail = (authorEmail || '').trim().toLowerCase();

  if (postEmail && requestEmail) {
    return postEmail === requestEmail;
  }

  const postAuthor = (tierList.author || '').trim();
  const requestAuthor = (author || '').trim();
  return Boolean(postAuthor && requestAuthor && postAuthor === requestAuthor);
}

const deleteTierList = async (req, res) => {
  try {
    const { authorEmail = '', author = '' } = req.body || {};
    const tierList = await TierList.findById(req.params.id);

    if (!tierList) {
      return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
    }

    if (!isTierListOwner(tierList, { authorEmail, author })) {
      return res.status(403).json({ error: '본인 게시글만 삭제할 수 있습니다.' });
    }

    await TierList.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('티어 리스트 삭제 실패:', err);
    res.status(500).json({ error: '게시글 삭제 실패' });
  }
};

const reportTierList = async (req, res) => {
  try {
    const { reason = '', detail = '', author = '', authorEmail = '' } = req.body || {};
    const tierList = await TierList.findById(req.params.id);

    if (!tierList) {
      return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
    }

    if (isTierListOwner(tierList, { authorEmail, author })) {
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
  likeTierList,
  deleteTierList,
  reportTierList,
};