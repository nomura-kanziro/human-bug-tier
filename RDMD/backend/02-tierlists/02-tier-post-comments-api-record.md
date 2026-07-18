---
source: RDMD/backend/backend_9.md
legacy_id: backend_9
area: backend
---

> **원본 일지**: `backend_9.md` → 기능 폴더 재배치본  
> **순서 번호**: 파일명 앞 숫자 = 해당 기능 내 기록 순서

---
# Backend 작업 로그 — backend_9

## 개요
커스텀 메이커 게시글 **댓글 API**를 구현했습니다. `TierPostComment` 모델과 `tierCommentController`를 추가하고 `/api/tierlists/:id/comments` 라우트를 연결했습니다.

---

## 관련 커밋
- **commit 3e82458** — `feat(custom-maker): 게시판 댓글·상세 페이지·본인 글 삭제`
- **commit 8fbbe60** — JWT `getActor` 기반 작성자 검증 보강

---

## 변경된 파일
- Added: `backend/models/TierPostComment.js`
- Added: `backend/controllers/tierCommentController.js`
- Modified: `backend/routes/tierRoutes.js` — 댓글 라우트 등록

---

## TierPostComment 모델 스키마
| 필드 | 타입 | 설명 |
|------|------|------|
| tierListId | ObjectId | 소속 게시글, 필수, index |
| author | String | 작성자 닉네임 |
| authorEmail | String | 작성자 이메일 (소유자 판별용) |
| content | String | 댓글 내용 |
| ip | String | 작성 IP |
| parentCommentId | ObjectId | 대댓글 부모 (null이면 최상위) |
| quotedUser | String | 답변 인용 대상 |
| quotedMessage | String | 인용 원문 요약 |
| reported | Boolean | 신고 여부 |
| reportReason | String | 신고 사유 |
| reportDetail | String | 신고 상세 |

---

## API 엔드포인트

| 메서드 | 경로 | 기능 |
|--------|------|------|
| GET | `/api/tierlists/:id/comments` | 댓글 목록 (createdAt ASC) |
| POST | `/api/tierlists/:id/comments` | 댓글 작성 |
| PATCH | `/api/tierlists/:id/comments/:commentId` | 본인 댓글 수정 |
| DELETE | `/api/tierlists/:id/comments/:commentId` | 본인 댓글 삭제 |
| POST | `/api/tierlists/:id/comments/:commentId/report` | 타인 댓글 신고 |

### POST Body 예시 (답변)
```json
{
  "content": "답변 내용",
  "parentCommentId": "부모댓글ObjectId",
  "quotedUser": "원작성자",
  "quotedMessage": "인용할 원문"
}
```

### 권한 규칙
- 작성·수정·삭제: `getActor(req)` — JWT 또는 body `author` 폴백
- 수정·삭제: `isCommentOwner(comment, actor)` — 이메일 우선, 없으면 닉네임 비교
- 신고: 본인 댓글 신고 불가, 중복 신고 불가
- 차단 사용자: `isUserBlocked` 검사

---

## 테스트 체크리스트
1. 댓글 목록·작성·대댓글 작성
2. 본인 댓글만 수정·삭제 가능
3. 타인 댓글 신고 후 `reported: true`
4. 미로그인 작성 시 401

---

문서 생성일: 2026-06-16