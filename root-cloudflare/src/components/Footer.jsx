// 공통 푸터 (footer.html 이식 → 소개 + 바로가기 + 버전 정보로 확장).
// 사이트 버전 문자열은 수동 관리 — 배포 시 직접 갱신.
import { Link } from 'react-router-dom';
import { LOGO_URL } from '../lib/paths';

export const SITE_VERSION = '0.5.0';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <span className="site-footer-name">
            <img src={LOGO_URL} alt="" width="28" height="28" loading="lazy" />
            휴버대 티어표
          </span>
          <p>휴먼버그대학교 시리즈 캐릭터의 전투력 순위를 보고, 나만의 티어표를 만들어 공유하는 미니 웹 사이트입니다.</p>
        </div>

        <nav className="site-footer-links" aria-label="바로가기">
          <div className="site-footer-col">
            <strong>둘러보기</strong>
            <Link to="/tier/1">공식 티어표</Link>
            <Link to="/custom-maker">커스텀 메이커</Link>
            <Link to="/board">커스텀 게시판</Link>
          </div>
          <div className="site-footer-col">
            <strong>이용 안내</strong>
            <Link to="/luck-draw">행운 뽑기</Link>
            <Link to="/notice">공지사항</Link>
            {/* id="contact-link" / .fot-text 는 예전 푸터부터 쓰던 이름이라 그대로 둔다 */}
            <Link to="/inquiry" id="contact-link">
              <span className="fot-text">문의하기</span>
            </Link>
          </div>
        </nav>
      </div>
      <div className="site-footer-bottom">
        <span>site version : {SITE_VERSION}</span>
      </div>
    </footer>
  );
}
