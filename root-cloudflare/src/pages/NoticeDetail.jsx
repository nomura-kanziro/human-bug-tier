// 공지 상세 (/notice/:id, notice-detail.html 이식)
//  - id 는 라우트 파라미터 우선, 없거나 잘못됐으면 sessionStorage(selectedNoticeId) 폴백을 1회 소비
//  - 유튜브 번역 글은 "일본어 원문 보기 ↔ 한국어 번역 보기" 토글 제공
//  - 본문은 renderNoticeContent(escape 후 서식 치환)로 만든 HTML 이라 innerHTML 주입이 안전하다
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CategoryBadge } from '../components/NoticeListItem';
import { fetchNoticeById } from '../lib/noticeApi';
import {
  CATEGORY_LABELS, consumeStoredNoticeId, formatFullDate, isValidNoticeId, NOTICE_ID_STORAGE_KEY, renderNoticeContent,
} from '../lib/noticeFormat';

function ErrorBox({ title, desc }) {
  return (
    <div className="notice-detail-error">
      <h2>{title}</h2>
      <p style={{ marginTop: 12 }}>{desc}</p>
      <Link to="/notice" className="notice-detail-back" style={{ marginTop: 24, display: 'inline-flex' }}>← 공지사항으로</Link>
    </div>
  );
}

export default function NoticeDetail() {
  const { id: paramId } = useParams();
  const id = useMemo(() => (isValidNoticeId(paramId) ? paramId : consumeStoredNoticeId()), [paramId]);
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null); // 'invalid' | 'network' | 'notfound'
  const [showOriginal, setShowOriginal] = useState(false);

  useEffect(() => {
    setNotice(null);
    setError(null);
    setShowOriginal(false);
    if (!id) { setError('invalid'); return; }
    fetchNoticeById(id)
      .then((n) => {
        setNotice(n);
        document.title = `${n.title} - 휴버대 티어표`;
        sessionStorage.removeItem(NOTICE_ID_STORAGE_KEY);
      })
      .catch((err) => {
        console.error(err);
        const isNetwork = err instanceof TypeError || /fetch|network|Failed/i.test(err.message || '');
        setError(isNetwork ? 'network' : 'notfound');
      });
  }, [id]);

  let body;
  if (error === 'invalid') {
    body = <ErrorBox title="잘못된 접근입니다" desc="공지 목록에서 항목을 선택해주세요." />;
  } else if (error === 'network') {
    body = <ErrorBox title="서버에 연결할 수 없습니다" desc="백엔드 서버가 실행 중인지 확인해주세요. (backend 폴더에서 npm start)" />;
  } else if (error === 'notfound') {
    body = <ErrorBox title="공지를 찾을 수 없습니다" desc="삭제되었거나 잘못된 링크일 수 있습니다." />;
  } else if (!notice) {
    body = <div className="notice-detail-loading">공지를 불러오는 중...</div>;
  } else {
    const isNews = notice.category === 'news';
    const backTo = isNews ? '/notice/news' : '/notice/all';
    const title = showOriginal ? (notice.youtubeOriginalTitle || notice.title) : notice.title;
    const content = showOriginal ? notice.youtubeOriginalContent : notice.content;
    body = (
      <article className={`notice-detail-card ${isNews ? 'notice-detail-news' : 'notice-detail-general'}`}>
        <div className="notice-detail-topbar">
          <Link to={backTo} className="notice-detail-back">← 목록으로</Link>
          <div className="notice-detail-meta-row">
            {notice.isPinned && (
              <span className="badge badge-pinned" style={{ background: '#fef3c7', color: '#b45309', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>📌 고정</span>
            )}
            <CategoryBadge category={notice.category} />
            {notice.source === 'youtube' && <span className="notice-yt-badge">YouTube 커뮤니티</span>}
            {notice.youtubeTranslated && <span className="notice-yt-badge">한국어 번역</span>}
          </div>
        </div>
        <div className="notice-detail-body">
          <h1 className="notice-detail-title" id="notice-detail-title">{title}</h1>
          <div className="notice-detail-info">
            <span className="notice-detail-author">{notice.author || '관리자'}</span>
            <span>·</span>
            <span>{formatFullDate(notice.createdAt)}</span>
            {notice.youtubeOriginalContent && (
              <button
                type="button"
                className="notice-original-toggle"
                aria-pressed={showOriginal ? 'true' : 'false'}
                onClick={() => setShowOriginal((v) => !v)}
              >
                {showOriginal ? '한국어 번역 보기' : '일본어 원문 보기'}
              </button>
            )}
          </div>
          {notice.summary && !showOriginal && (
            <div className={`notice-detail-summary${isNews ? ' news-summary' : ''}`} id="notice-detail-summary">{notice.summary}</div>
          )}
          <div className="notice-detail-content" id="notice-detail-content" dangerouslySetInnerHTML={{ __html: renderNoticeContent(content) }} />
          <div className="notice-detail-footer">
            <Link to={backTo} className="notice-detail-list-btn">{CATEGORY_LABELS[notice.category]} 목록 보기</Link>
          </div>
        </div>
      </article>
    );
  }

  return (
    <div className="notice-page notice-detail-page">
      <div id="notice-detail-container">{body}</div>
    </div>
  );
}
