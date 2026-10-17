// ========================================================
// tierStyle.js — 커스텀 티어표 "꾸미기" (테두리 색 · 배경 이펙트)
// ========================================================
// 바닐라 custom-maker.js 의 꾸미기 로직을 그대로 이식한다. 저장 형식도 동일:
//   localStorage customMakerTierStyle = { byGrade: { "0": { borderColor, effect, effectColor }, ... } }
//   effectColor 는 배경 이펙트의 색. 빈 문자열이면 이펙트마다 정해진 기본색을 쓴다(옛 글도 빈 값으로 읽힌다).
//   게시글        tierData.style       = 같은 형태
// 색·이펙트 이름은 화이트리스트만 통과시켜서, 옛 글이나 조작된 값이 와도 기본 골드로 떨어진다.

export const STYLE_STORAGE_KEY = 'customMakerTierStyle';
export const DEFAULT_TIER_STYLE = { borderColor: '#ffcc00', effect: 'none', effectColor: '' };

export const TIER_STYLE_EFFECTS = {
  none: { label: '없음', bg: '#111111' },
  glow: { label: '글로우', bg: '#111111' },
  aurora: { label: '오로라', bg: '#0b1220' },
  stars: { label: '별빛', bg: '#07070f' },
  ember: { label: '불씨', bg: '#140806' },
  frost: { label: '서리', bg: '#071018' },
  neon: { label: '네온', bg: '#050805' },
  crimson: { label: '핏빛', bg: '#14060a' },
  void: { label: '심연', bg: '#07040e' },
  royal: { label: '로얄', bg: '#120e1c' },
  halloween: { label: '할로윈', bg: '#130a1c' },
};

export const TIER_STYLE_PRESETS = {
  default: { label: '기본 골드', borderColor: '#ffcc00', effect: 'none' },
  divine: { label: '신계', borderColor: '#ffe566', effect: 'glow' },
  royal: { label: '로얄', borderColor: '#d4af37', effect: 'royal' },
  aurora: { label: '오로라', borderColor: '#7cf0ff', effect: 'aurora' },
  frost: { label: '서리', borderColor: '#9ad8ff', effect: 'frost' },
  ember: { label: '불꽃', borderColor: '#ff7a3d', effect: 'ember' },
  neon: { label: '네온', borderColor: '#39ff14', effect: 'neon' },
  crimson: { label: '핏빛', borderColor: '#ff3b5c', effect: 'crimson' },
  void: { label: '심연', borderColor: '#a78bfa', effect: 'void' },
  stars: { label: '별빛', borderColor: '#c4b5fd', effect: 'stars' },
  halloween: { label: '할로윈', borderColor: '#ff7a1a', effect: 'halloween' },
};

export const TIER_BORDER_SWATCHES = [
  '#ffcc00', '#ffe566', '#ffffff', '#ff3b5c', '#ff7a3d',
  '#39ff14', '#7cf0ff', '#9ad8ff', '#a78bfa', '#ff4dcd',
];

// 배경 이펙트 색 스와치 (맨 앞 "기본색" 버튼은 패널에서 따로 둔다)
export const TIER_EFFECT_SWATCHES = [
  '#ff7a1a', '#ff3b5c', '#ffcc00', '#39ff14', '#7cf0ff',
  '#4d8dff', '#a78bfa', '#ff4dcd', '#ffffff', '#8b5cf6',
];

// "등급마다 다른 테마" 버튼이 1~9등급에 순서대로 입히는 프리셋 (신계 → 심연)
export const TIER_AUTO_PRESET_ORDER = [
  'divine', 'royal', 'neon', 'aurora', 'frost', 'ember', 'stars', 'crimson', 'void',
];

export function sanitizeHexColor(color) {
  const raw = String(color || '').trim();
  const short = raw.match(/^#([0-9a-fA-F]{3})$/);
  if (short) return `#${short[1].split('').map((c) => c + c).join('').toLowerCase()}`;
  const full = raw.match(/^#([0-9a-fA-F]{6})$/);
  return full ? `#${full[1].toLowerCase()}` : DEFAULT_TIER_STYLE.borderColor;
}

// 이펙트 색은 고르지 않은 상태('')가 정상값이라 잘못된 값은 금색이 아니라 빈 값으로 떨어뜨린다.
export function sanitizeEffectColor(color) {
  const raw = String(color || '').trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(raw) ? sanitizeHexColor(raw) : '';
}

export function sanitizeEffectName(effect) {
  const key = String(effect || '').trim();
  return Object.prototype.hasOwnProperty.call(TIER_STYLE_EFFECTS, key) ? key : DEFAULT_TIER_STYLE.effect;
}

export function hexToRgba(hex, alpha) {
  const h = sanitizeHexColor(hex).slice(1);
  return `rgba(${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}, ${alpha})`;
}

// 색상(hue)만 돌린 짝색 — 오로라처럼 두세 색을 겹치는 이펙트가 고른 색 하나로도 어울리게 한다.
function hueShiftedRgb(hex, degrees) {
  const h = sanitizeHexColor(hex).slice(1);
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let hue = 0;
  let sat = 0;
  if (d > 0) {
    sat = d / (1 - Math.abs(2 * l - 1));
    if (max === r) hue = ((g - b) / d) % 6;
    else if (max === g) hue = (b - r) / d + 2;
    else hue = (r - g) / d + 4;
    hue *= 60;
  }
  hue = (hue + degrees + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  const [r1, g1, b1] = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][Math.floor(hue / 60) % 6];
  return [r1, g1, b1].map((v) => Math.round((v + m) * 255)).join(', ');
}

export function normalizeStyleMap(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  const source = raw.byGrade && typeof raw.byGrade === 'object' ? raw.byGrade : raw;
  Object.keys(source).forEach((key) => {
    const n = Number(key);
    if (!Number.isInteger(n) || n < 0 || n > 8) return;
    const item = source[key];
    if (!item || typeof item !== 'object') return;
    out[n] = {
      borderColor: sanitizeHexColor(item.borderColor),
      effect: sanitizeEffectName(item.effect),
      effectColor: sanitizeEffectColor(item.effectColor),
    };
  });
  return out;
}

export function getStyleForGrade(styleMap, index) {
  const saved = styleMap?.[index];
  return {
    borderColor: sanitizeHexColor(saved?.borderColor || DEFAULT_TIER_STYLE.borderColor),
    effect: sanitizeEffectName(saved?.effect || DEFAULT_TIER_STYLE.effect),
    effectColor: sanitizeEffectColor(saved?.effectColor),
  };
}

export function isDefaultStyle(style) {
  return style.borderColor === DEFAULT_TIER_STYLE.borderColor
    && style.effect === DEFAULT_TIER_STYLE.effect
    && !style.effectColor;
}

export function loadTierStyle() {
  try {
    const saved = localStorage.getItem(STYLE_STORAGE_KEY);
    return saved ? normalizeStyleMap(JSON.parse(saved)) : {};
  } catch {
    return {};
  }
}

export function saveTierStyle(styleMap) {
  try {
    localStorage.setItem(STYLE_STORAGE_KEY, JSON.stringify({ byGrade: styleMap }));
  } catch {
    /* 저장만 실패하고 편집은 계속 가능 */
  }
}

// 게시글에 저장할 형태 — 기본값인 등급은 아예 빼서 문서를 작게 유지한다.
export function buildStylePayload(styleMap) {
  const byGrade = {};
  Object.keys(styleMap || {}).forEach((key) => {
    const style = getStyleForGrade(styleMap, Number(key));
    if (!isDefaultStyle(style)) byGrade[key] = style;
  });
  return { byGrade };
}

// #tier-capture-area 에 얹을 인라인 CSS 변수 + data 속성.
// 바닐라는 DOM 에 직접 setProperty 했지만 React 는 style/data 를 그대로 넘긴다(custom-maker.css 규칙 동일).
export function tierStyleProps(styleMap, index) {
  const style = getStyleForGrade(styleMap, index);
  const accent = style.borderColor;
  // 이펙트 색을 골랐을 때만 CSS 의 이펙트별 기본색을 덮어쓴다(custom-maker.css 의 --fx-* 참고)
  const fx = style.effectColor ? {
    '--fx-rgb': hueShiftedRgb(style.effectColor, 0),
    '--fx2-rgb': hueShiftedRgb(style.effectColor, 70),
    '--fx3-rgb': hueShiftedRgb(style.effectColor, -35),
    '--fx-line': style.effectColor,
    '--fx-glow': hexToRgba(style.effectColor, 0.45),
    '--fx-soft': hexToRgba(style.effectColor, 0.3),
  } : null;
  return {
    style: {
      ...fx,
      '--tier-accent': accent,
      '--tier-accent-soft': hexToRgba(accent, 0.3),
      '--tier-accent-strong': hexToRgba(accent, 0.7),
      '--tier-glow': hexToRgba(accent, 0.45),
      '--tier-bg': TIER_STYLE_EFFECTS[style.effect]?.bg || '#111111',
    },
    'data-effect': style.effect,
    'data-decorated': isDefaultStyle(style) ? '0' : '1',
  };
}

export function matchingPresetKey(style) {
  return Object.keys(TIER_STYLE_PRESETS).find((key) => {
    const preset = TIER_STYLE_PRESETS[key];
    return preset.borderColor === style.borderColor && preset.effect === style.effect && !style.effectColor;
  });
}

// scope='all' 이면 1~9등급 전부, 'current' 면 현재 등급만 바꾼 새 맵을 돌려준다.
export function applyStyleChange(styleMap, index, scope, partial) {
  const next = { ...getStyleForGrade(styleMap, index), ...partial };
  next.borderColor = sanitizeHexColor(next.borderColor);
  next.effect = sanitizeEffectName(next.effect);
  next.effectColor = sanitizeEffectColor(next.effectColor);

  const out = { ...styleMap };
  if (scope === 'all') {
    for (let i = 0; i < 9; i += 1) {
      if (isDefaultStyle(next)) delete out[i];
      else out[i] = { ...next };
    }
  } else if (isDefaultStyle(next)) {
    delete out[index];
  } else {
    out[index] = next;
  }
  return out;
}

export function autoDistinctThemes() {
  const out = {};
  TIER_AUTO_PRESET_ORDER.forEach((presetKey, i) => {
    const preset = TIER_STYLE_PRESETS[presetKey];
    if (!preset) return;
    out[i] = { borderColor: sanitizeHexColor(preset.borderColor), effect: sanitizeEffectName(preset.effect), effectColor: '' };
  });
  return out;
}
