---
source: RDMD/backend/backend_6.md
legacy_id: backend_6
area: backend
---

> **원본 일지**: `backend_6.md` → 기능 폴더 재배치본  
> **순서 번호**: 파일명 앞 숫자 = 해당 기능 내 기록 순서

---
# Backend 작업 로그 — backend_6

## 개요
문의(Inquiry) 및 답변에 대한 수정·삭제·신고 API를 확장 구현한 작업입니다. 1차 CRUD(backend_4) 이후 프론트엔드 요구사항에 맞춰 API를 보완했습니다.

---

## 관련 커밋
- **commit 482313c** — `feat(inquiry): 문의사항 수정/삭제/신고 기능 백엔드 API 연동`
- **commit 9d9066e** — `feat(inquiry): 답변 등록/신고/삭제 API 추가`

---

## 변경된 파일
- Modified: `backend/controllers/inquiryController.js` — updateAnswer, reportInquiry, deleteAnswer, reportAnswer 등
- Modified: `backend/models/Inquiry.js` — answerSchema에 reported/reportReason/reportDetail 필드 추가
- Modified: `backend/routes/inquiryRoutes.js` — 신고·답변 수정/삭제 라우트 추가

---

## 추가·확장 API 엔드포인트

| 메서드 | 경로 | 기능 |
|--------|------|------|
| PUT | `/api/inquiries/:id/answers/:answerId` | 답변 수정 |
| DELETE | `/api/inquiries/:id/answers/:answerId` | 답변 삭제 |
| POST | `/api/inquiries/:id/report` | 문의 신고 |
| POST | `/api/inquiries/:id/answers/:answerId/report` | 답변 신고 |

---

## 주요 컨트롤러 로직

### 문의 신고 (`reportInquiry`)
- `reported: true`, `reportReason`, `reportDetail` 저장

### 답변 신고 (`reportAnswer`)
- embedded answer의 `reported`, `reportReason`, `reportDetail` 업데이트

### 답변 삭제 (`deleteAnswer`)
- answers 배열에서 해당 `_id` 항목 제거 후 저장

### 답변 등록 보완 (`addAnswer`)
- `req.body` 기반 userId/isAdmin 처리
- 인용 답변 필드(`quotedUser`, `quotedMessage`) 지원

---

## answerSchema 추가 필드
| 필드 | 타입 | 설명 |
|------|------|------|
| reported | Boolean | 신고 여부 |
| reportReason | String | 신고 사유 |
| reportDetail | String | 신고 상세 |

---

## 테스트 체크리스트
1. 문의 신고 후 reported 필드 true 확인
2. 답변 수정·삭제가 answers 배열에 반영되는지 확인
3. 답변 신고 후 해당 answer의 reported true 확인
4. 존재하지 않는 answerId 삭제 시 404 응답 확인

---

## 향후 개선 제안
- 신고 내역 관리자 전용 조회 API
- 중복 신고 방지
- soft delete(삭제 대신 숨김) 적용

---

문서 생성일: 2026-06-15