// 아이디/비밀번호 찾기 (user_login/find_account.html + find_account.js 이식)
// 계정 존재 여부를 응답으로 드러내지 않고 "등록되어 있다면 발송했다"는 문구를 쓴다(이메일 존재 추측 방지).
// 제목을 클릭하면 관리자 로그인으로 가는 숨은 진입점 — 바닐라와 동일하게 유지.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthShell from '../components/AuthShell';
import { accountFindErrorMessage, findIdRequest, forgotPasswordRequest } from '../lib/authApi';
import '../styles/auth-find.css';

const BUSY_LABEL = '요청 중... (최대 1분 소요될 수 있어요)';

export default function FindAccount() {
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [findEmail, setFindEmail] = useState('');
  const [pwUserId, setPwUserId] = useState('');
  const [pwEmail, setPwEmail] = useState('');
  const [busy, setBusy] = useState(null); // 'id' | 'pw' | null

  const findId = async () => {
    if (!findEmail.trim()) { window.alert('이메일을 입력해주세요.'); return; }
    setBusy('id');
    try {
      const { ok, data } = await findIdRequest(findEmail.trim());
      if (ok && data.success) {
        window.alert(data.message || '입력하신 정보가 등록되어 있다면 이메일로 안내를 발송했습니다. 스팸함도 확인해 주세요.');
        return;
      }
      window.alert(accountFindErrorMessage(data, '아이디 찾기에 실패했습니다.'));
    } catch (err) {
      console.error(err);
      window.alert('서버와 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setBusy(null);
    }
  };

  const findPassword = async () => {
    if (!pwUserId.trim() || !pwEmail.trim()) { window.alert('아이디와 이메일을 모두 입력해주세요.'); return; }
    setBusy('pw');
    try {
      const { ok, data } = await forgotPasswordRequest(pwUserId.trim(), pwEmail.trim());
      if (ok && data.success) {
        window.alert(data.message || '입력하신 정보가 등록되어 있다면 이메일로 재설정 링크를 발송했습니다. 스팸함도 확인해 주세요.');
        return;
      }
      window.alert(accountFindErrorMessage(data, '비밀번호 찾기에 실패했습니다.'));
    } catch (err) {
      console.error(err);
      window.alert('서버와 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <AuthShell title="아이디/비밀번호 찾기">
      <h2 id="find-account-title" style={{ color: '#000', cursor: 'pointer' }} onClick={() => navigate('/admin/login')}>
        아이디 / 비밀번호 찾기
      </h2>

      <div className="tab-container">
        <button type="button" className={`tab-btn${tab === 0 ? ' active' : ''}`} onClick={() => setTab(0)}>아이디 찾기</button>
        <button type="button" className={`tab-btn${tab === 1 ? ' active' : ''}`} onClick={() => setTab(1)}>비밀번호 찾기</button>
      </div>

      <div className="form-tab" style={{ display: tab === 0 ? 'flex' : 'none' }}>
        <input type="email" placeholder="가입한 이메일 주소" value={findEmail} onChange={(e) => setFindEmail(e.target.value)} />
        <button type="button" style={{ width: 240, marginTop: 15 }} onClick={findId} disabled={busy === 'id'}>
          {busy === 'id' ? BUSY_LABEL : '아이디 찾기'}
        </button>
      </div>

      <div className="form-tab" style={{ display: tab === 1 ? 'flex' : 'none' }}>
        <input type="text" placeholder="아이디" value={pwUserId} onChange={(e) => setPwUserId(e.target.value)} />
        <input type="email" placeholder="가입한 이메일 주소" value={pwEmail} onChange={(e) => setPwEmail(e.target.value)} />
        <button type="button" style={{ width: 240, marginTop: 15 }} onClick={findPassword} disabled={busy === 'pw'}>
          {busy === 'pw' ? BUSY_LABEL : '비밀번호 재설정 링크 받기'}
        </button>
      </div>

      <div className="find-btn" style={{ marginTop: 25 }} onClick={() => navigate('/login')}>
        로그인 페이지로 돌아가기
      </div>

      <div className="back-btn" onClick={() => navigate(-1)}>⟳</div>
    </AuthShell>
  );
}
