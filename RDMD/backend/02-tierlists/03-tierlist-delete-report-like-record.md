---
source: RDMD/backend/backend_10.md
legacy_id: backend_10
area: backend
---

> **원본 일지**: `backend_10.md` → 기능 폴더 재배치본  
> **순서 번호**: 파일명 앞 숫자 = 해당 기능 내 기록 순서

---
# Backend 작업 로그 — backend_10

## 개요
`TierList` 모델과 `tierController`를 확장하여 게시글 **삭제·신고·상세 조회·추천** 기능을 구현하고, 게시글 삭제 시 연관 댓글·좋아요 데이터를 함께 정리하도록 했습니다.

---

## 관련 커밋
- **commit 3e82458** — 삭제·신고·상세 보강
- **commit 8fbbe60** — JWT 검증·좋아요 중복 방지·`likedByMe` 반환

---

## 변경된 파일
- Modified: `backend/models/TierList.js` — 신고 필드 추가
- Modified: `backend/controllers/tierController.js`
- Modified: `backend/routes/tierRoutes.js`

---

## TierList 추가 필드 (신고)
| 필드 | 타입 | 설명 |
|------|------|------|
| reported | Boolean | 신고 여부 |
| reportReason | String | 신고 사유 |
| reportDetail | String | 신고 상세 |

---

## API 엔드포인트 (tierController)

| 메서드 | 경로 | 기능 |
|--------|------|------|
| GET | `/api/tierlists` | 목록 (`?search=`, `?author=`) |
| GET | `/api/tierlists/:id` | 상세 (+ `likedByMe`) |
| POST | `/api/tierlists` | 게시글 생성 |
| PATCH | `/api/tierlists/:id/like` | 추천 (1인 1회) |
| DELETE | `/api/tierlists/:id` | 본인 게시글 삭제 |
| POST | `/api/tierlists/:id/report` | 게시글 신고 |

### DELETE 연쇄 삭제
게시글 삭제 시 함께 제거:
- `TierPostComment` (해당 tierListId)
- `TierLike` (해당 tierListId)

### 상세 조회 `likedByMe`
- `optionalAuth` 미들웨어로 JWT 있으면 `getVoterKey(actor)`로 `TierLike` 조회
- 응답 JSON에 `likedByMe: boolean` 포함

### 신고 규칙
- 본인 글 신고 불가 (`isTierListOwner`)
- 이미 신고된 글 중복 신고 불가

---

## 테스트 체크리스트
1. 본인 글 삭제 성공, 타인 글 403
2. 삭제 시 댓글·좋아요 함께 삭제
3. 신고 후 `reported: true`
4. 상세 조회 `likedByMe` 정확도

---

문서 생성일: 2026-06-16