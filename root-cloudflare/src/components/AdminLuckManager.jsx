// ========================================================
// AdminLuckManager — 관리자 대시보드의 "행운 뽑기 관리" 섹션 (읽기 전용)
// ========================================================
//   ① 회원 목록 — 행운 뽑기 지갑이 있는 회원을 최근 활동 순으로(닉네임 검색·페이지). 보유 포인트와 3종 이용 횟수.
//   ② 회원을 고르면 아래에 그 회원의 기록을 탭으로 보여준다:
//      오늘의 행운 티어 / 행운 티어 포커 / 랜덤 뽑기 / 포인트 내역(증감 원장 + 출처별 합계)
// 서버: GET /api/admin/luck/users, /users/:userId, /users/:userId/points (adminLuckController, requireAdmin)
// 모든 요청은 adminRequest(adminAuthToken) → 서버 requireAdmin 으로 이중 검증된다.
import { useCallback, useEffect, useRef, useState } from 'react';
import AdminPagination from './AdminPagination';
import { adminRequest, isStaticPreview } from '../lib/api';
import { formatWhen } from '../lib/eventFormat';
import '../styles/admin-event.css';
import '../styles/admin-luck.css';

const TABS = [
  { key: 'daily', label: '🍀 오늘의 행운 티어' },
  { key: 'poker', label: '🃏 행운 티어 포커' },
  { key: 'ladder', label: '🎲 랜덤 뽑기' },
  { key: 'points', label: '💰 포인트 내역' },
];

const OUTCOME = {
  win: { label: '승리', cls: 'is-win' },
  lose: { label: '패배', cls: 'is-lose' },
  push: { label: '무승부', cls: 'is-push' },
};

const fmtP = (n) => `${Number(n || 0).toLocaleString('ko-KR')}P`;

// 지갑 주인 구분 배지 — 관리자 계정으로 뽑은 기록(관리자) / 회원·관리자 어디에도 없는 계정(탈퇴). 일반 회원은 배지 없음.
const ACCOUNT_BADGE = {
  admin: { label: '관리자', cls: 'is-admin' },
  deleted: { label: '탈퇴', cls: 'is-deleted' },
};

function AccountBadge({ type }) {
  const b = ACCOUNT_BADGE[type];
  return b ? <span className={`luckadm-badge luckadm-account ${b.cls}`}>{b.label}</span> : null;
}

// +100P / -50P — 부호와 색으로 증감을 구분한다
function Delta({ value }) {
  if (value === null || value === undefined) return <span className="luckadm-muted">-</span>;
  const n = Number(value);
  const cls = n > 0 ? 'is-plus' : n < 0 ? 'is-minus' : '';
  return <span className={`luckadm-delta ${cls}`}>{n > 0 ? '+' : ''}{n.toLocaleString('ko-KR')}P</span>;
}

function OutcomeBadge({ outcome, pending }) {
  if (pending) return <span className="luckadm-badge">진행 중</span>;
  const o = OUTCOME[outcome];
  if (!o) return <span className="luckadm-muted" title="이 기능 추가 전에 정산된 판이라 결과가 저장되지 않았습니다">기록 없음</span>;
  return <span className={`luckadm-badge ${o.cls}`}>{o.label}</span>;
}

/* ---------------- 회원 한 명의 기록 ---------------- */
function LuckUserDetail({ userId, onClose }) {
  const [tab, setTab] = useState('daily');
  const [detail, setDetail] = useState(null);
  const [points, setPoints] = useState(null);
  const [pointPage, setPointPage] = useState(1);
  const [error, setError] = useState('');
  const aliveRef = useRef(true);

  useEffect(() => { aliveRef.current = true; return () => { aliveRef.current = false; }; }, []);

  useEffect(() => {
    setDetail(null);
    setError('');
    adminRequest(`/api/admin/luck/users/${userId}`)
      .then((res) => {
        if (!aliveRef.current) return;
        if (res.ok) setDetail(res.data);
        else setError(res.data?.error || '기록을 불러오지 못했습니다.');
      })
      .catch(() => aliveRef.current && setError('기록을 불러오지 못했습니다.'));
  }, [userId]);

  useEffect(() => { setPointPage(1); }, [userId]);

  useEffect(() => {
    if (tab !== 'points') return;
    setPoints(null);
    adminRequest(`/api/admin/luck/users/${userId}/points?page=${pointPage}`)
      .then((res) => { if (aliveRef.current) setPoints(res.ok ? res.data : { error: res.data?.error || '포인트 내역을 불러오지 못했습니다.' }); })
      .catch(() => aliveRef.current && setPoints({ error: '포인트 내역을 불러오지 못했습니다.' }));
  }, [tab, userId, pointPage]);

  if (error) return <div className="luckadm-detail"><p className="eadm-msg is-error">{error}</p></div>;
  if (!detail) return <div className="luckadm-detail"><p className="eadm-desc">불러오는 중…</p></div>;

  const { user, profile } = detail;
  const tierCounts = Object.entries(profile.tierCounts || {})
    .filter(([, n]) => n > 0)
    .sort(([a], [b]) => Number(a) - Number(b));

  return (
    <div className="luckadm-detail">
      <div className="luckadm-detail-head">
        <h3 className="eadm-detail-title">
          {user.nickname}
          <AccountBadge type={user.accountType} />
          <span className="eadm-count">{user.email}</span>
        </h3>
        <button type="button" className="eadm-btn is-ghost" onClick={onClose}>닫기</button>
      </div>

      <div className="luckadm-stats">
        <div><span>보유 포인트</span><strong>{fmtP(profile.points)}</strong></div>
        <div><span>오늘의 행운 티어</span><strong>{profile.totalDraws.toLocaleString('ko-KR')}회</strong></div>
        <div><span>최고 티어</span><strong>{profile.bestTier ? `${profile.bestTier}티어` : '-'}</strong></div>
        <div><span>행운 티어 포커</span><strong>{detail.poker.total.toLocaleString('ko-KR')}판</strong></div>
        <div><span>랜덤 뽑기</span><strong>{detail.ladder.total.toLocaleString('ko-KR')}회 배팅</strong></div>
        <div><span>마지막 행운 티어</span><strong>{formatWhen(profile.lastDrawAt, '-')}</strong></div>
      </div>

      <div className="luckadm-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            className={`filter-btn${tab === t.key ? ' active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'daily' && (
        <div>
          {tierCounts.length > 0 && (
            <p className="eadm-desc">
              티어별 누적: {tierCounts.map(([tier, n]) => `${tier}티어 ${n}회`).join(' · ')}
            </p>
          )}
          <p className="eadm-desc">
            오늘의 행운 티어 기록은 회원마다 <strong>최근 {detail.dailyRetention}건</strong>만 남고 자동으로 지워집니다(전체 횟수·티어별 누적은 위 숫자).
          </p>
          <div className="eadm-table-wrap">
            <table className="admin-table eadm-table">
              <thead><tr><th>뽑은 시각</th><th>날짜(KST)</th><th>티어</th><th>캐릭터</th></tr></thead>
              <tbody>
                {detail.daily.length === 0 && <tr><td colSpan={4}>기록이 없습니다.</td></tr>}
                {detail.daily.map((d) => (
                  <tr key={d.id}>
                    <td>{formatWhen(d.createdAt, '-')}</td>
                    <td>{d.drawDate}</td>
                    <td>{d.tier}티어</td>
                    <td>{d.characterName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'poker' && (
        <div>
          <p className="eadm-desc">최근 {detail.historyLimit}판까지 보여줍니다(전체 {detail.poker.total}판). 승패·지급액은 이 관리 기능이 추가된 뒤 정산된 판부터 기록됩니다.</p>
          <div className="eadm-table-wrap">
            <table className="admin-table eadm-table">
              <thead><tr><th>시각</th><th>배팅</th><th>결과</th><th>족보 (나 vs 딜러)</th><th>지급</th><th>순증감</th></tr></thead>
              <tbody>
                {detail.poker.rounds.length === 0 && <tr><td colSpan={6}>기록이 없습니다.</td></tr>}
                {detail.poker.rounds.map((r) => (
                  <tr key={r.id}>
                    <td>{formatWhen(r.createdAt, '-')}</td>
                    <td>{fmtP(r.bet)}</td>
                    <td><OutcomeBadge outcome={r.outcome} pending={r.status === 'open'} /></td>
                    <td>{r.playerHand ? `${r.playerHand} vs ${r.dealerHand}` : <span className="luckadm-muted">-</span>}</td>
                    <td>{r.payout === null ? <span className="luckadm-muted">-</span> : fmtP(r.payout)}</td>
                    <td><Delta value={r.status === 'open' ? -r.bet : r.pointsDelta} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'ladder' && (
        <div>
          <p className="eadm-desc">최근 {detail.historyLimit}건까지 보여줍니다(전체 {detail.ladder.total}건).</p>
          <div className="eadm-table-wrap">
            <table className="admin-table eadm-table">
              <thead><tr><th>시각</th><th>회차</th><th>배팅</th><th>금액 · 배수</th><th>라운드 결과</th><th>결과</th><th>증감</th></tr></thead>
              <tbody>
                {detail.ladder.bets.length === 0 && <tr><td colSpan={7}>기록이 없습니다.</td></tr>}
                {detail.ladder.bets.map((b) => (
                  <tr key={b.id}>
                    <td>{formatWhen(b.createdAt, '-')}</td>
                    <td>{b.roundNo}회차</td>
                    <td>{b.betLabel}</td>
                    <td>{fmtP(b.bet)} · ×{b.mult}</td>
                    <td>{b.resultTier ? `${b.resultTier}티어 · ${b.resultCharacterName}` : <span className="luckadm-muted">대기</span>}</td>
                    <td><OutcomeBadge outcome={b.outcome} pending={!b.settled} /></td>
                    <td>{b.settled ? <Delta value={b.pointsDelta} /> : <span className="luckadm-muted">-</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'points' && (
        <div>
          {!points && <p className="eadm-desc">불러오는 중…</p>}
          {points?.error && <p className="eadm-msg is-error">{points.error}</p>}
          {points && !points.error && (
            <>
              <p className="eadm-desc">
                포인트가 바뀔 때마다 남는 기록입니다. <strong>이 관리 기능이 추가된 뒤의 증감부터</strong> 쌓이며, 그 전 증감은 없습니다.
              </p>
              <div className="luckadm-stats is-compact">
                <div><span>얻은 포인트</span><strong className="is-plus">+{points.totals.gained.toLocaleString('ko-KR')}P</strong></div>
                <div><span>사용·잃은 포인트</span><strong className="is-minus">{points.totals.spent.toLocaleString('ko-KR')}P</strong></div>
                <div><span>기록 수</span><strong>{points.total.toLocaleString('ko-KR')}건</strong></div>
              </div>
              {points.bySource.length > 0 && (
                <div className="eadm-table-wrap">
                  <table className="admin-table eadm-table">
                    <thead><tr><th>출처</th><th>건수</th><th>얻음</th><th>사용·잃음</th></tr></thead>
                    <tbody>
                      {points.bySource.map((s) => (
                        <tr key={s.source}>
                          <td>{s.label}</td>
                          <td>{s.count.toLocaleString('ko-KR')}건</td>
                          <td><Delta value={s.gained} /></td>
                          <td><Delta value={s.spent} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="eadm-table-wrap">
                <table className="admin-table eadm-table">
                  <thead><tr><th>시각</th><th>출처</th><th>내용</th><th>증감</th><th>잔액</th></tr></thead>
                  <tbody>
                    {points.logs.length === 0 && <tr><td colSpan={5}>포인트 내역이 없습니다.</td></tr>}
                    {points.logs.map((l) => (
                      <tr key={l.id}>
                        <td>{formatWhen(l.createdAt, '-')}</td>
                        <td>{l.sourceLabel}</td>
                        <td className="luckadm-detail-text">{l.detail}</td>
                        <td><Delta value={l.delta} /></td>
                        <td>{fmtP(l.balanceAfter)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {points.totalPages > 1 && (
                <AdminPagination page={points.page} totalPages={points.totalPages} onChange={setPointPage} />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------- 섹션: 회원 목록 ---------------- */
export default function AdminLuckManager() {
  const isStatic = isStaticPreview();
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const aliveRef = useRef(true);

  useEffect(() => () => { aliveRef.current = false; }, []);

  const load = useCallback(async () => {
    if (isStatic) return;
    setError('');
    const params = new URLSearchParams({ page: String(page) });
    if (search) params.set('q', search);
    const res = await adminRequest(`/api/admin/luck/users?${params}`).catch(() => null);
    if (!aliveRef.current) return;
    if (res?.ok) setData(res.data);
    else setError(res?.data?.error || '행운 뽑기 회원 목록을 불러오지 못했습니다.');
  }, [isStatic, page, search]);

  useEffect(() => { load(); }, [load]);

  const onSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(query.trim());
  };

  return (
    <section className="notice-admin-section eadm-section" id="admin-luck" data-admin-anchor>
      <h2 className="page-title section-title">🍀 행운 뽑기 관리</h2>
      <p className="eadm-desc">
        오늘의 행운 티어 · 행운 티어 포커 · 랜덤 뽑기를 이용한 회원별 기록과 포인트 증감 내역을 봅니다(조회 전용).
        회원의 <strong>기록 보기</strong>를 누르면 아래에 상세 기록이 열립니다.
      </p>

      {isStatic && <p className="eadm-guard">정적 미리보기에서는 서버 데이터를 불러올 수 없습니다.</p>}

      {!isStatic && (
        <>
          <form className="luckadm-search" onSubmit={onSearch}>
            <input
              className="notice-form-input"
              type="search"
              placeholder="닉네임으로 검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button type="submit" className="eadm-btn">검색</button>
            {search && (
              <button type="button" className="eadm-btn is-ghost" onClick={() => { setQuery(''); setSearch(''); setPage(1); }}>전체 보기</button>
            )}
          </form>

          {error && <p className="eadm-msg is-error">{error}</p>}

          {data && (
            <>
              <div className="eadm-statusbar">
                <span>행운 뽑기 이용 회원 <strong>{data.summary.profiles.toLocaleString('ko-KR')}명</strong></span>
                <span>전체 보유 포인트 합계 <strong>{fmtP(data.summary.totalPoints)}</strong></span>
                {search && <span>검색 결과 {data.total.toLocaleString('ko-KR')}명</span>}
              </div>
              <div className="eadm-table-wrap">
                <table className="admin-table eadm-table">
                  <thead>
                    <tr>
                      <th>닉네임</th><th>보유 포인트</th><th>행운 티어</th><th>최고 티어</th><th>포커</th><th>랜덤 뽑기</th><th>최근 활동</th><th>기록</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.users.length === 0 && <tr><td colSpan={8}>{search ? '검색 결과가 없습니다.' : '행운 뽑기를 이용한 회원이 없습니다.'}</td></tr>}
                    {data.users.map((u) => (
                      <tr key={u.userId} className={selected === u.userId ? 'eadm-row-active' : ''}>
                        <td>
                          {u.nickname}
                          <AccountBadge type={u.accountType} />
                          {u.email && <span className="eadm-sub">{u.email}</span>}
                        </td>
                        <td>{fmtP(u.points)}</td>
                        <td>{u.dailyDraws.toLocaleString('ko-KR')}회</td>
                        <td>{u.bestTier ? `${u.bestTier}티어` : '-'}</td>
                        <td>{u.pokerRounds.toLocaleString('ko-KR')}판</td>
                        <td>{u.ladderBets.toLocaleString('ko-KR')}회</td>
                        <td>{formatWhen(u.lastActiveAt, '-')}</td>
                        <td>
                          <button
                            type="button"
                            className={`eadm-btn${selected === u.userId ? '' : ' is-ghost'}`}
                            onClick={() => setSelected(selected === u.userId ? null : u.userId)}
                          >
                            {selected === u.userId ? '접기' : '기록 보기'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {data.totalPages > 1 && <AdminPagination page={data.page} totalPages={data.totalPages} onChange={setPage} />}
            </>
          )}

          {selected && <LuckUserDetail key={selected} userId={selected} onClose={() => setSelected(null)} />}
        </>
      )}
    </section>
  );
}
