# 커밋 요약 — 정보 기록 (information23)

## 개요
**사용자 로그인·계정 찾기·비밀번호 재설정** 프론트엔드를 백엔드 인증 API와 연동한 작업입니다. JWT 토큰 저장을 포함합니다.

---

## 관련 커밋
- **commit 8fbbe60**
  - 제목: `feat(auth): JWT 인증, 좋아요 중복 방지, 계정 복구, 관리자 티어 신고`

---

## 변경된 파일 목록
- Modified: `user_login/login.js`
- Modified: `user_login/find_account.js`
- Added: `user_login/reset_password.html`
- Added: `user_login/reset_password.js`

---

## 주요 구현 내용

### 1. 로그인 (`login.js`)
- `POST /api/auth/login` — nickname + password
- 성공 시 `localStorage.user` + **`localStorage.authToken`** 저장
- 차단된 사용자: `관리자로 인해 차단당했습니다.` 안내
- API 베이스: `http://localhost:5000` (고정)

### 2. 아이디 찾기 (`find_account.js`)
- 탭 UI: 아이디 찾기 / 비밀번호 찾기
- **아이디 찾기:** `POST /api/auth/find-id` — 이메일 입력
- **비밀번호 찾기:** `POST /api/auth/forgot-password` — 아이디 + 이메일
- 보안상 등록 여부와 관계없이 동일한 성공 메시지 표시

### 3. 비밀번호 재설정 (`reset_password.html` / `reset_password.js`)
- 이메일 링크: `?token=` 쿼리 파라미터로 접근
- 새 비밀번호 입력 후 `POST /api/auth/reset-password`
- 성공 시 로그인 페이지로 이동 안내

---

## 네비게이션 흐름
```
login.html
  ├─ find_account.html (아이디/비밀번호 찾기)
  │    └─ (이메일) reset_password.html?token=... (비밀번호 재설정)
  └─ 로그인 성공 → index.html
```

---

## 이메일 발송 조건
- 서버에 `EMAIL_USER`, `EMAIL_APP_PASSWORD` 환경변수 설정 시에만 실제 메일 발송
- 미설정 시에도 API는 동일한 성공 응답 (보안)

---

## 테스트 체크리스트
1. 로그인 성공 + `authToken` 저장
2. 아이디 찾기 API 호출 및 안내 메시지
3. 비밀번호 찾기 API 호출 및 안내 메시지
4. 재설정 링크(token)로 새 비밀번호 설정
5. 차단된 계정 로그인 시 차단 메시지

---

## 향후 개선 제안
- `login.js` API 베이스를 `getTierApiBase()` 등 공통 함수로 통일 (비-localhost 배포 대비)

---

문서 생성일: 2026-06-16