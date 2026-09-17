// 티어표 꾸미기 패널 (custom-maker.html / post_edit.html 의 #decorate-panel 이식).
// 캡처 영역(#tier-capture-area) 밖에 있어 PNG/PDF 에는 안 찍히고, 고르는 즉시 위 테이블에 미리보기된다.
import {
  applyStyleChange, autoDistinctThemes, getStyleForGrade, matchingPresetKey, sanitizeHexColor,
  TIER_BORDER_SWATCHES, TIER_STYLE_EFFECTS, TIER_STYLE_PRESETS,
} from '../lib/tierStyle';

export default function DecoratePanel({ hidden, styleMap, index, scope, onScopeChange, onChange }) {
  const style = getStyleForGrade(styleMap, index);
  const activePreset = matchingPresetKey(style);

  const set = (partial) => onChange(applyStyleChange(styleMap, index, scope, partial));

  return (
    <div id="decorate-panel" className="decorate-panel" hidden={hidden}>
      <div className="decorate-panel-head">
        <strong>티어표 꾸미기</strong>
        <span className="decorate-panel-sub">테두리 색·배경 이펙트를 고르면 위 테이블에 바로 반영됩니다.</span>
      </div>

      <div className="decorate-row">
        <span className="decorate-label">적용 범위</span>
        <div className="decorate-seg" role="group" aria-label="적용 범위">
          <button type="button" className={`decorate-seg-btn${scope === 'current' ? ' is-on' : ''}`} onClick={() => onScopeChange('current')}>이 등급만</button>
          <button type="button" className={`decorate-seg-btn${scope === 'all' ? ' is-on' : ''}`} onClick={() => onScopeChange('all')}>모든 등급</button>
        </div>
        <button type="button" className="decorate-mini" onClick={() => onChange(autoDistinctThemes())}>등급마다 다른 테마</button>
      </div>

      <div className="decorate-row">
        <span className="decorate-label">빠른 테마</span>
        <div className="decorate-presets">
          {Object.entries(TIER_STYLE_PRESETS).map(([key, preset]) => (
            <button
              type="button"
              key={key}
              className={`decorate-preset${activePreset === key ? ' is-on' : ''}`}
              onClick={() => set({ borderColor: preset.borderColor, effect: preset.effect })}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="decorate-row">
        <span className="decorate-label">테두리 색</span>
        <div className="decorate-swatches">
          {TIER_BORDER_SWATCHES.map((color) => (
            <button
              type="button"
              key={color}
              className={`decorate-swatch${sanitizeHexColor(color) === style.borderColor ? ' is-on' : ''}`}
              style={{ background: color }}
              title={color}
              aria-label={`테두리 색 ${color}`}
              onClick={() => set({ borderColor: color })}
            />
          ))}
        </div>
        <label className="decorate-custom-color">
          직접 선택
          <input
            type="color"
            value={style.borderColor}
            aria-label="테두리 색 직접 선택"
            onChange={(e) => set({ borderColor: e.target.value })}
          />
        </label>
      </div>

      <div className="decorate-row">
        <span className="decorate-label">배경 이펙트</span>
        <div className="decorate-effects">
          {Object.entries(TIER_STYLE_EFFECTS).map(([key, meta]) => (
            <button
              type="button"
              key={key}
              className={`decorate-effect${style.effect === key ? ' is-on' : ''}`}
              onClick={() => set({ effect: key })}
            >
              {meta.label}
            </button>
          ))}
        </div>
      </div>

      <div className="decorate-row decorate-row-end">
        <button
          type="button"
          className="decorate-mini"
          onClick={() => {
            // 이 등급만 / 모든 등급 — 적용 범위에 맞춰 기본값으로 되돌린다
            if (scope === 'all') { onChange({}); return; }
            const next = { ...styleMap };
            delete next[index];
            onChange(next);
          }}
        >
          {scope === 'all' ? '모든 등급 기본값' : '이 등급만 기본값'}
        </button>
        <button type="button" className="decorate-mini decorate-restore" onClick={() => onChange({})}>
          원래 상태로 돌려놓기
        </button>
      </div>
    </div>
  );
}
