/* ======================================================================
 * 이벤트 컨트롤러 (/api/events)
 * ----------------------------------------------------------------------
 * 이벤트 페이지의 세 가지 놀거리를 한 파일에서 담당한다.
 *
 *  1) 매일 간단 퀴즈 (quiz)      — "{캐릭터}는 어느 티어인가요?" 3지선다, 하루 1번.
 *                                  맞히면 1~1000P 를 복권식(낮은 점수일수록 잘 나옴)으로 지급.
 *  2) 제작한 티어표 공개 (showcase) — 회원이 티어표를 출품(제작해서 올리거나 올린 글로 참가)하고 서로 투표해
 *                                  결과 공개일에 우승자(투표 자동 집계 / 관리자 직접 선정)에게 상금을 지급한다.
 *                                  회차 예약·마감·발표 관리 화면은 이벤트 페이지가 아니라 관리자 페이지에 있다.
 *  3) 메모리 게임 (memory)        — 4×4 → 6×6 → 8×8 3단계. **관리자가 관리자 페이지에서 기록 이벤트(회차)를
 *                                  열어야** 게임을 할 수 있고, 회차를 정산하면 1위에게 상금(1000P 이상)을 지급.
 *
 * 공통 원칙(행운 뽑기와 같다): 정답·확률·시간·포인트는 전부 서버가 정하고,
 * 프론트는 "고른 번호"나 "다 맞췄다"는 신호만 보낸다. 포인트는 LuckProfile.points 에 쌓인다
 * (사이트의 포인트는 이 한 곳이 정본 — 행운 뽑기·포커와 같은 지갑을 쓴다).
 * ====================================================================== */
const mongoose = require('mongoose');
const EventQuizAttempt = require('../models/EventQuizAttempt');
const EventMemorySession = require('../models/EventMemorySession');
const EventMemoryPeriod = require('../models/EventMemoryPeriod');
const EventShowcase = require('../models/EventShowcase');
const EventShowcaseEntry = require('../models/EventShowcaseEntry');
const EventShowcaseVote = require('../models/EventShowcaseVote');
const User = require('../models/User');
const LuckProfile = require('../models/LuckProfile');
const TierList = require('../models/TierList');
const { getAllCharacters, getAllTierSlots } = require('../data/tierCatalog');
const { getKstDateString } = require('../utils/kstDate');
const { resolveTierMediaPath } = require('../utils/tierMediaDir');
const { createNotification } = require('../utils/notificationService');
const { isTierListOwner } = require('../utils/ownership');

/* ====================== 공통 ====================== */

function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

// 배열을 제자리에서 섞는다(Fisher–Yates).
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 유저의 포인트 지갑(LuckProfile)에 증감을 반영하고 최종 잔액을 돌려준다.
async function addPoints(userId, delta) {
  let profile = await LuckProfile.findOne({ userId });
  if (!profile) profile = await LuckProfile.create({ userId });
  profile.points = Math.max(0, profile.points + delta);
  await profile.save();
  return profile.points;
}

// 이벤트 접수 시작 공지 — 조건 없이 회원 전체(User 컬렉션 전부)에게 event_open 알림을 보낸다.
// 티어표 공개·메모리 기록 이벤트가 같이 쓴다. 각자 알림 설정에서 공지·소식(noticeNews)을 꺼둔 사람에게는
// createNotification 이 알아서 보내지 않는다(사이트 공통 규칙). 한 명이 실패해도 나머지는 계속 보낸다.
async function notifyAllMembers({ title, message, link, resourceId, resourceType }) {
  const users = await User.find().select('nickname email').lean();
  for (const u of users) {
    if (!u.nickname) continue;
    try {
      // eslint-disable-next-line no-await-in-loop
      await createNotification({
        recipientNickname: u.nickname,
        recipientEmail: u.email || '',
        type: 'event_open',
        category: 'noticeNews',
        title,
        message,
        link,
        resourceId,
        resourceType,
      });
    } catch (err) {
      console.error('이벤트 접수 시작 알림 실패:', u.nickname, err.message);
    }
  }
}

/* ====================== 1) 매일 간단 퀴즈 ====================== */

const QUIZ_CHOICES = 3; // 보기 개수(3지선다)

/* 복권식 상금표 — "1~5P 가 가장 잘 나오고, 금액이 커질수록 확률이 낮아진다".
   weight 합이 1000 이라 weight 그대로가 ‰(천분율) 확률이다. 이 표가 확률의 유일한 정본이며,
   프론트는 /quiz/today 로 받아 "표시만" 한다. */
const QUIZ_PRIZE_TABLE = [
  { min: 1, max: 5, weight: 600 },     // 60%
  { min: 6, max: 20, weight: 220 },    // 22%
  { min: 21, max: 50, weight: 100 },   // 10%
  { min: 51, max: 120, weight: 50 },   // 5%
  { min: 121, max: 300, weight: 22 },  // 2.2%
  { min: 301, max: 600, weight: 6 },   // 0.6%
  { min: 601, max: 1000, weight: 2 },  // 0.2%
];
const QUIZ_PRIZE_TOTAL = QUIZ_PRIZE_TABLE.reduce((sum, row) => sum + row.weight, 0);

// 구간을 가중치로 하나 고른 뒤, 그 구간 안에서 균등하게 금액을 뽑는다.
function drawQuizPrize() {
  let roll = Math.random() * QUIZ_PRIZE_TOTAL;
  for (const row of QUIZ_PRIZE_TABLE) {
    roll -= row.weight;
    if (roll < 0) return row.min + Math.floor(Math.random() * (row.max - row.min + 1));
  }
  return QUIZ_PRIZE_TABLE[0].min; // 부동소수점 오차로 못 고른 경우의 안전망
}

// 오늘의 문제를 만든다. 정답 1개 + 서로 다른 오답 2개(같은 티어+급 조합은 중복되지 않게).
function buildQuizQuestion() {
  const characters = getAllCharacters();
  const slots = getAllTierSlots();
  if (!characters.length || slots.length < QUIZ_CHOICES) return null;

  const target = characters[Math.floor(Math.random() * characters.length)];
  const correct = { tier: target.tier, subTier: target.subTier };
  const key = (s) => `${s.tier}|${s.subTier}`;

  const pool = shuffle(slots.filter((s) => key(s) !== key(correct)));
  const choices = shuffle([correct, ...pool.slice(0, QUIZ_CHOICES - 1)]);

  return {
    characterName: target.name,
    characterImg: target.img,
    choices,
    correctIndex: choices.findIndex((c) => key(c) === key(correct)),
  };
}

// 프론트에 내려보낼 모양 — 정답(correctIndex)은 아직 안 푼 문제라면 절대 포함하지 않는다.
function quizShape(attempt) {
  const answered = attempt.status === 'answered';
  return {
    quizDate: attempt.quizDate,
    characterName: attempt.characterName,
    characterImg: attempt.characterImg ? resolveTierMediaPath(`tier-media/tier-image/${attempt.characterImg}`) : '',
    choices: attempt.choices.map((c) => ({ tier: c.tier, subTier: c.subTier })),
    answered,
    answeredIndex: attempt.answeredIndex,
    correct: attempt.correct,
    points: attempt.points,
    // 이미 푼 문제여야 정답을 알려준다(복습용).
    correctIndex: answered ? attempt.correctIndex : null,
  };
}

// GET /api/events/quiz/today — 오늘 문제(없으면 새로 만들어 저장) + 확률표
const getQuizToday = async (req, res) => {
  try {
    if (!isDbConnected()) return res.status(503).json({ error: '데이터베이스에 연결되지 않았습니다.' });

    const quizDate = getKstDateString();
    let attempt = await EventQuizAttempt.findOne({ userId: req.auth.sub, quizDate });

    if (!attempt) {
      const question = buildQuizQuestion();
      if (!question) {
        return res.status(503).json({ error: '티어표 데이터를 불러오지 못해 퀴즈를 낼 수 없습니다.' });
      }
      try {
        attempt = await EventQuizAttempt.create({ userId: req.auth.sub, quizDate, ...question });
      } catch (err) {
        // 같은 순간 두 번 요청해 unique 에 걸렸으면 먼저 만들어진 문제를 그대로 쓴다.
        if (err.code === 11000) attempt = await EventQuizAttempt.findOne({ userId: req.auth.sub, quizDate });
        if (!attempt) throw err;
      }
    }

    const profile = await LuckProfile.findOne({ userId: req.auth.sub });
    res.json({
      ok: true,
      quiz: quizShape(attempt),
      prizeTable: QUIZ_PRIZE_TABLE.map((row) => ({ ...row, percent: (row.weight / QUIZ_PRIZE_TOTAL) * 100 })),
      points: profile ? profile.points : 0,
    });
  } catch (err) {
    console.error('이벤트 퀴즈 조회 에러:', err);
    res.status(500).json({ error: '퀴즈를 불러오지 못했습니다.' });
  }
};

// POST /api/events/quiz/answer { choiceIndex }
const answerQuiz = async (req, res) => {
  try {
    if (!isDbConnected()) return res.status(503).json({ error: '데이터베이스에 연결되지 않았습니다.' });

    const quizDate = getKstDateString();
    const choiceIndex = Math.trunc(Number(req.body?.choiceIndex));

    const attempt = await EventQuizAttempt.findOne({ userId: req.auth.sub, quizDate });
    if (!attempt) return res.status(404).json({ error: '오늘의 문제가 아직 없습니다. 새로고침 후 다시 시도해주세요.' });
    if (!Number.isInteger(choiceIndex) || choiceIndex < 0 || choiceIndex >= attempt.choices.length) {
      return res.status(400).json({ error: '보기 중 하나를 골라주세요.' });
    }

    // 같은 문제를 두 번 채점하지 않도록 status 를 원자적으로 선점한다(중복 지급 방지).
    const claimed = await EventQuizAttempt.findOneAndUpdate(
      { _id: attempt._id, status: 'open' },
      { $set: { status: 'answered', answeredIndex: choiceIndex, answeredAt: new Date() } },
      { new: true },
    );
    if (!claimed) {
      return res.status(409).json({ error: '오늘 퀴즈는 이미 참여했습니다. 내일 다시 도전해주세요.', quiz: quizShape(attempt) });
    }

    const correct = choiceIndex === claimed.correctIndex;
    const prize = correct ? drawQuizPrize() : 0;
    claimed.correct = correct;
    claimed.points = prize;
    await claimed.save();

    const points = prize > 0 ? await addPoints(req.auth.sub, prize) : (await LuckProfile.findOne({ userId: req.auth.sub }))?.points ?? 0;

    res.json({ ok: true, quiz: quizShape(claimed), points });
  } catch (err) {
    console.error('이벤트 퀴즈 채점 에러:', err);
    res.status(500).json({ error: '채점에 실패했습니다.' });
  }
};

/* ====================== 3) 메모리 게임 ====================== */

const MEMORY_STAGE_SIZES = [4, 6, 8]; // 한 변의 칸 수 → 8쌍 / 18쌍 / 32쌍
// 사람이 낼 수 없는 기록(자동 클릭 등)을 걸러내는 하한. 한 쌍당 최소 이 정도는 걸린다고 본다.
const MEMORY_MIN_MS_PER_PAIR = 150;
const MEMORY_DEFAULT_AWARD = 1000;   // 1위 상금 기본값
const MEMORY_MIN_AWARD = 1000;       // 요구사항: "1000 이상" — 이보다 적게는 설정할 수 없다
const MEMORY_MAX_AWARD = 1000000;    // 오타로 터무니없는 금액이 지급되는 것을 막는 상한
const MEMORY_PERIOD_LIST_LIMIT = 10; // 관리자 화면에 보여줄 최근 회차 수

// 단계 하나에 쓸 카드 배치를 만든다(캐릭터 이미지 쌍을 섞은 배열).
function buildMemoryDeck(size) {
  const pairs = (size * size) / 2;
  const characters = getAllCharacters();
  if (characters.length < pairs) return null;
  const picked = shuffle([...characters]).slice(0, pairs);
  const deck = picked.flatMap((c) => [c.img, c.img]);
  return shuffle(deck);
}

// 프론트에 내려보낼 카드 배열(실제 이미지 URL 로 바꿔서).
function deckShape(deck) {
  return deck.map((img) => resolveTierMediaPath(`tier-media/tier-image/${img}`));
}

function memorySessionShape(session) {
  return {
    sessionId: String(session._id),
    stageIndex: session.stageIndex,
    stageSizes: MEMORY_STAGE_SIZES,
    stages: session.stages.map((s) => ({ size: s.size, ms: s.ms })),
    status: session.status,
    totalMs: session.totalMs,
  };
}

function memoryPeriodShape(period, extra = {}) {
  if (!period) return null;
  return {
    id: String(period._id),
    title: period.title,
    description: period.description,
    status: period.status,
    awardPoints: period.awardPoints,
    endsAt: period.endsAt,
    openedAt: period.openedAt,
    closedAt: period.closedAt,
    settledAt: period.settledAt,
    winner: period.winner
      ? { nickname: period.winner.nickname, totalMs: period.winner.totalMs, awardedPoints: period.winner.awardedPoints }
      : null,
    ...extra,
  };
}

// 마감 시각(endsAt)이 지난 진행 중 회차를 닫는다(스케줄러 + 게임 시작/조회 때마다 호출).
// 정산(상금 지급)은 자동으로 하지 않는다 — 포인트가 나가는 일이라 관리자가 직접 누른다.
async function advanceMemoryPeriods() {
  if (!isDbConnected()) return;
  const now = new Date();
  const expired = await EventMemoryPeriod.find({ status: 'open', endsAt: { $ne: null, $lte: now } });
  for (const period of expired) {
    period.status = 'closed';
    period.closedAt = now;
    // eslint-disable-next-line no-await-in-loop
    await period.save();
    // 마감 시각을 넘겨 끝나지 못한 판은 기록으로 인정되지 않으므로 정리한다.
    // eslint-disable-next-line no-await-in-loop
    await EventMemorySession.deleteMany({ periodId: period._id, status: 'playing' });
  }
}

// 기록 이벤트가 열리면 회원 전체에게 알린다(이벤트 페이지 안내 "열리면 공지로 알려드릴게요"가 실제로 지켜지도록).
async function notifyMemoryPeriodOpened(period) {
  const award = period.awardPoints ? ` 가장 빠른 기록을 낸 분께 ${period.awardPoints}P!` : '';
  const until = period.endsAt
    ? ` (마감: ${new Date(period.endsAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })})`
    : '';
  await notifyAllMembers({
    title: '🧠 메모리 게임 기록 이벤트가 열렸어요!',
    message: `[${period.title}] 지금부터 도전할 수 있어요.${award}${until}`,
    link: '/event#memory',
    resourceId: period._id,
    resourceType: 'eventMemoryPeriod',
  });
}

async function getOpenMemoryPeriod() {
  await advanceMemoryPeriods();
  return EventMemoryPeriod.findOne({ status: 'open' });
}

// 한 회차의 순위 — 한 사람당 최고 기록 하나만 올린다(같은 기록이면 먼저 끝낸 사람이 앞).
async function rankMemoryPeriod(periodId, limit = 10) {
  const id = new mongoose.Types.ObjectId(String(periodId));
  return EventMemorySession.aggregate([
    { $match: { periodId: id, status: 'done' } },
    { $sort: { totalMs: 1, finishedAt: 1 } },
    { $group: { _id: '$userId', doc: { $first: '$$ROOT' } } },
    { $replaceRoot: { newRoot: '$doc' } },
    { $sort: { totalMs: 1, finishedAt: 1 } },
    { $limit: limit },
  ]);
}

// POST /api/events/memory/start — 새 판 시작(진행 중인 판이 있으면 버리고 새로 시작)
// 관리자가 연(open) 기록 이벤트가 있을 때만 시작할 수 있다.
const startMemory = async (req, res) => {
  try {
    if (!isDbConnected()) return res.status(503).json({ error: '데이터베이스에 연결되지 않았습니다.' });

    const period = await getOpenMemoryPeriod();
    if (!period) return res.status(409).json({ error: '지금은 진행 중인 메모리 게임 기록 이벤트가 없습니다.', code: 'NO_OPEN_PERIOD' });

    const deck = buildMemoryDeck(MEMORY_STAGE_SIZES[0]);
    if (!deck) return res.status(503).json({ error: '티어표 데이터를 불러오지 못해 게임을 시작할 수 없습니다.' });

    // 끝내지 않고 떠난 판은 기록으로 남길 이유가 없으므로 정리한다.
    await EventMemorySession.deleteMany({ userId: req.auth.sub, status: 'playing' });

    const session = await EventMemorySession.create({
      userId: req.auth.sub,
      periodId: period._id,
      nickname: req.auth.nickname || '익명',
      startedAt: new Date(),
      decks: [deck],
    });

    res.json({ ok: true, session: memorySessionShape(session), deck: deckShape(deck) });
  } catch (err) {
    console.error('메모리 게임 시작 에러:', err);
    res.status(500).json({ error: '게임을 시작하지 못했습니다.' });
  }
};

// POST /api/events/memory/stage { sessionId } — 지금 단계를 다 맞췄다는 신호. 시간은 서버가 잰다.
const clearMemoryStage = async (req, res) => {
  try {
    if (!isDbConnected()) return res.status(503).json({ error: '데이터베이스에 연결되지 않았습니다.' });

    const { sessionId } = req.body || {};
    if (!mongoose.isValidObjectId(sessionId)) return res.status(400).json({ error: '진행 중인 판을 찾을 수 없습니다.' });

    const session = await EventMemorySession.findOne({ _id: sessionId, userId: req.auth.sub, status: 'playing' });
    if (!session) return res.status(409).json({ error: '이미 끝났거나 없는 판입니다. 다시 시작해주세요.' });

    const size = MEMORY_STAGE_SIZES[session.stageIndex];
    if (size === undefined) return res.status(409).json({ error: '이미 모든 단계를 끝낸 판입니다.' });

    const now = new Date();

    // 판이 진행되는 동안 이벤트가 닫혔거나 마감 시각을 넘겼다면 기록으로 인정하지 않는다.
    const period = session.periodId ? await EventMemoryPeriod.findById(session.periodId) : null;
    if (!period || period.status !== 'open' || (period.endsAt && period.endsAt <= now)) {
      await EventMemorySession.deleteOne({ _id: session._id });
      return res.status(409).json({ error: '기록 이벤트가 마감되어 이번 판은 기록되지 않았습니다.', code: 'PERIOD_CLOSED' });
    }

    const prevAt = session.stages.length ? session.stages[session.stages.length - 1].clearedAt : session.startedAt;
    const ms = now.getTime() - new Date(prevAt).getTime();

    // 사람이 낼 수 없는 속도면 기록으로 인정하지 않는다.
    const minMs = ((size * size) / 2) * MEMORY_MIN_MS_PER_PAIR;
    if (ms < minMs) {
      await EventMemorySession.deleteOne({ _id: session._id });
      return res.status(400).json({ error: '기록이 정상적으로 측정되지 않아 이번 판은 무효 처리했습니다.' });
    }

    session.stages.push({ size, clearedAt: now, ms });
    session.stageIndex += 1;

    if (session.stageIndex >= MEMORY_STAGE_SIZES.length) {
      session.status = 'done';
      session.finishedAt = now;
      session.totalMs = now.getTime() - session.startedAt.getTime();
      await session.save();
      return res.json({ ok: true, session: memorySessionShape(session), deck: null, finished: true });
    }

    const nextDeck = buildMemoryDeck(MEMORY_STAGE_SIZES[session.stageIndex]);
    if (!nextDeck) return res.status(503).json({ error: '다음 단계를 준비하지 못했습니다.' });
    session.decks.push(nextDeck);
    await session.save();

    res.json({ ok: true, session: memorySessionShape(session), deck: deckShape(nextDeck), finished: false });
  } catch (err) {
    console.error('메모리 게임 단계 처리 에러:', err);
    res.status(500).json({ error: '기록을 저장하지 못했습니다.' });
  }
};

// GET /api/events/memory/leaderboard — 지금 진행 중인 기록 이벤트(없으면 가장 최근에 끝난 회차)의 순위 + 내 최고 기록
const getMemoryLeaderboard = async (req, res) => {
  try {
    if (!isDbConnected()) return res.status(503).json({ error: '데이터베이스에 연결되지 않았습니다.' });

    let period = await getOpenMemoryPeriod();
    if (!period) {
      // 열린 회차가 없으면 지난 회차의 최종 순위를 보여줘 결과를 확인할 수 있게 한다.
      period = await EventMemoryPeriod.findOne({ status: { $in: ['closed', 'settled'] } }).sort({ openedAt: -1, createdAt: -1 });
    }

    const base = {
      ok: true,
      stageSizes: MEMORY_STAGE_SIZES,
      period: memoryPeriodShape(period),
      canPlay: Boolean(period && period.status === 'open'),
      awardPoints: period ? period.awardPoints : MEMORY_DEFAULT_AWARD,
      top: [],
      mine: null,
    };
    if (!period) return res.json(base);

    const ranked = await rankMemoryPeriod(period._id, 10);
    base.top = ranked.map((r, i) => ({
      rank: i + 1,
      nickname: r.nickname,
      totalMs: r.totalMs,
      stages: (r.stages || []).map((s) => ({ size: s.size, ms: s.ms })),
      finishedAt: r.finishedAt,
      isMine: Boolean(req.auth?.sub && String(r.userId) === String(req.auth.sub)),
    }));

    if (req.auth?.sub) {
      const mine = await EventMemorySession.findOne({ periodId: period._id, userId: req.auth.sub, status: 'done' })
        .sort({ totalMs: 1 }).select('totalMs finishedAt').lean();
      base.mine = mine ? { totalMs: mine.totalMs, finishedAt: mine.finishedAt } : null;
    }
    res.json(base);
  } catch (err) {
    console.error('메모리 순위 조회 에러:', err);
    res.status(500).json({ error: '순위를 불러오지 못했습니다.' });
  }
};

// GET /api/events/memory/admin (관리자) — 최근 기록 이벤트 회차 목록 + 회차별 참가 수·상위 기록
const listMemoryPeriods = async (req, res) => {
  try {
    if (!isDbConnected()) return res.status(503).json({ error: '데이터베이스에 연결되지 않았습니다.' });
    await advanceMemoryPeriods();

    const periods = await EventMemoryPeriod.find().sort({ createdAt: -1 }).limit(MEMORY_PERIOD_LIST_LIMIT);
    const shaped = [];
    for (const period of periods) {
      // eslint-disable-next-line no-await-in-loop
      const ranked = await rankMemoryPeriod(period._id, 3);
      // eslint-disable-next-line no-await-in-loop
      const players = await EventMemorySession.distinct('userId', { periodId: period._id, status: 'done' });
      shaped.push(memoryPeriodShape(period, {
        playerCount: players.length,
        top: ranked.map((r, i) => ({ rank: i + 1, nickname: r.nickname, totalMs: r.totalMs })),
      }));
    }
    res.json({
      ok: true,
      periods: shaped,
      limits: { minAward: MEMORY_MIN_AWARD, maxAward: MEMORY_MAX_AWARD, defaultAward: MEMORY_DEFAULT_AWARD },
    });
  } catch (err) {
    console.error('메모리 기록 이벤트 목록 에러:', err);
    res.status(500).json({ error: '기록 이벤트를 불러오지 못했습니다.' });
  }
};

// POST /api/events/memory/period (관리자) — 회차 생성/수정(작성 중·진행 중인 회차만 수정 가능)
const saveMemoryPeriod = async (req, res) => {
  try {
    if (!isDbConnected()) return res.status(503).json({ error: '데이터베이스에 연결되지 않았습니다.' });

    const { id, title, description, endsAt, awardPoints } = req.body || {};
    const trimmedTitle = String(title || '').trim();
    if (!trimmedTitle) return res.status(400).json({ error: '이벤트 제목을 입력해주세요.' });

    const award = awardPoints === undefined || awardPoints === null || awardPoints === '' ? MEMORY_DEFAULT_AWARD : Number(awardPoints);
    if (!Number.isInteger(award) || award < MEMORY_MIN_AWARD) {
      return res.status(400).json({ error: `1위 상금은 ${MEMORY_MIN_AWARD}P 이상의 정수여야 합니다.` });
    }
    if (award > MEMORY_MAX_AWARD) return res.status(400).json({ error: `1위 상금은 ${MEMORY_MAX_AWARD}P 이하로 정해주세요.` });

    const ends = endsAt ? new Date(endsAt) : null;
    if (endsAt && Number.isNaN(ends.getTime())) return res.status(400).json({ error: '마감 시각이 올바르지 않습니다.' });

    const fields = {
      title: trimmedTitle,
      description: String(description || '').trim(),
      awardPoints: award,
      endsAt: ends,
    };

    let period;
    if (id && mongoose.isValidObjectId(id)) {
      period = await EventMemoryPeriod.findById(id);
      if (!period) return res.status(404).json({ error: '회차를 찾을 수 없습니다.' });
      if (period.status === 'closed' || period.status === 'settled') {
        return res.status(409).json({ error: '이미 마감된 회차는 수정할 수 없습니다.' });
      }
      if (period.status === 'open' && ends && ends <= new Date()) {
        return res.status(400).json({ error: '진행 중인 회차의 마감 시각은 지금보다 뒤여야 합니다.' });
      }
      Object.assign(period, fields);
      await period.save();
    } else {
      period = await EventMemoryPeriod.create({ ...fields, status: 'draft' });
    }

    res.json({ ok: true, period: memoryPeriodShape(period) });
  } catch (err) {
    console.error('메모리 기록 이벤트 저장 에러:', err);
    res.status(500).json({ error: '저장에 실패했습니다.' });
  }
};

// POST /api/events/memory/period/status { id, action: 'open'|'close'|'settle'|'delete' } (관리자)
//   open   — 작성 중인 회차를 연다(동시에 하나만 열 수 있다)
//   close  — 진행 중인 회차를 닫는다(순위 확정)
//   settle — 마감된(진행 중이면 먼저 닫고) 회차의 1위에게 상금을 지급하고 알림을 보낸다
//   delete — 작성 중인 회차를 지운다
const setMemoryPeriodStatus = async (req, res) => {
  try {
    if (!isDbConnected()) return res.status(503).json({ error: '데이터베이스에 연결되지 않았습니다.' });

    const { id, action } = req.body || {};
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: '회차를 찾을 수 없습니다.' });
    const period = await EventMemoryPeriod.findById(id);
    if (!period) return res.status(404).json({ error: '회차를 찾을 수 없습니다.' });
    const now = new Date();

    if (action === 'open') {
      if (period.status !== 'draft') return res.status(409).json({ error: '작성 중인 회차만 열 수 있습니다. 끝난 이벤트는 새 회차를 만들어주세요.' });
      if (period.endsAt && period.endsAt <= now) return res.status(400).json({ error: '마감 시각이 이미 지났습니다. 마감 시각을 고쳐주세요.' });
      await advanceMemoryPeriods();
      const already = await EventMemoryPeriod.findOne({ status: 'open', _id: { $ne: period._id } });
      if (already) return res.status(409).json({ error: `이미 진행 중인 기록 이벤트가 있습니다: ${already.title}` });
      // 여는 순간 회원 전체에게 알림이 나가므로, 버튼을 두 번 누르거나 두 관리자가 동시에 눌러도
      // 한 번만 열리고 알림도 한 번만 가도록 draft → open 전환을 원자적으로 선점한다(티어표 공개와 같은 패턴).
      const opened = await EventMemoryPeriod.findOneAndUpdate(
        { _id: period._id, status: 'draft' },
        { $set: { status: 'open', openedAt: now } },
        { new: true },
      );
      if (!opened) return res.status(409).json({ error: '이미 다른 곳에서 처리되었습니다. 새로고침 후 다시 시도해주세요.' });
      await notifyMemoryPeriodOpened(opened);
      return res.json({ ok: true, period: memoryPeriodShape(opened) });
    }

    if (action === 'close') {
      if (period.status !== 'open') return res.status(409).json({ error: '진행 중인 회차만 닫을 수 있습니다.' });
      period.status = 'closed';
      period.closedAt = now;
      await period.save();
      await EventMemorySession.deleteMany({ periodId: period._id, status: 'playing' });
      return res.json({ ok: true, period: memoryPeriodShape(period) });
    }

    if (action === 'delete') {
      if (period.status !== 'draft') return res.status(409).json({ error: '작성 중인 회차만 삭제할 수 있습니다.' });
      await EventMemoryPeriod.deleteOne({ _id: period._id });
      return res.json({ ok: true, deleted: true });
    }

    if (action === 'settle') {
      if (period.status === 'settled') return res.status(409).json({ error: '이미 정산한 회차입니다.' });
      if (period.status === 'draft') return res.status(409).json({ error: '아직 열지 않은 회차입니다.' });
      if (period.status === 'open') {
        period.status = 'closed';
        period.closedAt = now;
        await EventMemorySession.deleteMany({ periodId: period._id, status: 'playing' });
      }

      const [best] = await rankMemoryPeriod(period._id, 1);
      period.status = 'settled';
      period.settledAt = now;

      if (best) {
        const points = await addPoints(best.userId, period.awardPoints);
        await EventMemorySession.updateOne({ _id: best._id }, { $set: { settledAt: now, awardedPoints: period.awardPoints } });
        period.winner = {
          userId: best.userId,
          nickname: best.nickname,
          totalMs: best.totalMs,
          awardedPoints: period.awardPoints,
        };
        await period.save();

        try {
          await createNotification({
            recipientNickname: best.nickname,
            type: 'event_result',
            category: 'noticeNews',
            title: '메모리 게임 기록 이벤트 1위 당첨',
            message: `[${period.title}] 가장 빠른 기록(${(best.totalMs / 1000).toFixed(2)}초)으로 ${period.awardPoints}P 를 받았습니다.`,
            link: '/event#memory',
            resourceId: period._id,
            resourceType: 'eventMemoryPeriod',
          });
        } catch (err) {
          // 알림이 실패해도 상금 지급은 이미 끝났으므로 정산 자체는 성공으로 돌려준다.
          console.error('메모리 게임 결과 알림 실패:', err.message);
        }
        return res.json({ ok: true, period: memoryPeriodShape(period), winner: { nickname: best.nickname, totalMs: best.totalMs, awarded: period.awardPoints, points } });
      }

      // 완주 기록이 하나도 없으면 상금 없이 종료한다(회차가 영원히 정산 대기로 남지 않게).
      await period.save();
      return res.json({ ok: true, period: memoryPeriodShape(period), winner: null });
    }

    res.status(400).json({ error: '알 수 없는 동작입니다.' });
  } catch (err) {
    console.error('메모리 기록 이벤트 상태 변경 에러:', err);
    res.status(500).json({ error: '처리에 실패했습니다.' });
  }
};

/* ====================== 2) 제작한 티어표 공개 ====================== */
// 회원이 커스텀 티어표를 출품(제작해서 올리거나, 이미 올린 게시글로 참가)하고 서로 투표하며,
// 결과 공개일에 우승자(투표 자동 집계 또는 관리자 직접 선정)가 정해져 상금이 지급된다.
// 접수 시작은 관리자가 날짜를 골라 예약할 수 있다. 상태 흐름·규칙은 models/EventShowcase.js 주석 참고.

const SHOWCASE_REVEAL_DELAY_MS = 30 * 60 * 1000; // 마감 후 결과 공개까지 기본 30분
const SHOWCASE_RESULT_EXPIRE_MS = 36 * 60 * 60 * 1000; // 결과 발표 36시간 뒤 — 회차를 통째로 지워 "이벤트 없음" 원래 상태로 되돌린다
const SHOWCASE_TICK_MS = 60 * 1000;              // 예약/마감/공개 시각·결과 만료 확인 주기
const SHOWCASE_DEFAULT_AWARD = 1000;
const SHOWCASE_MIN_AWARD = 1;
const SHOWCASE_MAX_AWARD = 1000000;              // 오타로 터무니없는 금액이 지급되는 것을 막는 상한
const SHOWCASE_ACTIVE_STATUSES = ['scheduled', 'open', 'closed']; // 동시에 하나만 있을 수 있는 "진행 중" 상태들
const SHOWCASE_LIST_LIMIT = 10;                  // 관리자 목록에 보여줄 최근 회차 수
const SHOWCASE_ENTRY_LIMIT = 200;                // 한 화면에 내려보낼 출품작 상한(썸네일이 커서)

// 회차의 투표 수를 작품별로 집계한다 → Map(entryId 문자열 → 표 수)
async function tallyShowcaseVotes(showcaseId) {
  const rows = await EventShowcaseVote.aggregate([
    { $match: { showcaseId: new mongoose.Types.ObjectId(String(showcaseId)) } },
    { $group: { _id: '$entryId', votes: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.votes]));
}

// 참가·투표는 이메일 인증을 마친 일반 회원만 할 수 있다(관리자 계정과 미인증 계정으로 표를 모으는 것을 막는다).
async function checkShowcaseParticipant(auth) {
  if (auth.isAdmin) return '관리자 계정은 이벤트에 참가하거나 투표할 수 없습니다.';
  const user = await User.findById(auth.sub).select('isVerified');
  if (!user) return '회원 정보를 찾을 수 없습니다.';
  if (!user.isVerified) return '이메일 인증을 마친 회원만 참여할 수 있습니다.';
  return null;
}

// 진행 중(예약/접수/마감) 회차 하나 — 없으면 null
function findActiveShowcase() {
  return EventShowcase.findOne({ status: { $in: SHOWCASE_ACTIVE_STATUSES } }).sort({ createdAt: -1 });
}

function isVotingOpen(showcase, now = new Date()) {
  if (!showcase) return false;
  if (showcase.status === 'open') return true;
  // 마감 후에도 결과 공개일까지는 투표할 수 있다.
  return showcase.status === 'closed' && (!showcase.revealAt || now < showcase.revealAt);
}

function isEntryOpen(showcase, now = new Date()) {
  return Boolean(showcase) && showcase.status === 'open' && (!showcase.deadlineAt || now < showcase.deadlineAt);
}

function showcaseBase(showcase) {
  return {
    id: String(showcase._id),
    title: showcase.title,
    description: showcase.description,
    status: showcase.status,
    opensAt: showcase.opensAt,
    openedAt: showcase.openedAt,
    deadlineAt: showcase.deadlineAt,
    revealAt: showcase.revealAt,
    revealedAt: showcase.revealedAt,
    awardPoints: showcase.awardPoints,
    winnerMode: showcase.winnerMode,
    selectedEntryId: showcase.selectedEntryId ? String(showcase.selectedEntryId) : null,
    winners: (showcase.winners || []).map((w) => ({
      rank: w.rank,
      nickname: w.nickname,
      entryId: w.entryId ? String(w.entryId) : null,
      tierListId: w.tierListId ? String(w.tierListId) : null,
      title: w.title,
      votes: w.votes,
      awardedPoints: w.awardedPoints,
    })),
    resultNote: showcase.resultNote,
  };
}

// 출품작 1건 → 응답 모양. 표 수는 결과 발표 전에는 회원에게 숨긴다(눈치 투표 방지) — 관리자에게는 항상 보인다.
function entryShape(entry, { votes, showVotes, viewerId, myVoteEntryId }) {
  return {
    id: String(entry._id),
    nickname: entry.nickname,
    title: entry.title,
    thumbnail: entry.thumbnail,
    tierListId: String(entry.tierListId),
    createdAt: entry.createdAt,
    isMine: Boolean(viewerId && String(entry.userId) === String(viewerId)),
    votedByMe: Boolean(myVoteEntryId && String(entry._id) === String(myVoteEntryId)),
    votes: showVotes ? (votes.get(String(entry._id)) || 0) : undefined,
  };
}

// 접수가 시작되면(예약이 자동으로 열리거나 관리자가 지금 연 경우 모두) 회원 전체에게 알림을 보낸다.
// "무조건 모든 유저" 요구사항이라 참가 여부와 무관하게 User 컬렉션 전체를 돈다(notifyAllMembers) — 다만 각자 알림 설정에서
// 공지·소식(noticeNews) 카테고리를 꺼둔 사람에게는 createNotification 이 알아서 보내지 않는다(사이트 공통 규칙).
async function notifyShowcaseOpened(showcase) {
  await notifyAllMembers({
    title: '🎨 티어표 공개 이벤트 접수가 시작됐어요!',
    message: `[${showcase.title}] 지금부터 접수 중입니다. 티어표를 출품하거나 다른 참가작에 투표해보세요!`,
    link: '/event#showcase',
    resourceId: showcase._id,
    resourceType: 'eventShowcase',
  });
}

// 마감·공개 시각이 지난 회차를 진행시키는 스케줄러 본체(1분마다 + 조회 때마다 호출).
//   scheduled(opensAt 도래) → open(전체 알림) → closed(deadlineAt 도래, 공개 시각 기본값 채움) → 공개일에 자동 발표
//   → revealed 로 36시간이 지나면 통째로 삭제해 "이벤트 없음" 상태로 되돌린다.
async function advanceShowcases() {
  if (!isDbConnected()) return;
  const now = new Date();

  const toOpen = await EventShowcase.find({ status: 'scheduled', opensAt: { $ne: null, $lte: now } });
  for (const showcase of toOpen) {
    // 스케줄러와 관리자의 "지금 열기"가 같은 순간 겹쳐도 알림이 두 번 나가지 않도록 상태를 원자적으로 선점한다.
    // eslint-disable-next-line no-await-in-loop
    const claimed = await EventShowcase.findOneAndUpdate(
      { _id: showcase._id, status: 'scheduled' },
      { $set: { status: 'open', openedAt: now } },
      { new: true },
    );
    // eslint-disable-next-line no-await-in-loop
    if (claimed) await notifyShowcaseOpened(claimed);
  }

  const toClose = await EventShowcase.find({ status: 'open', deadlineAt: { $ne: null, $lte: now } });
  for (const showcase of toClose) {
    showcase.status = 'closed';
    if (!showcase.revealAt || showcase.revealAt <= showcase.deadlineAt) {
      showcase.revealAt = new Date(showcase.deadlineAt.getTime() + SHOWCASE_REVEAL_DELAY_MS);
    }
    // eslint-disable-next-line no-await-in-loop
    await showcase.save();
  }

  const toReveal = await EventShowcase.find({ status: 'closed', revealAt: { $ne: null, $lte: now } });
  for (const showcase of toReveal) {
    // 관리자 직접 선정 방식인데 아직 고르지 않았다면 자동으로 발표하지 않고 관리자를 기다린다(출품작이 하나도 없으면 그냥 종료).
    // eslint-disable-next-line no-await-in-loop
    const waiting = showcase.winnerMode === 'manual' && !showcase.selectedEntryId
      && (await EventShowcaseEntry.countDocuments({ showcaseId: showcase._id })) > 0;
    if (waiting) continue;
    // eslint-disable-next-line no-await-in-loop
    await revealShowcaseDoc(showcase);
  }

  // 발표 후 36시간이 지난 회차는 출품·투표 기록까지 통째로 지워 "이벤트가 아예 없던" 원래 상태로 되돌린다.
  // (참가자 알림·상금 지급은 발표 시점에 이미 끝났으므로 여기서는 그냥 정리만 한다)
  const expireBefore = new Date(now.getTime() - SHOWCASE_RESULT_EXPIRE_MS);
  const toExpire = await EventShowcase.find({ status: 'revealed', revealedAt: { $ne: null, $lte: expireBefore } });
  for (const showcase of toExpire) {
    // eslint-disable-next-line no-await-in-loop
    await EventShowcaseVote.deleteMany({ showcaseId: showcase._id });
    // eslint-disable-next-line no-await-in-loop
    await EventShowcaseEntry.deleteMany({ showcaseId: showcase._id });
    // eslint-disable-next-line no-await-in-loop
    await EventShowcase.deleteOne({ _id: showcase._id });
  }
}

// 실제 발표 처리 — 우승 작품을 정해 상금을 지급하고, 참가자·투표자 전원에게 알림을 보낸다.
// 스케줄러와 관리자 버튼이 동시에 와도 상금이 두 번 나가지 않도록 상태를 먼저 원자적으로 revealed 로 선점한다.
async function revealShowcaseDoc(showcase, { entryId = null } = {}) {
  const claimed = await EventShowcase.findOneAndUpdate(
    { _id: showcase._id, status: { $in: ['open', 'closed'] } },
    { $set: { status: 'revealed', revealedAt: new Date() } },
    { new: true },
  );
  if (!claimed) return null;

  const entries = await EventShowcaseEntry.find({ showcaseId: claimed._id }).sort({ createdAt: 1 });
  const votes = await tallyShowcaseVotes(claimed._id);

  // 우승 작품: 관리자가 지정한 것(이번 요청 > 미리 선정한 것) → 없으면 투표 자동 집계(votes 방식) → 없으면 우승자 없음
  const chosenId = entryId || claimed.selectedEntryId;
  let winnerEntry = chosenId ? entries.find((e) => String(e._id) === String(chosenId)) : null;
  let note = '';
  if (!winnerEntry && claimed.winnerMode === 'votes' && entries.length) {
    // 표 수 내림차순, 동률이면 먼저 출품한 작품(entries 가 출품 순으로 정렬돼 있다)
    const ranked = entries
      .map((e) => ({ e, v: votes.get(String(e._id)) || 0 }))
      .sort((a, b) => b.v - a.v);
    if (ranked[0].v > 0) winnerEntry = ranked[0].e;
    else note = '투표가 없어 우승자를 정하지 못했습니다.';
  }
  if (!winnerEntry && !note) note = entries.length ? '우승자를 정하지 않고 종료했습니다.' : '출품작이 없어 우승자가 없습니다.';

  claimed.winners = [];
  if (winnerEntry) {
    await addPoints(winnerEntry.userId, claimed.awardPoints);
    claimed.winners = [{
      rank: 1,
      userId: winnerEntry.userId,
      nickname: winnerEntry.nickname,
      entryId: winnerEntry._id,
      tierListId: winnerEntry.tierListId,
      title: winnerEntry.title,
      votes: votes.get(String(winnerEntry._id)) || 0,
      awardedPoints: claimed.awardPoints,
    }];
  }
  claimed.resultNote = note;
  await claimed.save();

  // 알림: 우승자에게는 상금 안내, 나머지 참가자·투표자에게는 결과 발표 안내(닉네임 기준 중복 제거).
  const voters = await EventShowcaseVote.find({ showcaseId: claimed._id }).select('voterNickname').lean();
  const winnerNick = winnerEntry ? winnerEntry.nickname : null;
  const recipients = new Set([...entries.map((e) => e.nickname), ...voters.map((v) => v.voterNickname)]);
  for (const nickname of recipients) {
    const isWinner = nickname === winnerNick;
    try {
      // eslint-disable-next-line no-await-in-loop
      await createNotification({
        recipientNickname: nickname,
        type: 'event_result',
        category: 'noticeNews',
        title: isWinner ? '🏆 티어표 공개 이벤트 우승!' : '티어표 공개 이벤트 결과가 발표되었습니다',
        message: isWinner
          ? `[${claimed.title}] 우승하셨어요! 상금 ${claimed.awardPoints}P 를 받았습니다.`
          : `[${claimed.title}] ${winnerNick ? `우승: ${winnerNick}` : (note || '결과가 발표되었습니다.')}`,
        link: '/event#showcase',
        resourceId: claimed._id,
        resourceType: 'eventShowcase',
      });
    } catch (err) {
      console.error('티어표 공개 결과 알림 실패:', err.message);
    }
  }
  return claimed;
}

// 서버 기동 시 1회 호출 — 티어표 공개의 예약/마감/공개 시각과 메모리 기록 이벤트의 마감 시각을
// 같은 주기로 확인한다(server.js 에서 기동).
function startEventScheduler() {
  const tick = () => {
    advanceShowcases().catch((err) => console.error('티어표 공개 이벤트 진행 실패:', err));
    advanceMemoryPeriods().catch((err) => console.error('메모리 기록 이벤트 진행 실패:', err));
  };
  tick();
  setInterval(tick, SHOWCASE_TICK_MS);
}

/* ---- 회원용 ---- */

// GET /api/events/showcase — 지금 진행 중(예약/접수/마감)인 회차, 없으면 가장 최근에 발표된 회차. 작성 중(draft)은 보이지 않는다.
const getShowcase = async (req, res) => {
  try {
    if (!isDbConnected()) return res.status(503).json({ error: '데이터베이스에 연결되지 않았습니다.' });
    await advanceShowcases();

    const viewerId = req.auth?.sub || null;
    const isAdmin = Boolean(req.auth?.isAdmin);
    const showcase = (await findActiveShowcase())
      || (await EventShowcase.findOne({ status: 'revealed' }).sort({ revealedAt: -1 }));
    if (!showcase) return res.json({ ok: true, showcase: null });

    const now = new Date();
    const showEntries = ['open', 'closed', 'revealed'].includes(showcase.status);
    const entries = showEntries
      ? await EventShowcaseEntry.find({ showcaseId: showcase._id }).sort({ createdAt: 1 }).limit(SHOWCASE_ENTRY_LIMIT).lean()
      : [];
    const showVotes = showcase.status === 'revealed' || isAdmin;
    const votes = showVotes ? await tallyShowcaseVotes(showcase._id) : new Map();
    const myVote = viewerId && !isAdmin ? await EventShowcaseVote.findOne({ showcaseId: showcase._id, voterId: viewerId }).lean() : null;
    const myVoteEntryId = myVote ? String(myVote.entryId) : null;
    const myEntry = viewerId ? entries.find((e) => String(e.userId) === String(viewerId)) : null;

    const loggedIn = Boolean(viewerId);
    const canParticipate = loggedIn && !isAdmin;
    const shaped = entries.map((e) => entryShape(e, { votes, showVotes, viewerId, myVoteEntryId }));
    // 결과 발표 후에는 표가 많은 순으로 보여준다
    if (showcase.status === 'revealed') shaped.sort((a, b) => (b.votes || 0) - (a.votes || 0));

    res.json({
      ok: true,
      showcase: {
        ...showcaseBase(showcase),
        entryCount: entries.length,
        entries: shaped,
        // 투표 중에는 표 수를 숨기므로, 합계도 발표 전에는 내려주지 않는다
        viewer: {
          loggedIn,
          isAdmin,
          myEntryId: myEntry ? String(myEntry._id) : null,
          myVoteEntryId,
          canEnter: canParticipate && isEntryOpen(showcase, now) && !myEntry,
          canVote: canParticipate && isVotingOpen(showcase, now),
        },
      },
    });
  } catch (err) {
    console.error('티어표 공개 이벤트 조회 에러:', err);
    res.status(500).json({ error: '이벤트를 불러오지 못했습니다.' });
  }
};

// GET /api/events/showcase/my-posts — 내가 게시판에 올린 공개 티어표(출품할 글 고르기용, 가벼운 필드만)
const getMyShowcasePosts = async (req, res) => {
  try {
    if (!isDbConnected()) return res.status(503).json({ error: '데이터베이스에 연결되지 않았습니다.' });
    const email = String(req.auth.email || '').trim();
    const owner = [{ author: req.auth.nickname, authorEmail: { $in: ['', null] } }];
    if (email) owner.push({ authorEmail: { $in: [email, email.toLowerCase()] } });

    const posts = await TierList.find({ isPublic: true, $or: owner })
      .sort({ createdAt: -1 }).limit(50).select('title thumbnail createdAt').lean();
    res.json({ ok: true, posts: posts.map((p) => ({ id: String(p._id), title: p.title, thumbnail: p.thumbnail, createdAt: p.createdAt })) });
  } catch (err) {
    console.error('내 게시글 조회 에러:', err);
    res.status(500).json({ error: '게시글을 불러오지 못했습니다.' });
  }
};

// POST /api/events/showcase/entry { tierListId } — 접수 중인 회차에 내 게시글로 출품
const enterShowcase = async (req, res) => {
  try {
    if (!isDbConnected()) return res.status(503).json({ error: '데이터베이스에 연결되지 않았습니다.' });
    await advanceShowcases();

    const blocked = await checkShowcaseParticipant(req.auth);
    if (blocked) return res.status(403).json({ error: blocked });

    const showcase = await findActiveShowcase();
    if (!isEntryOpen(showcase)) return res.status(409).json({ error: '지금은 접수 중인 이벤트가 없습니다.', code: 'NOT_OPEN' });

    const { tierListId } = req.body || {};
    if (!mongoose.isValidObjectId(tierListId)) return res.status(400).json({ error: '출품할 티어표를 골라주세요.' });

    const tierList = await TierList.findById(tierListId).select('title thumbnail author authorEmail isPublic').lean();
    if (!tierList) return res.status(404).json({ error: '티어표를 찾을 수 없습니다.' });
    // 남의 글로 출품하는 것을 막는다(이메일 우선, 없으면 닉네임 — 게시글 수정/삭제 권한과 같은 기준)
    if (!isTierListOwner(tierList, { nickname: req.auth.nickname, email: req.auth.email })) {
      return res.status(403).json({ error: '내가 올린 티어표만 출품할 수 있습니다.' });
    }
    if (!tierList.isPublic) return res.status(400).json({ error: '비공개 글은 출품할 수 없어요. 게시판에서 공개로 바꿔주세요.' });

    try {
      await EventShowcaseEntry.create({
        showcaseId: showcase._id,
        userId: req.auth.sub,
        nickname: req.auth.nickname || '익명',
        tierListId,
        title: tierList.title || '',
        thumbnail: tierList.thumbnail || '',
      });
    } catch (err) {
      if (err.code === 11000) return res.status(409).json({ error: '이미 이번 회차에 출품했습니다.', code: 'ALREADY_ENTERED' });
      throw err;
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('티어표 공개 이벤트 출품 에러:', err);
    res.status(500).json({ error: '출품에 실패했습니다.' });
  }
};

// POST /api/events/showcase/entry/cancel — 접수 중에 내 출품 취소(그 작품에 모인 표도 함께 사라진다)
const cancelShowcaseEntry = async (req, res) => {
  try {
    if (!isDbConnected()) return res.status(503).json({ error: '데이터베이스에 연결되지 않았습니다.' });
    await advanceShowcases();

    const showcase = await findActiveShowcase();
    if (!isEntryOpen(showcase)) return res.status(409).json({ error: '접수가 끝나 출품을 취소할 수 없습니다.' });

    const entry = await EventShowcaseEntry.findOneAndDelete({ showcaseId: showcase._id, userId: req.auth.sub });
    if (!entry) return res.status(404).json({ error: '취소할 출품이 없습니다.' });
    await EventShowcaseVote.deleteMany({ entryId: entry._id });
    if (showcase.selectedEntryId && String(showcase.selectedEntryId) === String(entry._id)) {
      showcase.selectedEntryId = null;
      await showcase.save();
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('티어표 공개 이벤트 출품 취소 에러:', err);
    res.status(500).json({ error: '출품을 취소하지 못했습니다.' });
  }
};

// POST /api/events/showcase/vote { entryId } — 한 회차에 한 표. 다른 작품에 다시 누르면 표가 옮겨 가고, 같은 작품이면 취소된다.
const voteShowcase = async (req, res) => {
  try {
    if (!isDbConnected()) return res.status(503).json({ error: '데이터베이스에 연결되지 않았습니다.' });
    await advanceShowcases();

    const blocked = await checkShowcaseParticipant(req.auth);
    if (blocked) return res.status(403).json({ error: blocked });

    const showcase = await findActiveShowcase();
    if (!isVotingOpen(showcase)) return res.status(409).json({ error: '지금은 투표할 수 있는 이벤트가 없습니다.', code: 'VOTING_CLOSED' });

    const { entryId } = req.body || {};
    if (!mongoose.isValidObjectId(entryId)) return res.status(400).json({ error: '투표할 작품을 골라주세요.' });
    const entry = await EventShowcaseEntry.findOne({ _id: entryId, showcaseId: showcase._id });
    if (!entry) return res.status(404).json({ error: '작품을 찾을 수 없습니다.' });
    if (String(entry.userId) === String(req.auth.sub)) return res.status(400).json({ error: '내 작품에는 투표할 수 없어요.' });

    const existing = await EventShowcaseVote.findOne({ showcaseId: showcase._id, voterId: req.auth.sub });
    if (existing && String(existing.entryId) === String(entry._id)) {
      await EventShowcaseVote.deleteOne({ _id: existing._id });
      return res.json({ ok: true, myVoteEntryId: null });
    }
    await EventShowcaseVote.findOneAndUpdate(
      { showcaseId: showcase._id, voterId: req.auth.sub },
      { $set: { entryId: entry._id, voterNickname: req.auth.nickname || '익명' } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    res.json({ ok: true, myVoteEntryId: String(entry._id) });
  } catch (err) {
    console.error('티어표 공개 이벤트 투표 에러:', err);
    res.status(500).json({ error: '투표하지 못했습니다.' });
  }
};

/* ---- 관리자용 ---- */

// 날짜 입력 검증 — 비었으면 { date: null }, 형식이 틀리면 { error }
function parseShowcaseDate(value, label) {
  if (value === undefined || value === null || value === '') return { date: null };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { error: `${label}이(가) 올바르지 않습니다.` };
  return { date };
}

async function adminShowcaseRow(showcase) {
  const [entryCount, voteCount] = await Promise.all([
    EventShowcaseEntry.countDocuments({ showcaseId: showcase._id }),
    EventShowcaseVote.countDocuments({ showcaseId: showcase._id }),
  ]);
  // 관리자 직접 선정 방식인데 공개일이 지나도 아직 고르지 않은 회차 — 화면에서 "선정 대기"로 안내한다.
  const waitingSelection = showcase.status === 'closed' && showcase.winnerMode === 'manual' && !showcase.selectedEntryId
    && entryCount > 0 && showcase.revealAt && showcase.revealAt <= new Date();
  return { ...showcaseBase(showcase), entryCount, voteCount, waitingSelection: Boolean(waitingSelection) };
}

// GET /api/events/showcase/admin?id= — 최근 회차 목록 + 선택한 회차(기본: 진행 중 → 최신)의 출품작·표 수
const listShowcasesAdmin = async (req, res) => {
  try {
    if (!isDbConnected()) return res.status(503).json({ error: '데이터베이스에 연결되지 않았습니다.' });
    await advanceShowcases();

    const showcases = await EventShowcase.find().sort({ createdAt: -1 }).limit(SHOWCASE_LIST_LIMIT);
    const rows = [];
    for (const s of showcases) {
      // eslint-disable-next-line no-await-in-loop
      rows.push(await adminShowcaseRow(s));
    }

    let detailDoc = null;
    if (req.query.id && mongoose.isValidObjectId(req.query.id)) detailDoc = await EventShowcase.findById(req.query.id);
    if (!detailDoc) detailDoc = showcases.find((s) => SHOWCASE_ACTIVE_STATUSES.includes(s.status)) || showcases[0] || null;

    let detail = null;
    if (detailDoc) {
      const entries = await EventShowcaseEntry.find({ showcaseId: detailDoc._id }).sort({ createdAt: 1 }).limit(SHOWCASE_ENTRY_LIMIT).lean();
      const votes = await tallyShowcaseVotes(detailDoc._id);
      const row = rows.find((r) => r.id === String(detailDoc._id)) || await adminShowcaseRow(detailDoc);
      detail = {
        ...row,
        entries: entries
          .map((e) => entryShape(e, { votes, showVotes: true, viewerId: null, myVoteEntryId: null }))
          .sort((a, b) => b.votes - a.votes),
      };
    }

    res.json({
      ok: true,
      showcases: rows,
      detail,
      revealDelayMinutes: SHOWCASE_REVEAL_DELAY_MS / 60000,
      limits: { minAward: SHOWCASE_MIN_AWARD, maxAward: SHOWCASE_MAX_AWARD, defaultAward: SHOWCASE_DEFAULT_AWARD },
    });
  } catch (err) {
    console.error('티어표 공개 이벤트 관리 목록 에러:', err);
    res.status(500).json({ error: '이벤트를 불러오지 못했습니다.' });
  }
};

// POST /api/events/showcase/save (관리자) — 회차 생성/수정 { id?, title, description, opensAt, deadlineAt, revealAt, awardPoints, winnerMode }
const saveShowcase = async (req, res) => {
  try {
    if (!isDbConnected()) return res.status(503).json({ error: '데이터베이스에 연결되지 않았습니다.' });

    const { id, title, description, opensAt, deadlineAt, revealAt, awardPoints, winnerMode } = req.body || {};
    const trimmedTitle = String(title || '').trim();
    if (!trimmedTitle) return res.status(400).json({ error: '이벤트 제목을 입력해주세요.' });

    const opens = parseShowcaseDate(opensAt, '접수 시작 시각');
    const deadline = parseShowcaseDate(deadlineAt, '접수 마감 시각');
    const reveal = parseShowcaseDate(revealAt, '결과 공개 시각');
    const dateError = opens.error || deadline.error || reveal.error;
    if (dateError) return res.status(400).json({ error: dateError });

    if (opens.date && deadline.date && deadline.date <= opens.date) return res.status(400).json({ error: '접수 마감은 접수 시작보다 뒤여야 합니다.' });
    // 공개 시각을 따로 안 정했으면 마감 + 30분으로 둔다.
    let revealDate = reveal.date;
    if (!revealDate && deadline.date) revealDate = new Date(deadline.date.getTime() + SHOWCASE_REVEAL_DELAY_MS);
    if (revealDate && deadline.date && revealDate < deadline.date) return res.status(400).json({ error: '결과 공개 시각은 접수 마감보다 뒤여야 합니다.' });

    const award = awardPoints === undefined || awardPoints === null || awardPoints === '' ? SHOWCASE_DEFAULT_AWARD : Number(awardPoints);
    if (!Number.isInteger(award) || award < SHOWCASE_MIN_AWARD) return res.status(400).json({ error: `우승 상금은 ${SHOWCASE_MIN_AWARD}P 이상의 정수여야 합니다.` });
    if (award > SHOWCASE_MAX_AWARD) return res.status(400).json({ error: `우승 상금은 ${SHOWCASE_MAX_AWARD}P 이하로 정해주세요.` });
    const mode = winnerMode === 'manual' ? 'manual' : 'votes';

    const fields = {
      title: trimmedTitle,
      description: String(description || '').trim(),
      opensAt: opens.date,
      deadlineAt: deadline.date,
      revealAt: revealDate,
      awardPoints: award,
      winnerMode: mode,
    };

    let showcase;
    if (id && mongoose.isValidObjectId(id)) {
      showcase = await EventShowcase.findById(id);
      if (!showcase) return res.status(404).json({ error: '회차를 찾을 수 없습니다.' });
      if (showcase.status === 'revealed') return res.status(409).json({ error: '이미 발표된 회차는 수정할 수 없습니다.' });
      const now = new Date();
      if (showcase.status === 'scheduled' && (!opens.date || opens.date <= now)) {
        return res.status(400).json({ error: '예약된 회차의 접수 시작은 지금보다 뒤여야 합니다. 바로 열려면 "지금 접수 열기"를 눌러주세요.' });
      }
      if (['open', 'scheduled'].includes(showcase.status) && (!deadline.date || deadline.date <= now)) {
        return res.status(400).json({ error: '접수 마감은 지금보다 뒤여야 합니다.' });
      }
      // 이미 시작된 회차의 접수 시작 시각은 바꿀 수 없다(기록으로만 남는다)
      if (showcase.status === 'open' || showcase.status === 'closed') fields.opensAt = showcase.opensAt;
      // 마감된 회차는 접수 마감 시각도 그대로 둔다
      if (showcase.status === 'closed') fields.deadlineAt = showcase.deadlineAt;
      Object.assign(showcase, fields);
      await showcase.save();
    } else {
      showcase = await EventShowcase.create({ ...fields, status: 'draft' });
    }

    res.json({ ok: true, showcase: await adminShowcaseRow(showcase) });
  } catch (err) {
    console.error('티어표 공개 이벤트 저장 에러:', err);
    res.status(500).json({ error: '저장에 실패했습니다.' });
  }
};

// POST /api/events/showcase/status { id, action, entryId? } (관리자)
//   schedule   — 작성 중인 회차의 접수 시작을 저장된 opensAt 으로 예약한다(그 시각에 자동으로 열림)
//   unschedule — 예약을 취소하고 작성 중으로 되돌린다
//   open       — 지금 바로 접수를 연다
//   close      — 접수를 닫는다(투표는 결과 공개일까지 계속)
//   select     — 우승 작품을 직접 선정한다(entryId 가 비면 선정 해제)
//   reveal     — 기다리지 않고 지금 결과를 발표한다(entryId 를 주면 그 작품을 우승으로)
//   delete     — 작성 중/예약 중인 회차를 지운다
const setShowcaseStatus = async (req, res) => {
  try {
    if (!isDbConnected()) return res.status(503).json({ error: '데이터베이스에 연결되지 않았습니다.' });

    const { id, action, entryId } = req.body || {};
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: '회차를 찾을 수 없습니다.' });
    const showcase = await EventShowcase.findById(id);
    if (!showcase) return res.status(404).json({ error: '회차를 찾을 수 없습니다.' });
    const now = new Date();

    // 접수를 열거나 예약할 때의 공통 검사 — 진행 중인 회차는 하나뿐이고, 마감 시각이 있어야 자동 진행이 가능하다.
    const checkStartable = async () => {
      if (showcase.status !== 'draft' && showcase.status !== 'scheduled') return '작성 중이거나 예약된 회차만 시작할 수 있습니다.';
      if (!showcase.deadlineAt) return '접수 마감 시각을 먼저 정해주세요.';
      if (showcase.deadlineAt <= now) return '접수 마감 시각이 이미 지났습니다. 마감 시각을 고쳐주세요.';
      const other = await EventShowcase.findOne({ status: { $in: SHOWCASE_ACTIVE_STATUSES }, _id: { $ne: showcase._id } });
      if (other) return `이미 진행 중이거나 예약된 이벤트가 있습니다: ${other.title}`;
      return null;
    };

    if (action === 'schedule') {
      const err = await checkStartable();
      if (err) return res.status(showcase.deadlineAt && err.startsWith('이미') ? 409 : 400).json({ error: err });
      if (!showcase.opensAt || showcase.opensAt <= now) return res.status(400).json({ error: '접수 시작 날짜를 지금보다 뒤로 정해주세요. 바로 열려면 "지금 접수 열기"를 눌러주세요.' });
      if (showcase.opensAt >= showcase.deadlineAt) return res.status(400).json({ error: '접수 마감은 접수 시작보다 뒤여야 합니다.' });
      showcase.status = 'scheduled';
      await showcase.save();
      return res.json({ ok: true, showcase: await adminShowcaseRow(showcase) });
    }

    if (action === 'unschedule') {
      if (showcase.status !== 'scheduled') return res.status(409).json({ error: '예약된 회차만 예약을 취소할 수 있습니다.' });
      showcase.status = 'draft';
      await showcase.save();
      return res.json({ ok: true, showcase: await adminShowcaseRow(showcase) });
    }

    if (action === 'open') {
      const err = await checkStartable();
      if (err) return res.status(err.startsWith('이미') ? 409 : 400).json({ error: err });
      const revealAt = (!showcase.revealAt || showcase.revealAt < showcase.deadlineAt)
        ? new Date(showcase.deadlineAt.getTime() + SHOWCASE_REVEAL_DELAY_MS)
        : showcase.revealAt;
      // 스케줄러가 같은 순간 이 회차를 자동으로 열 수도 있으니(예약 시각 도래) 원자적으로 선점해
      // "모든 회원에게 알림"이 중복으로 나가지 않게 한다.
      const claimed = await EventShowcase.findOneAndUpdate(
        { _id: showcase._id, status: { $in: ['draft', 'scheduled'] } },
        { $set: { status: 'open', openedAt: now, revealAt } },
        { new: true },
      );
      if (!claimed) return res.status(409).json({ error: '이미 다른 곳에서 처리되었습니다. 새로고침 후 다시 시도해주세요.' });
      await notifyShowcaseOpened(claimed);
      return res.json({ ok: true, showcase: await adminShowcaseRow(claimed) });
    }

    if (action === 'close') {
      if (showcase.status !== 'open') return res.status(409).json({ error: '접수 중인 회차만 닫을 수 있습니다.' });
      showcase.status = 'closed';
      // 결과 공개 시각이 없거나 이미 지났다면 지금부터 30분 뒤로 잡는다(투표할 시간을 남긴다)
      if (!showcase.revealAt || showcase.revealAt <= now) showcase.revealAt = new Date(now.getTime() + SHOWCASE_REVEAL_DELAY_MS);
      await showcase.save();
      return res.json({ ok: true, showcase: await adminShowcaseRow(showcase) });
    }

    if (action === 'select') {
      if (!['open', 'closed'].includes(showcase.status)) return res.status(409).json({ error: '접수 중이거나 마감된 회차에서만 우승 작품을 선정할 수 있습니다.' });
      if (!entryId) {
        showcase.selectedEntryId = null;
      } else {
        if (!mongoose.isValidObjectId(entryId)) return res.status(400).json({ error: '작품을 찾을 수 없습니다.' });
        const entry = await EventShowcaseEntry.findOne({ _id: entryId, showcaseId: showcase._id });
        if (!entry) return res.status(404).json({ error: '이 회차의 출품작이 아닙니다.' });
        showcase.selectedEntryId = entry._id;
      }
      await showcase.save();
      return res.json({ ok: true, showcase: await adminShowcaseRow(showcase) });
    }

    if (action === 'reveal') {
      if (!['open', 'closed'].includes(showcase.status)) return res.status(409).json({ error: '접수 중이거나 마감된 회차만 발표할 수 있습니다.' });
      let pick = null;
      if (entryId) {
        if (!mongoose.isValidObjectId(entryId)) return res.status(400).json({ error: '작품을 찾을 수 없습니다.' });
        pick = entryId;
        if (!(await EventShowcaseEntry.exists({ _id: entryId, showcaseId: showcase._id }))) return res.status(404).json({ error: '이 회차의 출품작이 아닙니다.' });
      }
      // 직접 선정 방식인데 우승 작품이 정해지지 않았다면 발표할 수 없다(출품작이 없으면 우승자 없이 종료 가능)
      if (!pick && !showcase.selectedEntryId && showcase.winnerMode === 'manual'
        && (await EventShowcaseEntry.countDocuments({ showcaseId: showcase._id })) > 0) {
        return res.status(400).json({ error: '우승 작품을 먼저 선정해주세요(직접 선정 방식).' });
      }
      const done = await revealShowcaseDoc(showcase, { entryId: pick });
      if (!done) return res.status(409).json({ error: '이미 발표된 회차입니다.' });
      return res.json({ ok: true, showcase: await adminShowcaseRow(done) });
    }

    if (action === 'delete') {
      if (!['draft', 'scheduled'].includes(showcase.status)) return res.status(409).json({ error: '작성 중이거나 예약된 회차만 삭제할 수 있습니다.' });
      await EventShowcase.deleteOne({ _id: showcase._id });
      return res.json({ ok: true, deleted: true });
    }

    res.status(400).json({ error: '알 수 없는 동작입니다.' });
  } catch (err) {
    console.error('티어표 공개 이벤트 상태 변경 에러:', err);
    res.status(500).json({ error: '처리에 실패했습니다.' });
  }
};

module.exports = {
  getQuizToday,
  answerQuiz,
  startMemory,
  clearMemoryStage,
  getMemoryLeaderboard,
  listMemoryPeriods,
  saveMemoryPeriod,
  setMemoryPeriodStatus,
  getShowcase,
  getMyShowcasePosts,
  enterShowcase,
  cancelShowcaseEntry,
  voteShowcase,
  listShowcasesAdmin,
  saveShowcase,
  setShowcaseStatus,
  startEventScheduler,
};
