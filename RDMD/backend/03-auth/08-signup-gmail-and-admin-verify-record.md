---
area: backend
---

# 커밋 요약 — 가입 메일 Gmail 우선 + 관리자 직접 인증

## 개요

Brevo/Resend 키가 있어도 회원가입 인증 메일은 Gmail SMTP를 먼저 쓴다. 메일이 안 가면 관리자가 대시보드에서 인증하기를 누를 수 있다.

## 변경

- `sendSignupMail()` — Gmail이 있으면 API 키를 건너뜀. 실패 시 `sendAppMail` 폴백. `SIGNUP_MAIL_SKIP_API=false`면 공용 체인만.
- `PATCH /api/admin/users/:id/verify` (`requireAdmin`) — `isVerified=true`, 인증 토큰 삭제
- 관리 회원 표 미인증 행에 **인증하기**

## 테스트

- `EMAIL_USER`+앱 비밀번호 있으면 가입 시 Gmail로 메일
- 미인증 회원 → 관리자 인증하기 → 로그인 가능
- 일반 유저 토큰으로 PATCH verify → 403
