---
area: frontend
feature: admin
---

# 관리자 회원 삭제 버튼

## 개요
차단 관리의 등록된 사용자 목록에 삭제 버튼을 달아, 특정 회원을 바로 지울 수 있게 했다.

## 변경된 파일
- `admin/comments/comment-management.js`
- `admin/comments/comment-management.css`

## 주요 구현
1. 차단/해제 옆에 `danger-btn` 삭제 (댓글·공지 삭제와 동일 스타일)
2. confirm 후 `DELETE /api/admin/users/:id` (`getAdminAuthHeaders`)
3. 성공 시 회원·차단·문의·커스텀 메이커 목록 다시 로드

## 테스트
1. 관리자 로그인 → 사용자 / IP 차단 관리 → 등록된 사용자
2. 삭제 → 확인 창 → 목록에서 사라짐
3. 헤더 없이 호출하면 실패

## 날짜
2026-08-28
