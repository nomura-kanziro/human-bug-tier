// 커스텀 티어 게시판 목록 (custom-maker_post.html + .js 이식)
//  - 검색창의 "@닉네임" 은 작성자 필터로 분리된다(서버 쿼리로 전달, 필터링은 서버가 수행)
//  - ?mine=1 은 마이페이지에서 들어오는 "내 글만" 모드 (본인 비공개 글 포함)
//  - 카드 위 버튼: 본인 글이면 수정, 남의 글이면 신고
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import ReportModal from '../components/ReportModal';
import { useAuth } from '../context/AuthContext';
import { isStaticPreview } from '../lib/api';
import {
  fetchPosts, formatPostDate, getPostId, isSameAuthor, isValidPostId, parseSearchForAuthor,
  rememberPostId, reportPost,
} from '../lib/boardApi';
import { LOGO_URL, tierImageUrl } from '../lib/paths';
import '../styles/custom-maker_post.css';

// 게시글 썸네일 — 없으면 배치된 첫 캐릭터, 그것도 없으면 로고
function getThumbnail(post) {
  if (post.thumbnail) {
    return post.thumbnail.startsWith('data:') || post.thumbnail.startsWith('http')
      ? post.thumbnail
      : tierImageUrl(post.thumbnail);
  }
  const firstChar = post.tierData?.tierState
    ? Object.values(post.tierData.tierState).flat().find((c) => c?.img)
    : null;
  return firstChar?.img ? tierImageUrl(firstChar.img) : LOGO_URL;
}

export default function Board() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { isLoggedIn, nickname, email } = useAuth();
  const user = isLoggedIn ? { nickname, email } : null;

  const mine = params.get('mine') === '1';
  const urlSearch = params.get('search') || '';
  const urlAuthor = params.get('author') || parseSearchForAuthor(urlSearch).author || '';
  const activeAuthor = mine ? (nickname || '') : urlAuthor;

  const [input, setInput] = useState(urlSearch || (urlAuthor ? `@${urlAuthor} ` : ''));
  const [posts, setPosts] = useState(null);
  const [error, setError] = useState('');
  const [reportTarget, setReportTarget] = useState(null);

  const load = useCallback(async () => {
    if (isStaticPreview()) { setError('서버가 있는 환경에서만 게시판을 볼 수 있습니다.'); setPosts([]); return; }
    setPosts(null);
    setError('');
    try {
      const { searchKeyword } = parseSearchForAuthor(urlSearch);
      setPosts(await fetchPosts({ search: searchKeyword, author: activeAuthor, mine }));
    } catch (err) {
      console.error(err);
      setError('게시글을 불러올 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.');
      setPosts([]);
    }
  }, [urlSearch, activeAuthor, mine]);

  useEffect(() => { document.title = '커스텀 티어 게시판 | 휴버대 티어표'; }, []);
  useEffect(() => { load(); }, [load]);

  const search = () => {
    const { searchKeyword, author } = parseSearchForAuthor(input);
    const next = new URLSearchParams();
    if (input.trim()) next.set('search', input.trim());
    if (author) next.set('author', author);
    if (mine) next.set('mine', '1');
    // searchKeyword 만 있고 author 가 없으면 search 파라미터로 충분하다
    setParams(next);
  };

  const onReport = async (reason) => {
    try {
      const res = await reportPost(reportTarget, reason);
      if (res.ok) {
        window.alert('🚨 신고가 접수되었습니다. 관리자가 확인 후 조치합니다.');
        setReportTarget(null);
        load();
        return;
      }
      window.alert(`❌ ${res.data.error || '신고에 실패했습니다.'}`);
    } catch (err) {
      console.error(err);
      window.alert('❌ 서버와 연결할 수 없습니다.');
    }
  };

  const subtitle = mine
    ? (nickname ? `${nickname}님이 작성한 게시글` : '내 게시글')
    : (activeAuthor ? `${activeAuthor}님의 게시글` : '');

  return (
    <main className="board-container">
      <div className="board-header">
        <h1><img src={LOGO_URL.replace('logo.webp', 'human_bug_eyes_icon.gif')} className="eyes_icon" alt="" /> 커스텀 티어 게시판</h1>
        {subtitle && <p id="board-subtitle" className="board-subtitle">{subtitle}</p>}
        {(mine || activeAuthor) && (
          <button type="button" className="view-all-board-btn" onClick={() => setParams(new URLSearchParams())}>
            전체 게시판
          </button>
        )}
      </div>

      <div className="board-toolbar">
        <div className="search-box">
          <input
            type="text"
            id="search-input"
            placeholder={mine ? '제목 검색 (또는 @작성자)' : '제목 또는 @작성자 검색'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') search(); }}
          />
          <button type="button" onClick={search}>검색</button>
        </div>
        <Link to="/custom-maker" className="write-btn">✏️ 티어표 만들기</Link>
      </div>

      {posts === null && <p className="react-state-msg">게시글을 불러오는 중...</p>}
      {error && <p className="react-state-msg">{error}</p>}
      {posts && !error && posts.length === 0 && (
        <p className="react-state-msg">{mine ? '작성한 게시글이 없습니다.' : '등록된 게시글이 없습니다.'}</p>
      )}

      <div id="post-grid" className="post-grid">
        {posts?.map((post) => {
          const id = getPostId(post);
          if (!isValidPostId(id)) return null;
          const owner = user && isSameAuthor(post, user);
          return (
            <div className="post-card-wrapper" key={id}>
              <Link
                className="post-card"
                to={`/board/post?id=${encodeURIComponent(id)}`}
                data-post-id={id}
                onClick={() => rememberPostId(id)}
              >
                <div className="post-thumbnail">
                  <img
                    src={getThumbnail(post)}
                    alt={post.title}
                    onError={(e) => { e.currentTarget.src = LOGO_URL; }}
                  />
                </div>
                <div className="post-info">
                  <h3 className="post-title">{post.title}</h3>
                  <div className="post-meta">
                    <span className="post-author">{post.author || '익명'}</span>
                    <span className="post-date">{formatPostDate(post.createdAt)}</span>
                  </div>
                  <div className="post-stats">
                    <span>조회 {post.viewCount || 0}</span>
                    <span>추천 {post.likeCount || 0}</span>
                  </div>
                </div>
              </Link>

              {owner && (
                <button
                  type="button"
                  className="post-card-edit-btn"
                  onClick={(e) => { e.preventDefault(); navigate(`/board/edit?id=${encodeURIComponent(id)}`); }}
                >
                  수정
                </button>
              )}
              {user && !owner && (
                <button
                  type="button"
                  className="post-card-report-btn"
                  disabled={Boolean(post.reported)}
                  onClick={(e) => { e.preventDefault(); setReportTarget(id); }}
                >
                  {post.reported ? '신고됨' : '신고'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {reportTarget && (
        <ReportModal title="게시글 신고" onClose={() => setReportTarget(null)} onSubmit={onReport} />
      )}
    </main>
  );
}
