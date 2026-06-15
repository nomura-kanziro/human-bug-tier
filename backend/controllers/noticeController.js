const Notice = require('../models/Notice');

const MAX_PINNED = 5;

const sortNotices = { isPinned: -1, pinnedAt: -1, createdAt: -1 };

const getNotices = async (req, res) => {
  try {
    const { category, limit } = req.query;
    const filter = {};

    if (category === 'notice' || category === 'news') {
      filter.category = category;
    }

    let query = Notice.find(filter).sort(sortNotices);

    if (limit) {
      const num = parseInt(limit, 10);
      if (Number.isFinite(num) && num > 0) {
        query = query.limit(num);
      }
    }

    const notices = await query;
    res.json(notices);
  } catch (err) {
    console.error('공지 목록 조회 에러:', err);
    res.status(500).json({ error: '공지 목록 조회 실패' });
  }
};

const getNoticeById = async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id);
    if (!notice) {
      return res.status(404).json({ error: '공지를 찾을 수 없습니다.' });
    }
    res.json(notice);
  } catch (err) {
    res.status(500).json({ error: '공지 조회 실패' });
  }
};

const createNotice = async (req, res) => {
  try {
    const { title, content, summary, category, author } = req.body;

    if (!title?.trim() || !content?.trim()) {
      return res.status(400).json({ error: '제목과 내용은 필수입니다.' });
    }

    if (!['notice', 'news'].includes(category)) {
      return res.status(400).json({ error: '분류는 notice(전체 공지) 또는 news(새소식)여야 합니다.' });
    }

    const notice = await Notice.create({
      title: title.trim(),
      content: content.trim(),
      summary: (summary || content).trim().slice(0, 200),
      category,
      author: author || '관리자',
    });

    res.status(201).json({ success: true, notice });
  } catch (err) {
    console.error('공지 등록 에러:', err);
    res.status(500).json({ error: '공지 등록 실패' });
  }
};

const togglePin = async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id);
    if (!notice) {
      return res.status(404).json({ error: '공지를 찾을 수 없습니다.' });
    }

    if (notice.isPinned) {
      notice.isPinned = false;
      notice.pinnedAt = undefined;
    } else {
      const pinnedCount = await Notice.countDocuments({ isPinned: true });
      if (pinnedCount >= MAX_PINNED) {
        return res.status(400).json({ error: `고정은 최대 ${MAX_PINNED}개까지 가능합니다.` });
      }
      notice.isPinned = true;
      notice.pinnedAt = new Date();
    }

    await notice.save();
    res.json({ success: true, notice });
  } catch (err) {
    console.error('공지 고정 에러:', err);
    res.status(500).json({ error: '공지 고정 처리 실패' });
  }
};

const deleteNotice = async (req, res) => {
  try {
    const deleted = await Notice.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: '공지를 찾을 수 없습니다.' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '공지 삭제 실패' });
  }
};

module.exports = { getNotices, getNoticeById, createNotice, togglePin, deleteNotice, MAX_PINNED };