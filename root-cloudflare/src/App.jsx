// 라우트 정의 — RDMD/features/react-rewrite.md 의 패리티 표와 1:1
//  이식 완료(1~3단계): / , /tier/:n , /notice , /notice/all , /notice/news , /notice/:id
//  이식 대기(4단계~): PendingPage 로 자리만 잡아둠 (URL 구조 확정용)
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import CustomMaker from './pages/CustomMaker';
import Home from './pages/Home';
import LegacyRedirect from './pages/LegacyRedirect';
import LuckDraw from './pages/LuckDraw';
import NoticeDetail from './pages/NoticeDetail';
import NoticeHome from './pages/NoticeHome';
import NoticeList from './pages/NoticeList';
import PendingPage from './pages/PendingPage';
import TierPage from './pages/TierPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        {/* 티어표는 한 페이지 + 내부 navbar. /tier 로 오면 1티어부터 */}
        <Route path="/tier" element={<Navigate to="/tier/1" replace />} />
        <Route path="/tier/:n" element={<TierPage />} />
        <Route path="/notice" element={<NoticeHome />} />
        <Route path="/notice/all" element={<NoticeList category="notice" />} />
        <Route path="/notice/news" element={<NoticeList category="news" />} />
        {/* 옛 바닐라 주소는 /notice/:id 보다 먼저(정적 세그먼트 우선) 잡아 리다이렉트 */}
        {['notice.html', 'all_notices.html', 'news.html', 'notice-detail.html'].map((f) => (
          <Route key={f} path={`/notice/${f}`} element={<LegacyRedirect />} />
        ))}
        <Route path="/notice/:id" element={<NoticeDetail />} />

        {/* 4단계~ 이식 대기 */}
        <Route path="/custom-maker" element={<CustomMaker />} />
        <Route path="/luck-draw" element={<LuckDraw />} />
        <Route path="/board" element={<PendingPage title="커스텀 게시판" />} />
        <Route path="/board/*" element={<PendingPage title="커스텀 게시판" />} />
        <Route path="/my-page" element={<PendingPage title="마이페이지" />} />
        <Route path="/notifications" element={<PendingPage title="알림" />} />
        <Route path="/inquiry" element={<PendingPage title="문의하기" />} />
        <Route path="/login" element={<PendingPage title="로그인" />} />
        <Route path="/signup" element={<PendingPage title="회원가입" />} />
        <Route path="/find-account" element={<PendingPage title="아이디 찾기" />} />
        <Route path="/reset-password" element={<PendingPage title="비밀번호 재설정" />} />
        <Route path="/admin/*" element={<PendingPage title="관리자" />} />

        {/* 바닐라 URL(*.html) 호환 리다이렉트 + 404 */}
        <Route path="*" element={<LegacyRedirect />} />
      </Route>
    </Routes>
  );
}
