---
name: notifications
description: >
  헤더 알림, Notification, notificationService, 딥링크. Canonical for ANY AI.
---

# 공통 스킬 — 알림

## When

- 헤더 알림 목록/폴링, 알림 생성, 클릭 이동 URL

## Code map

- `common.js` (폴링, resolveNotificationLink)
- backend Notification model, controller, routes, notificationService

## Read first

- `RDMD/features/notifications.md`

## Do

1. API = **requireAuth**, 본인만
2. 생성은 notificationService
3. 딥링크: buildTierPostDetailUrl / getBasePath
4. GITHUB_STATIC 이면 fetch/폴링 가드
5. poll timer 중복 방지
6. 새 타입: service + 프론트 링크 동시 수정

## Do not

- 타인 알림 조회
- 절대경로만 하드코딩
- 과도한 폴링

## Checklist

- [ ] 로그인 유저만
- [ ] GH Pages 가드
- [ ] 딥링크·타이머
