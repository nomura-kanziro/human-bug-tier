// 인증 페이지 공용 껍데기 (login.html / sign_up.html / find_account.html / reset_password.html)
// 바닐라의 이 4개 페이지는 공용 헤더/푸터를 쓰지 않고 로고 + 우상단 테마 토글만 직접 얹었다.
// React 도 Layout 밖(라우트에서 제외)에 두고 같은 마크업을 재현한다.
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import LoadingScreen from './LoadingScreen';
import ThemeToggle from './ThemeToggle';
import { LOGO_URL } from '../lib/paths';

export default function AuthShell({ title, children }) {
  useEffect(() => { document.title = title; }, [title]);

  return (
    <div className="auth-page">
      <LoadingScreen />
      {/* 공용 헤더가 없는 단독 페이지라 토글을 우상단에 고정으로 띄운다(theme-toggle-floating) */}
      <div className="theme-toggle-floating-wrap">
        <ThemeToggle floating />
      </div>
      <Link to="/" className="logo" style={{ textDecoration: 'none' }}>
        <img src={LOGO_URL} alt="로고" className="logo-img" />
        휴버대 티어표
      </Link>
      <div className="login-wrapper">
        <div className="login-box">{children}</div>
        {/* 오른쪽 컬러 영역 (기능 없음, 순수 장식) */}
        <div className="side-panel" />
      </div>
    </div>
  );
}
