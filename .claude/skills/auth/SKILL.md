---
name: auth
description: >
  회원가입, 로그인, 아이디 찾기, 비밀번호 재설정, JWT, auth_api.js.
  Use when /auth or login/signup/reset-password.
---

# Claude 스킬 — 인증

## When

- login / sign_up / find_account / reset_password
- JWT, authToken, 이메일, 차단 로그인

## Code map

- `user_login/*`, `auth_api.js`
- `backend/controllers/authController.js`, `models/User.js`, `routes/authRoutes.js`
- `backend/utils/jwtAuth.js`, `appUrl.js`
- `common.js` → `getAuthHeaders`

## Read first

- `RDMD/features/auth.md`
- `user_login/README.md`
- `RDMD/guides/security.md`

## Do

1. 재설정: 랜덤 토큰 + **SHA-256 해시만 DB** (JWT URL 재도입 금지)
2. API base = auth_api / getApiBase 동일 규칙
3. localStorage: `authToken`, `user` 키 유지
4. `adminAuthToken` 과 섞지 말 것
5. EMAIL 미설정 폴백 기존과 일치
6. 차단 검사 유지, 메일 링크는 APP_URL/appUrl

## Do not

- 비밀번호·평문 토큰 로그/응답
- `.env` 커밋
- 일반 JWT에 isAdmin 임의 부여

## Tasks

**A. 로그인 버그** — URL/헤더 → controller/Block → localStorage  
**B. 가입/이메일** — EMAIL 분기, 중복 처리  
**C. 비번 재설정** — forgot → validate → reset, 만료·1회성  
**D. 새 API** — routes + requireAuth + security  

## Checklist

- [ ] 가입→로그인→보호 API
- [ ] 리셋 토큰 평문 DB 없음
- [ ] auth_api.js 로드 여부
