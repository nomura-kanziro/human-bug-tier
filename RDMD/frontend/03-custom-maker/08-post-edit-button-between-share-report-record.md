---
area: frontend
feature: custom-maker
---

# 상세 공유·신고 사이 수정하기 + 수정완료 후 상세 복귀

## 개요
본인이 올린 커스텀 티어 게시글만 고칠 수 있게, 상세 액션을 **공유하기 → 수정하기 → 신고하기** 순으로 맞췄다. 수정 전용 페이지에서는 업로드 대신 **수정완료**를 쓰고, 저장 후 상세로 돌아간다.

## 변경된 파일
- `custom-maker/custom-maker_post/post_detail.html` / `.js` / `.css`
- `custom-maker/custom-maker_post/custom-maker_post.js` / `.css`
- `custom-maker/custom-maker.js`

## 주요 구현
- 일반 회원 세션을 관리자 세션보다 먼저 봐서, 본인 글에 수정 버튼이 안 뜨던 문제를 고침
- 타인·비로그인: 신고하기. 본인: 수정하기(신고 숨김)
- 게시판 카드에도 본인 글만 **수정**
- `post_edit.html` 수정완료 → `buildTierPostDetailUrl` 로 상세 복귀

## 테스트
1. 로그인 후 본인 글 상세: 공유하기 옆에 수정하기, 신고하기는 없음
2. 수정하기 → 티어 칸 이동 → 수정완료 → 상세에서 반영
3. 타인 글: 수정하기 없음, 신고하기만

## 날짜
2026-08-30
