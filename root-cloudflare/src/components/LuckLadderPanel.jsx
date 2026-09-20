// ========================================================
// LuckLadderPanel — 랜덤 뽑기 (사다리 게임 스타일, 5분 자동 라운드)
// ========================================================
// 커스텀 메이커 배치와 무관하게, 서버가 이 사이트의 전용 캐릭터 목록표
// (backend/data/luckPool.js)에서 5분마다 자동으로 캐릭터 하나를 뽑아 그 라운드의
// 결과(캐릭터 이름·티어·홀짝 여부)로 확정한다. 라운드가 열려 있는 동안 배팅을 걸어두면
// 5분 뒤 결과가 정해질 때 서버가 자동으로 정산한다 — 이 화면은 그 상태를 주기적으로
// 불러와 보여주고 배팅 요청만 보낸다(추첨·정산은 전부 서버 스케줄러가 한다).
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest, isStaticPreview } from '../lib/api';
import { tierImageUrl } from '../lib/paths';
import '../styles/luck-ladder.css';

const POLL_MS = 5000; // 라운드 상태(내 배팅 정산 여부·마감 등) 재확인 주기
const GROUP_LABELS = { 123: '1~3티어', 456: '4~6티어', 789: '7~9티어' };
const GROUP_ORDER = ['123', '456', '789'];
const OUTCOME_TEXT = { win: '승리!', lose: '패배' };

function formatCountdown(totalSeconds) {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

export default function LuckLadderPanel({ isLoggedIn }) {
  const isStatic = isStaticPreview();
  const [data, setData] = useState(null); // GET /ladder/round 응답 전체
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [betType, setBetType] = useState('group');
  const [betValue, setBetValue] = useState('123');
  const [bet, setBet] = useState(10);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [revealing, setRevealing] = useState(false); // 카운트다운이 0이 된 뒤 서버 정산을 기다리는 중
  const [revealResult, setRevealResult] = useState(null); // 방금 마감된 라운드의 결과(잠깐 보여줌)
  const lastRoundNoRef = useRef(null);
  const revealTimeoutRef = useRef(null);

  const load = async () => {
    if (isStatic) return;
    const res = await apiRequest('/api/luck-draw/ladder/round').catch(() => null);
    if (!res?.ok) return;
    const prevRoundNo = lastRoundNoRef.current;
    setData(res.data);
    setSecondsLeft(res.data.round.secondsLeft);
    // 새 라운드로 넘어갔으면 방금 끝난 라운드의 결과를 히스토리에서 찾아 잠깐 공개한다
    if (prevRoundNo !== null && prevRoundNo !== res.data.round.roundNo) {
      setMessage('');
      const finished = (res.data.history || []).find((h) => h.roundNo === prevRoundNo);
      setRevealing(false);
      clearTimeout(revealTimeoutRef.current);
      if (finished) {
        setRevealResult(finished);
        revealTimeoutRef.current = setTimeout(() => setRevealResult(null), 4000);
      }
    }
    lastRoundNoRef.current = res.data.round.roundNo;
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, POLL_MS);
    return () => {
      clearInterval(timer);
      clearTimeout(revealTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStatic, isLoggedIn]);

  // 폴링 사이에도 카운트다운이 자연스럽게 줄어들도록 1초마다 로컬에서 갱신
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((s) => {
        const next = Math.max(0, s - 1);
        // 마감 시각이 되면 다음 폴링에서 결과가 오기 전까지 '공개 중' 상태를 보여준다
        if (s > 0 && next === 0) setRevealing(true);
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const round = data?.round;
  const myBet = data?.myBet;
  const history = data?.history || [];
  const minBet = data?.minBet ?? 1;
  // 최대 배팅 = 지금 가진 포인트 전부(서버가 /ladder/round 로 내려주는 points 가 곧 상한).
  const maxBet = typeof data?.points === 'number' ? data.points : null;
  const groupMult = data?.groupMult ?? 2.5;
  const parityMult = data?.parityMult ?? 1.95;
  const exactMult = data?.exactMult || {};
  const points = data?.points;

  const currentMult = betType === 'group' ? groupMult
    : betType === 'parity' ? parityMult
      : (exactMult[betValue] ?? 0);

  const notEnough = typeof points === 'number' && points < bet;
  const alreadyBet = Boolean(myBet);
  const disabled = isStatic || busy || !isLoggedIn || notEnough || alreadyBet || secondsLeft <= 0;

  const chooseBet = (type, value) => { setBetType(type); setBetValue(value); };

  const clampBet = (value) => {
    const n = Math.trunc(Number(value));
    if (!Number.isFinite(n)) return minBet;
    // 포인트를 아직 모르는 동안(비로그인·로딩 중)은 하한만 적용한다.
    const hi = typeof maxBet === 'number' ? Math.max(minBet, maxBet) : n;
    return Math.min(hi, Math.max(minBet, n));
  };

  // 라운드가 정산돼 포인트가 줄면 입력값도 새 상한(=남은 포인트)까지 자동으로 내린다.
  useEffect(() => {
    if (typeof maxBet !== 'number') return;
    setBet((prev) => Math.min(Math.max(minBet, maxBet), Math.max(minBet, prev)));
  }, [maxBet, minBet]);

  const onPlaceBet = async () => {
    if (disabled) return;
    setBusy(true);
    setMessage('');
    const res = await apiRequest('/api/luck-draw/ladder/bet', {
      method: 'POST',
      body: JSON.stringify({ bet, betType, betValue }),
    }).catch(() => ({ ok: false, data: { error: '배팅에 실패했습니다.' } }));
    setBusy(false);

    if (!res.ok) {
      setMessage(res.data?.error || '배팅에 실패했습니다.');
      return;
    }
    setMessage('배팅 완료! 라운드가 마감되면 자동으로 정산됩니다.');
    load();
  };

  return (
    <>
      <h1>랜덤 뽑기</h1>
      <p className="luck-desc">
        5분마다 서버가 이 사이트의 전용 캐릭터 목록표에서 자동으로 한 명을 뽑는 공용 라운드입니다.
        라운드가 열려 있는 동안 배팅해두면 마감 시각에 자동으로 정산됩니다.
      </p>
      <p className="ladder-warning">
        승리하면 배팅액 × 배수만큼 얻고, <strong>패배하면 건 배팅액만 잃습니다.</strong>
        한 번에 걸 수 있는 최대 배팅은 <strong>지금 가진 포인트 전부</strong>입니다.
      </p>

      {isStatic && (
        <div className="luck-static-guard">
          이 기능은 서버가 필요합니다. 로컬(:5000) 또는 배포된 사이트에서 이용해주세요.
        </div>
      )}
      {!isStatic && !isLoggedIn && (
        <div className="luck-static-guard">
          포인트를 거는 게임이라 로그인이 필요합니다. <Link to="/login">로그인하러 가기 →</Link>
        </div>
      )}

      {round && (
        <div className="ladder-round-status">
          <span className="ladder-round-no">#{round.roundNo} 라운드</span>
          <span className="ladder-round-countdown">{formatCountdown(secondsLeft)} 후 마감</span>
        </div>
      )}

      {revealResult ? (
        <div className="ladder-reveal">
          <div className="ladder-reveal-card">
            {revealResult.imagePath && (
              <img className="ladder-reveal-img" src={tierImageUrl(revealResult.imagePath)} alt={revealResult.characterName} />
            )}
            <div className="ladder-reveal-info">
              <span className="ladder-reveal-name">{revealResult.characterName}</span>
              <span className="ladder-reveal-tier">{revealResult.tier}티어</span>
              <span className="ladder-reveal-parity">{revealResult.parity === 'odd' ? '홀수' : '짝수'}</span>
            </div>
          </div>
        </div>
      ) : revealing && (
        <div className="ladder-reveal ladder-reveal-waiting">
          <div className="ladder-reveal-spinner" />
          <span>결과 공개 중...</span>
        </div>
      )}

      <div className="ladder-betting">
        <div className="ladder-points">
          보유 포인트 <strong>{typeof points === 'number' ? `${points}P` : '-'}</strong>
        </div>

        {alreadyBet && (
          <div className="ladder-my-bet">
            이번 라운드 배팅: {myBet.bet}P · {myBet.mult}배
            {myBet.settled ? (
              <span className={`ladder-my-bet-outcome${myBet.outcome === 'lose' ? ' is-lose' : ''}`}>
                {' '}→ {OUTCOME_TEXT[myBet.outcome]} ({myBet.pointsDelta > 0 ? '+' : ''}{myBet.pointsDelta}P)
              </span>
            ) : (
              <span> · 결과 대기 중</span>
            )}
          </div>
        )}

        <div className="ladder-bet-group">
          <span className="ladder-bet-group-label">홀수 / 짝수 ({parityMult}배)</span>
          <div className="ladder-bet-options">
            <button type="button" disabled={alreadyBet} className={`ladder-opt-btn${betType === 'parity' && betValue === 'odd' ? ' is-active' : ''}`} onClick={() => chooseBet('parity', 'odd')}>홀수</button>
            <button type="button" disabled={alreadyBet} className={`ladder-opt-btn${betType === 'parity' && betValue === 'even' ? ' is-active' : ''}`} onClick={() => chooseBet('parity', 'even')}>짝수</button>
          </div>
        </div>

        <div className="ladder-bet-group">
          <span className="ladder-bet-group-label">묶음 티어 ({groupMult}배)</span>
          <div className="ladder-bet-options">
            {GROUP_ORDER.map((g) => (
              <button
                key={g}
                type="button"
                className={`ladder-opt-btn${betType === 'group' && betValue === g ? ' is-active' : ''}`}
                disabled={alreadyBet}
                onClick={() => chooseBet('group', g)}
              >
                {GROUP_LABELS[g]}
              </button>
            ))}
          </div>
        </div>

        <div className="ladder-bet-group">
          <span className="ladder-bet-group-label">같은 티어 (지목한 티어만 적중)</span>
          <div className="ladder-bet-options">
            {Array.from({ length: 9 }, (_, i) => i + 1).map((tier) => (
              <button
                key={tier}
                type="button"
                disabled={alreadyBet}
                className={`ladder-opt-btn${betType === 'exact' && Number(betValue) === tier ? ' is-active' : ''}`}
                onClick={() => chooseBet('exact', tier)}
              >
                {tier}티어 · {exactMult[tier] ?? '-'}배
              </button>
            ))}
          </div>
        </div>

        <div className="ladder-bet-row">
          <label htmlFor="ladder-bet">배팅</label>
          <input
            id="ladder-bet"
            type="number"
            min={minBet}
            max={typeof maxBet === 'number' ? maxBet : undefined}
            value={bet}
            disabled={busy || alreadyBet}
            onChange={(e) => setBet(clampBet(e.target.value))}
          />
          <span className="ladder-bet-unit">P</span>
          {[10, 50].map((v) => (
            <button key={v} type="button" className="ladder-bet-chip" disabled={busy || alreadyBet} onClick={() => setBet(clampBet(v))}>
              {v}
            </button>
          ))}
          {/* 최대 = 보유 포인트 전부(올인) */}
          <button
            type="button"
            className="ladder-bet-chip"
            disabled={busy || alreadyBet || typeof maxBet !== 'number' || maxBet < minBet}
            onClick={() => setBet(clampBet(maxBet))}
          >
            최대{typeof maxBet === 'number' ? ` ${maxBet}` : ''}
          </button>
        </div>

        <button type="button" className="luck-draw-btn" onClick={onPlaceBet} disabled={disabled}>
          {alreadyBet ? '이번 라운드 배팅 완료' : (busy ? '배팅 중...' : (notEnough ? '포인트가 부족합니다' : `${bet}P 걸고 ${currentMult || '-'}배 도전`))}
        </button>
        {message && <p className="luck-draw-status">{message}</p>}
      </div>

      {history.length > 0 && (
        <div className="ladder-history">
          <h2>최근 라운드 결과</h2>
          <div className="ladder-history-list">
            {history.map((h) => (
              <div className="ladder-history-item" key={h.roundNo}>
                {h.imagePath && <img className="ladder-history-img" src={tierImageUrl(h.imagePath)} alt={h.characterName} />}
                <span className="ladder-history-name">{h.characterName}</span>
                <span className="ladder-history-tier">{h.tier}티어</span>
                <span className="ladder-history-parity">{h.parity === 'odd' ? '홀수' : '짝수'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

