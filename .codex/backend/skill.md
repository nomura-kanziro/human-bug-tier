---
name: backend
description: >
  Express, routes, controllers, models, middleware, MongoDB, server.js.
  Codex: backend API and schema.
---

# Codex 스킬 — 백엔드

## When

- 새 API, 스키마, requireAuth/requireAdmin, 정적 서빙

## Code map

```
backend/server.js, config/, routes/, controllers/, models/,
middleware/auth.js, utils/
```

## Read first

- `RDMD/features/backend-api.md`
- `backend/README.md`
- route → controller → model

## 현재 (작업 전 이해)

- API 그룹 9개(`/api/tierlists`·`auth`·`inquiries`·`admin`·`notices`·`notifications`·`luck-draw`·`profile`·`events`) — 표는 `RDMD/features/backend-api.md`. 못 찾는 `/api/*` 는 JSON 404
- **행운 뽑기 포인트(`LuckProfile.points`)를 바꾸면 저장 직후 `utils/luckPointLog.recordPointChange()`** — 0 하한, 실제 증감만 기록, 실패해도 예외 없음. 이벤트 상금은 `eventController.addPoints(userId, delta, log)`
- 서버 프로세스 안에서 도는 일(랜덤 뽑기 5분 라운드 `startLadderScheduler`, 유튜브 동기화, 이벤트 자동 처리)이 있으므로 **같은 DB 로 서버를 두 군데서 오래 띄우지 않는다**(운영 Oracle pm2 는 instances 1)
- Node 서버는 켜질 때 코드를 읽는다 — 백엔드 코드를 바꾸면 서버를 다시 켜야 새 API 가 생긴다(빌드된 화면은 요청마다 디스크에서 읽어 먼저 바뀜)

## Do

1. 레이어: routes → controllers → models
2. 권한은 라우트 미들웨어에 명시
3. 모델 변경 시 컨트롤러 + 프론트 필드 계획
4. 비밀번호/리셋 토큰 해시 규칙
5. getClientIp, checkBlocked, appUrl 재사용
6. `.env.example` 문서화, 실 `.env` 커밋 금지
7. `npm start`, `/health`

## Do not

- 라우트에 장문 비즈니스 로직
- node_modules 수정
- 시크릿 하드코딩
- 무인증 삭제/관리 API
- **기존 주석 삭제**. 동작이 바뀌면 주석 문구만 고친다. 사람이 “지워” 하기 전엔 유지

## Checklist

- [ ] 미들웨어·상태코드
- [ ] 민감 필드 미노출
- [ ] 수동 테스트 안내
