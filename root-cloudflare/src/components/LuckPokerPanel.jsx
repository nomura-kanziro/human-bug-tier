// ========================================================
// LuckPokerPanel — 행운 티어 포커 (오늘의 행운 티어 포인트를 거는 배팅 게임)
// ========================================================
// 카드 추첨·족보 판정·포인트 정산은 전부 서버(/api/luck-draw/poker)가 한다.
// 이 컴포넌트는 배팅액 입력 → 카드 선택 → 결과 연출만 담당하며,
// 서버로 보내는 것은 "몇 번째 후보를 골랐는지"(picks)뿐이다 — 카드 값을 만들어 보내지 않는다.
//
// 한 판의 흐름 (승부하기 클릭 후):
//   1) dealing — POST /poker/deal. 배팅액이 이때 빠지고 공개 후보 5장을 받는다.
//   2) picking — 내 패 밑에 깔린 공개 후보 중 3장을 직접 고른다(고른 순서대로 내 패에 올라감).
//   3) auto    — 3장을 다 고르면 POST /poker/play 로 정산하고, 4·5번째 카드를
//                2초 간격으로 한 장씩 자동 공개한다(고르지 않은 후보 2장은 버려진다).
//   4) dealer  — 내 패 5장이 채워지면 딜러 패를 한 장씩 뒤집는다.
//   5) result  — 승패와 포인트 증감을 애니메이션으로 공개한다.
// 카드 값은 1)에서 서버가 이미 전부 확정해 두므로, 2)~5)는 "공개 순서"만 늦출 뿐이다.
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest, isStaticPreview } from '../lib/api';
import '../styles/luck-poker.css';

const AUTO_STEP_MS = 2000;    // 자동으로 뽑히는 4·5번째 카드의 턴 간격(너무 빨라서 2초로 둔다)
const DEALER_STEP_MS = 380;   // 딜러 패가 한 장씩 뒤집히는 간격
const RESULT_DELAY_MS = 900;  // 딜러 패 공개 → 결과 발표까지 뜸 들이는 시간
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

// 아직 채워지지 않은 내 패 자리 — 카드가 왼쪽부터 채워져도 줄 너비가 흔들리지 않게 한다.
function PokerSlot() {
  return <div className="poker-card-slot" aria-hidden="true" />;
}

export default function LuckPokerPanel({ isLoggedIn }) {
  const isStatic = isStaticPreview();
  const [config, setConfig] = useState(null);
  const [points, setPoints] = useState(null);
  const [bet, setBet] = useState(10);
  const [table, setTable] = useState(null);   // 진행 중인 판 { roundId, bet, choices }
  const [picked, setPicked] = useState([]);   // 고른 후보 인덱스(고른 순서대로)
  const [result, setResult] = useState(null); // /poker/play 응답 전체
  const [phase, setPhase] = useState('idle'); // idle | dealing | picking | auto | dealer | result
  const [autoShown, setAutoShown] = useState(0);     // 공개된 자동 카드 장수
  const [dealerShown, setDealerShown] = useState(0); // 뒤집힌 딜러 패 장수
  const [message, setMessage] = useState('');
  const aliveRef = useRef(true);

  useEffect(() => () => { aliveRef.current = false; }, []);

  // 설정 + (있다면) 카드 선택이 끝나지 않은 진행 중인 판을 불러온다.
  // 새로고침해도 이미 배팅액이 빠진 판을 이어서 고를 수 있게 하기 위함.
  const loadConfig = async () => {
    if (isStatic) return;
    const res = await apiRequest('/api/luck-draw/poker/config').catch(() => null);
    if (!res?.ok || !aliveRef.current) return;
    setConfig(res.data);
    if (typeof res.data.points === 'number') setPoints(res.data.points);
    if (res.data.openRound) {
      setTable(res.data.openRound);
      setPicked([]);
      setResult(null);
      setAutoShown(0);
      setDealerShown(0);
      setPhase('picking');
    }
  };

  useEffect(() => {
    loadConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStatic, isLoggedIn]);

  const suitMap = Object.fromEntries((config?.suits || []).map((s) => [s.id, s]));
  const minBet = config?.minBet ?? 1;
  const handSize = config?.handSize ?? 5;
  const pickCount = config?.pickCount ?? 3;
  const autoCount = config?.autoCount ?? (handSize - pickCount);

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

  const busy = phase !== 'idle' && phase !== 'result';   // 판이 도는 중 = 배팅 조작 잠금
  const notEnough = typeof points === 'number' && points < bet;
  const disabled = isStatic || busy || !isLoggedIn || notEnough;
  const showResult = phase === 'result';
  const picking = phase === 'picking';
  const handFilled = picked.length >= pickCount && autoShown >= autoCount;

  // 내 패 자리별 카드 — 앞 3장은 고른 후보, 뒤 2장은 자동 공개분.
  const handCardAt = (i) => {
    if (i < pickCount) {
      const choiceIndex = picked[i];
      return choiceIndex === undefined ? null : table?.choices[choiceIndex];
    }
    const autoIndex = i - pickCount;
    return autoIndex < autoShown ? result?.player.autoCards[autoIndex] : null;
  };

  // 1단계 — 배팅액을 걸고 공개 후보 5장을 받는다.
  const onDeal = async () => {
    if (disabled) return;
    setPhase('dealing');
    setMessage('');
    setTable(null);
    setPicked([]);
    setResult(null);
    setAutoShown(0);
    setDealerShown(0);

    const res = await apiRequest('/api/luck-draw/poker/deal', { method: 'POST', body: JSON.stringify({ bet }) })
      .catch(() => ({ ok: false, data: { error: '카드를 받지 못했습니다.' } }));
    if (!aliveRef.current) return;

    if (!res.ok) {
      setPhase('idle');
      if (typeof res.data?.points === 'number') setPoints(res.data.points);
      setMessage(res.data?.error || '카드를 받지 못했습니다.');
      return;
    }
    setTable(res.data.round);
    setPoints(res.data.points);
    setPhase('picking');
    if (res.data.resumed) setMessage('아직 끝나지 않은 판이 있어 그대로 이어서 진행합니다.');
  };

  // 3단계~5단계 — 고른 번호를 보내 정산하고, 자동 카드 → 딜러 패 → 결과 순으로 공개한다.
  const finishRound = async (picks) => {
    setPhase('auto');
    const [res] = await Promise.all([
      apiRequest('/api/luck-draw/poker/play', {
        method: 'POST',
        body: JSON.stringify({ roundId: table.roundId, picks }),
      }).catch(() => ({ ok: false, data: { error: '게임 진행에 실패했습니다.' } })),
      sleep(AUTO_STEP_MS), // 4번째 카드가 나오기 전 한 턴(2초)
    ]);
    if (!aliveRef.current) return;

    if (!res.ok) {
      setMessage(res.data?.error || '게임 진행에 실패했습니다.');
      setPhase('idle');
      setTable(null);
      loadConfig();
      return;
    }
    setResult(res.data);

    // 4·5번째 카드를 2초 간격으로 한 장씩
    for (let i = 1; i <= res.data.player.autoCards.length; i += 1) {
      if (i > 1) {
        // eslint-disable-next-line no-await-in-loop
        await sleep(AUTO_STEP_MS);
        if (!aliveRef.current) return;
      }
      setAutoShown(i);
    }

    // 내 패가 다 채워졌으면 딜러 패 공개
    await sleep(AUTO_STEP_MS);
    if (!aliveRef.current) return;
    setPhase('dealer');
    for (let i = 1; i <= res.data.dealer.cards.length; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await sleep(DEALER_STEP_MS);
      if (!aliveRef.current) return;
      setDealerShown(i);
    }

    // 결과 발표 — 포인트도 이때 갱신해야 연출과 숫자가 같이 움직인다
    await sleep(RESULT_DELAY_MS);
    if (!aliveRef.current) return;
    setPhase('result');
    setPoints(res.data.points);
  };

  // 2단계 — 공개 후보 클릭. pickCount 장을 다 고르면 바로 정산으로 넘어간다.
  const onPick = (index) => {
    if (!picking || picked.includes(index) || picked.length >= pickCount) return;
    const next = [...picked, index];
    setPicked(next);
    if (next.length >= pickCount) finishRound(next);
  };

  return (
    <>
      <h1>행운 티어 포커</h1>
      <p className="luck-desc">
        오늘의 행운 티어로 모은 포인트를 걸고 딜러와 {handSize}장씩 승부합니다.
        내 패는 자동으로 돌려주지 않습니다 — <strong>공개된 후보 {config?.choiceCount ?? 5}장 중 {pickCount}장을 직접 고르고</strong>,
        나머지 {autoCount}장은 {AUTO_STEP_MS / 1000}초 간격으로 자동으로 뽑힙니다.
        족보가 더 높으면 배팅액 × 배수만큼 포인트를 받고, 지면 배팅액을 잃습니다.
        한 번에 걸 수 있는 최대 배팅은 <strong>지금 가진 포인트 전부</strong>이며, 배팅액은 카드를 받는 순간 빠져나갑니다.
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
          {busy && table && <span className="poker-escrow">{table.bet}P 배팅 진행 중</span>}
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
        <button type="button" className="luck-draw-btn" onClick={onDeal} disabled={disabled}>
          {phase === 'dealing' ? '카드를 받는 중...'
            : picking ? `공개된 카드 중 ${pickCount}장을 고르세요 (${picked.length}/${pickCount})`
              : busy ? '카드를 돌리는 중...'
                : (notEnough ? '포인트가 부족합니다' : `${bet}P 걸고 승부하기`)}
        </button>
        {message && <p className="luck-draw-status">{message}</p>}
      </div>

      {phase !== 'idle' && (
        <div className="poker-table">
          <div className="poker-side">
            <div className="poker-side-title">딜러</div>
            <div className="poker-hand">
              {/* 딜러 패는 처음엔 전부 뒷면이고, 내 패가 다 채워진 뒤 한 장씩 뒤집힌다. */}
              {Array.from({ length: handSize }).map((_, i) => (
                <PokerCard
                  key={i}
                  card={result?.dealer.cards[i]}
                  suitMap={suitMap}
                  hidden={i >= dealerShown}
                  anim="poker-card-flip"
                />
              ))}
            </div>
            <div className="poker-hand-label">
              {showResult ? result.dealer.hand.label : '???'}
            </div>
          </div>

          <div
            className={`poker-verdict poker-verdict-${showResult ? result.outcome : 'dealing'}${showResult ? ' poker-verdict-reveal' : ''}`}
          >
            {showResult ? OUTCOME_TEXT[result.outcome] : 'VS'}
            {showResult && (
              <span className={`poker-delta${result.pointsDelta < 0 ? ' poker-delta-minus' : ''}`}>
                {result.pointsDelta > 0 ? '+' : ''}{result.pointsDelta}P
              </span>
            )}
          </div>

          <div className="poker-side">
            <div className="poker-side-title">내 패</div>
            <div className="poker-hand">
              {/* 왼쪽부터 채워진다 — 앞 3장은 내가 고른 카드, 뒤 2장은 자동으로 뽑힌 카드. */}
              {Array.from({ length: handSize }).map((_, i) => {
                const card = handCardAt(i);
                return card
                  ? <PokerCard key={i} card={card} suitMap={suitMap} anim="poker-card-dealt" />
                  : <PokerSlot key={i} />;
              })}
            </div>
            <div className={`poker-hand-label${handFilled ? ' poker-hand-label-on' : ''}`}>
              {handFilled
                ? `${result.player.hand.label} · ${result.player.hand.mult}배`
                : (picking
                  ? `고른 카드 ${picked.length}/${pickCount}장`
                  : `자동으로 뽑는 중... (${pickCount + autoShown}/${handSize})`)}
            </div>

            {/* 내 패 밑에 깔리는 공개 후보 — 여기서 직접 골라 위의 내 패를 채운다. */}
            {table && (
              <div className="poker-choice">
                <div className="poker-choice-title">
                  {picking
                    ? `공개된 카드 ${table.choices.length}장 중 ${pickCount}장을 고르세요 (${picked.length}/${pickCount})`
                    : `고른 ${pickCount}장 · 나머지는 버림`}
                </div>
                <div className="poker-choice-row">
                  {table.choices.map((card, i) => {
                    const order = picked.indexOf(i);
                    const isPicked = order >= 0;
                    const isDropped = !isPicked && !picking;
                    return (
                      <button
                        key={i}
                        type="button"
                        className={`poker-choice-card${isPicked ? ' is-picked' : ''}${isDropped ? ' is-dropped' : ''}`}
                        disabled={!picking || isPicked}
                        onClick={() => onPick(i)}
                      >
                        <PokerCard card={card} suitMap={suitMap} />
                        <span className="poker-choice-badge">
                          {isPicked ? `${order + 1}번째` : (isDropped ? '버림' : '선택')}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="poker-choice-note">
                  고른 {pickCount}장이 내 패가 되고, 고르지 않은 카드는 버려집니다.
                  나머지 {autoCount}장은 후보와 상관없이 새로 뽑아 {AUTO_STEP_MS / 1000}초 간격으로 붙습니다.
                </p>
              </div>
            )}
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
            <tr key={h.key} className={handFilled && result?.player.hand.key === h.key ? 'poker-hand-hit' : undefined}>
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
