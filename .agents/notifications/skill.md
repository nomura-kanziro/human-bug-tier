---
name: notifications
description: >
  헤더 알림, Notification, notificationService, 딥링크. Canonical for ANY AI.
---

# 공통 스킬 — 알림

## When

- 헤더 알림 목록/폴링, 알림 생성, 클릭 이동 URL

## Code map

- `common.js` (폴링, resolveNotificationLink, `getNotificationGroup`, 드롭다운 "전체보기" 링크)
- `notifications/` — 전체 알림 상세 페이지(탭 4개 + 정렬/필터 select), 새 API 없이 클라이언트 필터
- backend Notification model, controller, routes, notificationService

## Read first

- `RDMD/features/notifications.md`
- `notifications/README.md`

## 현재 (작업 전 이해)

- 상세 페이지 탭(전체/공지/멘션/이벤트)은 `common.js` 의 `NOTIFICATION_GROUPS`/`getNotificationGroup(type)` 매핑으로만 나뉜다 — `Notification.type` enum·DB는 그대로
- 매핑 안 된 타입은 **자동으로 "이벤트"** 로 떨어짐(기본값). 새 타입이 실제로는 공지/멘션 성격이면 매핑을 반드시 추가할 것 — 안 그러면 조용히 이벤트 탭에 잘못 들어감
- 상세 페이지는 `GET /api/notifications?limit=100` 한 번만 불러오고 탭·정렬(select: 전체/최신순/오래된것/읽은것/안읽은것)은 **클라이언트에서** 처리. 새 서버 필터/페이지네이션 API 없음
- 알림 클릭 처리는 드롭다운과 상세 페이지가 `handleNotificationClick()` 하나를 공유
- 알림 벨 패널(`toggleNotificationPanel`)은 열릴 때 `closeUserProfileMenu()` 를 명시적으로 호출해 유저 프로필 드롭다운을 닫는다(반대 방향도 대칭) — 버튼 클릭이 `e.stopPropagation()` 을 쓰기 때문에 "바깥클릭 닫기"만으로는 서로 못 닫아서 생겼던 버그(`RDMD/frontend/01-common/07-dropdown-mutual-exclusion-fix-record.md`) 수정 후 상태

## Do

1. API = **requireAuth**, 본인만
2. 생성은 notificationService
3. 딥링크: buildTierPostDetailUrl / getBasePath
4. GITHUB_STATIC 이면 fetch/폴링 가드
5. poll timer 중복 방지
6. 새 타입 추가 시 **셋 다** 같이: service payload + 프론트 링크 해석 + `NOTIFICATION_GROUPS` 탭 매핑

## Do not

- 타인 알림 조회
- 절대경로만 하드코딩
- 과도한 폴링
- 상세 페이지용으로 서버 필터/정렬 API를 새로 만들기(100건 규모에서는 불필요 — 필요해지면 먼저 논의)

## Checklist

- [ ] 로그인 유저만
- [ ] GH Pages 가드
- [ ] 딥링크·타이머
- [ ] 상세 페이지 탭 4개 분류 정확, select 필터/정렬 정확
- [ ] 드롭다운 "전체보기" → 상세 페이지 정상 이동
- [ ] 프로필 드롭다운 연 상태에서 알림 벨 클릭 → 프로필 닫히고 알림만 열림(상호 배타)
