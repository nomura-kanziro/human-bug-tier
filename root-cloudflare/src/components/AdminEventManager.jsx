// ========================================================
// AdminEventManager — 관리자 대시보드의 "이벤트 관리" 섹션
// ========================================================
// 이벤트 페이지(/event)에는 일반 회원용 화면만 있고, 이벤트를 열고 닫는 조작은 전부 여기(관리자 페이지)에서 한다.
//   ① 메모리 게임 기록 이벤트 — 관리자가 회차를 만들고 **직접 열어야** 회원이 게임을 할 수 있다.
//      진행 중에 닫으면 순위가 확정되고, 정산하면 1위에게 상금(1000P 이상)이 지급된다.
//   ② 제작한 티어표 공개 — 아직 정식 공개 전 뼈대라 이 관리 화면만 동작한다(서버도 requireAdmin).
// 모든 요청은 adminRequest(adminAuthToken) → 서버 requireAdmin 으로 이중 검증된다.
import { useCallback, useEffect, useRef, useState } from 'react';
import { adminRequest, isStaticPreview } from '../lib/api';
import { formatMs, formatWhen, fromLocalInput, toLocalInput } from '../lib/eventFormat';
import '../styles/admin-event.css';

const MEMORY_STATUS = {
  draft: { label: '작성 중', hint: '아직 열지 않음 — 회원은 게임을 할 수 없음' },
  open: { label: '진행 중', hint: '회원이 게임을 하고 있음' },
  closed: { label: '마감 · 정산 대기', hint: '순위 확정 — 정산하면 1위에게 상금 지급' },
  settled: { label: '정산 완료', hint: '상금 지급 끝' },
};

const SHOWCASE_STATUS = {
  draft: '작성 중 (참가 불가)',
  open: '접수 중',
  closed: '접수 마감 · 결과 대기',
  revealed: '결과 발표 완료',
};

const EMPTY_MEMORY_FORM = { id: null, title: '', description: '', endsAt: '', awardPoints: '1000' };

function Msg({ msg }) {
  if (!msg) return null;
  return <p className={`eadm-msg${msg.error ? ' is-error' : ' is-ok'}`} role="status">{msg.text}</p>;
}

/* ---------------- ① 메모리 게임 기록 이벤트 ---------------- */
function MemoryPeriodManager() {
  const isStatic = isStaticPreview();
  const [periods, setPeriods] = useState([]);
  const [limits, setLimits] = useState({ minAward: 1000, maxAward: 1000000, defaultAward: 1000 });
  const [form, setForm] = useState(EMPTY_MEMORY_FORM);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const aliveRef = useRef(true);

  useEffect(() => () => { aliveRef.current = false; }, []);

  const load = useCallback(async () => {
    if (isStatic) return;
    const res = await adminRequest('/api/events/memory/admin').catch(() => null);
    if (!res?.ok || !aliveRef.current) return;
    setPeriods(res.data.periods || []);
    if (res.data.limits) setLimits(res.data.limits);
  }, [isStatic]);

  useEffect(() => { load(); }, [load]);

  // 공용 호출 — 실패 메시지를 화면에 남기고 성공 여부를 돌려준다.
  const run = async (path, body, okText) => {
    if (busy) return null;
    setBusy(true);
    setMsg(null);
    const res = await adminRequest(path, { method: 'POST', body: JSON.stringify(body) })
      .catch(() => ({ ok: false, data: { error: '서버와 연결할 수 없습니다.' } }));
    if (!aliveRef.current) return null;
    setBusy(false);
    if (!res.ok) { setMsg({ error: true, text: res.data?.error || '처리에 실패했습니다.' }); return null; }
    if (okText) setMsg({ text: typeof okText === 'function' ? okText(res.data) : okText });
    await load();
    return res.data;
  };

  const save = async (thenOpen = false) => {
    const data = await run('/api/events/memory/period', {
      id: form.id || undefined,
      title: form.title,
      description: form.description,
      awardPoints: form.awardPoints === '' ? undefined : Number(form.awardPoints),
      endsAt: fromLocalInput(form.endsAt),
    }, form.id ? '수정했습니다.' : '기록 이벤트를 만들었습니다. 아직 "작성 중"이라 열기 전까지 회원은 게임을 할 수 없습니다.');
    if (!data) return;
    setForm(EMPTY_MEMORY_FORM);
    if (thenOpen) await act(data.period.id, 'open', true);
  };

  const act = async (id, action, skipConfirm = false) => {
    const confirms = {
      open: '이 기록 이벤트를 지금 여시겠어요?\n열리는 순간부터 회원이 메모리 게임을 할 수 있습니다.',
      close: '이 기록 이벤트를 지금 닫을까요?\n순위가 확정되고 진행 중인 판은 기록되지 않습니다.',
      settle: '이 회차를 정산할까요?\n1위에게 상금이 지급되고 알림이 발송됩니다. 되돌릴 수 없습니다.',
      delete: '이 회차를 삭제할까요?',
    };
    if (!skipConfirm && !window.confirm(confirms[action])) return;
    const texts = {
      open: '기록 이벤트를 열었습니다. 지금부터 회원이 게임을 할 수 있어요.',
      close: '기록 이벤트를 닫았습니다. 순위가 확정되었고 정산할 수 있습니다.',
      settle: (d) => (d.winner
        ? `정산 완료 — 1위 ${d.winner.nickname} (${formatMs(d.winner.totalMs)}) 에게 ${d.winner.awarded}P 를 지급하고 알림을 보냈습니다.`
        : '완주 기록이 없어 상금 없이 종료했습니다.'),
      delete: '삭제했습니다.',
    };
    await run('/api/events/memory/period/status', { id, action }, texts[action]);
  };

  const edit = (p) => {
    setMsg(null);
    setForm({
      id: p.id,
      title: p.title,
      description: p.description || '',
      endsAt: toLocalInput(p.endsAt),
      awardPoints: String(p.awardPoints),
    });
    document.getElementById('eadm-memory-title')?.focus();
  };

  const hasOpen = periods.some((p) => p.status === 'open');

  return (
    <div className="eadm-block">
      <h3 className="subsection-title">🃏 메모리 게임 기록 이벤트</h3>
      <p className="eadm-desc">
        회차를 만들고 <strong>열어야</strong> 회원이 메모리 게임(4×4 → 6×6 → 8×8)을 할 수 있고, 그 동안의 완주 기록으로 순위를 겨룹니다.
        마감 시각을 정해 두면 그 시각에 자동으로 닫히고, <strong>상금은 정산 버튼을 눌러야</strong> 지급됩니다.
        동시에 열 수 있는 회차는 하나뿐입니다.
      </p>

      {isStatic && <div className="eadm-guard">이 기능은 서버가 필요합니다.</div>}

      <div className={`notice-form-card eadm-form${form.id ? ' is-editing' : ''}`}>
        <label className="eadm-label" htmlFor="eadm-memory-title">{form.id ? '회차 수정' : '새 기록 이벤트'} — 제목</label>
        <input id="eadm-memory-title" className="notice-form-input" type="text" maxLength={80} value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="예: 9월 메모리 게임 최고 기록전" />

        <label className="eadm-label" htmlFor="eadm-memory-desc">설명 (선택)</label>
        <textarea id="eadm-memory-desc" className="notice-form-textarea eadm-textarea" rows={2} value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="회원에게 보여줄 안내 문구" />

        <div className="eadm-row">
          <div>
            <label className="eadm-label" htmlFor="eadm-memory-award">1위 상금 (P)</label>
            <input id="eadm-memory-award" className="notice-form-input" type="number" min={limits.minAward} max={limits.maxAward} step={100}
              value={form.awardPoints} onChange={(e) => setForm((f) => ({ ...f, awardPoints: e.target.value }))} />
            <span className="eadm-help">{limits.minAward}P 이상</span>
          </div>
          <div>
            <label className="eadm-label" htmlFor="eadm-memory-ends">자동 마감 시각 (선택)</label>
            <input id="eadm-memory-ends" className="notice-form-input" type="datetime-local" value={form.endsAt}
              onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))} />
            <span className="eadm-help">비우면 관리자가 직접 닫을 때까지 열려 있음</span>
          </div>
        </div>

        <div className="notice-form-actions">
          {form.id && <button type="button" className="eadm-btn is-ghost" disabled={busy} onClick={() => { setForm(EMPTY_MEMORY_FORM); setMsg(null); }}>수정 취소</button>}
          <button type="button" className="eadm-btn is-ghost" disabled={busy} onClick={() => save(false)}>
            {form.id ? '수정 저장' : '작성 중으로 저장'}
          </button>
          {!form.id && (
            <button type="button" className="eadm-btn" disabled={busy || hasOpen} title={hasOpen ? '이미 진행 중인 기록 이벤트가 있습니다' : undefined} onClick={() => save(true)}>
              저장하고 바로 열기
            </button>
          )}
        </div>
        <Msg msg={msg} />
      </div>

      <div className="eadm-table-wrap">
      <table className="admin-table eadm-table">
        <thead>
          <tr><th>제목</th><th>상태</th><th>상금</th><th>자동 마감</th><th>참가</th><th>1위</th><th>관리</th></tr>
        </thead>
        <tbody>
          {periods.length === 0 && <tr className="empty-row"><td colSpan={7}>만든 기록 이벤트가 없습니다.</td></tr>}
          {periods.map((p) => {
            const st = MEMORY_STATUS[p.status] || { label: p.status, hint: '' };
            const leader = p.winner || p.top?.[0];
            return (
              <tr key={p.id}>
                <td><strong>{p.title}</strong></td>
                <td><span className={`eadm-badge is-${p.status}`} title={st.hint}>{st.label}</span></td>
                <td>{p.awardPoints}P</td>
                <td>{formatWhen(p.endsAt, '-')}</td>
                <td>{p.playerCount ?? 0}명</td>
                <td>{leader ? `${leader.nickname} (${formatMs(leader.totalMs)})` : '-'}</td>
                <td className="eadm-actions">
                  {(p.status === 'draft' || p.status === 'open') && <button type="button" className="eadm-btn is-small is-ghost" disabled={busy} onClick={() => edit(p)}>수정</button>}
                  {p.status === 'draft' && <button type="button" className="eadm-btn is-small" disabled={busy || hasOpen} title={hasOpen ? '이미 진행 중인 기록 이벤트가 있습니다' : undefined} onClick={() => act(p.id, 'open')}>열기</button>}
                  {p.status === 'open' && <button type="button" className="eadm-btn is-small is-warn" disabled={busy} onClick={() => act(p.id, 'close')}>닫기</button>}
                  {(p.status === 'open' || p.status === 'closed') && <button type="button" className="eadm-btn is-small is-ok" disabled={busy} onClick={() => act(p.id, 'settle')}>정산</button>}
                  {p.status === 'draft' && <button type="button" className="eadm-btn is-small is-danger" disabled={busy} onClick={() => act(p.id, 'delete')}>삭제</button>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}

/* ---------------- ② 제작한 티어표 공개 (뼈대) ---------------- */
function ShowcaseManager() {
  const isStatic = isStaticPreview();
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', deadlineAt: '', revealAt: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const aliveRef = useRef(true);

  useEffect(() => () => { aliveRef.current = false; }, []);

  const load = useCallback(async () => {
    if (isStatic) return;
    const res = await adminRequest('/api/events/showcase').catch(() => null);
    if (!res?.ok || !aliveRef.current) return;
    setData(res.data);
    const s = res.data.showcase;
    if (s) {
      setForm({
        title: s.title || '',
        description: s.description || '',
        deadlineAt: toLocalInput(s.deadlineAt),
        revealAt: toLocalInput(s.revealAt),
      });
    }
  }, [isStatic]);

  useEffect(() => { load(); }, [load]);

  const showcase = data?.showcase || null;
  // 발표까지 끝난 회차는 수정할 수 없으므로, 그 뒤에 새 회차를 만들려면 폼을 비워 새로 시작한다.
  const editingLocked = showcase?.status === 'revealed';

  const save = async (status) => {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    const res = await adminRequest('/api/events/showcase', {
      method: 'POST',
      body: JSON.stringify({
        id: showcase?.id,
        title: form.title,
        description: form.description,
        deadlineAt: fromLocalInput(form.deadlineAt),
        revealAt: fromLocalInput(form.revealAt),
        status,
      }),
    }).catch(() => ({ ok: false, data: { error: '서버와 연결할 수 없습니다.' } }));
    if (!aliveRef.current) return;
    setBusy(false);
    if (!res.ok) { setMsg({ error: true, text: res.data?.error || '저장에 실패했습니다.' }); return; }
    setMsg({ text: status === 'open' ? '접수를 열었습니다.' : status === 'closed' ? '접수를 닫았습니다.' : '저장했습니다.' });
    load();
  };

  const reveal = async () => {
    if (busy) return;
    if (!window.confirm('지금 결과를 발표할까요?\n참가자 전원에게 알림이 나갑니다.')) return;
    setBusy(true);
    setMsg(null);
    // 당첨자 선정 UI 는 정식 공개 때 붙인다 — 뼈대 단계에서는 "발표 + 참가자 알림"만 동작한다.
    const res = await adminRequest('/api/events/showcase/reveal', {
      method: 'POST',
      body: JSON.stringify({ winners: [], resultNote: '' }),
    }).catch(() => ({ ok: false, data: { error: '서버와 연결할 수 없습니다.' } }));
    if (!aliveRef.current) return;
    setBusy(false);
    if (!res.ok) { setMsg({ error: true, text: res.data?.error || '발표에 실패했습니다.' }); return; }
    setMsg({ text: '결과를 발표하고 참가자에게 알림을 보냈습니다.' });
    load();
  };

  const startNew = () => {
    setForm({ title: '', description: '', deadlineAt: '', revealAt: '' });
    setData((d) => ({ ...d, showcase: null }));
    setMsg(null);
  };

  return (
    <div className="eadm-block">
      <h3 className="subsection-title">🖼️ 제작한 티어표 공개 <span className="eadm-tag">정식 공개 전 · 관리자 전용</span></h3>
      <p className="eadm-desc">
        회차를 만들고 마감 시각을 정하면 그 시각에 접수 버튼이 닫히고, 결과 공개 시각(기본 마감 +{data?.revealDelayMinutes ?? 30}분)이 되면
        자동으로 발표됩니다. 기다리지 않고 바로 발표할 수도 있으며, <strong>발표하면 참가한 모든 유저에게 알림</strong>이 갑니다.
        아직 회원에게는 공개되지 않아 이벤트 페이지의 "티어표 공개" 탭은 "준비 중"으로 보입니다.
      </p>

      {isStatic && <div className="eadm-guard">이 기능은 서버가 필요합니다.</div>}

      {showcase && (
        <div className="eadm-statusbar">
          <span className={`eadm-badge is-sc-${showcase.status}`}>{SHOWCASE_STATUS[showcase.status]}</span>
          <span>참가 {showcase.entryCount ?? 0}명</span>
          <span>마감 {formatWhen(showcase.deadlineAt)}</span>
          <span>공개 {formatWhen(showcase.revealAt)}</span>
        </div>
      )}

      <div className="notice-form-card eadm-form">
        <label className="eadm-label" htmlFor="eadm-sc-title">제목</label>
        <input id="eadm-sc-title" className="notice-form-input" type="text" maxLength={80} value={form.title} disabled={editingLocked}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="예: 9월 커스텀 티어표 공개전" />

        <label className="eadm-label" htmlFor="eadm-sc-desc">설명</label>
        <textarea id="eadm-sc-desc" className="notice-form-textarea eadm-textarea" rows={2} value={form.description} disabled={editingLocked}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="참가 방법이나 심사 기준" />

        <div className="eadm-row">
          <div>
            <label className="eadm-label" htmlFor="eadm-sc-deadline">접수 마감</label>
            <input id="eadm-sc-deadline" className="notice-form-input" type="datetime-local" value={form.deadlineAt} disabled={editingLocked}
              onChange={(e) => setForm((f) => ({ ...f, deadlineAt: e.target.value }))} />
          </div>
          <div>
            <label className="eadm-label" htmlFor="eadm-sc-reveal">결과 공개</label>
            <input id="eadm-sc-reveal" className="notice-form-input" type="datetime-local" value={form.revealAt} disabled={editingLocked}
              onChange={(e) => setForm((f) => ({ ...f, revealAt: e.target.value }))} />
          </div>
        </div>

        <div className="notice-form-actions">
          {editingLocked && <button type="button" className="eadm-btn" disabled={busy} onClick={startNew}>새 회차 만들기</button>}
          {!editingLocked && (
            <>
              <button type="button" className="eadm-btn is-ghost" disabled={busy} onClick={() => save(showcase?.status === 'open' || showcase?.status === 'closed' ? showcase.status : 'draft')}>저장</button>
              <button type="button" className="eadm-btn is-ghost" disabled={busy} onClick={() => save('open')}>접수 열기</button>
              <button type="button" className="eadm-btn is-ghost" disabled={busy || !showcase} onClick={() => save('closed')}>접수 닫기</button>
              <button type="button" className="eadm-btn is-ok" disabled={busy || !showcase || showcase.status === 'draft'} onClick={reveal}>지금 결과 발표</button>
            </>
          )}
        </div>
        <Msg msg={msg} />
      </div>

      {showcase?.entries?.length > 0 && (
        <div className="eadm-table-wrap">
        <table className="admin-table eadm-table">
          <caption className="eadm-caption">참가 목록 ({showcase.entries.length})</caption>
          <thead><tr><th>닉네임</th><th>출품작</th></tr></thead>
          <tbody>
            {showcase.entries.map((e) => (
              <tr key={e.id}><td>{e.nickname}</td><td>{e.title || '(제목 없음)'}</td></tr>
            ))}
          </tbody>
        </table>
        </div>
      )}

      {showcase?.status === 'revealed' && (
        <p className="eadm-desc">
          {showcase.winners.length === 0
            ? '당첨자를 지정하지 않고 발표했습니다(참가자 알림은 발송됨).'
            : `당첨자: ${showcase.winners.map((w) => `${w.rank}위 ${w.nickname}`).join(', ')}`}
        </p>
      )}
    </div>
  );
}

export default function AdminEventManager() {
  // /admin#admin-events 로 들어오면(이벤트 페이지의 안내 링크) 이 섹션으로 스크롤한다.
  useEffect(() => {
    if (window.location.hash === '#admin-events') {
      document.getElementById('admin-events')?.scrollIntoView({ block: 'start' });
    }
  }, []);

  return (
    <section className="notice-admin-section eadm-section" id="admin-events">
      <h2 className="page-title section-title">🎉 이벤트 관리</h2>
      <MemoryPeriodManager />
      <ShowcaseManager />
    </section>
  );
}
