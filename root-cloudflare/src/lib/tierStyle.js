// ========================================================
// tierStyle.js — 커스텀 티어표 "꾸미기" (테두리 색 · 배경 이펙트)
// ========================================================
// 바닐라 custom-maker.js 의 꾸미기 로직을 그대로 이식한다. 저장 형식도 동일:
//   localStorage customMakerTierStyle = { byGrade: { "0": { borderColor, effect }, ... } }
//   게시글        tierData.style       = 같은 형태
// 색·이펙트 이름은 화이트리스트만 통과시켜서, 옛 글이나 조작된 값이 와도 기본 골드로 떨어진다.

export const STYLE_STORAGE_KEY = 'customMakerTierStyle';
export const DEFAULT_TIER_STYLE = { borderColor: '#ffcc00', effect: 'none' };

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
};

export const TIER_BORDER_SWATCHES = [
  '#ffcc00', '#ffe566', '#ffffff', '#ff3b5c', '#ff7a3d',
  '#39ff14', '#7cf0ff', '#9ad8ff', '#a78bfa', '#ff4dcd',
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

export function sanitizeEffectName(effect) {
  const key = String(effect || '').trim();
  return Object.prototype.hasOwnProperty.call(TIER_STYLE_EFFECTS, key) ? key : DEFAULT_TIER_STYLE.effect;
}

export function hexToRgba(hex, alpha) {
  const h = sanitizeHexColor(hex).slice(1);
  return `rgba(${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}, ${alpha})`;
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
    out[n] = { borderColor: sanitizeHexColor(item.borderColor), effect: sanitizeEffectName(item.effect) };
  });
  return out;
}

export function getStyleForGrade(styleMap, index) {
  const saved = styleMap?.[index];
  return {
    borderColor: sanitizeHexColor(saved?.borderColor || DEFAULT_TIER_STYLE.borderColor),
    effect: sanitizeEffectName(saved?.effect || DEFAULT_TIER_STYLE.effect),
  };
}

export function isDefaultStyle(style) {
  return style.borderColor === DEFAULT_TIER_STYLE.borderColor && style.effect === DEFAULT_TIER_STYLE.effect;
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
  return {
    style: {
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
    return preset.borderColor === style.borderColor && preset.effect === style.effect;
  });
}

// scope='all' 이면 1~9등급 전부, 'current' 면 현재 등급만 바꾼 새 맵을 돌려준다.
export function applyStyleChange(styleMap, index, scope, partial) {
  const next = { ...getStyleForGrade(styleMap, index), ...partial };
  next.borderColor = sanitizeHexColor(next.borderColor);
  next.effect = sanitizeEffectName(next.effect);

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
    out[i] = { borderColor: sanitizeHexColor(preset.borderColor), effect: sanitizeEffectName(preset.effect) };
  });
  return out;
}
