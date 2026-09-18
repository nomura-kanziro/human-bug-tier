// ========================================================
// LuckPokerPanel — 행운 티어 포커 (오늘의 행운 티어 포인트를 거는 배팅 게임)
// ========================================================
// 카드 추첨·족보 판정·포인트 정산은 전부 서버(/api/luck-draw/poker)가 한다.
// 이 컴포넌트는 배팅액 입력 → 요청 → 결과 표시와 딜링 연출만 담당한다.
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest, isStaticPreview } from '../lib/api';
import '../styles/luck-poker.css';

const DEAL_SUSPENSE_MS = 1600;
const HBU_LOGO = '/tier-media/tier-image/logo.webp';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const OUTCOME_TEXT = { win: '승리!', lose: '패배', push: '무승부' };

function PokerCard({ card, suitMap, hidden }) {
  const suit = suitMap[card?.suit];
  if (hidden || !suit) return <div className="poker-card poker-card-back" aria-hidden="true" />;
  return (
    <div className={`poker-card poker-card-${suit.color}`}>
      <span className="poker-card-tier">{card.tier}</span>
      {suit.id === 'hbu'
        ? <img className="poker-card-mark" src={HBU_LOGO} alt={suit.label} />
        : <span className="poker-card-suit">{suit.symbol}</span>}
    </div>
  );
}

export default function LuckPokerPanel({ isLoggedIn }) {
  const isStatic = isStaticPreview();
  const [config, setConfig] = useState(null);
  const [points, setPoints] = useState(null);
  const [bet, setBet] = useState(10);
  const [round, setRound] = useState(null);   // 서버 응답 1판 전체
  const [dealing, setDealing] = useState(false);
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
  const maxBet = config?.maxBet ?? 100;
  const handSize = config?.handSize ?? 5;

  const notEnough = typeof points === 'number' && points < bet;
  const disabled = isStatic || dealing || !isLoggedIn || notEnough;

  const onPlay = async () => {
    if (disabled) return;
    setDealing(true);
    setMessage('');
    setRound(null);

    const [res] = await Promise.all([
      apiRequest('/api/luck-draw/poker/play', { method: 'POST', body: JSON.stringify({ bet }) })
        .catch(() => ({ ok: false, data: { error: '게임 진행에 실패했습니다.' } })),
      sleep(DEAL_SUSPENSE_MS),
    ]);
    if (!aliveRef.current) return;

    setDealing(false);
    if (!res.ok) {
      if (typeof res.data?.points === 'number') setPoints(res.data.points);
      setMessage(res.data?.error || '게임 진행에 실패했습니다.');
      return;
    }
    setRound(res.data);
    setPoints(res.data.points);
  };

  return (
    <>
      <h1>행운 티어 포커</h1>
      <p className="luck-desc">
        오늘의 행운 티어로 모은 포인트를 걸고 딜러와 {handSize}장씩 승부합니다.
        족보가 더 높으면 배팅액 × 배수만큼 포인트를 받고, 지면 배팅액을 잃습니다.
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
            max={maxBet}
            value={bet}
            disabled={dealing}
            onChange={(e) => {
              const v = Math.trunc(Number(e.target.value));
              setBet(Number.isFinite(v) ? Math.min(maxBet, Math.max(minBet, v)) : minBet);
            }}
          />
          <span className="poker-bet-unit">P</span>
          {[10, 50, maxBet].map((v) => (
            <button key={v} type="button" className="poker-bet-chip" disabled={dealing} onClick={() => setBet(Math.min(maxBet, Math.max(minBet, v)))}>
              {v === maxBet ? `최대 ${maxBet}` : v}
            </button>
          ))}
        </div>
        <button type="button" className="luck-draw-btn" onClick={onPlay} disabled={disabled}>
          {dealing ? '카드를 돌리는 중...' : (notEnough ? '포인트가 부족합니다' : `${bet}P 걸고 승부하기`)}
        </button>
        {message && <p className="luck-draw-status">{message}</p>}
      </div>

      {(dealing || round) && (
        <div className="poker-table">
          <div className="poker-side">
            <div className="poker-side-title">딜러</div>
            <div className="poker-hand">
              {(round ? round.dealer.cards : Array.from({ length: handSize })).map((card, i) => (
                <PokerCard key={i} card={card} suitMap={suitMap} hidden={dealing} />
              ))}
            </div>
            <div className="poker-hand-label">{round ? round.dealer.hand.label : '???'}</div>
          </div>

          <div className={`poker-verdict poker-verdict-${round?.outcome || 'dealing'}`}>
            {dealing ? 'VS' : OUTCOME_TEXT[round.outcome]}
            {round && (
              <span className={`poker-delta${round.pointsDelta < 0 ? ' poker-delta-minus' : ''}`}>
                {round.pointsDelta > 0 ? '+' : ''}{round.pointsDelta}P
              </span>
            )}
          </div>

          <div className="poker-side">
            <div className="poker-side-title">내 패</div>
            <div className="poker-hand">
              {(round ? round.player.cards : Array.from({ length: handSize })).map((card, i) => (
                <PokerCard key={i} card={card} suitMap={suitMap} hidden={dealing} />
              ))}
            </div>
            <div className="poker-hand-label">
              {round ? `${round.player.hand.label} · ${round.player.hand.mult}배` : '???'}
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
            <tr key={h.key} className={round?.player.hand.key === h.key ? 'poker-hand-hit' : undefined}>
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
