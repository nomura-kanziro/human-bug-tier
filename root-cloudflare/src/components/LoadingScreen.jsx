// 사이트 초기 로딩 오버레이 (loading-screen.html/js 이식).
// 바닐라는 header/footer fetch 완료 시점에 숨겼는데, React 는 첫 렌더에 헤더가 이미 있으므로
// 마운트 직후 짧은 페이드로 치운다. bfcache 복원(pageshow persisted)은 즉시 제거.
import { useEffect, useState } from 'react';
import { LOGO_URL } from '../lib/paths';

export default function LoadingScreen() {
  const [phase, setPhase] = useState('show'); // show → hiding → gone

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('hiding'), 0);
    const t2 = setTimeout(() => setPhase('gone'), 300);
    const onPageShow = (e) => { if (e.persisted) setPhase('gone'); };
    window.addEventListener('pageshow', onPageShow);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, []);

  if (phase === 'gone') return null;

  return (
    <div
      className={`site-loading-screen${phase === 'hiding' ? ' is-hidden' : ''}`}
      id="site-loading-screen"
      role="status"
      aria-live="polite"
      aria-label="불러오는 중"
    >
      <div className="site-loading-inner">
        <svg className="site-loading-svg" viewBox="0 0 100 100" aria-hidden="true">
          <circle className="site-loading-track" cx="50" cy="50" r="37" />
          <circle className="site-loading-track" cx="50" cy="50" r="30" />
          <circle pathLength="360" className="site-loading-dash big" style={{ '--sped': '3.6s' }} cx="50" cy="50" r="37" />
          <circle pathLength="360" className="site-loading-dash" style={{ '--sped': '2s' }} cx="50" cy="50" r="30" />
        </svg>
        <img src={LOGO_URL} alt="" className="site-loading-logo" />
      </div>
      <p className="site-loading-text">불러오는 중…</p>
    </div>
  );
}
