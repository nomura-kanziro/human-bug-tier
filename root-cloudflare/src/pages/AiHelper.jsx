// AI 도우미 (/ai) — 사이트 지식(RAG)으로 답하는 챗봇 "휴버봇" + 랜덤 추천 질문 3개.
//  - 답은 저장소 루트 ai-service/(FastAPI + LangChain + LangGraph)가 만든다. 화면은 /api/ai/* 만 부른다.
//  - 대화는 이 탭(sessionStorage)에만 남고 서버에는 저장되지 않는다. "대화 지우기"로 비운다.
//  - 추천 질문을 누르면 바로 물어본다. "다른 질문"은 새 3개를 받아 온다.
//  - AI 서버(Ollama) ON/OFF 를 위에 알린다. OFF 면 "AI 서버 OFF 상태 (사이트의 정보내용을 끌어다 대답합니다.)" — 이때 답은
//    ai-service/knowledge 의 지식 문서에서 그대로 뽑은 것이다. ai-service 자체가 꺼진 'down' 이면 답을 못 한다.
import { useEffect, useRef, useState } from 'react';
import { AI_MAX_MESSAGE, askAi, fetchAiQuestions, fetchAiStatus } from '../lib/aiApi';
import { isStaticPreview } from '../lib/api';
import { LOGO_URL } from '../lib/paths';
import '../styles/ai-helper.css';

const STORE_KEY = 'hbtAiChat';
const MAX_KEEP = 40; // 화면에 남겨 둘 최대 메시지 수
const STATUS_POLL_MS = 20 * 1000; // AI 서버 ON/OFF 를 다시 확인하는 주기

// 상단 알림 문구 — OFF 문구는 창시자 지정 그대로
const STATUS_VIEW = {
  on: { cls: 'is-on', text: 'AI 서버 ON' },
  off: { cls: 'is-off', text: 'AI 서버 OFF 상태 (사이트의 정보내용을 끌어다 대답합니다.)' },
  down: { cls: 'is-down', text: 'AI 서비스에 연결할 수 없어요. 잠시 뒤에 다시 시도해 주세요.' },
};

function loadChat() {
  try {
    const v = JSON.parse(sessionStorage.getItem(STORE_KEY));
    return Array.isArray(v) ? v.filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string') : [];
  } catch {
    return [];
  }
}

export default function AiHelper() {
  const [messages, setMessages] = useState(loadChat);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [qBusy, setQBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [aiState, setAiState] = useState(null);   // 'on' | 'off' | 'down' | null(확인 전)
  const listRef = useRef(null);

  useEffect(() => { document.title = 'AI 도우미 | 휴버대 티어표'; }, []);

  useEffect(() => {
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify(messages.slice(-MAX_KEEP))); } catch { /* 저장만 실패 */ }
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy]);

  const loadQuestions = async () => {
    if (isStaticPreview()) return;
    setQBusy(true);
    try {
      const res = await fetchAiQuestions();
      if (res.ok && Array.isArray(res.data.questions)) setQuestions(res.data.questions);
      else setNotice(res.data?.error || 'AI 도우미에 연결하지 못했어요.');
    } catch {
      setNotice('AI 도우미에 연결하지 못했어요.');
    } finally {
      setQBusy(false);
    }
  };

  useEffect(() => { loadQuestions(); }, []);

  // AI 서버 ON/OFF — 들어올 때 한 번, 그 뒤 주기적으로(탭이 보일 때만)
  useEffect(() => {
    if (isStaticPreview()) return undefined;
    let alive = true;
    const check = async () => {
      if (document.hidden) return;
      try {
        const res = await fetchAiStatus();
        if (alive) setAiState(res.ok && ['on', 'off', 'down'].includes(res.data.ai) ? res.data.ai : 'down');
      } catch {
        if (alive) setAiState('down');
      }
    };
    check();
    const timer = setInterval(check, STATUS_POLL_MS);
    return () => { alive = false; clearInterval(timer); };
  }, []);

  const send = async (text) => {
    const message = String(text || '').trim();
    if (!message || busy) return;
    if (message.length > AI_MAX_MESSAGE) {
      setNotice(`질문은 ${AI_MAX_MESSAGE}자까지 쓸 수 있어요.`);
      return;
    }
    setNotice('');
    const history = messages.map(({ role, content }) => ({ role, content }));
    setMessages((cur) => [...cur, { role: 'user', content: message }]);
    setInput('');
    setBusy(true);
    try {
      const res = await askAi(message, history);
      if (res.ok) {
        setMessages((cur) => [...cur, { role: 'assistant', content: res.data.answer, mode: res.data.mode, sources: res.data.sources || [] }]);
        if (res.data.ai === 'on' || res.data.ai === 'off') setAiState(res.data.ai);   // 답이 온 순간의 상태로 바로 갱신
      } else {
        if (res.status === 503) setAiState('down');
        setMessages((cur) => [...cur, { role: 'assistant', content: res.data?.error || '답을 가져오지 못했어요.', error: true }]);
      }
    } catch {
      setMessages((cur) => [...cur, { role: 'assistant', content: '서버와 연결할 수 없어요. 잠시 후 다시 시도해 주세요.', error: true }]);
    } finally {
      setBusy(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send(input);
    }
  };

  // 오류 답은 다음 질문의 대화 맥락으로 넘기지 않는다
  const clearChat = () => setMessages([]);

  return (
    <main className="ai-page">
      {/* <header> 는 사이트 헤더 전역 스타일(Header_Footer.css)이 걸리므로 div 로 둔다 */}
      <div className="ai-head">
        <img src={LOGO_URL} alt="" className="ai-head-logo" width="44" height="44" />
        <div>
          <span className="ai-kicker">AI 도우미</span>
          <h1>휴버봇에게 물어보세요</h1>
          <p>티어표, 캐릭터 티어, 티어표 만들기, 행운 뽑기, 이벤트, 출석체크까지 — 사이트 정보로만 답해요.</p>
        </div>
      </div>

      {aiState && (
        <div className={`ai-status ${STATUS_VIEW[aiState].cls}`} role="status" aria-live="polite">
          <span className="ai-status-dot" aria-hidden="true" />
          {STATUS_VIEW[aiState].text}
        </div>
      )}

      <section className="ai-suggest" aria-label="추천 질문">
        <div className="ai-suggest-head">
          <strong>💡 이런 걸 물어볼 수 있어요</strong>
          <button type="button" className="ai-suggest-refresh" onClick={loadQuestions} disabled={qBusy || busy}>
            🔄 다른 질문
          </button>
        </div>
        <div className="ai-suggest-list">
          {questions.length === 0 && <span className="ai-suggest-empty">{qBusy ? '질문을 고르는 중…' : '추천 질문을 불러오지 못했어요.'}</span>}
          {questions.map((q) => (
            <button type="button" key={q} className="ai-chip" onClick={() => send(q)} disabled={busy}>{q}</button>
          ))}
        </div>
      </section>

      <section className="ai-chat" aria-label="대화">
        <div className="ai-messages" ref={listRef} aria-live="polite">
          {messages.length === 0 && (
            <div className="ai-msg is-bot">
              <img src={LOGO_URL} alt="" className="ai-avatar" width="30" height="30" />
              <div className="ai-bubble">안녕하세요! 휴버봇이에요. 위의 추천 질문을 누르거나 아래에 궁금한 걸 적어 주세요.</div>
            </div>
          )}
          {messages.map((m, i) => (
            <div className={`ai-msg ${m.role === 'user' ? 'is-user' : 'is-bot'}${m.error ? ' is-error' : ''}`} key={i}>
              {m.role === 'assistant' && <img src={LOGO_URL} alt="" className="ai-avatar" width="30" height="30" />}
              <div className="ai-bubble">
                <div className="ai-text">{m.content}</div>
                {m.mode === 'fallback' && <span className="ai-badge">AI 서버 OFF — 사이트 지식 문서에서 그대로 가져온 답이에요</span>}
                {m.sources?.length > 0 && (
                  <div className="ai-sources">참고: {m.sources.join(' · ')}</div>
                )}
              </div>
            </div>
          ))}
          {busy && (
            <div className="ai-msg is-bot">
              <img src={LOGO_URL} alt="" className="ai-avatar" width="30" height="30" />
              <div className="ai-bubble ai-typing" aria-label="답을 쓰는 중"><span /><span /><span /></div>
            </div>
          )}
        </div>

        <form className="ai-form" onSubmit={(e) => { e.preventDefault(); send(input); }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            maxLength={AI_MAX_MESSAGE}
            rows={2}
            placeholder="예) 츠루기 시노부는 몇 티어야?  (Enter 보내기 · Shift+Enter 줄바꿈)"
            aria-label="질문 입력"
            disabled={busy}
          />
          <div className="ai-form-row">
            <span className="ai-count">{input.length}/{AI_MAX_MESSAGE}</span>
            {messages.length > 0 && <button type="button" className="ai-clear" onClick={clearChat} disabled={busy}>대화 지우기</button>}
            <button type="submit" className="ai-send" disabled={busy || !input.trim()}>보내기</button>
          </div>
        </form>
        {notice && <p className="ai-notice" role="status">{notice}</p>}
        <p className="ai-privacy">대화는 서버에 저장되지 않아요. 비밀번호·메일 주소 같은 개인정보는 적지 마세요. AI 답이 틀릴 수 있으니 중요한 건 공지사항이나 문의하기로 확인해 주세요.</p>
      </section>
    </main>
  );
}
