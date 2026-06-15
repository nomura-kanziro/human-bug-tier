# Backend 작업 로그 — backend_4

## 개요
Contact_us(문의하기) 기능을 위한 Inquiry 모델 및 CRUD·답변 등록 API를 구현하고 서버에 라우터를 연결한 작업입니다.

---

## 관련 커밋
- **commit 7a6a8b7** — `feat(api): 문의(Inquiry) CRUD 및 답변 기능 추가 — 모델, 컨트롤러, 라우트 및 서버 연결`

---

## 변경된 파일
- Added: `backend/models/Inquiry.js`
- Added: `backend/controllers/inquiryController.js`
- Added: `backend/routes/inquiryRoutes.js`
- Modified: `backend/server.js` — `app.use('/api/inquiries', inquiryRoutes)`

---

## Inquiry 모델 스키마

### 문의 (inquirySchema)
| 필드 | 타입 | 설명 |
|------|------|------|
| userId | String | 작성자 닉네임 |
| ip | String | 작성자 IP |
| isAdmin | Boolean | 관리자 작성 여부 |
| title | String | 문의 제목 |
| message | String | 문의 내용 |
| date | String | 작성일 표시용 |
| answers | Array | 답변 배열 (answerSchema) |
| reported | Boolean | 신고 여부 |
| reportReason / reportDetail | String | 신고 사유 |

### 답변 (answerSchema, embedded)
| 필드 | 타입 | 설명 |
|------|------|------|
| userId | String | 답변 작성자 |
| isAdmin | Boolean | 관리자 답변 여부 |
| message | String | 답변 내용 |
| quotedUser / quotedMessage | String | 인용 답변 |

---

## API 엔드포인트 (1차)

| 메서드 | 경로 | 기능 |
|--------|------|------|
| POST | `/api/inquiries` | 문의 등록 |
| GET | `/api/inquiries` | 전체 문의 목록 |
| GET | `/api/inquiries/:id` | 단일 문의 조회 |
| PUT | `/api/inquiries/:id` | 문의 수정 |
| DELETE | `/api/inquiries/:id` | 문의 삭제 |
| DELETE | `/api/inquiries` | 전체 문의 삭제 (관리자) |
| POST | `/api/inquiries/:id/answers` | 답변 등록 |

---

## 기술적 설명
- 답변은 Inquiry 문서 내 embedded array로 저장 (별도 컬렉션 없음)
- `timestamps: true`로 createdAt/updatedAt 자동 관리
- CORS 활성화 상태에서 프론트 `localhost` 포트와 통신

---

## 테스트 체크리스트
1. 문의 등록 후 MongoDB에 저장 확인
2. 목록 조회 시 answers 포함 반환 확인
3. 단일 문의 조회 정상 동작 확인
4. 답변 등록 후 answers 배열 증가 확인

---

## 향후 개선 제안
- 문의·답변 신고/삭제 API (backend_6에서 구현)
- 페이지네이션 및 검색 쿼리 파라미터
- 작성자 권한 검증 미들웨어

---

문서 생성일: 2026-06-15