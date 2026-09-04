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
- `backend/utils/mail.js` — 아이디 찾기·비번 재설정은 Brevo→Resend→Gmail. **가입 인증 메일만** Gmail이 있으면 Brevo/Resend를 건너뜀 (`sendSignupMail`). `SIGNUP_MAIL_SKIP_API=false`면 공용 체인.

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
5. **가입** EMAIL 미설정 → 즉시 `isVerified` (개발 폴백) 유지. 메일 실패해도 계정은 남음. 관리자 `PATCH /api/admin/users/:id/verify` 로 직접 인증 가능.
6. **비번 찾기**는 가짜 성공 금지: EMAIL 설정 자체가 없으면 **503**, 설정된 provider가 **전부** 실패하면 **502** + 토큰 롤백. 설정된 provider가 2개 이상인데 전부 실패하면 `providerDetail`에 **시도한 provider 전부의 원인이 `Brevo: ... / Resend: ... / Gmail: ...` 형태로 합쳐져서** 응답에 담김(1개만 시도했으면 그 provider 에러만) — 마지막 provider 에러 하나만 보고 판단하지 말 것
7. Brevo `403 permission_denied "not yet activated"` 는 코드 문제가 아니라 Brevo 계정이 트랜잭션 발송 승인 대기 중인 것 — Brevo 고객지원에 활성화 요청 필요(코드로 우회 불가, 백업 provider로 완화만 가능)
8. **`RESEND_API_KEY`만 등록한다고 아무한테나 발송되는 게 아님** — 도메인 인증 전 Resend는 계정 가입 이메일에만 보낼 수 있다(스팸 방지 정책). "own email address"/"verify a domain" 이 뜨면 resend.com에서 도메인 인증부터. `RDMD/backend/03-auth/07-mail-aggregated-error-record.md` 참고
9. Gmail 쪽 에러가 **`ETIMEDOUT`/`ESOCKET`/`ECONNREFUSED`/`ECONNECTION`** 이면 계정·비번 문제가 아니라 **호스팅이 SMTP 아웃바운드 포트(465/587)를 막아둔 것**(Render 등에서 흔함) — 재시도·포트 전환으로도 절대 안 뚫림. Resend/Brevo(HTTPS) 로 가야 함, `RDMD/backend/03-auth/06-gmail-smtp-timeout-hint-record.md` 참고
10. 미인증 계정도 재설정 가능, 성공 시 인증 처리
11. 차단 검사 · APP_URL/appUrl 메일 링크

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
