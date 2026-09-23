// ========================================================
// AdminEventManager — 관리자 대시보드의 "이벤트 관리" 섹션
// ========================================================
// 이벤트 페이지(/event)에는 일반 회원용 화면만 있고, 이벤트를 열고 닫는 조작은 전부 여기(관리자 페이지)에서 한다.
//   ① 메모리 게임 기록 이벤트 — 관리자가 회차를 만들고 **직접 열어야** 회원이 게임을 할 수 있다.
//      진행 중에 닫으면 순위가 확정되고, 정산하면 1위에게 상금(1000P 이상)이 지급된다.
//   ② 제작한 티어표 공개 — 회원이 티어표를 출품·투표하는 이벤트. 접수 시작 날짜 예약 / 지금 열기 / 마감 / 우승작 직접 선정 /
//      결과 발표(투표 자동 집계 또는 직접 선정)를 여기서 한다. 회원 화면은 이벤트 페이지의 "티어표 공개" 탭.
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
  draft: '작성 중',
  scheduled: '접수 예정(예약됨)',
  open: '접수 중',
  closed: '투표 중 · 접수 마감',
  revealed: '발표 완료',
};

const EMPTY_SHOWCASE_FORM = { id: null, title: '', description: '', opensAt: '', deadlineAt: '', revealAt: '', awardPoints: '1000', winnerMode: 'votes' };

const EMPTY_MEMORY_FORM = { id: null, title: '', description: '', endsAt: '', awardPoints: '1000' };

// 여는 순간 서버가 회원 전체에게 "접수 시작" 알림을 보내므로(되돌릴 수 없음) 확인 문구에 그 사실을 밝힌다.
// 목록의 "열기" 버튼과 "저장하고 바로 열기" 가 같은 문구를 쓴다.
const OPEN_MEMORY_CONFIRM = '이 기록 이벤트를 지금 여시겠어요?\n열리는 순간부터 회원이 메모리 게임을 할 수 있고, 회원 전체에게 이벤트 시작 알림이 발송됩니다.';
const OPEN_SHOWCASE_CONFIRM = '지금 바로 접수를 여시겠어요?\n열리는 순간부터 회원이 티어표를 출품하고 투표할 수 있고, 회원 전체에게 접수 시작 알림이 발송됩니다.';

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
    // "저장하고 바로 열기"는 여는 순간 회원 전체에게 알림이 나가므로 저장 전에 한 번 확인한다
    if (thenOpen && !window.confirm(OPEN_MEMORY_CONFIRM)) return;
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
      open: OPEN_MEMORY_CONFIRM,
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
    <div className="eadm-block" id="admin-memory-events" data-admin-anchor>
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

/* ---------------- ② 제작한 티어표 공개 ---------------- */
// 회원이 티어표를 출품·투표하는 이벤트. 관리자는 여기서 회차를 만들고, **접수 시작 날짜를 예약**하거나 바로 열고,
// 참가작·득표를 보며 **우승 작품을 직접 선정**하거나(또는 결과 공개일에 투표 수로 자동 발표) 결과를 발표한다.
function ShowcaseManager() {
  const isStatic = isStaticPreview();
  const [showcases, setShowcases] = useState([]);
  const [detail, setDetail] = useState(null);
  const [limits, setLimits] = useState({ minAward: 1, maxAward: 1000000, defaultAward: 1000 });
  const [delayMin, setDelayMin] = useState(30);
  const [form, setForm] = useState(EMPTY_SHOWCASE_FORM);
  const [selectedId, setSelectedId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const aliveRef = useRef(true);

  useEffect(() => () => { aliveRef.current = false; }, []);

  const load = useCallback(async (id) => {
    if (isStatic) return;
    const res = await adminRequest(`/api/events/showcase/admin${id ? `?id=${id}` : ''}`).catch(() => null);
    if (!res?.ok || !aliveRef.current) return;
    setShowcases(res.data.showcases || []);
    setDetail(res.data.detail || null);
    if (res.data.limits) setLimits(res.data.limits);
    if (res.data.revealDelayMinutes) setDelayMin(res.data.revealDelayMinutes);
  }, [isStatic]);

  useEffect(() => { load(selectedId); }, [load, selectedId]);

  // 공용 호출 — 실패 메시지를 화면에 남기고 응답 데이터를 돌려준다.
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
    await load(selectedId);
    return res.data;
  };

  const formBody = () => ({
    id: form.id || undefined,
    title: form.title,
    description: form.description,
    opensAt: fromLocalInput(form.opensAt),
    deadlineAt: fromLocalInput(form.deadlineAt),
    revealAt: fromLocalInput(form.revealAt),
    awardPoints: form.awardPoints === '' ? undefined : Number(form.awardPoints),
    winnerMode: form.winnerMode,
  });

  // 저장 → (선택) 예약/열기까지 한 번에
  const save = async (then = null) => {
    // "저장하고 바로 열기"는 여는 순간 회원 전체에게 알림이 나가므로 저장 전에 한 번 확인한다
    if (then === 'open' && !window.confirm(OPEN_SHOWCASE_CONFIRM)) return;
    const data = await run('/api/events/showcase/save', formBody(),
      then ? null : (form.id ? '수정했습니다.' : '이벤트를 만들었습니다. 아직 "작성 중"이라 회원에게는 보이지 않습니다.'));
    if (!data) return;
    if (then) {
      const started = await act(data.showcase.id, then, true);
      // 예약/열기가 거절됐으면(마감 시각 없음 등) 입력한 내용을 잃지 않게 폼을 저장된 회차로 되돌려 놓는다
      if (!started) { edit(data.showcase); return; }
    }
    setForm(EMPTY_SHOWCASE_FORM);
  };

  const act = async (id, action, skipConfirm = false, extra = {}) => {
    const confirms = {
      schedule: '이 이벤트의 접수 시작을 예약할까요?\n정한 날짜·시각에 자동으로 열리고(그때 회원 전체에게 접수 시작 알림 발송), 그 전까지 회원에게는 "접수 예정"으로 안내됩니다.',
      unschedule: '예약을 취소하고 작성 중으로 되돌릴까요?',
      open: OPEN_SHOWCASE_CONFIRM,
      close: '지금 접수를 닫을까요?\n새 출품은 막히고, 투표는 결과 공개일까지 계속됩니다.',
      reveal: '지금 결과를 발표할까요?\n우승자에게 상금이 지급되고 참가자·투표자 전원에게 알림이 나갑니다. 되돌릴 수 없습니다.',
      delete: '이 회차를 삭제할까요?',
    };
    if (!skipConfirm && confirms[action] && !window.confirm(confirms[action])) return null;
    const texts = {
      schedule: (d) => `접수 시작을 예약했습니다 — ${formatWhen(d.showcase.opensAt)}에 자동으로 열립니다.`,
      unschedule: '예약을 취소하고 작성 중으로 되돌렸습니다.',
      open: '접수를 열었습니다. 지금부터 회원이 출품·투표할 수 있어요.',
      close: '접수를 닫았습니다. 투표는 결과 공개일까지 계속됩니다.',
      select: (d) => (d.showcase.selectedEntryId ? '우승 작품을 선정했습니다. 결과 공개일(또는 [발표])에 이 작품이 우승자로 발표됩니다.' : '선정을 해제했습니다.'),
      reveal: (d) => (d.showcase.winners?.[0]
        ? `발표했습니다 — 우승 ${d.showcase.winners[0].nickname}, 상금 ${d.showcase.winners[0].awardedPoints}P 지급 · 알림 발송 완료.`
        : `발표했습니다 — ${d.showcase.resultNote || '우승자 없이 종료'}`),
      delete: '삭제했습니다.',
    };
    return run('/api/events/showcase/status', { id, action, ...extra }, texts[action]);
  };

  const edit = (s) => {
    setMsg(null);
    setForm({
      id: s.id,
      title: s.title,
      description: s.description || '',
      opensAt: toLocalInput(s.opensAt),
      deadlineAt: toLocalInput(s.deadlineAt),
      revealAt: toLocalInput(s.revealAt),
      awardPoints: String(s.awardPoints),
      winnerMode: s.winnerMode,
    });
    document.getElementById('eadm-sc-title')?.focus();
  };

  const hasActive = showcases.some((s) => ['scheduled', 'open', 'closed'].includes(s.status));
  const locked = form.id && showcases.find((s) => s.id === form.id)?.status === 'revealed';
  const editing = form.id ? showcases.find((s) => s.id === form.id) : null;
  // 이미 시작된(접수 중/마감) 회차는 시작·마감 시각을 못 바꾼다(서버도 무시)
  const startLocked = editing && ['open', 'closed'].includes(editing.status);
  const deadlineLocked = editing?.status === 'closed';
  const canPick = detail && ['open', 'closed'].includes(detail.status);

  return (
    <div className="eadm-block" id="admin-showcase" data-admin-anchor>
      <h3 className="subsection-title">🖼️ 제작한 티어표 공개</h3>
      <p className="eadm-desc">
        회원이 커스텀 티어표를 <strong>출품</strong>(새로 만들어 올리거나 올려 둔 게시글로 참가)하고 서로 <strong>투표</strong>하는 이벤트입니다.
        <strong> 접수 시작 날짜를 예약</strong>해 두면 그 시각에 자동으로 열리고, 접수 마감 후에도 투표는 결과 공개일까지 이어집니다.
        우승자는 <strong>투표 1위를 자동 집계</strong>하거나 <strong>참가작 중에서 직접 선정</strong>할 수 있고, 발표하면 우승자에게 상금이 지급되며 참가·투표한 모든 유저에게 알림이 갑니다.
        동시에 진행(예약·접수·투표)할 수 있는 회차는 하나뿐입니다.
      </p>

      {isStatic && <div className="eadm-guard">이 기능은 서버가 필요합니다.</div>}

      <div className={`notice-form-card eadm-form${form.id ? ' is-editing' : ''}`}>
        <label className="eadm-label" htmlFor="eadm-sc-title">{form.id ? '회차 수정' : '새 이벤트'} — 제목</label>
        <input id="eadm-sc-title" className="notice-form-input" type="text" maxLength={80} value={form.title} disabled={locked}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="예: 9월 커스텀 티어표 공개전" />

        <label className="eadm-label" htmlFor="eadm-sc-desc">설명 (선택)</label>
        <textarea id="eadm-sc-desc" className="notice-form-textarea eadm-textarea" rows={2} value={form.description} disabled={locked}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="참가 방법이나 심사 기준 등 회원에게 보여줄 안내" />

        <div className="eadm-row eadm-row-3">
          <div>
            <label className="eadm-label" htmlFor="eadm-sc-opens">📅 접수 시작 (예약)</label>
            <input id="eadm-sc-opens" className="notice-form-input" type="datetime-local" value={form.opensAt} disabled={locked || startLocked}
              onChange={(e) => setForm((f) => ({ ...f, opensAt: e.target.value }))} />
            <span className="eadm-help">날짜를 골라 [접수 시작 예약하기]를 누르면 그때 열려요</span>
          </div>
          <div>
            <label className="eadm-label" htmlFor="eadm-sc-deadline">접수 마감</label>
            <input id="eadm-sc-deadline" className="notice-form-input" type="datetime-local" value={form.deadlineAt} disabled={locked || deadlineLocked}
              onChange={(e) => setForm((f) => ({ ...f, deadlineAt: e.target.value }))} />
            <span className="eadm-help">예약·열기에 꼭 필요해요</span>
          </div>
          <div>
            <label className="eadm-label" htmlFor="eadm-sc-reveal">결과 공개 (= 투표 종료)</label>
            <input id="eadm-sc-reveal" className="notice-form-input" type="datetime-local" value={form.revealAt} disabled={locked}
              onChange={(e) => setForm((f) => ({ ...f, revealAt: e.target.value }))} />
            <span className="eadm-help">비우면 마감 +{delayMin}분</span>
          </div>
        </div>

        <div className="eadm-row">
          <div>
            <label className="eadm-label" htmlFor="eadm-sc-award">우승 상금 (P)</label>
            <input id="eadm-sc-award" className="notice-form-input" type="number" min={limits.minAward} max={limits.maxAward} step={100}
              value={form.awardPoints} disabled={locked} onChange={(e) => setForm((f) => ({ ...f, awardPoints: e.target.value }))} />
          </div>
          <fieldset className="eadm-radios" disabled={locked}>
            <legend className="eadm-label">우승자 결정 방식</legend>
            <label className="eadm-radio">
              <input type="radio" name="eadm-sc-mode" checked={form.winnerMode === 'votes'} onChange={() => setForm((f) => ({ ...f, winnerMode: 'votes' }))} />
              <span><strong>투표 1위 자동 선정</strong> — 결과 공개일에 표가 가장 많은 작품(동률이면 먼저 낸 작품)</span>
            </label>
            <label className="eadm-radio">
              <input type="radio" name="eadm-sc-mode" checked={form.winnerMode === 'manual'} onChange={() => setForm((f) => ({ ...f, winnerMode: 'manual' }))} />
              <span><strong>관리자가 직접 선정</strong> — 참가작 중에서 고를 때까지 발표를 기다림</span>
            </label>
          </fieldset>
        </div>

        <div className="notice-form-actions">
          {form.id && <button type="button" className="eadm-btn is-ghost" disabled={busy} onClick={() => { setForm(EMPTY_SHOWCASE_FORM); setMsg(null); }}>수정 취소</button>}
          <button type="button" className="eadm-btn is-ghost" disabled={busy || locked} onClick={() => save(null)}>{form.id ? '수정 저장' : '작성 중으로 저장'}</button>
          {(!form.id || editing?.status === 'draft') && (
            <>
              <button type="button" className="eadm-btn is-ghost" disabled={busy || hasActive} title={hasActive ? '이미 진행 중이거나 예약된 이벤트가 있습니다' : undefined} onClick={() => save('schedule')}>📅 접수 시작 예약하기</button>
              <button type="button" className="eadm-btn" disabled={busy || hasActive} title={hasActive ? '이미 진행 중이거나 예약된 이벤트가 있습니다' : undefined} onClick={() => save('open')}>지금 접수 열기</button>
            </>
          )}
        </div>
        <Msg msg={msg} />
      </div>

      <div className="eadm-table-wrap">
        <table className="admin-table eadm-table">
          <thead>
            <tr><th>제목</th><th>상태</th><th>접수 시작</th><th>접수 마감</th><th>결과 공개</th><th>참가 · 투표</th><th>우승</th><th>관리</th></tr>
          </thead>
          <tbody>
            {showcases.length === 0 && <tr className="empty-row"><td colSpan={8}>만든 이벤트가 없습니다.</td></tr>}
            {showcases.map((s) => {
              const label = s.waitingSelection ? '선정 대기' : SHOWCASE_STATUS[s.status];
              const cls = s.waitingSelection ? 'is-sc-waiting' : `is-sc-${s.status}`;
              return (
                <tr key={s.id} className={detail?.id === s.id ? 'eadm-row-active' : undefined}>
                  <td><strong>{s.title}</strong><span className="eadm-sub">{s.winnerMode === 'votes' ? '투표 자동' : '직접 선정'} · {s.awardPoints}P</span></td>
                  <td><span className={`eadm-badge ${cls}`} title={s.waitingSelection ? '결과 공개일이 지났어요 — 우승 작품을 선정하고 발표해 주세요' : undefined}>{label}</span></td>
                  <td>{formatWhen(s.opensAt, '-')}</td>
                  <td>{formatWhen(s.deadlineAt, '-')}</td>
                  <td>{formatWhen(s.revealAt, '-')}</td>
                  <td>{s.entryCount}작품 · {s.voteCount}표</td>
                  <td>{s.winners?.[0] ? `${s.winners[0].nickname} (${s.winners[0].votes}표)` : '-'}</td>
                  <td className="eadm-actions">
                    {s.status !== 'revealed' && <button type="button" className="eadm-btn is-small is-ghost" disabled={busy} onClick={() => edit(s)}>수정</button>}
                    {['open', 'closed', 'revealed'].includes(s.status) && <button type="button" className="eadm-btn is-small is-ghost" disabled={busy} onClick={() => setSelectedId(s.id)}>참가작</button>}
                    {s.status === 'draft' && <button type="button" className="eadm-btn is-small" disabled={busy || hasActive} title={hasActive ? '이미 진행 중이거나 예약된 이벤트가 있습니다' : undefined} onClick={() => act(s.id, s.opensAt && new Date(s.opensAt) > new Date() ? 'schedule' : 'open')}>
                      {s.opensAt && new Date(s.opensAt) > new Date() ? '예약' : '열기'}
                    </button>}
                    {s.status === 'scheduled' && <button type="button" className="eadm-btn is-small is-warn" disabled={busy} onClick={() => act(s.id, 'unschedule')}>예약 취소</button>}
                    {s.status === 'open' && <button type="button" className="eadm-btn is-small is-warn" disabled={busy} onClick={() => act(s.id, 'close')}>접수 닫기</button>}
                    {['open', 'closed'].includes(s.status) && <button type="button" className="eadm-btn is-small is-ok" disabled={busy} onClick={() => act(s.id, 'reveal')}>발표</button>}
                    {['draft', 'scheduled'].includes(s.status) && <button type="button" className="eadm-btn is-small is-danger" disabled={busy} onClick={() => act(s.id, 'delete')}>삭제</button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {detail && ['open', 'closed', 'revealed'].includes(detail.status) && (
        <div className="eadm-detail">
          <h4 className="eadm-detail-title">
            「{detail.title}」 참가작 · 득표 <span className="eadm-count">{detail.entryCount}작품 / {detail.voteCount}표</span>
          </h4>
          {detail.status === 'revealed' && (
            <p className="eadm-desc">
              {detail.winners?.[0]
                ? `우승: ${detail.winners[0].nickname} — 「${detail.winners[0].title || '제목 없음'}」 ${detail.winners[0].votes}표 · 상금 ${detail.winners[0].awardedPoints}P 지급`
                : (detail.resultNote || '우승자 없이 종료된 회차입니다.')}
            </p>
          )}
          {canPick && detail.winnerMode === 'manual' && !detail.selectedEntryId && detail.entryCount > 0 && (
            <p className="eadm-warn">직접 선정 방식입니다 — 아래에서 우승 작품을 <strong>선정</strong>한 뒤 발표해 주세요. 선정하기 전에는 결과 공개일이 지나도 발표되지 않고 기다립니다.</p>
          )}
          {canPick && detail.winnerMode === 'votes' && (
            <p className="eadm-desc">자동 집계 방식이라 결과 공개일에 <strong>표가 가장 많은 작품</strong>이 우승합니다. 작품을 <strong>선정</strong>해 두면 표와 상관없이 그 작품이 우선합니다.</p>
          )}
          <div className="eadm-table-wrap">
            <table className="admin-table eadm-table eadm-entries">
              <thead><tr><th>순위</th><th>작품</th><th>작성자</th><th>표</th><th>제출</th>{canPick && <th>우승작 선정</th>}</tr></thead>
              <tbody>
                {detail.entries.length === 0 && <tr className="empty-row"><td colSpan={canPick ? 6 : 5}>아직 참가작이 없습니다.</td></tr>}
                {detail.entries.map((e, i) => {
                  const chosen = detail.selectedEntryId === e.id;
                  const won = detail.winners?.[0]?.entryId === e.id;
                  return (
                    <tr key={e.id} className={chosen || won ? 'eadm-row-active' : undefined}>
                      <td>{i + 1}</td>
                      <td>
                        <a className="eadm-entry-link" href={`/board/post?id=${encodeURIComponent(e.tierListId)}`} target="_blank" rel="noreferrer">{e.title || '제목 없음'}</a>
                        {won && <span className="eadm-tag">🏆 우승</span>}
                        {chosen && !won && <span className="eadm-tag">선정됨</span>}
                      </td>
                      <td>{e.nickname}</td>
                      <td><strong>{e.votes}</strong></td>
                      <td>{formatWhen(e.createdAt, '-')}</td>
                      {canPick && (
                        <td className="eadm-actions">
                          {chosen
                            ? <button type="button" className="eadm-btn is-small is-ghost" disabled={busy} onClick={() => act(detail.id, 'select', true, { entryId: null })}>선정 해제</button>
                            : <button type="button" className="eadm-btn is-small" disabled={busy} onClick={() => act(detail.id, 'select', true, { entryId: e.id })}>우승작으로 선정</button>}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminEventManager() {
  // /admin#admin-events 로 들어오는 링크(이벤트 페이지의 안내)의 스크롤은 대시보드가 데이터 로딩 후에 처리한다
  // (여기서 마운트 즉시 스크롤하면 아래 표들이 그려지기 전이라 위치가 어긋난다).
  return (
    <section className="notice-admin-section eadm-section" id="admin-events" data-admin-anchor>
      <h2 className="page-title section-title">🎉 이벤트 관리</h2>
      <MemoryPeriodManager />
      <ShowcaseManager />
    </section>
  );
}
