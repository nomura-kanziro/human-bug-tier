/* ======================================================================
 * 이벤트 컨트롤러 (/api/events)
 * ----------------------------------------------------------------------
 * 이벤트 페이지의 세 가지 놀거리를 한 파일에서 담당한다.
 *
 *  1) 매일 간단 퀴즈 (quiz)      — "{캐릭터}는 어느 티어인가요?" 3지선다, 하루 1번.
 *                                  맞히면 1~1000P 를 복권식(낮은 점수일수록 잘 나옴)으로 지급.
 *  2) 제작한 티어표 공개 (showcase) — 관리자가 회차를 열고 마감·발표. **아직 관리자 전용(뼈대)**.
 *  3) 메모리 게임 (memory)        — 4×4 → 6×6 → 8×8 3단계. 기록 상위에게 관리자가 포인트 지급.
 *
 * 공통 원칙(행운 뽑기와 같다): 정답·확률·시간·포인트는 전부 서버가 정하고,
 * 프론트는 "고른 번호"나 "다 맞췄다"는 신호만 보낸다. 포인트는 LuckProfile.points 에 쌓인다
 * (사이트의 포인트는 이 한 곳이 정본 — 행운 뽑기·포커와 같은 지갑을 쓴다).
 * ====================================================================== */
const mongoose = require('mongoose');
const EventQuizAttempt = require('../models/EventQuizAttempt');
const EventMemorySession = require('../models/EventMemorySession');
const EventShowcase = require('../models/EventShowcase');
const EventShowcaseEntry = require('../models/EventShowcaseEntry');
const LuckProfile = require('../models/LuckProfile');
const TierList = require('../models/TierList');
const { getAllCharacters, getAllTierSlots } = require('../data/tierCatalog');
const { getKstDateString } = require('../utils/kstDate');
const { resolveTierMediaPath } = require('../utils/tierMediaDir');
const { createNotification } = require('../utils/notificationService');

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
const MEMORY_AWARD_POINTS = 1000; // 기간 1위에게 주는 포인트

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

// POST /api/events/memory/start — 새 판 시작(진행 중인 판이 있으면 버리고 새로 시작)
const startMemory = async (req, res) => {
  try {
    if (!isDbConnected()) return res.status(503).json({ error: '데이터베이스에 연결되지 않았습니다.' });

    const deck = buildMemoryDeck(MEMORY_STAGE_SIZES[0]);
    if (!deck) return res.status(503).json({ error: '티어표 데이터를 불러오지 못해 게임을 시작할 수 없습니다.' });

    // 끝내지 않고 떠난 판은 기록으로 남길 이유가 없으므로 정리한다.
    await EventMemorySession.deleteMany({ userId: req.auth.sub, status: 'playing' });

    const session = await EventMemorySession.create({
      userId: req.auth.sub,
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

// POST /api/events/memory/stage { sessionId } — 지금 단계를 다 맞췄다는 신고. 시간은 서버가 잰다.
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

// GET /api/events/memory/leaderboard — 이번 기간(아직 정산 안 된) 완주 기록 상위 + 내 최고 기록
const getMemoryLeaderboard = async (req, res) => {
  try {
    if (!isDbConnected()) return res.status(503).json({ error: '데이터베이스에 연결되지 않았습니다.' });

    const top = await EventMemorySession.find({ status: 'done', settledAt: null })
      .sort({ totalMs: 1 }).limit(10)
      .select('nickname totalMs stages finishedAt userId').lean();

    let mine = null;
    if (req.auth?.sub) {
      mine = await EventMemorySession.findOne({ userId: req.auth.sub, status: 'done', settledAt: null })
        .sort({ totalMs: 1 }).select('nickname totalMs finishedAt').lean();
    }

    res.json({
      ok: true,
      stageSizes: MEMORY_STAGE_SIZES,
      awardPoints: MEMORY_AWARD_POINTS,
      top: top.map((r, i) => ({
        rank: i + 1,
        nickname: r.nickname,
        totalMs: r.totalMs,
        stages: (r.stages || []).map((s) => ({ size: s.size, ms: s.ms })),
        finishedAt: r.finishedAt,
        isMine: Boolean(req.auth?.sub && String(r.userId) === String(req.auth.sub)),
      })),
      mine: mine ? { totalMs: mine.totalMs, finishedAt: mine.finishedAt } : null,
    });
  } catch (err) {
    console.error('메모리 순위 조회 에러:', err);
    res.status(500).json({ error: '순위를 불러오지 못했습니다.' });
  }
};

// POST /api/events/memory/settle (관리자) — 이번 기간 1위에게 포인트를 주고 기간을 닫는다.
const settleMemoryPeriod = async (req, res) => {
  try {
    if (!isDbConnected()) return res.status(503).json({ error: '데이터베이스에 연결되지 않았습니다.' });

    const best = await EventMemorySession.findOne({ status: 'done', settledAt: null }).sort({ totalMs: 1 });
    if (!best) return res.status(400).json({ error: '이번 기간에 완주한 기록이 없습니다.' });

    const now = new Date();
    const points = await addPoints(best.userId, MEMORY_AWARD_POINTS);
    best.settledAt = now;
    best.awardedPoints = MEMORY_AWARD_POINTS;
    await best.save();
    // 나머지 기록도 같은 기간이었으므로 함께 닫아 다음 기간이 새로 시작되게 한다.
    await EventMemorySession.updateMany({ status: 'done', settledAt: null }, { $set: { settledAt: now } });

    await createNotification({
      recipientNickname: best.nickname,
      type: 'event_result',
      category: 'noticeNews',
      title: '메모리 게임 기간 1위 당첨',
      message: `가장 빠른 기록(${(best.totalMs / 1000).toFixed(2)}초)으로 ${MEMORY_AWARD_POINTS}P 를 받았습니다.`,
      link: '/event',
    });

    res.json({ ok: true, winner: { nickname: best.nickname, totalMs: best.totalMs, awarded: MEMORY_AWARD_POINTS, points } });
  } catch (err) {
    console.error('메모리 기간 정산 에러:', err);
    res.status(500).json({ error: '정산에 실패했습니다.' });
  }
};

/* ====================== 2) 제작한 티어표 공개 (관리자 전용 뼈대) ====================== */

const SHOWCASE_REVEAL_DELAY_MS = 30 * 60 * 1000; // 마감 후 결과 공개까지 기본 30분
const SHOWCASE_TICK_MS = 60 * 1000;              // 마감/공개 시각 확인 주기

function showcaseShape(showcase, entries = null, myEntry = null) {
  if (!showcase) return null;
  return {
    id: String(showcase._id),
    title: showcase.title,
    description: showcase.description,
    status: showcase.status,
    deadlineAt: showcase.deadlineAt,
    revealAt: showcase.revealAt,
    revealedAt: showcase.revealedAt,
    winners: showcase.winners,
    resultNote: showcase.resultNote,
    entryCount: entries ? entries.length : undefined,
    entries: entries
      ? entries.map((e) => ({
        id: String(e._id),
        nickname: e.nickname,
        tierListId: String(e.tierListId),
        title: e.title,
        thumbnail: e.thumbnail,
      }))
      : undefined,
    myEntry: myEntry ? { tierListId: String(myEntry.tierListId), title: myEntry.title } : null,
  };
}

// 마감 시각이 지난 회차는 닫고, 공개 예정 시각이 지난 회차는 발표한다(스케줄러 + 조회 때마다 호출).
async function advanceShowcases() {
  if (!isDbConnected()) return;
  const now = new Date();

  const toClose = await EventShowcase.find({ status: 'open', deadlineAt: { $ne: null, $lte: now } });
  for (const showcase of toClose) {
    showcase.status = 'closed';
    if (!showcase.revealAt) showcase.revealAt = new Date(showcase.deadlineAt.getTime() + SHOWCASE_REVEAL_DELAY_MS);
    // eslint-disable-next-line no-await-in-loop
    await showcase.save();
  }

  const toReveal = await EventShowcase.find({ status: 'closed', revealAt: { $ne: null, $lte: now } });
  for (const showcase of toReveal) {
    // eslint-disable-next-line no-await-in-loop
    await revealShowcaseDoc(showcase);
  }
}

// 실제 발표 처리 — 당첨자를 확정하고 참가자 전원에게 알림을 보낸다.
async function revealShowcaseDoc(showcase, winners = null, resultNote = '') {
  const entries = await EventShowcaseEntry.find({ showcaseId: showcase._id }).lean();

  if (Array.isArray(winners) && winners.length) {
    showcase.winners = winners;
  } else if (!showcase.winners.length && entries.length) {
    // 관리자가 당첨자를 지정하지 않고 시간이 지나 자동 공개된 경우: 아직 심사 전이므로 비워 둔다.
    showcase.winners = [];
  }
  if (resultNote) showcase.resultNote = resultNote;
  showcase.status = 'revealed';
  showcase.revealedAt = new Date();
  await showcase.save();

  // 참가자 전원에게 "결과가 공개됐다" 알림. 한 명이 실패해도 나머지는 계속 보낸다.
  for (const entry of entries) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await createNotification({
        recipientNickname: entry.nickname,
        type: 'event_result',
        category: 'noticeNews',
        title: '티어표 공개 이벤트 결과가 발표되었습니다',
        message: showcase.title,
        link: '/event',
        resourceId: showcase._id,
        resourceType: 'eventShowcase',
      });
    } catch (err) {
      console.error('티어표 공개 결과 알림 실패:', err.message);
    }
  }
  return showcase;
}

// 서버 기동 시 1회 호출 — 마감/공개 시각을 주기적으로 확인한다(server.js 에서 기동).
function startShowcaseScheduler() {
  advanceShowcases().catch((err) => console.error('티어표 공개 이벤트 초기화 실패:', err));
  setInterval(() => {
    advanceShowcases().catch((err) => console.error('티어표 공개 이벤트 진행 실패:', err));
  }, SHOWCASE_TICK_MS);
}

// GET /api/events/showcase — 가장 최근 회차 + 참가 목록 (현재 관리자 전용)
const getShowcase = async (req, res) => {
  try {
    if (!isDbConnected()) return res.status(503).json({ error: '데이터베이스에 연결되지 않았습니다.' });
    await advanceShowcases();

    const showcase = await EventShowcase.findOne().sort({ createdAt: -1 });
    if (!showcase) return res.json({ ok: true, showcase: null, revealDelayMinutes: SHOWCASE_REVEAL_DELAY_MS / 60000 });

    const entries = await EventShowcaseEntry.find({ showcaseId: showcase._id }).sort({ createdAt: 1 }).lean();
    const myEntry = entries.find((e) => String(e.userId) === String(req.auth.sub)) || null;

    res.json({
      ok: true,
      showcase: showcaseShape(showcase, entries, myEntry),
      revealDelayMinutes: SHOWCASE_REVEAL_DELAY_MS / 60000,
    });
  } catch (err) {
    console.error('티어표 공개 이벤트 조회 에러:', err);
    res.status(500).json({ error: '이벤트를 불러오지 못했습니다.' });
  }
};

// POST /api/events/showcase (관리자) — 회차 생성/수정
const saveShowcase = async (req, res) => {
  try {
    if (!isDbConnected()) return res.status(503).json({ error: '데이터베이스에 연결되지 않았습니다.' });

    const { id, title, description, deadlineAt, revealAt, status } = req.body || {};
    const trimmedTitle = String(title || '').trim();
    if (!trimmedTitle) return res.status(400).json({ error: '이벤트 제목을 입력해주세요.' });

    const deadline = deadlineAt ? new Date(deadlineAt) : null;
    if (deadlineAt && Number.isNaN(deadline.getTime())) return res.status(400).json({ error: '마감 시각이 올바르지 않습니다.' });

    let reveal = revealAt ? new Date(revealAt) : null;
    if (revealAt && Number.isNaN(reveal.getTime())) return res.status(400).json({ error: '공개 시각이 올바르지 않습니다.' });
    // 공개 시각을 따로 안 정했으면 마감 + 30분으로 둔다.
    if (!reveal && deadline) reveal = new Date(deadline.getTime() + SHOWCASE_REVEAL_DELAY_MS);
    if (reveal && deadline && reveal < deadline) {
      return res.status(400).json({ error: '결과 공개 시각은 마감 시각보다 뒤여야 합니다.' });
    }

    const allowedStatus = ['draft', 'open', 'closed'];
    const nextStatus = allowedStatus.includes(status) ? status : undefined;

    let showcase;
    if (id && mongoose.isValidObjectId(id)) {
      showcase = await EventShowcase.findById(id);
      if (!showcase) return res.status(404).json({ error: '회차를 찾을 수 없습니다.' });
      if (showcase.status === 'revealed') return res.status(409).json({ error: '이미 발표된 회차는 수정할 수 없습니다.' });
      showcase.title = trimmedTitle;
      showcase.description = String(description || '').trim();
      showcase.deadlineAt = deadline;
      showcase.revealAt = reveal;
      if (nextStatus) showcase.status = nextStatus;
      await showcase.save();
    } else {
      showcase = await EventShowcase.create({
        title: trimmedTitle,
        description: String(description || '').trim(),
        deadlineAt: deadline,
        revealAt: reveal,
        status: nextStatus || 'draft',
      });
    }

    res.json({ ok: true, showcase: showcaseShape(showcase, [], null) });
  } catch (err) {
    console.error('티어표 공개 이벤트 저장 에러:', err);
    res.status(500).json({ error: '저장에 실패했습니다.' });
  }
};

// POST /api/events/showcase/entry { tierListId } — 출품(현재 관리자 전용)
const enterShowcase = async (req, res) => {
  try {
    if (!isDbConnected()) return res.status(503).json({ error: '데이터베이스에 연결되지 않았습니다.' });
    await advanceShowcases();

    const showcase = await EventShowcase.findOne().sort({ createdAt: -1 });
    if (!showcase || showcase.status !== 'open') {
      return res.status(409).json({ error: '지금은 접수 중인 이벤트가 없습니다.' });
    }

    const { tierListId } = req.body || {};
    if (!mongoose.isValidObjectId(tierListId)) return res.status(400).json({ error: '출품할 티어표를 골라주세요.' });

    const tierList = await TierList.findById(tierListId).select('title thumbnail author authorEmail').lean();
    if (!tierList) return res.status(404).json({ error: '티어표를 찾을 수 없습니다.' });

    const nickname = req.auth.nickname || '익명';
    try {
      await EventShowcaseEntry.create({
        showcaseId: showcase._id,
        userId: req.auth.sub,
        nickname,
        tierListId,
        title: tierList.title || '',
        thumbnail: tierList.thumbnail || '',
      });
    } catch (err) {
      if (err.code === 11000) return res.status(409).json({ error: '이미 이번 회차에 출품했습니다.' });
      throw err;
    }

    const entries = await EventShowcaseEntry.find({ showcaseId: showcase._id }).sort({ createdAt: 1 }).lean();
    const myEntry = entries.find((e) => String(e.userId) === String(req.auth.sub)) || null;
    res.json({ ok: true, showcase: showcaseShape(showcase, entries, myEntry) });
  } catch (err) {
    console.error('티어표 공개 이벤트 출품 에러:', err);
    res.status(500).json({ error: '출품에 실패했습니다.' });
  }
};

// POST /api/events/showcase/reveal (관리자) — 기다리지 않고 바로 결과 발표
const revealShowcase = async (req, res) => {
  try {
    if (!isDbConnected()) return res.status(503).json({ error: '데이터베이스에 연결되지 않았습니다.' });

    const showcase = await EventShowcase.findOne().sort({ createdAt: -1 });
    if (!showcase) return res.status(404).json({ error: '발표할 회차가 없습니다.' });
    if (showcase.status === 'revealed') return res.status(409).json({ error: '이미 발표된 회차입니다.' });
    if (showcase.status === 'draft') return res.status(409).json({ error: '아직 시작하지 않은 회차입니다.' });

    // 당첨자는 [{ rank, nickname, tierListId, title }] 형태로 받는다(관리자가 직접 고른다).
    const winners = Array.isArray(req.body?.winners)
      ? req.body.winners
        .filter((w) => w && String(w.nickname || '').trim())
        .map((w, i) => ({
          rank: Number.isInteger(w.rank) ? w.rank : i + 1,
          nickname: String(w.nickname).trim(),
          userId: mongoose.isValidObjectId(w.userId) ? w.userId : undefined,
          tierListId: mongoose.isValidObjectId(w.tierListId) ? w.tierListId : undefined,
          title: String(w.title || ''),
        }))
      : [];

    await revealShowcaseDoc(showcase, winners, String(req.body?.resultNote || '').trim());

    const entries = await EventShowcaseEntry.find({ showcaseId: showcase._id }).sort({ createdAt: 1 }).lean();
    res.json({ ok: true, showcase: showcaseShape(showcase, entries, null) });
  } catch (err) {
    console.error('티어표 공개 이벤트 발표 에러:', err);
    res.status(500).json({ error: '발표에 실패했습니다.' });
  }
};

module.exports = {
  getQuizToday,
  answerQuiz,
  startMemory,
  clearMemoryStage,
  getMemoryLeaderboard,
  settleMemoryPeriod,
  getShowcase,
  saveShowcase,
  enterShowcase,
  revealShowcase,
  startShowcaseScheduler,
};
