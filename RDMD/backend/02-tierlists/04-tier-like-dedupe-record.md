---
source: RDMD/backend/backend_12.md
legacy_id: backend_12
area: backend
---

> **원본 일지**: `backend_12.md` → 기능 폴더 재배치본  
> **순서 번호**: 파일명 앞 숫자 = 해당 기능 내 기록 순서

---
# Backend 작업 로그 — backend_12

## 개요
커스텀 메이커 게시글 **추천(좋아요) 중복 방지**를 구현했습니다. `TierLike` 모델로 1인 1게시글 1회만 추천 가능하게 했습니다.

---

## 관련 커밋
- **commit 8fbbe60**
  - 제목: `feat(auth): JWT 인증, 좋아요 중복 방지, 계정 복구, 관리자 티어 신고`

---

## 변경된 파일
- Added: `backend/models/TierLike.js`
- Modified: `backend/controllers/tierController.js` — `likeTierList`, `getTierListById`

---

## TierLike 모델 스키마
| 필드 | 타입 | 설명 |
|------|------|------|
| tierListId | ObjectId | 게시글 ID, index |
| voterKey | String | 투표자 고유 키 |

### 유니크 인덱스
```
{ tierListId: 1, voterKey: 1 } — unique
```

### voterKey 생성 규칙 (`getVoterKey`)
| 조건 | 형식 |
|------|------|
| 이메일 있음 | `email:{email}` |
| 관리자 | `admin:{nickname}` |
| 일반 | `nick:{nickname}` |

---

## API 동작

### `PATCH /api/tierlists/:id/like`
1. `getActor(req)` — 로그인 필수
2. `TierLike.findOne({ tierListId, voterKey })` — 중복 검사
3. 중복 시 400 + `{ error: '이미 추천한 게시글입니다.', likedByMe: true }`
4. 신규 시 `TierLike.create` + `tierList.likeCount++`
5. 응답: `{ success: true, likeCount, likedByMe: true }`

### `GET /api/tierlists/:id`
- `optionalAuth` 적용
- JWT 있으면 `likedByMe` 필드 포함

---

## 테스트 체크리스트
1. 첫 추천 성공, likeCount +1
2. 두 번째 추천 400
3. 상세 조회 시 likedByMe 정확
4. 게시글 삭제 시 TierLike 함께 삭제

---

문서 생성일: 2026-06-16