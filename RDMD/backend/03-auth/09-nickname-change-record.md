---
area: backend
---

# 커밋 요약 — 닉네임 변경 API (`POST /api/profile/nickname`)

## 개요

마이페이지에서 닉네임을 바꿀 수 있게 새 API 를 추가했다. 이 사이트에서 닉네임은 **① 로그인 아이디, ② 글·댓글·문의·알림·뽑기 이력에 문자열로 복사돼 남는 표시 이름, ③ 관리자 차단(Block)의 대상 값**을 겸하므로, `User.nickname` 한 칸만 바꾸면 내 글이 "내가 쓴 글"에서 사라지고 알림이 끊기고 닉네임 차단을 피할 수 있다. 그래서 검증·전파·토큰 재발급을 한 번에 처리한다.

## 변경된 파일 목록

- Added: `backend/controllers/profileController.js` (`changeNickname`)
- Added: `backend/routes/profileRoutes.js` (`/api/profile`, 전부 `requireAuth`)
- Modified: `backend/server.js` (라우터 마운트)
- Modified: `backend/models/User.js` (`nicknameChangedAt`)
- Modified: `backend/utils/jwtAuth.js` (`requireAuth` 옛 토큰 대조)

`authRoutes` 는 "전부 비로그인 공개 엔드포인트"라는 규약이라 로그인 필수인 프로필 기능은 별도 라우터로 분리했다.

## 주요 구현 내용

### 1. 검증 (통과 못 하면 400/403/409/429)

| 규칙 | 응답 |
|------|------|
| 2~20자, 한글·영문·숫자·`_ - .` 만(공백·`@` 불가 — 게시판 검색 `@닉네임`·로그인 입력과 혼동 방지) | 400 |
| 예약어(관리자·운영자·운영진·admin·administrator·moderator, 대소문자 무시) | 400 |
| 현재 닉네임과 동일 | 400 |
| 대소문자 무시 중복 — 다른 회원 + **`Admin.name`** (관리자 사칭 방지). 본인의 대소문자만 바꾸는 경우는 통과 | 409 |
| 새 닉네임이 이미 차단된 값(`Block`) | 400 |
| **현재 계정이 제재 중**(`isUserBlocked`) — 닉네임을 바꿔 닉네임 차단을 피하지 못하게 | 403 |
| **7일 쿨다운**(`User.nicknameChangedAt`) — 신고·차단 이력 추적을 어렵게 하는 잦은 개명 방지 | 429 (`code: NICKNAME_COOLDOWN`, `nextChangeAt`) |
| 관리자 토큰 | 403 (`Admin` 은 별개 체계) |

정책값(7일·2~20자·예약어)은 `profileController.js` 상단 상수 한 곳에서만 정의한다.

### 2. 복사본 전파 (`propagateNickname`)

`ownership.isSameAuthor` 와 같은 기준 — **이메일이 있는 기록은 이메일로만** "내 것"을 확정하고(동명이인 것을 건드리지 않도록), 이메일이 없는 옛 기록만 닉네임 문자열로 찾는다.

| 대상 | 갱신 |
|------|------|
| `TierList` / `TierPostComment` | `author` (이메일 일치 또는 이메일 없는 같은 이름 기록) |
| `LuckDraw` | `nickname` (`userId` 기준) |
| `Notification` | `recipientNickname`(내가 받은 것) + `actorNickname`(내가 유발한 것) |
| `Inquiry` | 내가 쓴 문의 `userId`(관리자 대필 제외) + 그 안의 내 재문의 `answers[].userId` + 인용 `quotedUser`. **관리자 답변(`isAdmin`)은 이름이 같아도 건드리지 않는다**(`arrayFilters`) |

`Block`(차단 기록)·`TierLike.voterKey`(이메일 기반)는 건드리지 않는다. 알림의 `title/message` 텍스트 안에 박힌 옛 이름은 과거 기록이라 그대로 둔다.
전파는 계정 저장 **후**에 하며, 일부 실패해도 소유권 판정이 이메일 기준이라 깨지지 않으므로 개명은 성공으로 응답하고(`propagated: false`) 로그를 남긴다.

### 3. 토큰

`signUserToken(user)` 로 새 토큰을 응답에 담는다. 그리고 `requireAuth` 가 회원 토큰을 DB 의 현재 닉네임과 대조해 **다르면 401(`code: NICKNAME_CHANGED`)** 로 돌려보낸다 — 안 그러면 다른 기기의 옛 토큰(최대 7일 유효)이 옛 이름으로 글을 쓰고 알림도 못 받는다. 관리자 토큰은 대조하지 않고, DB 미연결·대조 실패 시에는 기존처럼 통과시킨다(가용성 우선).
- **비용**: `requireAuth` 를 쓰는 요청마다 `User.findById().select('nickname').lean()` 조회가 1회 추가된다(`_id` 인덱스).

## 알려진 한계

- `User.nickname` 에 unique 인덱스가 없다(기존 데이터에 중복이 있을 수 있어 추가하지 못함). 새 닉네임 중복은 애플리케이션에서 검사하므로 **동시에 같은 이름을 고르는 극히 드문 경합**은 막지 못한다. 회원가입(`register`)도 닉네임 중복·형식 검사가 없다(이번 범위 밖 — 가입 쪽도 같은 규칙을 적용할지는 별도 결정 필요).
- 알림 본문 텍스트에 박힌 옛 닉네임은 갱신하지 않는다.

## 테스트 체크리스트

임시 계정으로 `:5000` 대상 API 검증(끝나면 임시 데이터 삭제) — 전부 통과:

1. 무인증 401, 빈 값/1자/21자/공백/`@`/특수문자/예약어 400, 동일 400, 대소문자만 다른 타인 닉네임 409, 관리자 표시 이름 409
2. 차단된 값을 새 이름으로 400, 제재 중 개명 403
3. 성공 시 새 토큰·DB 반영, 글(이메일 일치·이메일 없는 옛 글)·댓글·뽑기 이력·알림(수신/행위자)·문의(작성/재문의/인용) 갱신, **동명이인(다른 이메일) 글·관리자 답변은 그대로**
4. 개명 직후 `mine=true` 조회가 새 이름으로 동작, 옛 토큰 401 `NICKNAME_CHANGED`, 새 토큰 200
5. 재변경 429(다음 가능일 응답), 쿨다운 이후 대소문자만 변경 200, 관리자 토큰 403

---
문서 생성일: 2026-09-20
