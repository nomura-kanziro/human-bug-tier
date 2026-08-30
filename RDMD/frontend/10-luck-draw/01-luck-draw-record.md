---
source: luck-draw-기획서.md
area: frontend
---

# 커밋 요약 — 행운 뽑기(오늘의 행운 티어) 프론트 신설

## 개요

헤더/인덱스에 "준비 중" 자리만 있던 **행운 뽑기**를 실제 기능으로 연결했다. 1차 범위는 **오늘의 행운 티어**뿐이며, 랜덤 뽑기는 UI만 두고 계속 `(준비 중)`으로 남긴다. 확률·횟수 제한·결과는 전부 서버(`/api/luck-draw`)가 하고, 프론트는 표시·카운트다운·게스트 로컬 안내만 담당한다.

> **정책 변경(같은 세션 내)**: 최초엔 "1일 1회"였으나 이후 대화에서 **회원 하루 20회 + 3분 쿨다운**, **게스트는 24시간 안내(프론트 전용, 서버 미강제)** 로 바뀌었다. 이 문서는 최종 형태 기준.

## 관련 커밋

- **commit pending**
  - 제목: `feat(luck-draw): 오늘의 행운 티어 프론트 연동 및 게스트 체크 모드`

## 변경된 파일 목록

- Added: `luck-draw/luck-draw.html`
- Added: `luck-draw/luck-draw.css`
- Added: `luck-draw/luck-draw.js`
- Added: `luck-draw/luck-draw-api.js`
- Added: `luck-draw/README.md`
- Modified: `header.html` (데스크톱 드롭다운 + 사이드 메뉴, `행운 뽑기 > 오늘의 행운 티어` 링크 연결, `랜덤 뽑기`는 준비 중 유지)
- Modified: `index.html` (홈 퀵카드 "준비중..." → 실제 링크)

## 주요 구현 내용

### 1. 탭 구조 (`#daily` / `#random`)

`luck-draw.html` 은 해시 기반 탭 2개로 구성. 헤더/인덱스 링크는 `luck-draw/luck-draw.html#daily` 로 진입하며, `luck-draw.js`의 `activateTabFromHash()`가 `hashchange` 이벤트까지 반영한다.

### 2. API 연동 (`luck-draw-api.js`)

`getApiBase()`/`getAuthHeaders()`(공통 `common.js`)를 재사용하는 얇은 래퍼만 추가. `GITHUB_STATIC` 이면 요청 전에 예외를 던져 뽑기 버튼을 비활성화한다.

### 3. 게스트 — localStorage 24시간 안내 (클릭 시점에 서버 호출 전 차단)

`luckDrawGuestState`(`localStorage`, `{lastDrawAt, result}`)에 마지막 체크 시각을 저장한다. 버튼 클릭 시 `isGuestOnCooldown()` 이 24시간 이내인지 먼저 검사하고, 이내라면 `alert()` 로 "로그인하면 더 뽑을 수 있다 / 24시간 후 재시도"를 안내한 뒤 **API를 호출하지 않는다**. 24시간이 지났으면 정상적으로 `POST /daily` 를 호출하고 결과를 다시 `localStorage` 에 갱신한다. 페이지 로드 시에도 캐시가 있으면 결과 카드를 복원하고 남은 시간을 카운트다운으로 보여준다. (세션 간에도 유지해야 해서 기존 `sessionStorage` 대신 `localStorage` 로 교체.)

### 4. 회원 — 서버가 내려주는 횟수/쿨다운을 그대로 반영

`POST /daily` 성공 시 서버가 `remainingToday`, `cooldownRemainingSec` 를 함께 내려준다. 프론트는 이를 받아 `startCooldownCountdown()` 으로 버튼에 "다음 뽑기까지 mm:ss" 카운트다운을 표시하고, 0이 되면 자동으로 버튼을 다시 활성화한다(`loadStatus()` 로 `/today` 재조회). 429 응답(`limitReached` 또는 `cooldown`)은 `alert()` 로 사유를 안내하고 최신 상태를 다시 불러온다.

## 변경 전/후 (주요)

| 항목 | 변경 전 | 변경 후 |
|------|---------|---------|
| header.html 드롭다운 | `nav-soon` + `onclick="return false;"` | 실제 `<a href="luck-draw/luck-draw.html#daily">` |
| index.html 퀵카드 | `<p>준비중...</p>` | `custom-maker` 카드와 동일한 `sub-menu` 링크 패턴 |
| 랜덤 뽑기 | 준비 중 | **그대로 준비 중** (1차 범위 아님) |

## 테스트 체크리스트

1. 비로그인 → 뽑기 → 결과 카드 + "저장되지 않았습니다" 배지
2. 비로그인 24시간 내 재클릭 → alert만 뜨고 네트워크 요청 없음 (개발자도구로 확인)
3. 로그인 → 뽑기 → 결과 + 버튼이 3분 카운트다운으로 비활성화, 내 기록에 항목 추가
4. 3분 내 재요청 → 429(cooldown) alert, 3분 후 버튼 자동 재활성화
5. 20회 소진 후 재요청 → 429(limitReached) alert, "오늘 뽑기 횟수 소진" 문구
6. `tier-class/tier1.html` 처럼 깊은 페이지에서 헤더 진입 시 링크 경로 안 깨짐 (`getBasePath()`)
7. GitHub Pages(`GITHUB_STATIC`) → 뽑기 버튼 비활성화 + 안내 문구

## 향후 개선 제안

- 랜덤 뽑기(`mode:'random_char'`) 2차 구현
- 결과 카드 뒤집기 연출, 보관함(컬렉션) UI

---
문서 생성일: 2026-08-31
