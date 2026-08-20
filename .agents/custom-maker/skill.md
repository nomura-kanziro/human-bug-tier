---
name: custom-maker
description: >
  커스텀 티어 제작, PNG/PDF, 게시판, 본인 글 수정, 댓글, 좋아요, 신고. Canonical for ANY AI.
---

# 공통 스킬 — 커스텀 메이커 · 게시판

## When

- DnD/탭 제작, 다운로드, 게시판, 본인 글 수정, 댓글/좋아요/신고, 썸네일 경로

## Code map

- `custom-maker/custom-maker.*`, `post_edit.html`
- `custom-maker/custom-maker_post/*`, `post_detail.*`
- backend tierController, tierCommentController, TierList/Comment/Like
- `PUT`/`PATCH` `/api/tierlists/:id` (작성자만)

## Read first

- `RDMD/features/custom-maker.md`
- `custom-maker/README.md`

## 현재 (작업 전 이해)

- 캐릭터 풀 = `tier-class` HTML 파싱 (`loadCharactersFromTierClass`). 1~9 전부
- 데스크톱: DnD. 모바일: **캐릭터 탭 → 티어 칸 탭** (풀 탭으로 되돌리기)
- 본인 글 수정: 상세 **수정** → `post_edit.html` → PUT 저장 → **게시판 목록**
- 캐릭터 id는 이름 기반 안정 id (랜덤 id면 수정 시 배치 복원 실패)

## Do

1. tierState / DnD / **모바일 탭 배치** / 다운로드 회귀 방지
2. 이미지 저장 정규화 + 표시 시 getBasePath
3. API: getApiBase + 쓰기 getAuthHeaders
4. 글 수정은 작성자만. 타인 글에 수정 버튼 금지
5. 댓글/좋아요/신고 서버 권한 동기화
6. 게시글 삭제 시 댓글 연쇄 삭제 유지
7. 상세 URL: `buildTierPostDetailUrl`
8. 신고 → admin tier-reports

## Do not

- 서버 검증 제거
- GH Pages 업로드 가정
- localhost URL을 DB에 저장
- 관리 신고 API를 유저 토큰으로 호출
- 매 로드마다 랜덤 캐릭터 id로 바꿔 수정 복원을 깨기

## Checklist

- [ ] 제작·다운로드·탭 배치
- [ ] 업로드·상세·댓글
- [ ] 본인 PUT 수정 / 타인 403
- [ ] 이미지 경로
