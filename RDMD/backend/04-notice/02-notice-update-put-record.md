---
area: backend
feature: notice
---

# 관리자 공지 PUT/PATCH 수정

## 개요
관리자가 이미 올린 공지의 제목·본문·요약·분류를 고칠 수 있게 했다.

## 관련 커밋
- **f883c33** — `feat(admin): add notice edit (PUT/PATCH) on management page`

## 변경된 파일
- `backend/controllers/noticeController.js`
- `backend/routes/noticeRoutes.js`
- `admin/comments/comment-management.js` / `.html` / `.css`

## 주요 구현
- `PUT` / `PATCH` `/api/notices/:id` + `requireAdmin`
- 관리 페이지 수정 버튼 → 폼 채움 → 저장/취소

## 테스트
1. 관리자 로그인 후 공지 수정 저장
2. 일반 유저 토큰 → 403

## 날짜
2026-07-19
