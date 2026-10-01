---
name: hbu-admin
description: >
  관리자 로그인, 관리자 대시보드(AdminDashboard), 빠른 이동, 차단, 티어 신고, 공지/문의 관리, 이벤트 관리, 행운 뽑기 관리 UI.
  어드민·운영 기능 작업 시 사용.
---

# 에이전트 스킬 — 관리자 (admin)

## When

- `/admin` 로그인·대시보드
- 댓글 관리, 공지 관리, 문의 답변, 차단, 티어 신고
- `admin_api.js`, `requireAdmin`
- 관리자 401/403 디버깅

## Code map

| 경로 | 역할 |
|------|------|
| `root-cloudflare/src/pages/AdminLogin.jsx` | 로그인 (`/admin/login`) |
| `root-cloudflare/src/lib/api.js` | `adminRequest` · `getAdminAuthHeaders` |
| `root-cloudflare/src/pages/AdminDashboard.jsx` | 통합 대시보드 (`/admin`, 빠른 이동 `quickItems`) |
| `root-cloudflare/src/pages/AdminCommentDetail.jsx` | 문의 상세 (`/admin/comment`) |
| `root-cloudflare/src/components/AdminEventManager.jsx` | 이벤트 관리 |
| `root-cloudflare/src/components/AdminLuckManager.jsx` | 행운 뽑기 관리 (조회 전용) |
| `backend/controllers/adminLuckController.js` | `/api/admin/luck/*` (requireAdmin) |
| `root-render/admin/*` | 바닐라 보관본 — 수정 금지 |
| `backend/middleware/auth.js` | `requireAdmin` |
| `backend/routes/adminRoutes.js` | 관리 API |
| `backend/controllers/adminController.js` | 유저 목록·회원 삭제·로그인 |
| `DELETE /api/admin/users/:id` | 회원 삭제 (`requireAdmin`, 글·댓글·문의 정리) |
| `backend/controllers/adminTierReportController.js` | 티어 신고 |

## Read first

- `RDMD/features/admin.md`
- `RDMD/frontend/07-admin/11-admin-quicknav-record.md`, `12-admin-luck-manager-record.md` (바닐라 `root-render/admin/README.md` 는 보관본)
- `RDMD/guides/security.md`

## 현재 (작업 전 이해)

- **이벤트 관리**(`AdminEventManager`): 메모리 기록 이벤트·티어표 공개 열기/마감/정산 — 여는 순간 회원 전체 알림(되돌릴 수 없음)
- **행운 뽑기 관리**(`AdminLuckManager`, 2026-10-01): 조회 전용. `GET /api/admin/luck/users`, `/users/:userId`, `/users/:userId/points` — 회원별 3모드 기록·포인트 원장. 지갑 주인 [관리자]/[탈퇴] 배지
- 관리자 로그인은 관리자 토큰을 `adminAuthToken` **과 `authToken` 둘 다**에 저장한다(`AdminLogin.jsx`). 그래서 관리자가 일반 기능(행운 뽑기 등)을 쓰면 `req.auth.sub` 가 **Admin 문서 id** 가 된다 — 회원 id 로 찾는 코드는 관리자를 못 찾으니 관리자도 함께 찾을 것(예: `adminLuckController.resolveAccounts`)

## Do

1. 모든 관리 fetch에 **`getAdminAuthHeaders()`**
2. 새 관리 라우트에 **`requireAdmin`** 필수
3. 토큰 키: `adminAuthToken`, `isAdmin` — 일반 `authToken` 과 분리
4. UI 패턴: 큰 기능은 `src/components/Admin*Manager.jsx` + `<section id="admin-xxx" data-admin-anchor>`, `AdminDashboard.jsx` 의 `quickItems` 에 빠른 이동 태그를 같은 순서로 추가. 저장·삭제 후 목록 다시 불러오기
5. 공지 필터 색 **#10b981** 유지
6. 삭제/차단 등 파괴적 동작은 confirm UX 유지·추가
7. 시드 관리자: `ADMIN_INPUT_ID` / `ADMIN_INPUT_PW` (값 출력 금지)

## Do not

- 관리 페이지 링크를 헤더 일반 메뉴에 크게 노출 (요청 없으면)
- requireAdmin 빠진 관리 엔드포인트
- 일반 유저 JWT로 관리 API 호출 테스트만 하고 성공으로 착각
- 비밀번호를 문서/코드에 하드코딩

## Agent tasks

### A. 로그인 401
1. `/api/admin/login` 응답·시드  
2. localStorage 저장 키  
3. 이후 요청 Authorization 헤더  

### B. 새 관리 기능
1. backend route + requireAdmin + controller  
2. `src/components/Admin*Manager.jsx` 섹션 + `AdminDashboard` `quickItems` 태그  
3. Admin 헤더 fetch  
4. 성공 후 목록 리로드  
5. RDMD (`frontend/07-admin/`, 기능 문서 `RDMD/features/admin.md`)  

### C. 티어 신고 처리
1. `tier-reports` posts/comments API  
2. dismiss vs delete  
3. 프론트 테이블·버튼  

### D. 차단
1. Block 모델 필드  
2. 로그인 시 차단 검사와 일치  
3. 만료·해제  

## Checklist

- [ ] 관리자 로그인 → 대시보드
- [ ] 일반 토큰으로 관리 API → 403
- [ ] 공지/문의/신고/차단 중 수정한 경로 스모크
- [ ] 헤더 누락 없는 fetch
