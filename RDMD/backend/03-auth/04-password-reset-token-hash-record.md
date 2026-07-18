---
source: RDMD/backend/backend_25.md
legacy_id: backend_25
area: backend
---

> **원본 일지**: `backend_25.md` → 기능 폴더 재배치본  
> **순서 번호**: 파일명 앞 숫자 = 해당 기능 내 기록 순서

---
# Backend 작업 로그 — backend_25

## 개요
비밀번호 재설정 보안을 강화했습니다. JWT를 URL에 직접 넣는 대신 랜덤 토큰 + DB 해시 저장 방식을 사용하고, 배포 환경에서도 올바른 절대 링크를 생성할 수 있도록 `getAppBaseUrl` 유틸을 추가했습니다.

---

## 관련 커밋
- **commit 8ecfddc**
  - 제목: `fix(auth): 비밀번호 재설정 링크 만료 오류 수정`

---

## 변경된 파일
- Modified: `backend/controllers/authController.js`
- Modified: `backend/routes/authRoutes.js`
- Added: `backend/utils/appUrl.js`

---

## API 엔드포인트 (신규/변경)

| 메서드 | 경로                              | 기능                     |
|--------|-----------------------------------|--------------------------|
| POST   | `/api/auth/forgot-password`       | 비밀번호 재설정 요청     |
| GET    | `/api/auth/validate-reset-token`  | 토큰 유효성 사전 검증    |
| POST   | `/api/auth/reset-password`        | 새 비밀번호 설정         |

기존:
- `POST /api/auth/find-id`

---

## 주요 변경 사항

### 1. 랜덤 토큰 방식 (JWT URL → Random Token)
- `createResetToken()` : crypto.randomBytes(32)
- 저장: `resetPasswordToken = sha256(token)`
- 검증: `findUserByResetToken` 에서 hash 비교 + expires 체크

### 2. appUrl 유틸 (backend/utils/appUrl.js)
```js
getAppBaseUrl(req)
  - process.env.APP_URL 우선
  - x-forwarded-proto/host (Render 지원)
  - fallback: localhost:PORT
```
- 재설정 URL 생성 시 사용:
  ```js
  const resetUrl = `${getAppBaseUrl(req)}/user_login/reset_password.html?token=${resetToken}`;
  ```

### 3. forgotPassword 컨트롤러
- 이메일 설정(EMAIL_USER/APP_PASSWORD)이 있을 때만 실제 메일 발송
- 설정 없으면 GENERIC 메시지만 반환 (보안)

### 4. resetPassword / validate
- 토큰으로 사용자 조회 후 비밀번호 bcrypt 재해싱
- 사용 후 토큰 필드 초기화

---

## 라우트 등록
```js
// authRoutes.js
router.post('/forgot-password', forgotPassword);
router.get('/validate-reset-token', validateResetToken);
router.post('/reset-password', resetPassword);
```

---

## 테스트 체크리스트
1. DB에 resetPasswordToken + expires 잘 저장되는지
2. 이메일 수신 후 링크로 validate → true
3. 잘못된 토큰 → valid:false
4. 비밀번호 변경 후 기존 토큰으로 재시도 불가
5. Render에서 APP_URL 설정 시 절대 링크가 올바른 도메인으로 생성

---

## 향후 개선 제안
- 토큰 재사용 방지 (used flag)
- Rate limit on forgot-password

---
문서 생성일: 2026-06-20
