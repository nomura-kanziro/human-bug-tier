# Backend 작업 로그 — backend_14

## 개요
관리자용 **커스텀 메이커 신고 관리 API**를 구현했습니다. 신고된 티어 게시글·댓글을 조회·해제·삭제할 수 있습니다.

---

## 관련 커밋
- **commit 8fbbe60**
  - 제목: `feat(auth): JWT 인증, 좋아요 중복 방지, 계정 복구, 관리자 티어 신고`

---

## 변경된 파일
- Added: `backend/controllers/adminTierReportController.js`
- Modified: `backend/routes/adminRoutes.js` — tier-reports 라우트 + `requireAdmin`

---

## API 엔드포인트

| 메서드 | 경로 | 기능 |
|--------|------|------|
| GET | `/api/admin/tier-reports/posts` | 신고 게시글 목록 |
| GET | `/api/admin/tier-reports/comments` | 신고 댓글 목록 |
| PATCH | `/api/admin/tier-reports/posts/:id/dismiss` | 게시글 신고 해제 |
| PATCH | `/api/admin/tier-reports/comments/:id/dismiss` | 댓글 신고 해제 |
| DELETE | `/api/admin/tier-reports/posts/:id` | 신고 게시글 삭제 |
| DELETE | `/api/admin/tier-reports/comments/:id` | 신고 댓글 삭제 |

### 권한
- 모든 엔드포인트: `requireAdmin` (JWT + `isAdmin: true`)

---

## 컨트롤러 동작

### 목록 조회
- `TierList.find({ reported: true })` — updatedAt DESC
- `TierPostComment.find({ reported: true })` — updatedAt DESC

### dismiss (신고 해제)
- `reported = false`, `reportReason = ''`, `reportDetail = ''`

### deleteReportedPost
- `TierList.findByIdAndDelete`
- `TierPostComment.deleteMany({ tierListId })` — 연관 댓글 함께 삭제

### deleteReportedComment
- 해당 댓글 + `parentCommentId`가 해당 댓글인 대댓글 함께 삭제

---

## 신고 데이터 발생 경로
| 대상 | API |
|------|-----|
| 게시글 | `POST /api/tierlists/:id/report` (tierController) |
| 댓글 | `POST /api/tierlists/:id/comments/:commentId/report` (tierCommentController) |

---

## 테스트 체크리스트
1. 신고된 게시글·댓글만 목록에 표시
2. dismiss 후 reported false, 목록에서 제외
3. 게시글 삭제 시 댓글 연쇄 삭제
4. 댓글 삭제 시 대댓글 연쇄 삭제
5. 비관리자 토큰 403

---

## 향후 개선 제안
- 관리자 POST/DELETE/PATCH 전역 `requireAdmin` 일관 적용
- 신고 통계·알림 웹훅

---

문서 생성일: 2026-06-16