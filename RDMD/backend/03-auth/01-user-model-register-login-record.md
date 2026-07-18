---
source: RDMD/backend/backend_3.md
legacy_id: backend_3
area: backend
---

> **원본 일지**: `backend_3.md` → 기능 폴더 재배치본  
> **순서 번호**: 파일명 앞 숫자 = 해당 기능 내 기록 순서

---
# Backend 작업 로그 — backend_3

## 개요
일반 사용자 인증을 위한 User 모델 추가 및 회원가입·이메일 인증·로그인 API를 구현한 작업입니다.

---

## 관련 커밋
- **commit 02cf378** — `feat(auth): 사용자 모델 추가 (User)`
- **commit 8ca982b** — `feat(auth): 로그인 기능 백엔드 연동 및 일반 사용자 프로필 UI 개선` (백엔드 파트)

---

## 변경된 파일
- Added: `backend/models/User.js`
- Modified: `backend/controllers/authController.js` — register, verifyEmail, login
- Modified: `backend/routes/authRoutes.js` — `/register`, `/verify/:token`, `/login`

---

## User 모델 스키마
| 필드 | 타입 | 설명 |
|------|------|------|
| email | String | unique, lowercase, 필수 |
| password | String | bcrypt 해시 저장 |
| nickname | String | 로그인 아이디로 사용 |
| ip | String | 가입 시 클라이언트 IP |
| isVerified | Boolean | 이메일 인증 완료 여부 |
| verificationToken | String | JWT 인증 토큰 |
| verificationTokenExpires | Date | 토큰 만료 시각 |

---

## API 엔드포인트

### POST `/api/auth/register`
- **Body**: `{ email, password, nickname }`
- 이메일 중복 검사 → bcrypt 암호화 → User 저장
- JWT 인증 토큰 생성 후 Gmail(nodemailer)로 인증 메일 발송
- 인증 URL: `http://localhost:5000/api/auth/verify/{token}`

### GET `/api/auth/verify/:token`
- JWT 토큰 검증 후 `isVerified = true` 설정
- 성공 시 HTML 응답 + 로그인 페이지 리다이렉트

### POST `/api/auth/login`
- **Body**: `{ userId, password }` (`userId` = nickname)
- 비밀번호 bcrypt 비교, 이메일 인증 여부 확인
- 성공 시 `{ success, user: { nickname, email, _id } }` 반환

---

## 환경변수 (.env)
```
JWT_SECRET=...
EMAIL_USER=...
EMAIL_APP_PASSWORD=...
```

---

## 테스트 체크리스트
1. `POST /api/auth/register` → 201 및 인증 메일 발송 확인
2. `GET /api/auth/verify/:token` → isVerified true 변경 확인
3. 미인증 계정 로그인 시 403 응답 확인
4. 인증 완료 계정 로그인 시 user 정보 반환 확인

---

## 향후 개선 제안
- 로그인 JWT/세션 토큰 발급
- 비밀번호 재설정 API
- refresh token 및 토큰 만료 처리

---

문서 생성일: 2026-06-15