---
name: notifications
description: >
  헤더 알림, Notification 모델, notificationService, 딥링크.
  Use when /notifications.
---

# Claude 스킬 — 알림

## When

- 헤더 알림 목록/폴링, 알림 생성, 클릭 이동 URL

## Code map

- `common.js` (폴링, resolveNotificationLink, timer, `getNotificationGroup`, 드롭다운 "전체보기" 링크)
- `notifications/notifications.html|css|js` — 전체 알림 상세 페이지(탭 4개 + 정렬/필터 select)
- `backend/models/Notification.js`, notificationController, routes
- `backend/utils/notificationService.js`

## Read first

- `.agents/notifications/skill.md` (정본, 최우선)
- `RDMD/features/notifications.md`
- `notifications/README.md`
- `common.js` 알림 구간

## 현재 (작업 전 이해)

- 상세 페이지 탭(전체/공지/멘션/이벤트)은 DB가 아니라 `common.js` 의 `NOTIFICATION_GROUPS` 매핑으로만 나뉜다. 매핑 안 된 타입은 자동으로 "이벤트"로 떨어짐(기본값)
- 상세 페이지는 `GET /api/notifications?limit=100` 한 번만 호출하고 탭·select 정렬/필터는 전부 클라이언트 처리 — 새 서버 API 없음
- 드롭다운과 상세 페이지는 `handleNotificationClick()` 하나를 공유(읽음 처리 + 딥링크)

## Do

1. API = **requireAuth**, 본인만
2. 생성은 notificationService (프론트 임의 남용 금지)
3. 딥링크: buildTierPostDetailUrl / getBasePath
4. GITHUB_STATIC 이면 fetch/폴링 가드
5. poll timer 중복 방지
6. 새 타입: service payload + 프론트 링크 해석 + `NOTIFICATION_GROUPS` 탭 매핑, **셋 다** 같이 수정

## Do not

- 타인 알림 조회 허용
- 절대경로만 하드코딩
- 과도한 폴링 빈도
- 상세 페이지 전용 서버 필터/페이지네이션 API 신설(100건 규모엔 불필요)

## Tasks

**A. 알림 없음** — service 호출·userId·토큰·API base  
**B. 클릭 404** — payload + resolve/build URL + base  
**C. 새 종류** — service + 트리거 + UI + 탭 매핑  

## Checklist

- [ ] 로그인 유저만
- [ ] GH Pages 가드
- [ ] 딥링크·타이머
- [ ] 상세 페이지 탭 4개 + select 정렬/필터 정확
- [ ] 드롭다운 "전체보기" 링크 정상
