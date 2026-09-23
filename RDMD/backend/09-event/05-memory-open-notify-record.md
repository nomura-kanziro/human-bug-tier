---
area: backend
---

# 커밋 요약 — 메모리 게임 기록 이벤트도 열리면 회원 전체 알림

## 요청

> 안내 문구 관련해서 메모리 이벤트에도 전체 알림을 붙여줘

이벤트 실전 테스트 중 발견한 불일치 — 메모리 게임 페이지는 "열리면 공지로 알려드릴게요"라고 안내하는데,
실제로 전체 알림은 티어표 공개 접수 시작에만 있었고 메모리 기록 이벤트를 열 때는 아무 알림도 가지 않았다.

## 변경

### backend

- `notifyAllMembers()` 신설 — 회원 전체(User 컬렉션 전부)에게 `event_open`(카테고리 `noticeNews`) 알림을 보내는 공용 루프.
  기존 `notifyShowcaseOpened()` 안의 루프를 이리로 옮기고, 티어표 공개는 제목·메시지·링크만 넘기도록 바꿨다(발송 내용은 동일).
- `notifyMemoryPeriodOpened()` 신설 — 제목 "🧠 메모리 게임 기록 이벤트가 열렸어요!", 메시지에 회차 제목·1위 상금·마감 시각(있을 때),
  링크 `/event#memory`, resourceType `eventMemoryPeriod`.
- `setMemoryPeriodStatus` 의 `open` 액션 — `period.save()` 대신 `findOneAndUpdate({ _id, status: 'draft' })` 로 **원자적으로 선점**한 뒤에만
  알림을 보낸다. 관리자가 두 번 누르거나 두 관리자가 동시에 눌러도 한 번만 열리고 알림도 한 번만 간다(나머지는 409).
- 개인 알림 설정(공지·소식 끔)은 기존처럼 존중한다.
- `Notification.type` enum 주석에 메모리 기록 이벤트 추가(값은 기존 `event_open` 재사용).

### frontend

- 관리자 "열기" 확인창과 **"저장하고 바로 열기"**(원래 확인 없이 바로 열렸음)에 "회원 전체에게 알림이 발송됩니다" 안내 + 저장 전 확인 추가.
  티어표 공개의 열기·예약 확인 문구에도 같은 안내를 넣었다.
- 회원 안내 문구 "공지로 알려드릴게요" → "알림(🔔)으로 알려드릴게요"(실제 전달 수단에 맞춤).

## 주요 파일

| 파일 | 내용 |
|------|------|
| `backend/controllers/eventController.js` | `notifyAllMembers`, `notifyMemoryPeriodOpened`, 메모리 `open` 원자화, `notifyShowcaseOpened` 공용 함수 사용 |
| `backend/models/Notification.js` | `event_open` 주석 |
| `root-cloudflare/src/components/AdminEventManager.jsx` | 열기 확인 문구 상수화 + "저장하고 바로 열기" 사전 확인 |
| `root-cloudflare/src/components/EventMemoryPanel.jsx`, `EventShowcasePanel.jsx` | 회원 안내 문구 |

## 확인

실제 회원 13명에게 알림이 가지 않도록, 별도 프로세스에서 실제 컨트롤러(`setMemoryPeriodStatus`·`setShowcaseStatus`)를 그대로 호출하되
그 프로세스 안에서만 `User.find` 를 임시 계정(zzcc_)으로 좁혀 10건 검사 — 전부 통과:

- 동시에 두 번 열기 → 200 / 409, 회차 open, 알림 켠 회원에게 정확히 1건(중복 없음)
- type `event_open` · category `noticeNews` · 링크 `/event#memory` · resourceType `eventMemoryPeriod`
- 공지·소식 알림 끈 회원에게는 안 감 / 이미 열린 회차 재열기 거절(재발송 없음)
- 회귀: 티어표 공개 열기 알림 1건, 제목·링크 동일, 알림 끈 회원 제외

테스트 후 임시 계정·회차·알림 모두 삭제, 실제 회원에게 간 `event_open` 알림 0건.
