// ========================================================
// LuckDraw — 오늘의 행운 티어 (React 내부 구현)
// ========================================================
// 판정(하루 20회 / 3분 쿨다운 / 확률 / 포인트)은 전부 서버가 한다. 이 화면은 서버 응답을
// 표시하고, 뽑기 직후 10초 서스펜스 연출만 담당한다.
// 게스트는 서버가 신원을 몰라 제한을 걸 수 없으므로 localStorage(luckDrawGuestState)로
// 24시간 안내만 흉내 낸다 — 보안이 아니라 UX 용도이며 홈 미니 위젯과 같은 키를 공유한다.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest, isStaticPreview } from '../lib/api';
import { tierImageUrl } from '../lib/paths';
import '../styles/luck-draw.css';

const TIER_LABELS = { 1: '1티어', 2: '2티어', 3: '3티어', 4: '4티어', 5: '5티어', 6: '6티어', 7: '7티어', 8: '8티어', 9: '9티어' };
const tierLabel = (t) => TIER_LABELS[t] || `${t}티어`;

// 서버 상수와 같은 값 — 서버 응답 전에 보여줄 안내 문구용 기본값
const MEMBER_DAILY_LIMIT_FALLBACK = 20;
const MEMBER_COOLDOWN_SEC_FALLBACK = 180;
const GUEST_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const GUEST_KEY = 'luckDrawGuestState';
const DRAW_SUSPENSE_MS = 10000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function formatCountdown(totalSeconds) {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const pad = (n) => String(n).padStart(2, '0');
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`;
}

function readGuestState() {
  try {
    const raw = localStorage.getItem(GUEST_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function LuckDraw() {
  const { hash } = useLocation();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const isStatic = isStaticPreview();

  const tab = hash === '#random' ? 'random' : 'daily';
  const [config, setConfig] = useState(null);          // { weights, pointsTable, ... }
  const [status, setStatus] = useState(null);          // 회원: 서버가 준 오늘 상태
  const [history, setHistory] = useState(null);
  const [result, setResult] = useState(null);          // { result, guest, pointsDelta }
  const [statusText, setStatusText] = useState('');
  const [drawing, setDrawing] = useState(false);
  const [reel, setReel] = useState(1);
  const [cooldownLeft, setCooldownLeft] = useState(0); // 초 — 회원 쿨다운·게스트 24시간 공용
  const reelTimer = useRef(null);
  const barRef = useRef(null);

  useEffect(() => { document.title = '행운 뽑기 | 휴버대 티어표'; }, []);

  // ── 쿨다운 카운트다운 (회원/게스트 공용, 화면에 하나만 존재) ──
  useEffect(() => {
    if (cooldownLeft <= 0) return undefined;
    const timer = setInterval(() => setCooldownLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldownLeft > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 초기 로드: 설정 + (회원)오늘 상태·이력 / (게스트)localStorage 복원 ──
  const loadStatus = useCallback(async () => {
    if (isStatic) return;
    if (!isLoggedIn) {
      const state = readGuestState();
      if (!state) {
        setStatusText(`비회원은 24시간에 한 번 체크할 수 있어요. 로그인하면 하루 ${MEMBER_DAILY_LIMIT_FALLBACK}번(${MEMBER_COOLDOWN_SEC_FALLBACK / 60}분 간격)까지 뽑을 수 있습니다.`);
        return;
      }
      setResult({ result: state.result, guest: true });
      const remainingMs = GUEST_COOLDOWN_MS - (Date.now() - state.lastDrawAt);
      if (remainingMs > 0) setCooldownLeft(Math.ceil(remainingMs / 1000));
      else setStatusText('이제 다시 체크할 수 있어요.');
      return;
    }

    const today = await apiRequest('/api/luck-draw/today').catch(() => null);
    if (today?.ok) {
      if (today.data.lastResult) setResult({ result: today.data.lastResult, guest: false });
      setStatus(today.data);
      setCooldownLeft(today.data.cooldownRemainingSec || 0);
    }
    const hist = await apiRequest('/api/luck-draw/history?page=1').catch(() => null);
    if (hist?.ok) setHistory(hist.data.items || []);
  }, [isLoggedIn, isStatic]);

  useEffect(() => {
    if (isStatic) return;
    apiRequest('/api/luck-draw/config', { auth: false })
      .then((res) => { if (res.ok) setConfig(res.data); })
      .catch(() => {});
    loadStatus();
  }, [loadStatus, isStatic]);

  // 회원 상태 문구는 서버 응답을 그대로 표시만 한다
  useEffect(() => {
    if (!isLoggedIn || !status) return;
    const points = typeof status.points === 'number' ? ` · 보유 포인트 ${status.points}P` : '';
    if (status.remainingToday <= 0) {
      setStatusText(`오늘 ${status.dailyLimit}/${status.dailyLimit}회를 모두 사용했습니다.${points}`);
    } else {
      setStatusText(`오늘 남은 횟수 ${status.remainingToday}/${status.dailyLimit}${points}`);
    }
  }, [isLoggedIn, status]);

  // 게스트 카운트다운이 끝나면 안내 문구를 바꿔준다
  useEffect(() => {
    if (isLoggedIn || cooldownLeft > 0) return;
    if (readGuestState()) setStatusText('이제 다시 체크할 수 있어요.');
  }, [isLoggedIn, cooldownLeft]);

  useEffect(() => () => clearInterval(reelTimer.current), []);

  // 진행 바는 drawing 이 true 가 된 "뒤"에야 DOM 에 생기므로 effect 에서 폭을 준다.
  // 0% 를 실제로 반영시킨 뒤(offsetHeight 강제 리플로우) transition 을 걸어야 애니메이션이 생략되지 않는다.
  useEffect(() => {
    if (!drawing || !barRef.current) return;
    const bar = barRef.current;
    bar.style.transition = 'none';
    bar.style.width = '0%';
    void bar.offsetHeight;
    bar.style.transition = `width ${DRAW_SUSPENSE_MS}ms linear`;
    bar.style.width = '100%';
  }, [drawing]);

  const limitReached = Boolean(isLoggedIn && status && status.remainingToday <= 0);
  const disabled = isStatic || drawing || limitReached || cooldownLeft > 0;

  const buttonLabel = (() => {
    if (drawing) return '뽑는 중...';
    if (limitReached) return '오늘 뽑기 횟수 소진 (내일 다시)';
    if (cooldownLeft > 0) return isLoggedIn ? `다음 뽑기까지 ${formatCountdown(cooldownLeft)}` : `다음 체크까지 ${formatCountdown(cooldownLeft)}`;
    return '오늘의 행운 뽑기';
  })();

  const onDraw = async () => {
    if (disabled) return;

    // 게스트가 24시간 내 재클릭이면 서버 호출 없이 안내만
    if (!isLoggedIn) {
      const state = readGuestState();
      if (state && Date.now() - state.lastDrawAt < GUEST_COOLDOWN_MS) {
        window.alert(
          `로그인하면 하루 최대 ${MEMBER_DAILY_LIMIT_FALLBACK}번(${MEMBER_COOLDOWN_SEC_FALLBACK / 60}분 간격)까지 뽑을 수 있어요!\n`
          + '비회원은 24시간에 한 번만 체크할 수 있습니다.\n'
          + '로그인하고 다시 시도하거나, 24시간 뒤에 다시 방문해주세요.',
        );
        return;
      }
    }

    setDrawing(true);
    setStatusText('');
    setResult(null);

    // 슬롯머신 릴 (연출용, 실제 결과와 무관). 진행 바는 위 effect 가 담당.
    let n = 1;
    reelTimer.current = setInterval(() => { n = (n % 9) + 1; setReel(n); }, 90);

    const [res] = await Promise.all([
      apiRequest('/api/luck-draw/daily', { method: 'POST' }).catch(() => ({ ok: false, data: { error: '뽑기에 실패했습니다.' } })),
      sleep(DRAW_SUSPENSE_MS),
    ]);

    clearInterval(reelTimer.current);
    setDrawing(false);

    if (!res.ok) {
      if (res.data?.cooldown) setCooldownLeft(res.data.cooldownRemainingSec || 0);
      if (res.data?.limitReached || res.data?.cooldown) setStatus((cur) => ({ ...cur, ...res.data }));
      setStatusText(res.data?.error || '뽑기에 실패했습니다.');
      return;
    }

    const drawn = res.data.result || res.data;
    const guest = !isLoggedIn || res.data.saved === false;
    setResult({ result: drawn, guest, pointsDelta: res.data.pointsDelta });

    if (guest) {
      try {
        localStorage.setItem(GUEST_KEY, JSON.stringify({ lastDrawAt: Date.now(), result: drawn }));
      } catch { /* ignore */ }
      setCooldownLeft(Math.ceil(GUEST_COOLDOWN_MS / 1000));
      setStatusText('체크 결과입니다. 로그인하면 기록이 남아요.');
      return;
    }

    // 회원은 서버가 준 최신 상태로 갱신 (남은 횟수·쿨다운·이력)
    setCooldownLeft(res.data.cooldownRemainingSec || 0);
    loadStatus();
  };

  const pointsTable = config?.pointsTable || {};
  const weights = config?.weights || {};

  return (
    <div className="luck-draw-page">
      <div className="luck-draw-tabs">
        <button
          type="button"
          className={`luck-tab${tab === 'daily' ? ' active' : ''}`}
          onClick={() => navigate('/luck-draw#daily', { replace: true })}
        >
          오늘의 행운 티어
        </button>
        <button type="button" className="luck-tab" disabled title="준비 중">랜덤 뽑기 (준비 중)</button>
      </div>

      <section className={`luck-tab-panel${tab === 'daily' ? ' active' : ''}`}>
        <h1>오늘의 행운 티어</h1>
        <p className="luck-desc">버튼을 누르면 서버가 확률에 따라 오늘의 티어와 캐릭터를 뽑아줍니다.</p>

        {isStatic && (
          <div className="luck-static-guard">
            이 기능은 서버가 필요합니다. 로컬(:5000) 또는 배포된 사이트에서 이용해주세요.
          </div>
        )}

        {!drawing && (
          <button type="button" className="luck-draw-btn" onClick={onDraw} disabled={disabled}>
            {buttonLabel}
          </button>
        )}
        {statusText && <p className="luck-draw-status">{statusText}</p>}

        {drawing && (
          <div className="luck-draw-loading">
            <div className="luck-draw-loading-reel">{reel}</div>
            <p className="luck-draw-loading-text">두근두근... 오늘의 운명을 뽑는 중</p>
            <div className="luck-draw-loading-bar">
              <div ref={barRef} className="luck-draw-loading-bar-fill" />
            </div>
          </div>
        )}

        {!drawing && result?.result && (
          <div className="luck-result-card">
            <img className="luck-result-image" src={tierImageUrl(result.result.imagePath)} alt={result.result.characterName} />
            <div className="luck-result-tier">{tierLabel(result.result.tier)}</div>
            <div className="luck-result-name">{result.result.characterName}</div>
            {typeof result.pointsDelta === 'number' && (
              <span className={`luck-result-points${result.pointsDelta < 0 ? ' luck-result-points-minus' : ''}`}>
                {result.pointsDelta >= 0 ? '+' : ''}{result.pointsDelta}P
              </span>
            )}
            <Link className="luck-result-tier-link" to={`/tier/${result.result.tier}`}>공식 티어표에서 보기 →</Link>
            {result.guest && (
              <p className="luck-guest-notice">
                체크 결과 · 저장되지 않았습니다
                {' '}<Link to="/login">로그인하고 기록 남기기</Link>
              </p>
            )}
          </div>
        )}

        <table className="luck-probability-table">
          <caption>티어별 당첨 확률</caption>
          <thead>
            <tr><th>티어</th><th>확률</th><th>포인트</th></tr>
          </thead>
          <tbody>
            {Object.keys(weights).sort((a, b) => Number(a) - Number(b)).map((t) => {
              const p = pointsTable[t];
              return (
                <tr key={t}>
                  <td>{tierLabel(t)}</td>
                  <td>{weights[t]}%</td>
                  <td>{typeof p === 'number' ? `${p >= 0 ? '+' : ''}${p}P` : '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="luck-history">
          <h2>내 기록</h2>
          <div className="luck-history-list">
            {!isLoggedIn && <p className="luck-history-empty">로그인하면 내 뽑기 기록을 볼 수 있어요.</p>}
            {isLoggedIn && history && history.length === 0 && <p className="luck-history-empty">아직 기록이 없습니다.</p>}
            {isLoggedIn && history?.map((item, i) => {
              const p = pointsTable[item.tier];
              const pts = typeof p === 'number' ? ` · ${p >= 0 ? '+' : ''}${p}P` : '';
              return (
                <div className="luck-history-item" key={item._id || i}>
                  {`${item.drawDate} · ${tierLabel(item.tier)} · ${item.characterName}${pts}`}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
