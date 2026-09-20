/* ======================================================================
 * 티어 카탈로그 — 공식 티어표(1~9등급 × 갑/을/병/정급) 캐릭터 목록
 * ----------------------------------------------------------------------
 * 이벤트의 "매일 간단 퀴즈"는 "{캐릭터}는 어느 티어인가요?" 를 묻고 보기에 등급 + 급
 * (예: "5티어 을급")을 함께 보여줘야 한다. 그런데 기존 backend/data/luckPool.js 에는
 * 티어 번호만 있고 갑/을/병/정 급 정보가 없다.
 *
 * 급까지 들어 있는 정본은 프론트의 root-cloudflare/src/data/tiers.json 하나뿐이라,
 * 그 파일을 **읽어서** 쓴다(백엔드에 343명을 복사해 두면 캐릭터가 추가·이동될 때마다
 * 두 곳이 어긋난다 — 실제로 카모카와/카제타니 교체 때 그런 실수가 날 뻔했다).
 *
 * 파일이 없거나 형식이 깨졌으면 빈 배열을 돌려주고, 호출부(eventController)가
 * 503 으로 안내한다 — 서버가 죽지는 않는다.
 * ====================================================================== */
const fs = require('fs');
const path = require('path');

const CATALOG_PATH = path.join(__dirname, '..', '..', 'root-cloudflare', 'src', 'data', 'tiers.json');

// 줄바꿈이 들어간 라벨("갑급\n(1~3)" 같은 형태)도 한 줄로 눌러서 보기에 쓰기 좋게 만든다.
function flatLabel(label) {
  return String(label || '').replace(/\s+/g, ' ').trim();
}

let cache = null;

function loadCatalog() {
  if (cache) return cache;

  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
  } catch (err) {
    console.error('티어 카탈로그(tiers.json) 를 읽지 못했습니다:', err.message);
    cache = [];
    return cache;
  }

  const list = [];
  Object.entries(raw).forEach(([tierKey, tierData]) => {
    const tier = Number(tierKey);
    if (!Number.isInteger(tier)) return;
    (tierData.rows || []).forEach((row) => {
      const subTier = flatLabel(row.label);
      (row.items || []).forEach((item) => {
        // break 표시용 칸이나 이름 없는 항목은 퀴즈에 낼 수 없으므로 건너뛴다.
        if (item.break) return;
        const name = String(item.name || item.alt || '').trim();
        if (!name) return;
        list.push({ name, tier, subTier, img: item.img || '' });
      });
    });
  });

  cache = list;
  return cache;
}

// 전체 캐릭터 목록(읽기 전용으로 쓸 것 — 호출부에서 정렬/변형하지 않는다).
function getAllCharacters() {
  return loadCatalog();
}

// 이 카탈로그에 등장하는 "티어 + 급" 조합 전부(퀴즈 오답 보기를 만들 때 쓴다).
function getAllTierSlots() {
  const seen = new Set();
  const slots = [];
  loadCatalog().forEach(({ tier, subTier }) => {
    const key = `${tier}|${subTier}`;
    if (seen.has(key)) return;
    seen.add(key);
    slots.push({ tier, subTier });
  });
  return slots;
}

module.exports = { getAllCharacters, getAllTierSlots };
