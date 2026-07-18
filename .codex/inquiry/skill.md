---
name: inquiry
description: >
  문의하기 Contact_us, 관리자 답변, 문의 신고. Codex: inquiries.
---

# Codex 스킬 — 문의하기

## When

- 문의 등록·목록, 관리자 답변, 문의/답변 신고

## Code map

- `Contact_us/*`
- `admin/comments/comment-detail.*`, `comment-management.*`
- backend inquiry + notificationService

## Read first

- `RDMD/features/inquiry.md`
- `Contact_us/README.md`

## Do

1. 답변·삭제·일괄삭제 = **requireAdmin**
2. 답변 시 알림 연동 유지
3. 신고 시 IP 유틸 사용
4. 관리 fetch = Admin 헤더
5. XSS: innerHTML 남용 금지

## Do not

- 일반 유저 무단 삭제/답변
- requireAdmin 제거
- 일괄 삭제 무확인

## Checklist

- [ ] 문의 작성
- [ ] 관리자 답변 / 비관리자 거부
