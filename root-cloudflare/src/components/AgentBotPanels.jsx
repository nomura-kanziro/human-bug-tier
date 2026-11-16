// 에이전트 봇 모달 안의 두 패널 — 엔진 고르기(EnginePicker)와 휴버토큰 충전(TokenShop).
//  - 엔진은 두 가지: 무료 엔진(서버의 Ollama, 하루 횟수 제한) / Claude 엔진(모델·effort 선택, 휴버토큰 사용).
//  - 휴버토큰은 AI 전용 포인트다(행운 뽑기 포인트와 다른 지갑). 기본 500 을 주고, 더 필요하면 구매·후원 신청을 넣는다.
//    결제 대행이 없어서 신청은 "대기"로 쌓이고 운영자가 확인·승인하면 적립된다.
//  - 요금표(모델별 1회 평균값 × effort 배수)는 서버(/api/ai/agent/info 의 pricing)에서 받아 그대로 보여 준다.
import { useCallback, useEffect, useState } from 'react';
import { createTokenOrder, fetchMyTokens } from '../lib/agentApi';
import { getSponsorProfileUrl } from './SponsorButton';

const FAMILY_LABELS = { haiku: 'Haiku — 빠르고 저렴', sonnet: 'Sonnet — 균형', opus: 'Opus — 깊이', fable: 'Fable — 최고 성능' };
const STATUS_VIEW = {
  pending: { label: '확인 대기', cls: 'is-pending' },
  approved: { label: '적립 완료', cls: 'is-approved' },
  rejected: { label: '거절됨', cls: 'is-rejected' },
};
const fmt = (n) => Number(n || 0).toLocaleString('ko-KR');
const day = (v) => (v ? String(v).slice(0, 10) : '');

// 고른 엔진으로 한 번 실행할 때 드는 값 — { unit: 'free' } | { unit: 'token', cost }
export function engineCost(pricing, engine) {
  if (!pricing || engine.provider !== 'claude') return { unit: 'free', cost: 0 };
  const model = pricing.models.find((m) => m.id === engine.model) || pricing.models.find((m) => m.id === pricing.defaultModel);
  if (!model) return { unit: 'token', cost: 0 };
  const effort = model.effort ? (engine.effort || pricing.defaultEffort) : pricing.defaultEffort;
  return { unit: 'token', cost: model.costs[effort], model, effort: model.effort ? effort : null };
}

export function EnginePicker({ info, engine, onChange, tokens, free, disabled, onOpenShop }) {
  const pricing = info?.pricing;
  if (!pricing) return null;
  const claudeReady = info.claude === true;
  const isClaude = engine.provider === 'claude';
  const model = pricing.models.find((m) => m.id === engine.model) || pricing.models.find((m) => m.id === pricing.defaultModel);
  const { cost } = engineCost(pricing, engine);
  const families = [...new Set(pricing.models.map((m) => m.family))];

  return (
    <div className="agent-engine" aria-label="엔진 고르기">
      <div className="agent-engine-tabs" role="radiogroup" aria-label="엔진">
        <button
          type="button" role="radio" aria-checked={!isClaude} disabled={disabled}
          className={`agent-engine-tab${!isClaude ? ' is-active' : ''}`}
          onClick={() => onChange({ ...engine, provider: 'ollama' })}
        >
          <b>무료 엔진</b>
          <span>오늘 {free?.left ?? pricing.freeDailyLimit}/{pricing.freeDailyLimit}회 남음</span>
        </button>
        <button
          type="button" role="radio" aria-checked={isClaude} disabled={disabled}
          className={`agent-engine-tab${isClaude ? ' is-active' : ''}`}
          onClick={() => onChange({ ...engine, provider: 'claude', model: engine.model || pricing.defaultModel, effort: engine.effort || pricing.defaultEffort })}
        >
          <b>Claude 엔진</b>
          <span>휴버토큰 {typeof tokens === 'number' ? fmt(tokens) : '-'}</span>
        </button>
      </div>

      {!isClaude && (
        <p className="agent-engine-note">
          서버의 무료 AI 모델로 실행해요. 토큰이 들지 않고 하루 {pricing.freeDailyLimit}번까지 쓸 수 있어요(자정에 초기화).
        </p>
      )}

      {isClaude && (
        <div className="agent-engine-claude">
          {!claudeReady && (
            <p className="agent-engine-warn">지금은 Claude 엔진을 쓸 수 없어요(서버에 API 키가 아직 없어요). 실행하면 무료 엔진으로 이어서 처리하고 휴버토큰은 받지 않아요.</p>
          )}
          <label className="agent-field">
            <span>모델</span>
            <select value={model?.id || ''} disabled={disabled} onChange={(e) => onChange({ ...engine, model: e.target.value })}>
              {families.map((f) => (
                <optgroup key={f} label={FAMILY_LABELS[f] || f}>
                  {pricing.models.filter((m) => m.family === f).map((m) => (
                    <option key={m.id} value={m.id}>{m.label} · 평균 {m.base}토큰</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <div className="agent-field">
            <span>effort (생각의 깊이)</span>
            <div className="agent-effort" role="radiogroup" aria-label="effort">
              {pricing.efforts.map((e) => (
                <button
                  type="button" key={e.id} role="radio"
                  aria-checked={model?.effort && (engine.effort || pricing.defaultEffort) === e.id}
                  className={model?.effort && (engine.effort || pricing.defaultEffort) === e.id ? 'is-active' : ''}
                  disabled={disabled || !model?.effort}
                  onClick={() => onChange({ ...engine, effort: e.id })}
                  title={`평균값 × ${e.mult}`}
                >
                  {e.label}
                </button>
              ))}
            </div>
            {!model?.effort && <small>이 모델은 effort 를 고를 수 없어요.</small>}
          </div>
          <p className="agent-engine-cost">
            한 번에 <b>{fmt(cost)} 휴버토큰</b>
            <small>{model?.note}</small>
          </p>
          <button type="button" className="agent-btn-ghost agent-engine-shop" onClick={onOpenShop}>휴버토큰 충전 · 요금표 →</button>
        </div>
      )}
    </div>
  );
}

export function TokenShop({ info, onClose, onChanged }) {
  const pricing = info?.pricing;
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [packId, setPackId] = useState('');
  const [memo, setMemo] = useState('');
  const [sponsorMemo, setSponsorMemo] = useState('');
  const [sponsorAmount, setSponsorAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const sponsorUrl = getSponsorProfileUrl();

  const load = useCallback(async () => {
    try {
      const res = await fetchMyTokens();
      if (res.ok) {
        setData(res.data);
        setError('');
        onChanged?.(res.data);
        setPackId((cur) => cur || res.data.packs?.[0]?.id || '');
      } else {
        setError(res.data?.error || '휴버토큰 정보를 불러오지 못했어요.');
      }
    } catch {
      setError('서버와 연결할 수 없어요.');
    }
  }, [onChanged]);

  useEffect(() => { load(); }, [load]);

  const order = async (payload, done) => {
    if (busy) return;
    setBusy(true);
    setNotice('');
    try {
      const res = await createTokenOrder(payload);
      if (res.ok) {
        setNotice('신청을 받았어요. 운영자가 확인하면 휴버토큰이 적립돼요.');
        done();
        load();
      } else {
        setNotice(res.data?.error || '신청하지 못했어요.');
      }
    } catch {
      setNotice('서버와 연결할 수 없어요.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="agent-shop" role="region" aria-label="휴버토큰 충전">
      <div className="agent-shop-head">
        <strong>🪙 휴버토큰</strong>
        <button type="button" className="agent-btn-text" onClick={onClose}>← 대화로 돌아가기</button>
      </div>

      {error && <p className="agent-shop-error">{error}</p>}
      {data && (
        <p className="agent-shop-balance">
          보유 <b>{fmt(data.tokens)} 토큰</b>
          <span>처음에 {fmt(data.defaultTokens)}토큰을 드려요. 휴버토큰은 Claude 엔진에서만 쓰이고, 행운 뽑기 포인트와는 다른 지갑이에요.</span>
        </p>
      )}

      {pricing && (
        <section className="agent-shop-block">
          <h4>모델별 요금표 (한 번 실행할 때의 평균값)</h4>
          <div className="agent-price-wrap">
            <table className="agent-price">
              <thead>
                <tr><th>모델</th>{pricing.efforts.map((e) => <th key={e.id}>{e.label}</th>)}</tr>
              </thead>
              <tbody>
                {pricing.models.map((m) => (
                  <tr key={m.id}>
                    <th>{m.label}</th>
                    {pricing.efforts.map((e) => (
                      <td key={e.id}>{m.effort || e.id === pricing.defaultEffort ? m.costs[e.id] : '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="agent-shop-hint">
            단위는 휴버토큰이에요. 이용법 안내·통합 검색은 토큰이 들지 않고, Claude 가 답을 쓰지 못하면 받은 토큰을 돌려드려요.
            무료 엔진은 토큰 없이 하루 {pricing.freeDailyLimit}번 쓸 수 있어요.
          </p>
        </section>
      )}

      {data && (
        <>
          <section className="agent-shop-block">
            <h4>휴버토큰 구매 신청</h4>
            <div className="agent-packs" role="radiogroup" aria-label="토큰 묶음">
              {data.packs.map((p) => (
                <button
                  type="button" key={p.id} role="radio" aria-checked={packId === p.id}
                  className={`agent-pack${packId === p.id ? ' is-active' : ''}`} onClick={() => setPackId(p.id)}
                >
                  <b>{fmt(p.tokens)} 토큰</b>
                  <span>{fmt(p.price)}원</span>
                </button>
              ))}
            </div>
            <div className="agent-shop-row">
              <input
                type="text" value={memo} maxLength={80} onChange={(e) => setMemo(e.target.value)}
                placeholder="확인용 메모 (입금자명 등)" aria-label="구매 확인용 메모"
              />
              <button
                type="button" className="agent-btn-primary" disabled={busy || !packId || !memo.trim()}
                onClick={() => order({ kind: 'purchase', packId, memo }, () => setMemo(''))}
              >
                구매 신청
              </button>
            </div>
          </section>

          <section className="agent-shop-block">
            <h4>후원하고 휴버토큰 받기</h4>
            <p className="agent-shop-hint">
              {sponsorUrl
                ? <>먼저 <a href={sponsorUrl} target="_blank" rel="noopener noreferrer">후원 페이지</a>에서 후원한 뒤, 아래에 후원할 때 쓴 이름과 금액을 남겨 주세요. 운영자가 확인하고 휴버토큰을 적립해 드려요.</>
                : '후원한 뒤 아래에 후원할 때 쓴 이름과 금액을 남겨 주세요. 운영자가 확인하고 휴버토큰을 적립해 드려요.'}
            </p>
            <div className="agent-shop-row">
              <input
                type="text" value={sponsorMemo} maxLength={80} onChange={(e) => setSponsorMemo(e.target.value)}
                placeholder="후원할 때 쓴 이름" aria-label="후원자 이름"
              />
              <input
                type="number" value={sponsorAmount} min="0" onChange={(e) => setSponsorAmount(e.target.value)}
                placeholder="금액(원)" aria-label="후원 금액" className="is-amount"
              />
              <button
                type="button" className="agent-btn-primary" disabled={busy || !sponsorMemo.trim()}
                onClick={() => order({ kind: 'sponsor', memo: sponsorMemo, amount: Number(sponsorAmount) || 0 }, () => { setSponsorMemo(''); setSponsorAmount(''); })}
              >
                후원 확인 신청
              </button>
            </div>
          </section>

          <p className="agent-shop-guide">ℹ️ {data.payGuide} 카드번호·계좌번호 같은 결제 정보는 이 창에 적지 마세요.</p>
          {notice && <p className="agent-shop-notice" role="status">{notice}</p>}

          {data.orders.length > 0 && (
            <section className="agent-shop-block">
              <h4>내 신청</h4>
              <ul className="agent-shop-list">
                {data.orders.map((o) => (
                  <li key={o.id}>
                    <span className={`agent-order-status ${STATUS_VIEW[o.status]?.cls || ''}`}>{STATUS_VIEW[o.status]?.label || o.status}</span>
                    <span>{o.kindLabel}{o.tokens ? ` · ${fmt(o.tokens)}토큰` : ''}{o.price ? ` · ${fmt(o.price)}원` : ''}</span>
                    <small>{day(o.createdAt)}{o.adminNote ? ` · ${o.adminNote}` : ''}</small>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {data.logs.length > 0 && (
            <section className="agent-shop-block">
              <h4>최근 내역</h4>
              <ul className="agent-shop-list">
                {data.logs.map((l) => (
                  <li key={l.id}>
                    <span className={`agent-delta ${l.delta > 0 ? 'is-plus' : 'is-minus'}`}>{l.delta > 0 ? '+' : ''}{fmt(l.delta)}</span>
                    <span>{l.detail || l.sourceLabel}</span>
                    <small>{day(l.createdAt)} · 잔액 {fmt(l.balanceAfter)}</small>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
