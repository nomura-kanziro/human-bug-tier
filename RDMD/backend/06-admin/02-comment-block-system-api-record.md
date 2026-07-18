---
source: RDMD/backend/backend_7.md
legacy_id: backend_7
area: backend
---

> **원본 일지**: `backend_7.md` → 기능 폴더 재배치본  
> **순서 번호**: 파일명 앞 숫자 = 해당 기능 내 기록 순서

---
# Backend 작업 로그 — backend_7

## 개요
관리자용 유저 목록 API, IP/이메일 기반 차단(Block) 시스템, 로그인·문의 작성 시 차단 검사 유틸을 구현한 작업입니다.

---

## 관련 커밋
- **commit 297a0e5** — `feat: 어드민 댓글·유저 관리 페이지 백엔드 연동 및 차단 기능 구현` (백엔드 파트)

---

## 변경된 파일
- Added: `backend/models/Block.js`
- Added: `backend/controllers/blockController.js`
- Added: `backend/utils/checkBlocked.js`
- Added: `backend/utils/getClientIp.js`
- Modified: `backend/controllers/adminController.js` — `getUsers` 추가
- Modified: `backend/controllers/authController.js` — 로그인 시 차단 검사
- Modified: `backend/controllers/inquiryController.js` — 문의 등록 시 차단 검사
- Modified: `backend/models/User.js` — `ip` 필드 추가
- Modified: `backend/models/Inquiry.js` — `ip` 필드 추가
- Modified: `backend/routes/adminRoutes.js` — users, blocks 라우트

---

## Block 모델 스키마
| 필드 | 타입 | 설명 |
|------|------|------|
| value | String | 차단 대상 (닉네임 또는 IP), unique |
| type | String | `userId` \| `ip` |
| reason | String | 차단 사유 |
| durationDays | Number | 1 ~ 9999 |
| blockedAt | Date | 차단 시작 |
| expiresAt | Date | 차단 만료 |

---

## API 엔드포인트

| 메서드 | 경로 | 기능 |
|--------|------|------|
| GET | `/api/admin/users` | 회원가입 유저 목록 |
| GET | `/api/admin/blocks` | 활성 차단 목록 (만료 항목 자동 삭제) |
| POST | `/api/admin/blocks` | 차단 등록 |
| DELETE | `/api/admin/blocks/:id` | 차단 해제 |

### POST `/api/admin/blocks` Body 예시
```json
{
  "value": "user123",
  "type": "userId",
  "durationDays": 7,
  "reason": "욕설"
}
```

---

## 유틸리티

### `getClientIp(req)`
- `x-forwarded-for` 또는 `req.socket.remoteAddress`에서 IP 추출

### `isUserBlocked(nickname, ip)`
- Block 컬렉션에서 nickname 또는 IP 매칭 + expiresAt > now 검사
- 차단 시 `{ error: '관리자로 인해 차단당했습니다.' }` (403) 반환

### 적용 위치
- `POST /api/auth/login`
- `POST /api/inquiries` (문의 등록)

---

## 차단 기간 프리셋 (프론트 연동)
- 1 / 3 / 7 / 14 / 30 / 90일 + 관리자 지정(1~9999일)

---

## 테스트 체크리스트
1. `GET /api/admin/users` — 가입 유저 목록 반환 확인
2. 차단 등록 후 해당 유저 로그인 403 확인
3. 차단 등록 후 해당 IP에서 문의 등록 403 확인
4. 만료된 차단이 목록 조회 시 자동 삭제되는지 확인
5. `DELETE /api/admin/blocks/:id` — 차단 해제 후 접근 복구 확인

---

## 향후 개선 제안
- 관리자 API 인증 미들웨어 필수화
- 차단 이력(만료 포함) 별도 보관
- 이메일 기반 차단 type 추가

---

문서 생성일: 2026-06-15