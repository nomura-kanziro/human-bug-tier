// 헤더 🔔 알림 벨 + 안 읽음 배지 + 드롭다운 목록 + 설정 모달 (common.js 알림 시스템 이식)
//   - 60초마다 /api/notifications/unread-count 로 배지 갱신
//   - 벨 클릭 시 /api/notifications?limit=50 목록을 항상 새로 불러온다(캐시 안 함)
//   - 항목 클릭 → PATCH /:id/read (응답 안 기다림) → 딥링크 라우트로 이동
//   - ⚙ → 설정 모달(카테고리별 on/off, 기록 전체 삭제)
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest, isStaticPreview } from '../lib/api';
import { formatNotificationTime } from '../lib/noticeFormat';
import { NOTIFICATION_LABELS, resolveNotificationTarget } from '../lib/notifications';

const POLL_MS = 60000;

export default function NotificationBell({ open, onToggle, onClose, containerRef }) {
  const navigate = useNavigate();
  const [count, setCount] = useState(0);
  const [items, setItems] = useState(null); // null=로딩중, []=없음
  const [error, setError] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const refreshBadge = useCallback(async () => {
    if (isStaticPreview()) return;
    try {
      const res = await apiRequest('/api/notifications/unread-count');
      if (res.ok) setCount(res.data.count || 0);
    } catch (err) {
      console.error('알림 배지 갱신 실패:', err);
    }
  }, []);

  useEffect(() => {
    refreshBadge();
    const timer = setInterval(refreshBadge, POLL_MS);
    return () => clearInterval(timer);
  }, [refreshBadge]);

  const loadList = useCallback(async () => {
    setItems(null);
    setError(false);
    try {
      const res = await apiRequest('/api/notifications?limit=50');
      if (!res.ok) throw new Error('알림 목록 조회 실패');
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      setError(true);
      setItems([]);
    }
  }, []);

  useEffect(() => {
    if (open) loadList();
  }, [open, loadList]);

  const onItemClick = (item) => {
    onClose();
    const id = item._id || item.id;
    apiRequest(`/api/notifications/${id}/read`, { method: 'PATCH' })
      .catch((err) => console.error('알림 읽음 처리 실패:', err));

    const target = resolveNotificationTarget(item.link, item.resourceId, item.resourceType);
    if (target) {
      if (/^https?:/i.test(target)) window.location.href = target;
      else navigate(target);
      return;
    }
    refreshBadge();
  };

  return (
    <div id="notification-bell" className="notification-bell" ref={containerRef}>
      <button
        type="button"
        id="notification-bell-btn"
        className="notification-bell-btn"
        aria-label="알림"
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
      >
        <span className="notification-bell-icon">🔔</span>
        <span id="notification-badge" className="notification-badge" hidden={count <= 0}>
          {count > 99 ? '99+' : count}
        </span>
      </button>
      <div id="notification-panel" className={`notification-panel${open ? ' is-open' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="notification-panel-header">
          <strong>알림</strong>
          <div className="notification-panel-header-actions">
            <Link to="/notifications" className="notification-viewall-link" onClick={onClose}>전체보기</Link>
            <button
              type="button"
              id="notification-settings-btn"
              className="notification-settings-btn"
              aria-label="알림 설정"
              onClick={() => { onClose(); setSettingsOpen(true); }}
            >⚙</button>
          </div>
        </div>
        <div id="notification-list" className="notification-list">
          {items === null && <div className="notification-empty">알림을 불러오는 중...</div>}
          {items !== null && error && <div className="notification-empty">알림을 불러올 수 없습니다.</div>}
          {items !== null && !error && items.length === 0 && <div className="notification-empty">새 알림이 없습니다.</div>}
          {items?.map((item) => {
            const actor = item.actorNickname ? `${item.actorNickname} · ` : '';
            return (
              <button
                type="button"
                key={item._id || item.id}
                className={`notification-item${item.read ? '' : ' unread'}`}
                onClick={() => onItemClick(item)}
              >
                <div className="notification-item-top">
                  <span className="notification-item-label">{NOTIFICATION_LABELS[item.type] || '알림'}</span>
                  <span className="notification-item-time">{formatNotificationTime(item.createdAt)}</span>
                </div>
                <div className="notification-item-title">{item.title || ''}</div>
                <div className="notification-item-message">{actor}{item.message || ''}</div>
              </button>
            );
          })}
        </div>
      </div>
      {settingsOpen && (
        <NotificationSettingsModal
          onClose={() => setSettingsOpen(false)}
          onDeleted={() => { setItems([]); refreshBadge(); }}
        />
      )}
    </div>
  );
}

// 알림 설정 모달 — 열릴 때 서버 설정을 읽어 체크박스에 반영, 저장은 PATCH, 기록 삭제는 DELETE
function NotificationSettingsModal({ onClose, onDeleted }) {
  const [settings, setSettings] = useState({ enabled: true, tierBoard: true, inquiry: true, noticeNews: true });
  const [specificOpen, setSpecificOpen] = useState(false);

  useEffect(() => {
    apiRequest('/api/notifications/settings')
      .then((res) => { if (res.ok) setSettings((s) => ({ ...s, ...res.data })); })
      .catch((err) => console.error('알림 설정 조회 실패:', err));
  }, []);

  const set = (key) => (e) => setSettings((s) => ({ ...s, [key]: e.target.checked }));

  const save = async () => {
    try {
      const res = await apiRequest('/api/notifications/settings', { method: 'PATCH', body: JSON.stringify(settings) });
      if (res.ok && res.data.success) {
        window.alert('알림 설정이 저장되었습니다.');
        onClose();
      } else {
        window.alert(`❌ ${res.data.error || '설정 저장에 실패했습니다.'}`);
      }
    } catch (err) {
      console.error(err);
      window.alert('❌ 서버와 연결할 수 없습니다.');
    }
  };

  const deleteHistory = async () => {
    if (!window.confirm('모든 알림 기록을 삭제할까요?\n삭제한 기록은 복구할 수 없습니다.')) return;
    try {
      const res = await apiRequest('/api/notifications', { method: 'DELETE' });
      if (res.ok && res.data.success) {
        onDeleted();
        window.alert('알림 기록이 삭제되었습니다.');
        onClose();
      } else {
        window.alert(`❌ ${res.data.error || '알림 기록 삭제에 실패했습니다.'}`);
      }
    } catch (err) {
      console.error(err);
      window.alert('❌ 서버와 연결할 수 없습니다.');
    }
  };

  return (
    <div id="notification-settings-modal" className="notification-settings-modal" onClick={(e) => e.stopPropagation()}>
      <div className="notification-settings-backdrop" onClick={onClose} />
      <div className="notification-settings-card">
        <div className="notification-settings-header">
          <h3>알림 설정</h3>
          <button type="button" className="notification-settings-close" aria-label="닫기" onClick={onClose}>×</button>
        </div>
        <label className="notification-setting-row master">
          <span>알림 받기</span>
          <input type="checkbox" checked={!!settings.enabled} onChange={set('enabled')} />
        </label>
        <button
          type="button"
          className={`notification-specific-toggle${specificOpen ? ' open' : ''}`}
          onClick={() => setSpecificOpen((v) => !v)}
        >
          특정 알림만 받기 <span className="arrow">▼</span>
        </button>
        <div className="notification-specific-list" hidden={!specificOpen}>
          <label className="notification-setting-row">
            <span>메이커 게시판</span>
            <input type="checkbox" checked={!!settings.tierBoard} onChange={set('tierBoard')} />
          </label>
          <label className="notification-setting-row">
            <span>문의사항 댓글</span>
            <input type="checkbox" checked={!!settings.inquiry} onChange={set('inquiry')} />
          </label>
          <label className="notification-setting-row">
            <span>공지사항 &amp; 새소식</span>
            <input type="checkbox" checked={!!settings.noticeNews} onChange={set('noticeNews')} />
          </label>
        </div>
        <button type="button" className="notification-settings-save" onClick={save}>저장</button>
        <div className="notification-settings-divider" />
        <button type="button" className="notification-settings-delete" onClick={deleteHistory}>알림 기록 삭제</button>
      </div>
    </div>
  );
}
