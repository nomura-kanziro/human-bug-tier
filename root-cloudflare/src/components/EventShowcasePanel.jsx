// ========================================================
// EventShowcasePanel — 이벤트 "제작한 티어표 공개" (뼈대 · 관리자 전용)
// ========================================================
// ⚠ 아직 정식 공개 전이다. 서버 라우트(/api/events/showcase/*)가 전부 requireAdmin 이라
// 일반 회원에게는 이 탭이 "준비 중" 안내만 보인다. 정식 오픈 시 서버 라우트의 미들웨어와
// 아래 isAdmin 분기만 풀면 된다.
//
// 흐름: 관리자가 회차를 만들고(제목·마감 시각) 접수를 열면 → 마감 시각에 등록이 닫히고
// → 결과 공개 예정 시각(기본 마감 + 30분)이 되면 자동 발표, 또는 관리자가 바로 발표.
// 발표 순간 참가자 전원에게 알림이 나간다(서버 revealShowcaseDoc).
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest, isStaticPreview } from '../lib/api';

const STATUS_LABEL = {
  draft: '작성 중 (참가 불가)',
  open: '접수 중',
  closed: '접수 마감 · 결과 대기',
  revealed: '결과 발표 완료',
};

// datetime-local 입력에 넣을 수 있는 "YYYY-MM-DDTHH:mm" 형태(로컬 시각)로 바꾼다.
function toLocalInput(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatWhen(value) {
  if (!value) return '미정';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '미정' : d.toLocaleString('ko-KR');
}

export default function EventShowcasePanel({ isAdmin }) {
  const isStatic = isStaticPreview();
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', deadlineAt: '', revealAt: '', status: 'draft' });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const aliveRef = useRef(true);

  useEffect(() => () => { aliveRef.current = false; }, []);

  const load = useCallback(async () => {
    if (isStatic || !isAdmin) return;
    const res = await apiRequest('/api/events/showcase').catch(() => null);
    if (!res?.ok || !aliveRef.current) return;
    setData(res.data);
    const s = res.data.showcase;
    if (s) {
      setForm({
        title: s.title || '',
        description: s.description || '',
        deadlineAt: toLocalInput(s.deadlineAt),
        revealAt: toLocalInput(s.revealAt),
        status: s.status === 'revealed' ? 'closed' : s.status,
      });
    }
  }, [isStatic, isAdmin]);

  useEffect(() => { load(); }, [load]);

  const showcase = data?.showcase || null;

  const save = async (statusOverride) => {
    if (busy) return;
    setBusy(true);
    setMessage('');
    const res = await apiRequest('/api/events/showcase', {
      method: 'POST',
      body: JSON.stringify({
        id: showcase?.id,
        title: form.title,
        description: form.description,
        // datetime-local 값은 로컬 시각이므로 Date 로 감싸 ISO(UTC)로 보낸다.
        deadlineAt: form.deadlineAt ? new Date(form.deadlineAt).toISOString() : null,
        revealAt: form.revealAt ? new Date(form.revealAt).toISOString() : null,
        status: statusOverride || form.status,
      }),
    }).catch(() => ({ ok: false, data: { error: '저장에 실패했습니다.' } }));
    setBusy(false);
    if (!res.ok) { setMessage(res.data?.error || '저장에 실패했습니다.'); return; }
    setMessage('저장했습니다.');
    load();
  };

  const reveal = async () => {
    if (busy) return;
    if (!window.confirm('지금 결과를 발표할까요?\n참가자 전원에게 알림이 나갑니다.')) return;
    setBusy(true);
    setMessage('');
    // 당첨자는 참가 목록에서 관리자가 고르는 것이 정식 흐름이지만, 뼈대 단계에서는
    // "발표만" 먼저 동작하게 두고 당첨자 선정 UI 는 정식 공개 때 붙인다.
    const res = await apiRequest('/api/events/showcase/reveal', {
      method: 'POST',
      body: JSON.stringify({ winners: [], resultNote: '' }),
    }).catch(() => ({ ok: false, data: { error: '발표에 실패했습니다.' } }));
    setBusy(false);
    if (!res.ok) { setMessage(res.data?.error || '발표에 실패했습니다.'); return; }
    setMessage('결과를 발표하고 참가자에게 알림을 보냈습니다.');
    load();
  };

  if (!isAdmin) {
    return (
      <>
        <h1>제작한 티어표 공개</h1>
        <p className="event-desc">
          여러분이 만든 커스텀 티어표를 한 회차에 모아 공개하고, 당첨자를 발표하는 이벤트입니다.
        </p>
        <div className="event-soon">
          <strong>준비 중입니다</strong>
          <span>기능은 만들어 두었고 아직 공개 전이라 관리자만 볼 수 있어요. 열리면 공지로 알려드릴게요.</span>
        </div>
      </>
    );
  }

  return (
    <>
      <h1>제작한 티어표 공개</h1>
      <p className="event-desc">
        <strong>관리자 전용 · 정식 공개 전</strong> — 회차를 만들고 마감 시각을 정하면 그 시각에 접수가 닫히고,
        결과 공개 시각(기본 마감 +{data?.revealDelayMinutes ?? 30}분)이 되면 자동으로 발표됩니다.
        기다리지 않고 바로 발표할 수도 있으며, 발표 순간 참가자 전원에게 알림이 갑니다.
      </p>

      {isStatic && <div className="event-guard">이 기능은 서버가 필요합니다.</div>}

      {showcase && (
        <div className="event-showcase-status">
          <span className={`event-badge status-${showcase.status}`}>{STATUS_LABEL[showcase.status]}</span>
          <span>참가 {showcase.entryCount ?? 0}명</span>
          <span>마감 {formatWhen(showcase.deadlineAt)}</span>
          <span>공개 {formatWhen(showcase.revealAt)}</span>
        </div>
      )}

      <div className="event-form">
        <label htmlFor="sc-title">제목</label>
        <input id="sc-title" type="text" value={form.title} maxLength={80}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="예: 9월 커스텀 티어표 공개전" />

        <label htmlFor="sc-desc">설명</label>
        <textarea id="sc-desc" rows={3} value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="참가 방법이나 심사 기준을 적어주세요." />

        <div className="event-form-row">
          <div>
            <label htmlFor="sc-deadline">접수 마감</label>
            <input id="sc-deadline" type="datetime-local" value={form.deadlineAt}
              onChange={(e) => setForm((f) => ({ ...f, deadlineAt: e.target.value }))} />
          </div>
          <div>
            <label htmlFor="sc-reveal">결과 공개</label>
            <input id="sc-reveal" type="datetime-local" value={form.revealAt}
              onChange={(e) => setForm((f) => ({ ...f, revealAt: e.target.value }))} />
          </div>
        </div>

        <div className="event-form-actions">
          <button type="button" className="event-btn is-inline" disabled={busy} onClick={() => save()}>저장</button>
          <button type="button" className="event-btn is-inline is-ghost" disabled={busy} onClick={() => save('open')}>접수 열기</button>
          <button type="button" className="event-btn is-inline is-ghost" disabled={busy} onClick={() => save('closed')}>접수 닫기</button>
          <button type="button" className="event-btn is-inline is-ghost" disabled={busy || !showcase || showcase.status === 'revealed'} onClick={reveal}>
            지금 결과 발표
          </button>
        </div>
        {message && <p className="event-status">{message}</p>}
      </div>

      {showcase?.entries?.length > 0 && (
        <div className="event-entries">
          <h2>참가 목록 ({showcase.entries.length})</h2>
          <ul>
            {showcase.entries.map((e) => (
              <li key={e.id}>
                <span className="event-entry-name">{e.nickname}</span>
                <span className="event-entry-title">{e.title || '(제목 없음)'}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showcase?.status === 'revealed' && (
        <div className="event-entries">
          <h2>발표 결과</h2>
          {showcase.winners.length === 0
            ? <p className="event-empty">당첨자를 지정하지 않고 발표했습니다(참가자 알림은 발송됨).</p>
            : (
              <ol className="event-rank-list">
                {showcase.winners.map((w) => (
                  <li key={`${w.rank}-${w.nickname}`}>
                    <span className="event-rank-no">{w.rank}</span>
                    <span className="event-rank-name">{w.nickname}</span>
                    <span className="event-rank-time">{w.title}</span>
                  </li>
                ))}
              </ol>
            )}
        </div>
      )}
    </>
  );
}
