// 홈 화면 행운 뽑기 미니 위젯 (index-home.js initHomeLuckDraw 이식)
//  - luck-draw 페이지와 같은 API(POST /api/luck-draw/daily)·게스트 키(luckDrawGuestState) 사용
//  - 게스트는 서버 기록이 없으므로 24시간 재클릭을 localStorage 로만 안내(서버 호출 없음)
//  - 릴 애니메이션(90ms) + 최소 2.2초 대기 후 결과 표시
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest, isStaticPreview } from '../lib/api';
import { tierImageUrl } from '../lib/paths';

const GUEST_KEY = 'luckDrawGuestState';
const GUEST_MS = 24 * 60 * 60 * 1000;
const TIER_LABELS = { 1: '1티어', 2: '2티어', 3: '3티어', 4: '4티어', 5: '5티어', 6: '6티어', 7: '7티어', 8: '8티어', 9: '9티어' };

const loggedIn = () => Boolean(localStorage.getItem('authToken'));

export default function HomeLuckWidget() {
  const [stage, setStage] = useState('placeholder'); // placeholder | loading | result
  const [reel, setReel] = useState(1);
  const [result, setResult] = useState(null);
  const [guest, setGuest] = useState(false);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const timerRef = useRef(null);
  const isStatic = isStaticPreview();

  useEffect(() => () => clearInterval(timerRef.current), []);

  const showResult = (r, g) => {
    setResult(r);
    setGuest(g);
    setStage('result');
  };

  const draw = async () => {
    if (!loggedIn()) {
      try {
        const state = JSON.parse(localStorage.getItem(GUEST_KEY) || 'null');
        if (state && Date.now() - state.lastDrawAt < GUEST_MS) {
          setStatus('게스트는 24시간에 한 번 체크할 수 있어요. 로그인하면 바로 가능합니다.');
          if (state.result) showResult(state.result, true);
          return;
        }
      } catch { /* ignore */ }
    }

    setBusy(true);
    setStatus('');
    setStage('loading');
    let n = 1;
    timerRef.current = setInterval(() => { n = (n % 9) + 1; setReel(n); }, 90);

    const wait = new Promise((resolve) => setTimeout(resolve, 2200));
    let res;
    try {
      res = await apiRequest('/api/luck-draw/daily', { method: 'POST' });
    } catch {
      res = { ok: false, data: { error: '뽑기에 실패했습니다.' } };
    }
    await wait;
    clearInterval(timerRef.current);

    if (!res.ok) {
      setBusy(false);
      setStage('placeholder');
      if (res.data?.cooldown) setStatus('잠시 후 다시 뽑아 주세요.');
      else if (res.data?.limitReached) setStatus('오늘 횟수를 모두 썼습니다.');
      else setStatus(res.data?.error || '뽑기에 실패했습니다.');
      return;
    }

    const r = res.data.result || res.data;
    const g = !loggedIn() || res.data.saved === false;
    showResult(r, g);
    if (g) {
      try { localStorage.setItem(GUEST_KEY, JSON.stringify({ lastDrawAt: Date.now(), result: r })); } catch { /* ignore */ }
    }
    setBusy(false);
    setStatus(g ? '체크 결과입니다. 로그인하면 기록이 남아요.' : '기록이 저장되었습니다.');
  };

  return (
    <section id="home-luck-preview" className="home-luck-preview">
      <div className="home-luck-inner">
        <div className="home-luck-copy">
          <p className="home-luck-kicker">Luck Draw</p>
          <h2>오늘의 행운 티어</h2>
          <p className="home-luck-desc">한 번 뽑아 보세요. 회원은 기록이 남고, 게스트는 체크만 할 수 있습니다.</p>
          <Link className="home-luck-more" to="/luck-draw#daily">자세히 보기 →</Link>
        </div>
        <div className="home-luck-widget">
          <p id="home-luck-static" className="home-luck-static" hidden={!isStatic}>서버가 있는 환경에서 뽑을 수 있습니다.</p>
          <button type="button" id="home-luck-btn" className="home-luck-btn" disabled={busy || isStatic} onClick={draw}>
            오늘의 행운 뽑기
          </button>
          <div className="home-luck-stage">
            <div id="home-luck-placeholder" className="home-luck-placeholder" hidden={stage !== 'placeholder'}>
              <span className="home-luck-placeholder-mark">?</span>
              <span className="home-luck-placeholder-text">버튼을 누르면 오늘의 티어가 나옵니다</span>
            </div>
            <div id="home-luck-loading" className="home-luck-loading" hidden={stage !== 'loading'}>
              <span id="home-luck-reel">{reel}</span>
              <span className="home-luck-placeholder-text">뽑는 중…</span>
            </div>
            <div id="home-luck-result" className="home-luck-result" hidden={stage !== 'result'}>
              <img id="home-luck-img" src={result ? tierImageUrl(result.imagePath) : ''} alt={result?.characterName || ''} />
              <div className="home-luck-result-copy">
                <div id="home-luck-tier" className="home-luck-tier">{result ? (TIER_LABELS[result.tier] || `${result.tier}티어`) : ''}</div>
                <div id="home-luck-name" className="home-luck-name">{result?.characterName || ''}</div>
                <p id="home-luck-guest" className="home-luck-guest" hidden={!guest}>체크 결과 · 저장되지 않음</p>
              </div>
            </div>
          </div>
          <p id="home-luck-status" className="home-luck-status" hidden={!status}>{status}</p>
        </div>
      </div>
    </section>
  );
}
