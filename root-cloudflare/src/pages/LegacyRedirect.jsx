// 바닐라 시대 URL(예: /tier-class/tier1.html, /notice/notice-detail.html?id=…)로 들어오면
// legacyToRoute() 로 React 라우트에 리다이렉트한다. 알림 link·외부 공유 링크 호환용.
import { Link, Navigate, useLocation } from 'react-router-dom';
import { legacyToRoute } from '../lib/paths';

export default function LegacyRedirect() {
  const { pathname, search } = useLocation();
  const target = legacyToRoute(`${pathname}${search}`);
  if (target === `${pathname}${search}`) {
    return (
      <section className="not-found">
        <span className="not-found-code" aria-hidden="true">404</span>
        <h2>페이지를 찾을 수 없습니다</h2>
        <p>주소가 바뀌었거나 없어진 페이지예요.</p>
        <code>{pathname}</code>
        <div className="not-found-actions">
          <Link to="/" className="not-found-btn is-primary">홈으로</Link>
          <Link to="/tier/1" className="not-found-btn">티어표 보기</Link>
          <Link to="/board" className="not-found-btn">커스텀 게시판</Link>
        </div>
      </section>
    );
  }
  return <Navigate to={target} replace />;
}
