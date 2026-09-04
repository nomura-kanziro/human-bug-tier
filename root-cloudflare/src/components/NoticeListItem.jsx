// 공지 목록 항목 카드 (notice.js renderNoticeListItem 이식). 세 레이아웃을 variant 로 분기:
//   'home'  — 홈 미리보기(제목+상대시간 한 줄, 요약 120자)
//   'full'  — 전체 공지/새 소식 목록(카테고리 뱃지, 요약 200자)
//   default — 공지 메인 두 컬럼(제목/요약/절대날짜 세로)
import { Link } from 'react-router-dom';
import {
  CATEGORY_COLORS, CATEGORY_LABELS, formatDate, formatRelativeDate, getNoticeId, isValidNoticeId, rememberNoticeId,
} from '../lib/noticeFormat';

export function CategoryBadge({ category }) {
  const label = CATEGORY_LABELS[category] || category;
  const color = CATEGORY_COLORS[category] || '#6c757d';
  return (
    <span className="notice-category-badge" style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
      {label}
    </span>
  );
}

export default function NoticeListItem({ notice, variant }) {
  const id = getNoticeId(notice);
  if (!isValidNoticeId(id)) return null;

  const summary = notice.summary || notice.content || '';
  const shortSummary = summary.length > 120 ? `${summary.slice(0, 120)}...` : summary;
  const pin = notice.isPinned ? <span className="notice-pin-label">📌</span> : null;
  const yt = notice.source === 'youtube' ? <span className="notice-yt-badge">YouTube</span> : null;
  const cls = `notice-item notice-item-link${notice.isPinned ? ' notice-item-pinned' : ''}`;
  const to = `/notice/${id}`;
  const remember = () => rememberNoticeId(id);

  if (variant === 'home') {
    return (
      <Link to={to} data-notice-id={id} className={cls} onClick={remember}>
        <div className="title">
          <span className="notice-item-title">{pin}{yt}{notice.title}</span>
          <span className="date">{formatRelativeDate(notice.createdAt)}</span>
        </div>
        <p className="desc">{shortSummary}</p>
      </Link>
    );
  }

  if (variant === 'full') {
    const desc = summary.length > 200 ? `${summary.slice(0, 200)}...` : summary;
    return (
      <Link to={to} data-notice-id={id} className={cls} onClick={remember}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          {pin}
          <CategoryBadge category={notice.category} />
          {yt}
          <span className="notice-link">{notice.title}</span>
        </div>
        {desc && <p className="notice-desc">{desc}</p>}
        <span className="notice-date">{formatDate(notice.createdAt)}</span>
      </Link>
    );
  }

  return (
    <Link to={to} data-notice-id={id} className={cls} onClick={remember}>
      {pin}
      {yt}
      <span className="notice-link">{notice.title}</span>
      <p className="notice-desc">{shortSummary}</p>
      <span className="notice-date">{formatDate(notice.createdAt)}</span>
    </Link>
  );
}
