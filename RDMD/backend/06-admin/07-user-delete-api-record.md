---
area: backend
feature: admin
---

# 관리자 회원 삭제 API

## 개요
관리자가 가입 회원을 계정 단위로 지울 수 있게 `DELETE /api/admin/users/:id` 를 추가했다. `requireAdmin` 필수.

## 변경된 파일
- `backend/controllers/adminController.js` — `deleteUser`
- `backend/routes/adminRoutes.js`

## 주요 구현
1. 유효한 ObjectId가 아니면 400, 없으면 404
2. 해당 닉네임/이메일의 커스텀 게시글·댓글·좋아요·알림·차단·문의를 함께 삭제
3. 다른 문의에 남긴 답변은 `$pull`

## 테스트
1. 일반 유저 토큰 → 403
2. 관리자 토큰으로 삭제 → 목록에서 사라지고 로그인 불가
3. 해당 유저 커스텀 글·댓글·문의도 제거

## 날짜
2026-08-28
