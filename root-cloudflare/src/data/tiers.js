// ========================================================
// tiers.js — 공식 티어표 데이터 단일 소스
// ========================================================
// tiers.json 은 scripts/extract-tiers.mjs 가 root-render/tier-class/tierN.html(정본)에서
// 뽑아낸 생성물이다. 화면(공식 티어표 · 커스텀 메이커)은 전부 이 모듈만 바라본다.
//
// 세부등급(갑급/을급/…)·캐릭터 풀도 여기서 JSON 으로부터 "파생"시킨다. 하드코딩하지
// 않는 이유: 이벤트로 등급 구성이나 캐릭터가 바뀌어도 extract 만 다시 돌리면 티어표와
// 커스텀 메이커가 동시에 따라오고, 두 화면의 정의가 어긋나 꼬이는 일이 없다.
import tiersJson from './tiers.json';

// 홈 티어 카드와 같은 한 줄 설명 (JSON title 에는 없는 값이라 여기서만 관리)
const TIER_DESCRIPTIONS = {
  1: '신계 / 슈퍼 그랜드 마스터',
  2: '뒷세계 전설들 / 그랜드 마스터',
  3: '톱 클래스 무투파 / 마스터',
  4: '준 톱클래스 무투파 / 다이아몬드',
  5: '중견급 무투파 or 탈사제 / 플래티넘',
  6: '중하위권 무투파 or 정예 사제 / 골드',
  7: '하위권 무투파 or 우수한 사제 / 실버',
  8: '평범한 사제 수준의 전투력 / 브론즈',
  9: '비전투원 또는 전투력 측정 단서 없음 / 언랭크',
};

// 줄바꿈이 들어간 라벨("미묘사\n인원들")을 한 줄 키로 정규화 — 저장 키에 쓰이므로 안정적이어야 한다
const flatLabel = (label) => String(label || '').replace(/\s*\n\s*/g, ' ').trim();

// 캐릭터 이름으로부터 항상 같은 id 를 만든다. 로드마다 랜덤 id 를 주면 게시글을 다시 열었을 때
// 저장된 배치(id 기준)와 새 목록의 id 가 어긋나 복원이 깨졌던 이력이 있어 이름 기반으로 고정한다.
export function stableCharId(name) {
  return `char-${String(name || 'unknown').trim().replace(/\s+/g, '_')}`;
}

export const TIER_NUMBERS = Object.keys(tiersJson)
  .map(Number)
  .filter((n) => Number.isFinite(n))
  .sort((a, b) => a - b);

export const TIERS = TIER_NUMBERS.map((n) => {
  const raw = tiersJson[n];
  const rows = raw.rows.map((row) => ({
    label: flatLabel(row.label),
    labelLines: String(row.label || '').split(/\n/),
    items: row.items,
  }));
  return {
    tier: n,
    title: raw.title,
    desc: TIER_DESCRIPTIONS[n] || '',
    rows,
    subTiers: rows.map((row) => row.label),
  };
});

export const TIER_BY_NUMBER = Object.fromEntries(TIERS.map((t) => [t.tier, t]));

// 커스텀 메이커 캐릭터 풀 — 전 등급의 카드를 이름 기준으로 중복 제거해 한 줄로 편다.
// (바닐라는 tier1~9.html 을 fetch + DOMParser 로 긁어왔지만, 여기서는 같은 정본 데이터를
//  이미 JSON 으로 갖고 있으므로 네트워크 요청 없이 즉시 만든다)
export const ALL_CHARACTERS = (() => {
  const seen = new Set();
  const list = [];
  TIERS.forEach((t) => {
    t.rows.forEach((row) => {
      row.items.forEach((item) => {
        if (item.break) return;
        const name = (item.name || item.alt || '').trim();
        if (!name || seen.has(name)) return;
        seen.add(name);
        list.push({ id: stableCharId(name), name, img: item.img, tier: t.tier });
      });
    });
  });
  return list;
})();
