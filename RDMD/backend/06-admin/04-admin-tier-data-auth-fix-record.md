---
source: RDMD/backend/backend_26.md
legacy_id: backend_26
area: backend
---

> **원본 일지**: `backend_26.md` → 기능 폴더 재배치본  
> **순서 번호**: 파일명 앞 숫자 = 해당 기능 내 기록 순서

---
# Backend 작업 로그 — backend_26

## 개요
관리자 페이지에서 커스텀 메이커(티어 게시글·댓글) 데이터가 보이지 않던 문제를 수정했습니다. 조회용 GET 엔드포인트의 인증 요구를 완화하고 admin_api 분리와 연동했습니다.

---

## 관련 커밋
- **commit a3ee179**
  - 제목: `fix(admin): 어드민 커스텀 메이커 게시글/댓글 미표시 문제 수정`

---

## 변경된 파일
- Modified: `backend/routes/adminRoutes.js`

---

## 변경 내용

### tier-reports 라우트 인증 정책 조정
- GET `/api/admin/tier-reports/posts`
- GET `/api/admin/tier-reports/comments`
  - (당시) requireAdmin 제거 → 일반 auth만으로 조회 허용
- DELETE / PATCH (해제·삭제)는 requireAdmin 유지

### adminRoutes 구조
```js
router.get('/tier-reports/posts', getReportedPosts);      // 조회 완화
router.get('/tier-reports/comments', getReportedComments);
router.patch(..., requireAdmin, ...);
router.delete(..., requireAdmin, ...);
```

> 참고: 이후 미들웨어 작업에서 requireAdmin이 다시 일관 적용되었습니다 (backend_28 참고).

---

## 테스트 체크리스트
1. 일반 로그인으로 admin 댓글 관리 페이지 접속 시 데이터 표시
2. 신고 해제/삭제는 관리자 토큰 필요
3. admin_api.js 의 getAdminAuthHeaders 정상 동작

---
문서 생성일: 2026-06-20
