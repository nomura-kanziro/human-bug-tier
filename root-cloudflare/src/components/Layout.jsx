// 모든 라우트가 공유하는 레이아웃: 헤더 + <Outlet/> + 푸터. 라우트 이동 시 스크롤을 맨 위로.
import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Footer from './Footer';
import Header from './Header';

export default function Layout() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) { el.scrollIntoView(); return; }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return (
    <>
      <Header />
      {/* 본문이 짧아도 푸터가 화면 바닥에 붙도록 본문+푸터를 한 덩어리로 묶는다(app-shell.css).
          헤더는 밖에 둔다 — sticky 가 그대로 동작해야 하기 때문. */}
      <div className="app-body">
        <div className="app-main">
          <Outlet />
        </div>
        <Footer />
      </div>
    </>
  );
}
