---
source: luck-draw-기획서.md
area: backend
---

# 커밋 요약 — 행운 뽑기(오늘의 행운 티어) 모델·API 신설

## 개요

`User` 스키마를 건드리지 않고 별도 `LuckDraw` 컬렉션 + `optionalAuth`/`requireAuth` 조합으로 **오늘의 행운 티어** 뽑기 API를 추가했다. 게스트는 결과를 계산만 해서 보여주고(`saved:false`) DB에 남기지 않으며, 로그인 유저만 저장된다.

> **정책 변경(같은 세션 내)**: 최초 구현은 "1인 1일 1회" unique 인덱스였으나, 이후 대화에서 **회원 하루 20회 + 3분 쿨다운**, **게스트는 서버 미강제(프론트 24시간 안내만)** 로 요구사항이 바뀌어 이 문서는 최종 형태를 반영한다.

## 관련 커밋

- **commit pending**
  - 제목: `feat(luck-draw): 오늘의 행운 티어 모델·API 추가`

## 변경된 파일 목록

- Added: `backend/models/LuckDraw.js`
- Added: `backend/data/luckPool.js`
- Added: `backend/utils/kstDate.js`
- Added: `backend/controllers/luckDrawController.js`
- Added: `backend/routes/luckDrawRoutes.js`
- Modified: `backend/server.js` (`require` 1줄 + `app.use('/api/luck-draw', ...)` 1줄)
- Modified: `backend/README.md` (API 표 + 데이터 모델 목록)

## 주요 구현 내용

### 1. `LuckDraw` 모델

`{ userId, mode, drawDate }`(당일 횟수 집계용), `{ userId, mode, createdAt: -1 }`(쿨다운 조회용) 두 인덱스 모두 **non-unique**. 하루에 여러 건(최대 20건)이 쌓이는 걸 전제로 한다. `mode` 는 `daily_tier | random_char` enum(2차 대비, 1차는 `daily_tier`만 사용).

> 주의: 최초에 unique 인덱스로 만들었다가 non-unique 로 바꾼 경우, Mongoose는 스키마에서 사라진 기존 인덱스를 **자동으로 드롭하지 않는다**. 실제 DB에 예전 unique 인덱스가 남아 있으면 20회 정책이 조용히 깨지므로(두 번째 뽑기부터 `E11000`), 배포 전 `db.luckdraws.dropIndex('userId_1_mode_1_drawDate_1')` 로 직접 제거해야 한다. (로컬 검증 중 실제로 이 문제가 발생해 확인 후 드롭함.)

### 2. KST 날짜 (`kstDate.js`)

Render 서버가 UTC로 돌기 때문에 `new Date().toISOString()` 을 그대로 쓰면 한국 시간 오전 9시 이전에 날짜가 하루 밀리는 버그가 생긴다. `getKstDateString()` 이 KST 자정 기준 `YYYY-MM-DD` 문자열을 만든다.

### 3. 가중치 뽑기 (`luckDrawController.js`)

```js
const DAILY_TIER_WEIGHTS = { 1:1, 2:3, 3:6, 4:10, 5:14, 6:18, 7:18, 8:16, 9:14 }; // 합계 100
```

`pickWeightedTier()` 가 가중치 누적 방식으로 1~9 중 하나를 고르고, `luckPool.js` 에서 해당 티어의 캐릭터 중 무작위 1명을 선택한다. 가중치는 서버에만 있고 `/config` 응답에는 표시용 퍼센트만 내려간다.

### 4. 저장 흐름 — 회원 20회/3분 쿨다운, 게스트 무제한(서버 기준)

```
POST /daily (optionalAuth)
├─ req.auth 없음(게스트) → 계산만, { saved:false, guest:true } 응답, DB 접근 없음
│                         (24시간 제한은 프론트 localStorage 안내일 뿐, 서버는 모름)
└─ req.auth 있음(회원)
   ├─ getMemberDrawStatus(): 오늘 카운트 + 마지막 뽑기 시각 조회
   ├─ remainingToday <= 0 → 429 { limitReached:true, ...status }
   ├─ cooldownRemainingSec > 0 → 429 { cooldown:true, cooldownRemainingSec, ...status }
   └─ 통과 → create() → { saved:true, guest:false, result, remainingToday, cooldownRemainingSec }
```

`MEMBER_DAILY_LIMIT = 20`, `MEMBER_COOLDOWN_MS = 3 * 60 * 1000` — 둘 다 `luckDrawController.js` 상단 상수 하나로만 관리한다.

### 5. 캐릭터 풀 (`luckPool.js`)

1차는 티어당 4~8명만 수동 등록(전체 340여 명 자동 이식은 2차). 이미지 경로는 `tier-class/tierN.html` 의 `<img src>` 값을 그대로 옮겨 실제 서빙되는 파일과 어긋나지 않게 했다.

## API

| 메서드 | 경로 | 권한 | 설명 |
|--------|------|------|------|
| GET | `/api/luck-draw/config` | optionalAuth | 확률표 + `dailyLimit`(20)·`cooldownSec`(180) |
| POST | `/api/luck-draw/daily` | optionalAuth | 게스트=체크만 / 회원=한도·쿨다운 검사 후 저장 |
| GET | `/api/luck-draw/today` | requireAuth | 오늘 횟수·쿨다운 잔여·마지막 결과 |
| GET | `/api/luck-draw/history?page=1` | requireAuth | 내 기록(페이지네이션) |

## 테스트 체크리스트

1. `POST /daily` (토큰 없음) → 200, DB에는 저장 안 됨
2. `POST /daily` (토큰 있음, 1회차) → 200 + DB 1건 + `remainingToday:19`
3. 바로 재요청(3분 이내) → 429 `{ cooldown:true }`
4. 19건 시드 + 쿨다운 만료 상태에서 20회차 → 성공(`remainingToday:0`), 21회차 → 429 `{ limitReached:true }`
5. `/today`, `/history` 토큰 없이 호출 → 401
6. `getKstDateString()` 경계값(KST 00:00 전후) 단위 확인

로컬 검증 시 실행한 명령(요약): require 로드 확인 → `npm start` → `/health`, `/api/luck-draw/config`, 게스트 `POST /daily`, 토큰 없는 `/today`(401), 페이지(200) curl 확인. `jwtAuth.signUserToken()` 으로 실제 계정을 만들지 않고 합성 JWT 발급 → 1회차 저장·쿨다운 429 확인 → 인덱스 드롭 후 재기동 → 18건 시드(+ 실 1건 backdate)로 20회차 성공·21회차 `limitReached` 재현 → 시드 데이터·합성 `userId` 문서 전량 삭제로 정리.

## 향후 개선 제안

- `mode:'random_char'` 랜덤 뽑기 라우트 추가 (2차)
- 캐릭터 전수 이식 스크립트 (`tier-class/*.html` 파싱 → `luckPool.js` 자동 생성)
- 1티어 당첨 시 알림(`notificationService`) 연동 — `Notification.type` enum 확장 필요

---
문서 생성일: 2026-08-31
