// ========================================================
// LuckPokerPanel — 행운 티어 포커 (오늘의 행운 티어 포인트를 거는 배팅 게임)
// ========================================================
// 카드 추첨·족보 판정·포인트 정산은 전부 서버(/api/luck-draw/poker)가 한다.
// 이 컴포넌트는 배팅액 입력 → 요청 → 결과 표시와 딜링 연출만 담당한다.
//
// 딜링 연출 순서 (승부하기 클릭 후):
//   1) player  — 서버가 내려준 "내 패"를 왼쪽부터 한 장씩 추가한다
//   2) dealer  — 내 패 5장 정렬이 완성되면 딜러 패를 한 장씩 뒤집는다
//   3) result  — 승패와 포인트 증감을 애니메이션으로 공개한다(보유 포인트도 이때 갱신)
// 카드 값 자체는 1)이 시작되기 전에 서버 응답으로 이미 전부 정해져 있다 —
// 연출은 "공개 순서"만 늦출 뿐 결과에 관여하지 않는다.
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest, isStaticPreview } from '../lib/api';
import '../styles/luck-poker.css';

const DEAL_STEP_MS = 420;    // 내 패 한 장이 놓이는 간격
const DEALER_STEP_MS = 260;  // 딜러 패가 한 장씩 뒤집히는 간격
const PHASE_GAP_MS = 520;    // 5장 정렬 완성 → 다음 연출까지 뜸 들이는 시간
const HBU_LOGO = '/tier-media/tier-image/logo.webp';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const OUTCOME_TEXT = { win: '승리!', lose: '패배', push: '무승부' };

function PokerCard({ card, suitMap, hidden, anim }) {
  const suit = suitMap[card?.suit];
  if (hidden || !suit) return <div className="poker-card poker-card-back" aria-hidden="true" />;
  return (
    <div className={`poker-card poker-card-${suit.color}${anim ? ` ${anim}` : ''}`}>
      <span className="poker-card-tier">{card.tier}</span>
      {suit.id === 'hbu'
        ? <img className="poker-card-mark" src={HBU_LOGO} alt={suit.label} />
        : <span className="poker-card-suit">{suit.symbol}</span>}
    </div>
  );
}

// 아직 놓이지 않은 내 패 자리 — 카드가 왼쪽부터 채워져도 줄 너비가 흔들리지 않게 한다.
function PokerSlot() {
  return <div className="poker-card-slot" aria-hidden="true" />;
}

export default function LuckPokerPanel({ isLoggedIn }) {
  const isStatic = isStaticPreview();
  const [config, setConfig] = useState(null);
  const [points, setPoints] = useState(null);
  const [bet, setBet] = useState(10);
  const [round, setRound] = useState(null);   // 서버 응답 1판 전체
  const [phase, setPhase] = useState('idle'); // idle | player | dealer | result
  const [playerShown, setPlayerShown] = useState(0); // 지금까지 놓인 내 패 장수
  const [dealerShown, setDealerShown] = useState(0); // 지금까지 뒤집힌 딜러 패 장수
  const [message, setMessage] = useState('');
  const aliveRef = useRef(true);

  useEffect(() => () => { aliveRef.current = false; }, []);

  useEffect(() => {
    if (isStatic) return;
    apiRequest('/api/luck-draw/poker/config')
      .then((res) => {
        if (!res.ok || !aliveRef.current) return;
        setConfig(res.data);
        if (typeof res.data.points === 'number') setPoints(res.data.points);
      })
      .catch(() => {});
  }, [isStatic, isLoggedIn]);

  const suitMap = Object.fromEntries((config?.suits || []).map((s) => [s.id, s]));
  const minBet = config?.minBet ?? 1;
  const handSize = config?.handSize ?? 5;

  // 최대 배팅 = 지금 가진 포인트 전부. 서버도 "보유 포인트보다 많이 못 건다"로만 막는다.
  const maxBet = typeof points === 'number' ? points : null;

  const clampBet = (value) => {
    const n = Math.trunc(Number(value));
    if (!Number.isFinite(n)) return minBet;
    // 포인트를 아직 모르는 동안(비로그인·로딩 중)은 하한만 적용한다.
    const hi = typeof maxBet === 'number' ? Math.max(minBet, maxBet) : n;
    return Math.min(hi, Math.max(minBet, n));
  };

  // 판이 끝나 포인트가 줄면 입력값도 새 상한(=남은 포인트)까지 자동으로 내린다.
  useEffect(() => {
    if (typeof maxBet !== 'number') return;
    setBet((prev) => Math.min(Math.max(minBet, maxBet), Math.max(minBet, prev)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxBet]);

  const busy = phase !== 'idle';
  const notEnough = typeof points === 'number' && points < bet;
  const disabled = isStatic || busy || !isLoggedIn || notEnough;
  const showResult = phase === 'result';

  const onPlay = async () => {
    if (disabled) return;
    setPhase('player');
    setPlayerShown(0);
    setDealerShown(0);
    setMessage('');
    setRound(null);

    const res = await apiRequest('/api/luck-draw/poker/play', { method: 'POST', body: JSON.stringify({ bet }) })
      .catch(() => ({ ok: false, data: { error: '게임 진행에 실패했습니다.' } }));
    if (!aliveRef.current) return;

    if (!res.ok) {
      setPhase('idle');
      if (typeof res.data?.points === 'number') setPoints(res.data.points);
      setMessage(res.data?.error || '게임 진행에 실패했습니다.');
      return;
    }
    setRound(res.data);

    // 1) 내 패를 왼쪽부터 한 장씩 추가
    for (let i = 1; i <= res.data.player.cards.length; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await sleep(DEAL_STEP_MS);
      if (!aliveRef.current) return;
      setPlayerShown(i);
    }

    // 2) 5장 정렬이 완성되면 딜러 패를 한 장씩 공개
    await sleep(PHASE_GAP_MS);
    if (!aliveRef.current) return;
    setPhase('dealer');
    for (let i = 1; i <= res.data.dealer.cards.length; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await sleep(DEALER_STEP_MS);
      if (!aliveRef.current) return;
      setDealerShown(i);
    }

    // 3) 결과 공개 — 포인트 증감도 이때 반영해야 연출과 숫자가 같이 움직인다
    await sleep(PHASE_GAP_MS);
    if (!aliveRef.current) return;
    setPhase('result');
    setPoints(res.data.points);
  };

  return (
    <>
      <h1>행운 티어 포커</h1>
      <p className="luck-desc">
        오늘의 행운 티어로 모은 포인트를 걸고 딜러와 {handSize}장씩 승부합니다.
        족보가 더 높으면 배팅액 × 배수만큼 포인트를 받고, 지면 배팅액을 잃습니다.
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

      <div className="poker-betting">
        <div className="poker-points">
          보유 포인트 <strong>{typeof points === 'number' ? `${points}P` : '-'}</strong>
        </div>
        <div className="poker-bet-row">
          <label htmlFor="poker-bet">배팅</label>
          <input
            id="poker-bet"
            type="number"
            min={minBet}
            max={typeof maxBet === 'number' ? maxBet : undefined}
            value={bet}
            disabled={busy}
            onChange={(e) => setBet(clampBet(e.target.value))}
          />
          <span className="poker-bet-unit">P</span>
          {[10, 50].map((v) => (
            <button key={v} type="button" className="poker-bet-chip" disabled={busy} onClick={() => setBet(clampBet(v))}>
              {v}
            </button>
          ))}
          {/* 최대 = 보유 포인트 전부(올인) */}
          <button
            type="button"
            className="poker-bet-chip"
            disabled={busy || typeof maxBet !== 'number' || maxBet < minBet}
            onClick={() => setBet(clampBet(maxBet))}
          >
            최대{typeof maxBet === 'number' ? ` ${maxBet}` : ''}
          </button>
        </div>
        <button type="button" className="luck-draw-btn" onClick={onPlay} disabled={disabled}>
          {busy ? '카드를 돌리는 중...' : (notEnough ? '포인트가 부족합니다' : `${bet}P 걸고 승부하기`)}
        </button>
        {message && <p className="luck-draw-status">{message}</p>}
      </div>

      {phase !== 'idle' && (
        <div className="poker-table">
          <div className="poker-side">
            <div className="poker-side-title">딜러</div>
            <div className="poker-hand">
              {/* 딜러 패는 처음엔 전부 뒷면이고, 내 패가 완성된 뒤 한 장씩 뒤집힌다. */}
              {Array.from({ length: handSize }).map((_, i) => (
                <PokerCard
                  key={i}
                  card={round?.dealer.cards[i]}
                  suitMap={suitMap}
                  hidden={i >= dealerShown}
                  anim="poker-card-flip"
                />
              ))}
            </div>
            <div className="poker-hand-label">
              {showResult ? round.dealer.hand.label : '???'}
            </div>
          </div>

          <div
            className={`poker-verdict poker-verdict-${showResult ? round.outcome : 'dealing'}${showResult ? ' poker-verdict-reveal' : ''}`}
          >
            {showResult ? OUTCOME_TEXT[round.outcome] : 'VS'}
            {showResult && (
              <span className={`poker-delta${round.pointsDelta < 0 ? ' poker-delta-minus' : ''}`}>
                {round.pointsDelta > 0 ? '+' : ''}{round.pointsDelta}P
              </span>
            )}
          </div>

          <div className="poker-side">
            <div className="poker-side-title">내 패</div>
            <div className="poker-hand">
              {/* 왼쪽부터 한 장씩 추가 — 아직 안 나온 자리는 빈 슬롯으로 둔다. */}
              {Array.from({ length: handSize }).map((_, i) => (
                i < playerShown
                  ? <PokerCard key={i} card={round.player.cards[i]} suitMap={suitMap} anim="poker-card-dealt" />
                  : <PokerSlot key={i} />
              ))}
            </div>
            <div className={`poker-hand-label${playerShown >= handSize ? ' poker-hand-label-on' : ''}`}>
              {playerShown >= handSize
                ? `${round.player.hand.label} · ${round.player.hand.mult}배`
                : `카드를 받는 중... (${playerShown}/${handSize})`}
            </div>
          </div>
        </div>
      )}

      <table className="luck-probability-table poker-hand-table">
        <caption>족보와 승리 배수 (1티어가 가장 높음)</caption>
        <thead>
          <tr><th>족보</th><th>설명</th><th>배수</th></tr>
        </thead>
        <tbody>
          {[...(config?.hands || [])].reverse().map((h) => (
            <tr key={h.key} className={playerShown >= handSize && round?.player.hand.key === h.key ? 'poker-hand-hit' : undefined}>
              <td>{h.label}</td>
              <td className="poker-hand-desc">{h.desc}</td>
              <td>{h.mult}배</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="poker-suit-note">
        무늬 5종 —
        {(config?.suits || []).map((s) => (
          <span key={s.id} className={`poker-suit-chip poker-card-${s.color}`}>
            {s.id === 'hbu' ? <img className="poker-card-mark" src={HBU_LOGO} alt="" /> : s.symbol} {s.label}
          </span>
        ))}
      </p>
    </>
  );
}
