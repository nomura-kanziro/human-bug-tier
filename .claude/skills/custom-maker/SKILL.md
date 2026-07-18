---
name: custom-maker
description: >
  커스텀 티어 제작, PNG/PDF, 게시판, post_detail, 댓글, 좋아요, 신고.
  Use when /custom-maker.
---

# Claude 스킬 — 커스텀 메이커 · 게시판

## When

- DnD 제작 UI, 다운로드, 게시판, 댓글/좋아요/신고, 썸네일 경로

## Code map

- `custom-maker/custom-maker.*`
- `custom-maker/custom-maker_post/*`, `post_detail.*`
- `backend/controllers/tierController.js`, `tierCommentController.js`
- `backend/models/TierList.js`, `TierPostComment.js`, `TierLike.js`
- `backend/routes/tierRoutes.js`

## Read first

- `RDMD/features/custom-maker.md`
- `custom-maker/README.md`

## Do

1. `tierState`/DnD·다운로드 회귀 방지
2. 이미지: 저장 정규화 + 표시 시 getBasePath/resolveAssetPath
3. API: getApiBase + 쓰기는 getAuthHeaders
4. 댓글/좋아요/신고: 서버 권한과 UX 동기화
5. 게시글 삭제 시 댓글 연쇄 삭제 유지
6. 상세 URL: `buildTierPostDetailUrl` 재사용
7. 신고 → admin tier-reports 연동 인지

## Do not

- 서버 검증 제거로 “편하게” 만들기
- GH Pages 업로드 가능 가정
- localhost URL을 DB에 저장
- 관리 신고 API를 유저 토큰으로 호출

## Tasks

**A. DnD 버그** — state/이벤트 최소 수정  
**B. PNG/PDF** — html2canvas/jsPDF, 캡처 영역  
**C. 업로드/목록** — TierList 필드 일치, search  
**D. 댓글·좋아요·신고** — 라우트·헤더·401  
**E. 스키마** — backend 스킬 병행 + 프론트 동기화  

## Checklist

- [ ] 제작·다운로드
- [ ] 업로드·상세·댓글
- [ ] 이미지 경로
- [ ] README/RDMD 여부
