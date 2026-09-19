/* ======================================================================
 * 랜덤 뽑기 (사다리 게임 스타일) 컨트롤러
 * ----------------------------------------------------------------------
 * "오늘의 행운 티어"와 달리, 이 게임은 서버가 관리하는 고정 캐릭터 풀이 아니라
 * 유저가 커스텀 메이커에서 직접 배치한 티어표(내 브라우저의 작업 중 배치)를 그대로
 * 추첨 대상으로 쓴다. 즉 확률은 "유저가 어느 티어에 몇 명을 배치했는가"에 따라
 * 유저마다 다르다 — 서버는 유저가 보내온 "티어별 캐릭터 목록"에서 개수(가중치)만
 * 신뢰하고, 실제 추첨(가중 랜덤)과 배당 정산은 전부 서버에서만 한다.
 *
 * 배팅 종류 4가지 (전부 "이기면 배팅액 × 배수 획득, 지면 배팅액 × 배수 만큼 상실" —
 * 승패 모두 같은 배수가 적용되는 방식. 일반적인 "배팅액만 잃는" 방식보다 손실 폭이 크므로
 * 프론트에서도 반드시 이 사실을 안내해야 한다):
 *   - group  (묶음 티어) : 1~3 / 4~6 / 7~9 티어 중 하나를 골라 그 묶음 안에 걸리면 승리, 배수 1.95
 *   - parity (홀짝 티어) : 홀수(1,3,5,7,9)/짝수(2,4,6,8) 중 하나, 배수 1.95
 *   - side   (좌/우)     : 티어 추첨과는 별개로 서버가 사다리 게임처럼 좌/우를 50:50 으로
 *                          독립 추첨한다 — 실제 사다리(Amidakuji)의 마지막 도착 지점이
 *                          티어 값과 무관하게 좌/우로 갈리는 것과 같은 구조. 배수 1.95
 *   - exact  (같은 티어) : 정확히 하나의 티어를 지목. 1티어(가장 희귀)일수록 배수가 높다
 *                          (1=20, 2·3=12, 4·5·6=6, 7·8·9=3.25)
 * ====================================================================== */
const mongoose = require('mongoose');
const LuckProfile = require('../models/LuckProfile');

const MIN_BET = 1;
const MAX_BET = 100;
const TIER_MIN = 1;
const TIER_MAX = 9;

// 캐릭터 풀 유효성 상한 — 악의적으로 거대한 payload 를 보내는 것만 막는 안전장치일 뿐,
// 실제 배당 계산에는 영향이 없다(개수만 가중치로 쓰기 때문).
const MAX_TOTAL_CHARACTERS = 500;
const MAX_PER_TIER = 200;

const GROUP_MULT = 1.95;
const PARITY_MULT = 1.95;
const SIDE_MULT = 1.95;
const GROUPS = { 123: [1, 2, 3], 456: [4, 5, 6], 789: [7, 8, 9] };

// 티어가 낮은 숫자(=희귀)일수록 배수가 높다. 이 표 하나만 정본이며 프론트는 /ladder/config 로 받아 표시만 한다.
const EXACT_MULT = { 1: 20, 2: 12, 3: 12, 4: 6, 5: 6, 6: 6, 7: 3.25, 8: 3.25, 9: 3.25 };

function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

// 요청 body 의 characters(티어별 캐릭터 배열)를 검증·정리해서 { pool, total } 로 반환.
// pool[tier] = [{ name, img }, ...] — 배열 길이가 곧 그 티어의 추첨 가중치가 된다.
function parseTierPool(rawCharacters) {
  const pool = {};
  let total = 0;
  for (let tier = TIER_MIN; tier <= TIER_MAX; tier += 1) {
    const arr = Array.isArray(rawCharacters?.[tier]) ? rawCharacters[tier] : [];
    const cleaned = arr
      .filter((c) => c && typeof c.name === 'string' && c.name.trim())
      .slice(0, MAX_PER_TIER)
      .map((c) => ({
        name: String(c.name).trim().slice(0, 60),
        img: typeof c.img === 'string' ? c.img.slice(0, 300) : '',
      }));
    pool[tier] = cleaned;
    total += cleaned.length;
  }
  return { pool, total };
}

// 가중 랜덤으로 티어 하나 + 그 티어 안에서 캐릭터 하나를 뽑는다.
// pickWeightedTier(luckDrawController)와 같은 룰렛휠 방식이지만, 여기서는 서버 상수가 아니라
// 유저가 보내온 pool 의 배열 길이가 곧 가중치다.
function pickWeightedTierFromPool(pool) {
  const entries = Object.entries(pool).filter(([, arr]) => arr.length > 0);
  const total = entries.reduce((sum, [, arr]) => sum + arr.length, 0);
  let roll = Math.random() * total;

  for (const [tier, arr] of entries) {
    roll -= arr.length;
    if (roll < 0) {
      return { tier: Number(tier), character: arr[Math.floor(Math.random() * arr.length)] };
    }
  }
  const [tier, arr] = entries[entries.length - 1];
  return { tier: Number(tier), character: arr[arr.length - 1] };
}

// GET /api/luck-draw/ladder/config
const getLadderConfig = async (req, res) => {
  try {
    let points = null;
    if (req.auth?.sub && isDbConnected()) {
      const profile = await LuckProfile.findOne({ userId: req.auth.sub });
      points = profile ? profile.points : 0;
    }

    res.json({
      minBet: MIN_BET,
      maxBet: MAX_BET,
      minTier: TIER_MIN,
      maxTier: TIER_MAX,
      groupMult: GROUP_MULT,
      parityMult: PARITY_MULT,
      sideMult: SIDE_MULT,
      exactMult: EXACT_MULT,
      groups: GROUPS,
      points,
    });
  } catch (err) {
    console.error('랜덤 뽑기(사다리) 설정 조회 에러:', err);
    res.status(500).json({ error: '설정 조회 실패' });
  }
};

// POST /api/luck-draw/ladder/play  { bet, betType, betValue, characters }
// characters: { "1": [{name,img}], ..., "9": [...] } — 유저가 커스텀 메이커에 배치한
// 캐릭터를 티어별로 묶어 보낸 것. 서버는 이 배열 길이만 가중치로 신뢰하고, 실제 추첨·
// 승패 판정·포인트 정산은 전부 여기서만 한다.
const playLadder = async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({ error: '데이터베이스에 연결되지 않았습니다.' });
    }

    const bet = Math.trunc(Number(req.body?.bet));
    if (!Number.isFinite(bet) || bet < MIN_BET || bet > MAX_BET) {
      return res.status(400).json({ error: `배팅은 ${MIN_BET}P 이상 ${MAX_BET}P 이하만 가능합니다.` });
    }

    const { betType, betValue } = req.body || {};
    const { pool, total } = parseTierPool(req.body?.characters);

    if (total === 0) {
      return res.status(400).json({ error: '내 티어표에 배치된 캐릭터가 없습니다. 커스텀 메이커에서 먼저 캐릭터를 배치해주세요.' });
    }
    if (total > MAX_TOTAL_CHARACTERS) {
      return res.status(400).json({ error: '배치된 캐릭터 수가 너무 많습니다.' });
    }

    // 티어 추첨(가중 랜덤)과 좌/우 추첨(항상 50:50, 티어와 무관)을 각각 한 번씩만 뽑아
    // 어떤 배팅 종류를 고르든 같은 한 번의 결과로 전부 판정한다.
    const { tier, character } = pickWeightedTierFromPool(pool);
    const side = Math.random() < 0.5 ? 'left' : 'right';

    let mult;
    let win;

    if (betType === 'group') {
      const group = GROUPS[betValue];
      if (!group) return res.status(400).json({ error: '잘못된 배팅 종류입니다.' });
      mult = GROUP_MULT;
      win = group.includes(tier);
    } else if (betType === 'parity') {
      if (betValue !== 'odd' && betValue !== 'even') {
        return res.status(400).json({ error: '잘못된 배팅 종류입니다.' });
      }
      mult = PARITY_MULT;
      win = (tier % 2 === 1 ? 'odd' : 'even') === betValue;
    } else if (betType === 'side') {
      if (betValue !== 'left' && betValue !== 'right') {
        return res.status(400).json({ error: '잘못된 배팅 종류입니다.' });
      }
      mult = SIDE_MULT;
      win = side === betValue;
    } else if (betType === 'exact') {
      const target = Number(betValue);
      if (!Number.isInteger(target) || target < TIER_MIN || target > TIER_MAX) {
        return res.status(400).json({ error: '잘못된 배팅 종류입니다.' });
      }
      mult = EXACT_MULT[target];
      win = target === tier;
    } else {
      return res.status(400).json({ error: '잘못된 배팅 종류입니다.' });
    }

    let profile = await LuckProfile.findOne({ userId: req.auth.sub });
    if (!profile) profile = await LuckProfile.create({ userId: req.auth.sub });

    if (profile.points < bet) {
      return res.status(400).json({
        error: '보유 포인트가 부족합니다. 오늘의 행운 티어를 뽑아 포인트를 모아주세요.',
        points: profile.points,
      });
    }

    // 승패 모두 같은 배수를 적용한다 — 이기면 배팅액 × 배수를 얻고, 지면 배팅액 × 배수를 잃는다
    // (단순히 배팅액만 잃는 방식이 아니다. 사용자 요청에 따른 의도된 고위험 규칙).
    const rawDelta = win ? Math.round(bet * mult) : -Math.round(bet * mult);
    // 포인트는 0 밑으로 내려가지 않는다 — 실제 반영된 증감(pointsDelta)만 응답에 쓴다.
    const nextPoints = Math.max(0, profile.points + rawDelta);
    const pointsDelta = nextPoints - profile.points;
    profile.points = nextPoints;
    await profile.save();

    res.json({
      ok: true,
      bet,
      betType,
      betValue,
      mult,
      outcome: win ? 'win' : 'lose',
      tier,
      side,
      character,
      pointsDelta,
      points: profile.points,
    });
  } catch (err) {
    console.error('랜덤 뽑기(사다리) 플레이 에러:', err);
    res.status(500).json({ error: '게임 진행에 실패했습니다.' });
  }
};

module.exports = { getLadderConfig, playLadder };
