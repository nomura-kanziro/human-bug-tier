// 알림 전체보기 (notifications/notifications.html + .js 이식)
//  - 최근 100건을 한 번만 받아와 캐시하고, 탭/정렬 전환은 전부 클라이언트에서 처리(재요청 없음)
//  - 항목 클릭 → 읽음 처리(PATCH) + 딥링크 라우트 이동 (헤더 벨과 동일 로직)
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest, isStaticPreview } from '../lib/api';
import { formatNotificationTime } from '../lib/noticeFormat';
import { NOTIFICATION_LABELS, getNotificationGroup, resolveNotificationTarget } from '../lib/notifications';
import '../styles/notifications.css';

const TABS = [
  { key: 'all', label: '전체' },
  { key: 'notice', label: '공지' },
  { key: 'mention', label: '멘션' },
  { key: 'event', label: '이벤트' },
];

const SORTS = [
  { value: 'all', label: '전체' },
  { value: 'latest', label: '최신순' },
  { value: 'oldest', label: '날짜별 오래된것' },
  { value: 'read', label: '읽은것' },
  { value: 'unread', label: '안읽은것' },
];

const sortByDate = (items, dir) => items.slice().sort((a, b) => {
  const diff = new Date(a.createdAt) - new Date(b.createdAt);
  return dir === 'asc' ? diff : -diff;
});

// 'all' 과 'latest' 는 결과가 같지만, 셀렉트에서 기본값과 명시적 최신순을 구분해 보여주려고 옵션을 나눠 둔다
function applySortFilter(items, mode) {
  switch (mode) {
    case 'oldest': return sortByDate(items, 'asc');
    case 'read': return sortByDate(items.filter((i) => i.read), 'desc');
    case 'unread': return sortByDate(items.filter((i) => !i.read), 'desc');
    default: return sortByDate(items, 'desc');
  }
}

export default function Notifications() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();

  const [items, setItems] = useState([]);
  const [tab, setTab] = useState('all');
  const [sort, setSort] = useState('all');
  const [status, setStatus] = useState('불러오는 중...');

  useEffect(() => { document.title = '알림 | 휴버대 티어표'; }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      window.alert('알림은 로그인 후 이용할 수 있습니다.');
      navigate('/login');
      return;
    }
    if (isStaticPreview()) {
      setStatus('이 기능은 서버가 필요합니다. 로컬(:5000) 또는 배포된 사이트에서 이용해주세요.');
      return;
    }
    let cancelled = false;
    apiRequest('/api/notifications?limit=100')
      .then((res) => {
        if (cancelled) return;
        if (!res.ok) throw new Error('알림 목록 조회 실패');
        setItems(Array.isArray(res.data) ? res.data : []);
        setStatus('');
      })
      .catch((err) => {
        console.error('알림 목록 조회 실패:', err);
        if (!cancelled) setStatus('알림을 불러올 수 없습니다.');
      });
    return () => { cancelled = true; };
  }, [isLoggedIn, navigate]);

  const list = useMemo(() => {
    const tabbed = tab === 'all' ? items : items.filter((i) => getNotificationGroup(i.type) === tab);
    return applySortFilter(tabbed, sort);
  }, [items, tab, sort]);

  const onItemClick = (item) => {
    const id = String(item._id || item.id);
    apiRequest(`/api/notifications/${id}/read`, { method: 'PATCH' })
      .catch((err) => console.error('알림 읽음 처리 실패:', err));
    // 링크가 없어 이동이 안 되는 경우를 대비해 읽음 상태만 즉시 반영해 둔다
    setItems((cur) => cur.map((n) => (String(n._id || n.id) === id ? { ...n, read: true } : n)));

    const target = resolveNotificationTarget(item.link, item.resourceId, item.resourceType);
    if (!target) return;
    if (/^https?:/i.test(target)) window.location.href = target;
    else navigate(target);
  };

  if (!isLoggedIn) return null;

  return (
    <main className="notif-page">
      <h1 className="notif-page-title">알림</h1>

      <div className="notif-toolbar">
        <div className="notif-tabs">
          {TABS.map((t) => (
            <button
              type="button"
              key={t.key}
              className={`notif-tab${tab === t.key ? ' active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <select className="notif-sort-select" value={sort} onChange={(e) => setSort(e.target.value)}>
          {SORTS.map((s) => <option value={s.value} key={s.value}>{s.label}</option>)}
        </select>
      </div>

      <div className="notif-list">
        {status && <p className="notif-empty">{status}</p>}
        {!status && list.length === 0 && <p className="notif-empty">표시할 알림이 없습니다.</p>}
        {!status && list.map((item) => (
          <button
            type="button"
            key={String(item._id || item.id)}
            className={`notif-item${item.read ? '' : ' unread'}`}
            onClick={() => onItemClick(item)}
          >
            <div className="notif-item-top">
              <span className="notif-item-label">{NOTIFICATION_LABELS[item.type] || '알림'}</span>
              <span className="notif-item-time">{formatNotificationTime(item.createdAt)}</span>
            </div>
            <div className="notif-item-title">{item.title || ''}</div>
            <div className="notif-item-message">
              {item.actorNickname ? `${item.actorNickname} · ` : ''}{item.message || ''}
            </div>
          </button>
        ))}
      </div>
    </main>
  );
}
