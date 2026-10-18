// ========================================================
// routes/aiRoutes.js — AI 도우미 프록시 (/api/ai)
// ========================================================
// 실제 답변은 저장소 루트의 ai-service/(FastAPI + LangChain + LangGraph + RAG)가 만든다.
// 브라우저는 AI 서비스를 직접 부르지 않고 항상 여기를 거친다:
//   - AI 서비스는 서버 안쪽(127.0.0.1:8000)에만 열어 두고, Cloudflare Pages 의 /api 프록시도 그대로 쓴다.
//   - 요청 수 제한(IP 기준)과 입력 길이 검사를 여기서 먼저 해 LLM 비용·남용을 막는다.
//   - AI_SERVICE_KEY 를 X-AI-Key 헤더로 붙여 보내, AI 서비스는 이 서버가 보낸 요청만 받는다.
// AI 서비스가 꺼져 있으면 503 으로 "잠시 쉬는 중" 안내만 하고, 사이트의 다른 기능에는 영향이 없다.
// 대화 내용은 저장하지 않는다(서버·DB 어디에도 남기지 않음).
const express = require('express');
const getClientIp = require('../utils/getClientIp');

const router = express.Router();

const AI_URL = (process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');
// AI 서비스를 기다리는 최대 시간. 로컬 LLM(Ollama)은 GPU 상황에 따라 한 답에 수십 초가 걸려 예전 45초 제한에 자주 걸렸다(503).
// 기본 3분, AI_TIMEOUT_MS=0 이면 제한을 두지 않는다(Node 의 연결 기본 제한 5분은 남는다). 단위 ms.
const TIMEOUT_MS = process.env.AI_TIMEOUT_MS === undefined || process.env.AI_TIMEOUT_MS === ''
  ? 180 * 1000
  : Math.max(0, Number(process.env.AI_TIMEOUT_MS) || 0);
const MAX_MESSAGE = 500;
const MAX_HISTORY = 12;
const MAX_HISTORY_CHARS = 2000;

// 질문 요청 수 제한 — IP 하나당 10분에 20번. 메모리에만 두며 서버 재시작 시 초기화(pm2 instances 1 이라 충분).
const CHAT_WINDOW_MS = 10 * 60 * 1000;
const CHAT_LIMIT = 20;
const chatHits = new Map(); // ip → [시각...]

function takeChatSlot(ip) {
  const now = Date.now();
  const recent = (chatHits.get(ip) || []).filter((t) => now - t < CHAT_WINDOW_MS);
  if (recent.length >= CHAT_LIMIT) {
    chatHits.set(ip, recent);
    return Math.ceil((CHAT_WINDOW_MS - (now - recent[0])) / 1000);
  }
  recent.push(now);
  chatHits.set(ip, recent);
  return 0;
}

// 오래된 IP 기록 정리(10분마다)
setInterval(() => {
  const now = Date.now();
  for (const [ip, list] of chatHits) {
    if (!list.some((t) => now - t < CHAT_WINDOW_MS)) chatHits.delete(ip);
  }
}, CHAT_WINDOW_MS).unref();

async function callAi(path, init = {}) {
  const headers = { 'Content-Type': 'application/json', ...(init.headers || {}) };
  if (process.env.AI_SERVICE_KEY) headers['X-AI-Key'] = process.env.AI_SERVICE_KEY;
  const res = await fetch(`${AI_URL}${path}`, {
    ...init,
    headers,
    ...(TIMEOUT_MS > 0 ? { signal: AbortSignal.timeout(TIMEOUT_MS) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

const UNAVAILABLE = { error: 'AI 도우미가 잠시 쉬는 중이에요. 조금 뒤에 다시 시도해 주세요.', unavailable: true };

// GET /api/ai/questions — 랜덤 추천 질문 3개
router.get('/questions', async (req, res) => {
  try {
    const { status, data } = await callAi('/questions?count=3');
    if (status !== 200) return res.status(503).json(UNAVAILABLE);
    res.json({ ok: true, questions: Array.isArray(data.questions) ? data.questions : [] });
  } catch (err) {
    console.error('AI 추천 질문 실패:', err.name || err.message);
    res.status(503).json(UNAVAILABLE);
  }
});

// POST /api/ai/chat — { message, history? }
router.post('/chat', async (req, res) => {
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  if (!message) return res.status(400).json({ error: '질문을 입력해 주세요.' });
  if (message.length > MAX_MESSAGE) return res.status(400).json({ error: `질문은 ${MAX_MESSAGE}자까지 쓸 수 있어요.` });

  // 이전 대화는 최근 것만, 형식이 맞는 것만 넘긴다
  const history = (Array.isArray(req.body?.history) ? req.body.history : [])
    .filter((t) => t && (t.role === 'user' || t.role === 'assistant') && typeof t.content === 'string' && t.content.trim())
    .slice(-MAX_HISTORY)
    .map((t) => ({ role: t.role, content: t.content.trim().slice(0, MAX_HISTORY_CHARS) }));

  const waitSec = takeChatSlot(getClientIp(req) || 'unknown');
  if (waitSec) {
    return res.status(429).json({ error: `질문이 너무 많아요. ${Math.ceil(waitSec / 60)}분 뒤에 다시 물어봐 주세요.`, retryAfterSec: waitSec });
  }

  try {
    const { status, data } = await callAi('/chat', { method: 'POST', body: JSON.stringify({ message, history }) });
    if (status !== 200) {
      if (status === 422) return res.status(400).json({ error: '질문 형식이 올바르지 않아요.' });
      return res.status(503).json(UNAVAILABLE);
    }
    res.json({
      ok: true,
      answer: String(data.answer || ''),
      mode: data.mode || 'fallback',
      sources: Array.isArray(data.sources) ? data.sources.slice(0, 6) : [],
    });
  } catch (err) {
    console.error('AI 답변 실패:', err.name || err.message);
    res.status(503).json(UNAVAILABLE);
  }
});

module.exports = router;
