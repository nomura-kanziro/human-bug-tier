// 휴버대 에이전트 봇 — 화면 오른쪽 아래 원형 버튼 + 누르면 뜨는 대형 모달.
//  - 가이드 챗봇(/ai 휴버봇)은 "설명"을 하고, 에이전트 봇은 "일"을 한다: 티어표 초안 만들기 · 내 티어표 분석 ·
//    게시판/공지 요약 · 내 활동 브리핑 · 통합 검색. 회원 전용이고 작업 강도만큼 포인트를 쓴다(요금표는 모달 왼쪽에 항상 보인다).
//  - 상태는 AgentBotContext(라우트 바깥)에 있어서, 모달을 닫거나 다른 페이지로 가도 작업이 끝까지 진행된다.
//    그동안 원형 버튼에 "작업 중"이 돌고, 끝나면 "작업 완료"가 뜬다.
//  - 결과물(티어표 초안·검색 결과 등)이 먼저 나오고 해설 글이 타자 치듯 이어진다.
//  - 로그인·관리자 화면처럼 헤더가 없는 단독 페이지에서는 버튼을 띄우지 않는다.
import { memo, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAgentBot } from '../context/AgentBotContext';
import { AGENT_MAX_MESSAGE } from '../lib/agentApi';
import { isStaticPreview } from '../lib/api';
import { useGuide } from '../lib/guide';
import {
  hasPlacedCharacters, loadMakerState, MAKER_REPLACED_EVENT, saveMakerState, zonesToMakerState,
} from '../lib/makerState';
import { LOGO_URL } from '../lib/paths';
import '../styles/agent-bot.css';

// 버튼을 띄우지 않는 화면(공용 헤더가 없는 단독 페이지 · 관리자)
const HIDDEN_PATHS = /^\/(login|signup|find-account|reset-password|admin)(\/|$)/;

const AI_VIEW = {
  on: { cls: 'is-on', text: 'AI 서버 ON' },
  off: { cls: 'is-off', text: 'AI 서버 OFF — 해설 없이 결과만' },
  down: { cls: 'is-down', text: '연결할 수 없음' },
};
const LEVEL_CLASS = { free: 'is-free', light: 'is-light', normal: 'is-normal', heavy: 'is-heavy' };

// 요금표를 아직 못 받았을 때 보여 줄 기본 예시(서버 값이 오면 그걸 쓴다)
const FALLBACK_EXAMPLES = [
  '1~3티어 캐릭터로 티어표 만들어줘',
  '요즘 인기 있는 티어표 정리해줘',
  '내 포인트랑 출석 현황 브리핑해줘',
];

function BotIcon({ size = 30 }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true" focusable="false">
      <path d="M16 3.2v3.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="16" cy="2.8" r="1.7" fill="currentColor" />
      <rect x="5" y="7" width="22" height="17" rx="6" fill="currentColor" />
      <circle cx="11.6" cy="15" r="2.4" fill="var(--agent-icon-eye, #fff)" />
      <circle cx="20.4" cy="15" r="2.4" fill="var(--agent-icon-eye, #fff)" />
      <path d="M12.2 19.6h7.6" stroke="var(--agent-icon-eye, #fff)" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M2.6 13.5v5M29.4 13.5v5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M11 24v2.6a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V24" fill="currentColor" opacity="0.75" />
    </svg>
  );
}

// ---------------------------------------------------------------- 결과물 카드
function TierListResult({ data, onApply }) {
  return (
    <div className="agent-card">
      <div className="agent-card-head">
        <strong>📋 {data.title}</strong>
        <span className="agent-card-meta">총 {data.total}명 · {data.tier_count}개 티어</span>
      </div>
      {data.changes?.length > 0 && (
        <ul className="agent-changes">
          {data.changes.map((c) => <li key={c}>{c}</li>)}
        </ul>
      )}
      <div className="agent-tier-rows">
        {(data.table || []).map((t) => (
          <details className="agent-tier-row" key={t.tier}>
            <summary>
              <span className="agent-tier-badge">{t.tier}티어</span>
              <span className="agent-tier-title">{t.title}</span>
              <span className="agent-tier-count">{t.count}명</span>
            </summary>
            {t.rows.map((r) => (
              <p className="agent-tier-grade" key={r.grade}>
                <b>{r.grade}</b> {r.names.join(', ')}
              </p>
            ))}
          </details>
        ))}
      </div>
      {data.total > 0 ? (
        <div className="agent-card-actions">
          <button type="button" className="agent-btn-primary" onClick={() => onApply(data)}>커스텀 메이커에서 열기 →</button>
          <span className="agent-card-hint">열면 이 배치가 그대로 올라가요. 거기서 고치고 PNG 저장·게시판 업로드까지 할 수 있어요.</span>
        </div>
      ) : (
        <p className="agent-card-hint">조건에 맞는 캐릭터가 없어요. 범위나 이름을 바꿔 다시 요청해 보세요.</p>
      )}
    </div>
  );
}

function ReviewResult({ data }) {
  const shift = (p) => `${p.name} (공식 ${p.from}티어 → ${p.to}티어)`;
  return (
    <div className="agent-card">
      <div className="agent-card-head">
        <strong>🔍 공식 티어표와 비교</strong>
        <span className="agent-card-meta">배치 {data.total}명 · 미배치 {data.unplaced}명</span>
      </div>
      <div className="agent-stats">
        <div><b>{data.match_rate}%</b><span>공식과 같은 티어</span></div>
        <div><b>{data.raised_count}명</b><span>공식보다 높게</span></div>
        <div><b>{data.lowered_count}명</b><span>공식보다 낮게</span></div>
      </div>
      {data.raised?.length > 0 && <p className="agent-line"><b>많이 올린 캐릭터</b> {data.raised.map(shift).join(' · ')}</p>}
      {data.lowered?.length > 0 && <p className="agent-line"><b>많이 내린 캐릭터</b> {data.lowered.map(shift).join(' · ')}</p>}
      {data.by_tier?.length > 0 && (
        <p className="agent-line"><b>티어별 인원</b> {data.by_tier.map((b) => `${b.tier}티어 ${b.count}명`).join(' · ')}</p>
      )}
    </div>
  );
}

function PostList({ title, posts, onGo }) {
  if (!posts?.length) return null;
  return (
    <div className="agent-list">
      <h4>{title}</h4>
      {posts.map((p) => (
        <Link className="agent-list-item" to={p.link} key={`${title}-${p.id}`} onClick={onGo}>
          <span className="agent-list-title">{p.title}</span>
          <span className="agent-list-meta">{p.author} · 추천 {p.likes} · 조회 {p.views}{p.date ? ` · ${p.date}` : ''}</span>
        </Link>
      ))}
    </div>
  );
}

function NoticeList({ notices, onGo }) {
  if (!notices?.length) return null;
  return (
    <div className="agent-list">
      <h4>공지 · 새 소식</h4>
      {notices.map((n) => (
        <Link className="agent-list-item" to={n.link} key={n.id} onClick={onGo}>
          <span className="agent-list-title">{n.pinned ? '📌 ' : ''}{n.title}</span>
          <span className="agent-list-meta">{n.category}{n.date ? ` · ${n.date}` : ''}</span>
        </Link>
      ))}
    </div>
  );
}

function DigestResult({ data, onGo }) {
  return (
    <div className="agent-card">
      <div className="agent-card-head">
        <strong>📰 게시판 · 공지 모아 보기</strong>
        {data.post_total > 0 && <span className="agent-card-meta">공개 티어표 {data.post_total}개</span>}
      </div>
      <PostList title="추천 많은 티어표" posts={data.popular} onGo={onGo} />
      <PostList title="최근 올라온 티어표" posts={data.recent} onGo={onGo} />
      <NoticeList notices={data.notices} onGo={onGo} />
    </div>
  );
}

function BriefingResult({ data, onGo }) {
  return (
    <div className="agent-card">
      <div className="agent-card-head"><strong>🧾 {data.nickname ? `${data.nickname}님의 현황` : '내 현황'}</strong></div>
      <div className="agent-brief">
        {data.cards.map((c) => (
          <Link className="agent-brief-card" to={c.link} key={c.label} onClick={onGo}>
            <span>{c.label}</span>
            <b>{c.value}</b>
            {c.hint && <em>{c.hint}</em>}
          </Link>
        ))}
      </div>
      {data.todo?.length > 0 && (
        <ul className="agent-changes">
          {data.todo.map((t) => <li key={t}>{t}</li>)}
        </ul>
      )}
    </div>
  );
}

function SearchResult({ data, onGo }) {
  return (
    <div className="agent-card">
      <div className="agent-card-head">
        <strong>🔎 검색 결과</strong>
        <span className="agent-card-meta">총 {data.total}건</span>
      </div>
      {data.characters?.length > 0 && (
        <div className="agent-list">
          <h4>캐릭터 {data.character_total}명{data.character_total > data.characters.length ? ` (앞 ${data.characters.length}명)` : ''}</h4>
          <div className="agent-chips">
            {data.characters.map((c) => (
              <Link className="agent-char" to={c.link} key={c.name} onClick={onGo}>
                {c.name}<small>{c.tier}티어 {c.grade}</small>
              </Link>
            ))}
          </div>
        </div>
      )}
      <PostList title="게시판" posts={data.posts} onGo={onGo} />
      <NoticeList notices={data.notices} onGo={onGo} />
    </div>
  );
}

function ResultCard({ result, onApply, onGo }) {
  if (!result?.data) return null;
  switch (result.kind) {
    case 'tier_list': return <TierListResult data={result.data} onApply={onApply} />;
    case 'review': return <ReviewResult data={result.data} />;
    case 'digest': return <DigestResult data={result.data} onGo={onGo} />;
    case 'briefing': return <BriefingResult data={result.data} onGo={onGo} />;
    case 'search': return <SearchResult data={result.data} onGo={onGo} />;
    default: return null;
  }
}

// ---------------------------------------------------------------- 메시지 한 개
// memo: 해설 글자가 들어올 때 바뀌는 건 마지막 메시지 하나뿐이다 — 나머지는 다시 그리지 않는다.
const Message = memo(function Message({ m, onApply, onGo }) {
  if (m.role === 'user') {
    return (
      <div className="agent-msg is-user">
        <div className="agent-bubble">{m.content}</div>
      </div>
    );
  }
  const busy = m.status === 'running';
  const plan = m.plan;
  const freeGuide = plan && (plan.task === 'guide' || plan.task === 'unknown');
  return (
    <div className={`agent-msg is-bot${m.status === 'error' ? ' is-error' : ''}`}>
      <span className="agent-avatar" aria-hidden="true"><BotIcon size={20} /></span>
      <div className="agent-body">
        {plan && (
          <div className="agent-plan">
            <span className={`agent-level ${LEVEL_CLASS[plan.level] || ''}`}>{plan.levelLabel || '작업'}</span>
            <strong>{plan.label}</strong>
            <span className="agent-cost">{plan.cost > 0 ? `−${plan.cost}P` : '무료'}</span>
          </div>
        )}
        {m.steps?.length > 0 && (
          <ol className="agent-steps" aria-label="진행 상황">
            {m.steps.map((s, i) => (
              <li key={s.label} className={`is-${busy || s.status === 'done' ? s.status : 'wait'}`}>
                <span className="agent-step-mark" aria-hidden="true">{s.status === 'done' ? '✓' : i + 1}</span>
                {s.label}
              </li>
            ))}
          </ol>
        )}
        <ResultCard result={m.result} onApply={onApply} onGo={onGo} />
        {(m.content || busy) && (
          <div className="agent-bubble">
            {m.content && <div className="agent-text">{m.content}{busy && <span className="agent-caret" aria-hidden="true" />}</div>}
            {!m.content && busy && <div className="agent-typing" aria-label="작업 중"><span /><span /><span /></div>}
            {m.status === 'done' && m.mode === 'fallback' && <span className="agent-note">AI 서버 OFF — AI 해설 없이 정리한 결과예요</span>}
            {m.status === 'error' && m.refunded > 0 && <span className="agent-note">차감했던 {m.refunded}P는 돌려드렸어요</span>}
            {m.status === 'stopped' && <span className="agent-note">중지됨{m.stoppedNote ? ' — 이미 시작한 작업의 포인트는 돌려받지 못해요' : ''}</span>}
            {m.status === 'done' && freeGuide && (
              <Link className="agent-btn-ghost" to="/ai" onClick={onGo}>AI 도우미(휴버봇)에게 물어보기 →</Link>
            )}
            {m.status === 'error' && m.code === 'NO_POINTS' && (
              <Link className="agent-btn-ghost" to="/luck-draw#daily" onClick={onGo}>포인트 모으러 가기 →</Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

// ---------------------------------------------------------------- 모달
function AgentModal() {
  const {
    closeBot, messages, running, info, points, send, stop, clear, isLoggedIn, isAdmin,
  } = useAgentBot();
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const listRef = useRef(null);
  const stickRef = useRef(true);     // 사용자가 위로 올려 읽는 중이면 자동으로 끌어내리지 않는다
  const inputRef = useRef(null);
  // 넓은 화면에서만 요금 안내를 펼쳐 둔다(처음 열 때 한 번 정한다)
  const wideRef = useRef(typeof window !== 'undefined' && window.matchMedia('(min-width: 821px)').matches);

  const ai = info?.ai || null;
  const tasks = info?.tasks || [];
  const canUse = isLoggedIn && !isAdmin && !isStaticPreview();

  // Esc 로 닫기 + 열려 있는 동안 뒤 화면 스크롤 잠금(작업은 닫아도 계속된다)
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') closeBot(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    inputRef.current?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [closeBot]);

  // 새 글이 오면 맨 아래로(사용자가 위를 보고 있지 않을 때만)
  useEffect(() => {
    const el = listRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const onScroll = () => {
    const el = listRef.current;
    if (el) stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
  };

  const submit = (text) => {
    const message = String(text ?? input).trim();
    if (!message || running || !canUse) return;
    stickRef.current = true;
    setInput('');
    send(message);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  // 초안을 커스텀 메이커에 올린다 — 작업 중이던 배치가 있으면 먼저 묻는다
  const applyTierList = (data) => {
    const next = zonesToMakerState(data.zones);
    if (!hasPlacedCharacters(next)) return;
    if (hasPlacedCharacters(loadMakerState())
      && !window.confirm('지금 커스텀 메이커에 배치해 둔 내용이 이 초안으로 바뀝니다. 계속할까요?')) return;
    saveMakerState(next);
    window.dispatchEvent(new Event(MAKER_REPLACED_EVENT));
    closeBot();
    navigate('/custom-maker');
  };

  const examples = tasks.length ? tasks.map((t) => t.example) : FALLBACK_EXAMPLES;

  return (
    <div className="agent-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) closeBot(); }}>
      <section className="agent-modal" role="dialog" aria-modal="true" aria-label="휴버대 에이전트 봇">
        <div className="agent-head">
          <span className="agent-head-icon" aria-hidden="true"><BotIcon size={26} /></span>
          <div className="agent-head-title">
            <strong>휴버대 에이전트 봇</strong>
            <span>말로 시키면 대신 해 주는 작업 봇 · 회원 전용 · 포인트 사용</span>
          </div>
          <div className="agent-head-right">
            {ai && <span className={`agent-chip ${AI_VIEW[ai].cls}`}><i aria-hidden="true" />{AI_VIEW[ai].text}</span>}
            {canUse && typeof points === 'number' && <span className="agent-chip is-points">보유 {points}P</span>}
            <button type="button" className="agent-close" onClick={closeBot} aria-label="닫기 (작업은 계속 진행돼요)">✕</button>
          </div>
        </div>

        <div className="agent-main">
          <aside className="agent-side" aria-label="할 수 있는 작업과 요금">
            <h3>할 수 있는 작업 · 요금</h3>
            {tasks.length === 0 && <p className="agent-side-empty">{ai === 'down' ? '에이전트 봇에 연결할 수 없어요.' : '불러오는 중…'}</p>}
            <ul className="agent-tasks">
              {tasks.map((t) => (
                <li key={t.task}>
                  <button type="button" onClick={() => { setInput(t.example); inputRef.current?.focus(); }} disabled={!canUse} title="예시를 입력창에 넣기">
                    <span className="agent-task-top">
                      <b>{t.label}</b>
                      <span className={`agent-level ${LEVEL_CLASS[t.level] || ''}`}>{info?.levelLabels?.[t.level] || t.level} {t.cost}P</span>
                    </span>
                    <span className="agent-task-desc">{t.description}</span>
                  </button>
                </li>
              ))}
            </ul>
            {/* 좁은 화면에서는 대화 자리를 넓히려고 접어 둔다(눌러서 펼침) */}
            <details className="agent-rules" open={wideRef.current}>
              <summary><b>포인트는 이렇게 써요</b></summary>
              <ul>
                <li>작업이 정해지는 순간 강도만큼 차감돼요{info?.costs ? ` (가벼움 ${info.costs.light}P · 보통 ${info.costs.normal}P · 무거움 ${info.costs.heavy}P)` : ''}.</li>
                <li>이용법 안내·못 알아들은 말은 <b>무료</b>예요.</li>
                <li>작업이 실패하면 차감한 포인트를 돌려드려요.</li>
                <li>AI 서버가 OFF면 AI 해설 없이 결과만 나오고{info?.offCost ? ` 어떤 작업이든 ${info.offCost}P만` : ' 가벼움 요금만'} 받아요.</li>
                {info?.limit && <li>{info.limit.minutes}분에 {info.limit.count}번까지 요청할 수 있어요.</li>}
                <li>창을 닫아도 작업은 계속돼요. 대화는 서버에 저장되지 않아요.</li>
              </ul>
              <Link to="/ai" onClick={closeBot}>사이트 이용법은 AI 도우미(휴버봇)에게 →</Link>
            </details>
          </aside>

          <div className="agent-chat">
            <div className="agent-messages" ref={listRef} onScroll={onScroll} aria-live="polite">
              {messages.length === 0 && (
                <div className="agent-empty">
                  <span className="agent-empty-icon" aria-hidden="true"><BotIcon size={40} /></span>
                  <strong>무엇을 대신 해 드릴까요?</strong>
                  <p>귀찮은 일을 말로 맡겨 보세요. 결과물이 먼저 나오고, 설명이 이어져요.</p>
                  <div className="agent-examples">
                    {examples.slice(0, 5).map((ex) => (
                      <button type="button" key={ex} onClick={() => submit(ex)} disabled={!canUse || running}>{ex}</button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m) => <Message key={m.id} m={m} onApply={applyTierList} onGo={closeBot} />)}
            </div>

            {!canUse ? (
              <div className="agent-gate">
                {isStaticPreview() && <p>서버가 있는 환경에서만 쓸 수 있어요.</p>}
                {!isStaticPreview() && isAdmin && <p>에이전트 봇은 포인트를 쓰는 기능이라 <b>회원 계정</b>으로만 쓸 수 있어요. (관리자 계정은 포인트가 없어요.)</p>}
                {!isStaticPreview() && !isAdmin && (
                  <>
                    <p>에이전트 봇은 <b>로그인한 회원</b>만 쓸 수 있어요. 작업 강도에 따라 포인트를 써요.</p>
                    <Link className="agent-btn-primary" to="/login" onClick={closeBot}>로그인하러 가기 →</Link>
                  </>
                )}
              </div>
            ) : (
              <form className="agent-form" onSubmit={(e) => { e.preventDefault(); submit(); }}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  maxLength={AGENT_MAX_MESSAGE}
                  rows={2}
                  placeholder="예) 1~3티어 캐릭터로 티어표 만들어줘  (Enter 실행 · Shift+Enter 줄바꿈)"
                  aria-label="에이전트 봇에게 시킬 일"
                />
                <div className="agent-form-row">
                  <span className="agent-count">{input.length}/{AGENT_MAX_MESSAGE}</span>
                  {messages.length > 0 && !running && <button type="button" className="agent-btn-text" onClick={clear}>대화 지우기</button>}
                  {running
                    ? <button type="button" className="agent-btn-stop" onClick={stop}>■ 중지</button>
                    : <button type="submit" className="agent-btn-primary" disabled={!input.trim()}>실행</button>}
                </div>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------- 원형 버튼
export default function AgentBot() {
  const { open, openBot, running, unseen } = useAgentBot();
  const { pathname } = useLocation();
  const guide = useGuide();

  // 헤더가 없는 단독 페이지·관리자 화면, 가이드 모드가 켜진 동안(화면을 가리는 안내가 진행 중)에는 띄우지 않는다.
  // 단, 모달이 이미 열려 있거나 작업이 돌고 있으면 그대로 둔다(작업 상태를 잃지 않게).
  const hidden = (HIDDEN_PATHS.test(pathname) || Boolean(guide)) && !open && !running && !unseen;
  if (hidden) return null;

  const state = running ? 'is-running' : unseen ? 'is-done' : '';
  const label = running ? '에이전트 봇 작업 중 — 눌러서 보기' : unseen ? '에이전트 봇 작업 완료 — 눌러서 확인' : '휴버대 에이전트 봇 열기';
  return (
    <>
      {!open && (
        <div className={`agent-fab-wrap ${state}`}>
          {(running || unseen) && <span className="agent-fab-pill" aria-hidden="true">{running ? '작업 중…' : '작업 완료 ✓'}</span>}
          <button type="button" className="agent-fab" onClick={openBot} aria-label={label} title="휴버대 에이전트 봇">
            <span className="agent-fab-ring" aria-hidden="true" />
            <img src={LOGO_URL} alt="" className="agent-fab-logo" width="34" height="34" />
            <span className="agent-fab-badge" aria-hidden="true"><BotIcon size={15} /></span>
          </button>
        </div>
      )}
      {open && <AgentModal />}
    </>
  );
}
