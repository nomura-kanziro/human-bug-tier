---
area: frontend
---

# 커밋 요약 — 어드민도 유저 프로필 드롭다운 사용 (전체화면 모달 제거)

## 개요

일반 유저 헤더 프로필을 유튜브식 드롭다운(`#user-profile-panel`)으로 바꾼 데 이어, **어드민 전용 전체화면 모달(`showAdminModal`)도 같은 드롭다운 패턴으로 통일**했다. 메뉴 구성만 다르다 — 어드민은 "관리하기"/"로그아웃"만, 마이페이지·게시글·프로필 사진 메뉴는 일반 유저 전용으로 유지.

## 관련 커밋

- **commit pending**

## 변경된 파일 목록

- Modified: `common.js` (`renderUserProfile()` 통합, 신규 `buildAdminProfilePanelHTML()`, `showAdminModal`/`closeAdminModal`/`goToAdminPage` 및 중복 정의됐던 `getAdminInfo`/`logoutAdmin` 제거)
- Modified: `Header_Footer.css` (`.user-profile-avatar-admin`, `.user-profile-panel-avatar-admin`, `.user-profile-admin-badge`)

## 주요 구현 내용

### 1. `renderUserProfile()` 하나로 통합

기존엔 `isAdmin` 이면 패널 HTML을 아예 안 만들고 클릭 시 `showAdminModal()`(전체화면 모달)을 띄우는 별도 분기였다. 이제는 avatar/panel HTML을 **어드민이냐에 따라 내용만 다르게** 만들고, 클릭 핸들러(`toggleUserProfileMenu`)·아웃사이드 클릭 닫기·알림 벨과의 상호 배제는 완전히 공유한다.

```js
const panelHTML = isAdmin ? buildAdminProfilePanelHTML() : `...일반 유저 패널...`;
const avatarHTML = isAdmin
  ? `<div class="user-profile-avatar user-profile-avatar-admin">👑</div>`
  : `<div class="user-profile-avatar"><img id="profile-img" ...></div>`;
```

### 2. 어드민 패널 메뉴 → `bindUserProfileMenuActions()` 에 케이스 추가

```js
case 'admin-manage':
  window.location.href = getBasePath() + 'admin/comments/comment-management.html';
  break;
case 'admin-logout':
  logoutAdmin();
  break;
```

일반 유저용 `mypage`/`board`/`photo`/`logout` 과 같은 이벤트 위임 핸들러 하나를 공유한다 (별도 어드민 전용 리스너를 만들지 않음).

### 3. 죽은 코드 정리

이 영역을 손대는 김에 리뷰 중 발견한 기존 중복을 함께 정리했다(요청 범위와 직접 겹치는 최소 정리):
- `getAdminInfo()`, `logoutAdmin()` 이 파일 안에 **각각 두 번** 정의돼 있었음(뒤에 있는 것이 이겼을 뿐 완전히 죽은 코드) → 하나만 남김
- `goToAdminPage()`(주석에 "거의 호출 안 됨"이라 적혀있던 미사용 함수) → 아무 곳에서도 호출되지 않아 삭제
- `showAdminModal()`/`closeAdminModal()`/`#admin-modal` → 드롭다운으로 대체되어 삭제, 다른 파일에서 참조 없음을 grep으로 확인 후 제거

## 변경 전/후

| 항목 | 변경 전 | 변경 후 |
|------|---------|---------|
| 어드민 프로필 클릭 | 화면 전체를 덮는 모달(`rgba(0,0,0,0.7)` 배경) | 아바타 아래 작은 드롭다운(일반 유저와 동일 위치/크기) |
| 어드민 아바타 | (모달 안에만 큰 👑 이모지) | 헤더에 상시 노출되는 작은 👑 원형 아바타 |
| 코드 구조 | 유저/어드민 분기가 클릭 핸들러 레벨에서 완전히 갈라짐 | HTML 생성만 분기, 나머지(toggle/닫기/이벤트 위임) 공유 |

## 테스트 체크리스트

1. 관리자 로그인 → 헤더 아바타가 👑 아이콘으로 표시
2. 클릭 → 드롭다운 오픈(모달 아님), "관리자 이름 ✔" + "공유 IP: ..." 표시
3. "관리하기" 클릭 → `admin/comments/comment-management.html` 이동
4. "로그아웃" 클릭 → confirm → 토큰 정리 후 새로고침
5. 알림 벨이 열려 있는 상태에서 어드민 프로필 클릭 → 알림 패널 자동으로 닫힘
6. 바깥 영역 클릭 → 드롭다운 닫힘
7. 일반 유저 로그인 상태에서 회귀 없음(마이페이지/게시판/사진변경/로그아웃 그대로 동작)

## 향후 개선 제안

- 어드민 드롭다운에 대시보드 요약(오늘 처리한 신고 수 등) 추가 여부는 별도 논의

---
문서 생성일: 2026-08-31
