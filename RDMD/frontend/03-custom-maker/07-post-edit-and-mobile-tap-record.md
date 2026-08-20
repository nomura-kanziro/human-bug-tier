---
area: frontend
feature: custom-maker
---

# 본인 게시글 수정 · 모바일 탭 배치

## 개요
작성자가 올린 커스텀 티어표를 다시 고칠 수 있게 하고, 휴대폰에서는 드래그 대신 탭으로 배치하게 했다.

## 관련 커밋
- **d43cf11** — `feat(custom-maker): mobile tap-to-place characters and maker layout`
- **ef43300** — `feat(custom-maker): 본인 게시글 수정(PUT) 및 상세·메이커 연동`
- **420b790** — `feat(custom-maker): 게시글 전용 수정 페이지와 수정완료 후 게시판 이동`

## 변경된 파일
- `custom-maker/post_edit.html` (신규)
- `custom-maker/custom-maker.js` / `.css` / `custom-maker.html`
- `custom-maker_post/post_detail.js` / `.html` / `.css`

## 주요 구현
1. 상세의 **수정** → `post_edit.html`에서 저장된 `tierData` 복원
2. 저장: PUT `/api/tierlists/:id` (작성자만). 성공 시 게시판 목록
3. 캐릭터 안정 id(이름 기반)로 수정 모드 배치 복원
4. 모바일: 캐릭터 탭 선택 후 티어 칸 탭 / 풀 탭으로 복귀

## 변경 전/후
| 항목 | 변경 전 | 변경 후 |
|------|---------|---------|
| 본인 글 | 삭제만 | 수정 페이지 + PUT |
| 모바일 제작 | DnD만 | 탭 배치 |

## 테스트
1. 로그인 → 본인 글 상세 → 수정 → 칸 이동 → 저장 → 게시판
2. 타인 글에는 수정 버튼 없음
3. 좁은 뷰포트에서 탭 배치

## 날짜
2026-07-19 ~ 관련 커밋 기준
