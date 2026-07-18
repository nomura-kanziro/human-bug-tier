---
name: hbu-notifications
description: >
  헤더 알림, Notification 모델, notificationService, 딥링크.
  알림 기능 작업 시 사용.
---

# 에이전트 스킬 — 알림 (notifications)

## When

- 헤더 알림 벨/목록/폴링
- 문의 답변·게시글 관련 알림 생성
- 알림 클릭 시 이동 URL
- `/api/notifications`

## Code map

| 경로 | 역할 |
|------|------|
| `common.js` | 알림 UI, 폴링, `resolveNotificationLink`, timer |
| `backend/models/Notification.js` | 스키마 |
| `backend/controllers/notificationController.js` | API |
| `backend/routes/notificationRoutes.js` | 라우트 |
| `backend/utils/notificationService.js` | 생성 헬퍼 |

## Read first

- `RDMD/features/notifications.md`
- `common.js` 알림 관련 함수

## Do

1. 알림 API는 **`requireAuth`** — 본인 데이터만
2. 생성은 서버 이벤트에서 `notificationService` 경유 (프론트 임의 생성 API 남용 금지)
3. 딥링크: `buildTierPostDetailUrl` / getBasePath 기반 — 서브패스 깨짐 방지
4. `getApiBase() === 'GITHUB_STATIC'` 이면 폴링·fetch 가드
5. `notificationPollTimer` 중복 interval 방지
6. 새 이벤트 타입 추가 시: 서비스 payload + 프론트 링크 해석 동시 수정

## Do not

- 다른 사용자 알림 조회 가능하게 만들기
- 절대경로 `/custom-maker/...` 만 하드코딩
- 폴링을 과도한 빈도로 두어 서버 부하 (기존 간격 존중·필요 시만 조정)

## Agent tasks

### A. 알림 안 옴
1. 트리거 이벤트(답변 등)에서 service 호출 여부  
2. userId 매칭  
3. 프론트 토큰·API base  
4. 폴링/수동 새로고침  

### B. 클릭 시 404
1. 저장 link payload  
2. `resolveNotificationLink` / `buildTierPostDetailUrl`  
3. getBasePath depth  

### C. 새 알림 종류
1. notificationService 함수 추가  
2. 컨트롤러 이벤트 지점에서 호출  
3. 프론트 아이콘/문구/링크  
4. features 문서 한 줄  

## Checklist

- [ ] 로그인 유저만 목록
- [ ] GH Pages 가드
- [ ] 딥링크 동작 시나리오
- [ ] 타이머 누수 없음
