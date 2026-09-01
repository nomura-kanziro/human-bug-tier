# Contact_us (문의하기 시스템)

사용자가 사이트에 대해 문의하거나 관리자에게 연락할 수 있는 기능입니다.

## 주요 기능

- 문의 등록 (제목, 내용, 작성자)
- 문의 목록 확인 (본인 + 공개)
- 관리자 답변 작성
- 문의/답변 **신고** 기능
- 상세 페이지에서 대화형으로 답변 확인

## 작동 원리

### 데이터 흐름
1. 사용자 → `POST /api/inquiries` 로 문의 생성
2. 관리자 → `POST /api/inquiries/:id/answers` 로 답변 추가
3. 프론트에서 문의 상세 + 답변 목록 렌더링

### 신고 시스템
- 문의 자체 신고: `/api/inquiries/:id/report`
- 답변 신고: `/api/inquiries/:id/answers/:answerId/report`

신고된 내용은 관리자 페이지에서 별도로 확인할 수 있습니다.

### API 보호
- 문의 생성/조회/신고: 일반 사용자 가능
- 답변 작성, 수정, 삭제, 전체 삭제: `requireAdmin` 필요

## 파일 구조

```
Contact_us/
├── contact_us.html
├── contact_us.js
└── contact_us.css
```

## 유지보수 가이드

### 답변 UI 개선
`admin/comments/comment-detail.html`에서 답변 작성 UI를 참고하세요.

### 알림 연동
문의 답변이 달리면 알림 시스템과 연동되어 사용자에게 알림이 갑니다. (`notificationService`)

### 데이터 정리
관리자는 `/api/inquiries` DELETE로 전체 문의를 일괄 삭제할 수 있습니다 (주의).

## 보안 주의
- 문의 내용에 민감 정보가 들어갈 수 있으므로 관리자만 답변/삭제 가능
- 신고 기능 악용 방지를 위해 IP + 사용자 정보 함께 기록

---

**관련 문서**
- [admin/README.md](../admin/README.md)
- [backend/README.md](../backend/README.md)
