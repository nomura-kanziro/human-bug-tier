const mongoose = require('mongoose');
const LuckDraw = require('../models/LuckDraw');
const LuckProfile = require('../models/LuckProfile');
const luckPool = require('../data/luckPool');
const { getKstDateString } = require('../utils/kstDate');

// 합계 100 — 가중치가 그대로 퍼센트가 되도록 구성.
const DAILY_TIER_WEIGHTS = { 1: 1, 2: 3, 3: 6, 4: 10, 5: 14, 6: 18, 7: 18, 8: 16, 9: 14 };

// 회원 전용 제한 — 하루 20회, 뽑기 사이 3분 쿨다운. 게스트는 서버가 신원을 모르므로
// (계정이 없음) 여기서 제한하지 않는다. 게스트 24시간 안내는 프론트 localStorage UX일 뿐이다.
const MEMBER_DAILY_LIMIT = 20;
const MEMBER_COOLDOWN_MS = 3 * 60 * 1000;

// 이력(LuckDraw)은 최근 N건만 보관 — 초과분은 뽑을 때마다 오래된 것부터 자동 삭제.
const HISTORY_RETENTION = 5;

// 티어별 지급 포인트 — 등급이 좋을수록 가파르게 증가(선형 아님, 고정 테이블).
const POINTS_TABLE = { 1: 10, 2: 7, 3: 4, 4: 2, 5: 1, 6: -1, 7: -2, 8: -3, 9: -4 };

function getTierPoints(tier) {
  return POINTS_TABLE[tier] ?? 0;
}

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

const EMPTY_PROFILE = { points: 0, totalDraws: 0, tierCounts: {}, bestTier: null, todayCount: 0, todayDate: '', lastDrawAt: null };

// 읽기 전용 조회 — 아직 한 번도 안 뽑은 유저는 문서를 만들지 않고 기본값만 반환.
async function readLuckProfile(userId) {
  const profile = await LuckProfile.findOne({ userId });
  return profile || { ...EMPTY_PROFILE };
}

// 뽑기 처리용 — 갱신해서 저장해야 하므로 없으면 생성.
async function getOrCreateLuckProfile(userId) {
  let profile = await LuckProfile.findOne({ userId });
  if (!profile) {
    profile = await LuckProfile.create({ userId });
  }
  return profile;
}

// 이력은 최근 HISTORY_RETENTION건만 유지 — 초과분(오래된 것부터)을 삭제.
async function pruneLuckHistory(userId, mode) {
  const excess = await LuckDraw.find({ userId, mode })
    .sort({ createdAt: -1 })
    .skip(HISTORY_RETENTION)
    .select('_id');

  if (excess.length) {
    await LuckDraw.deleteMany({ _id: { $in: excess.map((doc) => doc._id) } });
  }
}

// 오늘 사용 횟수·쿨다운 잔여 시간·누적 포인트/횟수/최고 티어를 profile 기준으로 계산.
function buildStatusFromProfile(profile) {
  const drawDate = getKstDateString();
  const todayCount = profile.todayDate === drawDate ? profile.todayCount : 0;

  let cooldownRemainingSec = 0;
  if (profile.lastDrawAt) {
    const elapsedMs = Date.now() - new Date(profile.lastDrawAt).getTime();
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
    points: profile.points,
    totalDraws: profile.totalDraws,
    bestTier: profile.bestTier,
  };
}

const getConfig = async (req, res) => {
  try {
    res.json({
      weights: DAILY_TIER_WEIGHTS,
      pointsTable: POINTS_TABLE,
      resetAt: 'KST 00:00',
      dailyLimit: MEMBER_DAILY_LIMIT,
      cooldownSec: MEMBER_COOLDOWN_MS / 1000,
      historyRetention: HISTORY_RETENTION,
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

    const profile = await getOrCreateLuckProfile(req.auth.sub);
    const status = buildStatusFromProfile(profile);

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
    const pointsDelta = getTierPoints(result.tier);
    const isNewDay = profile.todayDate !== result.drawDate;

    profile.todayCount = isNewDay ? 1 : profile.todayCount + 1;
    profile.todayDate = result.drawDate;
    profile.totalDraws += 1;
    profile.points += pointsDelta;
    profile.bestTier = profile.bestTier === null || result.tier < profile.bestTier ? result.tier : profile.bestTier;
    profile.tierCounts[result.tier] = (profile.tierCounts[result.tier] || 0) + 1;
    profile.markModified('tierCounts');
    profile.lastDrawAt = new Date();
    await profile.save();

    await LuckDraw.create({
      userId: req.auth.sub,
      nickname: req.auth.nickname || '',
      mode: 'daily_tier',
      tier: result.tier,
      characterName: result.characterName,
      imagePath: result.imagePath,
      drawDate: result.drawDate,
    });
    await pruneLuckHistory(req.auth.sub, 'daily_tier');

    res.json({
      ok: true,
      saved: true,
      guest: false,
      result,
      pointsDelta,
      totalPoints: profile.points,
      remainingToday: Math.max(0, MEMBER_DAILY_LIMIT - profile.todayCount),
      dailyLimit: MEMBER_DAILY_LIMIT,
      cooldownRemainingSec: MEMBER_COOLDOWN_MS / 1000,
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

    const [profile, lastDraw] = await Promise.all([
      readLuckProfile(req.auth.sub),
      LuckDraw.findOne({ userId: req.auth.sub, mode: 'daily_tier' }).sort({ createdAt: -1 }),
    ]);

    res.json({
      ok: true,
      ...buildStatusFromProfile(profile),
      lastResult: lastDraw ? toResultShape(lastDraw) : null,
    });
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

    // 이력은 최근 HISTORY_RETENTION건만 남아있으므로 사실상 항상 1페이지다.
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

// 마이페이지용 단순 집계 — LuckProfile 누적치를 그대로 반환 (이력 삭제와 무관).
const getStats = async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({ error: '데이터베이스에 연결되지 않았습니다.' });
    }

    const profile = await readLuckProfile(req.auth.sub);

    res.json({
      ok: true,
      totalDraws: profile.totalDraws,
      tierCounts: profile.tierCounts,
      bestTier: profile.bestTier,
      points: profile.points,
    });
  } catch (err) {
    console.error('행운 뽑기 통계 조회 에러:', err);
    res.status(500).json({ error: '통계 조회 실패' });
  }
};

module.exports = {
  getConfig,
  drawDailyTier,
  getToday,
  getHistory,
  getStats,
  DAILY_TIER_WEIGHTS,
  MEMBER_DAILY_LIMIT,
  MEMBER_COOLDOWN_MS,
  HISTORY_RETENTION,
  getTierPoints,
};
