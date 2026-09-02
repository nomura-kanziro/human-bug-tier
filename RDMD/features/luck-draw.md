# 행운 뽑기 (luck-draw)

기획 원본: [`../../luck-draw-기획서.md`](../../luck-draw-기획서.md)  
코드: [`../../luck-draw/`](../../luck-draw/README.md), `backend/*luckDraw*`

## 한 줄 요약

**오늘의 행운 티어**를 뽑는 기능. 확률·횟수 제한·포인트·결과는 서버가 결정하고, DB 저장은 로그인 유저만 해당한다. **랜덤 뽑기는 아직 준비 중** (1차 범위 밖).

## 권한 · 횟수 제한

| 동작 | 비로그인 | 로그인 | 관리자 |
|------|:---:|:---:|:---:|
| 확률표 열람 | O | O | O |
| 뽑기 실행 | O (체크만) | O (저장) | O |
| 하루 최대 횟수 | 24시간 1회 (프론트 안내만, 서버 미강제) | **20회** (서버 강제) | 20회 |
| 뽑기 간 대기 | 없음 | **3분** (서버 강제) | 3분 |
| 결과 DB 저장 | X | O | O |
| 오늘 결과·내 기록 조회 | X | O | O |
| 확률·횟수·초기화 시각 조정 | X | X | X (2차) |

## 동작 개요

1. 사용자가 헤더 `행운 뽑기 > 오늘의 행운 티어`, 홈 퀵카드(페이지 이동), 또는 **메인 위젯**(`#home-luck-preview`)에서 뽑는다. 전용 페이지 진입은 `luck-draw/luck-draw.html#daily`
2. `오늘의 행운 뽑기` 버튼 클릭 → `POST /api/luck-draw/daily`
3. 서버가 가중치(`DAILY_TIER_WEIGHTS`)로 티어를 뽑고, 해당 티어 캐릭터 풀(`backend/data/luckPool.js`)에서 무작위 1명 선택
4. **로그인**: `LuckProfile`(유저당 누적 카운터 1건)로 오늘 횟수·마지막 뽑기 시각을 확인해 한도(20)·쿨다운(3분)을 검사. 초과 시 `429 { limitReached:true }`(횟수) 또는 `429 { cooldown:true, cooldownRemainingSec }`(대기). 통과하면 `LuckProfile`(포인트·누적횟수·최고티어·오늘횟수) 갱신 + `LuckDraw`(이력) 1건 생성 + **이력이 5건을 넘으면 가장 오래된 것부터 삭제**
5. **게스트**: 결과만 계산해서 보여주고 DB에는 남기지 않음(`saved:false`). 24시간 제한은 프론트 `localStorage` 안내일 뿐 서버가 막지 않음(계정이 없어 신원 구분 불가). 포인트도 적립되지 않음

## 포인트

티어 9(가장 흔함) 기준 -5점, 티어가 한 단계 좋아질 때마다(숫자가 1 작아질 때마다) +1점. 1티어(가장 희귀) = +3점.

| 티어 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|---|---|---|---|---|---|---|---|---|---|
| 포인트 | +3 | +2 | +1 | 0 | -1 | -2 | -3 | -4 | -5 |

누적 포인트는 음수가 될 수 있으며, 이력이 삭제돼도 **`LuckProfile.points` 는 그대로 유지**된다(적립/차감만 있는 단순 집계 — 아직 상점·소비처는 없음).

## 데이터

- **`LuckDraw`** (이력 로그, 화면 표시용): `userId`, `nickname`, `mode`, `tier`, `characterName`, `imagePath`, `drawDate` — **유저당 최근 5건만 유지**, 뽑을 때마다 초과분을 오래된 순으로 삭제
- **`LuckProfile`** (누적 카운터, 유저당 1건, 삭제되지 않음): `points`, `totalDraws`, `tierCounts`, `bestTier`, `todayCount`/`todayDate`, `lastDrawAt` — 하루 횟수·쿨다운·통계·마이페이지가 전부 이 문서를 기준으로 계산됨 (이력 삭제와 완전히 분리)
- **날짜 기준**: KST 자정 (`backend/utils/kstDate.js` `getKstDateString()`)
- **캐릭터 풀**: `backend/data/luckPool.js` — 1차는 티어당 4~8명만 등록 (전체 캐릭터는 2차)

> **왜 카운터를 따로 뒀나**: "일일 횟수"를 `LuckDraw` 문서 개수로 세던 방식은 이력을 5건으로 자르는 순간 무너진다(항상 5로 고정돼 20회 제한이 무력화됨). 그래서 표시용 이력과 집계용 카운터를 분리했다. 상세: [`../backend/08-luck-draw/02-luck-draw-points-retention-record.md`](../backend/08-luck-draw/02-luck-draw-points-retention-record.md)

## API

| 메서드 | 경로 | 권한 |
|--------|------|------|
| GET | `/api/luck-draw/config` | optionalAuth |
| POST | `/api/luck-draw/daily` | optionalAuth |
| GET | `/api/luck-draw/today` | requireAuth |
| GET | `/api/luck-draw/history?page=1` | requireAuth |

## 2차 이후 (이번에 만들지 않음)

- 랜덤 뽑기(`mode:'random_char'`), 천장(pity)
- 포인트를 실제로 쓰는 상점/랭킹, 관리자 확률·포인트·초기화 시각 조정
- 1티어 당첨 알림 (`Notification.type` enum 확장 필요)

## 메인 위젯 (`root-render/index.html`)

- `index-home.js`가 `luck-draw/luck-draw-api.js`의 `drawDailyLuck`을 호출한다.
- 게스트 24시간 키는 뽑기 페이지와 같은 `luckDrawGuestState`.
- 버튼 아래 `.home-luck-stage`: 기본 `?` 안내 → 릴 → 결과 카드. 상태 문구는 있을 때만 표시.
- 회원 20회/3분 제한은 서버가 그대로 적용한다.

관련 스킬: `.agents/luck-draw/skill.md`, `.claude/skills/luck-draw/SKILL.md`
