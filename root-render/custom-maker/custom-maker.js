// custom-maker/custom-maker.js
// 이 파일은 custom-maker.html(신규 제작)과 post_edit.html(본인 글 수정) 양쪽에서 공유해서 쓴다.
// 핵심 데이터 모델은 tierState: { "티어인덱스_세부등급이름": [캐릭터, ...] } 형태의 객체 하나로
// "지금 어느 캐릭터가 어느 칸에 놓여있는지"를 전부 표현한다. 화면(DOM)은 이 tierState를 반영해
// 매번 다시 그리는 방식(state → DOM)과, 사용자가 드래그/탭으로 옮기면 DOM에서 다시 state로
// 역으로 읽어들이는 방식(DOM → state)을 함께 쓴다.
let currentTierIndex = 0;

// ─── 전역 상태 ───────────────────────────────────────────────
let tierState = {};
const STORAGE_KEY = 'customMakerTierState';

// tierState 전체를 localStorage에 그대로 저장 (새로고침해도 배치가 안 날아가게)
function saveToLocalStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tierState));
}

// 페이지 로드 시 localStorage에 저장된 tierState를 복원 (신규 제작 모드에서만 사용,
// 수정 모드는 서버에서 받은 게시글 데이터로 tierState를 덮어쓰므로 이 함수를 쓰지 않음)
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

// 캐릭터 이름으로부터 항상 같은 id를 만들어내는 함수 (이름 → "char-이름" 슬러그).
// 예전에는 로드할 때마다 랜덤 id를 부여했는데, 그러면 게시글을 수정하려고 다시 열었을 때
// 저장된 배치(id 기준)와 새로 불러온 캐릭터 목록(새 랜덤 id)이 일치하지 않아 복원이 깨졌다.
// 이름 기반 안정 id로 바꿔서 언제 다시 로드하든 같은 캐릭터는 같은 id를 갖게 했다.
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

// 화면에 보여줄 전체 티어 등급 정의(9개 등급 x 세부 등급). tier-class 1~9 페이지와 제목/구성이 동일.
let allCharacters = [];

// ─── 캐릭터 엘리먼트 생성 헬퍼 ──────────────────────────────
// ✅ 공통 함수로 분리: createCharElement
// 이벤트는 enableDragAndDrop()에서 한 번에 위임하므로 여기선 draggable만 설정
// (풀에 있든 티어 칸에 있든 이 함수 하나로 카드 DOM을 만들고, 클릭/드래그 리스너는
//  각 카드마다 따로 안 붙이고 상위 컨테이너에 위임해서 성능·재등록 문제를 피한다)
function createCharElement(char) {
  const div = document.createElement('div');
  div.className = 'char';
  div.draggable = true;
  div.dataset.id = char.id;

  // 이미지 경로 보정: '/'로 시작하면 getBasePath()를 앞에 붙여 배포 경로 깊이에 맞추고,
  // http로 시작하는 절대 URL은 그대로 두고, 그 외 상대경로도 base를 붙여준다.
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
// 이 사이트에는 별도의 "캐릭터 목록 API"가 없다. 대신 공식 티어표(tier-class/tier1~9.html)
// 정적 HTML 자체를 fetch로 받아와 DOMParser로 파싱해서 .char 카드들을 긁어오는 방식으로
// 캐릭터 풀을 구성한다. 즉 tier-class 페이지가 캐릭터 원본 데이터 소스 역할을 한다.
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
// 현재 currentTierIndex에 해당하는 등급(예: "1등급")의 세부 등급 칸(.tier/.characters)을
// tierData 정의에 맞춰 새로 그리고, tierState에 저장된 배치를 loadTierStateToDOM()으로 복원한다.
// ← / → 버튼을 누르거나 초기 로드 시 항상 이 함수가 호출된다.
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

// 화면 아래쪽 "전체 캐릭터 풀"을 다시 그린다. 모든 등급에 걸쳐 이미 배치된 캐릭터는
// (지금 보고 있는 등급이 아니어도) 풀에서 제외해서, 같은 캐릭터를 중복 배치하지 못하게 막는다.
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
// 드래그 중인 카드를 마우스 좌표(x, y) 기준으로 "어느 카드 앞에 끼워넣을지" 계산한다.
// 카드들은 flex-wrap으로 줄바꿈되므로 단순히 y좌표만 볼 수 없다:
//   - sameRow: 대상 카드와 세로로 거의 같은 줄(높이의 75% 이내 차이)에 있으면 "같은 행"으로 보고
//     좌우(x) 비교로 앞/뒤를 판단, 다른 행이면 상하(y) 비교로 판단.
//   - 후보 중 마우스 포인터와 유클리드 거리(Math.hypot)가 가장 가까운 카드를 "삽입 기준점"으로 선택.
//   - 반환값이 null이면 그 컨테이너의 맨 끝에 추가한다는 뜻 (dragover 핸들러에서 처리).
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
// 드래그 중 마우스 포인터가 화면 위/아래 80px 이내로 들어가면 setInterval로 페이지를 자동
// 스크롤해서, 화면 밖에 있는 티어 칸까지도 드래그로 옮길 수 있게 한다. dragover가 계속
// 발생하는 동안만 스크롤을 유지하고(중복 setInterval 방지용 scrollInterval 플래그),
// 영역을 벗어나거나 드래그가 끝나면(dragend) 즉시 정지한다.
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
// 등급 이동 전 반드시 saveCurrentTierState()로 지금 보고 있는 등급의 배치를 tierState에
// 먼저 저장해야, renderTier()가 DOM을 갈아엎어도 데이터가 유실되지 않는다.
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
// 티어 칸에서 풀로 캐릭터를 되돌릴 때, 풀 맨 끝에 그냥 붙이면 매번 순서가 뒤죽박죽이 된다.
// allCharacters(원본 로드 순서)에서 이 캐릭터의 인덱스를 찾고, 현재 풀에 있는 카드들 중
// "원본 순서상 이 캐릭터보다 뒤에 있어야 할 첫 카드" 앞에 끼워 넣어서 항상 일관된 정렬을 유지한다.
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
// 다운로드 버튼 클릭 → 드롭다운 메뉴(.dropdown-menu) 토글. 메뉴 바깥을 클릭하면 자동으로 닫히도록
// document 전체에 클릭 리스너를 하나 더 걸어둔다(이벤트 위임으로 "바깥 클릭" 감지).
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

// 드롭다운 항목(PNG/PDF/JSON) 클릭 시 각 형식에 맞는 다운로드 함수를 실행
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
// 등급이 9개나 되고 한 화면엔 하나씩만 보이므로, "지금 보이는 화면"이 아니라
// 9개 등급을 전부 하나씩 renderTier()로 바꿔가며 각각 캡처해서 tier-1.png ~ tier-9.png로
// 총 9장을 순서대로 다운로드한다. 렌더링 후 바로 캡처하면 이미지 로드가 덜 끝난 상태일 수
// 있어서 setTimeout으로 약간의 대기 시간을 두는 방어적 처리가 곳곳에 들어가 있다.
async function downloadAllTiersAsPNG() {
  saveCurrentTierState();
  const originalTierIndex = currentTierIndex;
  const tierListElement = document.getElementById('tier-list');
  if (!tierListElement) { alert('티어 테이블을 찾을 수 없습니다.'); return; }

  for (let i = 0; i < tierData.length; i++) {
    currentTierIndex = i;
    renderTier();
    await new Promise(r => setTimeout(r, 450)); // 렌더링·이미지 로드가 끝날 시간을 벌어준다

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

  currentTierIndex = originalTierIndex; // 원래 보고 있던 등급으로 화면 복귀
  renderTier();
}

// ─── PDF 다운로드 ─────────────────────────────────────────────
// PNG와 같은 방식으로 9개 등급을 순회하며 캡처하되, 이번엔 낱장 이미지가 아니라 jsPDF로
// A4 세로 페이지에 한 등급씩 이어붙여 all-tiers.pdf 한 파일로 합친다.
// PNG와 달리 캡처 대상은 #tier-capture-area(테두리·배경 포함 영역)이고, 캡처 직전에
// 등급 제목(h2)을 임시로 DOM에 끼워넣었다가 캡처 후 바로 제거해서 PDF 페이지 안에
// "몇 등급인지" 제목이 함께 찍히게 하는 트릭을 쓴다.
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
      // 캡처 직전에만 제목(h2)을 맨 앞에 임시 삽입 → 캡처 → 바로 제거 (실제 DOM 구조는 그대로 유지)
      const titleText = document.getElementById('tier-title').textContent;
      const tempTitle = document.createElement('h2');
      tempTitle.textContent = titleText;
      tempTitle.style.cssText = 'color:#ffcc00; text-align:center; margin:0 0 10px; font-size:1.1rem; padding:10px 0;';
      tierListElement.insertBefore(tempTitle, tierListElement.firstChild);

      const canvas = await html2canvas(tierListElement, { scale: 2, backgroundColor: '#111111', logging: false });
      tierListElement.removeChild(tempTitle);

      // 캡처한 캔버스를 A4 폭(210mm)에 맞춰 비율 유지로 축소, 페이지별로 이어붙임
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
// 진입 흐름:
//   1) 구버전 링크(?edit=ID)로 들어왔으면 전용 수정 페이지(post_edit.html)로 리다이렉트
//   2) 캐릭터 풀을 tier-class에서 로드
//   3) 수정 페이지면 서버에서 게시글을 불러와 tierState를 채움(enterEditMode),
//      아니면 localStorage에 저장해둔 이전 작업 상태를 복원
//   4) 티어 화면·풀을 그리고, 드래그/탭 이벤트를 등록
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
  initPoolMaxWindow();
  updateUploadButtonState();
  updateEditModeChrome();
  console.log('✅ custom-maker: 초기 로드 완료', editingPostId ? `(수정 ${editingPostId})` : '(신규)');
});

// ============================================================
// 캐릭터 풀 뷰포트 화살표
// 풀이 화면에 들어오면 ▲▼ 표시. PNG 캡처(#tier-capture-area) 밖.
// ▲ = 티어표로, ▼ = 풀 맨 아래. (예전 전체화면 최대화는 쓰지 않음)
// ============================================================
function initPoolMaxWindow() {
  const wrap = document.querySelector('.character-pool');
  const arrows = document.getElementById('pool-viewport-arrows');
  const up = document.getElementById('pool-max-up');
  const down = document.getElementById('pool-max-down');
  const tierTable = document.getElementById('tier-capture-area') || document.getElementById('tier-list');
  const innerPool = document.getElementById('character-pool');
  if (!wrap || !arrows || !up || !down) return;

  function syncArrows(show) {
    document.body.classList.toggle('pool-arrows-on', show);
    arrows.hidden = !show;
  }

  function scrollToEl(el, block) {
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: block || 'start' });
  }

  // ▲ 티어 보드로
  up.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    wrap.classList.remove('is-max');
    document.body.classList.remove('pool-is-max');
    scrollToEl(tierTable, 'start');
  });

  // ▼ 풀 래퍼 끝 + 안쪽 스크롤 맨 아래
  down.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    wrap.classList.remove('is-max');
    document.body.classList.remove('pool-is-max');
    scrollToEl(wrap, 'end');
    if (innerPool) innerPool.scrollTop = innerPool.scrollHeight;
  });

  if (typeof IntersectionObserver === 'function') {
    const io = new IntersectionObserver((entries) => {
      syncArrows(entries.some((en) => en.isIntersecting));
    }, { threshold: 0, rootMargin: '120px 0px 80px 0px' });
    io.observe(wrap);
  } else {
    syncArrows(true);
  }
}

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
let editingDefaults = { title: '', description: '', thumbnail: '' };
let pendingThumbnailDataUrl = null;
const EDIT_POST_SESSION_KEY = 'customMakerEditPost';

/** 전용 수정 페이지(post_edit.html) 여부 */
// body의 data-page 속성(post_edit.html에서 "post-edit"로 지정) 또는 URL 파일명으로 판별한다.
// 이 값에 따라 업로드 버튼 라벨(업로드 vs 수정완료), 페이지 타이틀 등이 달라진다.
function isPostEditPage() {
  if (document.body?.dataset?.page === 'post-edit') return true;
  try {
    return /post_edit\.html/i.test(window.location.pathname || '');
  } catch (err) {
    return false;
  }
}

// 게시글 API(/api/tierlists) 호출용 서버 주소. common.js의 getApiBase()가 있으면 그걸 그대로 쓰고,
// 없는 예외 상황에 대비해 동일한 로직을 로컬 fallback으로 한 번 더 갖고 있다.
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

// URL 쿼리에서 수정할 게시글 id를 읽는다. 전용 수정 페이지는 ?id=, 구버전 메이커는 ?edit= 사용
function getEditPostIdFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    // 전용 수정 페이지: ?id=  /  구 메이커: ?edit=
    return (params.get('id') || params.get('edit') || '').trim();
  } catch (err) {
    return '';
  }
}

// 게시글 상세 페이지에서 "수정하기"를 눌러 넘어온 경우, sessionStorage에 저장해둔 스냅샷에서
// 게시글 id만 뽑아낸다 (URL에 id가 없을 때의 보조 경로)
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

// post_detail.js / custom-maker_post.js가 "수정하기" 클릭 시 sessionStorage에 저장해둔
// 게시글 스냅샷(customMakerEditPost)을 읽어온다. 네트워크 요청 없이 즉시 화면을 채울 수 있어서
// enterEditMode()가 서버 응답을 기다리는 동안의 초기값으로 쓰인다.
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

// 수정 완료/이탈 시 더 이상 필요 없는 스냅샷을 정리 (다음 진입 때 엉뚱한 글이 복원되지 않도록)
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

// 현재 로그인한 사용자 정보를 반환. 일반 회원 로그인을 관리자 로그인보다 우선시해서,
// 관리자 계정으로도 로그인되어 있는 브라우저에서 일반 회원 자격으로 본인 글을 수정할 수 있게 한다.
// 일반 회원 세션이 없을 때만 관리자 세션(닉네임 없이 "관리자"로 표시)으로 대체한다.
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

// 게시글 작성자 == 현재 로그인 사용자인지 판별 (수정/삭제 버튼 노출 여부 결정).
// 이메일이 둘 다 있으면 이메일로 정확히 비교하고, 없으면 닉네임 문자열 비교로 대체한다.
// 닉네임 비교는 동명이인 위험이 있지만, 과거 게시글에 이메일이 없던 시절 데이터와의
// 하위 호환을 위해 의도적으로 남겨둔 완화된 검증이다 (서버도 동일 로직으로 최종 검증함).
function isPostOwner(post, user) {
  if (!post || !user) return false;
  const recordEmail = (post.authorEmail || '').trim().toLowerCase();
  const userEmail = (user.email || '').trim().toLowerCase();
  if (recordEmail && userEmail) {
    return recordEmail === userEmail;
  }
  const recordAuthor = (post.author || '').trim();
  const userName = (user.nickname || '').trim();
  return Boolean(recordAuthor && userName && recordAuthor === userName);
}

// 구버전 ?edit= 쿼리를 URL에서 제거 (로그인 취소 등으로 수정 진입을 포기했을 때 주소창 정리)
function clearEditModeFromUrl() {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('edit');
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
  } catch (err) {
    /* ignore */
  }
}

// 수정 모드 여부에 따라 h1 제목, 문서 title, 상단 안내 배너(edit-mode-banner)를 갱신한다.
// editingPostId가 설정되어 있으면(=enterEditMode 성공) "게시글 수정" 화면으로 꾸미고,
// 아니라면 원래의 "커스텀 티어 메이커" 화면으로 되돌린다. 배너 DOM이 없으면 새로 만들어 삽입.
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
      titleEl.innerHTML = `<img src="../tier-media/tier-image/human_bug_eyes_icon.gif" class="eyes_icon" alt=""> 커스텀 티어 메이커`;
      delete titleEl.dataset.editTitle;
    }
    if (!isPostEditPage()) document.title = '커스텀 티어 메이커';
    return;
  }

  if (titleEl) {
    titleEl.dataset.editTitle = '1';
    titleEl.innerHTML = `<img src="../tier-media/tier-image/human_bug_eyes_icon.gif" class="eyes_icon" alt=""> 게시글 수정`;
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

// updateEditModeChrome()의 innerHTML 삽입에 쓰이는 게시글 제목을 이스케이프해서
// 제목에 <, > 등이 들어 있어도 HTML로 해석되지 않게 방지 (간이 XSS 방지용)
function escapeHtmlLite(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * 게시글 데이터를 메이커 상태에 반영
 * 흐름: 로그인 확인 → (1) sessionStorage 스냅샷으로 즉시 화면 채움(네트워크 실패 대비)
 *   → (2) 서버에서 최신 게시글을 다시 조회해 있으면 덮어씀 → 작성자 본인인지 검사(isPostOwner) →
 *   과거 랜덤 id로 저장된 배치를 현재 캐릭터 카탈로그 id로 재매핑(rematchTierStateToCatalog).
 * 작성자 검사는 프론트 UX용 가드일 뿐이며, 실제 수정 권한은 PUT 요청 시 서버가 최종 검증한다.
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
    thumbnail: post.thumbnail || '',
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

// 업로드/수정 전 최소 조건 확인용: 어느 등급에든 캐릭터가 하나라도 배치되어 있는지
function hasPlacedCharacters() {
  return Object.values(tierState).some(arr => Array.isArray(arr) && arr.length > 0);
}

// 업로드 모달에서 사용자가 썸네일을 따로 고르지 않았을 때 쓸 기본 썸네일.
// tierState를 순회하며 맨 처음 발견되는 배치 캐릭터의 이미지를 대표 이미지로 사용하고,
// 아무것도 배치되어 있지 않으면 사이트 로고로 대체한다.
function getThumbnailFromState() {
  for (const arr of Object.values(tierState)) {
    if (!Array.isArray(arr)) continue;
    for (const char of arr) {
      if (char?.img) return char.img;
    }
  }
  return '../tier-media/tier-image/logo.webp';
}

// 서버(DB)에 저장할 이미지 경로를 "루트 기준 절대경로"(/tier-media/tier-image/...)로 통일한다.
// 화면에 보여줄 때는 getBasePath()로 상대경로화하지만, DB에는 배포 경로 깊이와 무관하게
// 항상 동일한 절대경로 형태로 저장해야 나중에 어느 페이지에서 불러오든 일관되게 보정할 수 있다.
// data URL(base64로 인코딩한 업로드 이미지)은 그대로 보존, http 절대 URL은 pathname만 추출.
function normalizeImgForBoard(img) {
  if (!img) return '/tier-media/tier-image/logo.webp';
  if (img.startsWith('data:image/')) return img;

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

// 업로드/수정 payload를 만들기 전, tierState 안의 모든 캐릭터 이미지 경로를
// normalizeImgForBoard()로 일괄 정규화한다 (서버에는 항상 절대경로만 저장되도록)
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

// POST(신규 업로드)/PUT(수정) 공용으로 서버에 보낼 요청 본문을 조립한다.
// tierData 안에 tierState(배치 결과)와 tierDefinitions(등급 정의 스냅샷)를 함께 저장해두면,
// 나중에 tierData 구조 자체가 바뀌어도 이 게시글은 작성 당시 정의 그대로 재현할 수 있다.
function buildUploadPayload(title, description, user, thumbnail) {
  const normalizedState = normalizeTierStateForUpload(tierState);
  const thumb = thumbnail || getThumbnailFromState();

  return {
    title: title.trim(),
    description: (description || '').trim(),
    tierData: {
      tierState: normalizedState,
      tierDefinitions: tierData.map(t => ({ id: t.id, title: t.title, subTiers: t.subTiers })),
    },
    author: user.nickname,
    authorEmail: user.email || '',
    thumbnail: normalizeImgForBoard(thumb),
    isPublic: true,
  };
}

// normalizeImgForBoard()와 반대 방향: DB에 저장된 루트 절대경로(/tier-media/tier-image/...)를
// 업로드 모달 미리보기(<img>)에서 화면에 실제로 보이도록 getBasePath() 깊이를 붙여 되돌린다.
// 폴더 구조가 두 번 바뀌었으므로(① tier-image → ② tier-media → ③ tier-media/tier-image, 2026-09)
// 게시글이 저장된 시점에 따라 옛 접두사가 세 가지 중 하나로 남아있을 수 있다.
// 표시 직전에 전부 최신 접두사로 보정해서 어느 시점에 만들어진 게시글이든 이미지가 깨지지 않게 한다.
function resolveMakerPreviewPath(path) {
  if (!path) return '../tier-media/tier-image/logo.webp';
  path = path.replace(/^(\.{2}\/|\/)?(?:tier-media\/tier-image\/|tier-image\/|tier-media\/)/, '$1tier-media/tier-image/');
  if (path.startsWith('data:') || path.startsWith('blob:') || path.startsWith('http')) return path;
  if (typeof getBasePath === 'function' && path.startsWith('/')) {
    return getBasePath() + path.slice(1);
  }
  return path;
}

// 업로드 모달을 열 때 썸네일 미리보기에 보여줄 이미지 우선순위:
// 1) 방금 사용자가 새로 고른 파일(pendingThumbnailDataUrl)
// 2) 수정 모드라면 게시글에 이미 저장돼 있던 썸네일
// 3) 둘 다 없으면 배치된 캐릭터 중 첫 번째 이미지로 자동 대체
function getDefaultThumbnailPreview() {
  if (pendingThumbnailDataUrl) return pendingThumbnailDataUrl;
  if (editingDefaults.thumbnail) return resolveMakerPreviewPath(editingDefaults.thumbnail);
  return resolveMakerPreviewPath(getThumbnailFromState());
}

// 사용자가 썸네일 파일을 직접 선택했을 때, 원본을 그대로 base64로 올리면 DB 문서가 너무
// 커지므로 <canvas>에 그려서 가로 최대 720px로 리사이즈 + JPEG 82% 압축한 data URL을 만든다.
// 압축 후에도 1.6MB를 넘으면(너무 복잡한 이미지) 업로드를 거부해서 DB 비대화를 막는다.
function compressImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file || !String(file.type || '').startsWith('image/')) {
      reject(new Error('이미지 파일만 선택할 수 있습니다.'));
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      reject(new Error('이미지는 8MB 이하로 올려주세요.'));
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const maxWidth = 720;
      const scale = Math.min(1, maxWidth / Math.max(1, img.width));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
      if (dataUrl.length > 1.6 * 1024 * 1024) {
        reject(new Error('이미지가 너무 큽니다. 더 작은 사진을 선택해주세요.'));
        return;
      }
      resolve(dataUrl);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('이미지를 읽지 못했습니다.'));
    };
    img.src = objectUrl;
  });
}

// 업로드/수정 모달 DOM을 처음 필요할 때 딱 한 번만 body에 생성해서 재사용한다(싱글턴 패턴).
// 이미 만들어져 있으면 그대로 반환, 없으면 마크업을 만들고 폼 이벤트(취소/제출/파일선택/썸네일리셋)를
// 이 안에서 한 번만 바인딩한다.
function ensureUploadModal() {
  let overlay = document.getElementById('upload-modal');
  if (overlay) return overlay;

  overlay = document.createElement('div');
  overlay.id = 'upload-modal';
  overlay.className = 'upload-modal-overlay';
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="upload-modal-card" role="dialog" aria-modal="true" aria-labelledby="upload-modal-heading">
      <h3 id="upload-modal-heading">게시판에 올리기</h3>
      <label class="upload-modal-field">
        <span>제목</span>
        <input id="upload-modal-title-input" type="text" maxlength="80" placeholder="게시글 제목">
      </label>
      <label class="upload-modal-field">
        <span>내용</span>
        <textarea id="upload-modal-content-input" maxlength="2000" placeholder="게시글 내용을 입력하세요"></textarea>
      </label>
      <div class="upload-modal-field">
        <span>썸네일 사진 (게시판 썸네일 사진)</span>
        <img id="upload-modal-thumb-preview" class="upload-modal-thumb-preview" alt="썸네일 미리보기">
        <div class="upload-modal-thumb-actions">
          <label class="upload-modal-file-btn">사진 선택
            <input id="upload-modal-thumb-input" type="file" accept="image/*" hidden>
          </label>
          <button type="button" id="upload-modal-thumb-reset" class="upload-modal-thumb-reset">기본 이미지</button>
        </div>
        <p class="upload-modal-hint">선택하지 않으면 배치된 첫 캐릭터 이미지가 사용됩니다.</p>
      </div>
      <div class="upload-modal-actions">
        <button type="button" id="upload-modal-cancel" class="upload-modal-cancel">취소</button>
        <button type="button" id="upload-modal-submit" class="upload-modal-submit">업로드</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeUploadModal();
  });
  overlay.querySelector('#upload-modal-cancel').addEventListener('click', closeUploadModal);
  overlay.querySelector('#upload-modal-submit').addEventListener('click', submitUploadFromModal);
  overlay.querySelector('#upload-modal-thumb-reset').addEventListener('click', () => {
    pendingThumbnailDataUrl = null;
    overlay.querySelector('#upload-modal-thumb-preview').src = resolveMakerPreviewPath(getThumbnailFromState());
  });
  overlay.querySelector('#upload-modal-thumb-input').addEventListener('change', async (event) => {
    const file = event.target.files && event.target.files[0];
    event.target.value = '';
    if (!file) return;
    try {
      pendingThumbnailDataUrl = await compressImageFile(file);
      overlay.querySelector('#upload-modal-thumb-preview').src = pendingThumbnailDataUrl;
    } catch (err) {
      alert(err.message || '썸네일을 읽지 못했습니다.');
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !overlay.hidden) closeUploadModal();
  });

  return overlay;
}

function closeUploadModal() {
  const overlay = document.getElementById('upload-modal');
  if (overlay) overlay.hidden = true;
  document.body.style.overflow = '';
}

// 모달을 열면서 제목/내용/썸네일 입력값을 신규 업로드 vs 수정 모드에 맞게 미리 채워 넣는다.
// 수정 모드면 기존 게시글 값(editingDefaults)으로 초기화, 신규면 "닉네임의 커스텀 티어표"로 기본 제안.
function openUploadModal(user) {
  const overlay = ensureUploadModal();
  const isEdit = Boolean(editingPostId || isPostEditPage());
  overlay.querySelector('#upload-modal-heading').textContent = isEdit ? '게시글 수정' : '게시판에 올리기';
  overlay.querySelector('#upload-modal-submit').textContent = isEdit ? '수정완료' : '업로드';
  overlay.querySelector('#upload-modal-title-input').value =
    (isEdit ? editingDefaults.title : '') || `${user.nickname}의 커스텀 티어표`;
  overlay.querySelector('#upload-modal-content-input').value = isEdit ? (editingDefaults.description || '') : '';
  pendingThumbnailDataUrl = null;
  overlay.querySelector('#upload-modal-thumb-preview').src = getDefaultThumbnailPreview();
  overlay.hidden = false;
  document.body.style.overflow = 'hidden';
  overlay.querySelector('#upload-modal-title-input').focus();
}

// "업로드"/"수정완료" 버튼 클릭 핸들러. 실제 서버 전송은 하지 않고, 로그인·정적호스팅·배치 여부를
// 검증한 뒤 업로드 모달을 여는 역할까지만 담당한다 (실제 fetch는 submitUploadFromModal에서).
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

  openUploadModal(user);
}

// 모달의 "업로드"/"수정완료" 버튼 클릭 시 실제 서버 요청을 보낸다.
// editingPostId 유무로 PUT(수정, 작성자만 서버가 허용)과 POST(신규 생성)를 나눠서 같은 payload
// 빌더(buildUploadPayload)를 재사용한다. 성공 시 수정이면 상세 페이지로, 신규면 게시판으로 이동.
async function submitUploadFromModal() {
  const user = getLoggedInUser();
  if (!user) return;

  const title = document.getElementById('upload-modal-title-input')?.value.trim();
  const description = document.getElementById('upload-modal-content-input')?.value.trim() || '';
  if (!title) {
    alert('제목을 입력해주세요.');
    document.getElementById('upload-modal-title-input')?.focus();
    return;
  }

  const thumbnail = pendingThumbnailDataUrl
    || editingDefaults.thumbnail
    || getThumbnailFromState();

  const isEdit = Boolean(editingPostId);
  const url = isEdit
    ? `${getTierApiBase()}/api/tierlists/${encodeURIComponent(editingPostId)}`
    : `${getTierApiBase()}/api/tierlists`;
  const method = isEdit ? 'PUT' : 'POST';
  const submitBtn = document.getElementById('upload-modal-submit');
  if (submitBtn) submitBtn.disabled = true;

  try {
    const headers = typeof getAuthHeaders === 'function'
      ? getAuthHeaders()
      : { 'Content-Type': 'application/json' };

    const response = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(buildUploadPayload(title, description, user, thumbnail)),
    });

    const data = await response.json();

    if (!response.ok) {
      alert('❌ ' + (data.error || (isEdit ? '수정에 실패했습니다.' : '업로드에 실패했습니다.')));
      return;
    }

    closeUploadModal();

    if (isEdit) {
      editingDefaults = {
        title: title.trim(),
        description,
        thumbnail,
      };
      clearEditPostSession();
      alert('✅ 게시글 수정이 완료되었습니다.');
      const detailUrl = typeof buildTierPostDetailUrl === 'function'
        ? buildTierPostDetailUrl(editingPostId)
        : `${getCustomMakerBoardUrl().replace(/custom-maker_post\.html$/i, 'post_detail.html')}?id=${encodeURIComponent(editingPostId)}`;
      try {
        sessionStorage.setItem('selectedPostId', editingPostId);
      } catch (err) {
        /* ignore */
      }
      window.location.href = detailUrl;
      return;
    }

    if (confirm('✅ 게시판에 업로드되었습니다!\n게시판으로 이동할까요?')) {
      window.location.href = getCustomMakerBoardUrl();
    }
  } catch (err) {
    console.error(err);
    alert('❌ 서버에 연결할 수 없습니다. backend에서 npm start를 실행해주세요.');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

/** 커스텀 메이커 게시판 목록 URL (현재 경로 깊이에 맞게) */
function getCustomMakerBoardUrl() {
  const base = typeof getBasePath === 'function' ? getBasePath() : '';
  return `${base}custom-maker/custom-maker_post/custom-maker_post.html`;
}

// 업로드 버튼의 라벨/아이콘/스타일/툴팁을 현재 모드(신규 vs 수정)와 로그인 여부에 맞춰 갱신한다.
// 전용 수정 페이지이거나 editingPostId가 세팅돼 있으면 항상 "수정완료"로 고정 표시한다.
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