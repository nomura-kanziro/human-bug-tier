---
source: RDMD/backend/backend_28.md
legacy_id: backend_28
area: backend
---

> **원본 일지**: `backend_28.md` → 기능 폴더 재배치본  
> **순서 번호**: 파일명 앞 숫자 = 해당 기능 내 기록 순서

---
# Backend 작업 로그 — backend_28

## 개요
`requireAdmin` 미들웨어를 도입하고 모든 관리자 전용 API에 일관된 보호를 적용했습니다. 라우트별로 흩어져 있던 권한 체크를 중앙화했습니다.

---

## 관련 커밋
- **commit 437dfbf**

---

## 변경된 파일
- Added: `backend/middleware/auth.js`
- Modified: `backend/routes/*` (admin, inquiry, notice, notification 등)
- Modified: `backend/controllers/authController.js` (간접)

---

## 미들웨어 상세

### auth.js
- `requireAuth` : jwtAuth 유틸 재사용 (req.auth 채움)
- `requireAdmin` : requireAuth 후 `isAdmin` 체크 → 403

### 적용 라우트 예시

**adminRoutes.js**
```js
router.get('/users', requireAdmin, getUsers);
router.get('/tier-reports/posts', requireAdmin, getReportedPosts);
... (모든 관리자 작업)
```

**inquiryRoutes.js**
```js
// 관리자 전용
router.delete('/', requireAdmin, deleteAllInquiries);
router.post('/:id/answers', requireAdmin, addAnswer);
```

**noticeRoutes.js**
```js
router.post('/', requireAdmin, createNotice);
router.delete('/:id', requireAdmin, deleteNotice);
router.patch('/:id/pin', requireAdmin, togglePin);
```

**notificationRoutes.js**
```js
router.use(requireAuth); // 또는 개별
```

---

## 이전 대비 개선점
- 산발적인 토큰 검사 → 미들웨어로 통일
- 실수로 보호 빠진 엔드포인트 방지
- 프론트 `getAdminAuthHeaders()` 와 매칭

---

## 테스트 체크리스트
1. 미들웨어 없이 직접 호출 시 401/403
2. admin 토큰으로 모든 보호 라우트 성공
3. 일반 토큰 → 403 on admin-only
4. 로그인 사용자만 알림 접근

---
문서 생성일: 2026-06-20
