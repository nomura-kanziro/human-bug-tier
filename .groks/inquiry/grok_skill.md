---
name: hbu-inquiry
description: >
  문의하기 Contact_us, 답변, 문의 신고, 관리자 문의 상세.
  문의 기능 작업 시 사용.
---

# 에이전트 스킬 — 문의하기 (Contact_us)

## When

- 문의 등록·목록·상세
- 관리자 답변
- 문의/답변 신고
- Contact_us 또는 inquiry API

## Code map

| 경로 | 역할 |
|------|------|
| `Contact_us/contact_us.*` | 유저 문의 UI |
| `admin/comments/comment-detail.*` | 관리자 답변 UI |
| `admin/comments/comment-management.*` | 문의 목록·삭제 |
| `backend/controllers/inquiryController.js` | 로직 |
| `backend/models/Inquiry.js` | 모델 |
| `backend/routes/inquiryRoutes.js` | 라우트 |
| `backend/utils/notificationService.js` | 답변 알림 |

## Read first

- `RDMD/features/inquiry.md`
- `Contact_us/README.md`

## Do

1. 문의 **생성**은 공개 정책 유지 (기존 컨트롤러 기준)
2. **답변·문의 삭제·일괄 삭제**는 `requireAdmin`
3. 답변 추가 시 알림 연동 있으면 유지/확장 (`notifications` 스킬)
4. 신고 엔드포인트 메타(IP 등) 기존 유틸 사용
5. 프론트 API base + (관리) Admin 헤더
6. XSS: 문의 본문 렌더 시 `innerHTML` 남용 주의

## Do not

- 일반 유저에게 타인 문의 무단 삭제 허용
- 답변 API에서 requireAdmin 제거
- 일괄 삭제 UI에 확인 없이 호출만 넣기

## Agent tasks

### A. 문의 폼 / 목록
1. `POST /api/inquiries` 필드 검증  
2. 목록 표시 권한·필터  
3. 성공/실패 메시지  

### B. 관리자 답변
1. `comment-detail` + `POST .../answers`  
2. `getAdminAuthHeaders`  
3. 답변 후 알림·목록 갱신  

### C. 신고
1. 문의/답변 report 라우트  
2. 관리 화면 노출 여부  
3. 중복 신고 정책(기존 코드) 존중  

## Checklist

- [ ] 문의 작성 OK
- [ ] 관리자 답변 OK
- [ ] 비관리자 답변 거부
- [ ] 알림 연동(해당 시)
