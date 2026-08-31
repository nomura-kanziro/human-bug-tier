# 알림 시스템 (Notifications)

문의 답변·게시글 관련 이벤트 등을 사용자에게 알립니다.

## 구성 요소

| 계층 | 파일 / 역할 |
|------|-------------|
| 모델 | `backend/models/Notification.js` |
| 서비스 | `backend/utils/notificationService.js` |
| 컨트롤러 | `notificationController.js` |
| 라우트 | `/api/notifications` — 주로 `requireAuth` |
| 프론트(요약) | `common.js` 헤더 알림 벨·드롭다운 · 폴링 |
| 프론트(상세) | `notifications/` — 전체 알림 상세 페이지 |

## 동작 개요

1. 서버 이벤트(예: 문의 답변) → `notificationService` 로 Notification 생성  
2. 로그인 사용자 헤더에서 목록 조회  
3. 링크 클릭 시 `resolveNotificationLink` / `buildTierPostDetailUrl` 로 대상 페이지 이동  
4. 읽음 처리 API (컨트롤러 구현 기준)

## 상세 페이지 (`notifications/notifications.html`)

헤더 알림 드롭다운은 최근 몇 건만 보여주는 요약 UI라, 전체를 훑어볼 수 있는 별도 페이지를 뒀다. 드롭다운 헤더의 "전체보기" 링크로 진입한다.

- **탭 4개**: 전체 / 공지 / 멘션 / 이벤트 — `common.js` 의 `getNotificationGroup(type)` 로 분류
  - 공지 = `notice`, `news`
  - 멘션 = `tier_post_comment`, `tier_comment_reply`, `tier_comment_mention`, `inquiry_answer`, `inquiry_mention`
  - 이벤트 = 위 두 그룹에 안 걸리는 타입 전부(기본값) — 지금은 해당 타입이 없어 항상 비어 있지만, 새 타입을 추가해도 매핑을 깜빡하면 자동으로 여기 떨어지게 설계
- **정렬/필터 select** (우측): 전체(기본, 최신순과 동일) / 최신순 / 날짜별(오래된 것) / 읽은 것 / 안 읽은 것 — 탭 필터링 결과에 추가로 적용됨
- 데이터는 `GET /api/notifications?limit=100` 한 번만 불러와 **클라이언트에서** 탭·정렬을 적용한다(새 API 없음, 개인 알림함이라 100건이면 충분하다고 판단)
- 항목 클릭 시 기존 드롭다운과 동일한 `handleNotificationClick()` 재사용 — 읽음 처리 + 딥링크 이동

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
