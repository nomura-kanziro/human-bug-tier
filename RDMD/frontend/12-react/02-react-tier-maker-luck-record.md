---
area: frontend
---

# 커밋 요약 — React 공식 티어표(단일 페이지 navbar) · 커스텀 메이커 · 행운 뽑기 이식

## 개요

`root-cloudflare/`(React) 에서 지금까지 화면만 있고 실제 기능은 `root-render/`(바닐라)에만 있던 세 영역을 **React 내부 구현으로 직접 작성**했다.

1. **공식 티어표** — 바닐라의 9개 페이지(`tier1~9.html` + `tier1~9.css`)를 **한 페이지 + 내부 navbar** 로 합쳤다.
2. **커스텀 메이커** — 드래그/탭 배치, PNG·PDF·JSON 저장, 게시판 업로드까지 React 로 구현.
3. **행운 뽑기** — 확률표, 10초 서스펜스 연출, 회원 쿨다운/남은 횟수, 게스트 24시간, 이력.

정식 배포 단계가 아니라 **임시 확인용 제작**이며, 바닐라 정본과 Render 실무 배포는 그대로다.

## 관련 커밋

- **commit pending** (파트별 커밋 — commit_history 참고)

## 변경된 파일 목록

- Added: `root-cloudflare/src/styles/tier-board.css` (등급별 테마를 CSS 변수로 통합)
- Added: `root-cloudflare/src/data/tiers.js` (tiers.json → 등급·세부등급·캐릭터 풀 파생)
- Added: `root-cloudflare/src/lib/makerState.js`, `root-cloudflare/src/lib/loadScript.js`
- Added: `root-cloudflare/src/pages/CustomMaker.jsx`, `root-cloudflare/src/pages/LuckDraw.jsx`
- Modified: `root-cloudflare/src/pages/TierPage.jsx` (단일 페이지 navbar 방식으로 재작성)
- Modified: `root-cloudflare/src/App.jsx` (`/tier` → `/tier/1`, `/custom-maker`·`/luck-draw` 실제 페이지 연결)
- Added(복사): `root-cloudflare/src/styles/custom-maker.css`, `luck-draw.css`
- Removed: `root-cloudflare/src/styles/tier/tier1~9.css`, `tier-responsive.css` (tier-board.css 로 대체)
- Modified: `root-cloudflare/README.md`, `RDMD/features/react-rewrite.md`, `.agents`/`.claude` react-rewrite 스킬

## 주요 구현 내용

### 1. 공식 티어표 — 9페이지 → 1페이지 + navbar

- `TierPage` 하나가 `/tier/:n` 을 받아 렌더하고, navbar(1~9 + ← →)를 누르면 `navigate(..., { replace: true })` 로 **리마운트 없이 표만 교체**한다. URL 은 공유·새로고침용으로 계속 동기화되고, 등급 전환마다 뒤로가기 기록이 쌓이지 않는다. ← → 키보드 이동도 지원.
- 바닐라는 `tierN.css` 가 `body`/`main` 까지 정의해 페이지를 통째로 갈아끼워야 했다. 여기서는 **등급별로 다른 값만 CSS 변수로 뽑아** `tier-board.css` 의 `.tier-scope[data-tier="N"]` 블록 한 곳에 모았다.

```
.tier-scope[data-tier="3"] { --board-bg:#031049; --board-border:#ffcc00; --label-bg:#0a1f7e; … }
.tier-board { background: var(--board-bg); border: 2px solid var(--board-border); }
```

- 변수는 래퍼(`<main class="tier-scope">`)에 얹혀 **보드와 navbar 활성 탭이 같은 색을 공유**한다(색 정의가 두 군데로 갈라지지 않음).
- 1등급 보석 연출은 선택자에 등급을 고정(`[data-tier="1"] .tier-board::before`)해서 다른 등급으로 바꾸면 의사요소 자체가 사라진다 — 전환 시 잔상/꼬임 없음.
- 변수가 없는 등급이 들어와도 기본값(흑백)으로 그려져 깨지지 않는다.

**"이벤트로 바뀌어도 안 꼬이게"** 를 위한 구조: 등급 수·세부등급·캐릭터는 전부 `src/data/tiers.js`(= `tiers.json`, 바닐라 HTML 정본에서 생성)에서 파생하므로, 캐릭터를 추가·재배치해도 `npm run extract:tiers` 만 다시 돌리면 티어표와 커스텀 메이커가 동시에 따라온다. 컴포넌트·CSS 는 손댈 필요가 없다.

### 2. 커스텀 메이커 — 데이터 소스 교체 + React 상태로 재작성

- 바닐라는 캐릭터 풀을 만들려고 `tier1~9.html` 9개를 **fetch → DOMParser 파싱**했다. React 는 같은 정본 데이터를 이미 JSON 으로 갖고 있어 **네트워크 요청 0회**로 340명 풀을 즉시 만든다.
- 세부등급도 하드코딩하지 않고 JSON 에서 파생 — 그 덕에 바닐라 메이커에는 아직 없던 **5등급 정급**이 자동으로 나타난다(정의 어긋남이 구조적으로 발생하지 않는 것을 확인).
- 저장 형식은 바닐라와 동일하게 유지: `{ "<0-based 등급>_<세부등급>": [{id,name,img}] }`, localStorage 키 `customMakerTierState`. 게시판 DB 호환을 위해 바꾸지 않는다.
- 배치 방식 두 갈래(바닐라와 동일): PC 드래그(카드 위에 놓으면 그 앞에 삽입, 풀로 드롭하면 회수) / 모바일 탭 선택 → 칸 탭.
- **PNG/PDF 캡처 방식 개선**: 바닐라는 등급을 하나씩 바꿔가며 화면을 캡처해서 편집 화면이 9번 깜빡였다. React 는 화면 밖(`position:fixed; left:-99999px`)에 **전 등급을 한 번에 렌더한 export 컨테이너**를 만들고 순서대로 찍는다 — 편집 중인 화면은 그대로 유지되고 상태 되돌리기도 필요 없다. html2canvas/jsPDF 는 다운로드를 누를 때만 CDN 에서 1회 로드(`lib/loadScript.js`).
- 업로드는 `POST /api/tierlists` (제목·내용·썸네일). 썸네일 미선택 시 배치된 첫 캐릭터 이미지, 직접 고르면 720px·JPEG 82% 로 압축 후 base64.

### 3. 행운 뽑기

- 판정(하루 20회·3분 쿨다운·확률·포인트)은 **전부 서버**. 화면은 응답을 표시만 한다.
- 10초 서스펜스: 릴 숫자 90ms 순환 + 진행 바. 진행 바는 `drawing` 이 true 가 된 **뒤**에 DOM 이 생기므로 effect 에서 폭을 준다(0% 반영 → 강제 리플로우 → transition). ref 를 클릭 핸들러에서 바로 만지면 null 이라 애니메이션이 생략되던 것을 잡았다.
- 게스트는 `luckDrawGuestState`(홈 미니 위젯과 같은 키)로 24시간 안내만. 재방문 시 마지막 결과와 남은 시간을 복원한다.
- 결과 카드의 "공식 티어표에서 보기" 는 `<Link to={/tier/N}>` 로 내부 라우팅.

## 변경 전/후 (주요)

| 항목 | 변경 전 | 변경 후 |
|------|---------|---------|
| 공식 티어표 | HTML 9개 + CSS 9개, 등급 이동 = 페이지 새로고침 | 컴포넌트 1개 + CSS 1개, navbar 로 즉시 전환 |
| 등급별 색 정의 | `tierN.css` 9곳에 레이아웃과 섞여 중복 | `tier-board.css` 변수 블록 1곳 |
| 메이커 캐릭터 풀 | tier-class HTML 9개 fetch + DOM 파싱 | `tiers.js` 에서 즉시 파생 (요청 0회) |
| 메이커 세부등급 | `tierData` 하드코딩(5정 누락 상태) | JSON 파생 (자동 최신) |
| PNG/PDF 캡처 | 화면 등급을 9번 바꿔가며 캡처 | 화면 밖 export 컨테이너에서 캡처 |
| 뽑기 진행 바 | DOM 직접 조작 | `drawing` 상태 → effect |

## 테스트 체크리스트 (`:5000`, `npm run build` 후)

1. `/tier/3` → navbar 로 1·9티어 전환 — 배경/테두리/라벨 색이 등급 테마로 바뀌고, 1등급에서만 보석 애니메이션(`gem-sparkle`) ✅
2. 9등급 "미묘사 / 인원들" 두 줄 라벨, 50장 이미지 정상 로드 ✅
3. `/custom-maker` — 풀 340명, 탭 선택 → 칸 탭 배치, 배치된 카드 탭 → 풀 복귀, 등급 전환 후에도 배치 유지, localStorage 키 형식 확인 ✅
4. 다운로드 메뉴 PNG → 화면 밖 9개 보드 렌더 → 9장 저장 완료, 편집 화면 그대로 ✅ / JSON 저장 ✅
5. `/luck-draw` — 확률표 9행(서버 값), 뽑기 → 10초 릴+진행 바 → 결과 카드 → 게스트 24시간 카운트다운, 새로고침 후 복원 ✅
6. 결과 카드 "공식 티어표에서 보기" → `/tier/N` 내부 이동 ✅
7. `STATIC_ROOT=root-render` 로 켜면 바닐라 그대로 동작(회귀 없음)

## 향후 개선 제안

- 커스텀 메이커 **수정 모드**(`post_edit`)는 게시판 이식 때 함께 (지금은 신규 업로드만)
- 캐릭터 풀 검색/티어 필터 (340명이라 스크롤이 길다)
- 뽑기 이력 페이지네이션 (현재 서버가 최근 5건만 보관)
- `tiers.json` 자동 생성을 빌드 prebuild 훅으로 (지금은 수동 `npm run extract:tiers`)

---
문서 생성일: 2026-09-05
