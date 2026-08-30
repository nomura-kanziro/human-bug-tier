const mongoose = require('mongoose');
const LuckDraw = require('../models/LuckDraw');
const luckPool = require('../data/luckPool');
const { getKstDateString } = require('../utils/kstDate');

// 합계 100 — 가중치가 그대로 퍼센트가 되도록 구성.
const DAILY_TIER_WEIGHTS = { 1: 1, 2: 3, 3: 6, 4: 10, 5: 14, 6: 18, 7: 18, 8: 16, 9: 14 };

// 회원 전용 제한 — 하루 20회, 뽑기 사이 3분 쿨다운. 게스트는 서버가 신원을 모르므로
// (계정이 없음) 여기서 제한하지 않는다. 게스트 24시간 안내는 프론트 localStorage UX일 뿐이다.
const MEMBER_DAILY_LIMIT = 20;
const MEMBER_COOLDOWN_MS = 3 * 60 * 1000;

function pickWeightedTier(weights) {
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = Math.random() * total;

  for (const [tier, weight] of entries) {
    roll -= weight;
    if (roll < 0) return Number(tier);
  }
  return Number(entries[entries.length - 1][0]);
}

function pickCharacter(tier) {
  const pool = luckPool[tier];
  return pool[Math.floor(Math.random() * pool.length)];
}

function buildDrawResult() {
  const tier = pickWeightedTier(DAILY_TIER_WEIGHTS);
  const character = pickCharacter(tier);
  return {
    mode: 'daily_tier',
    tier,
    characterName: character.name,
    imagePath: character.imagePath,
    tierPageUrl: `tier-class/tier${tier}.html`,
    drawDate: getKstDateString(),
  };
}

function toResultShape(doc) {
  return {
    mode: doc.mode,
    tier: doc.tier,
    characterName: doc.characterName,
    imagePath: doc.imagePath,
    tierPageUrl: `tier-class/tier${doc.tier}.html`,
    drawDate: doc.drawDate,
  };
}

function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

// 오늘 사용 횟수·쿨다운 잔여 시간·마지막 결과를 한 번에 계산.
async function getMemberDrawStatus(userId) {
  const drawDate = getKstDateString();
  const [todayCount, lastDraw] = await Promise.all([
    LuckDraw.countDocuments({ userId, mode: 'daily_tier', drawDate }),
    LuckDraw.findOne({ userId, mode: 'daily_tier' }).sort({ createdAt: -1 }),
  ]);

  let cooldownRemainingSec = 0;
  if (lastDraw) {
    const elapsedMs = Date.now() - lastDraw.createdAt.getTime();
    if (elapsedMs < MEMBER_COOLDOWN_MS) {
      cooldownRemainingSec = Math.ceil((MEMBER_COOLDOWN_MS - elapsedMs) / 1000);
    }
  }

  return {
    todayCount,
    remainingToday: Math.max(0, MEMBER_DAILY_LIMIT - todayCount),
    dailyLimit: MEMBER_DAILY_LIMIT,
    cooldownSec: MEMBER_COOLDOWN_MS / 1000,
    cooldownRemainingSec,
    lastResult: lastDraw ? toResultShape(lastDraw) : null,
  };
}

const getConfig = async (req, res) => {
  try {
    res.json({
      weights: DAILY_TIER_WEIGHTS,
      resetAt: 'KST 00:00',
      dailyLimit: MEMBER_DAILY_LIMIT,
      cooldownSec: MEMBER_COOLDOWN_MS / 1000,
    });
  } catch (err) {
    console.error('행운 뽑기 설정 조회 에러:', err);
    res.status(500).json({ error: '설정 조회 실패' });
  }
};

const drawDailyTier = async (req, res) => {
  try {
    // 게스트 — 계산만 하고 DB 접근 없이 종료 (제한도 서버에서 걸지 않음).
    if (!req.auth?.sub) {
      const result = buildDrawResult();
      return res.json({ ok: true, saved: false, guest: true, result });
    }

    if (!isDbConnected()) {
      return res.status(503).json({ error: '데이터베이스에 연결되지 않았습니다.' });
    }

    const status = await getMemberDrawStatus(req.auth.sub);

    if (status.remainingToday <= 0) {
      return res.status(429).json({
        ok: false,
        limitReached: true,
        error: `오늘 뽑기 횟수(${status.dailyLimit}/${status.dailyLimit})를 모두 사용했습니다. 내일 다시 도전해주세요.`,
        ...status,
      });
    }

    if (status.cooldownRemainingSec > 0) {
      return res.status(429).json({
        ok: false,
        cooldown: true,
        error: `${status.cooldownRemainingSec}초 후 다시 뽑을 수 있습니다.`,
        ...status,
      });
    }

    const result = buildDrawResult();
    await LuckDraw.create({
      userId: req.auth.sub,
      nickname: req.auth.nickname || '',
      mode: 'daily_tier',
      tier: result.tier,
      characterName: result.characterName,
      imagePath: result.imagePath,
      drawDate: result.drawDate,
    });

    res.json({
      ok: true,
      saved: true,
      guest: false,
      result,
      remainingToday: status.remainingToday - 1,
      dailyLimit: status.dailyLimit,
      cooldownRemainingSec: status.cooldownSec,
    });
  } catch (err) {
    console.error('오늘의 행운 티어 뽑기 에러:', err);
    res.status(500).json({ error: '뽑기 처리 실패' });
  }
};

const getToday = async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({ error: '데이터베이스에 연결되지 않았습니다.' });
    }

    const status = await getMemberDrawStatus(req.auth.sub);
    res.json({ ok: true, ...status });
  } catch (err) {
    console.error('오늘의 뽑기 상태 조회 에러:', err);
    res.status(500).json({ error: '상태 조회 실패' });
  }
};

const getHistory = async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({ error: '데이터베이스에 연결되지 않았습니다.' });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = 10;
    const filter = { userId: req.auth.sub };

    const [items, total] = await Promise.all([
      LuckDraw.find(filter).sort({ drawDate: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      LuckDraw.countDocuments(filter),
    ]);

    res.json({
      ok: true,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      total,
      items: items.map(toResultShape),
    });
  } catch (err) {
    console.error('행운 뽑기 기록 조회 에러:', err);
    res.status(500).json({ error: '기록 조회 실패' });
  }
};

module.exports = {
  getConfig,
  drawDailyTier,
  getToday,
  getHistory,
  DAILY_TIER_WEIGHTS,
  MEMBER_DAILY_LIMIT,
  MEMBER_COOLDOWN_MS,
};
