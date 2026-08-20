---
area: backend
feature: tierlists
---

# 커스텀 게시글 작성자 PUT 수정

## 개요
본인 커스텀 티어 게시글을 수정하는 API를 추가했다. 작성자만 `title` / `description` / `tierData` 등을 갱신할 수 있다.

## 관련 커밋
- **ef43300** — `feat(custom-maker): 본인 게시글 수정(PUT) 및 상세·메이커 연동`

## 변경된 파일
- `backend/controllers/tierController.js`
- `backend/routes/tierRoutes.js`

## 주요 구현
- `PUT` / `PATCH` `/api/tierlists/:id` → `updateTierList`
- JWT `requireAuth` 후 작성자(닉네임/이메일) 일치 시에만 갱신
- 프론트 `post_edit.html`이 이 엔드포인트를 호출

## 테스트
1. 작성자 토큰으로 PUT → 200, 보드 내용 반영
2. 타인 토큰 → 403
3. 비로그인 → 401

## 날짜
2026-07-19
