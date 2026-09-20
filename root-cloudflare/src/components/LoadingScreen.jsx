// 사이트 초기 로딩 오버레이 "치우기" (loading-screen.js 이식).
//
// 오버레이 자체는 index.html 에 정적으로 들어 있다. 예전에는 이 컴포넌트가 오버레이를 직접 그렸는데,
// 그러면 JS 번들(약 350KB)이 내려받아져 실행된 뒤에야 오버레이가 생기고 마운트 직후(0ms) 사라져서
// 정작 기다리는 동안에는 빈 화면만 보였다. 지금은 첫 화면부터 정적 오버레이가 떠 있고,
// 이 컴포넌트는 "앱이 실제로 그려진 직후"에 그것을 치우기만 한다.
//
// 지연을 일부러 만들지 않는다: 최소 표시 시간이 없고, 앱이 그려지는 즉시 치운다.
// 로딩이 정말 오래 걸리는 경우에만 그만큼 오래 보이고, 6초 넘게 걸리면 안내 문구가 나타난다(CSS).
// 캐릭터 이미지 수십 장이 다 받아지는 것은 기다리지 않는다(바닐라와 같은 기준 — 페이지를 쓸 수 있는 시점).
import { useEffect } from 'react';

const FADE_MS = 150; // loading-screen.css 의 페이드 시간과 같아야 한다

function removeOverlay(el) {
  if (el && el.parentNode) el.remove();
}

function hideOverlay(el) {
  if (!el) return;
  // 아직 화면에 나타나기 전(앱이 아주 빨리 뜬 경우 — 오버레이는 잠깐 투명하게 시작한다)이면
  // 페이드 없이 바로 제거해 깜빡임 자체를 만들지 않는다.
  if (parseFloat(getComputedStyle(el).opacity) < 0.05) {
    removeOverlay(el);
    return;
  }
  el.classList.add('is-hidden');
  const onEnd = () => {
    el.removeEventListener('transitionend', onEnd);
    removeOverlay(el);
  };
  el.addEventListener('transitionend', onEnd);
  // transitionend 가 안 걸리는 환경(트랜지션 비활성화 등) 대비 안전장치
  setTimeout(() => removeOverlay(el), FADE_MS * 2);
}

export default function LoadingScreen() {
  useEffect(() => {
    // 이 effect 는 첫 렌더가 DOM 에 커밋된 뒤 실행되므로 바로 치워도 앱은 이미 있다.
    // (예전에는 requestAnimationFrame 을 두 번 기다렸는데, 앱이 아주 빨리 뜨는 환경에서도 그 프레임을
    //  기다리는 사이 오버레이의 나타나는 애니메이션이 시작돼 160ms 가량 깜빡였다.)
    hideOverlay(document.getElementById('site-loading-screen'));
  }, []);

  return null;
}
