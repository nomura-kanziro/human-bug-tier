// 인증 페이지 공용 껍데기 (login.html / sign_up.html / find_account.html / reset_password.html)
// 바닐라의 이 4개 페이지는 공용 헤더/푸터를 쓰지 않고 로고 + 우상단 테마 토글만 직접 얹었다.
// React 도 Layout 밖(라우트에서 제외)에 두고 같은 마크업을 재현한다.
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import { LOGO_URL } from '../lib/paths';
// 네 페이지가 공유하는 껍데기 스타일 — 예전엔 페이지 CSS 마다 복사돼 있었다
import '../styles/auth-shell.css';

export default function AuthShell({ title, children }) {
  useEffect(() => { document.title = title; }, [title]);

  return (
    <div className="auth-page">
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
        {/* 오른쪽 브랜드 패널 — 원래는 빈 단색 사각형이었다. 아무것도 없으니 화면이
            "만들다 만" 느낌이라, 로고와 한 줄 소개를 넣어 표지 역할을 하게 했다.
            좁은 화면(768px 이하)에서는 auth-shell.css 가 통째로 숨긴다. */}
        <div className="side-panel">
          <img src={LOGO_URL} alt="" className="side-panel-logo" />
          <strong className="side-panel-title">휴버대 티어표</strong>
          <span className="side-panel-desc">휴먼버그대학교 캐릭터 공식 티어표<br />커스텀 티어표 제작 · 행운 뽑기</span>
        </div>
      </div>
    </div>
  );
}
