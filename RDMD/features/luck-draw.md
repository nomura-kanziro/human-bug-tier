# 행운 뽑기 (luck-draw)

기획 원본: [`../../luck-draw-기획서.md`](../../luck-draw-기획서.md)  
코드: [`../../luck-draw/`](../../luck-draw/README.md), `backend/*luckDraw*`

## 한 줄 요약

**오늘의 행운 티어**를 뽑는 기능. 확률·횟수 제한·결과는 서버가 결정하고, DB 저장은 로그인 유저만 해당한다. **랜덤 뽑기는 아직 준비 중** (1차 범위 밖).

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

1. 사용자가 헤더 `행운 뽑기 > 오늘의 행운 티어` 또는 홈 퀵카드로 진입 (`luck-draw/luck-draw.html#daily`)
2. `오늘의 행운 뽑기` 버튼 클릭 → `POST /api/luck-draw/daily`
3. 서버가 가중치(`DAILY_TIER_WEIGHTS`)로 티어를 뽑고, 해당 티어 캐릭터 풀(`backend/data/luckPool.js`)에서 무작위 1명 선택
4. **로그인**: 오늘 횟수(`todayCount`)와 마지막 뽑기 시각을 조회해 한도(20)·쿨다운(3분)을 확인 후 `LuckDraw` 에 저장. 초과 시 `429 { limitReached:true }`(횟수) 또는 `429 { cooldown:true, cooldownRemainingSec }`(대기)
5. **게스트**: 결과만 계산해서 보여주고 DB에는 남기지 않음(`saved:false`). 24시간 제한은 프론트 `localStorage` 안내일 뿐 서버가 막지 않음(계정이 없어 신원 구분 불가)

## 데이터

- **모델**: `LuckDraw` (`userId`, `nickname`, `mode`, `tier`, `characterName`, `imagePath`, `drawDate`) — `mode`당 하루 여러 건 허용(과거엔 unique 1건이었으나 20회 정책으로 변경)
- **날짜 기준**: KST 자정 (`backend/utils/kstDate.js` `getKstDateString()`)
- **캐릭터 풀**: `backend/data/luckPool.js` — 1차는 티어당 4~8명만 등록 (전체 캐릭터는 2차)
- **인덱스**: `{userId,mode,drawDate}`(당일 횟수 집계), `{userId,mode,createdAt:-1}`(쿨다운 조회) — 둘 다 non-unique

## API

| 메서드 | 경로 | 권한 |
|--------|------|------|
| GET | `/api/luck-draw/config` | optionalAuth |
| POST | `/api/luck-draw/daily` | optionalAuth |
| GET | `/api/luck-draw/today` | requireAuth |
| GET | `/api/luck-draw/history?page=1` | requireAuth |

## 2차 이후 (이번에 만들지 않음)

- 랜덤 뽑기(`mode:'random_char'`), 천장(pity)
- 보관함 UI, 관리자 확률·초기화 시각 조정
- 1티어 당첨 알림 (`Notification.type` enum 확장 필요)

관련 스킬: `.agents/luck-draw/skill.md`, `.claude/skills/luck-draw/SKILL.md`
