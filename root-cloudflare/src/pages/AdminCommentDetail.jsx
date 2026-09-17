// 관리자 문의 상세 (admin/comments/comment-detail.html + .js 이식)
//  - 문의 원글 + 답변 목록(전체/신고된 답변 · 사유 · 검색으로 클라이언트 필터링)
//  - 답변 1건 삭제 / 문의 전체 삭제
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { adminRequest, apiRequest } from '../lib/api';
import { REPORT_REASON_OPTIONS, rowId } from '../lib/adminApi';
import '../styles/admin-manage.css';

export default function AdminCommentDetail() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const id = params.get('id') || '';

  const [comment, setComment] = useState(null);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'reported'
  const [reasonFilter, setReasonFilter] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [answersOpen, setAnswersOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => { document.title = '문의 상세 | 관리자'; }, []);

  // 진입 가드 — 관리자 토큰이 없으면 관리자 로그인으로 (최종 검증은 서버 requireAdmin)
  useEffect(() => {
    if (localStorage.getItem('isAdmin') !== 'true' || !localStorage.getItem('adminAuthToken')) {
      window.alert('관리자 로그인이 필요합니다.');
      navigate('/admin/login');
      return;
    }
    setReady(true);
  }, [navigate]);

  // 다른 관리자가 동시에 답변을 지워도 최신 상태를 보도록, 다시 그릴 때마다 서버에서 새로 받아온다
  const load = useCallback(async () => {
    if (!ready) return;
    if (!id) { setError('잘못된 접근입니다. 관리자 댓글 목록에서 📋 상세 버튼을 눌러주세요.'); return; }
    try {
      const res = await apiRequest(`/api/inquiries/${id}`, { auth: false });
      if (!res.ok || !res.data || !res.data._id) { setError('해당 댓글이 존재하지 않습니다.'); return; }
      setComment(res.data);
      setError('');
    } catch (err) {
      console.error(err);
      setError('서버와 연결할 수 없습니다.');
    }
  }, [id, ready]);

  useEffect(() => { load(); }, [load]);

  const deleteAnswer = async (answerId) => {
    if (!window.confirm('정말 이 답변을 삭제하시겠습니까?')) return;
    const res = await adminRequest(`/api/inquiries/${id}/answers/${answerId}`, { method: 'DELETE' }).catch(() => null);
    if (res?.ok) { load(); return; }
    window.alert(`❌ ${res?.data?.error || '답변 삭제에 실패했습니다.'}`);
  };

  const deleteWhole = async () => {
    if (!window.confirm('정말 이 댓글 전체를 삭제하시겠습니까?')) return;
    const res = await adminRequest(`/api/inquiries/${id}`, { method: 'DELETE' }).catch(() => null);
    if (res?.ok) { window.alert('✅ 삭제되었습니다.'); navigate('/admin'); return; }
    window.alert(`❌ ${res?.data?.error || '삭제에 실패했습니다.'}`);
  };

  if (!ready) return null;
  if (error) {
    return (
      <main className="admin-container">
        <div className="react-state-msg">
          <h2>❌ {error}</h2>
          <button type="button" className="action-btn" onClick={() => navigate('/admin')}>← 관리 목록으로 돌아가기</button>
        </div>
      </main>
    );
  }
  if (!comment) return <main className="admin-container"><p className="react-state-msg">불러오는 중...</p></main>;

  const term = search.toLowerCase().trim();
  const answers = (comment.answers || []).filter((a) => {
    if (typeFilter === 'reported' && !a.reported) return false;
    if (reasonFilter && (!a.reported || a.reportReason !== reasonFilter)) return false;
    if (term && !(a.message || '').toLowerCase().includes(term)) return false;
    return true;
  });

  return (
    <main className="admin-container">
      <div className="filter-nav">
        <div className="filter-left">
          <span className="filter-title">답변 탐색 기능</span>
          <button type="button" className={`filter-btn${typeFilter === 'all' ? ' active' : ''}`} onClick={() => setTypeFilter('all')}>전체 답변</button>
          <button type="button" className={`filter-btn${typeFilter === 'reported' ? ' active' : ''}`} onClick={() => setTypeFilter('reported')}>신고된 답변</button>
        </div>
        <div className="filter-right">
          <div className="search-group">
            <input
              type="text"
              placeholder="답변 내용 검색..."
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              onKeyUp={(e) => { if (e.key === 'Enter') setSearch(searchDraft); }}
            />
            <button type="button" className="search-btn" onClick={() => setSearch(searchDraft)}>🔍 검색</button>
          </div>
          <select className="filter-select" value={reasonFilter} onChange={(e) => setReasonFilter(e.target.value)}>
            <option value="">없음</option>
            {REPORT_REASON_OPTIONS.map((r) => <option value={r} key={r}>{r}</option>)}
          </select>
        </div>
      </div>

      <div className="detail-card">
        <div className="user-info">
          <div className="user-avatar">👤</div>
          <div>
            <div className="user-name">{comment.userId}</div>
            <span className={`user-badge ${comment.isAdmin ? 'admin-user' : 'nr-user'}`}>
              {comment.isAdmin ? 'Admin User' : 'NR User'}
            </span>
          </div>
        </div>
        <div className="detail-title">제목 : {comment.title}</div>
        <div className="detail-message">{comment.message}</div>
        <div className="detail-meta">작성일 : {comment.date}</div>
        <div className="detail-meta">IP : {comment.ip || 'unknown'}</div>

        {(comment.answers || []).length === 0 ? (
          <p className="detail-empty">아직 답변이 없습니다.</p>
        ) : (
          <>
            <div className="answer-toggle-header" onClick={() => setAnswersOpen((v) => !v)}>
              <span>📬 답변 보기 ({answers.length}개)</span>
              <span className="toggle-arrow">{answersOpen ? '▲' : '▼'}</span>
            </div>
            {answersOpen && (
              <div className="answers-container">
                {answers.map((a) => {
                  const aid = rowId(a);
                  const reason = `${a.reportReason || ''} ${a.reportDetail ? `(${a.reportDetail})` : ''}`.trim();
                  return (
                    <div className="answer-card" key={aid}>
                      <div className="user-info">
                        <div className="user-avatar">👤</div>
                        <div className="user-name">{a.userId || '관리자'}</div>
                        <span className={`user-badge ${a.isAdmin ? 'admin-user' : 'nr-user'}`}>
                          {a.isAdmin ? 'Admin User' : 'NR User'}
                        </span>
                      </div>
                      {a.quotedMessage && (
                        <div className="quote">
                          <strong>{a.quotedUser} &gt;&gt;</strong><br />
                          {a.quotedMessage}
                        </div>
                      )}
                      <div className="answer-text">{a.message}</div>
                      <div className="action-buttons">
                        {a.reported && (
                          <span className="report-flag" title={reason} onClick={() => window.alert(`🚨 신고 사유\n${reason}`)}>⚠️</span>
                        )}
                        <button type="button" className="danger-btn" onClick={() => deleteAnswer(aid)}>🗑️ 답변 삭제</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      <div className="detail-actions">
        <button type="button" className="danger-btn" onClick={deleteWhole}>🗑️ 이 댓글 전체 삭제</button>
        <button type="button" className="action-btn" onClick={() => navigate('/admin')}>← 목록으로 돌아가기</button>
      </div>
    </main>
  );
}
