---
name: inquiry
description: >
  문의하기 Contact_us, 관리자 답변, 문의 신고. Use when /inquiry or Contact_us.
---

# Claude 스킬 — 문의하기

## When

- 문의 등록·목록, 관리자 답변, 문의/답변 신고

## Code map

- `Contact_us/*`
- `admin/comments/comment-detail.*`, `comment-management.*`
- `backend` inquiry controller/model/routes
- `notificationService` (답변 알림)

## Read first

- `RDMD/features/inquiry.md`
- `Contact_us/README.md`

## Do

1. 답변·삭제·일괄삭제 = **requireAdmin**
2. 답변 시 알림 연동 유지/확장
3. 신고 시 IP 등 기존 유틸
4. 관리 fetch = Admin 헤더
5. 본문 렌더 XSS 주의 (innerHTML 남용 금지)

## Do not

- 일반 유저 무단 삭제/답변
- requireAdmin 제거
- 일괄 삭제 무확인 UX

## Tasks

**A. 문의 폼** — POST 필드·에러 메시지  
**B. 답변** — comment-detail + Admin 헤더 + 목록 갱신  
**C. 신고** — report 라우트 + 관리 노출  

## Checklist

- [ ] 문의 작성
- [ ] 관리자 답변 / 비관리자 거부
- [ ] 알림(해당 시)
