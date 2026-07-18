---
source: RDMD/information28.md
legacy_id: information28
area: frontend
---

> **원본 일지**: `information28.md` → 기능 폴더 재배치본  
> **순서 번호**: 파일명 앞 숫자 = 해당 기능 내 기록 순서

---
# 커밋 요약 — 정보 기록 (information28)

## 개요
인증 미들웨어(`requireAuth`, `requireAdmin`)를 정식으로 도입하고, 모든 관리자 전용 라우트에 일관되게 보호를 적용했습니다. 기존 라우트에 산발적으로 있던 권한 체크를 중앙화하여 보안을 강화했습니다.

---

## 관련 커밋
- **commit 437dfbf**
  - 제목: `feat(middleware): introduce proper auth middleware and secure admin routes`

---

## 변경된 파일 목록
- Added: `backend/middleware/auth.js`
- Modified: `backend/routes/adminRoutes.js`
- Modified: `backend/routes/inquiryRoutes.js`
- Modified: `backend/routes/noticeRoutes.js`
- Modified: `backend/routes/notificationRoutes.js`
- Modified: `backend/routes/tierRoutes.js` (일부)
- Modified: `backend/controllers/authController.js`

---

## 주요 구현 내용

### 1. backend/middleware/auth.js
```js
const { requireAuth, optionalAuth } = require('../utils/jwtAuth');

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (!req.auth?.isAdmin) {
      return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    }
    next();
  });
}

module.exports = { requireAuth, optionalAuth, requireAdmin };
```

### 2. 관리자 라우트 보호 (adminRoutes)
- `/users`, `/blocks/*`, `/tier-reports/*` 전부 `requireAdmin` 적용

### 3. inquiryRoutes
- 공개: 문의 등록, 조회, 신고
- 관리자 전용: `deleteAll`, `update`, `delete`, 답변 작성/수정/삭제 → requireAdmin

### 4. noticeRoutes
- GET 공개
- POST / PATCH(pin) / DELETE → requireAdmin

### 5. notificationRoutes
- 모든 알림 라우트 `requireAuth` 적용 (본인 데이터만)

### 6. authController 일부 정리
- JWT 서명 로직은 `utils/jwtAuth` 로 집중

---

## 관리자 API 호출 패턴 (프론트)
- `getAdminAuthHeaders()` 사용
- `Authorization: Bearer <adminAuthToken or authToken>`

---

## 테스트 체크리스트
1. 관리자 토큰 없이 `/api/admin/*` , `/api/notices` POST 등 401/403
2. 일반 유저 토큰으로 관리자 전용 작업 403
3. 올바른 admin 토큰으로 삭제/작성 성공
4. 알림 API는 로그인 사용자만 접근
5. middleware 통과 후 req.auth.isAdmin 확인

---

## 향후 개선 제안
- admin 전용 별도 JWT claim 강화
- 모든 보호 라우트에 require* 미들웨어 일괄 적용 감사

---
문서 생성일: 2026-06-20
