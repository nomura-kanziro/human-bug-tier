---
name: hbu-admin
description: >
  관리자 로그인, comment-management, 차단, 티어 신고, 공지/문의 관리 UI.
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
| `admin/admin-login.*` | 로그인 |
| `admin/admin_api.js` | API base + `getAdminAuthHeaders` |
| `admin/comments/comment-management.*` | 통합 대시보드 |
| `admin/comments/comment-detail.*` | 문의 상세 |
| `backend/middleware/auth.js` | `requireAdmin` |
| `backend/routes/adminRoutes.js` | 관리 API |
| `backend/controllers/adminController.js` | 유저·차단 등 |
| `backend/controllers/adminTierReportController.js` | 티어 신고 |

## Read first

- `RDMD/features/admin.md`
- `admin/README.md`
- `RDMD/guides/security.md`

## Do

1. 모든 관리 fetch에 **`getAdminAuthHeaders()`**
2. 새 관리 라우트에 **`requireAdmin`** 필수
3. 토큰 키: `adminAuthToken`, `isAdmin` — 일반 `authToken` 과 분리
4. UI 패턴은 `comment-management` 복제 (필터·테이블·삭제 후 `load*()`)
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
2. `comment-management` UI 섹션  
3. Admin 헤더 fetch  
4. 성공 후 목록 리로드  
5. `admin/README.md` + RDMD  

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
