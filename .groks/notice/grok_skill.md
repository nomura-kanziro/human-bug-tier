---
name: hbu-notice
description: >
  공지사항, 새 소식, 핀, notice 페이지, 메인 미리보기.
  공지 기능 작업 시 사용.
---

# 에이전트 스킬 — 공지사항 (notice)

## When

- 공지/새 소식 목록·상세
- 핀(고정), 카테고리
- 메인 페이지 공지 미리보기
- 관리자 공지 CRUD UI 연동

## Code map

| 경로 | 역할 |
|------|------|
| `notice/notice.*`, `all_notices.html`, `news.html` | 목록 |
| `notice/notice-detail.*` | 상세 |
| `index.html` | 미리보기 |
| `admin/comments/comment-management.*` | 관리자 공지 UI |
| `backend/controllers/noticeController.js` | API |
| `backend/models/Notice.js` | 스키마 |
| `backend/routes/noticeRoutes.js` | 라우트 |

## Read first

- `RDMD/features/notice.md`
- `notice/README.md`

## Do

1. **읽기 GET 공개**, 작성/수정/삭제/핀은 **`requireAdmin`**
2. category: `notice` | `news` 기존 enum 존중 — 확장 시 프론트 라벨·관리 필터 동시 수정
3. 정렬: pinned 우선 → pinnedAt → createdAt
4. 핀 상한(프론트 MAX 5) 변경 시 백엔드 검증 필요 여부 언급
5. 관리자 UI 색상: 공지 필터 **#10b981** 계열 유지
6. 관리 fetch: **`getAdminAuthHeaders()`** (information29 교훈)
7. 링크·상세 URL: getBasePath 준수

## Do not

- 공지 쓰기를 일반 `requireAuth` 만으로 열어두기
- 관리자 삭제 API 헤더 누락
- 메인 미리보기와 목록 API 응답 필드 불일치 방치

## Agent tasks

### A. 공지 UI (유저)
1. 목록 필터·상세 렌더  
2. API `GET /api/notices`  
3. 빈 목록·에러 상태  

### B. 핀 / 카테고리
1. PATCH pin 라우트·권한  
2. 관리 UI 토글 후 목록 갱신  
3. 메인 미리보기 반영  

### C. 관리자 공지 섹션
1. `groks/admin/grok_skill.md` 와 함께  
2. create/delete/pin 헤더  
3. 필터 select 스타일 통일  

## Checklist

- [ ] 비로그인 읽기 OK
- [ ] 비관리자 쓰기 거부
- [ ] 관리자 작성·핀·삭제 OK
- [ ] 메인 미리보기 OK
