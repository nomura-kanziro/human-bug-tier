/* ====================================================================
 * controllers/aiAgentController.js — 휴버대 에이전트 봇 (/api/ai/agent)
 * ------------------------------------------------------------------
 * 에이전트 봇의 "두뇌"는 ai-service(FastAPI · LangGraph, app/Agent-Bot)에 있고, 여기는 사이트 쪽 일을 맡는다:
 *   1) 로그인 회원인지 확인(포인트를 쓰는 기능이라 회원 전용 — 관리자 계정은 포인트가 없어 쓸 수 없다)
 *   2) 요청 수 제한 · 회원 한 명당 동시에 한 작업만
 *   3) 회원의 현재 상태(포인트·출석·뽑기·내 글)를 읽어 ai-service 에 같이 넘긴다(토큰은 넘기지 않는다)
 *   4) ai-service 가 보내는 이벤트 스트림(NDJSON)을 브라우저로 그대로 흘려보내면서,
 *      "plan" 이벤트(어떤 작업인지 정해진 순간)에 작업 강도만큼 포인트를 차감하고 원장(LuckPointLog)에 남긴다.
 *      작업이 실패하면(오류 이벤트 · ai-service 끊김) 차감한 포인트를 돌려준다.
 *   5) ai-service 의 도구가 게시판·공지를 읽을 수 있게 가벼운 조회 API(/agent/data/*)를 연다(ai-service 전용).
 *
 * 요금(작업 강도별) — 이 값을 바꾸면 ai-service/knowledge/08-guide-and-ai.md 와 화면 문구도 같이 바뀐다
 * (화면은 GET /agent/info 로 받아 쓰고, 지식 문서는 tests/test_knowledge_sync.py 가 대조한다).
 *   가벼움(light)  통합 검색                         → AGENT_COSTS.light
 *   보통(normal)   내 티어표 분석 · 요약 · 브리핑    → AGENT_COSTS.normal
 *   무거움(heavy)  티어표 초안 만들기                → AGENT_COSTS.heavy
 *   무료(free)     이용 안내 · 거절 · 못 알아들은 말
 * AI 서버(LLM)가 OFF 면 AI 해설 없이 결과만 나가므로 어떤 작업이든 가벼움 요금만 받는다.
 * 대화 내용은 저장하지 않는다(원장에는 "어떤 작업에 몇 포인트"만 남는다).
 * ==================================================================== */
const mongoose = require('mongoose');
const LuckProfile = require('../models/LuckProfile');
const TierList = require('../models/TierList');
const Notice = require('../models/Notice');
const { recordPointChange } = require('../utils/luckPointLog');
const { describeAttendance, ATTENDANCE_REWARDS } = require('../utils/attendance');
const { getKstDateString } = require('../utils/kstDate');
const { MEMBER_DAILY_LIMIT } = require('./luckDrawController');

const AI_URL = (process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');
// 에이전트 봇 작업 하나를 기다리는 최대 시간(ms). 스트림이라 글자는 계속 오지만, 전체가 이보다 길어지면 끊고 포인트를 돌려준다.
const RUN_TIMEOUT_MS = process.env.AI_AGENT_TIMEOUT_MS === undefined || process.env.AI_AGENT_TIMEOUT_MS === ''
  ? 300 * 1000
  : Math.max(0, Number(process.env.AI_AGENT_TIMEOUT_MS) || 0);

const AGENT_COSTS = { free: 0, light: 2, normal: 4, heavy: 8 };
const LEVEL_LABELS = { free: '무료', light: '가벼움', normal: '보통', heavy: '무거움' };

const MAX_MESSAGE = 500;
const MAX_HISTORY = 8;
const MAX_HISTORY_CHARS = 1200;
const MAX_MAKER_ZONES = 60;
const MAX_ZONE_NAMES = 400;
const MAX_NAME_CHARS = 80;

// 요청 수 제한 — 회원 한 명당 10분에 12번. 메모리에만 두며 서버 재시작 시 초기화(pm2 instances 1 이라 충분).
const RUN_WINDOW_MS = 10 * 60 * 1000;
const RUN_LIMIT = 12;
const runHits = new Map();      // userId → [시각...]
const running = new Set();      // 지금 작업 중인 userId (동시에 하나만)

function takeRunSlot(userId) {
  const now = Date.now();
  const recent = (runHits.get(userId) || []).filter((t) => now - t < RUN_WINDOW_MS);
  if (recent.length >= RUN_LIMIT) {
    runHits.set(userId, recent);
    return Math.ceil((RUN_WINDOW_MS - (now - recent[0])) / 1000);
  }
  recent.push(now);
  runHits.set(userId, recent);
  return 0;
}

setInterval(() => {
  const now = Date.now();
  for (const [id, list] of runHits) {
    if (!list.some((t) => now - t < RUN_WINDOW_MS)) runHits.delete(id);
  }
}, RUN_WINDOW_MS).unref();

function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

function aiHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (process.env.AI_SERVICE_KEY) headers['X-AI-Key'] = process.env.AI_SERVICE_KEY;
  return headers;
}

const escapeRegex = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// 회원(관리자 아님)의 userId. 아니면 null.
function memberId(req) {
  const auth = req.auth;
  if (!auth || auth.isAdmin || !auth.sub || !mongoose.isValidObjectId(auth.sub)) return null;
  return String(auth.sub);
}

// ai-service 에 넘길 회원 현재 상태 — 포인트·뽑기·출석·내 글 집계(토큰·이메일은 넘기지 않는다)
async function loadUserContext(req) {
  const userId = memberId(req);
  const nickname = String(req.auth.nickname || '').trim();
  const [profile, posts] = await Promise.all([
    LuckProfile.findOne({ userId }).lean(),
    TierList.aggregate([
      { $match: { author: nickname } },
      { $group: { _id: null, count: { $sum: 1 }, likes: { $sum: '$likeCount' }, views: { $sum: '$viewCount' } } },
    ]),
  ]);
  const p = profile || {};
  const today = getKstDateString();
  const att = describeAttendance(p);
  const mine = posts[0] || { count: 0, likes: 0, views: 0 };
  return {
    nickname: nickname.slice(0, 60),
    points: Math.max(0, Number(p.points) || 0),
    total_draws: Math.max(0, Number(p.totalDraws) || 0),
    best_tier: Number.isInteger(p.bestTier) ? p.bestTier : null,
    today_draws: p.todayDate === today ? Math.max(0, Number(p.todayCount) || 0) : 0,
    daily_limit: MEMBER_DAILY_LIMIT,
    attendance: {
      checked_days: att.checkedDays,
      today_done: att.todayDone,
      next_day: att.nextDay,
      next_reward: ATTENDANCE_REWARDS[att.nextDay - 1] || 0,
    },
    post_count: mine.count || 0,
    post_likes: mine.likes || 0,
    post_views: mine.views || 0,
  };
}

// 커스텀 메이커 상태 — { "0_갑급": ["이름", ...] } 모양만 받고 나머지는 버린다
function cleanMaker(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [key, names] of Object.entries(raw).slice(0, MAX_MAKER_ZONES)) {
    if (!/^\d{1,2}_.{1,40}$/.test(key) || !Array.isArray(names)) continue;
    const list = names
      .filter((n) => typeof n === 'string' && n.trim())
      .slice(0, MAX_ZONE_NAMES)
      .map((n) => n.trim().slice(0, MAX_NAME_CHARS));
    if (list.length) out[key] = list;
  }
  return out;
}

// 포인트 차감(잔액이 모자라면 null) — 조건부 갱신이라 동시에 요청해도 0 밑으로 내려가지 않는다
async function chargePoints(userId, cost, detail) {
  if (cost <= 0) return { points: null };
  const updated = await LuckProfile.findOneAndUpdate(
    { userId, points: { $gte: cost } },
    { $inc: { points: -cost } },
    { new: true },
  );
  if (!updated) return null;
  await recordPointChange({ userId, source: 'agent_bot', delta: -cost, balanceAfter: updated.points, detail });
  return { points: updated.points };
}

async function refundPoints(userId, cost, detail) {
  if (cost <= 0) return null;
  try {
    const updated = await LuckProfile.findOneAndUpdate({ userId }, { $inc: { points: cost } }, { new: true });
    if (!updated) return null;
    await recordPointChange({ userId, source: 'agent_bot', delta: cost, balanceAfter: updated.points, detail: `${detail} (환불)` });
    return updated.points;
  } catch (err) {
    console.error('에이전트 봇 포인트 환불 실패:', err.message);
    return null;
  }
}

// GET /api/ai/agent/info — 화면이 요금표·작업 목록·내 포인트·AI 서버 상태를 한 번에 받는다(로그인 없이도 요금표는 보인다)
const getInfo = async (req, res) => {
  const base = {
    ok: true,
    costs: AGENT_COSTS,
    levelLabels: LEVEL_LABELS,
    offCost: AGENT_COSTS.light,
    limit: { count: RUN_LIMIT, minutes: RUN_WINDOW_MS / 60000 },
    maxMessage: MAX_MESSAGE,
    member: false,
    points: null,
  };
  const userId = memberId(req);
  if (userId && isDbConnected()) {
    try {
      const profile = await LuckProfile.findOne({ userId }).select('points').lean();
      base.member = true;
      base.points = Math.max(0, Number(profile && profile.points) || 0);
    } catch (err) {
      console.error('에이전트 봇 포인트 조회 실패:', err.message);
    }
  }
  try {
    const r = await fetch(`${AI_URL}/agent/info`, { headers: aiHeaders(), signal: AbortSignal.timeout(8000) });
    if (!r.ok) return res.json({ ...base, ai: 'down', tasks: [] });
    const data = await r.json();
    const tasks = (Array.isArray(data.tasks) ? data.tasks : []).map((t) => ({
      task: String(t.task || ''),
      label: String(t.label || ''),
      level: AGENT_COSTS[t.level] === undefined ? 'normal' : t.level,
      cost: AGENT_COSTS[t.level] === undefined ? AGENT_COSTS.normal : AGENT_COSTS[t.level],
      description: String(t.description || ''),
      example: String(t.example || ''),
    }));
    return res.json({ ...base, ai: data.ai === 'on' ? 'on' : 'off', model: data.model || null, tasks });
  } catch (err) {
    return res.json({ ...base, ai: 'down', tasks: [] });
  }
};

// POST /api/ai/agent/run — { message, history?, maker? } → NDJSON 이벤트 스트림
const runAgent = async (req, res) => {
  const userId = memberId(req);
  if (!userId) {
    return res.status(403).json({ error: '에이전트 봇은 회원 계정으로 로그인해야 쓸 수 있어요. (관리자 계정은 포인트가 없어 쓸 수 없어요.)', code: 'MEMBER_ONLY' });
  }
  if (!isDbConnected()) return res.status(503).json({ error: '데이터베이스에 연결되지 않았습니다.' });

  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  if (!message) return res.status(400).json({ error: '요청을 입력해 주세요.' });
  if (message.length > MAX_MESSAGE) return res.status(400).json({ error: `요청은 ${MAX_MESSAGE}자까지 쓸 수 있어요.` });

  const history = (Array.isArray(req.body?.history) ? req.body.history : [])
    .filter((t) => t && (t.role === 'user' || t.role === 'assistant') && typeof t.content === 'string' && t.content.trim())
    .slice(-MAX_HISTORY)
    .map((t) => ({ role: t.role, content: t.content.trim().slice(0, MAX_HISTORY_CHARS) }));
  const maker = cleanMaker(req.body?.maker);

  if (running.has(userId)) {
    return res.status(409).json({ error: '이전 작업이 아직 진행 중이에요. 끝난 뒤에 다시 요청해 주세요.', code: 'BUSY' });
  }
  const waitSec = takeRunSlot(userId);
  if (waitSec) {
    return res.status(429).json({ error: `요청이 너무 많아요. ${Math.ceil(waitSec / 60)}분 뒤에 다시 시도해 주세요.`, retryAfterSec: waitSec });
  }

  running.add(userId);
  const upstream = new AbortController();
  const timer = RUN_TIMEOUT_MS > 0 ? setTimeout(() => upstream.abort(), RUN_TIMEOUT_MS) : null;
  let clientGone = false;
  let charged = 0;          // 이번 작업에서 차감한 포인트(환불 기준)
  let chargeDetail = '';
  let finished = false;     // done 이벤트까지 정상으로 끝났는지
  let headersSent = false;
  let stop = false;         // 스트림을 우리가 먼저 끝냈는지(포인트 부족·오류 이벤트) — 그 뒤의 끊김은 오류로 다시 알리지 않는다
  // 브라우저가 연결을 끊으면(탭 닫기·중지) 위쪽 요청도 끊는다. 이미 차감한 포인트는 돌려주지 않는다(받을 만큼 받고 끊는 것 방지)
  res.on('close', () => {
    if (!res.writableEnded) {
      clientGone = true;
      upstream.abort();
    }
  });

  const send = (event) => {
    if (clientGone || res.writableEnded) return;
    if (!headersSent) {
      headersSent = true;
      res.status(200);
      res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
      // 중간(nginx · Cloudflare)에서 모았다가 한꺼번에 보내지 않게 — 글자가 나오는 대로 화면에 가야 한다
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders();
    }
    res.write(`${JSON.stringify(event)}\n`);
  };

  // 느린 서버(CPU)에서는 해설 첫 글자가 나오기까지 수십 초가 빌 수 있다. 그동안 아무것도 안 보내면 중간(nginx 60초 ·
  // Cloudflare 100초)에서 연결을 끊으므로, 15초마다 빈 신호(ping)를 보낸다. 화면은 이 신호를 무시한다.
  const heartbeat = setInterval(() => { if (headersSent) send({ type: 'ping' }); }, 15000);

  const fail = async (text, extra = {}) => {
    const points = charged ? await refundPoints(userId, charged, chargeDetail) : null;
    const refunded = charged;
    charged = 0;
    send({ type: 'error', message: text, ...(refunded ? { refunded, points } : {}), ...extra });
  };

  try {
    const user = await loadUserContext(req);
    if (user.points < AGENT_COSTS.light) {
      running.delete(userId);
      if (timer) clearTimeout(timer);
      return res.status(402).json({
        error: `포인트가 부족해요. 에이전트 봇은 최소 ${AGENT_COSTS.light}P가 필요해요(보유 ${user.points}P). 오늘의 행운 티어나 출석체크로 포인트를 모아 보세요.`,
        code: 'NO_POINTS',
        points: user.points,
      });
    }

    const r = await fetch(`${AI_URL}/agent/run`, {
      method: 'POST',
      headers: aiHeaders(),
      body: JSON.stringify({ message, history, user, maker }),
      signal: upstream.signal,
    });
    if (!r.ok || !r.body) {
      running.delete(userId);
      if (timer) clearTimeout(timer);
      if (r.status === 422 || r.status === 400) return res.status(400).json({ error: '요청 형식이 올바르지 않아요.' });
      return res.status(503).json({ error: '에이전트 봇이 잠시 쉬는 중이에요. 조금 뒤에 다시 시도해 주세요.', unavailable: true });
    }

    const decoder = new TextDecoder();
    let buffer = '';
    const handleLine = async (line) => {
      if (!line.trim()) return;
      let event;
      try { event = JSON.parse(line); } catch { return; }
      if (!event || typeof event.type !== 'string') return;

      if (event.type === 'plan') {
        const level = AGENT_COSTS[event.level] === undefined ? 'normal' : event.level;
        // AI 서버가 꺼져 있으면 AI 해설 없이 결과만 나가므로 가벼움 요금까지만 받는다
        const cost = event.ai === 'off' ? Math.min(AGENT_COSTS[level], AGENT_COSTS.light) : AGENT_COSTS[level];
        chargeDetail = `에이전트 봇 · ${String(event.label || event.task || '작업').slice(0, 40)}`;
        let points = user.points;
        if (cost > 0) {
          const result = await chargePoints(userId, cost, chargeDetail);
          if (!result) {
            stop = true;
            upstream.abort();
            send({
              type: 'error',
              code: 'NO_POINTS',
              message: `포인트가 부족해요. "${event.label}" 작업은 ${cost}P가 필요해요(보유 ${user.points}P).`,
              need: cost,
              points: user.points,
            });
            return;
          }
          charged = cost;
          points = result.points;
        }
        send({ ...event, level, levelLabel: LEVEL_LABELS[level], cost, points });
        return;
      }
      if (event.type === 'error') {
        stop = true;
        await fail(String(event.message || '작업을 끝내지 못했어요.'));
        return;
      }
      if (event.type === 'done') {
        finished = true;
        send(event);
        return;
      }
      send(event);
    };

    for await (const chunk of r.body) {
      if (stop) break;
      buffer += decoder.decode(chunk, { stream: true });
      let idx;
      while ((idx = buffer.indexOf('\n')) !== -1 && !stop) {
        const line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 1);
        await handleLine(line);
      }
    }
    if (!stop && buffer.trim()) await handleLine(buffer);
    if (!stop && !finished && !clientGone) {
      await fail('작업이 중간에 끊겼어요. 잠시 뒤에 다시 시도해 주세요.');
    }
  } catch (err) {
    if (!clientGone && !stop) {
      console.error('에이전트 봇 실행 실패:', err.name || err.message);
      if (!headersSent) {
        const points = charged ? await refundPoints(userId, charged, chargeDetail) : null;
        charged = 0;
        running.delete(userId);
        if (timer) clearTimeout(timer);
        return res.status(503).json({
          error: '에이전트 봇이 잠시 쉬는 중이에요. 조금 뒤에 다시 시도해 주세요.',
          unavailable: true,
          ...(points !== null ? { points } : {}),
        });
      }
      await fail(err.name === 'AbortError' ? '작업 시간이 너무 길어져 중단했어요.' : '작업을 끝내지 못했어요. 잠시 뒤에 다시 시도해 주세요.');
    }
  } finally {
    clearInterval(heartbeat);
    running.delete(userId);
    if (timer) clearTimeout(timer);
    if (headersSent && !res.writableEnded) res.end();
  }
  return undefined;
};

// ------------------------------------------------------------------
// ai-service 전용 조회 API — 에이전트 봇 도구가 게시판·공지를 읽는다.
// AI_SERVICE_KEY 가 있으면 X-AI-Key 가 같은 요청만, 없으면(로컬 개발) 이 서버 안에서 직접 온 요청만 받는다
// (nginx 를 거쳐 밖에서 온 요청은 X-Forwarded-For 가 붙으므로 걸러진다). 내용은 어차피 공개 글·공지뿐이다.
// ------------------------------------------------------------------
function internalOnly(req, res, next) {
  const key = process.env.AI_SERVICE_KEY;
  if (key) {
    if (req.get('X-AI-Key') === key) return next();
    return res.status(401).json({ error: '인증되지 않은 요청입니다.' });
  }
  const addr = req.socket.remoteAddress || '';
  const local = addr === '127.0.0.1' || addr === '::1' || addr === '::ffff:127.0.0.1';
  if (local && !req.headers['x-forwarded-for']) return next();
  return res.status(403).json({ error: '허용되지 않은 요청입니다.' });
}

function limitOf(raw, fallback, max) {
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? Math.min(max, n) : fallback;
}

// GET /api/ai/agent/data/posts?search=&sort=likes|recent&limit= — 공개 글만, 배치 데이터·썸네일 없이
const dataPosts = async (req, res) => {
  try {
    if (!isDbConnected()) return res.status(503).json({ error: '데이터베이스에 연결되지 않았습니다.' });
    const filter = { isPublic: true };
    const search = String(req.query.search || '').trim().slice(0, 60);
    if (search) {
      const re = new RegExp(escapeRegex(search), 'i');
      filter.$or = [{ title: re }, { author: re }, { description: re }];
    }
    const sort = req.query.sort === 'likes' ? { likeCount: -1, viewCount: -1, createdAt: -1 } : { createdAt: -1 };
    const [rows, total] = await Promise.all([
      TierList.find(filter).sort(sort).limit(limitOf(req.query.limit, 10, 30))
        .select('title author description likeCount viewCount createdAt').lean(),
      TierList.countDocuments({ isPublic: true }),
    ]);
    res.json({
      total,
      posts: rows.map((p) => ({
        id: String(p._id),
        title: p.title || '',
        author: p.author || '',
        description: String(p.description || '').slice(0, 200),
        likes: p.likeCount || 0,
        views: p.viewCount || 0,
        createdAt: p.createdAt,
      })),
    });
  } catch (err) {
    console.error('에이전트 봇 게시글 조회 실패:', err.message);
    res.status(500).json({ error: '게시글 조회 실패' });
  }
};

// 공지 본문(HTML 일 수 있음)에서 태그를 떼고 앞부분만
function excerptOf(notice) {
  const source = notice.summary || notice.content || '';
  return String(source).replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300);
}

// GET /api/ai/agent/data/notices?search=&limit= — 공지·새 소식(고정 먼저, 최신순)
const dataNotices = async (req, res) => {
  try {
    if (!isDbConnected()) return res.status(503).json({ error: '데이터베이스에 연결되지 않았습니다.' });
    const filter = {};
    const search = String(req.query.search || '').trim().slice(0, 60);
    if (search) {
      const re = new RegExp(escapeRegex(search), 'i');
      filter.$or = [{ title: re }, { content: re }, { summary: re }];
    }
    const rows = await Notice.find(filter).sort({ isPinned: -1, createdAt: -1 }).limit(limitOf(req.query.limit, 6, 30))
      .select('title content summary category isPinned createdAt').lean();
    res.json({
      notices: rows.map((n) => ({
        id: String(n._id),
        title: n.title || '',
        category: n.category === 'news' ? 'news' : 'notice',
        pinned: Boolean(n.isPinned),
        excerpt: excerptOf(n),
        createdAt: n.createdAt,
      })),
    });
  } catch (err) {
    console.error('에이전트 봇 공지 조회 실패:', err.message);
    res.status(500).json({ error: '공지 조회 실패' });
  }
};

module.exports = {
  getInfo,
  runAgent,
  internalOnly,
  dataPosts,
  dataNotices,
  AGENT_COSTS,
  RUN_LIMIT,
  RUN_WINDOW_MS,
};
