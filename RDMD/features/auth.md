# 인증 시스템 (user_login)

회원가입 · 로그인 · 계정 찾기 · 비밀번호 재설정을 담당합니다.

## 위치

```
user_login/
├── login.html / login.js
├── sign_up.html / sign_up.js
├── find_account.html / find_account.js
├── reset_password.html / reset_password.js
└── auth_api.js
```

상세: [`user_login/README.md`](../../user_login/README.md)

---

## 주요 흐름

### 회원가입

1. `POST /api/auth/register` (nickname, email, password)  
2. `EMAIL_*` 설정 시 인증 메일 발송  
3. 미설정 시 `isVerified: true` 로 즉시 통과 (개발 편의)

### 로그인

1. `POST /api/auth/login`  
2. 차단 여부 검사 (`Block` / `isUserBlocked`)  
3. JWT 발급 → `localStorage.authToken`, `user`  
4. 이후 보호 API는 `getAuthHeaders()` 사용  

### 아이디 찾기

- 이메일 등으로 등록 닉네임 안내 (`find_account`)

### 비밀번호 재설정 (보안 강화 — information25 / backend_25)

| 단계 | API | 설명 |
|------|-----|------|
| 요청 | `forgot-password` | 랜덤 토큰 생성 → **SHA-256 해시**만 DB 저장 + 만료시간 |
| 메일 | (Nodemailer) | `APP_URL` 기반 절대 링크 `?token=평문` |
| 검증 | `validate-reset-token` | 해시 비교 |
| 변경 | `reset-password` | 비번 갱신 후 토큰 필드 제거 |

> 예전 JWT를 URL에 넣는 방식 대신, 일회성 랜덤 토큰 방식을 사용합니다.

---

## 프론트 유틸 (auth_api.js)

- `getAuthApiBase()` — common과 동일한 환경 규칙  
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
| `EMAIL_USER`, `EMAIL_APP_PASSWORD` | Gmail 앱 비밀번호 권장 |
| `APP_URL` | 재설정·인증 메일 절대 URL (Render 배포 후) |
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
