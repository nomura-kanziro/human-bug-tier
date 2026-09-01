---
name: auth
description: >
  회원가입, 로그인, 아이디 찾기, 비밀번호 재설정, JWT. Canonical for ANY AI.
---

# 공통 스킬 — 인증

## When

- login / sign_up / find_account / reset_password
- JWT, authToken, 이메일, 차단 로그인

## Code map

- `user_login/*`, `auth_api.js`
- backend authController, User, authRoutes, jwtAuth, appUrl
- `common.js` → getAuthHeaders
- `backend/utils/mail.js` — 이메일 발송(가입 인증·아이디 찾기·비번 재설정 전부 여기 경유). Brevo→Resend→Gmail 중 **설정된 걸 전부 순서대로 시도**(하나 실패해도 자동 대체) — `RDMD/backend/03-auth/05-mail-provider-fallback-record.md`

## Read first

- `.agents/common-rules.md` (C절)
- `RDMD/features/auth.md`
- `user_login/README.md`
- `RDMD/guides/security.md`

## Do

1. 재설정: 랜덤 토큰 + **SHA-256 해시만 DB** (JWT URL 금지)
2. API base = auth_api / getApiBase 동일
3. localStorage: `authToken`, `user` 유지
4. `adminAuthToken` 과 분리
5. **가입** EMAIL 미설정 → 즉시 `isVerified` (개발 폴백) 유지
6. **비번 찾기**는 가짜 성공 금지: EMAIL 설정 자체가 없으면 **503**, 설정된 provider가 **전부** 실패하면 **502** + 토큰 롤백(마지막 provider 에러의 `code`/`responseCode`/`providerDetail` 을 그대로 응답에 담아 원인 안내). Brevo `403 permission_denied "not yet activated"` 는 코드 문제가 아니라 Brevo 계정이 트랜잭션 발송 승인 대기 중인 것 — Brevo 고객지원에 활성화 요청 필요(코드로 우회 불가, 백업 provider로 완화만 가능)
7. 미인증 계정도 재설정 가능, 성공 시 인증 처리
8. 차단 검사 · APP_URL/appUrl 메일 링크

## Do not

- 비밀번호·평문 토큰 로그/응답
- `.env` 커밋
- 일반 JWT에 isAdmin 임의 부여
- 재설정 메일 실패를 성공처럼 안내

## Checklist

- [ ] 가입→로그인→보호 API
- [ ] 리셋 토큰 평문 DB 없음
- [ ] 찾기 실패 시 유저에게 원인 안내
- [ ] auth_api.js 로드
