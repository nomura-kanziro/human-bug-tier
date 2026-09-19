// ========================================================
// LuckLadderPanel — 랜덤 뽑기 (사다리 게임 스타일 배팅)
// ========================================================
// "오늘의 행운 티어"와 달리 서버가 관리하는 고정 캐릭터 풀이 아니라, 유저가 커스텀
// 메이커(로컬 작업 중인 티어표, customMakerTierState)에 직접 배치한 캐릭터를 추첨
// 대상으로 쓴다. 그래서 확률은 유저가 어느 티어에 몇 명을 배치했느냐에 따라 달라진다.
// 실제 추첨·좌우 판정·배당 정산은 전부 서버(POST /ladder/play)가 하고, 여기서는
// 로컬 배치 현황을 모아 보내고 결과를 표시하는 일만 한다.
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { TIERS } from '../data/tiers';
import { apiRequest, isStaticPreview } from '../lib/api';
import { loadMakerState, zoneKey } from '../lib/makerState';
import { tierImageUrl } from '../lib/paths';
import '../styles/luck-ladder.css';

const DEAL_SUSPENSE_MS = 1400;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const OUTCOME_TEXT = { win: '승리!', lose: '패배' };
const GROUP_LABELS = { 123: '1~3티어', 456: '4~6티어', 789: '7~9티어' };
const GROUP_ORDER = ['123', '456', '789'];

// 로컬(customMakerTierState)에 배치된 캐릭터를 티어 번호별 배열로 모은다 —
// 배열 길이가 곧 그 티어의 추첨 가중치(서버가 신뢰하는 값)가 된다.
function buildTierPool(state) {
  const pool = {};
  TIERS.forEach((t, tierIndex) => {
    const chars = [];
    t.subTiers.forEach((sub) => {
      (state[zoneKey(tierIndex, sub)] || []).forEach((c) => {
        if (c?.name) chars.push({ name: c.name, img: c.img || '' });
      });
    });
    pool[t.tier] = chars;
  });
  return pool;
}

export default function LuckLadderPanel({ isLoggedIn }) {
  const isStatic = isStaticPreview();
  const [config, setConfig] = useState(null);
  const [points, setPoints] = useState(null);
  const [pool, setPool] = useState(() => buildTierPool(loadMakerState()));
  const [bet, setBet] = useState(10);
  const [betType, setBetType] = useState('group');
  const [betValue, setBetValue] = useState('123');
  const [round, setRound] = useState(null);
  const [dealing, setDealing] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isStatic) return;
    apiRequest('/api/luck-draw/ladder/config')
      .then((res) => {
        if (!res.ok) return;
        setConfig(res.data);
        if (typeof res.data.points === 'number') setPoints(res.data.points);
      })
      .catch(() => {});
  }, [isStatic, isLoggedIn]);

  const tierCounts = useMemo(() => TIERS.map((t) => ({ tier: t.tier, count: pool[t.tier]?.length || 0 })), [pool]);
  const total = tierCounts.reduce((sum, t) => sum + t.count, 0);

  const refreshPool = () => setPool(buildTierPool(loadMakerState()));

  const minBet = config?.minBet ?? 1;
  const maxBet = config?.maxBet ?? 100;
  const groupMult = config?.groupMult ?? 1.95;
  const parityMult = config?.parityMult ?? 1.95;
  const sideMult = config?.sideMult ?? 1.95;
  const exactMult = config?.exactMult || {};

  const currentMult = betType === 'group' ? groupMult
    : betType === 'parity' ? parityMult
      : betType === 'side' ? sideMult
        : (exactMult[betValue] ?? 0);

  const notEnough = typeof points === 'number' && points < bet;
  const disabled = isStatic || dealing || !isLoggedIn || notEnough || total === 0;

  const chooseBet = (type, value) => { setBetType(type); setBetValue(value); };

  const onPlay = async () => {
    if (disabled) return;
    setDealing(true);
    setMessage('');
    setRound(null);

    const [res] = await Promise.all([
      apiRequest('/api/luck-draw/ladder/play', {
        method: 'POST',
        body: JSON.stringify({ bet, betType, betValue, characters: pool }),
      }).catch(() => ({ ok: false, data: { error: '게임 진행에 실패했습니다.' } })),
      sleep(DEAL_SUSPENSE_MS),
    ]);

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
      <h1>랜덤 뽑기</h1>
      <p className="luck-desc">
        커스텀 메이커에 직접 배치한 캐릭터 중 한 명을 사다리 게임처럼 추첨합니다.
        묶음 티어·홀짝·좌우는 각각 {groupMult}배, 같은 티어는 티어별 배수가 다릅니다.
      </p>
      <p className="ladder-warning">
        ⚠️ 승리하면 배팅액 × 배수만큼 얻지만, <strong>패배해도 배팅액 × 배수만큼 그대로 잃습니다.</strong>
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
      {!isStatic && isLoggedIn && total === 0 && (
        <div className="luck-static-guard">
          아직 티어표에 배치된 캐릭터가 없습니다. <Link to="/custom-maker">커스텀 메이커에서 배치하기 →</Link>
        </div>
      )}

      <div className="ladder-pool-status">
        <div className="ladder-pool-head">
          <span>내 티어표 배치 현황 (총 {total}명)</span>
          <button type="button" className="ladder-refresh-btn" onClick={refreshPool}>다시 불러오기</button>
        </div>
        <div className="ladder-pool-bars">
          {tierCounts.map(({ tier, count }) => (
            <div className="ladder-pool-row" key={tier}>
              <span className="ladder-pool-tier">{tier}티어</span>
              <span className="ladder-pool-count">{count}명</span>
            </div>
          ))}
        </div>
      </div>

      <div className="ladder-betting">
        <div className="ladder-points">
          보유 포인트 <strong>{typeof points === 'number' ? `${points}P` : '-'}</strong>
        </div>

        <div className="ladder-bet-group">
          <span className="ladder-bet-group-label">묶음 티어 ({groupMult}배)</span>
          <div className="ladder-bet-options">
            {GROUP_ORDER.map((g) => (
              <button
                key={g}
                type="button"
                className={`ladder-opt-btn${betType === 'group' && betValue === g ? ' is-active' : ''}`}
                onClick={() => chooseBet('group', g)}
              >
                {GROUP_LABELS[g]}
              </button>
            ))}
          </div>
        </div>

        <div className="ladder-bet-group">
          <span className="ladder-bet-group-label">홀수 / 짝수 ({parityMult}배)</span>
          <div className="ladder-bet-options">
            <button type="button" className={`ladder-opt-btn${betType === 'parity' && betValue === 'odd' ? ' is-active' : ''}`} onClick={() => chooseBet('parity', 'odd')}>홀수</button>
            <button type="button" className={`ladder-opt-btn${betType === 'parity' && betValue === 'even' ? ' is-active' : ''}`} onClick={() => chooseBet('parity', 'even')}>짝수</button>
          </div>
        </div>

        <div className="ladder-bet-group">
          <span className="ladder-bet-group-label">좌 / 우 ({sideMult}배)</span>
          <div className="ladder-bet-options">
            <button type="button" className={`ladder-opt-btn${betType === 'side' && betValue === 'left' ? ' is-active' : ''}`} onClick={() => chooseBet('side', 'left')}>좌</button>
            <button type="button" className={`ladder-opt-btn${betType === 'side' && betValue === 'right' ? ' is-active' : ''}`} onClick={() => chooseBet('side', 'right')}>우</button>
          </div>
        </div>

        <div className="ladder-bet-group">
          <span className="ladder-bet-group-label">같은 티어 (지목한 티어만 적중)</span>
          <div className="ladder-bet-options">
            {TIERS.map((t) => (
              <button
                key={t.tier}
                type="button"
                className={`ladder-opt-btn${betType === 'exact' && Number(betValue) === t.tier ? ' is-active' : ''}`}
                onClick={() => chooseBet('exact', t.tier)}
              >
                {t.tier}티어 · {exactMult[t.tier] ?? '-'}배
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
            max={maxBet}
            value={bet}
            disabled={dealing}
            onChange={(e) => {
              const v = Math.trunc(Number(e.target.value));
              setBet(Number.isFinite(v) ? Math.min(maxBet, Math.max(minBet, v)) : minBet);
            }}
          />
          <span className="ladder-bet-unit">P</span>
          {[10, 50, maxBet].map((v) => (
            <button key={v} type="button" className="ladder-bet-chip" disabled={dealing} onClick={() => setBet(Math.min(maxBet, Math.max(minBet, v)))}>
              {v === maxBet ? `최대 ${maxBet}` : v}
            </button>
          ))}
        </div>

        <button type="button" className="luck-draw-btn" onClick={onPlay} disabled={disabled}>
          {dealing ? '추첨 중...' : (notEnough ? '포인트가 부족합니다' : `${bet}P 걸고 ${currentMult || '-'}배 도전`)}
        </button>
        {message && <p className="luck-draw-status">{message}</p>}
      </div>

      {(dealing || round) && (
        <div className="ladder-result">
          {dealing ? (
            <div className="ladder-result-dealing">사다리를 타는 중...</div>
          ) : (
            <>
              <div className="ladder-result-card">
                {round.character?.img && (
                  <img className="ladder-result-img" src={tierImageUrl(round.character.img)} alt={round.character.name} />
                )}
                <div className="ladder-result-info">
                  <div className="ladder-result-tier">{round.tier}티어</div>
                  <div className="ladder-result-name">{round.character?.name || '이름 없음'}</div>
                  <div className="ladder-result-side">{round.side === 'left' ? '좌' : '우'} 도착</div>
                </div>
              </div>
              <div className={`ladder-verdict ladder-verdict-${round.outcome}`}>
                {OUTCOME_TEXT[round.outcome]}
                <span className={`ladder-delta${round.pointsDelta < 0 ? ' ladder-delta-minus' : ''}`}>
                  {round.pointsDelta > 0 ? '+' : ''}{round.pointsDelta}P
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
