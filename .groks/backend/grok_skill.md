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
