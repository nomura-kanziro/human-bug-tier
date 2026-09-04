// 메인 홈 (index.html + index-home.js 이식)
//  섹션: 소개 → 퀵카드 3개(클릭 시 하단 섹션으로 스크롤) → 공지 미리보기(각 2건) →
//        커스텀 메이커 미리보기(장식) → 행운 뽑기 위젯 → 공식 티어 카드 9개
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import HomeLuckWidget from '../components/HomeLuckWidget';
import NoticeListItem from '../components/NoticeListItem';
import { fetchNotices } from '../lib/noticeApi';
import { LOGO_URL, tierIconUrl, tierImageUrl } from '../lib/paths';

const TIERS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export const TIER_DESCRIPTIONS = {
  1: '신계 / 슈퍼 그랜드 마스터',
  2: '뒷세계 전설들 / 그랜드 마스터',
  3: '톱 클래스 무투파 / 마스터',
  4: '준 톱클래스 무투파 / 다이아몬드',
  5: '중견급 무투파 or 탈사제 / 플래티넘',
  6: '중하위권 무투파 or 정예 사제 / 골드',
  7: '하위권 무투파 or 우수한 사제 / 실버',
  8: '평범한 사제 수준의 전투력 / 브론즈',
  9: '비전투원 또는 전투력 측정 단서 없음 / 언랭크',
};

// 퀵 카드: 안쪽 <a>는 페이지 이동, 카드 빈 곳 클릭/Enter/Space 는 data-scroll-target 섹션으로 스크롤
function QuickCard({ target, title, children }) {
  const go = () => document.querySelector(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  return (
    <div
      className="quick-card"
      data-scroll-target={target}
      tabIndex={0}
      onClick={(e) => { if (!e.target.closest('a')) go(); }}
      onKeyDown={(e) => {
        if (e.target.closest('a')) return;
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        go();
      }}
    >
      <h3>{title}</h3>
      <div className="sub-menu">{children}</div>
    </div>
  );
}

function Soon({ children }) {
  return <a href="#" className="nav-soon" title="준비 중" onClick={(e) => e.preventDefault()}>{children}</a>;
}

export default function Home() {
  const navigate = useNavigate();
  const [notices, setNotices] = useState(null);
  const [news, setNews] = useState(null);

  useEffect(() => {
    document.title = '휴버대 티어표';
    Promise.all([fetchNotices('notice', 2), fetchNotices('news', 2)])
      .then(([n, w]) => { setNotices(n); setNews(w); })
      .catch((err) => { console.error(err); setNotices([]); setNews([]); });
  }, []);

  return (
    <>
      <section className="intro">
        <h1>
          <img src={LOGO_URL} alt="로고" className="logo-img" />
          휴버대 티어표
        </h1>
        <p>휴버대 티어표는 ‘휴먼버그대학교’ 시리즈의 캐릭터들의 전투력 순위 및 관련 정보를 보여주기 위한 미니 웹 사이트입니다.</p>
      </section>

      <section className="quick-nav">
        <QuickCard target="#home-tiers" title="티어표">
          <div className="sub-grid">
            {TIERS.map((n) => <Link key={n} to={`/tier/${n}`}>{n}티어</Link>)}
          </div>
        </QuickCard>
        <QuickCard target="#home-maker-preview" title="커스텀 메이커">
          <Link to="/custom-maker">• 제작하기</Link>
          <Link to="/board">• 게시판</Link>
          <Soon>• 이벤트 (준비 중)</Soon>
        </QuickCard>
        <QuickCard target="#home-luck-preview" title="행운 뽑기">
          <Link to="/luck-draw#daily">• 오늘의 행운 티어</Link>
          <Soon>• 랜덤 뽑기 (준비 중)</Soon>
        </QuickCard>
      </section>

      <section className="notice-section">
        <div className="notice-header">
          <h2>공지사항</h2>
          <Link to="/notice" className="notice-view-all">전체 공지 보기 →</Link>
        </div>
        <div className="notice-grid">
          <div className="notice-column">
            <div className="notice-column-header">
              <span style={{ color: '#10b981', fontSize: 18 }}>●</span>
              <span>전체 공지</span>
            </div>
            <div id="home-notice-items">
              {notices && notices.length === 0 && <p className="notice-empty">등록된 공지가 없습니다.</p>}
              {notices?.map((n) => <NoticeListItem key={n._id || n.id} notice={n} variant="home" />)}
            </div>
          </div>
          <div className="notice-column">
            <div className="notice-column-header">
              <span style={{ color: '#8b5cf6', fontSize: 18 }}>●</span>
              <span>새 소식</span>
            </div>
            <div id="home-news-items">
              {news && news.length === 0 && <p className="notice-empty">등록된 새 소식이 없습니다.</p>}
              {news?.map((n) => <NoticeListItem key={n._id || n.id} notice={n} variant="home" />)}
            </div>
          </div>
        </div>
      </section>

      {/* 커스텀 메이커 미리보기 — 오른쪽 보드는 동작하지 않는 장식용 미니어처 */}
      <section id="home-maker-preview" className="home-maker-preview">
        <div className="home-maker-preview-inner">
          <div className="home-maker-copy">
            <p className="home-maker-kicker">Custom Maker</p>
            <h2>나만의 티어표를 만들어 보세요</h2>
            <p className="home-maker-desc">공식 1~9티어 캐릭터를 끌어다 놓거나, 모바일에서는 탭으로 배치할 수 있습니다. PNG·PDF로 저장하고 게시판에 올려 보세요.</p>
            <div className="home-maker-actions">
              <Link className="home-maker-btn home-maker-btn-primary" to="/custom-maker">제작하기</Link>
              <Link className="home-maker-btn home-maker-btn-ghost" to="/board">게시판</Link>
            </div>
          </div>
          <div className="home-maker-board" aria-hidden="true">
            <div className="home-maker-row">
              <span className="home-maker-label">갑</span>
              <div className="home-maker-slots">
                <img src={tierImageUrl('1 tier/uryu3paze.webp')} alt="" />
                <img src={tierImageUrl('1 tier/tsurugi.jpg')} alt="" />
                <img src={tierImageUrl('1 tier/nomura.jpg')} alt="" />
              </div>
            </div>
            <div className="home-maker-row">
              <span className="home-maker-label">을</span>
              <div className="home-maker-slots">
                <img src={tierImageUrl('2 tier/kita kintaro.jpg')} alt="" />
                <img src={tierImageUrl('2 tier/togari genya.jpg')} alt="" />
                <span className="home-maker-empty" />
              </div>
            </div>
            <div className="home-maker-row">
              <span className="home-maker-label">병</span>
              <div className="home-maker-slots">
                <img src={tierImageUrl('3 tier/park seojun.jpg')} alt="" />
                <span className="home-maker-empty" />
                <span className="home-maker-empty" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <HomeLuckWidget />

      <section className="home-tiers-section" id="home-tiers">
        <div className="home-tiers-header">
          <h2>공식 티어표</h2>
        </div>
        <div className="tiers">
          {TIERS.map((n) => (
            <div id={`tier${n}`} className="tier-card" key={n} onClick={() => navigate(`/tier/${n}`)}>
              <img src={tierIconUrl(n)} alt={`${n}티어 아이콘`} className="tier-icon" />
              <span className="tier-title">{n}티어</span>
              <p>{TIER_DESCRIPTIONS[n]}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
