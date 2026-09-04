// 공지사항 메인 (notice/notice.html) — 전체 공지 / 새 소식 두 컬럼에 최신 5건씩 + "문서 N개 모두 보기"
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import NoticeListItem from '../components/NoticeListItem';
import { fetchNotices } from '../lib/noticeApi';

function Column({ category, color, title, moreTo }) {
  const [items, setItems] = useState(null);
  const [total, setTotal] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchNotices(category, 5).then(setItems).catch((err) => { console.error(err); setError(true); setItems([]); });
    fetchNotices(category).then((all) => setTotal(all.length)).catch(() => {});
  }, [category]);

  return (
    <div className={`notice-col notice-col-${category === 'news' ? 'news' : 'general'}`}>
      <h2 className="notice-col-title">
        <span className="notice-dot" style={{ background: color }} />
        {title}
      </h2>
      <div className="notice-list">
        {error && <p className="notice-empty">{title}을(를) 불러올 수 없습니다.</p>}
        {!error && items && items.length === 0 && <p className="notice-empty">등록된 {title}가 없습니다.</p>}
        {items?.map((n) => <NoticeListItem key={n._id || n.id} notice={n} />)}
      </div>
      <Link to={moreTo} className="notice-more">
        {total === null ? '문서 모두 보기 →' : `문서 ${total}개 모두 보기 →`}
      </Link>
    </div>
  );
}

export default function NoticeHome() {
  useEffect(() => { document.title = '공지사항 | 휴버대 티어표'; }, []);
  return (
    <div className="notice-page">
      <h1 className="notice-title">공지사항</h1>
      <div className="notice-grid">
        <Column category="notice" color="#10b981" title="전체 공지" moreTo="/notice/all" />
        <Column category="news" color="#8b5cf6" title="새 소식" moreTo="/notice/news" />
      </div>
    </div>
  );
}
