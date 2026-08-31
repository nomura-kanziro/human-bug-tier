# 알림 상세 페이지 (notifications)

헤더 알림 드롭다운(`common.js`)의 "전체보기"로 들어오는 전체 알림 목록 페이지.  
새 API 없이 `GET /api/notifications?limit=100` 한 번을 불러와 **클라이언트에서** 탭·정렬을 적용한다.

## 파일

| 파일 | 역할 |
|------|------|
| `notifications.html` | 탭 4개 + 정렬 select + 목록 |
| `notifications.css` | 페이지 전용 스타일. `common.css` 미수정 |
| `notifications.js` | 목록 불러오기, 탭/정렬 필터링, 클릭 처리 |

## 탭 (좌측) — `common.js`의 `getNotificationGroup(type)`

| 탭 | 포함 타입 |
|----|-----------|
| 전체 | 전부 |
| 공지 | `notice`, `news` |
| 멘션 | `tier_post_comment`, `tier_comment_reply`, `tier_comment_mention`, `inquiry_answer`, `inquiry_mention` |
| 이벤트 | 위에 안 걸리는 타입 전부(기본값) — 지금은 항상 비어 있음. 새 알림 타입을 만들면 자동으로 여기로 분류되니, 실제로 공지/멘션에 속한다면 `NOTIFICATION_GROUPS` 매핑을 꼭 추가할 것 |

## 정렬/필터 (우측 select)

| 값 | 동작 |
|----|------|
| 전체 (기본) | 최신순과 동일, 필터 없음 |
| 최신순 | `createdAt` 내림차순 |
| 날짜별 (오래된 것) | `createdAt` 오름차순 |
| 읽은 것 | `read: true` 만, 최신순 |
| 안 읽은 것 | `read: false` 만, 최신순 |

탭과 select는 **동시에 적용**된다 (예: "멘션" 탭 + "안 읽은 것" = 안 읽은 멘션만).

## 권한

로그인 필요 (`requireAuth`, 본인 알림만). 비로그인 접근 시 로그인 페이지로 리다이렉트.

## 체크리스트 (수동 테스트)

```
1. 헤더 알림 벨 → 드롭다운 "전체보기" 클릭 → 이 페이지로 이동
2. 탭 전환 시 목록이 즉시 바뀜 (재요청 없이 클라이언트 필터)
3. select를 "안 읽은 것"으로 바꾸면 읽은 알림 사라짐
4. 알림 클릭 → 읽음 처리 + 원래 링크(게시글/공지/문의)로 이동
5. 이벤트 탭 → 현재는 항상 "표시할 알림이 없습니다"
6. 비로그인 접근 → user_login/login.html 로 리다이렉트
7. GitHub Pages(GITHUB_STATIC) → 안내 문구만, API 호출 없음
```

## 하지 않은 것

- 서버 측 탭/정렬 API (100건이면 클라이언트 처리로 충분하다고 판단)
- "모두 읽음" 버튼 (백엔드 `PATCH /read-all` 은 이미 있으나 이번엔 UI로 노출 안 함)
- 실제 "이벤트" 타입 알림 생성 (2차 — 예: 행운 뽑기 1티어 당첨)

`.claude/skills/notifications/SKILL.md`, `.agents/notifications/skill.md` 참고.
