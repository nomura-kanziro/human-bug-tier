/* ======================================================================
 * 오늘의 행운 뽑기 (Luck Draw) 컨트롤러
 * ----------------------------------------------------------------------
 * "오늘의 행운 티어" 하나를 무작위(가중치)로 뽑아 캐릭터를 보여주고,
 * 회원이면 포인트를 적립하며 결과를 DB에 남기는 기능 전체를 담당한다.
 *
 * 모델이 두 개로 나뉘어 있는 이유(중요):
 *  - LuckDraw    : 뽑기 "이력" 로그. 유저가 언제 어떤 캐릭터를 뽑았는지 기록하되,
 *                  용량 관리를 위해 뽑을 때마다 오래된 것부터 지워 최근
 *                  HISTORY_RETENTION(5)건만 남긴다 (pruneLuckHistory).
 *  - LuckProfile : 유저 1명당 1문서로 존재하는 "누적 상태" 저장소.
 *                  포인트 총합·총 뽑기 횟수·티어별 누적 카운트·최고 티어·
 *                  오늘 뽑은 횟수·마지막 뽑기 시각을 이력과 무관하게 계속 보관한다.
 *                  만약 이력(LuckDraw) 문서 개수로 "오늘 20회 제한"이나 누적 통계를
 *                  계산했다면, 이력이 5건으로 잘려나가는 순간 제한/통계가 무너진다.
 *                  그래서 하루 제한·쿨다운·통계 판정은 반드시 LuckProfile을 기준으로 한다.
 * ====================================================================== */
const mongoose = require('mongoose');
const LuckDraw = require('../models/LuckDraw');
const LuckProfile = require('../models/LuckProfile');
const luckPool = require('../data/luckPool');
const { getKstDateString } = require('../utils/kstDate');

// 합계 100 — 가중치가 그대로 퍼센트가 되도록 구성.
// 확률 등급(높음→낮음): {5,6} > {4,7} > {8} > {9,3} > {2} > {1} (4티어 -2%, 7티어 +2% 조정)
const DAILY_TIER_WEIGHTS = { 1: 1, 2: 3, 3: 6, 4: 18, 5: 20, 6: 20, 7: 14, 8: 12, 9: 6 };

// 회원 전용 제한 — 하루 20회, 뽑기 사이 3분 쿨다운. 게스트는 서버가 신원을 모르므로
// (계정이 없음) 여기서 제한하지 않는다. 게스트 24시간 안내는 프론트 localStorage UX일 뿐이다.
const MEMBER_DAILY_LIMIT = 20;
const MEMBER_COOLDOWN_MS = 3 * 60 * 1000;

// 이력(LuckDraw)은 최근 N건만 보관 — 초과분은 뽑을 때마다 오래된 것부터 자동 삭제.
const HISTORY_RETENTION = 5;

// 티어별 지급 포인트 — 등급이 좋을수록 가파르게 증가(선형 아님, 고정 테이블).
const POINTS_TABLE = { 1: 10, 2: 7, 3: 4, 4: 2, 5: 1, 6: -1, 7: -2, 8: -3, 9: -4 };

// 티어 번호 → 지급 포인트 변환. POINTS_TABLE에 없는 값(정상 흐름에선 발생 안 함)이면
// 안전하게 0점 처리(?? 널리시 연산자)해서 에러 없이 지나가도록 방어한다.
function getTierPoints(tier) {
  return POINTS_TABLE[tier] ?? 0;
}

// 가중치 기반 랜덤 추첨(룰렛휠 방식).
// 1) 모든 가중치의 합(total)을 구하고, 0~total 사이 난수(roll)를 뽑는다.
// 2) 티어를 순서대로 돌면서 각 가중치만큼 roll을 깎아나가다가, roll이 음수로
//    떨어지는 순간의 티어가 당첨이다 — 가중치가 클수록 roll을 깎을 폭이 커서
//    그 구간에 걸릴 확률이 높아지는 원리(구간 길이가 곧 당첨 확률).
// 3) 부동소수점 오차 등으로 끝까지 안 걸리는 극히 드문 경우를 대비해
//    마지막 항목을 기본값으로 반환.
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

// 이미 정해진 티어 안에서 캐릭터 한 명을 균등 확률로 뽑는다.
// luckPool[tier]는 data/luckPool.js가 제공하는 { name, imagePath } 배열.
function pickCharacter(tier) {
  const pool = luckPool[tier];
  return pool[Math.floor(Math.random() * pool.length)];
}

// 한 번의 "오늘의 행운 티어" 뽑기 결과를 조립한다.
// 티어 추첨 → 그 티어 풀에서 캐릭터 추첨 → 프론트에 필요한 표시용 필드
// (해당 티어표 페이지 링크, KST 기준 오늘 날짜)까지 묶어서 반환.
// 게스트/회원 모두 이 함수 하나로 결과를 만들고, DB 저장 여부만 갈린다.
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

// DB에 저장된 LuckDraw 문서를 buildDrawResult()와 동일한 응답 형태로 맞춰준다.
// (히스토리 조회·오늘 마지막 결과 조회 시 프론트가 항상 같은 모양의 result 객체를
// 받도록 통일하기 위함 — tierPageUrl은 저장돼 있지 않으므로 매번 재계산.)
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

// mongoose 연결 상태(readyState === 1 = connected)를 확인 — DB가 끊긴 상태에서
// 조회/저장을 시도해 알 수 없는 에러가 나는 대신 503으로 명확히 응답하기 위함.
function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

// 한 번도 뽑은 적 없는 유저(LuckProfile 문서 없음)를 조회할 때 사용하는
// 기본값 — 실제 문서를 만들지 않고도 "0회 뽑음" 상태를 표현한다.
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

// GET /api/luck-draw/config
// 프론트가 확률표·포인트표·제한 수치를 "표시"하는 데만 쓰는 참고용 설정 응답.
// 실제 판정(확률 추첨·포인트 계산·제한 검사)은 절대 프론트에서 하지 않고
// 전부 이 컨트롤러(서버)에서만 이뤄진다 — 여기서 내려주는 값은 그 결과를 UI에
// 미리 보여주기 위한 것일 뿐, 프론트가 이 값으로 직접 계산해 서버에 보내면 안 된다.
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

// POST /api/luck-draw/daily-tier — 실제 뽑기를 실행하는 핵심 엔드포인트.
// 흐름:
//  1) 비로그인(게스트)이면 결과만 계산해서 반환하고 끝 — DB 접근·제한 검사 없음.
//     (게스트는 서버가 신원을 특정할 수 없어 하루 횟수를 셀 수 없기 때문.
//      게스트용 24시간 제한은 프론트 localStorage로만 안내되는 UX이며 이 서버
//      로직과는 무관하다.)
//  2) 회원이면 LuckProfile을 불러와 "오늘 남은 횟수"와 "쿨다운 잔여 시간"을 검사.
//     - 오늘 20회를 다 썼으면 429 + limitReached:true
//     - 마지막 뽑기 후 3분이 안 지났으면 429 + cooldown:true
//  3) 통과하면 뽑기 실행 → LuckProfile 갱신(오늘 카운트/누적 횟수/포인트/최고 티어/
//     티어별 카운트/마지막 뽑기 시각) → LuckDraw에 이력 1건 생성 → 이력을 최근
//     HISTORY_RETENTION건으로 정리(pruneLuckHistory).
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

    // 날짜가 바뀌었으면(KST 기준) 오늘 카운트를 1로 리셋, 아니면 누적.
    profile.todayCount = isNewDay ? 1 : profile.todayCount + 1;
    profile.todayDate = result.drawDate;
    profile.totalDraws += 1;
    profile.points += pointsDelta;
    // 티어는 숫자가 작을수록 좋은 등급이므로 "더 작은 값"이 나오면 최고 기록 갱신.
    profile.bestTier = profile.bestTier === null || result.tier < profile.bestTier ? result.tier : profile.bestTier;
    profile.tierCounts[result.tier] = (profile.tierCounts[result.tier] || 0) + 1;
    // tierCounts는 Mixed/Object 타입 필드라 mongoose가 내부 키 변경을 자동으로
    // 감지하지 못한다 — save() 전에 markModified()로 직접 알려줘야 저장된다.
    profile.markModified('tierCounts');
    profile.lastDrawAt = new Date();
    await profile.save();

    // 이력 로그 1건 추가 — 통계/제한 판정에는 쓰이지 않고, "최근 기록" 화면 표시용.
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

// GET /api/luck-draw/today — 오늘 상태(남은 횟수·쿨다운·누적 포인트 등)와
// 가장 최근에 뽑은 결과를 함께 내려준다. 페이지 진입 시 "이어서 보여줄" 상태를
// 복원하는 용도(뽑기 버튼 활성/비활성, 카운트다운 표시 등에 사용).
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

// GET /api/luck-draw/history — 최근 뽑기 기록 목록(페이지네이션 지원).
// 단, LuckDraw 컬렉션 자체가 뽑을 때마다 HISTORY_RETENTION(5)건으로 정리되므로
// 실제로는 total이 5를 넘지 않아 사실상 항상 1페이지 안에 다 들어온다.
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
