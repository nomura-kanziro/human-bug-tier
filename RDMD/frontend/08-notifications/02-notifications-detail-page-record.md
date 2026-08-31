---
area: frontend
feature: notifications
---

# 커밋 요약 — 알림 상세 페이지 신설 (탭 4개 + 정렬/필터 select)

## 개요

헤더 알림 드롭다운은 최근 몇 건만 보여주는 요약 UI라 전체를 훑어보기 어려웠다. 새 API 없이 기존 `GET /api/notifications` 응답을 클라이언트에서 탭·정렬 필터링하는 전체 알림 페이지(`notifications/`)를 추가했다.

## 관련 커밋

- **commit pending**

## 변경된 파일 목록

- Added: `notifications/notifications.html`
- Added: `notifications/notifications.css`
- Added: `notifications/notifications.js`
- Added: `notifications/README.md`
- Modified: `common.js` (신규 `NOTIFICATION_GROUPS`/`getNotificationGroup()`, 알림 패널 헤더에 "전체보기" 링크 추가)
- Modified: `Header_Footer.css` (`.notification-panel-header-actions`, `.notification-viewall-link`)

## 주요 구현 내용

### 1. 탭 분류는 순수 클라이언트 매핑 — 백엔드 스키마 변경 없음

`Notification.type` enum(7종)을 그대로 두고, `common.js` 에 그룹 매핑만 추가했다.

```js
const NOTIFICATION_GROUPS = {
  notice: 'notice', news: 'notice',
  tier_post_comment: 'mention', tier_comment_reply: 'mention', tier_comment_mention: 'mention',
  inquiry_answer: 'mention', inquiry_mention: 'mention',
};
function getNotificationGroup(type) {
  return NOTIFICATION_GROUPS[type] || 'event'; // 매핑 안 된 새 타입은 자동으로 "이벤트"
}
```

"이벤트"에 매핑된 실제 타입이 아직 없어서(2차: 행운 뽑기 당첨 알림 등) 이벤트 탭은 항상 빈 상태다 — 의도된 동작.

### 2. 데이터는 한 번만 불러오고 나머지는 클라이언트에서

```js
notifAllItems = await fetchAllNotifications(); // GET /api/notifications?limit=100, 딱 한 번
// 탭 클릭·select 변경 시 재요청 없이 filterByTab() + applySortFilter() 로 즉시 재렌더
```

개인 알림함은 100건이면 충분하다고 보고 페이지네이션이나 서버 필터 API를 새로 만들지 않았다.

### 3. 탭 + select 는 동시 적용

`renderNotifList()` 가 `filterByTab(notifAllItems, currentTab)` 결과에 `applySortFilter(..., currentFilter)` 를 이어서 적용한다 — 예: "멘션" 탭 + "안 읽은 것" select = 안 읽은 멘션만.

### 4. 클릭 처리는 기존 드롭다운 로직 재사용

새 클릭 핸들러를 만들지 않고 `common.js` 의 `handleNotificationClick()`(읽음 처리 PATCH + `resolveNotificationLink`/딥링크 이동)을 그대로 호출한다. 이 함수는 이미 `closeNotificationPanel()` 을 안전하게 no-op 처리하도록 짜여 있어서(패널이 없는 페이지에서도), 별도 분기 없이 재사용 가능했다.

## API

변경 없음 — 기존 `GET /api/notifications`, `PATCH /:id/read` 그대로 재사용.

## 테스트 체크리스트

1. 헤더 알림 드롭다운 "전체보기" → 이 페이지로 이동
2. 공지/새소식/멘션/문의답변 알림 각각 시드 → 탭별로 정확히 분류되는지 확인
3. select "읽은 것"/"안 읽은 것" → 필터 정확
4. select "날짜별(오래된 것)" → 오름차순 정렬 확인
5. 알림 클릭 → 읽음 처리 + 딥링크 이동
6. 이벤트 탭 → 항상 빈 상태(현재 매핑된 타입 없음)
7. 비로그인 접근 → 로그인 페이지 리다이렉트

합성 유저에 notice/news/tier_comment_mention/inquiry_answer 4건을 직접 시드해 `GET /api/notifications` 응답 형태를 curl로 확인(모든 클라이언트가 기대하는 필드 일치) 후 정리했다. 탭/정렬 로직 자체는 순수 클라이언트 함수라 코드 리뷰로 검증.

## 향후 개선 제안

- "이벤트" 탭에 실제로 매핑될 첫 알림 타입(행운 뽑기 1티어 당첨 등) 추가 시 `Notification.type` enum 확장 필요
- "모두 읽음" 버튼을 이 페이지에 노출 (백엔드 API는 이미 존재)

---
문서 생성일: 2026-08-31
