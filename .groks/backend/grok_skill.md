---
name: hbu-backend
description: >
  Express 서버, routes, controllers, models, middleware, MongoDB.
  백엔드 API·스키마·미들웨어 작업 시 사용.
---

# 에이전트 스킬 — 백엔드 (backend)

## When

- 새 API / 라우트 / 컨트롤러 / 모델
- `requireAuth` / `requireAdmin`
- server.js 정적 서빙·에러 핸들러
- DB 스키마 변경

## Code map

```
backend/
├── server.js
├── config/db.js
├── routes/
├── controllers/
├── models/
├── middleware/auth.js
└── utils/
```

## Read first

- `RDMD/features/backend-api.md`
- `backend/README.md`
- 수정 대상 route → controller → model 순으로 읽기

## 현재 (작업 전 이해)

- API 그룹 9개(`/api/tierlists`·`auth`·`inquiries`·`admin`·`notices`·`notifications`·`luck-draw`·`profile`·`events`) — 표는 `RDMD/features/backend-api.md`. 못 찾는 `/api/*` 는 JSON 404
- **행운 뽑기 포인트(`LuckProfile.points`)를 바꾸면 저장 직후 `utils/luckPointLog.recordPointChange()`** — 0 하한, 실제 증감만 기록, 실패해도 예외 없음. 이벤트 상금은 `eventController.addPoints(userId, delta, log)`
- 서버 프로세스 안에서 도는 일(랜덤 뽑기 5분 라운드 `startLadderScheduler`, 유튜브 동기화, 이벤트 자동 처리)이 있으므로 **같은 DB 로 서버를 두 군데서 오래 띄우지 않는다**(운영 Oracle pm2 는 instances 1)
- Node 서버는 켜질 때 코드를 읽는다 — 백엔드 코드를 바꾸면 서버를 다시 켜야 새 API 가 생긴다(빌드된 화면은 요청마다 디스크에서 읽어 먼저 바뀜)

## Do

1. 레이어 유지: **routes → controllers → models** (+ middleware/utils)
2. 권한:
   - 공개 / `requireAuth` / `requireAdmin` 를 라우트에 명시
   - 관리 동작은 컨트롤러 내부 임시 체크보다 미들웨어 우선
3. 모델 변경 시: 컨트롤러 응답 + **프론트 필드** 동기화 계획
4. 비밀번호·리셋 토큰: 해시 저장 규칙 유지
5. IP·차단: `getClientIp`, `checkBlocked` 재사용
6. 메일 절대 URL: `appUrl.js` + `APP_URL`
7. 환경변수는 `.env.example` 문서화, 실제 `.env` 커밋 금지
8. 로컬 확인: `cd backend && npm start`, `/health`

## Do not

- 라우트 파일에 긴 비즈니스 로직 덤프
- `node_modules` 수정
- 프로덕션 시크릿 하드코딩
- 인증 없이 삭제·관리 엔드포인트 추가
- 파괴적 스키마 변경을 마이그레이션 설명 없이 강행
- **기존 주석 삭제** (`server.js` 등). 동작이 바뀌면 주석 문구만 고친다. 사람이 “지워” 하기 전엔 유지. 다른 AI가 지웠으면 복원

## Agent tasks

### A. 새 엔드포인트
1. model 필요 여부  
2. controller 함수  
3. route + middleware  
4. server 마운트 확인  
5. 프론트 연동 또는 curl 시나리오  
6. backend README 표 업데이트  

### B. 401/403 디버깅
1. 미들웨어 체인  
2. 토큰 종류 (user vs admin)  
3. `isAdmin` 클레임  

### C. 스키마 필드 추가
1. Mongoose schema  
2. create/update validation  
3. 기존 문서 default  
4. 프론트 폼·렌더  

### D. 정적 서빙 / clean URL
1. `server.js` 순서 (API first vs static)  
2. DEPLOY·path 가이드와 일치  
3. `groks/deploy` 스킬 참고  

## Checklist

- [ ] 미들웨어 올바른가
- [ ] 에러 상태 코드 적절한가
- [ ] 민감 필드 응답 제외
- [ ] `/health` 및 관련 API 수동 테스트 안내
