# 문의하기 (Contact_us)

사용자 문의와 관리자 답변 스레드입니다.

## 위치

```
Contact_us/
├── contact_us.html
├── contact_us.js
└── contact_us.css
```

관리자 답변 UI: `admin/comments/comment-detail.html`  
목록/삭제 등: `comment-management` 문의 섹션

상세: [`Contact_us/README.md`](../../Contact_us/README.md)

---

## 기능

| 기능 | 설명 |
|------|------|
| 문의 등록 | 제목·내용·작성자 |
| 목록/상세 | 문의 + 답변 배열 표시 |
| 관리자 답변 | answers 추가·수정 |
| 신고 | 문의 본문 / 개별 답변 신고 |
| 삭제 | 단건·전체 삭제(Admin) |

## 데이터 흐름

```
사용자  POST /api/inquiries
관리자  POST /api/inquiries/:id/answers
프론트  상세 렌더 (문의 + answers[])
```

답변 시 `notificationService` 로 사용자 알림 가능.

## API 권한

| 동작 | 권한 |
|------|------|
| 생성·조회·신고 | 일반 (공개/일부 정책은 컨트롤러 기준) |
| 답변 작성·수정·삭제 | `requireAdmin` |
| 문의 일괄 삭제 | `requireAdmin` |

## 신고

- 문의: `/api/inquiries/:id/report`  
- 답변: `/api/inquiries/:id/answers/:answerId/report`  
- 관리자 페이지에서 후속 처리  

## 유지보수

- 답변 UI는 admin comment-detail 패턴 재사용  
- 민감 정보 문의 가능 → 답변/삭제는 관리자만  
- 신고 시 IP·사용자 메타 기록 정책 유지  

## 관련 문서

- [admin.md](./admin.md)  
- [notifications.md](./notifications.md)  
