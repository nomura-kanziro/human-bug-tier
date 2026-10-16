// ========================================================
// SeasonalBackdrop — 이벤트 디자인(계절 배경) 장식 층
// ========================================================
// 관리자가 켠 계절 배경(할로윈 / 크리스마스)을 모든 페이지 뒤에 깐다. 본문을 가리지 않도록
// position:fixed + z-index:-1 + pointer-events:none 이고, 색·투명도는 styles/season.css 가 라이트/다크별로 정한다.
//
// 휴먼버그대학교 모티프: 로고의 "붉은 눈"(지켜보는 눈), "H" 문장, 로고 옆 세 자루 창, 그리고 학교 건물.
//   - 고딕 학교 건물(Campus): 가운데 탑의 장미창이 휴버대 눈이고, 창문이 하나씩 다른 박자로 깜빡인다
//   - 눈(HbuEye): 흰자·홍채·동공·하이라이트가 한 묶음으로 같이 움직이고(눈알이 둘러보는 움직임), 가끔 깜빡인다
//   - 세 자루 창: 울타리 사이사이에 창 세 개짜리 기둥으로 서 있다
// 층 순서(뒤 → 앞): 하늘(별·오로라) → 달/초승달·구름 → 먼 언덕 → 건물 → 가까운 언덕·나무 → 울타리 → 앞 소품 → 안개·불씨/눈 → 비네트
// 서버 값 동기화: 처음 열 때 + 30분마다 + 탭으로 돌아왔을 때(lib/season.js).
import { useEffect, useId, useState } from 'react';
import { SEASON_EVENT, getAppliedSeason, syncSeasonFromServer } from '../lib/season';

const RECHECK_MS = 30 * 60 * 1000;
const EYE_PATH = 'M2 30 Q50 -6 98 30 Q50 66 2 30 Z';

/* ---------------- 생성 도우미(고정 씨앗이라 렌더마다 같은 모양) ---------------- */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// 잎 없는 나무 — 가지를 재귀로 뻗어 깊이별 path 로 묶는다(깊을수록 가늘게)
function makeBareTree(seed, x, y, length, spread) {
  const rand = rng(seed);
  const levels = {};
  const grow = (px, py, ang, len, depth) => {
    if (depth > 6 || len < 4) return;
    const nx = px + Math.sin(ang) * len;
    const ny = py - Math.cos(ang) * len;
    if (!levels[depth]) levels[depth] = [];
    levels[depth].push(`M${px.toFixed(1)} ${py.toFixed(1)} L${nx.toFixed(1)} ${ny.toFixed(1)}`);
    const n = depth < 2 ? 2 : (rand() < 0.35 ? 3 : 2);
    for (let i = 0; i < n; i += 1) {
      const a = ang + (rand() - 0.5) * spread + (i - (n - 1) / 2) * spread * 0.55;
      grow(nx, ny, a, len * (0.66 + rand() * 0.16), depth + 1);
    }
  };
  grow(x, y, (rand() - 0.5) * 0.12, length, 0);
  return Object.entries(levels).map(([depth, parts]) => ({
    depth: Number(depth),
    d: parts.join(' '),
    width: Math.max(1.1, 8.5 - Number(depth) * 1.3),
  }));
}

// 소나무 — 삼각형 4단 + 눈 덮인 윗면
function makePine(x, base, h, w) {
  let body = '';
  let snow = '';
  for (let i = 0; i < 4; i += 1) {
    const bY = base - i * h * 0.21;
    const tY = bY - h * 0.44;
    const hw = (w / 2) * (1 - i * 0.2);
    body += `M${(x - hw).toFixed(1)} ${bY.toFixed(1)} L${x.toFixed(1)} ${tY.toFixed(1)} L${(x + hw).toFixed(1)} ${bY.toFixed(1)} Z `;
    const cY = tY + (bY - tY) * 0.46;
    const cw = hw * 0.46;
    snow += `M${x.toFixed(1)} ${tY.toFixed(1)} L${(x - cw).toFixed(1)} ${cY.toFixed(1)} Q${x.toFixed(1)} ${(cY - 4).toFixed(1)} ${(x + cw).toFixed(1)} ${cY.toFixed(1)} Z `;
  }
  return { body, snow, trunk: { x: x - 2.5, y: base - 2, h: h * 0.08 + 4 } };
}

const TREE_LEFT = makeBareTree(7, 92, 296, 64, 0.95);
const TREE_RIGHT = makeBareTree(23, 1112, 296, 58, 0.95);

const FAR_PINES = (() => {
  const rand = rng(91);
  const list = [];
  for (let x = -10; x < 1220; x += 52 + rand() * 30) list.push(makePine(x, 236, 64 + rand() * 46, 34 + rand() * 12));
  return list;
})();
const NEAR_PINES = [
  makePine(42, 292, 214, 98), makePine(150, 296, 150, 70), makePine(1062, 296, 176, 80),
  makePine(1158, 292, 224, 102), makePine(1010, 298, 112, 52),
];

// 태양 광선 — (cx,cy) 중심에서 count 방향으로, 긴 광선과 짧은 광선을 번갈아 뻗는다(밝은 테마의 달 → 태양)
function makeRays(cx, cy, count, base, tipLong, tipShort, halfLong, halfShort) {
  const at = (r, ang) => `${(cx + Math.cos(ang) * r).toFixed(1)} ${(cy + Math.sin(ang) * r).toFixed(1)}`;
  return Array.from({ length: count }, (_, i) => {
    const a = ((i * 360) / count - 90) * (Math.PI / 180);
    const long = i % 2 === 0;
    const w = long ? halfLong : halfShort;
    return `M${at(base, a - w)} L${at(long ? tipLong : tipShort, a)} L${at(base, a + w)} Z`;
  }).join(' ');
}
const SUN_RAYS = makeRays(100, 100, 16, 82, 110, 99, 0.13, 0.1);
const SMALL_SUN_RAYS = makeRays(60, 60, 12, 30, 47, 40, 0.2, 0.16);

// 울타리 — 막대 + 창끝, 일정 간격마다 휴버대 세 자루 창 기둥
const FENCE_X = Array.from({ length: 51 }, (_, i) => 6 + i * 24);
const FENCE_BARS = FENCE_X.map((x) => `M${x} 300 V270`).join(' ');
const FENCE_TIPS = FENCE_X.map((x) => `M${x - 4.5} 270 L${x} 255 L${x + 4.5} 270Z`).join(' ');
const SPEAR_POSTS = [60, 330, 570, 840, 1130];
const spearCluster = (x) => ({
  shafts: `M${x - 14} 300 V248 M${x} 300 V226 M${x + 14} 300 V248`,
  tips: `M${x - 19} 250 L${x - 14} 230 L${x - 9} 250Z M${x - 5} 228 L${x} 204 L${x + 5} 228Z M${x + 9} 250 L${x + 14} 230 L${x + 19} 250Z`,
});

/* ---------------- 공용 부품 ---------------- */

// 휴버대 "붉은 눈" — 흰자(아몬드형) 위에서 홍채·동공·하이라이트가 **한 묶음(.sb-eye-look)** 으로 같이 움직인다.
// 묶음은 흰자 모양으로 잘라(clipPath) 눈 밖으로 삐져나오지 않고, look=true 면 둘러보고 blink=true 면 가끔 깜빡인다.
function HbuEye({ x = 0, y = 0, scale = 1, className, look = false, blink = false }) {
  const clip = `sbEyeClip${useId().replace(/:/g, '')}`;
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} className={className}>
      <g className={blink ? 'sb-eye-blink' : undefined}>
        <defs>
          <clipPath id={clip}><path d={EYE_PATH} /></clipPath>
        </defs>
        <path d={EYE_PATH} className="sb-eye-white" />
        <g clipPath={`url(#${clip})`}>
          <g className={look ? 'sb-eye-look' : undefined}>
            <circle cx="50" cy="30" r="18" className="sb-eye-iris" />
            <circle cx="50" cy="30" r="12.5" className="sb-eye-iris-ring" />
            <circle cx="50" cy="30" r="7.2" className="sb-eye-pupil" />
            <circle cx="43.6" cy="23.4" r="3.3" className="sb-eye-shine" />
          </g>
        </g>
        <path d={EYE_PATH} className="sb-eye-lid" />
      </g>
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

// 고딕 학교 건물 — 가운데 탑의 장미창이 휴버대 눈. 창문은 하나씩 다른 박자로 깜빡인다.
const WINDOWS = [
  [68, 134], [504, 118], [216, 132], [384, 132],
  [24, 212], [112, 212], [150, 212], [452, 212], [560, 212], [582, 212],
  [226, 180], [256, 180], [344, 180], [374, 180],
  [226, 220], [256, 220], [344, 220], [374, 220],
  [284, 150], [316, 150], [300, 200],
];
const WINDOW_PATH = 'M-4 10 V-4 Q-4 -10 0 -14 Q4 -10 4 -4 V10 Z';
const ROOF_LIGHT_X = Array.from({ length: 13 }, (_, i) => 206 + i * 15.5);

function Campus({ christmas }) {
  return (
    <g className="sb-campus">
      <g className="sb-campus-body">
        <path d="M0 260 V176 H46 V122 L68 84 L90 122 V176 H178 V260Z" />
        <path d="M168 260 V166 H200 V122 L216 90 L232 122 V166 H268 V260Z" />
        <path d="M200 260 V152 H400 V260Z" />
        <path d="M268 260 V62 L300 8 L332 62 V260Z" />
        <path d="M332 260 V166 H368 V122 L384 90 L400 122 V166 H430 V260Z" />
        <path d="M422 260 V176 H468 V108 L504 64 L540 108 V176 H600 V260Z" />
      </g>
      <path className="sb-campus-line" d="M68 84 V68 M216 90 V76 M384 90 V76 M504 64 V48 M300 8 V-4 M52 176 H86 M200 152 H400 M426 176 H470" />
      {/* 장미창 = 휴버대 눈 */}
      <circle cx="300" cy="92" r="16.5" className="sb-rose" />
      <HbuEye x={286.2} y={83.8} scale={0.276} look blink />
      {/* 대문 */}
      <path className="sb-window sb-door" d="M-12 8 V-12 Q-12 -22 0 -28 Q12 -22 12 -12 V8 Z" transform="translate(300 252)" style={{ '--d': '1.1s' }} />
      {WINDOWS.map(([x, y], i) => (
        <path
          key={`${x}-${y}`}
          className="sb-window"
          d={WINDOW_PATH}
          transform={`translate(${x} ${y})`}
          style={{ '--d': `${((i * 0.83) % 5).toFixed(2)}s`, '--o': i % 5 === 3 ? 0.35 : 1 }}
        />
      ))}
      {christmas && (
        <g className="sb-campus-snow">
          <path d="M300 8 L283.4 36 Q291.7 32 300 40 Q308.3 32 316.6 36 Z" />
          <path d="M68 84 L56.4 104 Q62 101 68 107 Q74 101 79.6 104 Z" />
          <path d="M216 90 L208 106 Q212 104 216 109 Q220 104 224 106 Z" />
          <path d="M384 90 L376 106 Q380 104 384 109 Q388 104 392 106 Z" />
          <path d="M504 64 L484.4 88 Q494 84 504 92 Q514 84 523.6 88 Z" />
          <rect x="198" y="147" width="204" height="6" rx="3" />
          <rect x="-2" y="171" width="48" height="6" rx="3" />
          <rect x="90" y="171" width="90" height="6" rx="3" />
          <rect x="422" y="171" width="48" height="6" rx="3" />
          <rect x="540" y="171" width="62" height="6" rx="3" />
        </g>
      )}
      {christmas && ROOF_LIGHT_X.map((x, i) => (
        <circle key={x} cx={x} cy={160} r="2.6" className={`sb-roof-light sb-roof-light-${i % 4}`} style={{ '--d': `${(i * 0.31).toFixed(2)}s` }} />
      ))}
    </g>
  );
}

function Fence({ snowy }) {
  return (
    <g className="sb-fence">
      <rect x="0" y="278" width="1200" height="3.2" />
      <rect x="0" y="292" width="1200" height="3.2" />
      <path className="sb-fence-bars" d={FENCE_BARS} />
      <path className="sb-fence-tips" d={FENCE_TIPS} />
      {SPEAR_POSTS.map((x) => {
        const c = spearCluster(x);
        return (
          <g key={x} className="sb-spears">
            <path className="sb-fence-bars" d={c.shafts} />
            <path className="sb-fence-tips" d={c.tips} />
          </g>
        );
      })}
      {snowy && <rect className="sb-fence-snow" x="0" y="275.6" width="1200" height="3.4" rx="1.7" />}
    </g>
  );
}

function Pumpkin({ x, base, s, face }) {
  return (
    <g className="sb-pumpkin" transform={`translate(${x - 62 * s} ${base - 108 * s}) scale(${s})`}>
      <path className="sb-pumpkin-stem" d="M58 10 Q60 -10 74 -14 Q68 -2 68 12 Z" />
      <ellipse cx="62" cy="60" rx="62" ry="48" fill="url(#sbPumpkinGrad)" />
      <path className="sb-pumpkin-rib" d="M62 12 Q40 60 62 108 M62 12 Q84 60 62 108 M32 20 Q8 60 32 100 M92 20 Q116 60 92 100" />
      {face && (
        <g className="sb-pumpkin-face">
          <path d="M18 56 Q36 32 56 54 Q36 74 18 56 Z" />
          <path d="M68 54 Q88 32 106 56 Q88 74 68 54 Z" />
          <path d="M28 84 L40 76 L50 86 L62 76 L74 86 L84 76 L96 84 Q62 112 28 84 Z" />
        </g>
      )}
    </g>
  );
}

/* ---------------- 할로윈 ---------------- */
function Halloween() {
  return (
    <>
      <div className="sb-stars" />

      {/* 달 — 후광·얇은 테두리 고리·분화구·명암, 가운데 눈은 홍채·동공·하이라이트가 함께 움직인다 */}
      <div className="sb-moon-wrap">
        <div className="sb-moon-halo" />
        <svg className="sb-moon" viewBox="-12 -12 224 224">
          <defs>
            <radialGradient id="sbMoonFill" cx="38%" cy="34%" r="72%">
              <stop offset="0%" className="sb-moon-a" />
              <stop offset="100%" className="sb-moon-b" />
            </radialGradient>
            <radialGradient id="sbMoonShade" cx="34%" cy="30%" r="84%">
              <stop offset="52%" stopColor="#000" stopOpacity="0" />
              <stop offset="100%" stopColor="#4a1f00" stopOpacity="0.4" />
            </radialGradient>
            <clipPath id="sbMoonClip"><circle cx="100" cy="100" r="92" /></clipPath>
          </defs>
          <circle cx="100" cy="100" r="104" className="sb-moon-ring" />
          <circle cx="100" cy="100" r="98" className="sb-moon-ring sb-moon-ring-2" />
          <circle cx="100" cy="100" r="92" fill="url(#sbMoonFill)" />
          <g clipPath="url(#sbMoonClip)">
            <ellipse cx="62" cy="52" rx="34" ry="22" className="sb-maria" />
            <ellipse cx="148" cy="142" rx="30" ry="20" className="sb-maria" />
            <circle cx="46" cy="132" r="13" className="sb-crater" />
            <circle cx="150" cy="56" r="9" className="sb-crater" />
            <circle cx="128" cy="168" r="6" className="sb-crater" />
            <circle cx="100" cy="100" r="92" fill="url(#sbMoonShade)" />
          </g>
          <HbuEye x={42} y={65} scale={1.16} className="sb-moon-eye" look blink />
        </svg>
        {/* 밝은 테마에서는 달 대신 태양 — 같은 자리에서 CSS 로만 바꿔 테마 스위치에 바로 따라온다. 태양 가운데에도 휴버대 눈 */}
        <svg className="sb-sun" viewBox="-12 -12 224 224">
          <defs>
            <radialGradient id="sbSunFill" cx="42%" cy="38%" r="70%">
              <stop offset="0%" className="sb-sun-a" />
              <stop offset="100%" className="sb-sun-b" />
            </radialGradient>
          </defs>
          <g className="sb-sun-rays"><path d={SUN_RAYS} /></g>
          <circle cx="100" cy="100" r="82" className="sb-sun-ring" />
          <circle cx="100" cy="100" r="75" fill="url(#sbSunFill)" />
          <HbuEye x={50} y={70} scale={1} className="sb-sun-eye" look blink />
        </svg>
      </div>

      <div className="sb-cloud sb-cloud-1" />
      <div className="sb-cloud sb-cloud-2" />

      {/* 박쥐 떼 */}
      <div className="sb-bats">
        <Bat style={{ '--sb-x': '60%', '--sb-y': '24%', '--sb-size': '58px', '--sb-delay': '0s' }} />
        <Bat style={{ '--sb-x': '72%', '--sb-y': '33%', '--sb-size': '40px', '--sb-delay': '-2.2s' }} />
        <Bat style={{ '--sb-x': '20%', '--sb-y': '38%', '--sb-size': '46px', '--sb-delay': '-4.1s' }} />
        <Bat style={{ '--sb-x': '84%', '--sb-y': '54%', '--sb-size': '34px', '--sb-delay': '-1.3s' }} />
      </div>

      <svg className="sb-ground" viewBox="0 0 1200 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <defs>
          <radialGradient id="sbPumpkinGrad" cx="38%" cy="30%" r="78%">
            <stop offset="0%" className="sb-pk-a" />
            <stop offset="100%" className="sb-pk-b" />
          </radialGradient>
          <radialGradient id="sbHorizon" cx="50%" cy="100%" r="60%">
            <stop offset="0%" className="sb-horizon-a" />
            <stop offset="100%" stopColor="#ff7a1a" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="600" cy="240" rx="640" ry="150" fill="url(#sbHorizon)" />
        <path className="sb-hill-far" d="M0 205 Q180 175 360 200 T720 190 T1080 198 T1200 188 V300 H0Z" />
        <g transform="translate(366 40) scale(0.78)"><Campus /></g>
        <path className="sb-hill-mid" d="M0 246 Q200 218 420 240 T820 232 T1200 238 V300 H0Z" />
        {/* 잎 없는 나무 */}
        <g className="sb-tree-bare">
          {TREE_LEFT.map((l) => <path key={`l${l.depth}`} d={l.d} strokeWidth={l.width} />)}
          {TREE_RIGHT.map((l) => <path key={`r${l.depth}`} d={l.d} strokeWidth={l.width} />)}
        </g>
        {/* H 묘비 */}
        <g transform="translate(962 218)">
          <path className="sb-tomb" d="M0 78 V28 Q0 0 30 0 Q60 0 60 28 V78 Z" />
          <path className="sb-tomb-mark" d="M18 22 V54 M42 22 V54 M18 38 H42" />
        </g>
        <path className="sb-ground-near" d="M0 268 Q300 258 600 266 T1200 262 V300 H0Z" />
        <Fence />
        <Pumpkin x={210} base={296} s={0.62} face />
        <Pumpkin x={288} base={298} s={0.4} face />
        <Pumpkin x={724} base={298} s={0.46} face />
        <Pumpkin x={1040} base={298} s={0.54} face />
      </svg>

      {/* 어둠 속에서 깜빡이는 붉은 눈 */}
      <svg className="sb-dark-eyes" viewBox="0 0 220 120" aria-hidden="true">
        <g className="sb-lurk sb-lurk-1"><HbuEye x={10} y={10} scale={0.42} look blink /><HbuEye x={58} y={10} scale={0.42} look blink /></g>
        <g className="sb-lurk sb-lurk-2"><HbuEye x={120} y={60} scale={0.32} look blink /><HbuEye x={156} y={60} scale={0.32} look blink /></g>
      </svg>

      <div className="sb-fog sb-fog-a" />
      <div className="sb-fog sb-fog-b" />
      <div className="sb-embers sb-embers-far" />
      <div className="sb-embers sb-embers-near" />
      <div className="sb-vignette" />
    </>
  );
}

/* ---------------- 크리스마스 ---------------- */
function Christmas() {
  const bulbs = Array.from({ length: 26 }, (_, i) => i);
  const wire = `M0 10 ${Array.from({ length: 24 }, (_, i) => `Q${i * 100 + 50} ${i % 2 ? 6 : 44} ${(i + 1) * 100} 14`).join(' ')}`;
  return (
    <>
      <div className="sb-stars" />
      <div className="sb-aurora sb-aurora-a" />
      <div className="sb-aurora sb-aurora-b" />

      {/* 초승달 + 후광 */}
      <div className="sb-crescent-wrap">
        <div className="sb-moon-halo" />
        <svg className="sb-crescent" viewBox="0 0 120 120">
          <defs>
            <mask id="sbCrescentMask">
              <rect width="120" height="120" fill="#fff" />
              <circle cx="76" cy="46" r="42" fill="#000" />
            </mask>
          </defs>
          <circle cx="56" cy="64" r="44" className="sb-crescent-body" mask="url(#sbCrescentMask)" />
        </svg>
        <svg className="sb-sun-small" viewBox="0 0 120 120">
          <g className="sb-sun-rays"><path d={SMALL_SUN_RAYS} /></g>
          <circle cx="60" cy="60" r="25" className="sb-sun-small-disc" />
        </svg>
      </div>

      {/* 전구 가랜드 */}
      <svg className="sb-garland" viewBox="0 0 2400 80" aria-hidden="true">
        <path className="sb-garland-wire" d={wire} />
        {bulbs.map((i) => (
          <g key={i} className={`sb-bulb sb-bulb-${i % 4}`} transform={`translate(${46 + i * 92} ${i % 2 ? 20 : 32})`}>
            <rect x="-3" y="-6" width="6" height="6" rx="1" className="sb-bulb-cap" />
            <ellipse cx="0" cy="8" rx="6" ry="9" />
          </g>
        ))}
      </svg>

      <svg className="sb-ground" viewBox="0 0 1200 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <defs>
          <radialGradient id="sbLampGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" className="sb-lamp-a" />
            <stop offset="100%" stopColor="#ffd27a" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g className="sb-pines-far">
          {FAR_PINES.map((p, i) => <path key={i} d={p.body} />)}
        </g>
        <g transform="translate(366 40) scale(0.78)"><Campus christmas /></g>
        <path className="sb-hill" d="M0 246 Q220 218 480 240 T900 232 T1200 236 V300 H0Z" />
        <g className="sb-pines-near">
          {NEAR_PINES.map((p, i) => (
            <g key={i}>
              <rect x={p.trunk.x} y={p.trunk.y} width="5" height={p.trunk.h} className="sb-pine-trunk" />
              <path d={p.body} />
              <path d={p.snow} className="sb-pine-snow" />
            </g>
          ))}
        </g>
        <Fence snowy />
        {/* 가로등 */}
        <g transform="translate(262 0)">
          <circle cx="0" cy="226" r="46" fill="url(#sbLampGlow)" className="sb-lamp-halo" />
          <rect x="-2" y="228" width="4" height="70" className="sb-lamp-pole" />
          <path d="M-8 230 L-6 218 H6 L8 230 Z" className="sb-lamp-head" />
          <rect x="-5" y="220" width="10" height="10" rx="2" className="sb-lamp-light" />
        </g>
        {/* 눈알 오너먼트 트리 + 선물 */}
        <g transform="translate(956 80)">
          <rect x="52" y="168" width="18" height="30" className="sb-trunk" />
          <path className="sb-tree-leaf" d="M61 14 L104 84 L84 84 L118 136 L94 136 L130 180 L-8 180 L28 136 L4 136 L38 84 L18 84 Z" />
          <path className="sb-tree-tinsel" d="M34 96 Q66 112 96 92 M20 146 Q64 162 110 142" />
          <circle cx="40" cy="120" r="6" className="sb-orn sb-orn-a" />
          <circle cx="88" cy="112" r="6" className="sb-orn sb-orn-b" />
          <circle cx="30" cy="164" r="6" className="sb-orn sb-orn-c" />
          <g transform="translate(70 154)">
            <circle r="13" className="sb-orn-eye-ball" />
            <HbuEye x={-9} y={-5.4} scale={0.18} look />
          </g>
          <path className="sb-tree-star" d="M61 -8 L66 6 L81 6 L69 15 L73 30 L61 21 L49 30 L53 15 L41 6 L56 6 Z" />
        </g>
        <g className="sb-gifts" transform="translate(850 232)">
          <rect x="0" y="12" width="46" height="36" className="sb-gift-a" />
          <path d="M23 12 V48 M0 28 H46" className="sb-ribbon" />
          <rect x="54" y="22" width="34" height="26" className="sb-gift-b" />
          <path d="M71 22 V48 M54 34 H88" className="sb-ribbon" />
        </g>
        <path className="sb-hill sb-hill-front" d="M0 270 Q300 256 600 266 T1200 262 V300 H0Z" />
      </svg>

      <div className="sb-snow sb-snow-far" />
      <div className="sb-snow sb-snow-mid" />
      <div className="sb-snow sb-snow-near" />
      <div className="sb-vignette" />
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
