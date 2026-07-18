---
source: RDMD/information16.md
legacy_id: information16
area: frontend
---

> **원본 일지**: `information16.md` → 기능 폴더 재배치본  
> **순서 번호**: 파일명 앞 숫자 = 해당 기능 내 기록 순서

---
# 커밋 요약 — 정보 기록 (information16)

## 개요
Contact_us 페이지의 답변 등록·신고·삭제 기능을 백엔드 API와 연동하고, 신고 사유 선택 모달 및 신고 상태 UI를 보완한 작업입니다.

---

## 관련 커밋
- **commit 4d415a8**
  - 제목: `feat(Contact_us): 문의/답변 백엔드 API 연동`

---

## 변경된 파일 목록 (프론트엔드)
- Modified: `Contact_us/contact_us.js` — 답변 CRUD·신고 API 연동 대폭 확장

---

## 주요 구현 내용

### 1. 답변 등록 (`submitReply` / `submitReplyToAnswer`)
- `POST /api/inquiries/:id/answers`로 일반 답변·대댓글 등록
- 등록 후 답변 목록 자동 갱신

### 2. 답변 삭제 (`deleteAnswer`)
- `DELETE /api/inquiries/:parentId/answers/:answerId` 연동

### 3. 답변 신고 (`reportAnswer`)
- 답변 전용 신고 사유 모달
- `POST /api/inquiries/:parentId/answers/:answerId/report` 연동
- 신고 완료 후 UI 상태 반영

### 4. 신고 UI 공통화
- 문의·답변 신고 사유 선택 모달 통일
- 신고된 항목에 "신고됨" 뱃지/버튼 비활성 처리

---

## API 연동 요약
| 기능 | 메서드 | 엔드포인트 |
|------|--------|------------|
| 답변 등록 | POST | `/api/inquiries/:id/answers` |
| 답변 삭제 | DELETE | `/api/inquiries/:id/answers/:answerId` |
| 답변 신고 | POST | `/api/inquiries/:id/answers/:answerId/report` |

---

## 테스트 체크리스트
1. 문의에 답변 등록 후 즉시 목록에 표시되는지 확인
2. 대댓글(답변에 답변) 등록이 동작하는지 확인
3. 본인 답변 삭제가 정상 동작하는지 확인
4. 답변 신고 모달·사유 선택·완료 상태가 올바른지 확인
5. 답변 토글(펼치기/접기)과 필터 UI가 깨지지 않는지 확인

---

## 향후 개선 제안
- 답변 수정 UI를 문의 수정과 동일한 패턴으로 통일
- 실시간 알림(새 답변) 기능
- 관리자 페이지 신고 필터와 사용자 신고 상태 동기화

---

문서 생성일: 2026-06-15