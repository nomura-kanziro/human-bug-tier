---
area: frontend
feature: custom-maker
---

# 업로드 모달(제목·내용·썸네일)과 상세 내용 표시

## 개요
커스텀 티어를 게시판에 올리거나 수정할 때 `prompt` 대신 가운데 모달에서 제목·내용·썸네일 사진을 받도록 했다. 상세 페이지는 제목 바로 아래에 내용을 보여 준다.

## 변경된 파일
- `custom-maker/custom-maker.js` / `.css`
- `custom-maker/custom-maker_post/post_detail.html` / `.js` / `.css`
- `custom-maker/custom-maker_post/custom-maker_post.js`
- `backend/server.js` — JSON body 한도 2mb (썸네일 data URL)

## 테스트
1. 메이커에서 캐릭터 배치 → 업로드 → 모달에 제목/내용/사진 → 게시판 카드 썸네일
2. 상세에서 제목 아래 내용 확인
3. 본인 글 수정완료 모달에도 기존 값 채워짐

## 날짜
2026-08-30
