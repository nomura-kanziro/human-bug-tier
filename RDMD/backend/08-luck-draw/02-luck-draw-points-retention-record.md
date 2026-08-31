---
area: backend
---

# 커밋 요약 — LuckProfile 신설: 포인트 적립 + 뽑기 이력 5건 제한

## 개요

오늘의 행운 티어에 두 가지를 추가했다: (1) 티어별 포인트 적립(9티어 -5점 기준, 한 단계 좋아질 때마다 +1점), (2) 뽑기 이력(`LuckDraw`)은 최근 5건만 남기고 오래된 것부터 자동 삭제. 두 요구사항이 서로 충돌하는 지점이 있어(아래 참고) `LuckProfile` 이라는 작은 누적 카운터 컬렉션을 새로 만들어 해결했다.

이전 커밋(`GET /api/luck-draw/stats`)에서 `LuckDraw.aggregate()` 로 통계를 뽑던 방식은 **이번 변경으로 폐기**했다 — 이력을 5건으로 자르면 aggregate 결과도 5건 기준으로만 나와 누적 통계가 될 수 없기 때문이다.

## 관련 커밋

- **commit pending**

## 변경된 파일 목록

- Added: `backend/models/LuckProfile.js`
- Modified: `backend/controllers/luckDrawController.js` (거의 전면 재작성)
- Modified: `luck-draw/luck-draw.html` / `.css` / `.js` (포인트 배지, 확률표 포인트 열)
- Modified: `my-page/my-page.html` / `.css` / `.js` (포인트 통계 칸)

## 왜 새 컬렉션이 필요했나 — 이력 삭제 vs 일일 횟수 제한의 충돌

기존 "하루 20회 제한"은 `LuckDraw.countDocuments({userId, drawDate: 오늘})` 로 오늘 뽑은 횟수를 셌다. 그런데 이력을 **최근 5건만** 남기도록 삭제하면, 하루에 6번째 이후로는 항상 "오늘 기록이 5건"으로 계산돼 실제로 몇 번 뽑았는지 알 수 없게 된다 — 즉 20회 제한이 사실상 무력화된다(계속 5로 고정되어 절대 20에 도달하지 않음).

그래서 **"이력(화면에 보여줄 최근 기록)"과 "카운터(오늘 횟수·쿨다운·누적 포인트·누적 횟수·최고 티어)"를 분리**했다:

- `LuckDraw` = 최근 5건만 남는 **화면 표시용 로그** (삭제 대상)
- `LuckProfile` = 유저당 문서 1개, 뽑을 때마다 값만 갱신되는 **누적 카운터** (삭제되지 않음)

## 주요 구현 내용

### 1. `LuckProfile` 스키마

```js
{
  userId: ObjectId (unique),
  points: Number,        // 누적 포인트 (음수 가능)
  totalDraws: Number,    // 누적 뽑기 횟수 (이력 삭제와 무관하게 계속 증가)
  tierCounts: Object,    // { "3": 2, "8": 5, ... } 티어별 누적 당첨 횟수
  bestTier: Number|null, // 지금까지 뽑은 것 중 가장 작은(=가장 희귀한) 티어
  todayCount: Number,    // 오늘 뽑은 횟수 (아래 참고)
  todayDate: String,     // KST 'YYYY-MM-DD' — todayCount가 유효한 날짜
  lastDrawAt: Date,      // 쿨다운 계산용
}
```

`todayCount`/`todayDate` 쌍으로 "날짜가 바뀌면 카운트 리셋"을 구현한다 (cron 없이, 다음 뽑기 요청이 올 때 `profile.todayDate !== 오늘` 이면 그 자리에서 1로 리셋).

### 2. 포인트 공식

```js
function getTierPoints(tier) {
  return (9 - tier) - 5; // 9티어 -5, 8티어 -4, ... 1티어 +3
}
```

| 티어 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|---|---|---|---|---|---|---|---|---|---|
| 포인트 | +3 | +2 | +1 | 0 | -1 | -2 | -3 | -4 | -5 |

`/api/luck-draw/config` 응답의 `pointsTable` 로 프론트에 내려준다 (프론트에서 공식을 재구현하지 않음 — 확률표와 같은 원칙).

### 3. 뽑기 처리 흐름

```
POST /daily (회원)
1. LuckProfile 조회(없으면 생성)
2. profile 기준으로 오늘 횟수·쿨다운 계산 → 초과 시 429 (기존과 동일한 응답 형태)
3. 통과 → 결과 뽑기 → profile.points/totalDraws/bestTier/tierCounts/todayCount/lastDrawAt 갱신 후 save()
4. LuckDraw 이력 1건 생성
5. pruneLuckHistory(): 해당 유저 이력이 5건 초과면 오래된 것부터 삭제
6. 응답에 pointsDelta(이번 뽑기로 얻은 포인트)와 totalPoints(갱신된 누적치)를 포함
```

### 4. `tierCounts` 는 Mixed/Object라 `markModified` 필요

`tierCounts: { type: Object }` 필드에 `profile.tierCounts[tier] = ...` 로 직접 대입하면 Mongoose가 변경을 자동 감지하지 못해 저장이 누락된다. `profile.markModified('tierCounts')` 를 반드시 `save()` 전에 호출해야 한다 (구현 중 유의해서 처음부터 반영).

## API 응답 변경

| 엔드포인트 | 추가된 필드 |
|---|---|
| `GET /api/luck-draw/config` | `pointsTable`, `historyRetention` |
| `POST /api/luck-draw/daily` (회원 성공 시) | `pointsDelta`, `totalPoints` |
| `GET /api/luck-draw/today` | `points`, `totalDraws`, `bestTier` (LuckProfile 기준) |
| `GET /api/luck-draw/stats` | `points` 추가, `totalDraws`/`bestTier`/`tierCounts` 출처가 aggregate → LuckProfile로 변경(값 형태는 동일) |

## 테스트 체크리스트 (실제 검증 완료)

1. 합성 JWT로 7회 연속 뽑기(매 회 `LuckProfile.lastDrawAt` 을 직접 4분 전으로 되돌려 쿨다운 우회) → 매 응답의 `pointsDelta` 가 공식과 일치, `totalPoints` 누적 합 일치
2. `GET /history` → 정확히 5건만 남음 (1·2번째로 오래된 두 건이 삭제됨)
3. `GET /stats` → `totalDraws:7` (5가 아님 — 이력 삭제와 무관하게 정확), `tierCounts` 합계 7, `bestTier` = 실제 최소 티어
4. `GET /today` → `todayCount:7`, `remainingToday:13`, `points`/`totalDraws`/`bestTier` 모두 profile과 일치
5. 테스트 후 합성 `LuckDraw`/`LuckProfile` 문서 전량 삭제로 정리

## 향후 개선 제안

- 포인트를 실제로 소비하는 상점/랭킹 기능 (2차)
- `todayCount` 리셋을 요청 시점이 아니라 배치로 미리 처리하고 싶다면 스케줄러 도입 검토 (현재는 요청 시 lazy reset이라 충분)

---
문서 생성일: 2026-08-31
