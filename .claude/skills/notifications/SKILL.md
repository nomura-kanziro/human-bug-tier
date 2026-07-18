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

- `common.js` (폴링, resolveNotificationLink, timer)
- `backend/models/Notification.js`, notificationController, routes
- `backend/utils/notificationService.js`

## Read first

- `RDMD/features/notifications.md`
- `common.js` 알림 구간

## Do

1. API = **requireAuth**, 본인만
2. 생성은 notificationService (프론트 임의 남용 금지)
3. 딥링크: buildTierPostDetailUrl / getBasePath
4. GITHUB_STATIC 이면 fetch/폴링 가드
5. poll timer 중복 방지
6. 새 타입: service payload + 프론트 링크 해석 동시 수정

## Do not

- 타인 알림 조회 허용
- 절대경로만 하드코딩
- 과도한 폴링 빈도

## Tasks

**A. 알림 없음** — service 호출·userId·토큰·API base  
**B. 클릭 404** — payload + resolve/build URL + base  
**C. 새 종류** — service + 트리거 + UI  

## Checklist

- [ ] 로그인 유저만
- [ ] GH Pages 가드
- [ ] 딥링크·타이머
