---
name: custom-maker
description: >
  커스텀 티어 제작, PNG/PDF, 게시판, 본인 글 수정, post_detail, 댓글, 좋아요, 신고.
  Use when /custom-maker.
---

# Claude 스킬 — 커스텀 메이커 · 게시판

> 정본 [`.Agents/skills/custom-maker/SKILL.md`](../../../.Agents/skills/custom-maker/SKILL.md) 의 복제본입니다. 규칙은 정본부터 고칩니다.

## When

- DnD/탭 제작, 다운로드, 게시판, 본인 글 수정, 댓글/좋아요/신고, 썸네일 경로

## Code map

- `root-cloudflare/src/pages/CustomMaker.jsx`(`/custom-maker`), `Board.jsx`(`/board`), `PostDetail.jsx`(`/board/post`), `PostEdit.jsx`(`/board/edit`)
- `src/components/DecoratePanel.jsx`, `ReportModal.jsx`, `src/lib/makerState.js`, `tierStyle.js`, `boardApi.js`
- `backend/routes/tierRoutes.js`, `models/TierList.js`, `TierPostComment.js`, `TierLike.js`
- backend tierController, tierCommentController, TierList/Comment/Like
- `PUT`/`PATCH` `/api/tierlists/:id` (작성자만)

## Read first

- `RDMD/features/custom-maker.md`

## 현재 (작업 전 이해)

- 캐릭터 풀 = `src/data/tiers.js`. 1~9 전부
- 풀이 뷰포트에 들어오면 `#pool-viewport-arrows` (▲ 티어표, ▼ 풀 끝). PNG 캡처 영역 밖
- 데스크톱: DnD. 모바일: **캐릭터 탭 → 티어 칸 탭** (풀 탭으로 되돌리기)
- 본인 글 수정: 상세 공유하기·신고하기 사이 **수정하기** → `/board/edit`(업로드 대신 수정완료) → PUT → **상세**
- 업로드/수정은 가운데 모달(제목·내용·썸네일). 상세는 제목 아래 내용 표시
- 캐릭터 id는 이름 기반 안정 id (랜덤 id면 수정 시 배치 복원 실패)
- 티어표 꾸미기: 액션바 **꾸미기** → 테두리 색·배경 이펙트·이펙트 색·등급별 테마. `tierData.style.byGrade`(`borderColor`, `effect`, `effectColor`)로 저장, PNG/상세 복원. 이펙트와 색은 `lib/tierStyle.js` 화이트리스트(`TIER_STYLE_EFFECTS`, 할로윈 `halloween` 포함)만 통과

## Do

1. tierState / DnD / **모바일 탭 배치** / 다운로드 회귀 방지
2. 이미지 저장 정규화 + 표시 시 `tierImageUrl()`
3. API: `lib/api.js` `apiRequest`
4. 글 수정은 작성자만. 타인 글에 수정 버튼 금지
5. 댓글/좋아요/신고 서버 권한 동기화
6. 게시글 삭제 시 댓글 연쇄 삭제 유지
7. 상세 라우트: `/board/post`
8. 신고 → admin tier-reports

## Do not

- 서버 검증 제거
- GH Pages 업로드 가정
- localhost URL을 DB에 저장
- 관리 신고 API를 유저 토큰으로 호출
- 매 로드마다 랜덤 캐릭터 id로 바꿔 수정 복원을 깨기
- 서버 검증을 없애 "편하게" 만들기
- 이미지 경로를 `http://localhost` 절대값으로 저장

## Tasks

**A. DnD/탭 버그** — 상태·이벤트 최소 수정  
**B. PNG/PDF** — html2canvas/jsPDF, 캡처 영역  
**C. 업로드/목록** — TierList 필드 일치, `?search=`  
**D. 본인 글 수정** — `/board/edit` + PUT 작성자 검사  
**E. 댓글·좋아요·신고** — 라우트·헤더·401  
**F. 스키마** — `backend` 스킬 병행 + 프론트 동기화  

## Checklist

- [ ] 제작·다운로드·탭 배치
- [ ] 업로드·상세·댓글
- [ ] 본인 PUT 수정 / 타인 403
- [ ] 이미지 경로
