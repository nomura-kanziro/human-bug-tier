---
name: admin
description: >
  관리자 로그인, comment-management, 차단, 티어 신고, 공지/문의 관리.
  Use when /admin or admin dashboard.
---

# Claude 스킬 — 관리자

## When

- admin-login, 대시보드, 차단, 티어 신고, 관리 401/403

## Code map

- `admin/admin-login.*`, `admin_api.js`
- `admin/comments/comment-management.*`, `comment-detail.*`
- `backend/middleware/auth.js` (`requireAdmin`)
- `backend/routes/adminRoutes.js`, admin controllers
- 헤더 프로필 드롭다운: `common.js` `getCurrentIdentity()`/`renderUserProfile()` — 관리자도 일반 유저와 같은 메뉴 + "관리하기" 한 줄 추가

## Read first

- `RDMD/features/admin.md`
- `admin/README.md`
- `RDMD/guides/security.md`

## 현재 (작업 전 이해)

- 공지 **수정**: PUT/PATCH `/api/notices/:id` (관리 페이지 수정 버튼)
- 회원 삭제: `DELETE /api/admin/users/:id` (`requireAdmin`)
- 미인증 회원 직접 인증: `PATCH /api/admin/users/:id/verify` + 대시보드 **인증하기**
- 헤더 프로필 아이콘 = 일반 유저와 **완전히 같은** 드롭다운(`.user-profile-panel`, `my-page` 스킬 참고). 예전 전체화면 모달(`showAdminModal`)과 관리자 전용 축소 메뉴 둘 다 제거됨 — 지금은 마이페이지/게시판/사진변경/로그아웃 + "관리하기" 한 줄. 이유: 테스트 계정이 티 나면 안 됨(사용자 요청)
- 관리자도 `authToken` 이 세팅돼 있어(`admin-login.js`) `/api/luck-draw/*`, `/api/tierlists?mine=true` 등 일반 회원 API를 그대로 쓸 수 있음(검증 완료) — 백엔드 변경 불필요

## Do

1. 모든 관리 fetch → **getAdminAuthHeaders()**
2. 새 관리 라우트 → **requireAdmin**
3. 토큰: `adminAuthToken` / `isAdmin` (유저 토큰과 분리)
4. UI 패턴: comment-management + 삭제/저장 후 `load*()`
5. 공지 필터 색 #10b981, 공지 수정 폼 저장/취소 유지
6. 파괴 동작 confirm
7. ADMIN_INPUT_* 값 출력 금지

## Do not

- requireAdmin 누락
- 일반 JWT로 관리 API 성공 착각
- 비밀번호 하드코딩
- (요청 없으면) 헤더에 관리 링크 과다 노출

## Tasks

**A. 로그인 401** — /api/admin/login → localStorage → Authorization  
**B. 새 관리 기능** — route+middleware+UI+Admin 헤더+README  
**C. 티어 신고** — tier-reports dismiss/delete  
**D. 차단** — Block 모델 + 로그인 검사 일치  

## Checklist

- [ ] 관리자 로그인→대시보드
- [ ] 일반 토큰 → 403
- [ ] 수정 경로 스모크 + 헤더 누락 없음
- [ ] 헤더 프로필 드롭다운 열기/닫기, 마이페이지/게시판/사진변경/"관리하기"/"로그아웃" 전부 정상
