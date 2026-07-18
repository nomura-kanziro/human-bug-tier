---
source: RDMD/backend/backend_5.md
legacy_id: backend_5
area: backend
---

> **원본 일지**: `backend_5.md` → 기능 폴더 재배치본  
> **순서 번호**: 파일명 앞 숫자 = 해당 기능 내 기록 순서

---
# Backend 작업 로그 — backend_5

## 개요
MongoDB 기반 관리자 계정 모델·로그인 API를 구현하고, 서버 시작 시 `.env` 설정값으로 관리자 계정을 자동 시드(seed)하는 작업입니다.

---

## 관련 커밋
- **commit 1539d6e** — `feat(admin): MongoDB 기반 관리자 로그인 API 및 프론트 연동` (백엔드 파트)

---

## 변경된 파일
- Added: `backend/models/Admin.js`
- Added: `backend/controllers/adminController.js` — login, seedAdmin, getUsers(후속 커밋)
- Added: `backend/routes/adminRoutes.js`
- Modified: `backend/server.js` — DB 연결 후 `seedAdmin()` 호출, admin 라우터 연결

---

## Admin 모델 스키마
| 필드 | 타입 | 설명 |
|------|------|------|
| adminId | String | 관리자 로그인 ID, unique |
| password | String | bcrypt 해시 |
| name | String | 표시 이름 |

---

## API 엔드포인트

### POST `/api/admin/login`
- **Body**: `{ adminId, password }`
- Admin 컬렉션에서 계정 조회 → bcrypt 비교
- 성공 시 `{ success, admin: { adminId, name } }` 반환

---

## seedAdmin 초기화 로직
- 서버 DB 연결 성공 후 자동 실행
- `.env`의 `ADMIN_INPUT_ID`, `ADMIN_INPUT_PW` 기준으로 Admin 문서 생성
- 이미 존재하면 건너뜀 (중복 생성 방지)
- 비밀번호는 bcrypt로 해시하여 저장

---

## 환경변수 (.env)
```
ADMIN_INPUT_ID=...
ADMIN_INPUT_PW=...
```

---

## 테스트 체크리스트
1. 서버 시작 시 Admin 컬렉션에 계정 자동 생성 확인
2. `POST /api/admin/login` 정상/실패 케이스 확인
3. 재시작 시 중복 Admin 문서가 생성되지 않는지 확인

---

## 향후 개선 제안
- 관리자 JWT 인증 및 보호 라우트
- 관리자 활동 로그
- 다중 관리자 계정 관리 UI

---

문서 생성일: 2026-06-15