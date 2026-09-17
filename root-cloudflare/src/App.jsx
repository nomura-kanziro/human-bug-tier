// 라우트 정의 — RDMD/features/react-rewrite.md 의 패리티 표와 1:1
//  Layout(공용 헤더/푸터) 안에 들어가는 라우트와, 바닐라에서도 단독 페이지였던 인증·관리자
//  로그인 라우트를 구분한다(그 페이지들은 헤더/푸터 대신 로고 + 테마 토글만 있다).
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import AdminCommentDetail from './pages/AdminCommentDetail';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin';
import Board from './pages/Board';
import CustomMaker from './pages/CustomMaker';
import FindAccount from './pages/FindAccount';
import Home from './pages/Home';
import Inquiry from './pages/Inquiry';
import LegacyRedirect from './pages/LegacyRedirect';
import Login from './pages/Login';
import LuckDraw from './pages/LuckDraw';
import MyPage from './pages/MyPage';
import NoticeDetail from './pages/NoticeDetail';
import NoticeHome from './pages/NoticeHome';
import NoticeList from './pages/NoticeList';
import Notifications from './pages/Notifications';
import PostDetail from './pages/PostDetail';
import PostEdit from './pages/PostEdit';
import ResetPassword from './pages/ResetPassword';
import SignUp from './pages/SignUp';
import TierPage from './pages/TierPage';

export default function App() {
  return (
    <Routes>
      {/* 단독 페이지 (공용 헤더/푸터 없음) */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/find-account" element={<FindAccount />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/admin/login" element={<AdminLogin />} />

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

        <Route path="/custom-maker" element={<CustomMaker />} />
        <Route path="/luck-draw" element={<LuckDraw />} />
        <Route path="/board" element={<Board />} />
        <Route path="/board/post" element={<PostDetail />} />
        <Route path="/board/edit" element={<PostEdit />} />
        <Route path="/my-page" element={<MyPage />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/inquiry" element={<Inquiry />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/comment" element={<AdminCommentDetail />} />

        {/* 바닐라 URL(*.html) 호환 리다이렉트 + 404 */}
        <Route path="*" element={<LegacyRedirect />} />
      </Route>
    </Routes>
  );
}
