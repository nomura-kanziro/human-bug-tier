# 알림 시스템 (Notifications)

문의 답변·게시글 관련 이벤트 등을 사용자에게 알립니다.

## 구성 요소

| 계층 | 파일 / 역할 |
|------|-------------|
| 모델 | `backend/models/Notification.js` |
| 서비스 | `backend/utils/notificationService.js` |
| 컨트롤러 | `notificationController.js` |
| 라우트 | `/api/notifications` — 주로 `requireAuth` |
| 프론트 | `common.js` 헤더 알림 UI · 폴링 |

## 동작 개요

1. 서버 이벤트(예: 문의 답변) → `notificationService` 로 Notification 생성  
2. 로그인 사용자 헤더에서 목록 조회  
3. 링크 클릭 시 `resolveNotificationLink` / `buildTierPostDetailUrl` 로 대상 페이지 이동  
4. 읽음 처리 API (컨트롤러 구현 기준)

## API 권한

- 알림 목록·읽음: **로그인한 본인** (`requireAuth`)  
- 관리자 전용 생성 엔드포인트가 있다면 Admin 보호 확인  

## 프론트 주의

- `getApiBase()` 가 `GITHUB_STATIC` 이면 폴링 스킵 또는 안전 가드  
- 알림 링크는 서브패스(GH Pages)·로컬 모두 동작하도록 **getBasePath 기반 URL** 사용  
- `notificationPollTimer` 중복 등록 방지  

## 연동 지점 예

| 이벤트 | 알림 대상 |
|--------|-----------|
| 문의 답변 | 문의 작성자 |
| (확장) 댓글·좋아요 | 게시글 작성자 등 |

## 유지보수

- 새 이벤트 알림 추가 시 `notificationService` 한곳에서 생성  
- 프론트 딥링크 형식 변경 시 `buildTierPostDetailUrl` 과 서버 payload 동기화  

## 관련 기록

- information18~19 부근  
- backend Notification 라우트·서비스 로그  
