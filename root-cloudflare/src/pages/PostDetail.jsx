// 게시글 상세 (custom-maker_post/post_detail.html + .js 이식)
//  - 읽기 전용 티어표: 게시글이 저장한 tierDefinitions·tierState·style 로 그린다
//    (등급 정의를 함께 저장하므로 나중에 공식 티어 구성이 바뀌어도 작성 시점 그대로 재현된다)
//  - 댓글: 작성 / 답변(인용) / 수정 / 삭제 / 신고
//  - 알림 딥링크(?comment=…)로 들어오면 해당 댓글로 스크롤 + 하이라이트
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import ReportModal from '../components/ReportModal';
import { useAuth } from '../context/AuthContext';
import { TIERS } from '../data/tiers';
import { isStaticPreview } from '../lib/api';
import {
  consumeStoredPostId, createComment, deleteComment, deletePost, fetchComments, fetchPostById,
  formatCommentDate, getPostId, isSameAuthor, isValidPostId, likePost, reportComment, reportPost,
  updateComment,
} from '../lib/boardApi';
import { formatFullDate } from '../lib/noticeFormat';
import { clearNotificationScrollTarget, getNotificationScrollTarget } from '../lib/notifications';
import { LOGO_URL, tierImageUrl } from '../lib/paths';
import { normalizeStyleMap, tierStyleProps } from '../lib/tierStyle';
import '../styles/custom-maker.css';
import '../styles/custom-maker_post.css';
import '../styles/post_detail.css';

// 게시글에 등급 정의가 없던 옛 글은 현재 공식 정의로 대신 그린다
const DEFAULT_DEFINITIONS = TIERS.map((t) => ({ id: t.tier, title: t.title, subTiers: t.subTiers }));

const getCommentId = (c) => String(c?._id || c?.id || '');

export default function PostDetail() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { isLoggedIn, nickname, email, isAdmin } = useAuth();
  const user = isLoggedIn ? { nickname, email, isAdmin } : null;

  const paramId = params.get('id') || '';
  const id = useMemo(() => (isValidPostId(paramId) ? paramId : consumeStoredPostId()), [paramId]);
  const focusCommentId = params.get('comment') || '';

  const [post, setPost] = useState(null);
  const [error, setError] = useState('');
  const [tierIndex, setTierIndex] = useState(0);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [openBox, setOpenBox] = useState(null); // { mode: 'reply'|'edit', id, text }
  const [reportTarget, setReportTarget] = useState(null); // { kind: 'post'|'comment', id }
  const [busy, setBusy] = useState(false);
  const commentsRef = useRef(null);

  const definitions = post?.tierData?.tierDefinitions?.length
    ? post.tierData.tierDefinitions
    : DEFAULT_DEFINITIONS;
  const tierState = post?.tierData?.tierState || {};
  const styleMap = useMemo(() => normalizeStyleMap(post?.tierData?.style), [post]);
  const current = definitions[tierIndex] || definitions[0];
  const owner = user && isSameAuthor(post || {}, user);

  const loadComments = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetchComments(id);
      if (res.ok) setComments(Array.isArray(res.data) ? res.data : (res.data.comments || []));
    } catch (err) {
      console.error(err);
    }
  }, [id]);

  useEffect(() => {
    if (!id) { setError('잘못된 접근입니다. 게시판에서 글을 선택해주세요.'); return; }
    if (isStaticPreview()) { setError('서버가 있는 환경에서만 볼 수 있습니다.'); return; }
    fetchPostById(id)
      .then((p) => {
        setPost(p);
        document.title = `${p.title} - 휴버대 티어표`;
      })
      .catch((err) => {
        console.error(err);
        setError('게시글을 찾을 수 없습니다. 삭제되었거나 잘못된 링크일 수 있습니다.');
      });
    loadComments();
  }, [id, loadComments]);

  // 알림을 타고 들어왔으면 해당 댓글로 스크롤 + 잠깐 강조
  useEffect(() => {
    const target = focusCommentId || getNotificationScrollTarget()?.commentId;
    if (!target || !comments.length) return;
    const el = document.querySelector(`[data-comment-id="${target}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('is-highlighted');
    const timer = setTimeout(() => el.classList.remove('is-highlighted'), 2400);
    clearNotificationScrollTarget();
    return () => clearTimeout(timer);
  }, [comments, focusCommentId]);

  const requireLogin = (message) => {
    if (user) return true;
    if (window.confirm(`${message}\n로그인 페이지로 이동할까요?`)) navigate('/login');
    return false;
  };

  const onLike = async () => {
    if (!requireLogin('추천하려면 로그인이 필요합니다.')) return;
    const res = await likePost(id).catch(() => null);
    if (res?.ok) {
      setPost((p) => ({ ...p, likeCount: res.data.likeCount ?? p.likeCount, likedByMe: res.data.likedByMe }));
      return;
    }
    window.alert(`❌ ${res?.data?.error || '추천에 실패했습니다.'}`);
  };

  const onShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      window.alert('🔗 링크가 복사되었습니다.');
    } catch {
      window.prompt('아래 링크를 복사하세요', url);
    }
  };

  const onDeletePost = async () => {
    if (!window.confirm('이 게시글을 삭제할까요?\n삭제한 글은 복구할 수 없습니다.')) return;
    const res = await deletePost(id).catch(() => null);
    if (res?.ok) {
      window.alert('게시글이 삭제되었습니다.');
      navigate('/board');
      return;
    }
    window.alert(`❌ ${res?.data?.error || '삭제에 실패했습니다.'}`);
  };

  const submitComment = async () => {
    if (!requireLogin('댓글을 작성하려면 로그인이 필요합니다.')) return;
    const text = commentText.trim();
    if (!text) { window.alert('댓글 내용을 입력해주세요.'); return; }
    if (text.length > 1000) { window.alert('댓글은 1000자 이하로 작성해주세요.'); return; }

    setBusy(true);
    try {
      const res = await createComment(id, { content: text });
      if (res.ok && res.data.success) { setCommentText(''); await loadComments(); return; }
      window.alert(res.data.blocked ? '관리자로 인해 차단당했습니다.' : `❌ ${res.data.error || '댓글 등록에 실패했습니다.'}`);
    } catch (err) {
      console.error(err);
      window.alert('❌ 서버에 연결할 수 없습니다.');
    } finally {
      setBusy(false);
    }
  };

  // 답변은 원댓글을 서버에 다시 묻지 않고 이미 받아둔 목록에서 인용문을 만든다
  const submitReply = async (parent) => {
    const text = (openBox?.text || '').trim();
    if (!text) { window.alert('답변 내용을 입력해주세요.'); return; }
    const quoted = parent.content || '';
    setBusy(true);
    try {
      const res = await createComment(id, {
        content: text,
        parentCommentId: getCommentId(parent),
        quotedUser: parent.author || '',
        quotedMessage: quoted.length > 200 ? `${quoted.slice(0, 200)}...` : quoted,
      });
      if (res.ok && res.data.success) { setOpenBox(null); await loadComments(); return; }
      window.alert(res.data.blocked ? '관리자로 인해 차단당했습니다.' : `❌ ${res.data.error || '답변 등록에 실패했습니다.'}`);
    } finally {
      setBusy(false);
    }
  };

  const submitEdit = async (commentId) => {
    const text = (openBox?.text || '').trim();
    if (!text) { window.alert('수정할 내용을 입력해주세요.'); return; }
    setBusy(true);
    try {
      const res = await updateComment(id, commentId, text);
      if (res.ok && res.data.success) { setOpenBox(null); await loadComments(); return; }
      window.alert(`❌ ${res.data.error || '댓글 수정에 실패했습니다.'}`);
    } finally {
      setBusy(false);
    }
  };

  const onDeleteComment = async (commentId) => {
    if (!window.confirm('이 댓글을 삭제할까요?')) return;
    const res = await deleteComment(id, commentId).catch(() => null);
    if (res?.ok) { await loadComments(); return; }
    window.alert(`❌ ${res?.data?.error || '댓글 삭제에 실패했습니다.'}`);
  };

  const onReport = async (reason) => {
    const { kind, id: targetId } = reportTarget;
    const res = kind === 'post'
      ? await reportPost(id, reason).catch(() => null)
      : await reportComment(id, targetId, reason).catch(() => null);
    if (res?.ok) {
      window.alert('🚨 신고가 접수되었습니다. 관리자가 확인 후 조치합니다.');
      setReportTarget(null);
      if (kind === 'post') setPost((p) => ({ ...p, reported: true }));
      else loadComments();
      return;
    }
    window.alert(`❌ ${res?.data?.error || '신고에 실패했습니다.'}`);
  };

  if (error) {
    return (
      <main className="post-detail-container">
        <div className="react-state-msg">
          <h2>{error}</h2>
          <Link to="/board" style={{ display: 'inline-block', marginTop: 16 }}>← 게시판으로</Link>
        </div>
      </main>
    );
  }

  if (!post) return <main className="post-detail-container"><p className="react-state-msg">게시글을 불러오는 중...</p></main>;

  return (
    <main className="post-detail-container">
      <div className="post-header">
        <div className="post-author-profile">
          <img src={LOGO_URL} alt="프로필" className="profile-img" />
          <span className="author-name">{post.author || '익명'}</span>
        </div>
        <div className="post-meta-row">
          <div className="post-left">
            <button
              type="button"
              className="user-posts-btn"
              onClick={() => navigate(`/board?author=${encodeURIComponent(post.author || '')}`)}
            >
              유저관련 게시글 보기
            </button>
            <span className="post-date">{formatFullDate(post.createdAt)}</span>
          </div>
          <div className="post-right">
            <span className="stat">조회 <strong>{post.viewCount || 0}</strong></span>
            <span className="stat">추천 <strong>{post.likeCount || 0}</strong></span>
            <span
              className="stat comment-link"
              onClick={() => commentsRef.current?.scrollIntoView({ behavior: 'smooth' })}
            >
              댓글 <strong>{comments.length}</strong>
            </span>
          </div>
        </div>
      </div>

      <h1 className="post-title">{post.title}</h1>
      {post.description && <div className="post-description">{post.description}</div>}

      <div id="tier-section">
        <div className="tier-nav">
          <h2 id="tier-title">{current?.title}</h2>
          <nav className="tier-switch-nav" aria-label="등급 이동">
            <button
              type="button"
              className="tier-switch-btn tier-switch-arrow"
              onClick={() => setTierIndex((i) => (i - 1 + definitions.length) % definitions.length)}
              aria-label="이전 티어"
            >
              ←
            </button>
            <div className="tier-switch-pages">
              {definitions.map((d, i) => (
                <button
                  type="button"
                  key={d.id ?? i}
                  className={`tier-switch-btn${i === tierIndex ? ' is-active' : ''}`}
                  onClick={() => setTierIndex(i)}
                >
                  {d.id ?? i + 1}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="tier-switch-btn tier-switch-arrow"
              onClick={() => setTierIndex((i) => (i + 1) % definitions.length)}
              aria-label="다음 티어"
            >
              →
            </button>
          </nav>
        </div>

        {/* 게시글에 저장된 꾸미기(테두리 색·배경 이펙트)를 그대로 입힌다 */}
        <div id="tier-capture-area" {...tierStyleProps(styleMap, tierIndex)}>
          <div id="tier-list" className="tier-list">
            {(current?.subTiers || []).map((sub) => (
              <div className="tier" key={sub}>
                <div className="tier-name">{sub}</div>
                <div className="characters">
                  {(tierState[`${tierIndex}_${sub}`] || []).map((char, i) => (
                    <div className="char" key={`${char.id || char.name}-${i}`}>
                      <img src={tierImageUrl(char.img)} alt={char.name} loading="lazy" />
                      <p>{char.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="post-action">
        <button type="button" className={`action-btn like-btn${post.likedByMe ? ' liked' : ''}`} onClick={onLike}>
          ❤️ 추천하기 <span>{post.likeCount || 0}</span>
        </button>
        <button type="button" className="action-btn" onClick={onShare}>🔗 공유하기</button>
        {owner && (
          <button type="button" className="action-btn edit-btn" onClick={() => navigate(`/board/edit?id=${encodeURIComponent(getPostId(post))}`)}>
            ✏️ 수정하기
          </button>
        )}
        {user && !owner && (
          <button type="button" className="action-btn report-btn" disabled={Boolean(post.reported)} onClick={() => setReportTarget({ kind: 'post', id })}>
            🚨 {post.reported ? '신고됨' : '신고하기'}
          </button>
        )}
        {(owner || isAdmin) && (
          <button type="button" className="action-btn delete-btn" onClick={onDeletePost}>🗑️ 삭제하기</button>
        )}
      </div>

      <div className="comment-section" ref={commentsRef}>
        <h3>댓글 <span>({comments.length})</span></h3>
        {!user && <p className="comment-login-hint">댓글을 작성하려면 로그인이 필요합니다.</p>}
        <div className="comment-form">
          <textarea
            className="comment-input-box"
            placeholder="댓글을 입력하세요"
            value={commentText}
            disabled={!user}
            onChange={(e) => setCommentText(e.target.value)}
          />
          <button type="button" onClick={submitComment} disabled={!user || busy}>등록</button>
        </div>

        <div className="comment-list">
          {comments.map((c) => {
            const cid = getCommentId(c);
            const isMine = user && isSameAuthor(c, user);
            const box = openBox?.id === cid ? openBox : null;
            return (
              <article className={`post-comment-item${c.parentCommentId ? ' is-reply' : ''}`} data-comment-id={cid} key={cid}>
                <div className="post-comment-header">
                  <span className="post-comment-author">{c.author || '익명'}</span>
                  <span className="post-comment-date">{formatCommentDate(c.createdAt)}</span>
                </div>
                {c.quotedMessage && (
                  <div className="post-comment-quote">
                    <strong>{c.quotedUser || '익명'} &gt;&gt;</strong><br />
                    {c.quotedMessage}
                  </div>
                )}
                <div className="post-comment-body">{c.content}</div>

                {user && (
                  <div className="post-comment-actions">
                    <button type="button" className="post-comment-action-btn" onClick={() => setOpenBox({ mode: 'reply', id: cid, text: '' })}>답변</button>
                    {isMine && <button type="button" className="post-comment-action-btn" onClick={() => setOpenBox({ mode: 'edit', id: cid, text: c.content || '' })}>수정</button>}
                    {isMine && <button type="button" className="post-comment-action-btn danger" onClick={() => onDeleteComment(cid)}>삭제</button>}
                    {!isMine && (
                      <button type="button" className="post-comment-action-btn" disabled={Boolean(c.reported)} onClick={() => setReportTarget({ kind: 'comment', id: cid })}>
                        {c.reported ? '신고됨' : '신고'}
                      </button>
                    )}
                  </div>
                )}

                {box && (
                  <div className="post-comment-editor">
                    <textarea
                      className="comment-input-box"
                      placeholder={box.mode === 'reply' ? '답변을 입력하세요' : '내용을 수정하세요'}
                      value={box.text}
                      onChange={(e) => setOpenBox({ ...box, text: e.target.value })}
                    />
                    <div className="post-comment-editor-actions">
                      <button type="button" onClick={() => setOpenBox(null)}>취소</button>
                      <button type="button" disabled={busy} onClick={() => (box.mode === 'reply' ? submitReply(c) : submitEdit(cid))}>
                        {box.mode === 'reply' ? '답변 등록' : '수정 완료'}
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
          {comments.length === 0 && <p className="react-state-msg">첫 댓글을 남겨보세요.</p>}
        </div>
      </div>

      {reportTarget && (
        <ReportModal
          title={reportTarget.kind === 'post' ? '게시글 신고' : '댓글 신고'}
          onClose={() => setReportTarget(null)}
          onSubmit={onReport}
        />
      )}
    </main>
  );
}
