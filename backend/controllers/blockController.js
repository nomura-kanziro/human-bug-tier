const Block = require('../models/Block');

const PRESET_DURATIONS = [1, 3, 7, 14, 30, 90];

function validateDurationDays(days) {
  const num = parseInt(days, 10);
  if (!Number.isFinite(num) || num < 1 || num > 9999) {
    return null;
  }
  return num;
}

const getBlocks = async (req, res) => {
  try {
    const now = new Date();
    await Block.deleteMany({
      $or: [
        { expiresAt: { $lte: now } },
        { expiresAt: { $exists: false } },
      ],
    });

    const blocks = await Block.find({ expiresAt: { $gt: now } }).sort({ createdAt: -1 });
    res.json(blocks);
  } catch (err) {
    console.error('차단 목록 조회 에러:', err);
    res.status(500).json({ error: '차단 목록 조회 실패' });
  }
};

const addBlock = async (req, res) => {
  try {
    const { value, type, durationDays } = req.body;
    const trimmed = (value || '').trim();
    const days = validateDurationDays(durationDays);

    if (!trimmed) {
      return res.status(400).json({ error: '차단할 ID 또는 IP를 입력해주세요.' });
    }

    if (!days) {
      return res.status(400).json({ error: '차단 기간은 1일 이상 9999일 이하로 설정해주세요.' });
    }

    const now = new Date();
    const existing = await Block.findOne({ value: trimmed });

    if (existing && existing.expiresAt > now) {
      return res.status(400).json({ error: '이미 차단된 항목입니다.' });
    }

    if (existing) {
      await Block.findByIdAndDelete(existing._id);
    }

    const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const isIp = type === 'ip' || /^\d{1,3}(\.\d{1,3}){3}$/.test(trimmed);

    const block = await Block.create({
      value: trimmed,
      type: isIp ? 'ip' : 'userId',
      durationDays: days,
      blockedAt: now,
      expiresAt,
    });

    res.status(201).json({ success: true, block });
  } catch (err) {
    console.error('차단 추가 에러:', err);
    res.status(500).json({ error: '차단 추가 실패' });
  }
};

const removeBlock = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Block.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ error: '차단 항목을 찾을 수 없습니다.' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('차단 해제 에러:', err);
    res.status(500).json({ error: '차단 해제 실패' });
  }
};

module.exports = { getBlocks, addBlock, removeBlock, PRESET_DURATIONS };