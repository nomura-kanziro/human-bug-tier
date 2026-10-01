# 인증 시스템 (user_login)

회원가입 · 로그인 · 계정 찾기 · 비밀번호 재설정을 담당합니다.

## 위치 (현행 React)

```
root-cloudflare/src/
├── pages/Login.jsx           # /login
├── pages/SignUp.jsx          # /signup
├── pages/FindAccount.jsx     # /find-account (아이디 찾기 · 비밀번호 찾기 탭)
├── pages/ResetPassword.jsx   # /reset-password?token=…
├── components/AuthShell.jsx  # 인증 페이지 공용 껍데기
└── lib/authApi.js            # /api/auth/* 호출(공용 apiRequest 사용)
backend/
├── controllers/authController.js
├── utils/mail.js             # 발송 체인
└── utils/mailTemplate.js     # 메일 HTML 공용 틀
```

옛 바닐라 주소(`/user_login/login.html`, `reset_password.html?token=` 등)는 `src/lib/paths.js` 가 새 경로로 보낸다 — 이미 발송된 옛 재설정 메일 링크도 열린다.
바닐라 원본은 `root-render/user_login/`(베타 종료·수정 금지).

---

## 주요 흐름

### 회원가입

1. `POST /api/auth/register` (nickname, email, password)  
2. 메일 설정 시 인증 메일 발송("계정 인증하기" 버튼, 링크 1시간 유효). 가입 메일도 기본은 **표준 순서(Brevo → Resend → Gmail SMTP)** — `sendSignupMail` 이 `sendAppMail` 체인을 그대로 탄다(2026-09-10 `1c7f473`). `SIGNUP_MAIL_SKIP_API=true` 일 때만 Gmail SMTP 를 먼저 시도하고, 실패하면 공용 체인으로 넘어간다. 운영 서버는 Gmail 만 설정돼 있어 실제로는 Gmail 로 나간다.  
3. 미설정 시 `isVerified: true` 로 즉시 통과 (개발 편의)  
4. 메일이 안 오면 계정은 만들어져 있음. 관리자가 `PATCH /api/admin/users/:id/verify` 로 직접 인증 가능.

### 로그인

1. `POST /api/auth/login`  
2. 차단 여부 검사 (`Block` / `isUserBlocked`)  
3. JWT 발급 → `localStorage.authToken`, `user`  
4. 이후 보호 API는 `getAuthHeaders()` 사용  

### 아이디 찾기

- `POST /api/auth/find-id` — **인증 완료된** 계정이면 닉네임(아이디)을 메일로 안내("로그인하러 가기" 버튼). 계정이 없어도 응답은 같게(존재 여부 노출 방지)

### 비밀번호 재설정 (보안 강화 — information25 / backend_25)

| 단계 | API | 설명 |
|------|-----|------|
| 요청 | `forgot-password` | 랜덤 토큰 생성 → **SHA-256 해시**만 DB 저장 + 만료시간 |
| 메일 | `utils/mail.js` `sendAppMail` | `APP_URL` 기반 절대 링크 `/user_login/reset_password.html?token=평문`(프론트가 `/reset-password` 로 보냄), "비밀번호 재설정하기" 버튼 |
| 검증 | `validate-reset-token` | 해시 비교 |
| 변경 | `reset-password` | 비번 갱신 후 토큰 필드 제거 |

> 예전 JWT를 URL에 넣는 방식 대신, 일회성 랜덤 토큰 방식을 사용합니다.

`EMAIL_*` 미설정이면 재설정 메일을 보낸 척하지 않고 **503**. SMTP 실패 시 **502**와 토큰 롤백. 미인증 계정도 재설정 요청이 가능하고, 성공 시 인증 처리됩니다.

---

## 메일 모양 (2026-09-29~)

회원가입 인증 · 아이디 찾기 · 비밀번호 재설정 메일 3종이 `backend/utils/mailTemplate.js` `buildAppMailHtml()` 한 틀을 쓴다(창시자 예시문 기준).

```
로고(움직이는 GIF human_bug_eyes_icon.gif) → 제목 → "항상 human-bug-tier를 이용해 주셔서 감사합니다." → 안내 문구
→ [파란 버튼] → 버튼 아래 안내(유효시간 등) → 문의 안내(<APP_URL>/inquiry · 카카오톡 오픈채팅) → "감사합니다."
→ 구분선 → 한 줄 띄우고 "본 메일은 발신전용 메일입니다. 이메일 수신 설정은 휴먼버그대학교 알림설정을 이용해주시길 바랍니다."
```

| 메일 | 제목 | 버튼 | 버튼 아래 |
|---|---|---|---|
| 회원가입 | 회원가입 인증 | 계정 인증하기 | 이 인증 링크는 1시간 동안만 유효합니다. |
| 아이디 찾기 | 아이디 찾기(아이디 강조) | 로그인하러 가기 | 본인이 요청하지 않았다면 무시 |
| 비밀번호 재설정 | 비밀번호 재설정 | 비밀번호 재설정하기 | 1시간 유효 + 본인 요청이 아니면 무시 |

- 흰 배경(회색 배경·테두리 없음), 표(table) 레이아웃 + 인라인 스타일만(메일 앱 호환). 로고·링크는 `APP_URL` 기준 절대 주소.
- 사용자 입력(아이디 찾기의 닉네임)은 HTML 이스케이프.
- 상세: [`../backend/03-auth/10-mail-template-record.md`](../backend/03-auth/10-mail-template-record.md)

## 프론트 유틸 (`src/lib/authApi.js`)

- 공용 `apiRequest`(`src/lib/api.js`) 로 `/api/auth/*` 호출 — `getApiBase()` 규칙 그대로
- 개발 포트 → `http://localhost:5000`
- 동일 오리진 → 상대 경로    

로그인/가입 HTML에 `auth_api.js` script 포함 여부 배포 시 확인.

---

## 일반 유저 vs 관리자 토큰

| 구분 | 저장 키 | 발급 | 미들웨어 |
|------|---------|------|----------|
| 일반 | `authToken` | `/api/auth/login` | `requireAuth` |
| 관리자 | `adminAuthToken`, `isAdmin` | `/api/admin/login` | `requireAdmin` |

관리자 페이지는 일반 토큰으로 접근해도 **403** 입니다.

---

## 환경 변수

| 변수 | 용도 |
|------|------|
| `JWT_SECRET` | JWT 서명 |
| `BREVO_API_KEY`/`BREVO_FROM`, `RESEND_API_KEY`, `EMAIL_USER`/`EMAIL_APP_PASSWORD`, `SIGNUP_MAIL_SKIP_API` | 이메일 발송(`backend/utils/mail.js`). 설정된 걸 전부 우선순위(Brevo→Resend→Gmail)대로 시도, 앞이 실패하면 자동으로 다음 걸로 대체 발송 — 상세: `RDMD/backend/03-auth/05-mail-provider-fallback-record.md` |
| `APP_URL` | 인증·재설정 메일 링크와 메일 로고의 절대 URL. 운영 서버는 `https://human-bug-tier.com` (2026-09-29~) |
| `MONGO_URI` | User 저장 |

---

## 보안 체크리스트

- [ ] 프로덕션 `JWT_SECRET` 강력 랜덤  
- [ ] 재설정 토큰 평문 DB 저장 금지 (해시만)  
- [ ] HTTPS  
- [ ] 토큰 만료(재설정 약 1시간) 동작 확인  
- [ ] 차단 유저 로그인 거부  

## 관련 기록

- information23, 25  
- backend_25  
