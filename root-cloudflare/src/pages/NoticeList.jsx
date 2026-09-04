// 전체 공지(/notice/all) · 새 소식(/notice/news) 전체 목록 (all_notices.html / news.html)
// 별도 페이지네이션 API 는 없어 전체를 한 번에 받고 하단엔 총 개수만 표시한다.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import NoticeListItem from '../components/NoticeListItem';
import { fetchNotices } from '../lib/noticeApi';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '../lib/noticeFormat';

export default function NoticeList({ category }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(false);
  const label = CATEGORY_LABELS[category];

  useEffect(() => {
    document.title = `${label} | 휴버대 티어표`;
    setItems(null);
    setError(false);
    fetchNotices(category).then(setItems).catch((err) => { console.error(err); setError(true); setItems([]); });
  }, [category, label]);

  return (
    <div className="notice-page">
      <div className="notice-header">
        <h1 className="notice-title">
          <span className="notice-dot" style={{ background: CATEGORY_COLORS[category] }} />
          {label}
        </h1>
        <Link to="/notice" className="back-link">← 공지사항 메인으로</Link>
      </div>
      <div id="notice-full-list" className="notice-full-list">
        {error && <p className="notice-empty">목록을 불러올 수 없습니다.</p>}
        {!error && items && items.length === 0 && <p className="notice-empty">{label} 항목이 없습니다.</p>}
        {items?.map((n) => <NoticeListItem key={n._id || n.id} notice={n} variant="full" />)}
      </div>
      <div id="notice-pagination" className="pagination">
        {items && items.length > 0 && <span>총 {items.length}개</span>}
      </div>
    </div>
  );
}
