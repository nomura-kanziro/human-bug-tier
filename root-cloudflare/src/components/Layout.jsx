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
      <Outlet />
      <Footer />
    </>
  );
}
