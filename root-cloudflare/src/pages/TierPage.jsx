// 공식 1~9 티어표 페이지 (tier-class/tierN.html + tier-nav.js 이식)
//  - 데이터: src/data/tiers.json (scripts/extract-tiers.mjs 가 root-render 바닐라 HTML에서 추출)
//  - 스타일: tierN.css 는 body/main 규칙까지 포함한 페이지 전용 CSS라서 전역 import 하면 서로 덮어쓴다.
//    그래서 ?inline 으로 문자열로 받아 <style> 로 주입하고 언마운트 시 제거한다(바닐라와 같은 적용 범위).
//  - .char 마크업(img + span)은 커스텀 메이커가 캐릭터 풀을 파싱하는 구조이므로 그대로 유지한다.
import { Fragment, useEffect } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import tiers from '../data/tiers.json';
import { tierImageUrl } from '../lib/paths';
import '../styles/tier-responsive.css';
import '../styles/tier-nav.css';

const tierCss = import.meta.glob('../styles/tier/tier*.css', { query: '?inline', import: 'default', eager: true });

function useTierStyle(n) {
  useEffect(() => {
    const css = tierCss[`../styles/tier/tier${n}.css`];
    if (!css) return undefined;
    const style = document.createElement('style');
    style.dataset.tierStyle = String(n);
    style.textContent = css;
    document.head.appendChild(style);
    return () => style.remove();
  }, [n]);
}

function NavBtn({ kind, label, to, enabled }) {
  if (enabled) return <Link className={`tier-page-nav-btn ${kind}`} to={to}>{label}</Link>;
  return <span className={`tier-page-nav-btn ${kind} is-disabled`} aria-disabled="true">{label}</span>;
}

export default function TierPage() {
  const { n } = useParams();
  const num = Number(n);
  const data = tiers[num];
  useTierStyle(num);

  useEffect(() => {
    if (data) document.title = `${data.title} | 휴버대 티어표`;
  }, [data]);

  if (!data || num < 1 || num > 9) return <Navigate to="/" replace />;

  return (
    <main>
      <nav className="tier-page-nav" aria-label="이전·다음 티어표">
        <NavBtn kind="prev" label="← 이전 티어표" to={`/tier/${num - 1}`} enabled={num > 1} />
        <span className="tier-page-nav-current">{num}티어</span>
        <NavBtn kind="next" label="다음 티어표 →" to={`/tier/${num + 1}`} enabled={num < 9} />
      </nav>
      <h2 className="tier-heading" data-tier={num}>{data.title}</h2>
      <section className="tier-table">
        {data.rows.map((row, ri) => (
          <div className="tier-row" key={ri}>
            <div className="tier-label">
              {row.label.split('\n').map((part, i, arr) => (
                <Fragment key={i}>{part}{i < arr.length - 1 && <br />}</Fragment>
              ))}
            </div>
            <div className="tier-cards">
              {row.items.map((item, ci) => (
                item.break
                  ? <div key={ci} style={{ flexBasis: '100%' }} />
                  : (
                    <div className="char" key={ci}>
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
