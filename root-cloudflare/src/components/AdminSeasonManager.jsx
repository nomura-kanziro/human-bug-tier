// ========================================================
// AdminSeasonManager — 관리자 대시보드 "이벤트 디자인 적용" 섹션
// ========================================================
// 사이트 전체 배경을 계절 디자인으로 바꾸는 on/off 스위치(할로윈 · 크리스마스).
// 서버는 값 하나(seasonalTheme)만 저장하므로 한 번에 하나만 켜진다 — 할로윈이 켜진 상태에서
// 크리스마스를 켜면 할로윈은 자동으로 꺼지고, 켜진 것을 다시 누르면 꺼진다(기본 배경).
// 켜고 끄는 순간 모든 방문자에게 적용되므로(다음 접속·30분 재확인 때) 바꾸기 전에 확인을 받는다.
// 서버: GET /api/site/settings(공개), POST /api/admin/site/seasonal-theme(requireAdmin) — siteSettingController
import { useEffect, useState } from 'react';
import { adminRequest, apiRequest, isStaticPreview } from '../lib/api';
import { SEASONS, applySeason, normalizeSeason } from '../lib/season';
import '../styles/admin-event.css';
import '../styles/admin-season.css';

const DESCRIPTIONS = {
  halloween: '보름달 속 붉은 눈, 박쥐, 눈 모양으로 파낸 호박, H 묘비와 세 자루 창',
  christmas: '내리는 눈, 전구 가랜드, 눈알 오너먼트를 단 트리, 눈 덮인 H 문장',
};

export default function AdminSeasonManager() {
  const isStatic = isStaticPreview();
  const [current, setCurrent] = useState(null); // null = 불러오는 중
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (isStatic) return;
    apiRequest('/api/site/settings', { auth: false })
      .then((res) => setCurrent(normalizeSeason(res.data?.seasonalTheme)))
      .catch(() => setCurrent('none'));
  }, [isStatic]);

  const toggle = async (key) => {
    const next = current === key ? 'none' : key;
    const label = SEASONS[key].label;
    const confirmText = next === 'none'
      ? `${label} 디자인을 끄시겠어요?\n사이트 배경이 기본 배경으로 돌아갑니다.`
      : `${label} 디자인을 켜시겠어요?\n모든 방문자의 사이트 배경이 ${label} 컨셉으로 바뀝니다.${current !== 'none' ? `\n(지금 켜져 있는 ${SEASONS[current].label} 디자인은 꺼집니다)` : ''}`;
    if (!window.confirm(confirmText)) return;

    setBusy(true);
    setMsg(null);
    const res = await adminRequest('/api/admin/site/seasonal-theme', { method: 'POST', body: JSON.stringify({ theme: next }) })
      .catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      setMsg({ error: true, text: res?.data?.error || '바꾸지 못했습니다. 잠시 후 다시 시도해주세요.' });
      return;
    }
    const saved = normalizeSeason(res.data.seasonalTheme);
    setCurrent(saved);
    applySeason(saved); // 지금 보고 있는 관리자 화면에도 바로 적용
    setMsg({ error: false, text: saved === 'none' ? '이벤트 디자인을 껐습니다. 기본 배경입니다.' : `${SEASONS[saved].label} 디자인을 켰습니다.` });
  };

  return (
    <section className="notice-admin-section eadm-section" id="admin-season" data-admin-anchor>
      <h2 className="page-title section-title">🎨 이벤트 디자인 적용</h2>
      <p className="eadm-desc">
        사이트 전체 배경을 이벤트 컨셉으로 바꿉니다. <strong>한 번에 하나만</strong> 켤 수 있어서, 다른 디자인을 켜면 켜져 있던 디자인은 자동으로 꺼집니다.
        켜진 디자인을 다시 누르면 기본 배경으로 돌아갑니다. 방문자에게는 새로 접속하거나 페이지를 다시 열 때 적용됩니다.
      </p>

      {isStatic && <p className="eadm-guard">정적 미리보기에서는 바꿀 수 없습니다.</p>}

      {!isStatic && (
        <>
          <div className="season-admin-status">
            현재 적용:{' '}
            <strong>{current === null ? '불러오는 중…' : current === 'none' ? '기본 배경' : `${SEASONS[current].icon} ${SEASONS[current].label}`}</strong>
          </div>
          <div className="season-admin-list">
            {Object.entries(SEASONS).map(([key, meta]) => {
              const on = current === key;
              return (
                <div className={`season-admin-card is-${key}${on ? ' is-on' : ''}`} key={key}>
                  <div className={`season-admin-preview is-${key}`} aria-hidden="true">{meta.icon}</div>
                  <div className="season-admin-text">
                    <strong>{meta.label} 디자인 기능 적용</strong>
                    <span>{DESCRIPTIONS[key]}</span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    aria-label={`${meta.label} 디자인 ${on ? '끄기' : '켜기'}`}
                    className={`season-switch${on ? ' is-on' : ''}`}
                    disabled={busy || current === null}
                    onClick={() => toggle(key)}
                  >
                    <span className="season-switch-label">{on ? 'ON' : 'OFF'}</span>
                    <span className="season-switch-thumb" />
                  </button>
                </div>
              );
            })}
          </div>
          {msg && <p className={`eadm-msg${msg.error ? ' is-error' : ' is-ok'}`} role="status">{msg.text}</p>}
        </>
      )}
    </section>
  );
}
