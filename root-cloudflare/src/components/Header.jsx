// 공통 헤더 (header.html + common.js 헤더 로직 이식)
//  - 데스크톱 드롭다운 5개(공지·소식/티어표/커스텀 메이커/이벤트/행운 뽑기)는 이제 **클릭**으로 열고 닫는다
//    (예전에는 CSS :hover). 하나를 열면 다른 것은 닫히고, 바깥 클릭·Esc·항목 선택 시 닫힌다. 모바일 사이드 메뉴는 클릭 아코디언
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
  // 공지·소식은 가장 먼저 보이도록 맨 앞에 둔다. 공지·새 소식은 여태 푸터와 홈에만 있어 헤더에서는 갈 수가 없었다.
  // (문의하기는 푸터에 있으면 충분하다는 판단으로 헤더에는 넣지 않는다)
  {
    label: '공지·소식',
    items: [
      { to: '/notice/all', label: '• 공지사항' },
      { to: '/notice/news', label: '• 새 소식' },
    ],
  },
  { label: '티어표', items: TIERS.map((n) => ({ to: `/tier/${n}`, label: `${n}티어` })) },
  {
    label: '커스텀 메이커',
    items: [
      { to: '/custom-maker', label: '• 제작하기' },
      { to: '/board', label: '• 게시판' },
    ],
  },
  // 이벤트는 커스텀 메이커와 성격이 달라 따로 뺐다. 항목은 이벤트 페이지의 해시 탭과 1:1.
  {
    label: '이벤트',
    items: [
      { to: '/event#quiz', label: '• 매일 간단 퀴즈' },
      { to: '/event#showcase', label: '• 티어표 공개' },
      { to: '/event#memory', label: '• 메모리 게임' },
    ],
  },
  {
    label: '행운 뽑기',
    items: [
      { to: '/luck-draw#daily', label: '• 오늘의 행운 티어' },
      { to: '/luck-draw#poker', label: '• 행운 티어 포커' },
      { to: '/luck-draw#random', label: '• 랜덤 뽑기' },
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
  const [deskOpen, setDeskOpen] = useState(null); // 열려 있는 데스크톱 드롭다운의 MENUS 인덱스 | null
  const navRef = useRef(null);
  const bellRef = useRef(null);
  const profileRef = useRef(null);
  const headerRef = useRef(null);

  // 사이드 메뉴가 헤더를 가리지 않고 그 아래에서 열리도록, 실제 헤더 높이를 CSS 변수로 노출한다
  // (헤더 높이는 반응형 padding/폰트 크기에 따라 달라지므로 하드코딩 대신 측정값을 쓴다)
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return undefined;
    const setHeaderHeight = () => {
      document.documentElement.style.setProperty('--header-h', `${el.offsetHeight}px`);
    };
    setHeaderHeight();
    const ro = new ResizeObserver(setHeaderHeight);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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

  // 데스크톱 드롭다운: 바깥 클릭 / Esc 로 닫기 (열려 있을 때만 리스너를 건다)
  useEffect(() => {
    if (deskOpen === null) return undefined;
    const onDoc = (e) => {
      if (navRef.current?.contains(e.target)) return;
      setDeskOpen(null);
    };
    const onKey = (e) => { if (e.key === 'Escape') setDeskOpen(null); };
    document.addEventListener('click', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [deskOpen]);

  const closeSide = () => setSideOpen(false);
  const closeDesk = () => setDeskOpen(null);
  const togglePanel = (which) => setPanel((cur) => (cur === which ? null : which));

  return (
    <header ref={headerRef}>
      <div className="left-group">
        <Link to="/" className="logo" id="logo" style={{ cursor: 'pointer', textDecoration: 'none' }}>
          <img src={LOGO_URL} alt="로고" className="logo-img" />
          <span className="logo-text">휴버대 티어표</span>
        </Link>

        <nav className="desktop-nav" ref={navRef}>
          {MENUS.map((menu, i) => (
            <div className={`nav-item${deskOpen === i ? ' open' : ''}`} key={menu.label}>
              <a
                href="#"
                aria-haspopup="true"
                aria-expanded={deskOpen === i}
                onClick={(e) => { e.preventDefault(); setDeskOpen((cur) => (cur === i ? null : i)); }}
              >
                {menu.label} <span className="arrow">▼</span>
              </a>
              <div className="dropdown">
                {menu.items.map((item) => <MenuLink key={item.label} item={item} onClick={closeDesk} />)}
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
        <div
          className={`menu-btn${sideOpen ? ' is-open' : ''}`}
          id="menuBtn"
          onClick={() => setSideOpen((v) => !v)}
          role="button"
          aria-label={sideOpen ? '메뉴 닫기' : '메뉴 열기'}
          aria-expanded={sideOpen}
        >
          <span className="hamburger-line" />
          <span className="hamburger-line" />
          <span className="hamburger-line" />
        </div>
      </div>

      {/* 사이드 메뉴(모바일 오프캔버스) — 클릭식 아코디언, 하나 열면 다른 항목은 닫힘 */}
      <nav
        id="sideMenu"
        className={`side-menu${sideOpen ? ' is-open' : ''}`}
        style={{ right: sideOpen ? '0px' : '-100%' }}
      >
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
