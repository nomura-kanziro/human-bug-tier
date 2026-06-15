# Backend 작업 로그 — backend_13

## 개요
**아이디 찾기·비밀번호 재설정** API를 구현하고, `User` 모델에 재설정 토큰 필드를 추가했습니다. 유저 로그인 응답에 JWT도 함께 반환합니다.

---

## 관련 커밋
- **commit 8fbbe60**
  - 제목: `feat(auth): JWT 인증, 좋아요 중복 방지, 계정 복구, 관리자 티어 신고`

---

## 변경된 파일
- Modified: `backend/models/User.js`
- Modified: `backend/controllers/authController.js`
- Modified: `backend/routes/authRoutes.js`

---

## User 모델 추가 필드
| 필드 | 타입 | 설명 |
|------|------|------|
| resetPasswordToken | String | 비밀번호 재설정 JWT |
| resetPasswordExpires | Date | 토큰 만료 시각 |

---

## API 엔드포인트

| 메서드 | 경로 | 기능 |
|--------|------|------|
| POST | `/api/auth/login` | 로그인 (+ `token` JWT 반환) |
| POST | `/api/auth/find-id` | 이메일로 아이디 안내 메일 |
| POST | `/api/auth/forgot-password` | 재설정 링크 메일 발송 |
| POST | `/api/auth/reset-password` | 새 비밀번호 설정 |

### find-id Body
```json
{ "email": "user@example.com" }
```

### forgot-password Body
```json
{ "nickname": "아이디", "email": "user@example.com" }
```

### reset-password Body
```json
{ "token": "재설정JWT", "password": "새비밀번호" }
```

---

## 보안·동작 규칙

### 공통 응답 (이메일 API)
- 등록 여부와 관계없이 동일 메시지 (`GENERIC_EMAIL_MSG`)
- 실제 메일은 `EMAIL_USER` + `EMAIL_APP_PASSWORD` 설정 시에만 발송

### forgot-password 흐름
1. nickname + email 일치 + `isVerified: true` 유저 조회
2. `jwt.sign({ email, purpose: 'reset' }, secret, { expiresIn: '1h' })`
3. DB에 `resetPasswordToken`, `resetPasswordExpires` 저장
4. 메일 링크: `http://localhost:5000/user_login/reset_password.html?token=...`

### reset-password 흐름
1. token + password 검증 (4자 이상)
2. `purpose === 'reset'` 확인
3. DB 토큰·만료일 일치 유저 조회
4. bcrypt 해시 후 저장, 토큰 필드 제거

### login 추가
- 차단 검사 (`isUserBlocked`)
- `signUserToken(user)` → 응답 `token` 필드

---

## 테스트 체크리스트
1. 로그인 시 token + user 반환
2. find-id / forgot-password 성공 응답
3. reset-password로 비밀번호 변경 후 새 비밀번호 로그인
4. 만료 토큰 400
5. 이메일 env 미설정 시에도 API 200

---

문서 생성일: 2026-06-16