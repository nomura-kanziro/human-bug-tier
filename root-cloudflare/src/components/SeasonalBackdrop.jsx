// ========================================================
// SeasonalBackdrop — 이벤트 디자인(계절 배경) 장식 층
// ========================================================
// 관리자가 켠 계절 배경(할로윈 / 크리스마스)을 모든 페이지 뒤에 깐다. 본문을 가리지 않도록
// position:fixed + z-index:-1 + pointer-events:none 이고, 색·투명도는 styles/season.css 가 라이트/다크별로 정한다.
// 휴먼버그대학교 다운 모티프: 로고의 "붉은 눈"(지켜보는 눈), "H" 문장, 로고 옆 세 자루 창.
//   할로윈 — 눈이 박힌 보름달, 박쥐, 눈 모양으로 파낸 호박, H 묘비와 창, 어둠 속에서 깜빡이는 붉은 눈들, 거미줄
//   크리스마스 — 내리는 눈, 전구 가랜드, 눈 덮인 언덕, 트리(꼭대기 별·눈알 오너먼트), 선물 상자, 반짝이는 별
// 서버 값 동기화: 처음 열 때 + 30분마다 + 탭으로 돌아왔을 때(lib/season.js).
import { useEffect, useState } from 'react';
import { SEASON_EVENT, getAppliedSeason, syncSeasonFromServer } from '../lib/season';

const RECHECK_MS = 30 * 60 * 1000;

// 로고의 "붉은 눈" — 아몬드형 흰자 + 붉은 홍채 + 검은 동공. 크기는 viewBox 100×60 기준
function HbuEye({ className, x = 0, y = 0, scale = 1 }) {
  return (
    <g className={className} transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d="M2 30 Q50 -6 98 30 Q50 66 2 30 Z" className="sb-eye-white" />
      <circle cx="50" cy="30" r="17" className="sb-eye-iris" />
      <circle cx="50" cy="30" r="7" className="sb-eye-pupil" />
      <circle cx="44" cy="24" r="3.5" className="sb-eye-shine" />
    </g>
  );
}

function Bat({ style }) {
  return (
    <svg className="sb-bat" style={style} viewBox="0 0 64 28" aria-hidden="true">
      <g className="sb-bat-body">
        <path d="M32 9c2-4 3-6 3-6l1 4c2-1 3-1 3-1-1 2-2 3-3 4 6-2 14-1 22-6-2 7-8 10-12 10 2 2 3 4 2 7-3-3-6-3-9-2-2 2-4 4-7 4s-5-2-7-4c-3-1-6-1-9 2-1-3 0-5 2-7-4 0-10-3-12-10 8 5 16 4 22 6-1-1-2-2-3-4 0 0 1 0 3 1l1-4s1 2 3 6z" />
      </g>
    </svg>
  );
}

function Halloween() {
  return (
    <>
      {/* 보름달 — 가운데에 휴버대 눈이 떠 있다 */}
      <svg className="sb-moon" viewBox="0 0 200 200" aria-hidden="true">
        <defs>
          <radialGradient id="sbMoonFill" cx="40%" cy="38%" r="65%">
            <stop offset="0%" className="sb-moon-light" />
            <stop offset="100%" className="sb-moon-dark" />
          </radialGradient>
        </defs>
        <circle cx="100" cy="100" r="92" fill="url(#sbMoonFill)" />
        <circle cx="62" cy="66" r="12" className="sb-crater" />
        <circle cx="140" cy="132" r="16" className="sb-crater" />
        <circle cx="128" cy="58" r="7" className="sb-crater" />
        <HbuEye className="sb-moon-eye" x={50} y={80} scale={1} />
      </svg>

      {/* 거미줄 — 왼쪽 위 모서리 */}
      <svg className="sb-web" viewBox="0 0 160 160" aria-hidden="true">
        <g className="sb-web-lines">
          <path d="M0 0 L160 40 M0 0 L130 90 M0 0 L90 130 M0 0 L40 160" />
          <path d="M28 7 Q24 22 7 28 M56 14 Q48 44 14 56 M84 21 Q72 66 21 84 M112 28 Q96 88 28 112 M140 35 Q120 110 35 140" />
        </g>
        <line x1="70" y1="0" x2="70" y2="96" className="sb-web-thread" />
        <g className="sb-spider" transform="translate(70 100)">
          <circle r="7" />
          <path d="M-6 -2 L-15 -8 M-6 2 L-16 2 M-6 5 L-14 11 M6 -2 L15 -8 M6 2 L16 2 M6 5 L14 11" />
        </g>
      </svg>

      {/* 박쥐 떼 */}
      <div className="sb-bats" aria-hidden="true">
        <Bat style={{ '--sb-x': '62%', '--sb-y': '23%', '--sb-size': '58px', '--sb-delay': '0s' }} />
        <Bat style={{ '--sb-x': '74%', '--sb-y': '30%', '--sb-size': '40px', '--sb-delay': '-2.2s' }} />
        <Bat style={{ '--sb-x': '18%', '--sb-y': '36%', '--sb-size': '46px', '--sb-delay': '-4.1s' }} />
        <Bat style={{ '--sb-x': '86%', '--sb-y': '52%', '--sb-size': '34px', '--sb-delay': '-1.3s' }} />
      </div>

      {/* 어둠 속에서 깜빡이는 붉은 눈 — 오른쪽 아래 */}
      <svg className="sb-dark-eyes" viewBox="0 0 220 120" aria-hidden="true">
        <g className="sb-blink sb-blink-1"><HbuEye x={10} y={10} scale={0.42} /><HbuEye x={58} y={10} scale={0.42} /></g>
        <g className="sb-blink sb-blink-2"><HbuEye x={120} y={60} scale={0.32} /><HbuEye x={156} y={60} scale={0.32} /></g>
      </svg>

      {/* 땅 — H 묘비, 세 자루 창, 눈을 파낸 호박 */}
      <svg className="sb-ground" viewBox="0 0 1200 220" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <path className="sb-hill" d="M0 160 Q200 120 420 150 T840 140 T1200 150 L1200 220 L0 220 Z" />
        {/* 세 자루 창 (로고) */}
        <g className="sb-spears" transform="translate(960 30)">
          <path d="M0 140 L0 20 M-8 34 L0 0 L8 34 Z" />
          <path d="M26 150 L26 10 M18 24 L26 -10 L34 24 Z" />
          <path d="M52 140 L52 26 M44 40 L52 6 L60 40 Z" />
        </g>
        {/* H 묘비 */}
        <g transform="translate(1060 70)">
          <path className="sb-tomb" d="M0 90 L0 30 Q0 0 34 0 Q68 0 68 30 L68 90 Z" />
          <path className="sb-tomb-mark" d="M20 24 L20 68 M48 24 L48 68 M20 46 L48 46" />
        </g>
        {/* 호박 두 개 — 눈은 휴버대 눈 모양으로 파냈다 */}
        <g className="sb-pumpkin" transform="translate(70 96)">
          <path className="sb-pumpkin-stem" d="M58 8 Q62 -10 74 -12 Q66 0 66 10 Z" />
          <ellipse cx="62" cy="58" rx="62" ry="50" className="sb-pumpkin-body" />
          <path className="sb-pumpkin-rib" d="M62 10 Q40 58 62 106 M62 10 Q84 58 62 106 M30 18 Q6 58 30 100 M94 18 Q118 58 94 100" />
          <g className="sb-pumpkin-face">
            <path d="M22 50 Q38 32 54 50 Q38 66 22 50 Z" />
            <path d="M70 50 Q86 32 102 50 Q86 66 70 50 Z" />
            <path d="M30 80 L42 74 L52 82 L62 74 L72 82 L82 74 L94 80 Q62 104 30 80 Z" />
          </g>
        </g>
        <g className="sb-pumpkin sb-pumpkin-small" transform="translate(210 130) scale(0.62)">
          <path className="sb-pumpkin-stem" d="M58 8 Q62 -10 74 -12 Q66 0 66 10 Z" />
          <ellipse cx="62" cy="58" rx="62" ry="50" className="sb-pumpkin-body" />
          <path className="sb-pumpkin-rib" d="M62 10 Q40 58 62 106 M62 10 Q84 58 62 106" />
          <g className="sb-pumpkin-face">
            <path d="M26 48 L44 40 L46 58 Z" />
            <path d="M98 48 L80 40 L78 58 Z" />
            <path d="M34 78 Q62 98 90 78 Q62 88 34 78 Z" />
          </g>
        </g>
      </svg>
      <div className="sb-fog" aria-hidden="true" />
    </>
  );
}

function Christmas() {
  // 가랜드 — 가로로 긴 그림(2400×80)을 비율 그대로 화면 폭에 맞춰, 전구가 찌그러지지 않고 헤더 바로 아래에 작게 걸리게 한다.
  // 전구 색 순서(빨강·초록·금·파랑)
  const bulbs = Array.from({ length: 26 }, (_, i) => i);
  const wire = `M0 10 ${Array.from({ length: 24 }, (_, i) => `Q${i * 100 + 50} ${i % 2 ? 6 : 44} ${(i + 1) * 100} 14`).join(' ')}`;
  return (
    <>
      <div className="sb-stars" aria-hidden="true" />

      {/* 전구 가랜드 — 헤더 바로 아래 */}
      <svg className="sb-garland" viewBox="0 0 2400 80" aria-hidden="true">
        <path className="sb-garland-wire" d={wire} />
        {bulbs.map((i) => (
          <g key={i} className={`sb-bulb sb-bulb-${i % 4}`} transform={`translate(${46 + i * 92} ${i % 2 ? 20 : 32})`}>
            <rect x="-3" y="-6" width="6" height="6" rx="1" className="sb-bulb-cap" />
            <ellipse cx="0" cy="8" rx="6" ry="9" />
          </g>
        ))}
      </svg>

      {/* 눈 */}
      <div className="sb-snow sb-snow-far" aria-hidden="true" />
      <div className="sb-snow sb-snow-near" aria-hidden="true" />

      {/* 눈 덮인 언덕 + 트리 + 선물 */}
      <svg className="sb-ground" viewBox="0 0 1200 240" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <path className="sb-hill sb-hill-back" d="M0 170 Q260 120 520 160 T1200 140 L1200 240 L0 240 Z" />
        <g className="sb-tree" transform="translate(1010 18)">
          <rect x="52" y="168" width="18" height="30" className="sb-trunk" />
          <path className="sb-tree-leaf" d="M61 14 L104 84 L84 84 L118 136 L94 136 L130 180 L-8 180 L28 136 L4 136 L38 84 L18 84 Z" />
          <path className="sb-tree-tinsel" d="M34 96 Q66 112 96 92 M20 146 Q64 162 110 142" />
          <circle cx="40" cy="120" r="6" className="sb-orn sb-orn-a" />
          <circle cx="88" cy="112" r="6" className="sb-orn sb-orn-b" />
          <circle cx="30" cy="164" r="6" className="sb-orn sb-orn-c" />
          {/* 눈알 오너먼트 — 휴버대 붉은 눈 */}
          <g transform="translate(70 154)">
            <circle r="13" className="sb-orn-eye-ball" />
            <path d="M-9 0 Q0 -8 9 0 Q0 8 -9 0 Z" className="sb-eye-white" />
            <circle r="4" className="sb-eye-iris" />
            <circle r="1.7" className="sb-eye-pupil" />
          </g>
          <path className="sb-tree-star" d="M61 -8 L66 6 L81 6 L69 15 L73 30 L61 21 L49 30 L53 15 L41 6 L56 6 Z" />
        </g>
        <g className="sb-gifts" transform="translate(920 168)">
          <rect x="0" y="12" width="46" height="36" className="sb-gift-a" />
          <path d="M23 12 L23 48 M0 28 L46 28" className="sb-ribbon" />
          <rect x="54" y="22" width="34" height="26" className="sb-gift-b" />
          <path d="M71 22 L71 48 M54 34 L88 34" className="sb-ribbon" />
        </g>
        <path className="sb-hill" d="M0 200 Q300 160 600 196 T1200 186 L1200 240 L0 240 Z" />
        {/* 눈 덮인 H 문장 */}
        <g transform="translate(90 150)">
          <path className="sb-crest" d="M0 0 L60 0 L60 40 Q60 70 30 82 Q0 70 0 40 Z" />
          <path className="sb-crest-mark" d="M18 16 L18 56 M42 16 L42 56 M18 36 L42 36" />
          <path className="sb-crest-snow" d="M-4 2 Q10 -8 30 -4 Q50 -9 64 2 Q50 6 30 4 Q12 7 -4 2 Z" />
        </g>
      </svg>
    </>
  );
}

export default function SeasonalBackdrop() {
  const [season, setSeason] = useState(getAppliedSeason);

  useEffect(() => {
    const onChange = (e) => setSeason(e.detail);
    window.addEventListener(SEASON_EVENT, onChange);
    syncSeasonFromServer();
    const timer = window.setInterval(syncSeasonFromServer, RECHECK_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') syncSeasonFromServer(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener(SEASON_EVENT, onChange);
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  if (season === 'none') return null;
  return (
    <div className={`seasonal-backdrop is-${season}`} aria-hidden="true">
      {season === 'halloween' ? <Halloween /> : <Christmas />}
    </div>
  );
}
