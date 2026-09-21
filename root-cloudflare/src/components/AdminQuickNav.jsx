// ========================================================
// AdminQuickNav — 관리자 대시보드 전용 "빠른 이동" 태그 바
// ========================================================
// 관리자 페이지는 문의·커스텀 메이커 신고·공지·이벤트·차단이 한 화면에 길게 이어져 있어서
// 원하는 기능까지 스크롤을 한참 내려야 한다. 이 바는 각 기능을 태그 버튼으로 보여주고,
// 누르면 그 기능 섹션으로 부드럽게 스크롤해 내려간다.
//
//  - 헤더 바로 아래에 붙어(sticky) 스크롤해도 계속 보인다.
//  - 스크롤 위치에 따라 지금 보고 있는 섹션의 태그가 강조된다(스크롤 스파이).
//  - 이동한 자리는 헤더 + 이 바에 가려지지 않게 그 높이만큼 띄워서 멈춘다.
//  - 주소 해시(/admin#admin-notices)를 함께 갱신해 새로고침·링크 공유 시에도 같은 자리로 온다.
//  - "모션 줄이기" 설정을 켠 사용자는 애니메이션 없이 바로 이동한다.
import { useCallback, useEffect, useRef, useState } from 'react';
import '../styles/admin-quicknav.css';

const HEADER_FALLBACK = 64;
const GAP = 16; // 이동한 섹션 위쪽에 남길 여백

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// 고정된 헤더 + 이 바가 차지하는 높이(= 이동 후 섹션이 멈출 위치)
function stickyOffset() {
  const header = document.querySelector('header');
  const nav = document.querySelector('.admin-quicknav');
  return (header ? header.offsetHeight : HEADER_FALLBACK) + (nav ? nav.offsetHeight : 0) + GAP;
}

// 해당 id 의 섹션으로 스크롤한다. 성공하면 true.
export function scrollToAnchor(id, { smooth = true, updateHash = true } = {}) {
  const el = id ? document.getElementById(id) : null;
  if (!el) return false;
  // stickyOffset() 에는 GAP 이 이미 들어 있어, 섹션은 헤더+바 아래 GAP 만큼 띄운 자리에 멈춘다.
  const top = el.getBoundingClientRect().top + window.scrollY - stickyOffset();
  window.scrollTo({ top: Math.max(0, top), behavior: smooth && !prefersReducedMotion() ? 'smooth' : 'auto' });
  if (updateHash) {
    // 히스토리 항목을 쌓지 않고 주소만 바꾼다(태그를 여러 번 눌러도 뒤로가기가 길어지지 않게)
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}#${id}`);
  }
  // 키보드/스크린리더 사용자를 위해 도착한 섹션으로 포커스를 옮긴다(스크롤은 위에서 이미 했다)
  el.setAttribute('tabindex', '-1');
  el.focus({ preventScroll: true });
  return true;
}

export default function AdminQuickNav({ items }) {
  const navRef = useRef(null);
  const listRef = useRef(null);
  // 태그를 눌러 이동하는 동안은 스크롤 스파이를 잠근다 — 안 그러면 가는 길에 지나치는 섹션들의 태그가 차례로 깜빡인다.
  const lockRef = useRef(0);
  const [active, setActive] = useState(items[0]?.id || null);

  // 스크롤 위치로 "지금 보는 섹션"을 찾는다: 기준선(헤더+바 아래)을 지난 마지막 섹션.
  // 맨 아래까지 내려갔는데 마지막 섹션이 짧아 기준선에 못 닿는 경우를 위해 바닥이면 마지막 태그를 켠다.
  const updateActive = useCallback(() => {
    // 기준선은 이동 후 섹션이 멈추는 자리(헤더+바+GAP)보다 살짝 아래로 잡는다 — 태그를 눌러 도착한 섹션이 확실히 "지나간" 것으로 잡히게.
    const line = stickyOffset() + 6;
    let current = items[0]?.id || null;
    items.forEach((it) => {
      const el = document.getElementById(it.id);
      if (el && el.getBoundingClientRect().top <= line) current = it.id;
    });
    const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
    if (atBottom && items.length) current = items[items.length - 1].id;
    setActive(current);
  }, [items]);

  useEffect(() => {
    let raf = 0;
    let unlockTimer = 0;
    const onScroll = () => {
      if (lockRef.current > Date.now()) {
        // 프로그램이 굴리는 중 — 스크롤이 멈춘 뒤(마지막 스크롤 이벤트 후 180ms)에 한 번만 맞춘다.
        lockRef.current = Date.now() + 200;
        window.clearTimeout(unlockTimer);
        unlockTimer = window.setTimeout(() => { lockRef.current = 0; updateActive(); }, 180);
        return;
      }
      if (raf) return;
      raf = window.requestAnimationFrame(() => { raf = 0; updateActive(); });
    };
    updateActive();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) window.cancelAnimationFrame(raf);
      window.clearTimeout(unlockTimer);
    };
  }, [updateActive]);

  // 좁은 화면에서 태그 줄이 가로 스크롤될 때, 켜진 태그가 항상 보이도록 줄 안에서만 굴린다.
  useEffect(() => {
    const list = listRef.current;
    const chip = list?.querySelector('.aqn-chip.is-active');
    if (!list || !chip || list.scrollWidth <= list.clientWidth) return;
    list.scrollTo({ left: chip.offsetLeft - (list.clientWidth - chip.offsetWidth) / 2, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }, [active]);

  const go = (e, id) => {
    e.preventDefault();
    setActive(id);
    lockRef.current = Date.now() + 400; // 스크롤이 시작될 때까지의 여유(이후는 onScroll 이 연장)
    scrollToAnchor(id);
  };

  const toTop = (e) => {
    e.preventDefault();
    setActive(items[0]?.id || null);
    lockRef.current = Date.now() + 400; // 올라가는 동안 태그가 차례로 깜빡이지 않게 잠근다
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}`);
  };

  return (
    <nav className="admin-quicknav" ref={navRef} aria-label="관리자 빠른 이동">
      <span className="aqn-label" aria-hidden="true">빠른 이동</span>
      <ul className="aqn-list" ref={listRef}>
        {items.map((it) => (
          <li key={it.id}>
            <a
              href={`#${it.id}`}
              className={`aqn-chip${active === it.id ? ' is-active' : ''}`}
              aria-current={active === it.id ? 'true' : undefined}
              title={it.hint}
              onClick={(e) => go(e, it.id)}
            >
              <span className="aqn-icon" aria-hidden="true">{it.icon}</span>
              {it.label}
              {it.count > 0 && <span className={`aqn-count${it.alert ? ' is-alert' : ''}`}>{it.count}</span>}
            </a>
          </li>
        ))}
      </ul>
      <a href="#top" className="aqn-top" onClick={toTop} title="맨 위로">↑ 맨 위</a>
    </nav>
  );
}
