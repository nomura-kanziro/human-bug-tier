---
source: RDMD/information24.md
legacy_id: information24
area: frontend
---

> **원본 일지**: `information24.md` → 기능 폴더 재배치본  
> **순서 번호**: 파일명 앞 숫자 = 해당 기능 내 기록 순서

---
# 커밋 요약 — 정보 기록 (information24)

## 개요
**관리자 페이지**에 JWT 로그인 토큰 저장을 추가하고, 커스텀 메이커 **신고된 게시글·댓글 관리 UI**를 구현한 작업입니다.

---

## 관련 커밋
- **commit 8fbbe60**
  - 제목: `feat(auth): JWT 인증, 좋아요 중복 방지, 계정 복구, 관리자 티어 신고`

---

## 변경된 파일 목록
- Modified: `admin/admin-login.js`
- Modified: `admin/comments/comment-management.html`
- Modified: `admin/comments/comment-management.js`
- Modified: `admin/comments/comment-management.css`

---

## 주요 구현 내용

### 1. 관리자 로그인 JWT (`admin-login.js`)
- `POST /api/admin/login` 성공 시 `localStorage.authToken` 저장
- 이후 관리자 API 호출에 Bearer 토큰 사용

### 2. 티어 신고 관리 섹션 (comment-management)
- **신고 게시글 테이블** — 제목·작성자·신고 사유·일시
- **신고 댓글 테이블** — 게시글 ID·작성자·내용 요약·신고 사유
- 액션: **해제**(dismiss) / **삭제**(delete)

### 3. API 연동 (`comment-management.js`)
| 기능 | API |
|------|-----|
| 신고 게시글 목록 | `GET /api/admin/tier-reports/posts` |
| 신고 댓글 목록 | `GET /api/admin/tier-reports/comments` |
| 게시글 신고 해제 | `PATCH /api/admin/tier-reports/posts/:id/dismiss` |
| 댓글 신고 해제 | `PATCH /api/admin/tier-reports/comments/:id/dismiss` |
| 게시글 삭제 | `DELETE /api/admin/tier-reports/posts/:id` |
| 댓글 삭제 | `DELETE /api/admin/tier-reports/comments/:id` |

- `getAdminAuthHeaders()` — `getAuthHeaders()` 또는 `authToken` 직접 첨부
- 페이지 초기화 시 `loadTierReports()` 병렬 호출

### 4. 권한
- 모든 tier-reports API는 **관리자 JWT** + `isAdmin: true` 필요 (`requireAdmin`)
- 관리자 재로그인 필요 (JWT 도입 이후)

---

## 네비게이션 흐름
```
admin/admin-login.html
  → admin/comments/comment-management.html
    ├─ 문의 댓글 관리 (기존)
    ├─ 유저·차단 관리 (기존)
    ├─ 공지 관리 (기존)
    └─ 커스텀 메이커 신고 관리 (신규)
```

---

## 테스트 체크리스트
1. 관리자 로그인 후 `authToken` 저장
2. 신고된 게시글·댓글 목록 표시
3. 신고 해제 후 목록에서 사라짐
4. 삭제 후 DB·목록 반영
5. 일반 유저 토큰으로 tier-reports 접근 시 403

---

## 향후 개선 제안
- 문의 신고 테이블과 티어 신고 테이블 통합·필터 UI
- 신고 게시글 클릭 시 상세 페이지 바로가기 링크

---

문서 생성일: 2026-06-16