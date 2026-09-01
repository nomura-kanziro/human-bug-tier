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
- `backend/utils/mail.js` — Brevo→Resend→Gmail 자동 대체 발송 (`RDMD/backend/03-auth/05-mail-provider-fallback-record.md`)
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
5. **가입** EMAIL 미설정 → 즉시 `isVerified` 폴백 유지
6. **비번 찾기** 가짜 성공 금지: EMAIL 설정 자체가 없으면 **503**, 설정된 provider가 전부 실패하면 **502** + 토큰 롤백. `sendAppMail()` 은 설정된 provider(Brevo/Resend/Gmail)를 전부 순서대로 시도하니, 하나가 막혀도(예: Brevo 계정 미승인) 나머지가 설정돼 있으면 자동으로 성공함 — 502가 뜬다는 건 **설정된 전부**가 실패했다는 뜻
7. `detail` 이 `ETIMEDOUT`/`ESOCKET`/`ECONNREFUSED`/`ECONNECTION` 이면 Gmail SMTP 포트가 호스팅에서 막힌 것(Render 등) — 재시도해도 안 뚫림, Resend/Brevo(HTTPS)로 전환 필요
7. 미인증 계정도 재설정 가능, 성공 시 인증 처리
8. 차단 검사 유지, 메일 링크는 APP_URL/appUrl

## Do not

- 비밀번호·평문 토큰 로그/응답
- `.env` 커밋
- 일반 JWT에 isAdmin 임의 부여
- 재설정 메일 실패를 성공처럼 안내

## Tasks

**A. 로그인 버그** — URL/헤더 → controller/Block → localStorage  
**B. 가입/이메일** — EMAIL 분기, 중복 처리  
**C. 비번 재설정** — forgot → validate → reset, 만료·1회성  
**D. 새 API** — routes + requireAuth + security  

## Checklist

- [ ] 가입→로그인→보호 API
- [ ] 리셋 토큰 평문 DB 없음
- [ ] 찾기 실패 시 유저에게 원인 안내
- [ ] auth_api.js 로드 여부
