# User Login (인증 시스템)

회원가입, 로그인, 아이디 찾기, 비밀번호 재설정 기능을 제공합니다.

## 주요 기능

- 회원가입 (이메일 + 닉네임 + 비밀번호)
- 이메일 인증 (선택적)
- 로그인 (JWT 발급)
- 아이디 찾기
- 비밀번호 재설정 (랜덤 토큰 + 이메일 링크)
- 차단된 계정 로그인 차단

## 작동 원리

### 인증 흐름
1. 회원가입 → `/api/auth/register`
2. (이메일 설정 시) 인증 메일 발송
3. 로그인 → `/api/auth/login`
4. 성공 시 `authToken` + `user` 정보 localStorage 저장

### 비밀번호 재설정 (보안 강화)
- 기존 JWT URL 대신 **랜덤 토큰 + SHA256 해시** 사용
- `forgot-password` → DB에 `resetPasswordToken` (해시) + 만료시간 저장
- 이메일로 `?token=xxx` 링크 전달
- `validate-reset-token` → `reset-password` 순서로 처리

### API 베이스 처리
`auth_api.js`에서 환경에 따라 자동으로 API 주소를 결정:
- 로컬 개발 (5500, 3000 등) → `http://localhost:5000`
- Render / 같은 오리진 → 상대 경로

## 파일 구조

```
user_login/
├── login.html / login.js
├── sign_up.html / sign_up.js
├── find_account.html / find_account.js
├── reset_password.html / reset_password.js
└── auth_api.js                    # API 주소 결정 유틸
```

## 유지보수 가이드

### 이메일 기능 끄기
`EMAIL_USER`와 `EMAIL_APP_PASSWORD`를 설정하지 않으면:
- 회원가입 즉시 `isVerified: true`
- 비밀번호 재설정 메일은 발송되지 않고 안내만 표시

### 토큰 보안
- 비밀번호 재설정 토큰은 **평문으로 DB에 저장하지 않음**
- 항상 SHA-256 해시 후 저장
- 사용 후 토큰 필드 삭제

### 로그인 유지
- `localStorage.authToken`
- `common.js`의 `getAuthHeaders()`로 모든 fetch에 자동 첨부

### 차단 시스템 연동
로그인 시 `isUserBlocked()` 체크 → 차단 사유 안내

## 보안 권장 사항
- `JWT_SECRET`은 반드시 강력한 값으로 설정
- 프로덕션에서는 HTTPS 필수
- 비밀번호 재설정 링크는 1시간 후 만료

---

**참고**
- [backend/README.md](../backend/README.md) (authController)
- 루트 README의 시연 가이드
