// custom-maker/custom-maker.js
let currentTierIndex = 0;

// ─── 전역 상태 ───────────────────────────────────────────────
let tierState = {};
const STORAGE_KEY = 'customMakerTierState';

function saveToLocalStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tierState));
}

function loadFromLocalStorage() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    tierState = JSON.parse(saved);
    console.log('🔄 localStorage에서 tier 상태 복원 완료');
  }
}

// DOM → 데이터: 현재 tier의 드롭존 상태를 tierState에 저장
function saveCurrentTierState() {
  const container = document.getElementById('tier-list');
  if (!container) return;

  // 현재 tierIndex에 해당하는 키를 먼저 전부 삭제
  Object.keys(tierState).forEach(key => {
    if (key.startsWith(`${currentTierIndex}_`)) delete tierState[key];
  });

  container.querySelectorAll('.characters').forEach(zone => {
    const subTierName = zone.getAttribute('data-tier');
    const storageKey = `${currentTierIndex}_${subTierName}`;
    tierState[storageKey] = [];

    zone.querySelectorAll('.char').forEach(charEl => {
      const img = charEl.querySelector('img');
      const nameEl = charEl.querySelector('p') || charEl.querySelector('span');
      if (img && nameEl) {
        tierState[storageKey].push({
          id: charEl.dataset.id,
          name: nameEl.textContent.trim(),
          img: img.src
        });
      }
    });
  });

  saveToLocalStorage();
}

/** 풀 카탈로그에서 저장 데이터와 캐릭터 매칭 (id 또는 이름 — 과거 랜덤 id 호환) */
function resolveCharacterFromCatalog(data) {
  if (!data) return null;
  if (data.id != null && data.id !== '') {
    const byId = allCharacters.find(c => String(c.id) === String(data.id));
    if (byId) return byId;
  }
  const name = (data.name || '').trim();
  if (name) {
    const byName = allCharacters.find(c => c.name === name);
    if (byName) return byName;
  }
  return null;
}

/** 게시글/로컬 저장 tierState를 현재 카탈로그 id로 재매핑 */
function rematchTierStateToCatalog(state) {
  const next = {};
  Object.entries(state || {}).forEach(([key, chars]) => {
    if (!Array.isArray(chars)) return;
    next[key] = chars
      .map((data) => {
        const match = resolveCharacterFromCatalog(data);
        if (match) {
          return { id: match.id, name: match.name, img: match.img };
        }
        // 카탈로그에 없어도 게시 당시 데이터로 표시·편집 가능
        if (data?.name) {
          return {
            id: data.id != null && data.id !== '' ? String(data.id) : stableCharId(data.name),
            name: data.name,
            img: data.img || '',
          };
        }
        return null;
      })
      .filter(Boolean);
  });
  return next;
}

function stableCharId(name) {
  return `char-${String(name || 'unknown').trim().replace(/\s+/g, '_')}`;
}

// 데이터 → DOM: 저장된 캐릭터를 현재 tier 드롭존에 복원
// ✅ BUG2 FIX: 존을 먼저 비운 후 append해서 중복 방지
function loadTierStateToDOM() {
  const container = document.getElementById('tier-list');
  if (!container) return;

  container.querySelectorAll('.characters').forEach(zone => {
    // 항상 먼저 비움 (이전 tier 잔재 + 새로고침 중복 방지)
    zone.innerHTML = '';

    const subTierName = zone.getAttribute('data-tier');
    const storageKey = `${currentTierIndex}_${subTierName}`;
    const savedData = tierState[storageKey];

    if (!savedData || savedData.length === 0) return;

    savedData.forEach(data => {
      const original = resolveCharacterFromCatalog(data);
      if (original) {
        zone.appendChild(createCharElement(original));
        return;
      }
      // 이름/이미지로 직접 복원 (수정 모드: 과거 게시 데이터)
      if (data?.name) {
        zone.appendChild(createCharElement({
          id: data.id != null && data.id !== '' ? String(data.id) : stableCharId(data.name),
          name: data.name,
          img: data.img || '',
        }));
      }
    });
  });
}

// ─── 티어 데이터 ─────────────────────────────────────────────
const tierData = [
  { id: 1, title: "1등급 - 신계 / 슈퍼 그랜드 마스터",         subTiers: ["갑급", "을급", "병급", "정급"] },
  { id: 2, title: "2등급 - 뒷세계의 전설 / 그랜드 마스터",     subTiers: ["갑급", "을급", "병급", "정급"] },
  { id: 3, title: "3등급 - 톱 클래스 무투파 / 마스터",         subTiers: ["갑급", "을급", "병급", "정급"] },
  { id: 4, title: "4등급 - 준 톱클래스 무투파 / 다이아몬드",   subTiers: ["갑급", "을급", "병급", "정급"] },
  { id: 5, title: "5등급 - 중견급 무투파 & 탈사제급 / 플레티넘", subTiers: ["갑급", "을급", "병급"] },
  { id: 6, title: "6등급 - 중하위권 무투파 or 정예 사제 / 골드", subTiers: ["갑급", "을급", "병급"] },
  { id: 7, title: "7등급 - 하위권 무투파 or 우수한 사제 / 실버", subTiers: ["갑급", "을급", "병급"] },
  { id: 8, title: "8등급 - 평범한 사제 수준의 전투력 / 브론즈",  subTiers: ["갑급", "을급", "병급"] },
  { id: 9, title: "9등급 - 비전투원 또는 전투력 측정 단서 없음 / 언랭크", subTiers: ["미묘사 인원들"] }
];

let allCharacters = [];

// ─── 캐릭터 엘리먼트 생성 헬퍼 ──────────────────────────────
// ✅ 공통 함수로 분리: createCharElement
// 이벤트는 enableDragAndDrop()에서 한 번에 위임하므로 여기선 draggable만 설정
function createCharElement(char) {
  const div = document.createElement('div');
  div.className = 'char';
  div.draggable = true;
  div.dataset.id = char.id;

  let imgSrc = char.img || '';
  const base = (typeof getBasePath === 'function') ? getBasePath() : '';
  if (imgSrc.startsWith('/')) {
    imgSrc = base + imgSrc.slice(1);
  } else if (imgSrc.startsWith('http')) {
    // keep
  } else if (imgSrc && !imgSrc.startsWith('.') && !imgSrc.startsWith('http')) {
    imgSrc = base + imgSrc;
  }

  div.innerHTML = `
    <img src="${imgSrc}" alt="${char.name}">
    <p>${char.name}</p>
  `;
  return div;
}

// ─── tier-class에서 캐릭터 로드 ──────────────────────────────
function getTierClassHtmlUrl(tierNum) {
  const base = typeof getBasePath === 'function' ? getBasePath() : '../';
  return `${base}tier-class/tier${tierNum}.html`;
}

async function loadCharactersFromTierClass() {
  console.log('🔄 tier-class 1~9 전체 캐릭터 불러오는 중...');
  allCharacters = [];

  for (let i = 1; i <= 9; i++) {
    try {
      const response = await fetch(getTierClassHtmlUrl(i));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const htmlText = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, 'text/html');

      doc.querySelectorAll('.char').forEach(charEl => {
        const img = charEl.querySelector('img');
        const p = charEl.querySelector('p');
        const span = charEl.querySelector('span');
        let name = p ? p.textContent.trim()
                 : span ? span.textContent.trim()
                 : img ? (img.getAttribute('alt') || '이름 없음') : '';

        if (img && name) {
          // 이름 기반 안정 id — 매 로드 랜덤 id면 게시글 수정 시 배치 복원 불가
          allCharacters.push({
            id: stableCharId(name),
            name,
            img: img.src.replace(window.location.origin, '..')
          });
        }
      });

      console.log(`✅ tier${i} 로드 완료`);
    } catch (err) {
      console.warn(`⚠️ tier${i}.html 불러오기 실패`, err);
    }
  }

  // 중복 제거
  const seen = new Set();
  allCharacters = allCharacters.filter(c => seen.has(c.name) ? false : (seen.add(c.name), true));

  console.log(`🎉 총 ${allCharacters.length}개 고유 캐릭터 로드 완료`);
}

// ─── 렌더링 ──────────────────────────────────────────────────
function renderTier() {
  const container = document.getElementById('tier-list');
  const current = tierData[currentTierIndex];

  document.getElementById('tier-title').textContent = current.title;

  let html = '';
  current.subTiers.forEach(subName => {
    html += `
      <div class="tier">
        <div class="tier-name">${subName}</div>
        <div class="characters drop-zone" data-tier="${subName}"></div>
      </div>`;
  });
  container.innerHTML = html;

  loadTierStateToDOM();  // ✅ 비우고 복원
  // 이벤트는 위임 방식이므로 re-register 불필요 (단, 풀 교체 시엔 필요)
}

function renderCharacterPool() {
  const pool = document.getElementById('character-pool');
  pool.innerHTML = '';

  // tierState에 배치된 캐릭터는 풀에서 제외 (id + 이름 — 수정 모드 재매칭 호환)
  const placedIds = new Set();
  const placedNames = new Set();
  Object.values(tierState).forEach(arr => {
    if (!Array.isArray(arr)) return;
    arr.forEach((c) => {
      if (c?.id != null) placedIds.add(String(c.id));
      if (c?.name) placedNames.add(String(c.name).trim());
    });
  });

  allCharacters.forEach(char => {
    if (placedIds.has(String(char.id)) || placedNames.has(char.name)) return;
    pool.appendChild(createCharElement(char));
  });
}

// ─── 드래그 앤 드롭 (이벤트 위임 방식) ──────────────────────
// ✅ BUG1 FIX: 같은 존 내 이동도 허용 (parentNode 조건 제거)
// ✅ BUG3 FIX: cloneNode 대신 위임 방식 사용 → 초기화 후에도 정상 동작
// ✅ BUG4 FIX: 풀에도 dragover/drop 이벤트 등록 → 풀로 되돌리기 가능

let draggedId = null;    // 드래그 중인 캐릭터 ID
let dragSource = null;   // 'pool' | 'tier'

function enableDragAndDrop() {
  const tierList = document.getElementById('tier-list');
  const pool = document.getElementById('character-pool');

  // ── dragstart / dragend: document 위임 ──────────────────────
  // 이미 등록된 리스너와 중복되지 않도록 once 패턴 대신 flag 사용
  if (!document._dndBound) {
    document._dndBound = true;

    document.addEventListener('dragstart', (e) => {
      const char = e.target.closest('.char');
      if (!char) return;

      draggedId = char.dataset.id;
      dragSource = char.closest('#character-pool') ? 'pool' : 'tier';
      char.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', draggedId);
    });

    document.addEventListener('dragend', (e) => {
      const char = e.target.closest('.char');
      if (char) char.classList.remove('dragging');
      draggedId = null;
      dragSource = null;
    });
  }

  // ── 티어 테이블 드롭존 ───────────────────────────────────────
  // tierList는 renderTier()마다 innerHTML이 교체되므로 위임으로 처리
  if (tierList && !tierList._dndBound) {
    tierList._dndBound = true;

    tierList.addEventListener('dragover', (e) => {
      e.preventDefault();
      const zone = e.target.closest('.characters');
      if (!zone) return;

      zone.style.borderColor = '#ffcc00';

      const dragging = document.querySelector('.char.dragging');
      if (!dragging) return;

      // ✅ BUG1 FIX: 같은 존 내 이동도 처리 (조건 없이 삽입 위치 계산)
      const afterElement = getDragAfterElement(zone, e.clientX, e.clientY);
      if (afterElement == null) {
        zone.appendChild(dragging);
      } else if (afterElement !== dragging) {
        zone.insertBefore(dragging, afterElement);
      }
    });

    tierList.addEventListener('dragleave', (e) => {
      const zone = e.target.closest('.characters');
      if (zone && !zone.contains(e.relatedTarget)) {
        zone.style.borderColor = 'rgba(255, 204, 0, 0.3)';
      }
    });

    tierList.addEventListener('drop', (e) => {
      e.preventDefault();
      const zone = e.target.closest('.characters');
      if (zone) zone.style.borderColor = 'rgba(255, 204, 0, 0.3)';
      saveCurrentTierState();
      renderCharacterPool(); // 풀에서 이 카드 제거
    });
  }

  // ── 풀 드롭존 ────────────────────────────────────────────────
  // ✅ BUG4 FIX: 풀에 drop 이벤트 등록 → 티어 → 풀 이동 가능
  // ✅ BUG3 FIX: cloneNode 제거, pool 자체에 직접 위임 등록 (초기화 후에도 유지)
  if (pool && !pool._dndBound) {
    pool._dndBound = true;

    pool.addEventListener('dragover', (e) => {
      e.preventDefault();
      pool.style.outline = '2px dashed #ffcc00';

      const dragging = document.querySelector('.char.dragging');
      if (!dragging) return;

      // 이미 풀에 있는 카드면 위치 재정렬
      if (dragging.parentNode === pool) {
        const afterElement = getDragAfterElement(pool, e.clientX, e.clientY);
        if (afterElement == null) pool.appendChild(dragging);
        else if (afterElement !== dragging) pool.insertBefore(dragging, afterElement);
      }
    });

    pool.addEventListener('dragleave', (e) => {
      if (!pool.contains(e.relatedTarget)) {
        pool.style.outline = '';
      }
    });

    pool.addEventListener('drop', (e) => {
      e.preventDefault();
      pool.style.outline = '';

      const dragging = document.querySelector('.char.dragging');
      if (!dragging) return;

      // 티어에서 풀로 이동하는 경우만 처리
      if (dragging.parentNode !== pool) {
        // tierState에서 해당 캐릭터 제거
        const id = dragging.dataset.id;
        Object.keys(tierState).forEach(key => {
          if (Array.isArray(tierState[key])) {
            tierState[key] = tierState[key].filter(c => c.id !== id);
          }
        });
        saveToLocalStorage();

        // 원래 순서에 맞게 풀에 삽입
        insertCharBackToPoolInOrder(dragging);
      }
    });
  }
}

// ─── 모바일/터치: 탭 선택 후 티어 칸 탭으로 배치 ───────────────
// HTML5 DnD 는 모바일에서 불안정하므로, 클릭/탭으로도 배치 가능하게 함.
let selectedCharEl = null;

function clearCharSelection() {
  document.querySelectorAll('.char.selected').forEach((el) => el.classList.remove('selected'));
  selectedCharEl = null;
  document.body.classList.remove('char-selected-mode');
  const hint = document.getElementById('mobile-place-hint');
  if (hint) hint.hidden = true;
}

function setCharSelection(char) {
  clearCharSelection();
  selectedCharEl = char;
  char.classList.add('selected');
  document.body.classList.add('char-selected-mode');
  const hint = document.getElementById('mobile-place-hint');
  if (hint) {
    const name = char.querySelector('p')?.textContent?.trim() || '캐릭터';
    hint.hidden = false;
    hint.textContent = `「${name}」 선택됨 → 티어 칸을 탭하세요 (풀을 탭하면 되돌림)`;
  }
}

function enableTapToPlace() {
  if (document._tapPlaceBound) return;
  document._tapPlaceBound = true;

  document.addEventListener('click', (e) => {
    // 다운로드 메뉴 등 버튼은 무시
    if (e.target.closest('button, a, .btn, .dropdown-menu, .dropdown-item')) return;

    const char = e.target.closest('.char');
    const zone = e.target.closest('.characters.drop-zone, .characters');
    const pool = e.target.closest('#character-pool');

    // 1) 캐릭터 탭: 선택 / 같은 것 다시 탭 시 해제
    if (char) {
      e.preventDefault();
      if (selectedCharEl === char) {
        clearCharSelection();
        return;
      }
      setCharSelection(char);
      return;
    }

    // 2) 선택 후 티어 존 탭 → 배치
    if (selectedCharEl && zone) {
      e.preventDefault();
      zone.appendChild(selectedCharEl);
      clearCharSelection();
      saveCurrentTierState();
      if (typeof renderCharacterPool === 'function') renderCharacterPool();
      return;
    }

    // 3) 선택 후 풀 탭 → 풀로 복귀
    if (selectedCharEl && pool) {
      e.preventDefault();
      const id = selectedCharEl.dataset.id;
      Object.keys(tierState).forEach((key) => {
        if (Array.isArray(tierState[key])) {
          tierState[key] = tierState[key].filter((c) => c.id !== id);
        }
      });
      saveToLocalStorage();
      insertCharBackToPoolInOrder(selectedCharEl);
      clearCharSelection();
      return;
    }

    // 4) 바깥 탭 → 선택 해제
    if (selectedCharEl) clearCharSelection();
  }, true);
}

// ── 삽입 위치 계산 (가로+세로 복합) ─────────────────────────
function getDragAfterElement(container, x, y) {
  const elements = [...container.querySelectorAll('.char:not(.dragging)')];

  return elements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const cx = box.left + box.width / 2;
    const cy = box.top + box.height / 2;
    const sameRow = Math.abs(y - cy) < box.height * 0.75;
    const isBefore = sameRow ? (x < cx) : (y < cy);
    if (!isBefore) return closest;
    const dist = Math.hypot(x - cx, y - cy);
    return dist < closest.dist ? { dist, element: child } : closest;
  }, { dist: Infinity }).element;
}

// ── 자동 스크롤 ──────────────────────────────────────────────
(function initAutoScroll() {
  let scrollInterval;
  document.addEventListener('dragover', (e) => {
    const threshold = 80;
    if (e.clientY < threshold) {
      if (!scrollInterval) scrollInterval = setInterval(() => window.scrollBy(0, -15), 16);
    } else if (e.clientY > window.innerHeight - threshold) {
      if (!scrollInterval) scrollInterval = setInterval(() => window.scrollBy(0, 15), 16);
    } else {
      clearInterval(scrollInterval);
      scrollInterval = null;
    }
  });
  document.addEventListener('dragend', () => {
    clearInterval(scrollInterval);
    scrollInterval = null;
  });
})();

// ─── 화살표 버튼 ─────────────────────────────────────────────
document.getElementById('prev-btn').addEventListener('click', () => {
  saveCurrentTierState();
  currentTierIndex = (currentTierIndex - 1 + tierData.length) % tierData.length;
  renderTier();
});

document.getElementById('next-btn').addEventListener('click', () => {
  saveCurrentTierState();
  currentTierIndex = (currentTierIndex + 1) % tierData.length;
  renderTier();
});

// ─── 초기화 ──────────────────────────────────────────────────
// ✅ BUG3 FIX: resetAll에서 enableDragAndDrop 재호출 불필요
// (위임 방식이라 DOM 교체 후에도 tierList._dndBound / pool._dndBound 유지)
async function resetAll() {
  tierState = {};
  localStorage.removeItem(STORAGE_KEY);

  // tier-list 내부 초기화 (renderTier가 innerHTML 교체하므로 사실상 자동)
  renderTier();

  if (allCharacters.length === 0) {
    await loadCharactersFromTierClass();
  }

  renderCharacterPool();
  console.log('🔄 전체 초기화 완료');
}

document.getElementById('reset-btn').addEventListener('click', () => {
  if (confirm('정말 모든 티어 배치를 초기화할까요?')) resetAll();
});

// ─── 풀에 원래 순서로 삽입 ───────────────────────────────────
function insertCharBackToPoolInOrder(charElement) {
  const pool = document.getElementById('character-pool');
  const allPoolChars = Array.from(pool.children);
  const originalIndex = allCharacters.findIndex(c => c.id === charElement.dataset.id);

  let inserted = false;
  for (const existing of allPoolChars) {
    const existingIndex = allCharacters.findIndex(c => c.id === existing.dataset.id);
    if (existingIndex > originalIndex) {
      pool.insertBefore(charElement, existing);
      inserted = true;
      break;
    }
  }
  if (!inserted) pool.appendChild(charElement);
}

// ─── 다운로드 ────────────────────────────────────────────────
const downloadBtn = document.getElementById('download-btn');
const downloadMenu = document.getElementById('download-menu');

if (downloadBtn && downloadMenu) {
  downloadBtn.addEventListener('click', (e) => {
    e.stopImmediatePropagation();
    downloadMenu.classList.toggle('show');
  });

  document.addEventListener('click', (e) => {
    if (!downloadMenu.contains(e.target) && !downloadBtn.contains(e.target)) {
      downloadMenu.classList.remove('show');
    }
  });
}

document.querySelectorAll('.dropdown-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.stopPropagation();
    const type = item.getAttribute('data-type');
    document.getElementById('download-menu')?.classList.remove('show');

    if (type === 'png') downloadAllTiersAsPNG();
    else if (type === 'pdf') downloadAllTiersAsPDF();
    else if (type === 'json') downloadAllTiersAsJSON();   // ← JSON 함수 호출;
  });
});

// ─── PNG 다운로드 ─────────────────────────────────────────────
async function downloadAllTiersAsPNG() {
  saveCurrentTierState();
  const originalTierIndex = currentTierIndex;
  const tierListElement = document.getElementById('tier-list');
  if (!tierListElement) { alert('티어 테이블을 찾을 수 없습니다.'); return; }

  for (let i = 0; i < tierData.length; i++) {
    currentTierIndex = i;
    renderTier();
    await new Promise(r => setTimeout(r, 450));

    try {
      const canvas = await html2canvas(tierListElement, { scale: 2, backgroundColor: '#111111', logging: false });
      const link = document.createElement('a');
      link.download = `tier-${i + 1}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      await new Promise(r => setTimeout(r, 650));
    } catch (err) {
      console.error(`❌ tier-${i + 1} 캡처 실패:`, err);
    }
  }

  currentTierIndex = originalTierIndex;
  renderTier();
}

// ─── PDF 다운로드 ─────────────────────────────────────────────
async function downloadAllTiersAsPDF() {
  saveCurrentTierState();
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const originalTierIndex = currentTierIndex;
  const tierListElement = document.getElementById('tier-capture-area');
  if (!tierListElement) { alert('티어 테이블을 찾을 수 없습니다.'); return; }

  for (let i = 0; i < tierData.length; i++) {
    currentTierIndex = i;
    renderTier();
    await new Promise(r => setTimeout(r, 450));

    try {
      const titleText = document.getElementById('tier-title').textContent;
      const tempTitle = document.createElement('h2');
      tempTitle.textContent = titleText;
      tempTitle.style.cssText = 'color:#ffcc00; text-align:center; margin:0 0 10px; font-size:1.1rem; padding:10px 0;';
      tierListElement.insertBefore(tempTitle, tierListElement.firstChild);

      const canvas = await html2canvas(tierListElement, { scale: 2, backgroundColor: '#111111', logging: false });
      tierListElement.removeChild(tempTitle);

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    } catch (err) {
      console.error(`❌ tier-${i + 1} PDF 캡처 실패:`, err);
    }
  }

  pdf.save('all-tiers.pdf');
  currentTierIndex = originalTierIndex;
  renderTier();
}

// ─── 페이지 초기 로드 ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // 구 링크 custom-maker.html?edit=ID → 전용 수정 페이지로 이동
  if (!isPostEditPage()) {
    const legacyEdit = new URLSearchParams(window.location.search).get('edit');
    if (legacyEdit?.trim()) {
      const base = typeof getBasePath === 'function' ? getBasePath() : '';
      window.location.replace(
        `${base}custom-maker/post_edit.html?id=${encodeURIComponent(legacyEdit.trim())}`
      );
      return;
    }
  }

  await loadCharactersFromTierClass();

  if (isPostEditPage()) {
    const editId = getEditPostIdFromUrl() || getEditPostIdFromSession();
    if (!editId) {
      alert('수정할 게시글이 지정되지 않았습니다.');
      window.location.href =
        (typeof getBasePath === 'function' ? getBasePath() : '') +
        'custom-maker/custom-maker_post/custom-maker_post.html';
      return;
    }
    const ok = await enterEditMode(editId);
    if (!ok) {
      // 전용 수정 페이지에서는 빈 메이커로 두지 않고 게시판으로 복귀
      window.location.href = getCustomMakerBoardUrl();
      return;
    }
  } else {
    loadFromLocalStorage();
  }

  renderTier();
  renderCharacterPool();
  enableDragAndDrop();   // pool / tierList에 위임 리스너 등록
  enableTapToPlace();    // 모바일: 탭 선택 → 티어 칸 탭 배치
  updateUploadButtonState();
  updateEditModeChrome();
  console.log('✅ custom-maker: 초기 로드 완료', editingPostId ? `(수정 ${editingPostId})` : '(신규)');
});

// ============================================================
// JSON 다운로드 (사용자가 원하는 정확한 형식)
// ============================================================
function downloadAllTiersAsJSON() {
  const result = {
    "티어표 명단 목록": {}
  };

  // 1~9티어까지 순회
  for (let i = 0; i < tierData.length; i++) {
    const tierNum = i + 1;
    const tierKey = `${tierNum}티어`;
    result["티어표 명단 목록"][tierKey] = {};

    // 해당 tier의 subTiers (갑급, 을급 등)
    const tierIndex = i;
    tierData[i].subTiers.forEach(subName => {
      const storageKey = `${tierIndex}_${subName}`;
      const chars = tierState[storageKey] || [];
      
      // 이름만 배열로 저장
      result["티어표 명단 목록"][tierKey][subName] = chars.map(c => c.name);
    });
  }

  // JSON 문자열로 변환 (예쁘게 들여쓰기)
  const jsonString = JSON.stringify(result, null, 2);
  
  // 다운로드
  const blob = new Blob([jsonString], { type: 'application/json' });
  const link = document.createElement('a');
  link.download = 'human-bug-tier-custom.json';
  link.href = URL.createObjectURL(blob);
  link.click();

  console.log('✅ JSON 다운로드 완료');
}

// ============================================================
// 게시판 업로드 / 수정 (로그인 필수, 수정은 본인 글만)
// ============================================================
/** 수정 모드 게시글 id (null이면 신규 업로드) */
let editingPostId = null;
let editingDefaults = { title: '', description: '' };
const EDIT_POST_SESSION_KEY = 'customMakerEditPost';

/** 전용 수정 페이지(post_edit.html) 여부 */
function isPostEditPage() {
  if (document.body?.dataset?.page === 'post-edit') return true;
  try {
    return /post_edit\.html/i.test(window.location.pathname || '');
  } catch (err) {
    return false;
  }
}

function getTierApiBase() {
  if (typeof getApiBase === 'function') {
    const base = getApiBase();
    if (base === 'GITHUB_STATIC') return 'GITHUB_STATIC';
    return base;
  }
  const { protocol, port } = window.location;
  if (
    protocol === 'file:' ||
    port === '5500' || port === '3000' || port === '5173' ||
    port === '8080' || port === '4200' || port === '8000'
  ) {
    return 'http://localhost:5000';
  }
  return '';
}

function getEditPostIdFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    // 전용 수정 페이지: ?id=  /  구 메이커: ?edit=
    return (params.get('id') || params.get('edit') || '').trim();
  } catch (err) {
    return '';
  }
}

function getEditPostIdFromSession() {
  try {
    const raw = sessionStorage.getItem(EDIT_POST_SESSION_KEY);
    if (!raw) return '';
    const data = JSON.parse(raw);
    return String(data?._id || data?.id || '').trim();
  } catch (err) {
    return '';
  }
}

function readEditPostFromSession(postId) {
  try {
    const raw = sessionStorage.getItem(EDIT_POST_SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    const sid = String(data?._id || data?.id || '');
    if (postId && sid && sid !== String(postId)) return null;
    return data;
  } catch (err) {
    return null;
  }
}

function clearEditPostSession() {
  try {
    sessionStorage.removeItem(EDIT_POST_SESSION_KEY);
  } catch (err) {
    /* ignore */
  }
}

function isAdminLoggedIn() {
  return localStorage.getItem('isAdmin') === 'true';
}

function getLoggedInUser() {
  // 일반 회원 세션 우선 (관리자 로그인이 있어도 본인 글 수정 가능하도록)
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (user?.nickname) {
      return { ...user, isAdmin: false };
    }
  } catch (err) {
    /* ignore */
  }

  if (isAdminLoggedIn()) {
    return {
      nickname: localStorage.getItem('adminName') || '관리자',
      email: '',
      isAdmin: true,
    };
  }

  return null;
}

function isPostOwner(post, user) {
  if (!post || !user) return false;
  const recordEmail = (post.authorEmail || '').trim().toLowerCase();
  const userEmail = (user.email || '').trim().toLowerCase();
  if (recordEmail && userEmail) {
    return recordEmail === userEmail;
  }
  return (post.author || '').trim() === (user.nickname || '').trim();
}

function clearEditModeFromUrl() {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('edit');
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
  } catch (err) {
    /* ignore */
  }
}

function updateEditModeChrome() {
  const titleEl = document.querySelector('.maker-container h1');
  let banner = document.getElementById('edit-mode-banner');
  const detailHref =
    typeof buildTierPostDetailUrl === 'function'
      ? buildTierPostDetailUrl(editingPostId)
      : `custom-maker_post/post_detail.html?id=${encodeURIComponent(editingPostId || '')}`;

  if (!editingPostId) {
    if (banner) banner.hidden = true;
    if (titleEl && titleEl.dataset.editTitle === '1' && !isPostEditPage()) {
      titleEl.innerHTML = `<img src="../tier-image/human_bug_eyes_icon.gif" class="eyes_icon" alt=""> 커스텀 티어 메이커`;
      delete titleEl.dataset.editTitle;
    }
    if (!isPostEditPage()) document.title = '커스텀 티어 메이커';
    return;
  }

  if (titleEl) {
    titleEl.dataset.editTitle = '1';
    titleEl.innerHTML = `<img src="../tier-image/human_bug_eyes_icon.gif" class="eyes_icon" alt=""> 게시글 수정`;
  }
  document.title = `게시글 수정 - ${editingDefaults.title || '커스텀 티어'}`;

  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'edit-mode-banner';
    banner.className = 'edit-mode-banner';
    const help = document.querySelector('.mobile-maker-help');
    if (help?.parentNode) {
      help.parentNode.insertBefore(banner, help.nextSibling);
    } else {
      document.querySelector('.maker-container')?.prepend(banner);
    }
  }
  banner.hidden = false;
  banner.innerHTML = `
    <strong>✏️ 게시글 수정</strong>
    <span>「${escapeHtmlLite(editingDefaults.title || '제목 없음')}」 게시 티어표를 불러왔습니다. 수정 후 <b>수정완료</b>를 누르세요.</span>
    <a href="${detailHref}">← 상세로</a>
  `;
}

function escapeHtmlLite(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * 게시글 데이터를 메이커 상태에 반영
 * @returns {boolean} 성공 여부
 */
async function enterEditMode(postId) {
  const user = getLoggedInUser();
  if (!user) {
    if (confirm('게시글을 수정하려면 로그인이 필요합니다.\n로그인 페이지로 이동할까요?')) {
      window.location.href = (typeof getBasePath === 'function' ? getBasePath() : '../') + 'user_login/login.html';
    } else {
      clearEditModeFromUrl();
      clearEditPostSession();
    }
    return false;
  }

  const apiBase = getTierApiBase();
  if (apiBase === 'GITHUB_STATIC') {
    alert('정적 호스팅에서는 게시글 수정을 할 수 없습니다. Render 등 API 서버 주소에서 이용해주세요.');
    clearEditModeFromUrl();
    clearEditPostSession();
    return false;
  }

  let post = null;

  // 1) 상세에서 넘긴 스냅샷 (즉시 복원, 네트워크 실패 대비)
  const cached = readEditPostFromSession(postId);
  if (cached?.tierData) {
    post = cached;
  }

  // 2) 서버에서 최신본 조회 (성공 시 덮어씀)
  try {
    const headers = typeof getAuthHeaders === 'function' ? getAuthHeaders() : {};
    const response = await fetch(`${apiBase}/api/tierlists/${encodeURIComponent(postId)}`, {
      headers,
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok && data) {
      post = data;
    } else if (!post) {
      alert(data.error || '게시글을 불러오지 못했습니다.');
      clearEditModeFromUrl();
      clearEditPostSession();
      return false;
    }
  } catch (err) {
    console.error(err);
    if (!post) {
      alert('게시글을 불러오지 못했습니다. 서버 연결을 확인해주세요.');
      clearEditModeFromUrl();
      clearEditPostSession();
      return false;
    }
  }

  if (!isPostOwner(post, user)) {
    alert('본인 게시글만 수정할 수 있습니다.');
    clearEditModeFromUrl();
    clearEditPostSession();
    return false;
  }

  editingPostId = String(post._id || post.id || postId);
  editingDefaults = {
    title: post.title || '',
    description: post.description || '',
  };

  const rawState = post.tierData?.tierState;
  if (rawState && typeof rawState === 'object') {
    // 과거 랜덤 id로 저장된 배치 → 이름 기준으로 카탈로그 id에 재매핑
    tierState = rematchTierStateToCatalog(rawState);
    saveToLocalStorage();
  } else {
    tierState = {};
  }

  const placedCount = Object.values(tierState).reduce(
    (n, arr) => n + (Array.isArray(arr) ? arr.length : 0),
    0
  );
  console.log(`✏️ 수정 모드: id=${editingPostId}, 배치 캐릭터 ${placedCount}명`);

  updateEditModeChrome();
  return true;
}

function hasPlacedCharacters() {
  return Object.values(tierState).some(arr => Array.isArray(arr) && arr.length > 0);
}

function getThumbnailFromState() {
  for (const arr of Object.values(tierState)) {
    if (!Array.isArray(arr)) continue;
    for (const char of arr) {
      if (char?.img) return char.img;
    }
  }
  return '../tier-image/logo.webp';
}

function normalizeImgForBoard(img) {
  if (!img) return '/tier-image/logo.webp';

  try {
    if (img.startsWith('http')) {
      return new URL(img).pathname;
    }
  } catch (err) {
    console.warn('이미지 URL 정규화 실패:', img);
  }

  if (img.startsWith('/')) return img;
  if (img.startsWith('../')) return '/' + img.replace(/^\.\.\//, '');
  return '/' + img;
}

function normalizeTierStateForUpload(state) {
  const normalized = {};
  Object.entries(state).forEach(([key, chars]) => {
    normalized[key] = (chars || []).map(c => ({
      ...c,
      img: normalizeImgForBoard(c.img),
    }));
  });
  return normalized;
}

function buildUploadPayload(title, description, user) {
  const normalizedState = normalizeTierStateForUpload(tierState);

  return {
    title: title.trim(),
    description: (description || '').trim(),
    tierData: {
      tierState: normalizedState,
      tierDefinitions: tierData.map(t => ({ id: t.id, title: t.title, subTiers: t.subTiers })),
    },
    author: user.nickname,
    authorEmail: user.email || '',
    thumbnail: normalizeImgForBoard(getThumbnailFromState()),
    isPublic: true,
  };
}

async function uploadToBoard() {
  const user = getLoggedInUser();
  if (!user) {
    if (confirm(
      editingPostId
        ? '게시글을 수정하려면 로그인이 필요합니다.\n로그인 페이지로 이동할까요?'
        : '게시판에 업로드하려면 로그인이 필요합니다.\n로그인 페이지로 이동할까요?'
    )) {
      window.location.href = (typeof getBasePath === 'function' ? getBasePath() : '../') + 'user_login/login.html';
    }
    return;
  }

  if (getTierApiBase() === 'GITHUB_STATIC') {
    alert('정적 호스팅에서는 업로드·수정을 할 수 없습니다.');
    return;
  }

  saveCurrentTierState();

  if (!hasPlacedCharacters()) {
    alert(
      editingPostId
        ? '티어에 배치된 캐릭터가 없습니다.\n캐릭터를 배치한 후 저장해주세요.'
        : '티어에 배치된 캐릭터가 없습니다.\n캐릭터를 배치한 후 업로드해주세요.'
    );
    return;
  }

  const defaultTitle = editingPostId
    ? editingDefaults.title || `${user.nickname}의 커스텀 티어표`
    : `${user.nickname}의 커스텀 티어표`;
  const title = prompt(
    editingPostId || isPostEditPage()
      ? '수정 완료할 제목을 입력해주세요.'
      : '게시판에 올릴 제목을 입력해주세요.',
    defaultTitle
  );
  if (!title?.trim()) return;

  const description = prompt(
    editingPostId || isPostEditPage()
      ? '설명을 수정해주세요. (선택)'
      : '간단한 설명을 입력해주세요. (선택, 취소 가능)',
    editingPostId ? (editingDefaults.description || '') : ''
  ) || '';

  const isEdit = Boolean(editingPostId);
  const url = isEdit
    ? `${getTierApiBase()}/api/tierlists/${encodeURIComponent(editingPostId)}`
    : `${getTierApiBase()}/api/tierlists`;
  const method = isEdit ? 'PUT' : 'POST';

  try {
    const headers = typeof getAuthHeaders === 'function'
      ? getAuthHeaders()
      : { 'Content-Type': 'application/json' };

    const response = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(buildUploadPayload(title, description, user)),
    });

    const data = await response.json();

    if (!response.ok) {
      alert('❌ ' + (data.error || (isEdit ? '수정에 실패했습니다.' : '업로드에 실패했습니다.')));
      return;
    }

    if (isEdit) {
      editingDefaults = { title: title.trim(), description: (description || '').trim() };
      clearEditPostSession();
      // 상세 URL 조합 오류로 "잘못된 접근입니다"가 뜨지 않도록 게시판 목록으로 이동
      alert('✅ 게시글 수정이 완료되었습니다.');
      window.location.href = getCustomMakerBoardUrl();
      return;
    }

    if (confirm('✅ 게시판에 업로드되었습니다!\n게시판으로 이동할까요?')) {
      window.location.href = getCustomMakerBoardUrl();
    }
  } catch (err) {
    console.error(err);
    alert('❌ 서버에 연결할 수 없습니다. backend에서 npm start를 실행해주세요.');
  }
}

/** 커스텀 메이커 게시판 목록 URL (현재 경로 깊이에 맞게) */
function getCustomMakerBoardUrl() {
  const base = typeof getBasePath === 'function' ? getBasePath() : '';
  return `${base}custom-maker/custom-maker_post/custom-maker_post.html`;
}

function updateUploadButtonState() {
  const uploadBtn = document.getElementById('upload-btn');
  if (!uploadBtn) return;

  const user = getLoggedInUser();
  const textEl = uploadBtn.querySelector('.btn-text');
  const iconEl = uploadBtn.querySelector('.btn-icon');

  // 전용 수정 페이지 또는 수정 모드: 항상 「수정완료」
  if (editingPostId || isPostEditPage()) {
    if (textEl) textEl.textContent = '수정완료';
    if (iconEl) iconEl.textContent = '✓';
    uploadBtn.classList.add('btn-edit-done');
    uploadBtn.title = user
      ? `${user.nickname} 계정으로 이 게시글 수정을 완료합니다.`
      : '로그인 후 게시글을 수정할 수 있습니다.';
  } else {
    if (textEl) textEl.textContent = '업로드';
    if (iconEl) iconEl.textContent = '🔗';
    uploadBtn.classList.remove('btn-edit-done');
    uploadBtn.title = user
      ? `${user.nickname} 계정으로 게시판에 업로드합니다.`
      : '로그인 후 게시판에 업로드할 수 있습니다.';
  }
  uploadBtn.disabled = false;
}

const uploadBtnEl = document.getElementById('upload-btn');
if (uploadBtnEl) {
  uploadBtnEl.addEventListener('click', uploadToBoard);
}