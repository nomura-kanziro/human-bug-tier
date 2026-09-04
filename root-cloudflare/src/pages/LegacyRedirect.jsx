// 바닐라 시대 URL(예: /tier-class/tier1.html, /notice/notice-detail.html?id=…)로 들어오면
// legacyToRoute() 로 React 라우트에 리다이렉트한다. 알림 link·외부 공유 링크 호환용.
import { Navigate, useLocation } from 'react-router-dom';
import { legacyToRoute } from '../lib/paths';

export default function LegacyRedirect() {
  const { pathname, search } = useLocation();
  const target = legacyToRoute(`${pathname}${search}`);
  if (target === `${pathname}${search}`) {
    return (
      <main style={{ maxWidth: 720, margin: '48px auto', padding: '0 20px', textAlign: 'center' }}>
        <h2>페이지를 찾을 수 없습니다</h2>
        <p style={{ opacity: 0.7 }}><code>{pathname}</code></p>
        <a href="/" style={{ display: 'inline-block', marginTop: 24 }}>← 홈으로</a>
      </main>
    );
  }
  return <Navigate to={target} replace />;
}
