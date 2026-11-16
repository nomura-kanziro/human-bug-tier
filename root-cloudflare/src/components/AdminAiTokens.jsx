// ========================================================
// AdminAiTokens — 관리자 대시보드의 "휴버토큰 관리" 섹션
// ========================================================
// 휴버토큰 = 에이전트 봇에서 Claude 모델을 쓸 때 드는 AI 전용 포인트(행운 뽑기 포인트와 다른 지갑).
// 사이트에 결제 대행이 없어서 회원이 "구매 신청 / 후원 확인 신청"을 넣으면 여기에 대기로 쌓인다.
//   ① 신청 목록 — 입금·후원을 확인한 뒤 [승인](토큰 적립) 또는 [거절]. 후원 신청은 적립할 토큰 수를 직접 정한다.
//   ② 직접 지급 — 닉네임으로 토큰을 주거나(양수) 회수(음수)한다.
// 서버: GET /api/admin/ai-tokens/orders, POST …/orders/:id/approve|reject, POST …/grant (aiTokenController, requireAdmin)
import { useCallback, useEffect, useState } from 'react';
import { adminRequest, isStaticPreview } from '../lib/api';
import { formatWhen } from '../lib/eventFormat';
import '../styles/admin-event.css';

const FILTERS = [
  { key: 'pending', label: '대기' },
  { key: 'approved', label: '승인' },
  { key: 'rejected', label: '거절' },
  { key: 'all', label: '전체' },
];
const STATUS = {
  pending: { label: '대기', cls: 'is-sc-waiting' },
  approved: { label: '승인', cls: 'is-open' },
  rejected: { label: '거절', cls: 'is-closed' },
};
const fmt = (n) => Number(n || 0).toLocaleString('ko-KR');

export default function AdminAiTokens() {
  const isStatic = isStaticPreview();
  const [filter, setFilter] = useState('pending');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState(null);            // { ok, text }
  const [busyId, setBusyId] = useState('');
  const [amounts, setAmounts] = useState({});      // 신청별로 적립할 토큰(후원·수정용)
  const [grant, setGrant] = useState({ nickname: '', tokens: '', note: '' });

  const load = useCallback(async () => {
    if (isStatic) return;
    try {
      const res = await adminRequest(`/api/admin/ai-tokens/orders${filter === 'all' ? '' : `?status=${filter}`}`);
      if (res.ok) { setData(res.data); setError(''); } else setError(res.data?.error || '신청 목록을 불러오지 못했습니다.');
    } catch {
      setError('서버와 연결할 수 없습니다.');
    }
  }, [filter, isStatic]);

  useEffect(() => { load(); }, [load]);

  const act = async (order, action) => {
    if (busyId) return;
    const body = {};
    if (action === 'approve') {
      const tokens = Number(amounts[order.id] ?? order.tokens);
      if (!tokens || tokens <= 0) { setMsg({ ok: false, text: '적립할 토큰 수를 입력해 주세요.' }); return; }
      if (!window.confirm(`${order.nickname} 님에게 ${fmt(tokens)} 휴버토큰을 적립할까요?`)) return;
      body.tokens = tokens;
    } else if (!window.confirm(`${order.nickname} 님의 신청을 거절할까요?`)) {
      return;
    }
    setBusyId(order.id);
    try {
      const res = await adminRequest(`/api/admin/ai-tokens/orders/${order.id}/${action}`, { method: 'POST', body: JSON.stringify(body) });
      setMsg(res.ok
        ? { ok: true, text: action === 'approve' ? `적립했습니다(잔액 ${fmt(res.data.balance)}토큰).` : '거절했습니다.' }
        : { ok: false, text: res.data?.error || '처리하지 못했습니다.' });
      load();
    } catch {
      setMsg({ ok: false, text: '서버와 연결할 수 없습니다.' });
    } finally {
      setBusyId('');
    }
  };

  const onGrant = async (e) => {
    e.preventDefault();
    const tokens = Number(grant.tokens);
    if (!grant.nickname.trim() || !tokens) { setMsg({ ok: false, text: '닉네임과 토큰 수를 입력해 주세요.' }); return; }
    if (!window.confirm(`${grant.nickname.trim()} 님에게 ${fmt(tokens)} 휴버토큰을 ${tokens > 0 ? '지급' : '회수'}할까요?`)) return;
    try {
      const res = await adminRequest('/api/admin/ai-tokens/grant', { method: 'POST', body: JSON.stringify({ ...grant, tokens }) });
      if (res.ok) {
        setMsg({ ok: true, text: `${res.data.nickname} 님 잔액: ${fmt(res.data.balance)}토큰` });
        setGrant({ nickname: '', tokens: '', note: '' });
      } else {
        setMsg({ ok: false, text: res.data?.error || '지급하지 못했습니다.' });
      }
    } catch {
      setMsg({ ok: false, text: '서버와 연결할 수 없습니다.' });
    }
  };

  return (
    <section className="notice-admin-section eadm-section" id="admin-ai-tokens" data-admin-anchor>
      <h2 className="page-title section-title">🪙 휴버토큰 관리</h2>
      <p className="eadm-desc">
        휴버토큰은 에이전트 봇의 <strong>Claude 엔진</strong>에서 쓰는 AI 전용 포인트입니다(회원마다 처음 500 지급).
        회원의 구매·후원 신청은 입금·후원을 확인한 뒤 <strong>승인</strong>하면 그때 적립됩니다.
      </p>

      {isStatic && <p className="eadm-guard">정적 미리보기에서는 서버 데이터를 불러올 수 없습니다.</p>}

      {!isStatic && (
        <>
          <div className="eadm-actions">
            {FILTERS.map((f) => (
              <button type="button" key={f.key} className={`eadm-btn is-small${filter === f.key ? '' : ' is-ghost'}`} onClick={() => setFilter(f.key)}>
                {f.label}{f.key === 'pending' && data ? ` ${data.pendingCount}` : ''}
              </button>
            ))}
          </div>
          {error && <p className="eadm-msg is-error">{error}</p>}
          {msg && <p className={`eadm-msg ${msg.ok ? 'is-ok' : 'is-error'}`}>{msg.text}</p>}

          {data && (
            <div className="eadm-table-wrap">
              <table className="admin-table eadm-table">
                <thead>
                  <tr><th>신청일</th><th>닉네임</th><th>종류</th><th>금액</th><th>메모</th><th>토큰</th><th>상태</th><th>처리</th></tr>
                </thead>
                <tbody>
                  {data.orders.length === 0 && <tr><td colSpan={8}>신청이 없습니다.</td></tr>}
                  {data.orders.map((o) => (
                    <tr key={o.id}>
                      <td>{formatWhen(o.createdAt)}</td>
                      <td>{o.nickname}</td>
                      <td>{o.kindLabel}</td>
                      <td>{o.price ? `${fmt(o.price)}원` : '-'}</td>
                      <td>{o.memo}</td>
                      <td>
                        {o.status === 'pending' ? (
                          <input
                            className="notice-form-input"
                            type="number" min="1" style={{ width: 96 }}
                            value={amounts[o.id] ?? (o.tokens || '')}
                            placeholder={o.kind === 'sponsor' ? '정해서 입력' : ''}
                            onChange={(e) => setAmounts((cur) => ({ ...cur, [o.id]: e.target.value }))}
                            aria-label="적립할 토큰"
                          />
                        ) : fmt(o.tokens)}
                      </td>
                      <td><span className={`eadm-badge ${STATUS[o.status]?.cls || ''}`}>{STATUS[o.status]?.label || o.status}</span></td>
                      <td>
                        {o.status === 'pending' ? (
                          <span className="eadm-actions">
                            <button type="button" className="eadm-btn is-small is-ok" disabled={busyId === o.id} onClick={() => act(o, 'approve')}>승인</button>
                            <button type="button" className="eadm-btn is-small is-danger" disabled={busyId === o.id} onClick={() => act(o, 'reject')}>거절</button>
                          </span>
                        ) : `${o.processedBy || ''} ${o.processedAt ? formatWhen(o.processedAt) : ''}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h3 className="eadm-detail-title">직접 지급 · 회수</h3>
          <form className="eadm-actions" onSubmit={onGrant}>
            <input className="notice-form-input" type="text" placeholder="닉네임" value={grant.nickname} onChange={(e) => setGrant({ ...grant, nickname: e.target.value })} style={{ maxWidth: 180 }} />
            <input className="notice-form-input" type="number" placeholder="토큰(음수면 회수)" value={grant.tokens} onChange={(e) => setGrant({ ...grant, tokens: e.target.value })} style={{ maxWidth: 160 }} />
            <input className="notice-form-input" type="text" placeholder="사유(선택)" maxLength={120} value={grant.note} onChange={(e) => setGrant({ ...grant, note: e.target.value })} style={{ maxWidth: 240 }} />
            <button type="submit" className="eadm-btn">적용</button>
          </form>
        </>
      )}
    </section>
  );
}
