// 문의사항 (Contact_us/contact_us.html + .js 이식)
//  - 로그인 시 문의 작성 폼, 비로그인 시 로그인 안내
//  - 문의 목록 / 답변 토글 / 답변 작성(관리자) / 답변에 답변(인용) / 수정·삭제 / 신고
//  - 알림 딥링크(?inquiry=&answer=)로 들어오면 해당 카드로 스크롤 + 답변 펼침
// CSS 의 body/* 전역 선택자는 sync 스크립트가 .inquiry-page 로 스코프해 두었으므로
// 최상위 래퍼에 반드시 inquiry-page 클래스가 있어야 한다.
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ReportModal from '../components/ReportModal';
import { useAuth } from '../context/AuthContext';
import { apiRequest, isStaticPreview } from '../lib/api';
import { TIER_IMAGE_ROOT } from '../lib/paths';
import '../styles/contact_us.css';

const STATIC_MSG = 'GitHub Pages 정적 배포에서는 문의사항을 불러올 수 없습니다. 전체 기능을 사용하려면 서버가 있는 주소를 이용해주세요.';
const answerId = (a) => String(a?._id || a?.id || '');

export default function Inquiry() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { isLoggedIn, nickname, isAdmin } = useAuth();

  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('불러오는 중...');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [open, setOpen] = useState({});      // 문의 id → 답변 펼침 여부
  // 열려 있는 입력 상자는 화면에 하나만 유지한다(바닐라 closeAllActionBoxes 와 동일)
  const [box, setBox] = useState(null);      // { mode, inquiryId, answerId?, text, title? }
  const [report, setReport] = useState(null); // { inquiryId, answerId? }
  const [busy, setBusy] = useState(false);

  const deepInquiry = params.get('inquiry') || '';
  const deepAnswer = params.get('answer') || '';

  useEffect(() => { document.title = '문의사항 | 휴버대 티어표'; }, []);

  const load = useCallback(async () => {
    if (isStaticPreview()) { setStatus(STATIC_MSG); return; }
    try {
      const res = await apiRequest('/api/inquiries', { auth: false });
      if (!res.ok || !Array.isArray(res.data)) { setStatus('문의사항을 불러오는데 실패했습니다.'); return; }
      setItems(res.data);
      setStatus('');
    } catch (err) {
      console.error(err);
      setStatus('서버와 연결할 수 없습니다.');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // 알림 딥링크: 목록이 그려진 뒤 해당 문의를 펼치고 스크롤 + 잠깐 강조
  useEffect(() => {
    if (!deepInquiry || !items.length) return;
    setOpen((cur) => ({ ...cur, [deepInquiry]: true }));
    const timer = setTimeout(() => {
      const selector = deepAnswer ? `.answer[data-id="${deepAnswer}"]` : `.comment[data-id="${deepInquiry}"]`;
      const el = document.querySelector(selector);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('is-highlighted');
      setTimeout(() => el.classList.remove('is-highlighted'), 2400);
    }, 120);
    return () => clearTimeout(timer);
  }, [deepInquiry, deepAnswer, items]);

  const send = async (path, method, body) => {
    try {
      const res = await apiRequest(path, { method, body: body ? JSON.stringify(body) : undefined });
      if (res.ok && res.data.success) return true;
      window.alert(`❌ ${res.data.error || '알 수 없는 오류'}`);
      return false;
    } catch (err) {
      console.error(err);
      window.alert('❌ 서버와 연결할 수 없습니다.');
      return false;
    }
  };

  const submitInquiry = async () => {
    if (!message.trim()) { window.alert('내용을 입력해주세요.'); return; }
    if (isStaticPreview()) { window.alert('서버가 있는 환경에서만 문의를 등록할 수 있습니다.'); return; }
    setBusy(true);
    const ok = await send('/api/inquiries', 'POST', {
      title: title.trim() || '제목 없음',
      message: message.trim(),
      userId: nickname,
    });
    setBusy(false);
    if (!ok) return;
    window.alert('✅ 문의사항이 등록되었습니다.');
    setTitle('');
    setMessage('');
    load();
  };

  const submitAnswer = async () => {
    const text = (box?.text || '').trim();
    if (!text) { window.alert('답변 내용을 입력해주세요.'); return; }
    setBusy(true);
    const ok = await send(`/api/inquiries/${box.inquiryId}/answers`, 'POST', {
      message: text,
      userId: nickname,
      isAdmin,
      // 답변에 대한 답변이면 원본을 인용해서 함께 보낸다(서버가 저장 → 인용 블록으로 다시 표시)
      ...(box.quotedUser ? { quotedUser: box.quotedUser, quotedMessage: box.quotedMessage } : {}),
    });
    setBusy(false);
    if (!ok) return;
    window.alert('✅ 답변이 등록되었습니다.');
    setBox(null);
    load();
  };

  const submitEdit = async () => {
    const text = (box?.text || '').trim();
    if (!text) { window.alert('내용을 입력해주세요.'); return; }
    setBusy(true);
    const ok = box.answerId
      ? await send(`/api/inquiries/${box.inquiryId}/answers/${box.answerId}`, 'PUT', { message: text })
      : await send(`/api/inquiries/${box.inquiryId}`, 'PUT', { title: (box.title || '').trim() || '제목 없음', message: text });
    setBusy(false);
    if (!ok) return;
    window.alert('✅ 수정이 완료되었습니다.');
    setBox(null);
    load();
  };

  const removeInquiry = async (id) => {
    if (!window.confirm('정말 이 문의를 삭제하시겠습니까?')) return;
    if (await send(`/api/inquiries/${id}`, 'DELETE')) { window.alert('✅ 삭제되었습니다.'); load(); }
  };

  const removeAnswer = async (inquiryId, aid) => {
    if (!window.confirm('정말 이 답변을 삭제하시겠습니까?')) return;
    if (await send(`/api/inquiries/${inquiryId}/answers/${aid}`, 'DELETE')) { window.alert('✅ 삭제되었습니다.'); load(); }
  };

  const submitReport = async (reason, detail = '') => {
    const path = report.answerId
      ? `/api/inquiries/${report.inquiryId}/answers/${report.answerId}/report`
      : `/api/inquiries/${report.inquiryId}/report`;
    const ok = await send(path, 'POST', { reason, detail });
    setReport(null);
    if (ok) { window.alert('🚨 신고가 접수되었습니다.'); load(); }
  };

  const editorFor = (match) => (box && match(box) ? box : null);

  const renderEditor = (onSubmit, placeholder, submitLabel, withTitle = false) => (
    <div className="action-box">
      {withTitle && (
        <input
          type="text"
          className="inquiry-edit-title"
          value={box.title || ''}
          placeholder="문의 제목"
          onChange={(e) => setBox({ ...box, title: e.target.value })}
        />
      )}
      <textarea
        className="comment-input-box"
        placeholder={placeholder}
        value={box.text}
        onChange={(e) => setBox({ ...box, text: e.target.value })}
      />
      <div className="action-box-buttons">
        <button type="button" className="action-cancel" onClick={() => setBox(null)}>취소</button>
        <button type="button" className="action-submit" disabled={busy} onClick={onSubmit}>{submitLabel}</button>
      </div>
    </div>
  );

  return (
    <div className="inquiry-page">
      <section className="contact">
        <h1 className="page-title">
          <img src={`${TIER_IMAGE_ROOT}HBU_Contact_Image.png`} alt="로고" className="logo-img" /> 문의사항
        </h1>
        <p className="desc">
          파벨 관련 문제로 인한 티어 변동 문의나<br />
          사이트 내 버그/오류 관련 제보를 남겨주세요.
        </p>

        <div id="inquiry-form-container">
          {isLoggedIn ? (
            <div className="form-card">
              <div className="user-info">
                <div className="user-avatar">👤</div>
                <div className="user-name">{nickname}</div>
                <span className={`user-badge ${isAdmin ? 'admin-user' : 'nr-user'}`}>
                  {isAdmin ? 'Admin User' : 'NR User'}
                </span>
              </div>
              <input
                type="text"
                placeholder="문의 제목을 입력하세요"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <textarea
                className="comment-input-box"
                placeholder="버그 내용이나 문의사항을 자세히 적어주세요..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <button type="button" disabled={busy} onClick={submitInquiry}>등록하기</button>
            </div>
          ) : (
            <div className="login-required">
              <p>🚫 이용하시려면 로그인이 필요합니다.</p>
              <button type="button" onClick={() => navigate('/login')}>로그인 하러 가기</button>
            </div>
          )}
        </div>

        <div className="comment-list">
          {status && <p style={{ padding: 20, textAlign: 'center' }}>{status}</p>}
          {!status && items.length === 0 && <p style={{ padding: 20, textAlign: 'center' }}>등록된 문의가 없습니다.</p>}

          {!status && items.map((c) => {
            const id = String(c._id);
            const isMine = isLoggedIn && c.userId === nickname;
            const answers = c.answers || [];
            return (
              <div className="comment" data-id={id} key={id}>
                <div className="name">
                  {c.userId}{c.isAdmin && <span style={{ color: '#007bff' }}> Admin</span>}
                </div>
                <div className="title">{c.title}</div>
                <div className="msg">{c.message}</div>

                {answers.length > 0 && (
                  <>
                    <div className="answer-toggle-header" onClick={() => setOpen((cur) => ({ ...cur, [id]: !cur[id] }))}>
                      <span>📬 답변 보기 ({answers.length}개)</span>
                      <span className="toggle-arrow">{open[id] ? '▲' : '▼'}</span>
                    </div>
                    {open[id] && (
                      <div className="answers-container">
                        {answers.map((a) => {
                          const aid = answerId(a);
                          const mineAnswer = isLoggedIn && a.userId === nickname;
                          const replyBox = editorFor((b) => b.mode === 'reply' && b.answerId === aid);
                          const editBox = editorFor((b) => b.mode === 'edit' && b.answerId === aid);
                          return (
                            <div className="answer" data-id={aid} data-parent={id} key={aid}>
                              <div className="user-info">
                                <div className="user-avatar">👤</div>
                                <div className="user-name">{a.userId || '관리자'}</div>
                                <span className={`user-badge ${a.isAdmin ? 'admin-user' : 'nr-user'}`}>
                                  {a.isAdmin ? 'Admin User' : 'NR User'}
                                </span>
                              </div>
                              {a.quotedMessage && (
                                <div className="answer-quote">
                                  <strong>{a.quotedUser} &gt;&gt;</strong><br />
                                  {a.quotedMessage}
                                </div>
                              )}
                              <div className="answer-text">{a.message}</div>
                              <div className="comment-actions">
                                {isLoggedIn && (
                                  <button type="button" onClick={() => setBox({
                                    mode: 'reply', inquiryId: id, answerId: aid, text: '',
                                    quotedUser: a.userId || '관리자', quotedMessage: a.message || '',
                                  })}>답변</button>
                                )}
                                {isLoggedIn && (
                                  <button type="button" className="report-btn" disabled={Boolean(a.reported)} onClick={() => setReport({ inquiryId: id, answerId: aid })}>
                                    {a.reported ? '신고됨' : '신고'}
                                  </button>
                                )}
                                {mineAnswer && (
                                  <button type="button" onClick={() => setBox({ mode: 'edit', inquiryId: id, answerId: aid, text: a.message || '' })}>수정</button>
                                )}
                                {(mineAnswer || isAdmin) && (
                                  <button type="button" onClick={() => removeAnswer(id, aid)}>삭제</button>
                                )}
                              </div>
                              {replyBox && renderEditor(submitAnswer, '내용을 입력하세요', '답변 올리기')}
                              {editBox && renderEditor(submitEdit, '내용을 수정하세요', '수정 완료')}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}

                <div className="comment-actions">
                  {/* 문의에 대한 첫 답변은 관리자만 작성할 수 있다 */}
                  {isAdmin && (
                    <button type="button" onClick={() => setBox({ mode: 'reply', inquiryId: id, text: '' })}>답변</button>
                  )}
                  {isLoggedIn && (
                    <button type="button" className="report-btn" disabled={Boolean(c.reported)} onClick={() => setReport({ inquiryId: id })}>
                      {c.reported ? '신고됨' : '신고'}
                    </button>
                  )}
                  {isMine && (
                    <button type="button" onClick={() => setBox({ mode: 'edit', inquiryId: id, text: c.message || '', title: c.title || '' })}>수정</button>
                  )}
                  {isMine && <button type="button" onClick={() => removeInquiry(id)}>삭제</button>}
                </div>

                {editorFor((b) => b.mode === 'reply' && b.inquiryId === id && !b.answerId)
                  && renderEditor(submitAnswer, '댓글을 입력하세요', '답변 올리기')}
                {editorFor((b) => b.mode === 'edit' && b.inquiryId === id && !b.answerId)
                  && renderEditor(submitEdit, '내용을 수정하세요', '수정 완료', true)}
              </div>
            );
          })}
        </div>
      </section>

      {report && (
        <ReportModal
          title="신고 사유 선택"
          onClose={() => setReport(null)}
          onSubmit={submitReport}
        />
      )}
    </div>
  );
}
