---
name: admin
description: >
  관리자 로그인, 대시보드, 차단, 티어 신고. Canonical for ANY AI.
---

# 공통 스킬 — 관리자

## When

- admin-login, 대시보드, 차단, 티어 신고, 관리 401/403

## Code map

- `admin/admin-login.*`, `admin_api.js`
- `admin/comments/comment-management.*`, `comment-detail.*`
- `backend/middleware/auth.js` (requireAdmin)
- adminRoutes, admin controllers
- 헤더 프로필 드롭다운(관리자용): `common.js` `buildAdminProfilePanelHTML()`, `getAdminInfo()`, `logoutAdmin()` — 일반 유저와 같은 `.user-profile-panel` 패턴(`my-page` 스킬 참고), 관리자 메뉴는 "관리하기"/"로그아웃"뿐

## Read first

- `.agents/common-rules.md` (C절)
- `RDMD/features/admin.md`
- `admin/README.md`
- `RDMD/guides/security.md`

## 현재 (작업 전 이해)

- 공지는 작성뿐 아니라 **수정**(PUT/PATCH `/api/notices/:id`)도 관리 페이지에서 함
- 티어 신고: `/api/admin/tier-reports/*`
- 회원 삭제: `DELETE /api/admin/users/:id` (`requireAdmin`, 계정+커스텀 글·댓글·문의 정리)
- 헤더 프로필 아이콘 클릭 시 관리자도 일반 유저와 동일한 드롭다운 패널(`#user-profile-panel`)을 씀 — 예전엔 전체화면 모달(`showAdminModal`)이었으나 제거됨. 마이페이지는 없음(관리자는 "관리하기"로 바로 이동)

## Do

1. 모든 관리 fetch → **getAdminAuthHeaders()**
2. 새 관리 라우트 → **requireAdmin**
3. 토큰: `adminAuthToken` / `isAdmin` (유저 토큰 분리)
4. UI 패턴: comment-management + 삭제/저장 후 `load*()`
5. 공지 필터 색 #10b981, 공지 수정 폼 저장/취소 유지
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
- [ ] 헤더 프로필 드롭다운 → "관리하기"/"로그아웃" 정상, 알림 벨과 상호 배타
