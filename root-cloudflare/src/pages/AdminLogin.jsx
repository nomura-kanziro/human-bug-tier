// 관리자 로그인 (admin/admin-login.html + .js 이식)
// 일반 유저 로그인과는 별개 토큰 체계: 성공 시 adminAuthToken 저장 후 /admin 대시보드로 이동.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthShell from '../components/AuthShell';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!loginId.trim() || !password.trim()) {
      window.alert('아이디와 비밀번호를 모두 입력해주세요.');
      return;
    }
    setBusy(true);
    try {
      const res = await apiRequest('/api/admin/login', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({ loginId: loginId.trim(), password: password.trim() }),
      });
      if (!res.ok || !res.data.success) {
        window.alert(`❌ ${res.data.error || '아이디 또는 비밀번호가 틀렸습니다.'}`);
        return;
      }
      // 남아있던 일반 유저 세션은 지운다(관리자/일반 로그인 상태 혼동 방지)
      localStorage.removeItem('user');
      localStorage.setItem('isAdmin', 'true');
      localStorage.setItem('adminName', res.data.admin?.name || '관리자');
      localStorage.setItem('adminIp', res.data.admin?.ip || 'unknown');
      if (res.data.token) {
        // adminAuthToken 이 정본, authToken 은 레거시 호환용으로 함께 저장한다
        localStorage.setItem('adminAuthToken', res.data.token);
        localStorage.setItem('authToken', res.data.token);
      }
      // 1시간 자동 로그아웃(AuthContext) 기준으로 삼는 로그인 시각
      localStorage.setItem('loginAt', String(Date.now()));
      refresh();
      window.alert('✅ 관리자 로그인 성공!');
      navigate('/admin');
    } catch (err) {
      console.error(err);
      window.alert('❌ 서버와 연결할 수 없습니다. 백엔드가 실행 중인지 확인해주세요.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="관리자 로그인 | 휴버대 티어표">
      {/* 색은 auth-shell.css 가 테마 토큰으로 지정한다(예전엔 인라인 #000 이라 다크에서 안 보였음) */}
      <h2>관리자 로그인</h2>
      <form onSubmit={submit}>
        <input type="text" placeholder="아이디" value={loginId} onChange={(e) => setLoginId(e.target.value)} autoComplete="username" />
        <input type="password" placeholder="비밀번호" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        <button type="submit" disabled={busy}>{busy ? '확인 중...' : '로그인'}</button>
      </form>
      <div className="back-btn" onClick={() => navigate('/')} role="button" tabIndex={0}>⟳</div>
    </AuthShell>
  );
}
