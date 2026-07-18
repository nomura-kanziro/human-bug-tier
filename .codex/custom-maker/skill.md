---
name: custom-maker
description: >
  커스텀 티어 제작, PNG/PDF, 게시판, post_detail, 댓글, 좋아요, 신고.
  Codex: custom-maker and board.
---

# Codex 스킬 — 커스텀 메이커 · 게시판

## When

- DnD 제작, 다운로드, 게시판, 댓글/좋아요/신고, 썸네일 경로

## Code map

- `custom-maker/custom-maker.*`
- `custom-maker/custom-maker_post/*`, `post_detail.*`
- `backend` tierController, tierCommentController, TierList/Comment/Like models

## Read first

- `RDMD/features/custom-maker.md`
- `custom-maker/README.md`

## Do

1. tierState/DnD·다운로드 회귀 방지
2. 이미지 저장 정규화 + 표시 시 getBasePath
3. API: getApiBase + 쓰기 getAuthHeaders
4. 댓글/좋아요/신고 서버 권한 동기화
5. 게시글 삭제 시 댓글 연쇄 삭제 유지
6. 상세 URL: `buildTierPostDetailUrl`
7. 신고 → admin tier-reports

## Do not

- 서버 검증 제거
- GH Pages 업로드 가정
- localhost URL을 DB에 저장
- 관리 신고 API를 유저 토큰으로 호출

## Checklist

- [ ] 제작·다운로드
- [ ] 업로드·상세·댓글
- [ ] 이미지 경로
