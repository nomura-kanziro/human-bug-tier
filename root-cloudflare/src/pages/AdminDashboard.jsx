// 관리자 대시보드 (admin/comments/comment-management.html + .js 이식)
// 한 화면에 5개 관리 섹션이 들어있다:
//   ① 문의(댓글) 목록·검색·삭제  ② 커스텀 메이커 게시글/댓글 신고 관리
//   ③ 공지 작성·수정·고정·유튜브 동기화  ④ 회원 / IP 차단 관리
//   ⑤ 이벤트 관리(메모리 게임 기록 이벤트 열기/닫기/정산 · 제작한 티어표 공개) — AdminEventManager
// 맨 위의 "빠른 이동" 바(AdminQuickNav)는 각 기능 태그를 누르면 그 섹션으로 스크롤해 내려간다.
// 모든 쓰기 작업은 adminRequest(adminAuthToken) → 서버 requireAdmin 으로 이중 검증된다.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminEventManager from '../components/AdminEventManager';
import AdminPagination from '../components/AdminPagination';
import AdminQuickNav, { scrollToAnchor } from '../components/AdminQuickNav';
import NoticeEditor from '../components/NoticeEditor';
import { adminRequest, apiRequest, isStaticPreview } from '../lib/api';
import {
  BLOCK_DURATIONS, ITEMS_PER_PAGE, MAX_PINNED_NOTICES, NOTICE_CATEGORY_LABELS, NOTICE_ITEMS_PER_PAGE,
  REPORT_REASON_OPTIONS, fetchBlocks, fetchInquiries, fetchNotices, fetchTierReports, fetchUsers,
  filterTierItems, formatDate, formatJoinedAt, formatYoutubeSyncStatus, getActiveBlocks,
  getRemainingLabel, reportReasonText, rowId, sortAdminNotices,
} from '../lib/adminApi';
import '../styles/admin-manage.css';

const EMPTY_NOTICE_FORM = { title: '', summary: '', content: '', category: 'notice' };

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [ready, setReady] = useState(false);
  const hashHandled = useRef(false); // 주소 해시로의 첫 이동은 한 번만
  const [inquiries, setInquiries] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [users, setUsers] = useState([]);
  const [notices, setNotices] = useState([]);
  const [tierPosts, setTierPosts] = useState([]);
  const [tierComments, setTierComments] = useState([]);
  const [youtubeStatus, setYoutubeStatus] = useState('휴먼버그대학교 채널 게시판 글을 새 소식에 가져옵니다. 서버가 주기적으로 확인하며, 아래 버튼으로 지금 가져올 수도 있습니다.');
  const [youtubeBusy, setYoutubeBusy] = useState(false);

  // ① 문의 목록 필터
  const [typeFilter, setTypeFilter] = useState('all');
  const [reportFilter, setReportFilter] = useState('');
  const [sort, setSort] = useState('newest');
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // ② 커스텀 메이커 필터
  const [postFilter, setPostFilter] = useState('all');
  const [commentFilter, setCommentFilter] = useState('all');

  // ③ 공지
  const [noticeForm, setNoticeForm] = useState(EMPTY_NOTICE_FORM);
  const [editingNoticeId, setEditingNoticeId] = useState(null);
  const [noticeFilter, setNoticeFilter] = useState('all');
  const [noticePage, setNoticePage] = useState(1);
  const [noticeBusy, setNoticeBusy] = useState(false);

  // ④ 차단
  const [blockInput, setBlockInput] = useState('');
  const [blockDuration, setBlockDuration] = useState('1');
  const [customDays, setCustomDays] = useState('');

  useEffect(() => { document.title = '관리자 대시보드 | 휴버대 티어표'; }, []);

  // 진입 가드 — 관리자 토큰이 없으면 관리자 로그인으로 돌려보낸다(최종 검증은 서버 requireAdmin)
  useEffect(() => {
    if (localStorage.getItem('isAdmin') !== 'true' || !localStorage.getItem('adminAuthToken')) {
      window.alert('관리자 로그인이 필요합니다.');
      navigate('/admin/login');
      return;
    }
    setReady(true);
  }, [navigate]);

  const loadInquiries = useCallback(async () => setInquiries(await fetchInquiries()), []);
  const loadBlocks = useCallback(async () => setBlocks(await fetchBlocks()), []);
  const loadUsers = useCallback(async () => setUsers(await fetchUsers()), []);
  const loadNotices = useCallback(async () => setNotices(await fetchNotices()), []);
  const loadTier = useCallback(async () => {
    const { posts, comments } = await fetchTierReports();
    setTierPosts(posts);
    setTierComments(comments);
  }, []);

  useEffect(() => {
    if (!ready || isStaticPreview()) return;
    // 서로 의존관계가 없는 독립 API 라 병렬로 한 번에 불러온다
    Promise.all([loadInquiries(), loadBlocks(), loadUsers(), loadNotices(), loadTier()])
      .catch((err) => console.error('대시보드 로딩 실패:', err))
      .finally(() => {
        // 표가 그려져 페이지 길이가 정해진 뒤에 이동해야 목적지가 밀리지 않는다(/admin#admin-notices, 이벤트 페이지의 /admin#admin-events 링크 등).
        if (hashHandled.current) return;
        hashHandled.current = true;
        const id = window.location.hash.slice(1);
        if (id) window.requestAnimationFrame(() => scrollToAnchor(id, { smooth: false, updateHash: false }));
      });
    adminRequest('/api/notices/youtube-sync/status')
      .then((res) => { if (res.ok) setYoutubeStatus(formatYoutubeSyncStatus(res.data.status)); })
      .catch((err) => console.error(err));
  }, [ready, loadInquiries, loadBlocks, loadUsers, loadNotices, loadTier]);

  // ── 공용 액션 헬퍼 ────────────────────────────────────────
  const call = async (path, options, failMessage) => {
    try {
      const res = await adminRequest(path, options);
      if (res.ok && (res.data.success === undefined || res.data.success)) return res.data;
      window.alert(`❌ ${res.data.error || failMessage}`);
      return null;
    } catch (err) {
      console.error(err);
      window.alert('❌ 서버와 연결할 수 없습니다.');
      return null;
    }
  };

  const activeBlocks = useMemo(() => getActiveBlocks(blocks), [blocks]);

  // 빠른 이동 바의 태그 목록(페이지 위→아래 순서). count>0 이면 개수 배지가 붙고, alert 는 처리할 것이 있다는 뜻(빨간색).
  const quickItems = useMemo(() => [
    { id: 'admin-inquiries', icon: '💬', label: '댓글', hint: '전체 댓글 관리', count: inquiries.length },
    { id: 'admin-tier', icon: '🎨', label: '커스텀 메이커 신고', hint: '게시글·댓글 신고 관리', count: tierPosts.length + tierComments.length, alert: true },
    { id: 'admin-notices', icon: '📢', label: '공지', hint: '공지 작성·수정·고정', count: notices.length },
    { id: 'admin-memory-events', icon: '🃏', label: '메모리 기록 이벤트', hint: '기록 이벤트 열기·닫기·정산' },
    { id: 'admin-showcase', icon: '🖼️', label: '티어표 공개', hint: '제작한 티어표 공개 이벤트 관리' },
    { id: 'admin-blocks', icon: '🚫', label: '차단', hint: '회원 / IP 차단 관리', count: activeBlocks.length },
  ], [inquiries.length, tierPosts.length, tierComments.length, notices.length, activeBlocks.length]);
  const findBlock = (value) => activeBlocks.find((b) => b.value === value);
  const userEmail = (nickname) => users.find((u) => u.nickname === nickname)?.email || '-';
  const isBlockedUser = (userId, ip) => activeBlocks.some((b) => b.value === (userId || '') || b.value === (ip || ''));

  // ── ① 문의 목록 ──────────────────────────────────────────
  const filteredInquiries = useMemo(() => {
    const term = search.toLowerCase().trim();
    const list = inquiries.filter((c) => {
      if (typeFilter === 'user' && c.isAdmin) return false;
      if (typeFilter === 'admin' && !c.isAdmin) return false;
      if (typeFilter === 'reported' && !c.reported) return false;
      if (reportFilter && (!c.reported || c.reportReason !== reportFilter)) return false;
      if (term) {
        const text = `${c.title} ${c.message} ${c.userId || ''} ${userEmail(c.userId)}`.toLowerCase();
        if (!text.includes(term)) return false;
      }
      return true;
    });
    return list.sort((a, b) => (sort === 'newest'
      ? new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      : new Date(a.createdAt || 0) - new Date(b.createdAt || 0)));
  }, [inquiries, typeFilter, reportFilter, sort, search, users]);

  const inquiryPages = Math.ceil(filteredInquiries.length / ITEMS_PER_PAGE) || 1;
  const inquiryStart = (Math.min(page, inquiryPages) - 1) * ITEMS_PER_PAGE;
  const pagedInquiries = filteredInquiries.slice(inquiryStart, inquiryStart + ITEMS_PER_PAGE);

  const deleteInquiry = async (id) => {
    if (!window.confirm('정말 이 댓글을 삭제하시겠습니까?')) return;
    if (await call(`/api/inquiries/${id}`, { method: 'DELETE' }, '삭제 실패')) {
      // 재요청 없이 로컬에서 바로 걸러내 반응성을 높인다
      setInquiries((cur) => cur.filter((c) => rowId(c) !== String(id)));
    }
  };

  const deleteAllInquiries = async () => {
    if (!window.confirm('⚠️ 정말 모든 댓글을 삭제하시겠습니까? (복구 불가)')) return;
    if (await call('/api/inquiries', { method: 'DELETE' }, '전체 삭제 실패')) setInquiries([]);
  };

  // ── ② 커스텀 메이커 신고 관리 ────────────────────────────
  const tierAction = async (path, method, confirmText, failMessage) => {
    if (!window.confirm(confirmText)) return;
    if (await call(path, { method }, failMessage)) loadTier();
  };

  // ── ③ 공지 ───────────────────────────────────────────────
  const pinnedCount = notices.filter((n) => n.isPinned).length;
  const visibleNotices = useMemo(() => sortAdminNotices(
    noticeFilter === 'all' ? notices : notices.filter((n) => n.category === noticeFilter),
  ), [notices, noticeFilter]);
  const noticePages = Math.ceil(visibleNotices.length / NOTICE_ITEMS_PER_PAGE) || 1;
  const noticeStart = (Math.min(noticePage, noticePages) - 1) * NOTICE_ITEMS_PER_PAGE;
  const pagedNotices = visibleNotices.slice(noticeStart, noticeStart + NOTICE_ITEMS_PER_PAGE);

  const cancelNoticeEdit = () => { setEditingNoticeId(null); setNoticeForm(EMPTY_NOTICE_FORM); };

  const startEditNotice = async (id) => {
    let notice = notices.find((n) => rowId(n) === String(id));
    // 목록 응답에는 본문이 빠져 있을 수 있어 비어있으면 상세를 한 번 더 조회한다
    if (!notice || !(notice.content || '').trim()) {
      const res = await apiRequest(`/api/notices/${id}`, { auth: false }).catch(() => null);
      if (!res?.ok) { window.alert('❌ 공지 내용을 불러올 수 없습니다.'); return; }
      notice = res.data;
      setNotices((cur) => {
        const idx = cur.findIndex((n) => rowId(n) === String(id));
        if (idx === -1) return [notice, ...cur];
        const next = [...cur];
        next[idx] = notice;
        return next;
      });
    }
    setEditingNoticeId(String(id));
    setNoticeForm({
      title: notice.title || '',
      summary: notice.summary || '',
      content: notice.content || '',
      category: notice.category === 'news' ? 'news' : 'notice',
    });
    window.scrollTo({ top: document.querySelector('.notice-form-card')?.offsetTop || 0, behavior: 'smooth' });
  };

  const submitNotice = async () => {
    const title = noticeForm.title.trim();
    const content = noticeForm.content.trim();
    if (!title || !content) { window.alert('제목과 내용을 입력해주세요.'); return; }

    const isEdit = Boolean(editingNoticeId);
    const body = {
      title,
      summary: noticeForm.summary.trim(),
      content,
      category: noticeForm.category,
      ...(isEdit ? {} : { author: localStorage.getItem('adminName') || '관리자' }),
    };

    setNoticeBusy(true);
    const data = await call(
      isEdit ? `/api/notices/${editingNoticeId}` : '/api/notices',
      { method: isEdit ? 'PUT' : 'POST', body: JSON.stringify(body) },
      isEdit ? '공지 수정 실패' : '공지 등록 실패',
    );
    setNoticeBusy(false);
    if (!data) return;

    const label = NOTICE_CATEGORY_LABELS[noticeForm.category] || noticeForm.category;
    if (isEdit) {
      setNotices((cur) => {
        const idx = cur.findIndex((n) => rowId(n) === String(editingNoticeId));
        if (idx === -1) return [data.notice, ...cur];
        const next = [...cur];
        next[idx] = data.notice;
        return next;
      });
      cancelNoticeEdit();
      window.alert(`✅ ${label} 공지가 수정되었습니다.`);
      return;
    }
    setNotices((cur) => [data.notice, ...cur]);
    setNoticePage(1);
    setNoticeForm(EMPTY_NOTICE_FORM);
    window.alert(`✅ ${label} 공지가 등록되었습니다.`);
  };

  const togglePin = async (id) => {
    const data = await call(`/api/notices/${id}/pin`, { method: 'PATCH' }, '고정 처리 실패');
    if (!data) return;
    setNotices((cur) => cur.map((n) => (rowId(n) === String(id) ? data.notice : n)));
  };

  const deleteNotice = async (id) => {
    if (!window.confirm('이 공지를 삭제하시겠습니까?')) return;
    if (!await call(`/api/notices/${id}`, { method: 'DELETE' }, '삭제 실패')) return;
    setNotices((cur) => cur.filter((n) => rowId(n) !== String(id)));
    // 지금 수정 중이던 공지를 지웠다면 수정 모드도 함께 정리한다
    if (editingNoticeId && String(editingNoticeId) === String(id)) cancelNoticeEdit();
    window.alert('✅ 공지가 삭제되었습니다.');
  };

  const syncYoutube = async () => {
    setYoutubeBusy(true);
    setYoutubeStatus('유튜브 게시판을 확인하는 중...');
    const data = await call('/api/notices/youtube-sync', { method: 'POST' }, '유튜브 동기화 실패');
    setYoutubeBusy(false);
    if (!data) { setYoutubeStatus('유튜브 동기화에 실패했습니다.'); return; }
    setYoutubeStatus(formatYoutubeSyncStatus(null, data.result));
    await loadNotices();
    const created = data.result?.created || 0;
    const translated = data.result?.translated || 0;
    if (created) window.alert(`✅ 유튜브 게시판에서 새 소식 ${created}개를 등록했습니다.`);
    else if (translated) window.alert(`✅ 기존 유튜브 글 ${translated}개를 한국어로 번역했습니다.`);
    else window.alert('✅ 확인할 새 유튜브 게시글이 없습니다. 이미 가져온 글은 건너뜁니다.');
  };

  // ── ④ 차단 / 회원 ────────────────────────────────────────
  const selectedDurationDays = () => {
    if (blockDuration !== 'custom') return parseInt(blockDuration, 10);
    const days = parseInt(customDays, 10);
    if (!Number.isFinite(days) || days < 1 || days > 9999) {
      window.alert('관리자 지정 기간은 1일 이상 9999일 이하로 입력해주세요.');
      return null;
    }
    return days;
  };

  // 상단 입력창(value 없이 호출) / 회원 표의 차단 버튼(value=닉네임) 두 경로에서 재사용
  const addBlock = async (value, durationDays) => {
    const target = (value ?? blockInput).trim();
    if (!target) { window.alert('차단할 ID 또는 IP를 입력해주세요.'); return; }
    const days = durationDays ?? selectedDurationDays();
    if (!days) return;

    const data = await call('/api/admin/blocks', {
      method: 'POST',
      body: JSON.stringify({ value: target, durationDays: days }),
    }, '차단 추가 실패');
    if (!data) return;
    setBlocks((cur) => [...cur.filter((b) => b.value !== data.block.value), data.block]);
    if (!value) setBlockInput('');
    window.alert(`✅ ${target} 님을 ${days}일간 차단했습니다.`);
  };

  const unblock = async (blockId) => {
    if (!window.confirm('관리자 재량으로 이 차단을 해제하시겠습니까?')) return;
    if (!await call(`/api/admin/blocks/${blockId}`, { method: 'DELETE' }, '차단 해제 실패')) return;
    setBlocks((cur) => cur.filter((b) => b._id !== blockId));
    window.alert('✅ 차단이 해제되었습니다.');
  };

  const verifyUser = async (userId, nickname) => {
    if (!userId) { window.alert('❌ 사용자 정보를 찾을 수 없습니다.'); return; }
    if (!window.confirm(`${nickname || '이 회원'} 님을 이메일 인증 완료 처리할까요?\n인증 메일을 받지 못한 경우 이 버튼으로 로그인할 수 있게 합니다.`)) return;
    const data = await call(`/api/admin/users/${encodeURIComponent(userId)}/verify`, {
      method: 'POST', body: JSON.stringify({}),
    }, '인증 처리 실패');
    if (!data) return;
    window.alert(`✅ ${data.message || '인증을 완료했습니다.'}`);
    loadUsers();
  };

  // 서버가 해당 회원의 게시글·댓글·문의까지 연쇄 삭제하므로 되돌릴 수 없다
  const deleteUser = async (userId, nickname) => {
    if (!userId) { window.alert('❌ 사용자 정보를 찾을 수 없습니다.'); return; }
    if (!window.confirm(`${nickname || '이 회원'} 님의 회원 계정을 삭제할까요?\n커스텀 게시글·댓글·문의도 함께 삭제되며 복구할 수 없습니다.`)) return;
    if (!await call(`/api/admin/users/${encodeURIComponent(userId)}`, { method: 'DELETE' }, '회원 삭제 실패')) return;
    window.alert('✅ 회원이 삭제되었습니다.');
    await Promise.all([loadUsers(), loadBlocks(), loadInquiries(), loadTier()]);
  };

  if (!ready) return null;
  if (isStaticPreview()) {
    return <main className="admin-container"><p className="react-state-msg">관리자 기능은 서버가 있는 환경에서만 사용할 수 있습니다.</p></main>;
  }

  const filterBtn = (value, current, onClick, label) => (
    <button type="button" className={`filter-btn${current === value ? ' active' : ''}`} onClick={() => onClick(value)}>{label}</button>
  );

  return (
    <main className="admin-container" id="top">
      <AdminQuickNav items={quickItems} />

      {/* ==================== ① 문의(댓글) 목록 관리 ==================== */}
      <h1 className="page-title" id="admin-inquiries" data-admin-anchor>📋 전체 댓글 관리</h1>

      <div className="filter-nav">
        <div className="filter-left">
          <span className="filter-title">댓글 탐색 기능</span>
          {filterBtn('all', typeFilter, (v) => { setTypeFilter(v); setPage(1); }, '전체 댓글')}
          {filterBtn('user', typeFilter, (v) => { setTypeFilter(v); setPage(1); }, '일반유저 댓글')}
          {filterBtn('admin', typeFilter, (v) => { setTypeFilter(v); setPage(1); }, '관리자 댓글')}
          {filterBtn('reported', typeFilter, (v) => { setTypeFilter(v); setPage(1); }, '신고한 댓글')}
          <select className="filter-select" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="newest">최신순</option>
            <option value="oldest">오래된순</option>
          </select>
        </div>
        <div className="filter-right">
          <div className="search-group">
            <input
              type="text"
              placeholder="작성자ID 또는 내용 검색..."
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              onKeyUp={(e) => { if (e.key === 'Enter') { setSearch(searchDraft); setPage(1); } }}
            />
            <button type="button" className="search-btn" onClick={() => { setSearch(searchDraft); setPage(1); }}>🔍 검색</button>
          </div>
          <select className="filter-select" value={reportFilter} onChange={(e) => { setReportFilter(e.target.value); setPage(1); }}>
            <option value="">없음</option>
            {REPORT_REASON_OPTIONS.map((r) => <option value={r} key={r}>{r}</option>)}
          </select>
        </div>
      </div>

      <div className="control-bar">
        <button type="button" className="danger-btn" onClick={deleteAllInquiries}>🗑️ 모든 댓글 삭제</button>
      </div>

      <table className="admin-table">
        <thead>
          <tr><th>No</th><th>작성자 ID</th><th>이메일</th><th>댓글 내용</th><th>작성일</th><th>관리</th></tr>
        </thead>
        <tbody>
          {pagedInquiries.length === 0 && <tr className="empty-row"><td colSpan={6}>표시할 댓글이 없습니다.</td></tr>}
          {pagedInquiries.map((c, idx) => {
            const id = rowId(c);
            const reason = c.reported
              ? `${c.reportReason || '신고됨'}${c.reportDetail ? ` (${c.reportDetail})` : ''}`
              : '';
            return (
              <tr className={isBlockedUser(c.userId, c.ip) ? 'row-blocked' : ''} key={id}>
                <td>{inquiryStart + idx + 1}</td>
                <td>{c.userId || '익명'}</td>
                <td>{userEmail(c.userId)}</td>
                <td style={{ textAlign: 'center' }}>
                  {c.title && <><strong>{c.title}</strong><br /></>}{c.message || ''}
                </td>
                <td>{c.date || 'N/A'}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button type="button" className="action-btn" onClick={() => navigate(`/admin/comment?id=${encodeURIComponent(id)}`)}>📋 상세</button>
                  <button type="button" className="danger-btn" onClick={() => deleteInquiry(id)}>삭제</button>
                  {c.reported && <span className="report-flag" title={reason} onClick={() => window.alert(`🚨 신고 사유\n${reason}`)}>⚠️</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <AdminPagination page={Math.min(page, inquiryPages)} totalPages={inquiryPages} onChange={setPage} />

      {/* ==================== ② 커스텀 메이커 관리 ==================== */}
      <section className="notice-admin-section tier-maker-section" id="admin-tier" data-admin-anchor>
        <h2 className="page-title tier-section-title">📋 커스텀 메이커 관리</h2>

        <h3 className="subsection-title">게시글</h3>
        <div className="filter-nav tier-filter-nav">
          <div className="filter-left">
            <span className="filter-title">분류</span>
            {filterBtn('all', postFilter, setPostFilter, '전체')}
            {filterBtn('normal', postFilter, setPostFilter, '일반')}
            {filterBtn('reported', postFilter, setPostFilter, '신고')}
          </div>
        </div>
        <table className="admin-table">
          <thead>
            <tr><th>No</th><th>분류</th><th>제목</th><th>작성자</th><th>신고 사유</th><th>작성일</th><th>관리</th></tr>
          </thead>
          <tbody>
            {filterTierItems(tierPosts, postFilter).length === 0 && (
              <tr className="empty-row"><td colSpan={7}>
                {postFilter === 'normal' ? '일반 게시글이 없습니다.' : postFilter === 'reported' ? '신고된 게시글이 없습니다.' : '등록된 게시글이 없습니다.'}
              </td></tr>
            )}
            {filterTierItems(tierPosts, postFilter).map((post, idx) => {
              const id = rowId(post);
              return (
                <tr className={post.reported ? 'row-reported' : ''} key={id}>
                  <td>{idx + 1}</td>
                  <td><span className={`badge ${post.reported ? 'badge-tier-reported' : 'badge-tier-normal'}`}>{post.reported ? '신고' : '일반'}</span></td>
                  <td>{post.title}</td>
                  <td>{post.author || '-'}</td>
                  <td>{reportReasonText(post)}</td>
                  <td>{formatDate(post.updatedAt || post.createdAt)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {post.reported && (
                      <button type="button" className="action-btn" onClick={() => tierAction(`/api/admin/tier-reports/posts/${id}/dismiss`, 'PATCH', '이 게시글 신고를 해제할까요?', '신고 해제에 실패했습니다.')}>해제</button>
                    )}
                    <button type="button" className="danger-btn" onClick={() => tierAction(`/api/admin/tier-reports/posts/${id}`, 'DELETE', '이 게시글을 삭제할까요?', '게시글 삭제에 실패했습니다.')}>삭제</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <h3 className="subsection-title" style={{ marginTop: 28 }}>댓글</h3>
        <div className="filter-nav tier-filter-nav">
          <div className="filter-left">
            <span className="filter-title">분류</span>
            {filterBtn('all', commentFilter, setCommentFilter, '전체')}
            {filterBtn('normal', commentFilter, setCommentFilter, '일반')}
            {filterBtn('reported', commentFilter, setCommentFilter, '신고')}
          </div>
        </div>
        <table className="admin-table">
          <thead>
            <tr><th>No</th><th>분류</th><th>게시글 ID</th><th>작성자</th><th>내용</th><th>신고 사유</th><th>관리</th></tr>
          </thead>
          <tbody>
            {filterTierItems(tierComments, commentFilter).length === 0 && (
              <tr className="empty-row"><td colSpan={7}>
                {commentFilter === 'normal' ? '일반 댓글이 없습니다.' : commentFilter === 'reported' ? '신고된 댓글이 없습니다.' : '등록된 댓글이 없습니다.'}
              </td></tr>
            )}
            {filterTierItems(tierComments, commentFilter).map((c, idx) => {
              const id = rowId(c);
              const content = c.content || '';
              return (
                <tr className={c.reported ? 'row-reported' : ''} key={id}>
                  <td>{idx + 1}</td>
                  <td><span className={`badge ${c.reported ? 'badge-tier-reported' : 'badge-tier-normal'}`}>{c.reported ? '신고' : '일반'}</span></td>
                  <td>{String(c.tierListId || '-')}</td>
                  <td>{c.author || '-'}</td>
                  <td>{content.length > 80 ? `${content.slice(0, 80)}...` : content}</td>
                  <td>{reportReasonText(c)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {c.reported && (
                      <button type="button" className="action-btn" onClick={() => tierAction(`/api/admin/tier-reports/comments/${id}/dismiss`, 'PATCH', '이 댓글 신고를 해제할까요?', '신고 해제에 실패했습니다.')}>해제</button>
                    )}
                    <button type="button" className="danger-btn" onClick={() => tierAction(`/api/admin/tier-reports/comments/${id}`, 'DELETE', '이 댓글을 삭제할까요?', '댓글 삭제에 실패했습니다.')}>삭제</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* ==================== ③ 공지 올리기 / 수정 ==================== */}
      <section className="notice-admin-section" id="admin-notices" data-admin-anchor>
        <NoticeEditor
          form={noticeForm}
          onChange={setNoticeForm}
          onSubmit={submitNotice}
          onCancelEdit={cancelNoticeEdit}
          isEdit={Boolean(editingNoticeId)}
          busy={noticeBusy}
        />

        <div className="youtube-sync-bar">
          <div className="youtube-sync-text"><span>{youtubeStatus}</span></div>
          <button type="button" className="youtube-sync-btn" disabled={youtubeBusy} onClick={syncYoutube}>
            유튜브 게시판 가져오기
          </button>
        </div>

        <h3 className="subsection-title">
          📋 등록된 공지 목록 <span className="notice-pin-count">(고정 {pinnedCount}/{MAX_PINNED_NOTICES})</span>
        </h3>

        <div className="filter-nav notice-list-filter-nav">
          <div className="filter-left notice-filter-left">
            <span className="filter-title">공지 분류</span>
            <select className="filter-select" value={noticeFilter} onChange={(e) => { setNoticeFilter(e.target.value); setNoticePage(1); }}>
              <option value="all">전체</option>
              <option value="notice">전체 공지</option>
              <option value="news">새 소식</option>
            </select>
          </div>
        </div>

        <table className="admin-table notice-admin-table">
          <thead>
            <tr><th>No</th><th>고정</th><th>분류</th><th>제목</th><th>요약</th><th>작성일</th><th>관리</th></tr>
          </thead>
          <tbody>
            {pagedNotices.length === 0 && (
              <tr className="empty-row"><td colSpan={7}>
                {noticeFilter === 'notice' ? '전체 공지 항목이 없습니다.' : noticeFilter === 'news' ? '새 소식 항목이 없습니다.' : '등록된 공지가 없습니다.'}
              </td></tr>
            )}
            {pagedNotices.map((notice, idx) => {
              const id = rowId(notice);
              const canPin = pinnedCount < MAX_PINNED_NOTICES;
              return (
                <tr className={notice.isPinned ? 'row-pinned' : ''} key={id}>
                  <td>{noticeStart + idx + 1}</td>
                  <td>{notice.isPinned ? <span className="badge badge-pinned">📌 고정</span> : <span style={{ color: 'var(--text-muted)' }}>-</span>}</td>
                  <td><span className={`badge ${notice.category === 'news' ? 'badge-news' : 'badge-notice'}`}>{NOTICE_CATEGORY_LABELS[notice.category] || notice.category}</span></td>
                  <td><strong>{notice.title}</strong>{notice.source === 'youtube' && <span className="badge badge-youtube"> YouTube</span>}</td>
                  <td>{notice.summary || '-'}</td>
                  <td>{formatDate(notice.createdAt)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button type="button" className="notice-edit-btn" onClick={() => startEditNotice(id)}>수정</button>
                    <button
                      type="button"
                      className={`pin-btn${notice.isPinned ? ' unpin' : ''}`}
                      disabled={!notice.isPinned && !canPin}
                      onClick={() => togglePin(id)}
                    >
                      {notice.isPinned ? '고정 해제' : '📌 고정'}
                    </button>
                    <button type="button" className="danger-btn" onClick={() => deleteNotice(id)}>삭제</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <AdminPagination page={Math.min(noticePage, noticePages)} totalPages={noticePages} onChange={setNoticePage} />
      </section>

      {/* ==================== ⑤ 이벤트 관리 ==================== */}
      <AdminEventManager />

      {/* ==================== ④ 차단 관리 ==================== */}
      <section className="block-section" id="admin-blocks" data-admin-anchor>
        <h2 className="page-title section-title">🚫 사용자 / IP 차단 관리</h2>

        <div className="filter-nav block-filter-nav">
          <div className="filter-left block-filter-left">
            <span className="filter-title">차단 추가</span>
            <input
              type="text"
              className="block-text-input"
              placeholder="차단할 ID 또는 IP 입력"
              value={blockInput}
              onChange={(e) => setBlockInput(e.target.value)}
            />
            <select
              className="filter-select block-duration-select"
              value={blockDuration}
              onChange={(e) => { setBlockDuration(e.target.value); if (e.target.value !== 'custom') setCustomDays(''); }}
            >
              {BLOCK_DURATIONS.map((d) => <option value={String(d)} key={d}>{d}일</option>)}
              <option value="custom">관리자 지정</option>
            </select>
            <input
              type="number"
              className={`block-custom-days${blockDuration === 'custom' ? ' visible' : ''}`}
              min="1"
              max="9999"
              placeholder="일수 (최대 9999)"
              value={customDays}
              onChange={(e) => setCustomDays(e.target.value)}
            />
            <button type="button" className="block-add-btn" onClick={() => addBlock()}>🚫 차단 추가</button>
          </div>
        </div>

        <h3 className="subsection-title">👥 등록된 사용자 (회원가입)</h3>
        <table className="admin-table block-table">
          <thead>
            <tr><th>No</th><th>닉네임</th><th>이메일</th><th>가입일</th><th>인증</th><th>상태</th><th>관리</th></tr>
          </thead>
          <tbody>
            {users.length === 0 && <tr className="empty-row"><td colSpan={7}>등록된 사용자가 없습니다.</td></tr>}
            {users.map((user, idx) => {
              const block = findBlock(user.nickname);
              const uid = rowId(user);
              return (
                <tr className={block ? 'row-blocked' : ''} key={uid || user.nickname}>
                  <td>{idx + 1}</td>
                  <td><strong>{user.nickname}</strong></td>
                  <td>{user.email}</td>
                  <td>{formatJoinedAt(user.createdAt)}</td>
                  <td>
                    <span className={`badge ${user.isVerified ? 'badge-verified' : 'badge-unverified'}`}>
                      {user.isVerified ? '✔ 인증완료' : '미인증'}
                    </span>
                  </td>
                  <td>
                    {block
                      ? <span className="badge badge-blocked">차단중 ({getRemainingLabel(block.expiresAt)})</span>
                      : <span className="badge badge-active">정상</span>}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {!user.isVerified && (
                      <button type="button" className="verify-user-btn" onClick={() => verifyUser(uid, user.nickname)}>인증하기</button>
                    )}
                    {block
                      ? <button type="button" className="unblock-btn" onClick={() => unblock(block._id)}>차단 해제</button>
                      : (
                        <button
                          type="button"
                          className="block-btn block-user-btn"
                          onClick={() => {
                            const days = selectedDurationDays();
                            if (!days) return;
                            if (!window.confirm(`${user.nickname} 님을 ${days}일간 차단하시겠습니까?`)) return;
                            addBlock(user.nickname, days);
                          }}
                        >
                          차단
                        </button>
                      )}
                    <button type="button" className="danger-btn delete-user-btn" onClick={() => deleteUser(uid, user.nickname)}>삭제</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <h3 className="subsection-title">🚫 차단 목록</h3>
        <table className="admin-table block-table">
          <thead>
            <tr><th>No</th><th>대상</th><th>유형</th><th>차단 기간</th><th>차단일</th><th>만료일</th><th>남은 기간</th><th>관리</th></tr>
          </thead>
          <tbody>
            {activeBlocks.length === 0 && <tr className="empty-row"><td colSpan={8}>차단된 항목이 없습니다.</td></tr>}
            {activeBlocks.map((block, idx) => (
              <tr key={block._id}>
                <td>{idx + 1}</td>
                <td><strong>{block.value}</strong></td>
                <td><span className="badge badge-type">{block.type === 'ip' ? 'IP' : 'ID'}</span></td>
                <td>{block.durationDays}일</td>
                <td>{formatDate(block.blockedAt || block.createdAt)}</td>
                <td>{formatDate(block.expiresAt)}</td>
                <td>{getRemainingLabel(block.expiresAt)}</td>
                <td><button type="button" className="unblock-btn" onClick={() => unblock(block._id)}>차단 해제</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
