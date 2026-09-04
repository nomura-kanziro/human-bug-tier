// 아직 React 로 이식되지 않은 영역(4단계 이후: 인증·커스텀·게시판·뽑기·마이페이지·문의·알림상세·관리자)의 자리표시자.
// 링크/라우트 구조는 미리 확정해 두고, 단계별 이식이 끝나면 이 컴포넌트를 실제 페이지로 교체한다.
// 바닐라 전체 기능은 root-render/ (Render 배포, STATIC_ROOT=root-render) 에서 계속 동작한다.
import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function PendingPage({ title }) {
  const { pathname } = useLocation();
  useEffect(() => { document.title = `${title} | 휴버대 티어표`; }, [title]);
  return (
    <main style={{ maxWidth: 720, margin: '48px auto', padding: '0 20px', textAlign: 'center' }}>
      <h2 style={{ marginBottom: 12 }}>{title}</h2>
      <p style={{ opacity: 0.8, lineHeight: 1.7 }}>
        이 화면은 정식 버전(React)으로 이식 준비 중입니다.<br />
        기존 기능은 바닐라 버전에서 그대로 사용할 수 있습니다.
      </p>
      <p style={{ marginTop: 8, fontSize: 13, opacity: 0.6 }}><code>{pathname}</code></p>
      <Link to="/" style={{ display: 'inline-block', marginTop: 24 }}>← 홈으로</Link>
    </main>
  );
}
