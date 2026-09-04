// ========================================================
// TierPage — 공식 티어표 (1~9 등급을 한 페이지에서 navbar 로 전환)
// ========================================================
// 바닐라는 tier1.html ~ tier9.html 9개 페이지였지만, 여기서는 한 페이지 안에서 등급만
// 바꾼다. URL(/tier/:n)은 공유·새로고침용으로 계속 동기화하되 replace 로 갈아끼워
// 뒤로가기 기록이 등급 전환마다 쌓이지 않게 한다.
//
// 데이터는 전부 src/data/tiers.js(= tiers.json, 바닐라 HTML 정본에서 생성)에서 온다.
// 등급 수·세부등급·캐릭터가 이벤트로 바뀌어도 이 컴포넌트는 손댈 필요가 없다.
import { Fragment, useCallback, useEffect, useMemo } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { TIERS, TIER_BY_NUMBER, TIER_NUMBERS } from '../data/tiers';
import { tierImageUrl } from '../lib/paths';
import '../styles/tier-nav.css';
import '../styles/tier-board.css';

export default function TierPage() {
  const { n } = useParams();
  const navigate = useNavigate();

  // 잘못된 번호(문자, 범위 밖)면 첫 등급으로 떨어뜨린다 — 등급 구성이 바뀌어도 안전
  const current = Number(n);
  const data = TIER_BY_NUMBER[current] || null;

  const index = useMemo(() => TIER_NUMBERS.indexOf(current), [current]);
  const prev = index > 0 ? TIER_NUMBERS[index - 1] : null;
  const next = index >= 0 && index < TIER_NUMBERS.length - 1 ? TIER_NUMBERS[index + 1] : null;

  // 등급 전환 = 라우트 replace. 같은 컴포넌트가 유지되므로 리마운트 없이 표만 바뀐다.
  const goTier = useCallback((tier) => {
    if (tier == null) return;
    navigate(`/tier/${tier}`, { replace: true });
  }, [navigate]);

  useEffect(() => {
    if (data) document.title = `${data.title} | 휴버대 티어표`;
  }, [data]);

  // ← → 키로도 등급 이동
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.('input, textarea')) return;
      if (e.key === 'ArrowLeft') goTier(prev);
      if (e.key === 'ArrowRight') goTier(next);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goTier, prev, next]);

  if (!data) return <Navigate to={`/tier/${TIER_NUMBERS[0]}`} replace />;

  return (
    <main className="tier-scope" data-tier={current}>
      <nav className="tier-switch-nav" aria-label="등급 전환">
        <button
          type="button"
          className="tier-switch-btn tier-switch-arrow"
          onClick={() => goTier(prev)}
          disabled={prev == null}
          aria-label="이전 등급"
        >
          ←
        </button>
        {TIERS.map((t) => (
          <button
            type="button"
            key={t.tier}
            className={`tier-switch-btn${t.tier === current ? ' is-active' : ''}`}
            onClick={() => goTier(t.tier)}
            aria-current={t.tier === current ? 'page' : undefined}
            title={t.desc}
          >
            {t.tier}티어
          </button>
        ))}
        <button
          type="button"
          className="tier-switch-btn tier-switch-arrow"
          onClick={() => goTier(next)}
          disabled={next == null}
          aria-label="다음 등급"
        >
          →
        </button>
      </nav>

      <h2 className="tier-heading" data-tier={current}>{data.title}</h2>
      <p className="tier-board-desc">{data.desc}</p>

      <section className="tier-board" data-tier={current}>
        {data.rows.map((row, ri) => (
          <div className="tier-row" key={`${current}-${row.label}-${ri}`}>
            <div className="tier-label">
              {row.labelLines.map((part, i, arr) => (
                <Fragment key={i}>{part}{i < arr.length - 1 && <br />}</Fragment>
              ))}
            </div>
            <div className="tier-cards">
              {row.items.map((item, ci) => (
                item.break
                  ? <div key={ci} style={{ flexBasis: '100%' }} />
                  : (
                    <div className="char" key={`${item.name || item.alt}-${ci}`}>
                      <img src={tierImageUrl(item.img)} alt={item.alt} loading="lazy" />
                      {item.name && <span>{item.name}</span>}
                    </div>
                  )
              ))}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
