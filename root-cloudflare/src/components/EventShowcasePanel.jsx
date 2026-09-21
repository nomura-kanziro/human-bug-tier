// ========================================================
// EventShowcasePanel — 이벤트 "제작한 티어표 공개" (뼈대 · 아직 정식 공개 전)
// ========================================================
// ⚠ 아직 정식 공개 전이다. 서버 라우트(/api/events/showcase/*)가 전부 requireAdmin 이라 회원이 쓸 수 있는 기능이 없고,
// 이 탭은 모두에게 "준비 중" 안내만 보인다.
//
// 회차를 열고 닫는 관리(마감 시각·결과 공개·참가 목록)는 이 페이지가 아니라 **관리자 페이지의 "이벤트 관리"**
// (components/AdminEventManager.jsx)에서 한다. 관리자에게는 그쪽으로 가는 링크만 덧붙여 보여준다.
// 정식 오픈할 때는 서버 라우트의 미들웨어를 풀고, 이 자리에 회원용 참가 화면을 붙이면 된다.
import { Link } from 'react-router-dom';

export default function EventShowcasePanel({ isAdmin }) {
  return (
    <>
      <h1>제작한 티어표 공개</h1>
      <p className="event-desc">
        여러분이 만든 커스텀 티어표를 한 회차에 모아 공개하고, 당첨자를 발표하는 이벤트입니다.
      </p>
      <div className="event-soon">
        <strong>준비 중입니다</strong>
        <span>기능은 만들어 두었고 아직 공개 전이에요. 열리면 공지로 알려드릴게요.</span>
      </div>
      {isAdmin && (
        <p className="event-admin-hint">
          관리자님: 회차 만들기·마감 시각·결과 발표는 <Link to="/admin#admin-events">관리자 페이지 → 이벤트 관리</Link>에서 합니다.
        </p>
      )}
    </>
  );
}
