---
name: backend
description: >
  Express, routes, controllers, models, middleware, MongoDB. Canonical for ANY AI.
---

# 공통 스킬 — 백엔드

## When

- 새 API, 스키마, requireAuth/requireAdmin, 정적 서빙

## Code map

```
backend/server.js, config/, routes/, controllers/, models/,
middleware/auth.js, utils/
```

## Read first

- `RDMD/features/backend-api.md`
- `backend/README.md` (코드 옆)
- route → controller → model

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

## Checklist

- [ ] 미들웨어·상태코드
- [ ] 민감 필드 미노출
- [ ] 수동 테스트 안내
