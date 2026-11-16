/* ====================================================================
 * controllers/aiAgentController.js — 휴버대 에이전트 봇 (/api/ai/agent)
 * ------------------------------------------------------------------
 * 에이전트 봇의 "두뇌"는 ai-service(FastAPI · LangGraph, app/Agent-Bot)에 있고, 여기는 사이트 쪽 일을 맡는다:
 *   1) 로그인 회원인지 확인(회원 전용 — 관리자 계정은 지갑이 없어 쓸 수 없다)
 *   2) 요청 수 제한 · 회원 한 명당 동시에 한 작업만
 *   3) 회원의 현재 상태(포인트·출석·뽑기·내 글)를 읽어 ai-service 에 같이 넘긴다(로그인 토큰은 넘기지 않는다)
 *   4) ai-service 가 보내는 이벤트 스트림(NDJSON)을 브라우저로 그대로 흘려보내면서,
 *      "plan" 이벤트(어떤 작업인지 정해진 순간)에 엔진에 맞는 값을 받는다. 실패하면 돌려준다.
 *   5) ai-service 의 도구가 게시판·공지를 읽을 수 있게 가벼운 조회 API(/agent/data/*)를 연다(ai-service 전용).
 *
 * 엔진과 요금(2026-11-17~) — 값의 정본은 utils/aiTokens.js
 *   무료 엔진(ollama) : 서버의 Ollama 모델. 무료, 하루(KST) FREE_DAILY_LIMIT 번. 행운 뽑기 포인트는 더 이상 쓰지 않는다.
 *   Claude 엔진       : 모델(haiku·sonnet·opus·fable)과 effort 를 골라 쓰고 "휴버토큰"(AI 전용 포인트)이 든다.
 *                       한 번에 "모델 평균값 × effort 배수"를 정액으로 받는다(tokenCost).
 *   무료로 끝나는 것   : 이용 안내 · 거절 · 못 알아들은 말(횟수도 토큰도 들지 않는다).
 *   LLM 을 안 쓰는 작업(통합 검색)은 Claude 엔진을 골라도 토큰이 들지 않는다.
 * 작업이 끊기지 않게: AI 해설이 실패하면 ai-service 가 정해진 해설로 끝까지 답하고(mode fallback), Claude 엔진이었다면
 * 그때 받은 휴버토큰을 돌려준다. 오류·중간 끊김·시간 초과도 환불(무료 엔진은 횟수 되돌림)한다.
 * 대화 내용은 저장하지 않는다(원장에는 "어떤 작업 · 어떤 모델"만 남는다).
 * ==================================================================== */
const mongoose = require('mongoose');
const LuckProfile = require('../models/LuckProfile');
const TierList = require('../models/TierList');
const Notice = require('../models/Notice');
const { describeAttendance, ATTENDANCE_REWARDS } = require('../utils/attendance');
const { getKstDateString } = require('../utils/kstDate');
const { MEMBER_DAILY_LIMIT } = require('./luckDrawController');
const aiTokens = require('../utils/aiTokens');

const AI_URL = (process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');
// 에이전트 봇 작업 하나를 기다리는 최대 시간(ms). 스트림이라 글자는 계속 오지만, 전체가 이보다 길어지면 끊고 받은 값을 돌려준다.
const RUN_TIMEOUT_MS = process.env.AI_AGENT_TIMEOUT_MS === undefined || process.env.AI_AGENT_TIMEOUT_MS === ''
  ? 300 * 1000
  : Math.max(0, Number(process.env.AI_AGENT_TIMEOUT_MS) || 0);

// 작업 강도 — 이제 요금이 아니라 "얼마나 큰 일인지" 표시용이다(무료 작업 여부만 요금에 쓰인다)
const LEVEL_LABELS = { free: '무료', light: '가벼움', normal: '보통', heavy: '무거움' };
const ENGINES = ['ollama', 'claude'];

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

// 휴버토큰 차감·환불과 무료 엔진 하루 횟수는 utils/aiTokens.js 가 맡는다(조건부 갱신이라 동시에 요청해도 0 밑으로 내려가지 않는다)
// 요청의 엔진 선택을 검사해 정리한다 — { provider, model, effort, cost } (무료 엔진은 model·effort 없음, cost 0)
function readEngine(raw) {
  const provider = raw && ENGINES.includes(raw.provider) ? raw.provider : 'ollama';
  if (provider !== 'claude') return { provider: 'ollama', model: null, effort: null, cost: 0 };
  const model = aiTokens.findModel(raw.model) || aiTokens.findModel(aiTokens.DEFAULT_CLAUDE_MODEL);
  const effort = model.effort ? (aiTokens.findEffort(raw.effort) || aiTokens.findEffort(aiTokens.DEFAULT_EFFORT)) : null;
  return {
    provider: 'claude',
    model: model.id,
    modelLabel: model.label,
    effort: effort ? effort.id : null,
    effortLabel: effort ? effort.label : null,
    cost: aiTokens.tokenCost(model.id, effort ? effort.id : null),
  };
}

// 화면에 내려 줄 요금표(모델별 effort 값까지 미리 계산해서 준다 — 화면이 계산식을 따로 갖지 않게)
function pricing() {
  return {
    defaultTokens: aiTokens.DEFAULT_TOKENS,
    freeDailyLimit: aiTokens.FREE_DAILY_LIMIT,
    defaultModel: aiTokens.DEFAULT_CLAUDE_MODEL,
    defaultEffort: aiTokens.DEFAULT_EFFORT,
    efforts: aiTokens.EFFORTS.map((e) => ({ id: e.id, label: e.label, mult: e.mult })),
    models: aiTokens.CLAUDE_MODELS.map((m) => ({
      id: m.id,
      family: m.family,
      version: m.version,
      label: m.label,
      note: m.note,
      base: m.base,
      effort: m.effort,
      costs: Object.fromEntries(aiTokens.EFFORTS.map((e) => [e.id, aiTokens.tokenCost(m.id, e.id)])),
    })),
    packs: aiTokens.TOKEN_PACKS,
  };
}

// GET /api/ai/agent/info — 화면이 엔진·요금표·작업 목록·내 휴버토큰·오늘 무료 횟수·AI 서버 상태를 한 번에 받는다(로그인 없이도 요금표는 보인다)
const getInfo = async (req, res) => {
  const base = {
    ok: true,
    levelLabels: LEVEL_LABELS,
    limit: { count: RUN_LIMIT, minutes: RUN_WINDOW_MS / 60000 },
    maxMessage: MAX_MESSAGE,
    pricing: pricing(),
    member: false,
    tokens: null,
    free: { limit: aiTokens.FREE_DAILY_LIMIT, used: 0, left: aiTokens.FREE_DAILY_LIMIT },
    claude: false,
  };
  const userId = memberId(req);
  if (userId && isDbConnected()) {
    try {
      const wallet = await aiTokens.getWallet(userId);
      const used = aiTokens.freeUsedToday(wallet);
      base.member = true;
      base.tokens = wallet.tokens;
      base.free = { limit: aiTokens.FREE_DAILY_LIMIT, used, left: Math.max(0, aiTokens.FREE_DAILY_LIMIT - used) };
    } catch (err) {
      console.error('에이전트 봇 지갑 조회 실패:', err.message);
    }
  }
  try {
    const r = await fetch(`${AI_URL}/agent/info`, { headers: aiHeaders(), signal: AbortSignal.timeout(8000) });
    if (!r.ok) return res.json({ ...base, ai: 'down', tasks: [] });
    const data = await r.json();
    const tasks = (Array.isArray(data.tasks) ? data.tasks : []).map((t) => ({
      task: String(t.task || ''),
      label: String(t.label || ''),
      level: LEVEL_LABELS[t.level] === undefined ? 'normal' : t.level,
      usesLlm: t.uses_llm !== false,
      description: String(t.description || ''),
      example: String(t.example || ''),
    }));
    return res.json({
      ...base,
      ai: data.ai === 'on' ? 'on' : 'off',          // 무료 엔진(Ollama)의 AI 서버 상태
      model: data.model || null,
      claude: data.claude === true,                  // ai-service 에 Claude API 키가 있어 Claude 엔진을 쓸 수 있는지
      tasks,
    });
  } catch (err) {
    return res.json({ ...base, ai: 'down', tasks: [] });
  }
};

// POST /api/ai/agent/run — { message, history?, maker?, engine?: { provider, model, effort } } → NDJSON 이벤트 스트림
const runAgent = async (req, res) => {
  const userId = memberId(req);
  if (!userId) {
    return res.status(403).json({ error: '에이전트 봇은 회원 계정으로 로그인해야 쓸 수 있어요. (관리자 계정은 쓸 수 없어요.)', code: 'MEMBER_ONLY' });
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
  const engine = readEngine(req.body?.engine);

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
  // 이번 작업에서 받은 값(환불 기준) — { kind: 'token', amount } | { kind: 'free' } | null
  let taken = null;
  let chargeDetail = '';
  let finished = false;     // done 이벤트까지 정상으로 끝났는지
  let headersSent = false;
  let stop = false;         // 스트림을 우리가 먼저 끝냈는지(잔액 부족·오류 이벤트) — 그 뒤의 끊김은 오류로 다시 알리지 않는다
  // 브라우저가 연결을 끊으면(탭 닫기·중지) 위쪽 요청도 끊는다. 이미 받은 값은 돌려주지 않는다(받을 만큼 받고 끊는 것 방지)
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

  // 받은 값을 돌려준다 — 휴버토큰은 환불, 무료 엔진은 오늘 횟수를 되돌린다. 화면에 알릴 값을 돌려준다.
  const giveBack = async () => {
    if (!taken) return {};
    const was = taken;
    taken = null;
    if (was.kind === 'token') {
      let tokens = null;
      try {
        tokens = await aiTokens.addTokens(userId, was.amount, 'refund', `${chargeDetail} (환불)`);
      } catch (err) {
        console.error('휴버토큰 환불 실패:', err.message);
      }
      return { refunded: was.amount, unit: 'token', ...(tokens !== null ? { tokens } : {}) };
    }
    const freeLeft = await aiTokens.returnFreeRun(userId);
    return { refunded: 1, unit: 'free', ...(freeLeft !== null ? { freeLeft } : {}) };
  };

  const fail = async (text, extra = {}) => {
    const back = await giveBack();
    send({ type: 'error', message: text, ...back, ...extra });
  };

  const cleanup = () => {
    clearInterval(heartbeat);
    running.delete(userId);
    if (timer) clearTimeout(timer);
  };

  try {
    const [user, wallet] = await Promise.all([loadUserContext(req), aiTokens.getWallet(userId)]);
    // 시작하기 전에 미리 걸러 준다(작업이 정해진 뒤에 한 번 더 조건부로 확인한다)
    if (engine.provider === 'claude' && wallet.tokens < engine.cost) {
      cleanup();
      return res.status(402).json({
        error: `휴버토큰이 부족해요. ${engine.modelLabel}${engine.effortLabel ? ` · ${engine.effortLabel}` : ''} 는 한 번에 ${engine.cost}토큰이 필요해요(보유 ${wallet.tokens}토큰). 무료 엔진을 쓰거나 휴버토큰을 충전해 주세요.`,
        code: 'NO_TOKENS',
        tokens: wallet.tokens,
        need: engine.cost,
      });
    }
    if (engine.provider === 'ollama' && aiTokens.freeUsedToday(wallet) >= aiTokens.FREE_DAILY_LIMIT) {
      cleanup();
      return res.status(429).json({
        error: `오늘 무료 엔진 횟수(${aiTokens.FREE_DAILY_LIMIT}번)를 모두 썼어요. 내일 다시 쓰거나, 휴버토큰으로 Claude 모델을 써 보세요.`,
        code: 'FREE_LIMIT',
        freeLeft: 0,
      });
    }

    const r = await fetch(`${AI_URL}/agent/run`, {
      method: 'POST',
      headers: aiHeaders(),
      body: JSON.stringify({
        message,
        history,
        user,
        maker,
        engine: { provider: engine.provider, model: engine.model, effort: engine.effort },
      }),
      signal: upstream.signal,
    });
    if (!r.ok || !r.body) {
      cleanup();
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
        const level = LEVEL_LABELS[event.level] === undefined ? 'normal' : event.level;
        const label = String(event.label || event.task || '작업').slice(0, 40);
        const usesLlm = event.uses_llm !== false;
        const bill = { engine: engine.provider, model: engine.model, modelLabel: engine.modelLabel || null, effort: engine.effort, effortLabel: engine.effortLabel || null, cost: 0, unit: 'none' };
        if (level !== 'free') {
          if (engine.provider === 'claude' && usesLlm) {
            // Claude 엔진 — 휴버토큰 정액 차감
            chargeDetail = `에이전트 봇 · ${label} · ${engine.modelLabel}${engine.effortLabel ? ` · ${engine.effortLabel}` : ''}`;
            const result = await aiTokens.chargeTokens(userId, engine.cost, chargeDetail);
            if (!result) {
              stop = true;
              upstream.abort();
              send({ type: 'error', code: 'NO_TOKENS', message: `휴버토큰이 부족해요. 이 작업은 ${engine.cost}토큰이 필요해요.`, need: engine.cost });
              return;
            }
            taken = { kind: 'token', amount: engine.cost };
            Object.assign(bill, { cost: engine.cost, unit: 'token', tokens: result.tokens });
          } else {
            // 무료 엔진, 또는 LLM 을 쓰지 않는 작업(통합 검색) — 오늘 무료 횟수 1회
            const result = await aiTokens.takeFreeRun(userId);
            if (!result) {
              stop = true;
              upstream.abort();
              send({ type: 'error', code: 'FREE_LIMIT', message: `오늘 무료 횟수(${aiTokens.FREE_DAILY_LIMIT}번)를 모두 썼어요. 내일 다시 쓰거나, 휴버토큰으로 Claude 모델을 써 보세요.`, freeLeft: 0 });
              return;
            }
            taken = { kind: 'free' };
            Object.assign(bill, { engine: usesLlm ? engine.provider : 'tool', unit: 'free', freeLeft: result.left, freeLimit: aiTokens.FREE_DAILY_LIMIT });
          }
        }
        send({ ...event, level, levelLabel: LEVEL_LABELS[level], ...bill });
        return;
      }
      if (event.type === 'error') {
        stop = true;
        await fail(String(event.message || '작업을 끝내지 못했어요.'));
        return;
      }
      if (event.type === 'done') {
        finished = true;
        // Claude 엔진인데 해설을 Claude 가 쓰지 못했다면(키 없음·API 오류 등) 받은 휴버토큰을 돌려준다.
        // 작업 자체는 끊기지 않는다 — ai-service 가 무료 엔진이나 정해진 해설로 끝까지 답한다(engine_used 로 알려 준다).
        if (taken && taken.kind === 'token' && event.engine_used !== 'claude') {
          const back = await giveBack();
          send({ ...event, ...back, refundReason: 'Claude 모델을 쓰지 못해 휴버토큰을 돌려드렸어요.' });
        } else {
          send(event);
        }
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
        const back = await giveBack();
        cleanup();
        return res.status(503).json({
          error: '에이전트 봇이 잠시 쉬는 중이에요. 조금 뒤에 다시 시도해 주세요.',
          unavailable: true,
          ...back,
        });
      }
      await fail(err.name === 'AbortError' ? '작업 시간이 너무 길어져 중단했어요.' : '작업을 끝내지 못했어요. 잠시 뒤에 다시 시도해 주세요.');
    }
  } finally {
    cleanup();
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
  RUN_LIMIT,
  RUN_WINDOW_MS,
};
