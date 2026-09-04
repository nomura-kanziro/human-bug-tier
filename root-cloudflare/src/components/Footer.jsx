// 공통 푸터 (footer.html 이식). 사이트 버전 문자열은 수동 관리 — 배포 시 직접 갱신.
import { Link } from 'react-router-dom';

export const SITE_VERSION = '0.5.0';

export default function Footer() {
  return (
    <footer>
      <p>site version : {SITE_VERSION}</p>
      <Link to="/inquiry" id="contact-link">
        <span className="fot-text">문의하기</span>
      </Link>
    </footer>
  );
}
