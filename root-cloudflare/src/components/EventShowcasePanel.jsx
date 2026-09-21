// ========================================================
// EventShowcasePanel — 이벤트 "제작한 티어표 공개"
// ========================================================
// 관리자가 연 회차 동안 회원이 커스텀 티어표를 출품하고, 서로 투표하고, 결과 공개일에 우승자가 발표된다.
//
//  예정(scheduled)  관리자가 예약해 둔 접수 시작일까지 안내만 보인다.
//  접수 중(open)    출품 — ① 새 티어표를 만들어서 참가(커스텀 메이커로 이동, 업로드하면 자동 출품)
//                          ② 이미 게시판에 올린 글로 참가.  투표도 이때부터 가능.
//  마감(closed)     새 출품은 못 하지만 투표는 결과 공개일까지 계속된다.
//  발표(revealed)   우승자·상금·표 수(득표순 순위)를 보여준다.
//
// 투표 중에는 표 수를 보여주지 않는다(눈치 투표 방지) — 서버가 아예 내려주지 않는다.
// 출품·투표는 서버가 검증한다(내 글만, 공개 글만, 1인 1작품·1표, 내 작품엔 투표 불가, 인증 회원만).
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest, isStaticPreview } from '../lib/api';
import { formatWhen } from '../lib/eventFormat';
import { tierImageUrl } from '../lib/paths';

const STATUS_LABEL = { scheduled: '접수 예정', open: '접수 중', closed: '투표 중 · 접수 마감', revealed: '결과 발표' };

// 게시글 썸네일은 data URL 이거나 사이트 이미지 경로다
const thumbSrc = (t) => (!t ? '' : (/^(data:|https?:|blob:)/i.test(t) ? t : tierImageUrl(t)));

// 남은 시간 "2일 03:04:05"
function formatRemain(ms) {
  if (ms <= 0) return '곧';
  const total = Math.floor(ms / 1000);
  const d = Math.floor(total / 86400);
  const h = String(Math.floor((total % 86400) / 3600)).padStart(2, '0');
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${d > 0 ? `${d}일 ` : ''}${h}:${m}:${s}`;
}

// 지금 상태에서 "다음에 바뀌는 시각"과 그 앞에 붙일 문구
function nextBoundary(sc) {
  if (sc.status === 'scheduled') return { at: sc.opensAt, label: '접수 시작까지' };
  if (sc.status === 'open') return { at: sc.deadlineAt, label: '접수 마감까지' };
  if (sc.status === 'closed') return { at: sc.revealAt, label: '결과 발표까지' };
  return null;
}

export default function EventShowcasePanel({ isLoggedIn, isAdmin }) {
  const isStatic = isStaticPreview();
  const [sc, setSc] = useState(undefined); // undefined = 불러오는 중, null = 회차 없음
  const [now, setNow] = useState(Date.now());
  const [posts, setPosts] = useState(null); // 내 게시글(출품 후보)
  const [pickId, setPickId] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const aliveRef = useRef(true);

  useEffect(() => () => { aliveRef.current = false; }, []);

  const load = useCallback(async () => {
    if (isStatic) { setSc(null); return; }
    const res = await apiRequest('/api/events/showcase').catch(() => null);
    if (!aliveRef.current) return;
    setSc(res?.ok ? res.data.showcase : null);
  }, [isStatic]);

  useEffect(() => { load(); }, [load, isLoggedIn]);

  // 1초 시계 — 진행 중인 회차의 카운트다운용. 다음 시각을 넘기면 서버에서 새 상태를 다시 받는다.
  const boundary = sc ? nextBoundary(sc) : null;
  const boundaryMs = boundary?.at ? new Date(boundary.at).getTime() : null;
  useEffect(() => {
    if (!boundaryMs) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [boundaryMs]);
  const reloadedFor = useRef(null);
  useEffect(() => {
    if (!boundaryMs || now < boundaryMs || reloadedFor.current === boundaryMs) return;
    reloadedFor.current = boundaryMs;
    // 서버 스케줄러/조회가 상태를 넘겨 줄 시간을 조금 주고 다시 불러온다
    setTimeout(() => { if (aliveRef.current) load(); }, 1500);
  }, [now, boundaryMs, load]);

  // 참가 가능한 상태가 되면 내 게시글 목록을 불러온다
  const canEnter = Boolean(sc?.viewer?.canEnter);
  useEffect(() => {
    if (!canEnter) return;
    apiRequest('/api/events/showcase/my-posts')
      .then((res) => { if (res.ok && aliveRef.current) setPosts(res.data.posts || []); })
      .catch(() => {});
  }, [canEnter]);

  const act = async (path, body, okText) => {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    const res = await apiRequest(path, { method: 'POST', body: JSON.stringify(body || {}) })
      .catch(() => ({ ok: false, data: { error: '서버와 연결할 수 없습니다.' } }));
    if (!aliveRef.current) return;
    setBusy(false);
    if (!res.ok) {
      setMessage({ error: true, text: res.data?.error || '처리에 실패했습니다.' });
      // 그 사이 상태가 바뀌었을 수 있으니(마감 등) 화면을 새로 맞춘다
      if (res.data?.code) load();
      return;
    }
    if (okText) setMessage({ text: okText });
    await load();
  };

  const enter = () => {
    if (!pickId) { setMessage({ error: true, text: '참가할 게시글을 골라주세요.' }); return; }
    act('/api/events/showcase/entry', { tierListId: pickId }, '참가 신청이 완료되었어요! 다른 참가작에 투표도 해보세요.');
  };
  const cancelEntry = () => {
    if (!window.confirm('참가를 취소할까요?\n내 작품에 모인 표도 함께 사라집니다.')) return;
    act('/api/events/showcase/entry/cancel', {}, '참가를 취소했어요.');
  };
  const vote = (entry) => act('/api/events/showcase/vote', { entryId: entry.id }, entry.votedByMe ? '투표를 취소했어요.' : `「${entry.title || entry.nickname}」에 투표했어요.`);

  if (sc === undefined) return <><h1>제작한 티어표 공개</h1><p className="event-status">불러오는 중...</p></>;

  const intro = (
    <p className="event-desc">
      여러분이 만든 커스텀 티어표를 <strong>출품</strong>하고, 다른 참가작에 <strong>투표</strong>해 우승자를 가리는 이벤트입니다.
      우승 작품의 주인에게는 상금(포인트)을 드려요.
    </p>
  );

  if (!sc) {
    return (
      <>
        <h1>제작한 티어표 공개</h1>
        {intro}
        <div className="event-soon">
          <strong>지금 열려 있는 이벤트가 없어요</strong>
          <span>다음 회차가 열리면 이곳에서 바로 참가할 수 있어요. 공지로도 알려드릴게요.</span>
        </div>
        {isAdmin && (
          <p className="event-admin-hint">
            관리자님: 회차 만들기·접수 시작 예약·우승자 선정은 <Link to="/admin#admin-showcase">관리자 페이지 → 이벤트 관리</Link>에서 합니다.
          </p>
        )}
      </>
    );
  }

  const v = sc.viewer || {};
  const showRemain = boundary?.at && new Date(boundary.at).getTime() > now;
  const winner = sc.winners?.[0] || null;
  const myEntry = sc.entries.find((e) => e.isMine) || null;

  return (
    <>
      <h1>제작한 티어표 공개</h1>
      {intro}

      {/* ===== 회차 요약 ===== */}
      <div className={`sc-hero is-${sc.status}`}>
        <div className="sc-hero-top">
          <span className="sc-badge">{STATUS_LABEL[sc.status]}</span>
          <strong className="sc-title">{sc.title}</strong>
        </div>
        {sc.description && <p className="sc-desc">{sc.description}</p>}
        <dl className="sc-facts">
          {sc.status === 'scheduled' && <div><dt>접수 시작</dt><dd>{formatWhen(sc.opensAt)}</dd></div>}
          <div><dt>접수 마감</dt><dd>{formatWhen(sc.deadlineAt)}</dd></div>
          <div><dt>결과 발표</dt><dd>{formatWhen(sc.revealAt)}</dd></div>
          <div><dt>우승 상금</dt><dd>{sc.awardPoints}P</dd></div>
          <div><dt>우승 방식</dt><dd>{sc.winnerMode === 'votes' ? '투표 1위 자동 선정' : '관리자 선정'}</dd></div>
          {sc.status !== 'scheduled' && <div><dt>참가작</dt><dd>{sc.entryCount}개</dd></div>}
        </dl>
        {showRemain && (
          <p className="sc-remain"><span>{boundary.label}</span> <strong>{formatRemain(new Date(boundary.at).getTime() - now)}</strong></p>
        )}
      </div>

      {isStatic && <div className="event-guard">이 기능은 서버가 필요합니다. 로컬(:5000) 또는 배포된 사이트에서 이용해주세요.</div>}

      {/* ===== 결과 발표 ===== */}
      {sc.status === 'revealed' && (
        <div className={`sc-winner${winner ? '' : ' is-none'}`}>
          {winner ? (
            <>
              <span className="sc-winner-crown" aria-hidden="true">🏆</span>
              <div>
                <strong>우승: {winner.nickname}</strong>
                <span>「{winner.title || '제목 없음'}」 · {winner.votes}표 · 상금 {winner.awardedPoints}P</span>
              </div>
              {winner.tierListId && <Link className="sc-link" to={`/board/post?id=${encodeURIComponent(winner.tierListId)}`}>우승작 보기 →</Link>}
            </>
          ) : (
            <div><strong>이번 회차는 우승자 없이 마무리되었어요</strong>{sc.resultNote && <span>{sc.resultNote}</span>}</div>
          )}
        </div>
      )}

      {/* ===== 참여 안내(로그인/관리자) ===== */}
      {!isStatic && sc.status !== 'revealed' && sc.status !== 'scheduled' && !isLoggedIn && (
        <div className="event-guard">참가하고 투표하려면 로그인이 필요합니다. <Link to="/login">로그인하러 가기 →</Link></div>
      )}
      {!isStatic && sc.status !== 'revealed' && v.isAdmin && (
        <div className="event-guard">
          관리자 계정은 참가·투표를 할 수 없어요. 회차 관리는 <Link to="/admin#admin-showcase">관리자 페이지 → 이벤트 관리</Link>에서 하세요.
        </div>
      )}

      {/* ===== 참가하기(접수 중 · 아직 참가 안 함) ===== */}
      {v.canEnter && (
        <div className="sc-enter">
          <h2>참가하기</h2>
          <div className="sc-enter-grid">
            <div className="sc-enter-card">
              <strong>✏️ 새 티어표를 만들어서 참가</strong>
              <p>커스텀 메이커에서 티어표를 만들고 업로드하면, 게시판에 올라가는 동시에 이 이벤트에 자동으로 참가돼요.</p>
              <Link className="event-btn is-inline sc-btn-link" to={`/custom-maker?event=${encodeURIComponent(sc.id)}`}>티어표 만들러 가기</Link>
            </div>
            <div className="sc-enter-card">
              <strong>📋 이미 올린 게시글로 참가</strong>
              <p>게시판에 올려 둔 공개 티어표 중 하나를 골라 출품해요.</p>
              {posts === null && <p className="event-status">내 게시글을 불러오는 중...</p>}
              {posts && posts.length === 0 && (
                <p className="event-empty">올린 공개 게시글이 없어요. 왼쪽에서 새로 만들어 참가하거나, <Link to="/custom-maker">메이커</Link>에서 먼저 업로드하세요.</p>
              )}
              {posts && posts.length > 0 && (
                <>
                  <ul className="sc-post-list" role="radiogroup" aria-label="참가할 내 게시글">
                    {posts.map((p) => (
                      <li key={p.id}>
                        <label className={`sc-post${pickId === p.id ? ' is-picked' : ''}`}>
                          <input type="radio" name="sc-post" value={p.id} checked={pickId === p.id} onChange={() => setPickId(p.id)} />
                          {p.thumbnail ? <img src={thumbSrc(p.thumbnail)} alt="" loading="lazy" /> : <span className="sc-post-noimg" aria-hidden="true" />}
                          <span className="sc-post-title">{p.title}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                  <button type="button" className="event-btn is-inline" disabled={busy || !pickId} onClick={enter}>이 글로 참가하기</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== 내 참가작 ===== */}
      {myEntry && sc.status !== 'revealed' && (
        <div className="sc-mine">
          <span>내 참가작</span>
          <strong>「{myEntry.title || '제목 없음'}」</strong>
          {sc.status === 'open' && <button type="button" className="event-btn is-inline is-ghost" disabled={busy} onClick={cancelEntry}>참가 취소</button>}
        </div>
      )}

      {message && <p className={`event-status${message.error ? ' is-error' : ''}`} role="status">{message.text}</p>}

      {/* ===== 참가작 갤러리 + 투표 ===== */}
      {sc.status !== 'scheduled' && (
        <div className="sc-gallery-wrap">
          <h2>{sc.status === 'revealed' ? '최종 순위' : `참가작 (${sc.entryCount})`}</h2>
          {sc.status !== 'revealed' && (
            <p className="sc-help">
              {v.canVote
                ? '마음에 드는 작품에 한 표! 표는 하나뿐이라 다른 작품에 누르면 옮겨 가고, 같은 작품을 다시 누르면 취소돼요. 내 작품에는 투표할 수 없어요. 표 수는 결과 발표 때 공개됩니다.'
                : '투표는 로그인한 회원만 할 수 있어요. 표 수는 결과 발표 때 공개됩니다.'}
            </p>
          )}
          {sc.entries.length === 0 && <p className="event-empty">아직 참가작이 없어요. 첫 번째 참가자가 되어보세요.</p>}
          <ul className="sc-gallery">
            {sc.entries.map((e, i) => {
              const isWinner = sc.status === 'revealed' && winner && winner.entryId === e.id;
              return (
                <li key={e.id} className={`sc-card${e.votedByMe ? ' is-voted' : ''}${isWinner ? ' is-winner' : ''}`}>
                  <div className="sc-card-img">
                    {e.thumbnail ? <img src={thumbSrc(e.thumbnail)} alt="" loading="lazy" /> : <span className="sc-post-noimg" aria-hidden="true" />}
                    {sc.status === 'revealed' && <span className="sc-rank">{isWinner ? '🏆' : `${i + 1}위`}</span>}
                  </div>
                  <div className="sc-card-body">
                    <strong className="sc-card-title">{e.title || '제목 없음'}</strong>
                    <span className="sc-card-author">{e.nickname}{e.isMine && <em className="sc-tag">내 작품</em>}{e.votedByMe && <em className="sc-tag is-vote">내가 투표</em>}</span>
                    {sc.status === 'revealed' && <span className="sc-card-votes">{e.votes ?? 0}표</span>}
                  </div>
                  <div className="sc-card-actions">
                    <Link className="sc-link" to={`/board/post?id=${encodeURIComponent(e.tierListId)}`}>티어표 보기</Link>
                    {sc.status !== 'revealed' && v.canVote && !e.isMine && (
                      <button type="button" className={`event-btn is-inline${e.votedByMe ? ' is-ghost' : ''}`} disabled={busy} onClick={() => vote(e)}>
                        {e.votedByMe ? '투표 취소' : '👍 투표'}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {isAdmin && (
        <p className="event-admin-hint">
          관리자님: 회차 관리·우승자 선정은 <Link to="/admin#admin-showcase">관리자 페이지 → 이벤트 관리</Link>에서 합니다.
        </p>
      )}
    </>
  );
}
