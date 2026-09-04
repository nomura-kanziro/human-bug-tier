// 공통 헤더 (header.html + common.js 헤더 로직 이식)
//  - 데스크톱 드롭다운 3개(티어표/커스텀 메이커/행운 뽑기)는 CSS :hover, 모바일 사이드 메뉴는 클릭 아코디언
//  - 우측: 테마 토글 + 후원 + (로그인: 알림벨·프로필 / 비로그인: 로그인 버튼) + 햄버거
//  - 알림 패널과 프로필 드롭다운은 동시에 열리지 않는다(상호배타). 바깥 클릭 시 둘 다 닫힘.
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isStaticPreview } from '../lib/api';
import { LOGO_URL } from '../lib/paths';
import NotificationBell from './NotificationBell';
import SponsorButton from './SponsorButton';
import ThemeToggle from './ThemeToggle';
import UserProfileMenu from './UserProfileMenu';

const TIERS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

// 데스크톱/사이드 메뉴가 공유하는 메뉴 정의. soon=true 는 "(준비 중)" 비활성 항목.
const MENUS = [
  { label: '티어표', items: TIERS.map((n) => ({ to: `/tier/${n}`, label: `${n}티어` })) },
  {
    label: '커스텀 메이커',
    items: [
      { to: '/custom-maker', label: '• 제작하기' },
      { to: '/board', label: '• 게시판' },
      { soon: true, label: '• 이벤트 (준비 중)' },
    ],
  },
  {
    label: '행운 뽑기',
    items: [
      { to: '/luck-draw#daily', label: '• 오늘의 행운 티어' },
      { soon: true, label: '• 랜덤 뽑기 (준비 중)' },
    ],
  },
];

function MenuLink({ item, onClick }) {
  if (item.soon) {
    return <a href="#" className="nav-soon" title="준비 중" onClick={(e) => e.preventDefault()}>{item.label}</a>;
  }
  return <NavLink to={item.to} onClick={onClick}>{item.label}</NavLink>;
}

export default function Header() {
  const { isLoggedIn } = useAuth();
  const [sideOpen, setSideOpen] = useState(false);
  const [sideActive, setSideActive] = useState(null);
  const [panel, setPanel] = useState(null); // 'profile' | 'bell' | null
  const bellRef = useRef(null);
  const profileRef = useRef(null);

  // 바깥 클릭 → 열린 패널 닫기 (프로필/알림 공용)
  useEffect(() => {
    if (!panel) return undefined;
    const onDoc = (e) => {
      if (bellRef.current?.contains(e.target) || profileRef.current?.contains(e.target)) return;
      setPanel(null);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, [panel]);

  const closeSide = () => setSideOpen(false);
  const togglePanel = (which) => setPanel((cur) => (cur === which ? null : which));

  return (
    <header>
      <div className="left-group">
        <Link to="/" className="logo" id="logo" style={{ cursor: 'pointer', textDecoration: 'none' }}>
          <img src={LOGO_URL} alt="로고" className="logo-img" />
          <span className="logo-text">휴버대 티어표</span>
        </Link>

        <nav className="desktop-nav">
          {MENUS.map((menu) => (
            <div className="nav-item" key={menu.label}>
              <a href="#" onClick={(e) => e.preventDefault()}>{menu.label} <span className="arrow">▼</span></a>
              <div className="dropdown">
                {menu.items.map((item) => <MenuLink key={item.label} item={item} />)}
              </div>
            </div>
          ))}
        </nav>
      </div>

      <div className="header-right">
        <ThemeToggle />
        {isLoggedIn ? (
          <div id="header-user-actions" className="header-user-actions">
            <SponsorButton />
            {!isStaticPreview() && (
              <NotificationBell
                open={panel === 'bell'}
                onToggle={() => togglePanel('bell')}
                onClose={() => setPanel((cur) => (cur === 'bell' ? null : cur))}
                containerRef={bellRef}
              />
            )}
            <UserProfileMenu
              open={panel === 'profile'}
              onToggle={() => togglePanel('profile')}
              onClose={() => setPanel((cur) => (cur === 'profile' ? null : cur))}
              containerRef={profileRef}
            />
          </div>
        ) : (
          <>
            <SponsorButton />
            <Link to="/login" id="header-login-btn" className="header-login-btn">로그인</Link>
          </>
        )}
        <div className="menu-btn" id="menuBtn" onClick={() => setSideOpen((v) => !v)}>☰</div>
      </div>

      {/* 사이드 메뉴(모바일 오프캔버스) — 클릭식 아코디언, 하나 열면 다른 항목은 닫힘 */}
      <nav
        id="sideMenu"
        className={`side-menu${sideOpen ? ' is-open' : ''}`}
        style={{ right: sideOpen ? '0px' : '-100%' }}
      >
        <div className="close-btn" id="closeBtn" onClick={closeSide}>×</div>
        <ul>
          {MENUS.map((menu, i) => (
            <li className={`nav-item side-dropdown${sideActive === i ? ' active' : ''}`} key={menu.label}>
              <a
                href="#"
                className="dropdown-toggle"
                onClick={(e) => { e.preventDefault(); setSideActive((cur) => (cur === i ? null : i)); }}
              >
                {menu.label} <span className="arrow">▼</span>
              </a>
              <ul className="dropdown">
                {menu.items.map((item) => (
                  <li key={item.label}><MenuLink item={item} onClick={closeSide} /></li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
