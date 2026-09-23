// ========================================================
// EventMemoryPanel — 이벤트 "메모리 게임"
// ========================================================
// 같은 캐릭터 카드 2장을 찾아 뒤집는 짝 맞추기. 3단계(4×4 → 6×6 → 8×8)를 이어서 진행한다.
//
// 기록이 순위·포인트로 이어지므로 **시간은 프론트가 보내지 않는다.** 서버가 시작 시각과
// 단계 통과 시각을 자기 시계로 찍고 총 기록도 서버가 계산한다. 여기서는
//  - 서버가 내려준 카드 배치를 그리고
//  - "이 단계 다 맞췄다"는 신호만 보내며
//  - 화면의 타이머는 어디까지나 보여주기용이다.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest, isStaticPreview } from '../lib/api';
import { formatMs, formatWhen } from '../lib/eventFormat';
import { tierImageUrl } from '../lib/paths';

const FLIP_BACK_MS = 700;   // 짝이 아닐 때 다시 덮기까지
const STAGE_PAUSE_MS = 900; // 단계 통과 후 다음 판이 뜨기까지 숨 고르는 시간

export default function EventMemoryPanel({ isLoggedIn }) {
  const isStatic = isStaticPreview();
  const [phase, setPhase] = useState('idle');   // idle | playing | between | done
  const [session, setSession] = useState(null);
  const [deck, setDeck] = useState([]);
  const [flipped, setFlipped] = useState([]);   // 지금 앞면인 카드 index (최대 2)
  const [matched, setMatched] = useState([]);   // 짝을 찾아 고정된 카드 index
  const [lock, setLock] = useState(false);
  const [elapsed, setElapsed] = useState(0);    // 화면 표시용 경과 시간
  const [board, setBoard] = useState(null);     // 순위표
  const [message, setMessage] = useState('');
  const startRef = useRef(0);
  const aliveRef = useRef(true);

  useEffect(() => () => { aliveRef.current = false; }, []);

  const loadBoard = useCallback(() => {
    if (isStatic) return;
    apiRequest('/api/events/memory/leaderboard')
      .then((res) => { if (res.ok && aliveRef.current) setBoard(res.data); })
      .catch(() => {});
  }, [isStatic]);

  useEffect(() => { loadBoard(); }, [loadBoard, isLoggedIn]);

  // 보여주기용 타이머 — 진행 중일 때만 100ms 마다 갱신
  useEffect(() => {
    if (phase !== 'playing' && phase !== 'between') return undefined;
    const timer = setInterval(() => setElapsed(Date.now() - startRef.current), 100);
    return () => clearInterval(timer);
  }, [phase]);

  const start = async () => {
    setMessage('');
    setLock(true);
    const res = await apiRequest('/api/events/memory/start', { method: 'POST' })
      .catch(() => ({ ok: false, data: { error: '게임을 시작하지 못했습니다.' } }));
    if (!aliveRef.current) return;
    setLock(false);
    if (!res.ok) {
      setMessage(res.data?.error || '게임을 시작하지 못했습니다.');
      // 그 사이 관리자가 이벤트를 닫았다면 화면의 현황도 새로 맞춘다.
      if (res.data?.code === 'NO_OPEN_PERIOD') loadBoard();
      return;
    }

    startRef.current = Date.now();
    setSession(res.data.session);
    setDeck(res.data.deck);
    setFlipped([]);
    setMatched([]);
    setElapsed(0);
    setPhase('playing');
  };

  // 한 단계를 다 맞췄을 때 — 서버에 신고하고 다음 판(또는 결과)을 받는다.
  const clearStage = useCallback(async () => {
    setPhase('between');
    const res = await apiRequest('/api/events/memory/stage', {
      method: 'POST',
      body: JSON.stringify({ sessionId: session.sessionId }),
    }).catch(() => ({ ok: false, data: { error: '기록을 저장하지 못했습니다.' } }));
    if (!aliveRef.current) return;

    if (!res.ok) {
      setMessage(res.data?.error || '기록을 저장하지 못했습니다.');
      // 판이 진행되는 동안 이벤트가 마감된 경우 — 현황을 새로 불러와 "진행 중 아님"으로 바꾼다.
      if (res.data?.code === 'PERIOD_CLOSED') loadBoard();
      setPhase('idle');
      setSession(null);
      return;
    }

    setSession(res.data.session);
    if (res.data.finished) {
      setPhase('done');
      loadBoard();
      return;
    }
    // 다음 단계 카드로 교체
    setTimeout(() => {
      if (!aliveRef.current) return;
      setDeck(res.data.deck);
      setFlipped([]);
      setMatched([]);
      setPhase('playing');
    }, STAGE_PAUSE_MS);
  }, [session, loadBoard]);

  // 카드 두 장이 뒤집히면 짝인지 판정한다.
  useEffect(() => {
    if (flipped.length !== 2) return undefined;
    const [a, b] = flipped;
    setLock(true);
    if (deck[a] === deck[b]) {
      const next = [...matched, a, b];
      setMatched(next);
      setFlipped([]);
      setLock(false);
      // 마지막 짝이었으면 이 단계 끝
      if (next.length === deck.length) clearStage();
      return undefined;
    }
    const timer = setTimeout(() => {
      if (!aliveRef.current) return;
      setFlipped([]);
      setLock(false);
    }, FLIP_BACK_MS);
    return () => clearTimeout(timer);
  }, [flipped, deck, matched, clearStage]);

  const onCard = (i) => {
    if (phase !== 'playing' || lock) return;
    if (flipped.includes(i) || matched.includes(i)) return;
    setFlipped((cur) => (cur.length >= 2 ? cur : [...cur, i]));
  };

  // 관리자가 관리자 페이지에서 연(open) 기록 이벤트가 있을 때만 게임을 시작할 수 있다.
  const period = board?.period || null;
  const canPlay = Boolean(board?.canPlay);

  const size = session ? (session.stageSizes[session.stageIndex] ?? session.stageSizes[session.stageSizes.length - 1]) : 4;
  const stageNo = session ? Math.min(session.stageIndex + 1, session.stageSizes.length) : 1;

  return (
    <>
      <h1>메모리 게임</h1>
      <p className="event-desc">
        같은 캐릭터 카드 두 장을 찾는 짝 맞추기입니다. <strong>4×4 → 6×6 → 8×8</strong> 세 단계를 이어서 하고,
        완주하면 기록이 순위표에 남습니다. 관리자가 연 <strong>기록 이벤트</strong> 기간에만 참여할 수 있고,
        이벤트가 끝나면 <strong>가장 빠른 기록</strong>을 낸 분께 상금(1000P 이상)을 드려요.
        기록은 서버가 직접 재기 때문에 새로고침하거나 창을 닫으면 그 판은 무효입니다.
      </p>

      {!isStatic && board && (
        <div className={`event-period${canPlay ? ' is-open' : ''}`}>
          {period ? (
            <>
              <span className="event-period-badge">
                {period.status === 'open' ? '진행 중' : period.status === 'closed' ? '마감 · 정산 대기' : '종료'}
              </span>
              <strong className="event-period-title">{period.title}</strong>
              <span className="event-period-meta">
                1위 상금 {period.awardPoints}P
                {period.status === 'open' && period.endsAt && ` · ${formatWhen(period.endsAt)} 마감`}
                {period.status === 'settled' && period.winner && ` · 우승 ${period.winner.nickname} (${formatMs(period.winner.totalMs)})`}
              </span>
              {period.description && <span className="event-period-desc">{period.description}</span>}
            </>
          ) : (
            <span className="event-period-meta">아직 열린 기록 이벤트가 없어요.</span>
          )}
          {!canPlay && <span className="event-period-note">지금은 진행 중인 기록 이벤트가 없어 게임을 할 수 없습니다. 열리면 알림(🔔)으로 알려드릴게요.</span>}
        </div>
      )}

      {isStatic && (
        <div className="event-guard">이 기능은 서버가 필요합니다. 로컬(:5000) 또는 배포된 사이트에서 이용해주세요.</div>
      )}
      {!isStatic && !isLoggedIn && (
        <div className="event-guard">
          기록을 남기려면 로그인이 필요합니다. <Link to="/login">로그인하러 가기 →</Link>
        </div>
      )}

      {isLoggedIn && !isStatic && (
        <div className="event-memory">
          <div className="event-memory-bar">
            <span className="event-memory-stage">
              {phase === 'idle' ? '준비' : `${stageNo}단계 · ${size}×${size}`}
            </span>
            <span className="event-memory-timer">{formatMs(phase === 'done' ? session?.totalMs : elapsed)}</span>
            {phase === 'idle' && (
              <button type="button" className="event-btn is-inline" disabled={lock || !canPlay} onClick={start}>
                {lock ? '준비 중...' : (canPlay ? '게임 시작' : '진행 중인 이벤트 없음')}
              </button>
            )}
            {phase === 'done' && (
              <button type="button" className="event-btn is-inline" disabled={!canPlay} onClick={start}>다시 도전</button>
            )}
          </div>

          {(phase === 'playing' || phase === 'between') && (
            <div className={`event-memory-grid size-${size}`}>
              {deck.map((img, i) => {
                const open = flipped.includes(i) || matched.includes(i);
                return (
                  <button
                    key={i}
                    type="button"
                    className={`event-card${open ? ' is-open' : ''}${matched.includes(i) ? ' is-matched' : ''}`}
                    onClick={() => onCard(i)}
                    aria-label={open ? '뒤집힌 카드' : '카드 뒤집기'}
                  >
                    {open
                      ? <img src={tierImageUrl(img)} alt="" loading="lazy" />
                      : <span className="event-card-back" aria-hidden="true">?</span>}
                  </button>
                );
              })}
            </div>
          )}

          {phase === 'between' && <p className="event-status">단계 통과! 다음 판을 준비하고 있어요...</p>}

          {phase === 'done' && session && (
            <div className="event-memory-done">
              <strong>완주했습니다!</strong>
              <span className="event-memory-total">총 기록 {formatMs(session.totalMs)}</span>
              <ul className="event-memory-stages">
                {session.stages.map((s) => (
                  <li key={s.size}>{s.size}×{s.size} — {formatMs(s.ms)}</li>
                ))}
              </ul>
            </div>
          )}

          {message && <p className="event-status">{message}</p>}
        </div>
      )}

      {board && (
        <div className="event-rank">
          <h2>{period ? `${period.title} · ${period.status === 'open' ? '순위' : '최종 순위'}` : '순위'}</h2>
          {board.top.length === 0 && <p className="event-empty">{period ? '아직 완주한 기록이 없습니다.' : '기록 이벤트가 열리면 순위가 이곳에 표시됩니다.'}{canPlay && ' 첫 기록의 주인공이 되어보세요.'}</p>}
          {board.top.length > 0 && (
            <ol className="event-rank-list">
              {board.top.map((r) => (
                <li key={`${r.rank}-${r.nickname}`} className={r.isMine ? 'is-mine' : undefined}>
                  <span className="event-rank-no">{r.rank}</span>
                  <span className="event-rank-name">{r.nickname}{r.isMine && ' (나)'}</span>
                  <span className="event-rank-time">{formatMs(r.totalMs)}</span>
                </li>
              ))}
            </ol>
          )}
          {board.mine && <p className="event-rank-mine">내 최고 기록: {formatMs(board.mine.totalMs)}</p>}
        </div>
      )}
    </>
  );
}
