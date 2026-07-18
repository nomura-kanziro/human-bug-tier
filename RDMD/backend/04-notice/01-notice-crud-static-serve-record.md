---
source: RDMD/backend/backend_8.md
legacy_id: backend_8
area: backend
---

> **원본 일지**: `backend_8.md` → 기능 폴더 재배치본  
> **순서 번호**: 파일명 앞 숫자 = 해당 기능 내 기록 순서

---
# Backend 작업 로그 — backend_8

## 개요
공지사항(Notice) CRUD·고정 API를 구현하고, Express 서버에서 프론트엔드 정적 파일을 함께 서빙하도록 `server.js`를 확장한 작업입니다.

---

## 관련 커밋
- **commit fbdcd19** — `feat: 공지사항 시스템 프론트엔드·백엔드 연동 및 상세 페이지 구현` (백엔드 파트)

---

## 변경된 파일
- Added: `backend/models/Notice.js`
- Added: `backend/controllers/noticeController.js`
- Added: `backend/routes/noticeRoutes.js`
- Modified: `backend/server.js` — notice 라우터, `express.static`, HTML fallback

---

## Notice 모델 스키마
| 필드 | 타입 | 설명 |
|------|------|------|
| title | String | 공지 제목, 필수 |
| content | String | 본문, 필수 |
| summary | String | 요약 (목록용) |
| category | String | `notice`(전체 공지) \| `news`(새 소식) |
| author | String | 작성자 (기본: 관리자) |
| isPinned | Boolean | 고정 여부 |
| pinnedAt | Date | 고정 시각 |

---

## API 엔드포인트

| 메서드 | 경로 | 기능 |
|--------|------|------|
| GET | `/api/notices` | 목록 조회 (`?category=`, `?limit=`) |
| GET | `/api/notices/:id` | 상세 조회 |
| POST | `/api/notices` | 공지 등록 |
| PATCH | `/api/notices/:id/pin` | 고정/해제 토글 |
| DELETE | `/api/notices/:id` | 공지 삭제 |

### 목록 정렬 규칙
```
isPinned DESC → pinnedAt DESC → createdAt DESC
```

### 고정 제한
- 최대 **5개**까지 고정 가능 (`MAX_PINNED = 5`)
- 초과 시 400 `{ error: '고정은 최대 5개까지 가능합니다.' }`

### POST Body 예시
```json
{
  "title": "업데이트 안내",
  "content": "본문 내용",
  "summary": "한 줄 요약",
  "category": "notice",
  "author": "관리자"
}
```

---

## server.js 정적 파일 서빙

### express.static
- 프로젝트 루트(`backend/` 상위)를 정적 경로로 제공
- `http://localhost:5000/index.html` 등 프론트 직접 접근 가능

### HTML fallback 미들웨어
- `/notice/notice-detail` → `notice/notice-detail.html` 자동 매핑
- API 경로(`/api/*`)는 제외

### 라우터 등록 순서
```
/api/tierlists → /api/auth → /api/inquiries → /api/admin → /api/notices
→ express.static → HTML fallback → error handler
```

---

## 테스트 체크리스트
1. `GET /api/notices?category=news&limit=5` 정상 응답 확인
2. 공지 등록·상세·삭제 CRUD 확인
3. 고정 5개 초과 시 400 응답 확인
4. `http://localhost:5000/` 프론트 index.html 서빙 확인
5. `http://localhost:5000/health` DB 상태 포함 응답 확인

---

## 향후 개선 제안
- 공지 수정(PUT) API
- 관리자 인증 필수 미들웨어 (POST/DELETE/PATCH)
- 공지 조회수·이미지 첨부
- 프로덕션 환경 CORS 도메인 제한

---

문서 생성일: 2026-06-15