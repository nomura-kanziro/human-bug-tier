---
name: admin
description: >
  관리자 로그인, comment-management, 차단, 티어 신고, 공지/문의 관리.
  Codex: admin dashboard.
---

# Codex 스킬 — 관리자

## When

- admin-login, 대시보드, 차단, 티어 신고, 관리 401/403

## Code map

- `admin/admin-login.*`, `admin_api.js`
- `admin/comments/comment-management.*`, `comment-detail.*`
- `backend/middleware/auth.js` (requireAdmin)
- adminRoutes, admin controllers

## Read first

- `RDMD/features/admin.md`
- `admin/README.md`
- `RDMD/guides/security.md`

## Do

1. 모든 관리 fetch → **getAdminAuthHeaders()**
2. 새 관리 라우트 → **requireAdmin**
3. 토큰: `adminAuthToken` / `isAdmin` (유저 토큰 분리)
4. UI 패턴: comment-management + 삭제 후 `load*()`
5. 공지 필터 색 #10b981
6. 파괴 동작 confirm
7. ADMIN_INPUT_* 값 출력 금지

## Do not

- requireAdmin 누락
- 일반 JWT로 관리 API 성공 착각
- 비밀번호 하드코딩

## Checklist

- [ ] 관리자 로그인→대시보드
- [ ] 일반 토큰 → 403
- [ ] 헤더 누락 없는 fetch
