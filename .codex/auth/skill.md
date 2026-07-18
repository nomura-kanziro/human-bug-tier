---
name: auth
description: >
  회원가입, 로그인, 아이디 찾기, 비밀번호 재설정, JWT, auth_api.js.
  Codex: user authentication.
---

# Codex 스킬 — 인증

## When

- login / sign_up / find_account / reset_password
- JWT, authToken, 이메일, 차단 로그인

## Code map

- `user_login/*`, `auth_api.js`
- `backend` authController, User, authRoutes, jwtAuth, appUrl
- `common.js` → getAuthHeaders

## Read first

- `RDMD/features/auth.md`
- `user_login/README.md`
- `RDMD/guides/security.md`

## Do

1. 재설정: 랜덤 토큰 + **SHA-256 해시만 DB** (JWT URL 금지)
2. API base = auth_api / getApiBase 동일
3. localStorage: `authToken`, `user` 유지
4. `adminAuthToken` 과 분리
5. EMAIL 미설정 폴백 기존 일치
6. 차단 검사 · APP_URL/appUrl 메일 링크

## Do not

- 비밀번호·평문 토큰 로그/응답
- `.env` 커밋
- 일반 JWT에 isAdmin 임의 부여

## Checklist

- [ ] 가입→로그인→보호 API
- [ ] 리셋 토큰 평문 DB 없음
- [ ] auth_api.js 로드
