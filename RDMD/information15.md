# 커밋 요약 — 정보 기록 (information15)

## 개요
Contact_us 페이지에서 문의 수정·삭제·신고 기능의 잔여 localStorage 로직을 백엔드 API 호출로 전환한 작업입니다.

---

## 관련 커밋
- **commit 482313c**
  - 제목: `feat(inquiry): 문의사항 수정/삭제/신고 기능 백엔드 API 연동`

---

## 변경된 파일 목록 (프론트엔드)
- Modified: `Contact_us/contact_us.js` — 수정/삭제/신고 API 연동 및 UI 보완

---

## 주요 구현 내용

### 1. 문의 수정 (`editComment` / `submitEdit`)
- DOM에서 기존 문의 내용을 읽어 인라인 수정 폼 표시
- `PUT /api/inquiries/:id`로 수정 내용 저장

### 2. 문의 삭제 (`deleteComment`)
- `DELETE /api/inquiries/:id` 호출 후 목록 갱신

### 3. 문의 신고 (`reportComment`)
- 신고 사유 선택 모달 UI 구현
- `POST /api/inquiries/:id/report` 연동
- 신고 완료 후 버튼 상태를 "신고됨"으로 변경

### 4. 헬퍼 함수
- `getAnswerId()` — MongoDB `_id` / `id` 필드 호환 처리

---

## API 연동 요약
| 기능 | 메서드 | 엔드포인트 |
|------|--------|------------|
| 문의 수정 | PUT | `/api/inquiries/:id` |
| 문의 삭제 | DELETE | `/api/inquiries/:id` |
| 문의 신고 | POST | `/api/inquiries/:id/report` |

---

## 테스트 체크리스트
1. 본인 문의 수정·저장이 반영되는지 확인
2. 본인 문의 삭제 후 목록에서 제거되는지 확인
3. 신고 사유 선택 모달이 정상 표시되는지 확인
4. 신고 후 "신고됨" 상태로 버튼이 바뀌는지 확인
5. 타인 문의에 수정/삭제 버튼이 노출되지 않는지 확인

---

## 향후 개선 제안
- 답변 수정 API 완전 연동 (동일 커밋 백엔드에 추가됨)
- 신고 중복 방지 및 관리자 신고 목록 연동
- 수정/삭제 확인 모달 UX 통일

---

문서 생성일: 2026-06-15