---
area: frontend
---

# 커밋 요약 — 유저 프로필 드롭다운 + 마이페이지 신설

## 개요

로그인 후 헤더 프로필 아이콘을 클릭하면 전체 화면 모달이 뜨던 것을, 유튜브처럼 아바타 아래에 붙는 **드롭다운 패널**로 바꿨다. 드롭다운의 "마이페이지" 메뉴에서 내가 쓴 커스텀 게시글과 행운 뽑기 집계(총 횟수·최고 등급)를 한눈에 보는 새 페이지(`my-page/`)로 연결했다. 어드민 프로필은 기존 모달을 그대로 둔다(범위 밖).

## 관련 커밋

- **commit pending**

## 변경된 파일 목록

- Added: `my-page/my-page.html`
- Added: `my-page/my-page.css`
- Added: `my-page/my-page.js`
- Added: `my-page/README.md`
- Modified: `common.js` (`renderUserProfile`, 신규 `toggleUserProfileMenu`/`closeUserProfileMenu`/`closeUserProfileMenuOnOutsideClick`/`updateUserProfilePanelInfo`/`bindUserProfileMenuActions`, `goToCustomBoard`/`changeProfileImage`/`logout` 내부 참조 정리, `showUserModal`/`closeUserModal` 제거)
- Modified: `Header_Footer.css` (`.user-profile-btn { position: relative; }` + `.user-profile-panel*` 신규 블록)

## 주요 구현 내용

### 1. 알림 벨과 동일한 "패널" 패턴 재사용

기존 `#notification-panel` (`.is-open` 토글 + `document`에 outside-click 리스너 등록)과 **완전히 같은 구조**로 `#user-profile-panel` 을 만들었다. 새 CSS를 따로 발명하지 않고 검증된 패턴을 그대로 복제해 시각적 일관성과 구현 리스크를 동시에 줄였다.

```
toggleUserProfileMenu() → panel.classList.toggle('is-open') → closeNotificationPanel() (동시에 두 패널이 안 열리도록)
closeUserProfileMenuOnOutsideClick(e) → profileEl.contains(e.target) 아니면 닫기
```

### 2. 어드민/일반 유저 분기

`renderUserProfile()` 은 `isAdmin` 이면 드롭다운 패널 HTML 자체를 만들지 않고 기존 `showAdminModal()` 클릭 핸들러를 그대로 유지한다. 일반 유저만 패널이 생성되고 `bindUserProfileMenuActions()` 로 메뉴 클릭을 위임 처리(`data-action`: `mypage`/`board`/`photo`/`logout`) 한다.

### 3. 마이페이지 데이터 소스 — 새 스키마 없이 기존 API 조합

- 게시글: `GET /api/tierlists?author=닉네임&mine=true` (신규 `mine` 옵션, 본인 비공개 글도 포함) → 배열 `.length`, `likeCount` 합
- 뽑기: `GET /api/luck-draw/stats` (신규, 총 횟수·최고 티어) + `GET /api/luck-draw/history?page=1` (최근 목록, 기존 API 재사용)

## 변경 전/후 (주요)

| 항목 | 변경 전 | 변경 후 |
|------|---------|---------|
| 프로필 아이콘 클릭(일반 유저) | 전체화면 모달(`#user-modal`) | 아바타 아래 드롭다운 패널 |
| 내 정보 확인 | 모달 안 닉네임·이메일만 | 마이페이지: 닉네임·이메일 + 게시글/좋아요/뽑기 통계 + 최근 글·뽑기 목록 |
| 이벤트 바인딩 | 모달 버튼 `onclick="..."` | 패널 메뉴 `addEventListener` + `data-action` 위임 |

## 테스트 체크리스트

1. 로그인 후 프로필 아이콘 클릭 → 드롭다운 오픈, 다른 곳 클릭 시 닫힘
2. 알림 벨 열려있는 상태에서 프로필 클릭 → 알림 패널 자동으로 닫힘(동시에 두 개 안 뜸)
3. "마이페이지" 클릭 → `my-page/my-page.html` 이동, 통계·목록 정상 표시
4. 비로그인 상태로 마이페이지 직접 접근 → 로그인 페이지로 리다이렉트
5. 관리자 로그인 상태 → 기존 어드민 모달 그대로 동작(회귀 없음)
6. "프로필 사진 변경" → 헤더 아바타 + 패널 아바타 즉시 반영
7. GitHub Pages(`GITHUB_STATIC`) → 마이페이지에서 API 호출 대신 안내 문구

> **후속 변경(같은 세션 내)**: 통계는 이후 대화에서 4칸 → **5칸**(포인트 추가)으로 늘었다. 행운 뽑기 쪽의 포인트 적립·이력 5건 제한은 `LuckProfile` 신설로 구현했으며, 상세는 [`../../backend/08-luck-draw/02-luck-draw-points-retention-record.md`](../../backend/08-luck-draw/02-luck-draw-points-retention-record.md) 참고. 마이페이지 쪽은 `/api/luck-draw/stats` 응답에 `points` 필드가 하나 늘어난 것을 표시만 하도록 `my-page.js`의 `renderStats()`/`loadLuckStats()` 를 소폭 수정했다.

## 향후 개선 제안

- 게시글 목록 페이지네이션(현재 최근 6개만 표시)
- 포인트를 실제로 쓰는 상점/랭킹 (지금은 적립·차감만 있는 단순 집계)

---
문서 생성일: 2026-08-31
