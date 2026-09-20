// 로그인 (user_login/login.html + login.js 이식)
// 성공 시 바닐라와 같은 localStorage 키(user/authToken)에 저장하고, 남아 있을 수 있는
// 관리자 세션 흔적을 지운 뒤 AuthContext 를 갱신한다(헤더 프로필·알림이 즉시 반영되도록).
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthShell from '../components/AuthShell';
import { useAuth } from '../context/AuthContext';
import { loginRequest } from '../lib/authApi';

export default function Login() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [userId, setUserId] = useState('');
  const [userPw, setUserPw] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!userId.trim() || !userPw.trim()) {
      window.alert('아이디와 비밀번호를 모두 입력해주세요.');
      return;
    }
    setBusy(true);
    try {
      const { ok, data } = await loginRequest(userId.trim(), userPw.trim());
      if (ok && data.success) {
        ['isAdmin', 'adminAuthToken', 'adminName', 'adminIp'].forEach((k) => localStorage.removeItem(k));
        localStorage.setItem('user', JSON.stringify(data.user));
        if (data.token) localStorage.setItem('authToken', data.token);
        // 1시간 자동 로그아웃(AuthContext) 기준으로 삼는 로그인 시각
        localStorage.setItem('loginAt', String(Date.now()));
        refresh();
        window.alert('로그인 성공!');
        navigate('/');
        return;
      }
      if (data.blocked) {
        window.alert('🚫 관리자로 인해 차단당했습니다.');
        return;
      }
      window.alert(`❌ ${data.error || '로그인에 실패했습니다.'}`);
    } catch (err) {
      console.error(err);
      window.alert('❌ 서버와 연결할 수 없습니다.');
    } finally {
      setBusy(false);
    }
  };

  const onKeyDown = (e) => { if (e.key === 'Enter') submit(); };

  return (
    <AuthShell title="로그인">
      {/* 색은 auth-shell.css 가 테마 토큰으로 지정한다(예전엔 인라인 #000 이라 다크에서 안 보였음) */}
      <h2>로그인</h2>

      <input type="text" placeholder="아이디" value={userId} onChange={(e) => setUserId(e.target.value)} onKeyDown={onKeyDown} />
      <input type="password" placeholder="비밀번호" value={userPw} onChange={(e) => setUserPw(e.target.value)} onKeyDown={onKeyDown} />

      <div className="button-row">
        <button type="button" className="btn-primary" onClick={submit} disabled={busy}>
          {busy ? '로그인 중...' : '로그인'}
        </button>
        <button type="button" className="btn-secondary" onClick={() => navigate('/signup')}>회원가입</button>
      </div>

      <Link to="/find-account" className="find-btn" style={{ textDecoration: 'none' }}>아이디 및 비밀번호 찾기</Link>

      <div className="back-btn" onClick={() => navigate(-1)}>⟳</div>
    </AuthShell>
  );
}
