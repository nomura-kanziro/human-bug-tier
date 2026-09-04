// ========================================================
// makerState.js — 커스텀 메이커 배치 상태(tierState) 헬퍼
// ========================================================
// 저장 형식은 바닐라(root-render/custom-maker)와 동일하게 유지한다:
//   { "<0-based 등급 인덱스>_<세부등급명>": [{ id, name, img }, ...] }
// 게시판 DB 에 이미 이 형태로 쌓여 있으므로 바꾸면 기존 글이 안 열린다.
import { ALL_CHARACTERS, stableCharId, TIERS } from '../data/tiers';

export const MAKER_STORAGE_KEY = 'customMakerTierState';

export const zoneKey = (tierIndex, subTier) => `${tierIndex}_${subTier}`;

export function loadMakerState() {
  try {
    const raw = localStorage.getItem(MAKER_STORAGE_KEY);
    return raw ? rematchToCatalog(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

export function saveMakerState(state) {
  try {
    localStorage.setItem(MAKER_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* 용량 초과 등 — 저장만 실패하고 편집은 계속 가능 */
  }
}

// 저장된 항목을 현재 카탈로그(tiers.json)의 id/이미지로 다시 맞춘다.
// 카탈로그에 없는 캐릭터(이벤트로 빠졌거나 옛 글)라도 저장 당시 데이터로 계속 편집 가능하게 남긴다.
export function rematchToCatalog(state) {
  const next = {};
  Object.entries(state || {}).forEach(([key, chars]) => {
    if (!Array.isArray(chars)) return;
    next[key] = chars.map((data) => {
      if (!data) return null;
      const byId = data.id != null && data.id !== ''
        ? ALL_CHARACTERS.find((c) => String(c.id) === String(data.id))
        : null;
      const match = byId || (data.name ? ALL_CHARACTERS.find((c) => c.name === data.name) : null);
      if (match) return { id: match.id, name: match.name, img: match.img };
      if (data.name) {
        return {
          id: data.id != null && data.id !== '' ? String(data.id) : stableCharId(data.name),
          name: data.name,
          img: data.img || '',
        };
      }
      return null;
    }).filter(Boolean);
  });
  return next;
}

// 배치된 캐릭터 id·이름 집합 — 풀에서 제외할 때 쓴다(같은 캐릭터 중복 배치 방지)
export function getPlacedKeys(state) {
  const ids = new Set();
  const names = new Set();
  Object.values(state || {}).forEach((arr) => {
    if (!Array.isArray(arr)) return;
    arr.forEach((c) => {
      if (c?.id != null) ids.add(String(c.id));
      if (c?.name) names.add(String(c.name).trim());
    });
  });
  return { ids, names };
}

export function hasPlacedCharacters(state) {
  return Object.values(state || {}).some((arr) => Array.isArray(arr) && arr.length > 0);
}

// 어떤 칸에 있든 해당 캐릭터를 전부 제거한 새 상태를 만든다(이동의 첫 단계).
export function removeChar(state, charId) {
  const next = {};
  Object.entries(state).forEach(([key, arr]) => {
    next[key] = (arr || []).filter((c) => String(c.id) !== String(charId));
  });
  return next;
}

// charId 를 targetKey 의 insertIndex 위치에 넣는다(insertIndex 가 null 이면 맨 뒤).
export function placeChar(state, char, targetKey, insertIndex = null) {
  const next = removeChar(state, char.id);
  const arr = [...(next[targetKey] || [])];
  const item = { id: char.id, name: char.name, img: char.img };
  if (insertIndex == null || insertIndex >= arr.length) arr.push(item);
  else arr.splice(Math.max(0, insertIndex), 0, item);
  next[targetKey] = arr;
  return next;
}

// 서버(DB)에는 배포 깊이와 무관한 루트 절대경로(/tier-media/tier-image/...)로 저장한다.
// 카탈로그(tiers.json)는 접두사 없는 "1 tier/xxx.webp" 형태라 여기서 접두사를 붙여준다.
export function normalizeImgForBoard(img) {
  if (!img) return '/tier-media/tier-image/logo.webp';
  if (img.startsWith('data:image/')) return img;

  let path = img;
  try {
    if (path.startsWith('http')) path = new URL(path).pathname;
  } catch {
    /* 정규화 실패 시 아래 상대경로 처리로 진행 */
  }
  const stripped = path
    .replace(/^(\.\.\/|\.\/|\/)+/, '')
    .replace(/^tier-media\/tier-image\/|^tier-image\/|^tier-media\//, '');
  return `/tier-media/tier-image/${stripped}`;
}

// 업로드 payload — tierDefinitions(작성 당시 등급 정의)를 함께 저장해 두면
// 나중에 등급 구성이 바뀌어도 그 글은 작성 시점 그대로 재현할 수 있다.
export function buildUploadPayload(state, { title, description, user, thumbnail }) {
  const normalized = {};
  Object.entries(state).forEach(([key, chars]) => {
    normalized[key] = (chars || []).map((c) => ({ ...c, img: normalizeImgForBoard(c.img) }));
  });

  return {
    title: title.trim(),
    description: (description || '').trim(),
    tierData: {
      tierState: normalized,
      tierDefinitions: TIERS.map((t) => ({ id: t.tier, title: t.title, subTiers: t.subTiers })),
    },
    author: user.nickname,
    authorEmail: user.email || '',
    thumbnail: normalizeImgForBoard(thumbnail),
    isPublic: true,
  };
}

// 썸네일 미지정 시 대표 이미지 = 배치된 캐릭터 중 첫 번째
export function getThumbnailFromState(state) {
  for (const arr of Object.values(state || {})) {
    if (!Array.isArray(arr)) continue;
    for (const char of arr) {
      if (char?.img) return char.img;
    }
  }
  return 'logo.webp';
}

// JSON 저장 형식 — 바닐라와 동일 ("티어표 명단 목록" > "N티어" > 세부등급 > 이름 배열)
export function buildJsonExport(state) {
  const result = { '티어표 명단 목록': {} };
  TIERS.forEach((t, index) => {
    const tierKey = `${t.tier}티어`;
    result['티어표 명단 목록'][tierKey] = {};
    t.subTiers.forEach((sub) => {
      const chars = state[zoneKey(index, sub)] || [];
      result['티어표 명단 목록'][tierKey][sub] = chars.map((c) => c.name);
    });
  });
  return result;
}

// 원본을 그대로 base64 로 올리면 DB 문서가 커지므로 가로 720px · JPEG 82% 로 줄인다.
export function compressImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file || !String(file.type || '').startsWith('image/')) {
      reject(new Error('이미지 파일만 선택할 수 있습니다.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxWidth = 720;
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        if (dataUrl.length > 1.6 * 1024 * 1024) {
          reject(new Error('이미지가 너무 큽니다. 더 작은 파일을 선택해주세요.'));
          return;
        }
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('이미지를 읽을 수 없습니다.'));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error('파일을 읽을 수 없습니다.'));
    reader.readAsDataURL(file);
  });
}
