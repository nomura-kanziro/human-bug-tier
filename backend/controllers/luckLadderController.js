/* ======================================================================
 * 랜덤 뽑기 (사다리 게임 스타일, 5분 자동 라운드) 컨트롤러
 * ----------------------------------------------------------------------
 * "오늘의 행운 티어"(개인별 즉시 뽑기)와 달리, 이 게임은 **전체 공용 라운드**로 돈다.
 *   - 캐릭터 풀은 유저가 커스텀 메이커에 배치한 것이 아니라, 이 사이트가 이미
 *     `backend/data/luckPool.js`(오늘의 행운 티어와 같은 전용 캐릭터 목록표)에 갖고
 *     있는 티어별 캐릭터를 그대로 쓴다.
 *   - 5분마다 서버가 스스로 라운드를 진행한다: 라운드가 열려 있는 5분 동안 누구든
 *     배팅할 수 있고, 5분이 지나면 서버가 캐릭터 하나를 무작위로 뽑아 그 라운드의
 *     결과(캐릭터 이름·티어·홀짝 여부)로 확정한 뒤, 그 라운드에 걸린 배팅을 전부
 *     한 번에 정산하고 곧바로 다음 라운드를 연다 — 유저가 버튼을 눌러야 뽑히는 게
 *     아니라 서버 타이머로 자동 진행되는 "자동게임"이다.
 *   - 배팅 종류 3가지(전부 이기면 배팅액 × 배수 획득, 지면 배팅액 × 배수 만큼 상실 —
 *     luckPokerController/luckDrawController 와 달리 손실도 배수가 붙는 고위험 규칙):
 *       group  (묶음 티어) : 1~3 / 4~6 / 7~9 티어, 배수 1.95
 *       parity (홀짝 티어) : 홀수(1,3,5,7,9) / 짝수(2,4,6,8), 배수 1.95
 *       exact  (같은 티어) : 정확히 한 티어를 지목, 1티어(가장 희귀) 20배 ~ 7~9티어 3.25배
 * ====================================================================== */
const mongoose = require('mongoose');
const LuckLadderRound = require('../models/LuckLadderRound');
const LuckLadderBet = require('../models/LuckLadderBet');
const LuckProfile = require('../models/LuckProfile');
const luckPool = require('../data/luckPool');
const { resolveTierMediaPath } = require('../utils/tierMediaDir');

const ROUND_DURATION_MS = 5 * 60 * 1000; // 5분 턴
const SCHEDULER_TICK_MS = 5000; // 라운드 마감 여부를 5초마다 확인

const MIN_BET = 1;
const MAX_BET = 100;

const GROUP_MULT = 1.95;
const PARITY_MULT = 1.95;
const GROUPS = { 123: [1, 2, 3], 456: [4, 5, 6], 789: [7, 8, 9] };
// 티어가 낮은 숫자(=희귀)일수록 배수가 높다. 이 표 하나만 정본이며 프론트는 /ladder/round 로 받아 표시만 한다.
const EXACT_MULT = { 1: 20, 2: 12, 3: 12, 4: 6, 5: 6, 6: 6, 7: 3.25, 8: 3.25, 9: 3.25 };

function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

function parityOf(tier) {
  return tier % 2 === 1 ? 'odd' : 'even';
}

// backend/data/luckPool.js(오늘의 행운 티어와 같은 전용 캐릭터 목록표)를 평탄화해서
// 한 번만 만들어 재사용한다 — 서버가 신뢰하는 유일한 캐릭터 소스.
let flatPool = null;
function getFlatPool() {
  if (flatPool) return flatPool;
  flatPool = [];
  Object.entries(luckPool).forEach(([tierKey, list]) => {
    const tier = Number(tierKey);
    list.forEach((c) => {
      flatPool.push({ name: c.name, img: resolveTierMediaPath(c.imagePath), tier });
    });
  });
  return flatPool;
}

// 전체 캐릭터 목록표에서 균등 확률로 한 명을 뽑는다 — 라운드 결과 확정용.
function pickRandomCharacter() {
  const pool = getFlatPool();
  return pool[Math.floor(Math.random() * pool.length)];
}

function evaluateBet(betType, betValue, tier) {
  if (betType === 'group') return (GROUPS[betValue] || []).includes(tier);
  if (betType === 'parity') return parityOf(tier) === betValue;
  if (betType === 'exact') return Number(betValue) === tier;
  return false;
}

function roundPublicShape(round) {
  const now = Date.now();
  return {
    roundNo: round.roundNo,
    status: round.status,
    startAt: round.startAt,
    endAt: round.endAt,
    secondsLeft: Math.max(0, Math.ceil((round.endAt.getTime() - now) / 1000)),
  };
}

function roundResultShape(round) {
  return {
    roundNo: round.roundNo,
    characterName: round.resultCharacterName,
    imagePath: round.resultImagePath,
    tier: round.resultTier,
    parity: round.resultParity,
  };
}

async function createRound(roundNo, startMs) {
  const startAt = new Date(startMs);
  const endAt = new Date(startMs + ROUND_DURATION_MS);
  try {
    return await LuckLadderRound.create({ roundNo, startAt, endAt, status: 'open' });
  } catch (err) {
    // 동시 요청으로 같은 roundNo 가 이미 생성됐으면(unique 충돌) 그걸 그대로 조회해서 쓴다.
    if (err.code === 11000) {
      const existing = await LuckLadderRound.findOne({ roundNo });
      if (existing) return existing;
    }
    throw err;
  }
}

// 라운드 하나를 정산: 캐릭터 확정 → 그 라운드에 걸린 미정산 배팅을 전부 판정해
// LuckProfile.points 를 갱신한다. 이미 정산된 라운드면 아무 것도 하지 않는다.
async function settleRound(round) {
  if (round.status !== 'open') return;

  const picked = pickRandomCharacter();
  round.status = 'settled';
  round.resultCharacterName = picked.name;
  round.resultImagePath = picked.img;
  round.resultTier = picked.tier;
  round.resultParity = parityOf(picked.tier);
  await round.save();

  const bets = await LuckLadderBet.find({ roundNo: round.roundNo, settled: false });
  for (const betDoc of bets) {
    const win = evaluateBet(betDoc.betType, betDoc.betValue, picked.tier);
    // 승패 모두 같은 배수를 적용한다 — 이기면 배팅액 × 배수를 얻고, 지면 배팅액 × 배수를 잃는다.
    const rawDelta = win ? Math.round(betDoc.bet * betDoc.mult) : -Math.round(betDoc.bet * betDoc.mult);

    // eslint-disable-next-line no-await-in-loop
    let profile = await LuckProfile.findOne({ userId: betDoc.userId });
    if (!profile) profile = await LuckProfile.create({ userId: betDoc.userId });
    // 포인트는 0 밑으로 내려가지 않는다 — 실제 반영된 증감만 배팅 기록에 남긴다.
    const nextPoints = Math.max(0, profile.points + rawDelta);
    const pointsDelta = nextPoints - profile.points;
    profile.points = nextPoints;
    // eslint-disable-next-line no-await-in-loop
    await profile.save();

    betDoc.settled = true;
    betDoc.outcome = win ? 'win' : 'lose';
    betDoc.pointsDelta = pointsDelta;
    // eslint-disable-next-line no-await-in-loop
    await betDoc.save();
  }
}

// 지금 열려 있어야 할 라운드를 반환한다. 없으면 1번 라운드를 새로 열고,
// 이미 마감 시각이 지났으면 정산부터 한 뒤 다음 라운드를 연다(서버가 잠깐
// 내려가 있던 사이 마감 시각이 지난 경우도 이 경로로 자연스럽게 복구된다).
async function ensureCurrentRound() {
  if (!isDbConnected()) return null;

  const round = await LuckLadderRound.findOne().sort({ roundNo: -1 });
  const now = Date.now();

  if (!round) {
    return createRound(1, now);
  }
  if (round.status === 'open' && now >= round.endAt.getTime()) {
    await settleRound(round);
    return createRound(round.roundNo + 1, now);
  }
  if (round.status === 'settled') {
    // 정상 흐름이면 settleRound 직후 항상 다음 라운드를 만들어두므로 거의 발생하지 않지만,
    // 혹시 다음 라운드 생성이 누락된 상태로 남아 있으면 여기서 보정한다.
    return createRound(round.roundNo + 1, now);
  }
  return round;
}

// 서버 기동 시 1회 호출 — 즉시 라운드를 확인/생성하고, 이후 주기적으로 마감 여부를 확인한다.
function startLadderScheduler() {
  ensureCurrentRound().catch((err) => console.error('랜덤 뽑기 라운드 초기화 실패:', err));
  setInterval(() => {
    ensureCurrentRound().catch((err) => console.error('랜덤 뽑기 라운드 진행 실패:', err));
  }, SCHEDULER_TICK_MS);
}

// GET /api/luck-draw/ladder/round — 지금 진행 중인 라운드 상태 + 내 배팅 + 최근 결과 이력
const getRoundStatus = async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({ error: '데이터베이스에 연결되지 않았습니다.' });
    }

    const round = await ensureCurrentRound();
    if (!round) {
      return res.status(503).json({ error: '라운드를 준비하지 못했습니다.' });
    }

    let myBet = null;
    let points = null;
    if (req.auth?.sub) {
      const [betDoc, profile] = await Promise.all([
        LuckLadderBet.findOne({ roundNo: round.roundNo, userId: req.auth.sub }),
        LuckProfile.findOne({ userId: req.auth.sub }),
      ]);
      if (betDoc) {
        myBet = {
          betType: betDoc.betType,
          betValue: betDoc.betValue,
          bet: betDoc.bet,
          mult: betDoc.mult,
          settled: betDoc.settled,
          outcome: betDoc.outcome,
          pointsDelta: betDoc.pointsDelta,
        };
      }
      points = profile ? profile.points : 0;
    }

    const history = await LuckLadderRound.find({ status: 'settled' }).sort({ roundNo: -1 }).limit(5);

    res.json({
      ok: true,
      round: roundPublicShape(round),
      myBet,
      history: history.map(roundResultShape),
      roundDurationSec: ROUND_DURATION_MS / 1000,
      minBet: MIN_BET,
      maxBet: MAX_BET,
      groupMult: GROUP_MULT,
      parityMult: PARITY_MULT,
      exactMult: EXACT_MULT,
      groups: GROUPS,
      points,
    });
  } catch (err) {
    console.error('랜덤 뽑기 라운드 조회 에러:', err);
    res.status(500).json({ error: '라운드 조회 실패' });
  }
};

// POST /api/luck-draw/ladder/bet  { bet, betType, betValue }
// 지금 열려 있는 라운드에 배팅 1건을 건다 — 라운드당 유저 1배팅만 허용.
const placeBet = async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({ error: '데이터베이스에 연결되지 않았습니다.' });
    }

    const bet = Math.trunc(Number(req.body?.bet));
    if (!Number.isFinite(bet) || bet < MIN_BET || bet > MAX_BET) {
      return res.status(400).json({ error: `배팅은 ${MIN_BET}P 이상 ${MAX_BET}P 이하만 가능합니다.` });
    }

    const { betType, betValue } = req.body || {};
    let mult;
    if (betType === 'group') {
      if (!GROUPS[betValue]) return res.status(400).json({ error: '잘못된 배팅 종류입니다.' });
      mult = GROUP_MULT;
    } else if (betType === 'parity') {
      if (betValue !== 'odd' && betValue !== 'even') return res.status(400).json({ error: '잘못된 배팅 종류입니다.' });
      mult = PARITY_MULT;
    } else if (betType === 'exact') {
      const target = Number(betValue);
      if (!Number.isInteger(target) || target < 1 || target > 9) {
        return res.status(400).json({ error: '잘못된 배팅 종류입니다.' });
      }
      mult = EXACT_MULT[target];
    } else {
      return res.status(400).json({ error: '잘못된 배팅 종류입니다.' });
    }

    const round = await ensureCurrentRound();
    if (!round || round.status !== 'open' || Date.now() >= round.endAt.getTime()) {
      return res.status(409).json({ error: '라운드가 곧 마감되어 배팅할 수 없습니다. 잠시 후 다시 시도해주세요.' });
    }

    const already = await LuckLadderBet.findOne({ roundNo: round.roundNo, userId: req.auth.sub });
    if (already) {
      return res.status(400).json({ error: '이미 이번 라운드에 배팅했습니다. 다음 라운드를 기다려주세요.' });
    }

    let profile = await LuckProfile.findOne({ userId: req.auth.sub });
    if (!profile) profile = await LuckProfile.create({ userId: req.auth.sub });
    if (profile.points < bet) {
      return res.status(400).json({
        error: '보유 포인트가 부족합니다. 오늘의 행운 티어를 뽑아 포인트를 모아주세요.',
        points: profile.points,
      });
    }

    let betDoc;
    try {
      betDoc = await LuckLadderBet.create({
        roundNo: round.roundNo,
        userId: req.auth.sub,
        betType,
        betValue: String(betValue),
        bet,
        mult,
      });
    } catch (err) {
      if (err.code === 11000) {
        return res.status(400).json({ error: '이미 이번 라운드에 배팅했습니다. 다음 라운드를 기다려주세요.' });
      }
      throw err;
    }

    res.json({
      ok: true,
      round: roundPublicShape(round),
      myBet: {
        betType: betDoc.betType,
        betValue: betDoc.betValue,
        bet: betDoc.bet,
        mult: betDoc.mult,
        settled: false,
        outcome: null,
        pointsDelta: 0,
      },
      points: profile.points,
    });
  } catch (err) {
    console.error('랜덤 뽑기 배팅 에러:', err);
    res.status(500).json({ error: '배팅 처리에 실패했습니다.' });
  }
};

module.exports = { getRoundStatus, placeBet, startLadderScheduler };
