// 회원가입 (user_login/sign_up.html + sign_up.js 이식)
// 아이디를 서버의 nickname 으로 쓴다. 계정 생성·인증 메일 발송은 전부 서버가 처리하고
// (Brevo→Resend→Gmail 순차 폴백), 이 화면은 결과 메시지만 보여준다.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthShell from '../components/AuthShell';
import { registerRequest } from '../lib/authApi';

export default function SignUp() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState('');
  const [pw, setPw] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  // 두 칸 모두 입력됐을 때만 테두리 색으로 일치 여부를 즉시 알려준다(바닐라와 동일)
  const confirmBorder = pw && pwConfirm ? (pw === pwConfirm ? '#8faadc' : '#e74c3c') : '#ccc';

  const submit = async () => {
    if (!userId.trim() || !pw.trim() || !pwConfirm.trim() || !email.trim()) {
      window.alert('아이디, 비밀번호, 비밀번호 확인, 이메일은 모두 필수입니다.');
      return;
    }
    if (pw !== pwConfirm) {
      window.alert('비밀번호가 일치하지 않습니다.');
      return;
    }
    setBusy(true);
    try {
      const { ok, data } = await registerRequest(email.trim(), pw.trim(), userId.trim());
      // 계정 생성은 됐지만 메일만 실패한 경우에도 서버는 201 + detail 로 원인을 준다
      const suffix = data.detail ? ` (${data.detail})` : '';
      if (ok) {
        window.alert((data.message || '✅ 인증 메일이 발송되었습니다.\n메일함을 확인해주세요.') + suffix);
        setTimeout(() => navigate('/login'), 1200);
        return;
      }
      window.alert(`❌ ${data.error || '회원가입에 실패했습니다.'}${suffix}`);
    } catch (err) {
      console.error(err);
      window.alert('❌ 서버와 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="회원가입">
      <h2 style={{ color: '#000' }}>회원가입</h2>

      <input type="text" placeholder="아이디" value={userId} onChange={(e) => setUserId(e.target.value)} />
      <input type="password" placeholder="비밀번호" value={pw} onChange={(e) => setPw(e.target.value)} />
      <input
        type="password"
        placeholder="비밀번호 확인"
        value={pwConfirm}
        style={{ borderColor: confirmBorder }}
        onChange={(e) => setPwConfirm(e.target.value)}
      />
      <input type="email" placeholder="이메일" value={email} onChange={(e) => setEmail(e.target.value)} />

      <button type="button" style={{ width: 240, marginTop: 10 }} onClick={submit} disabled={busy}>
        {busy ? '처리 중...' : '회원가입'}
      </button>

      <div className="find-btn" style={{ marginTop: 15, textDecoration: 'none', color: '#555' }} onClick={() => navigate('/login')}>
        이미 계정이 있으신가요? 로그인하기
      </div>

      <div className="back-btn" onClick={() => navigate(-1)}>⟳</div>
    </AuthShell>
  );
}
