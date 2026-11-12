// ========================================================
// AgentBotContext — 휴버대 에이전트 봇의 상태(대화 · 진행 중인 작업)를 앱 전체에서 한 벌만 들고 있는다
// ========================================================
// 이 Provider 는 라우트(App) 바깥(main.jsx)에 있다. 그래서
//   - 모달을 닫아도, 다른 페이지로 이동해도, 스크롤을 내려도 작업(스트림)이 끊기지 않고 끝까지 간다.
//   - 화면 오른쪽 아래 원형 버튼(AgentBot.jsx)이 같은 상태를 보고 "작업 중 / 작업 완료"를 표시한다.
// 탭을 닫거나 새로고침하면 진행 중인 작업은 끊긴다(서버는 브라우저 연결이 끊기면 작업을 멈춘다).
//
// 빠르게 그리기: 해설 글자는 초당 수십 조각으로 온다. 조각마다 setState 를 하면 대화 전체가 그만큼 다시 그려져 버벅이므로,
// 받은 글자는 ref 에 모아 두었다가 화면 주사율(requestAnimationFrame)에 맞춰 한 번에 반영한다.
// 대화는 이 탭(sessionStorage)에만 남고 서버에는 저장되지 않는다. 로그아웃하면 지운다.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AGENT_MAX_MESSAGE, fetchAgentInfo, runAgent } from '../lib/agentApi';
import { isStaticPreview } from '../lib/api';
import { loadMakerState, makerStateToZones } from '../lib/makerState';
import { useAuth } from './AuthContext';

const AgentBotContext = createContext(null);

const STORE_KEY = 'hbtAgentBot';
const MAX_KEEP = 24;                 // 남겨 둘 최대 메시지 수(결과물이 들어 있어 너무 많이 두지 않는다)
const INFO_POLL_MS = 30 * 1000;      // 모달이 열려 있는 동안 AI 서버 상태·포인트를 다시 확인하는 주기

let seq = 0;
const newId = () => `${Date.now().toString(36)}-${(seq += 1)}`;

function loadMessages() {
  try {
    const list = JSON.parse(sessionStorage.getItem(STORE_KEY));
    if (!Array.isArray(list)) return [];
    return list
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      // 새로고침 전에 돌고 있던 작업은 이미 끊겼다 — "중단됨"으로 바꿔 둔다
      .map((m) => (m.status === 'running' ? { ...m, status: 'stopped', content: m.content || '새로고침으로 작업이 중단됐어요.' } : m));
  } catch {
    return [];
  }
}

export function AgentBotProvider({ children }) {
  const { isLoggedIn, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(loadMessages);
  const [running, setRunning] = useState(false);
  const [info, setInfo] = useState(null);          // GET /api/ai/agent/info 응답(요금표·작업 목록·AI 상태)
  const [points, setPoints] = useState(null);      // 내 포인트(작업할 때마다 서버가 알려 주는 값으로 갱신)
  const [unseen, setUnseen] = useState(false);     // 모달이 닫힌 사이에 작업이 끝났는지(원형 버튼에 표시)

  const abortRef = useRef(null);
  const openRef = useRef(open);
  const pendingRef = useRef({ id: null, text: '' });   // 아직 화면에 반영하지 않은 글자
  const frameRef = useRef(0);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  openRef.current = open;

  // 대화 보관 — 작업이 도는 동안은 글자마다 저장하지 않고, 상태가 바뀔 때(끝남·새 요청)만 저장한다
  useEffect(() => {
    if (running) return;
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify(messages.slice(-MAX_KEEP))); } catch { /* 저장만 실패 */ }
  }, [messages, running]);

  const patch = useCallback((id, fn) => {
    setMessages((cur) => cur.map((m) => (m.id === id ? fn(m) : m)));
  }, []);

  // 모아 둔 글자를 화면에 반영
  const flush = useCallback(() => {
    frameRef.current = 0;
    const { id, text } = pendingRef.current;
    if (!id || !text) return;
    pendingRef.current = { id, text: '' };
    patch(id, (m) => ({ ...m, content: m.content + text }));
  }, [patch]);

  const scheduleFlush = useCallback(() => {
    if (frameRef.current) return;
    // 탭이 가려져 있으면 requestAnimationFrame 이 멈추므로 타이머로 대신한다(백그라운드에서도 글이 쌓이게)
    frameRef.current = document.hidden ? window.setTimeout(flush, 120) : window.requestAnimationFrame(flush);
  }, [flush]);

  const refreshInfo = useCallback(async () => {
    if (isStaticPreview()) return;
    try {
      const res = await fetchAgentInfo();
      if (res.ok) {
        setInfo(res.data);
        if (typeof res.data.points === 'number') setPoints(res.data.points);
      } else {
        setInfo((cur) => ({ ...(cur || {}), ai: 'down', tasks: cur?.tasks || [] }));
      }
    } catch {
      setInfo((cur) => ({ ...(cur || {}), ai: 'down', tasks: cur?.tasks || [] }));
    }
  }, []);

  // 모달이 열려 있는 동안만 상태를 확인한다(닫혀 있을 때는 서버를 부르지 않는다)
  useEffect(() => {
    if (!open) return undefined;
    refreshInfo();
    const timer = setInterval(() => { if (!document.hidden) refreshInfo(); }, INFO_POLL_MS);
    return () => clearInterval(timer);
  }, [open, refreshInfo, isLoggedIn]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  // 로그아웃하면 진행 중인 작업을 끊고 대화를 지운다(다른 사람이 이어서 볼 수 없게)
  useEffect(() => {
    if (isLoggedIn) return;
    abortRef.current?.abort();
    setMessages([]);
    setPoints(null);
    setUnseen(false);
    try { sessionStorage.removeItem(STORE_KEY); } catch { /* 무시 */ }
  }, [isLoggedIn]);

  const send = useCallback(async (text) => {
    const message = String(text || '').trim().slice(0, AGENT_MAX_MESSAGE);
    if (!message || abortRef.current) return;

    const history = messagesRef.current
      .filter((m) => m.content && m.status !== 'error')
      .map(({ role, content }) => ({ role, content: content.slice(0, 1200) }));
    const botId = newId();
    setMessages((cur) => [
      ...cur.slice(-(MAX_KEEP - 2)),
      { id: newId(), role: 'user', content: message },
      { id: botId, role: 'assistant', content: '', status: 'running', plan: null, steps: [], result: null },
    ]);
    setRunning(true);
    setUnseen(false);
    pendingRef.current = { id: botId, text: '' };

    const controller = new AbortController();
    abortRef.current = controller;
    let ended = false;      // done/error 이벤트를 받았는지

    const finish = (changes) => {
      ended = true;
      // 남은 글자를 먼저 반영하고 마무리 상태를 덮는다
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
        window.clearTimeout(frameRef.current);
        frameRef.current = 0;
      }
      const rest = pendingRef.current.id === botId ? pendingRef.current.text : '';
      pendingRef.current = { id: null, text: '' };
      patch(botId, (m) => {
        const base = { ...m, content: m.content + rest };
        return { ...base, ...(typeof changes === 'function' ? changes(base) : changes) };
      });
    };

    const onEvent = (e) => {
      switch (e.type) {
        case 'plan':
          if (typeof e.points === 'number') setPoints(e.points);
          patch(botId, (m) => ({
            ...m,
            plan: { task: e.task, label: e.label, level: e.level, levelLabel: e.levelLabel, cost: e.cost || 0, via: e.via, ai: e.ai },
            steps: (e.steps || []).map((label) => ({ label, status: 'wait' })),
          }));
          break;
        case 'step':
          patch(botId, (m) => ({ ...m, steps: m.steps.map((s, i) => (i === e.index ? { ...s, status: e.status } : s)) }));
          break;
        case 'result':
          patch(botId, (m) => ({ ...m, result: { kind: e.kind, data: e.data } }));
          break;
        case 'token':
          pendingRef.current.text += e.text || '';
          scheduleFlush();
          break;
        case 'reset':
          pendingRef.current.text = '';
          patch(botId, (m) => ({ ...m, content: '' }));
          break;
        case 'done':
          // 서버가 준 최종 글로 맞춘다(스트림 조각과 같지만, 중간에 정해진 해설로 바뀐 경우를 위해)
          pendingRef.current.text = '';
          finish((m) => ({ status: 'done', mode: e.mode, content: e.answer || m.content, steps: m.steps.map((s) => ({ ...s, status: 'done' })) }));
          break;
        case 'error':
          if (typeof e.points === 'number') setPoints(e.points);
          pendingRef.current.text = '';
          finish({ status: 'error', content: e.message || '작업을 끝내지 못했어요.', refunded: e.refunded || 0, code: e.code });
          break;
        default:
          break;
      }
    };

    try {
      const maker = makerStateToZones(loadMakerState());
      const res = await runAgent(message, { history, maker, signal: controller.signal, onEvent });
      if (!res.ok) {
        if (typeof res.data?.points === 'number') setPoints(res.data.points);
        const fallback = res.status === 401 ? '로그인이 필요해요. 다시 로그인한 뒤 시도해 주세요.' : '요청을 보내지 못했어요.';
        finish({ status: 'error', content: res.data?.error || fallback, code: res.data?.code });
      } else if (!ended) {
        finish({ status: 'error', content: '작업이 중간에 끊겼어요. 잠시 뒤에 다시 시도해 주세요.' });
      }
    } catch (err) {
      if (!ended) {
        if (err?.name === 'AbortError') {
          finish((m) => ({ status: 'stopped', content: m.content || '작업을 중지했어요.', stoppedNote: Boolean(m.plan?.cost) }));
        } else {
          finish({ status: 'error', content: '서버와 연결할 수 없어요. 잠시 후 다시 시도해 주세요.' });
        }
      }
    } finally {
      abortRef.current = null;
      setRunning(false);
      if (!openRef.current) setUnseen(true);
    }
  }, [patch, scheduleFlush]);

  const clear = useCallback(() => {
    if (abortRef.current) return;
    setMessages([]);
  }, []);

  const openBot = useCallback(() => { setOpen(true); setUnseen(false); }, []);
  const closeBot = useCallback(() => setOpen(false), []);

  // 자주 바뀌는 값(messages)과 거의 안 바뀌는 값(동작 함수)을 한 객체로 주되, 함수는 전부 고정(useCallback)이다
  const value = useMemo(() => ({
    open, openBot, closeBot,
    messages, running, unseen,
    info, points, refreshInfo,
    send, stop, clear,
    isLoggedIn, isAdmin,
  }), [open, openBot, closeBot, messages, running, unseen, info, points, refreshInfo, send, stop, clear, isLoggedIn, isAdmin]);

  return <AgentBotContext.Provider value={value}>{children}</AgentBotContext.Provider>;
}

export function useAgentBot() {
  const ctx = useContext(AgentBotContext);
  if (!ctx) throw new Error('useAgentBot must be used within AgentBotProvider');
  return ctx;
}
