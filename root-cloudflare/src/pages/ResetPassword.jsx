// 비밀번호 재설정 (user_login/reset_password.html + reset_password.js 이식)
// 메일 링크(?token=…)로만 들어온다. 진입 즉시 토큰 유효성을 먼저 물어보고, 유효할 때만 폼을 연다
// — 비밀번호를 다 입력한 뒤에야 "만료된 링크"임을 알게 되는 상황을 막기 위함.
// 토큰은 서버가 SHA-256 해시만 DB에 두므로 프론트는 URL 에서 읽어 전달만 하고 저장하지 않는다.
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthShell from '../components/AuthShell';
import { resetPasswordRequest, validateResetTokenRequest } from '../lib/authApi';
import '../styles/auth-find.css';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = (params.get('token') || '').trim();

  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState({ message: '확인 중...', error: false });
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus({ message: '유효하지 않은 재설정 링크입니다.', error: true });
      setEnabled(false);
      return;
    }
    validateResetTokenRequest(token)
      .then(({ ok, data }) => {
        if (!ok || !data.valid) {
          setStatus({ message: data.error || '만료되었거나 유효하지 않은 링크입니다.', error: true });
          setEnabled(false);
          return;
        }
        setStatus({ message: '새 비밀번호를 입력해주세요.', error: false });
        setEnabled(true);
      })
      .catch((err) => {
        console.error(err);
        setStatus({ message: '서버와 연결할 수 없습니다. backend에서 npm start를 실행해주세요.', error: true });
        setEnabled(false);
      });
  }, [token]);

  const submit = async () => {
    if (!token) { window.alert('유효하지 않은 재설정 링크입니다.'); return; }
    if (!password || password.length < 4) { window.alert('비밀번호는 4자 이상 입력해주세요.'); return; }
    if (password !== confirm) { window.alert('비밀번호가 일치하지 않습니다.'); return; }

    setBusy(true);
    try {
      const { ok, data } = await resetPasswordRequest(token, password);
      if (ok && data.success) {
        window.alert(data.message || '비밀번호가 변경되었습니다.');
        navigate('/login');
        return;
      }
      window.alert(data.error || '비밀번호 재설정에 실패했습니다.');
    } catch (err) {
      console.error(err);
      window.alert('서버와 연결할 수 없습니다.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="비밀번호 재설정">
      <h2 style={{ color: '#000' }}>비밀번호 재설정</h2>
      <p
        id="reset-status"
        style={{ margin: '0 0 12px', fontSize: 14, lineHeight: 1.5, color: status.error ? '#dc2626' : '#059669' }}
      >
        {status.message}
      </p>
      <input type="password" placeholder="새 비밀번호" value={password} disabled={!enabled} onChange={(e) => setPassword(e.target.value)} />
      <input type="password" placeholder="새 비밀번호 확인" value={confirm} disabled={!enabled} onChange={(e) => setConfirm(e.target.value)} />
      <button type="button" style={{ width: 240, marginTop: 15 }} disabled={!enabled || busy} onClick={submit}>
        {busy ? '변경 중...' : '비밀번호 변경'}
      </button>
      <p style={{ marginTop: 16 }}><Link to="/login">로그인으로 돌아가기</Link></p>
    </AuthShell>
  );
}
