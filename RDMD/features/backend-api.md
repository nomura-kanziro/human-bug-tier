# 백엔드 API · 모델 맵

Express + MongoDB(Mongoose) 서버 개요입니다.  
상세 실행·환경변수: [`backend/README.md`](../../backend/README.md), [`DEPLOY.md`](../../DEPLOY.md)

## 역할

1. `/api/*` REST API  
2. 프로젝트 루트 **정적 파일** 서빙 (`index.html`, `notice/`, …)  
3. clean URL (`/notice` → `notice.html` 등)  
4. 관리자 시드 (`seedAdmin`)  

로컬 권장: `cd backend && npm start` → `http://localhost:5000`

---

## 폴더 구조

```
backend/
├── server.js
├── config/db.js
├── controllers/
├── routes/
├── models/
├── middleware/auth.js      # requireAuth, requireAdmin
└── utils/
    ├── jwtAuth.js
    ├── appUrl.js
    ├── notificationService.js
    ├── checkBlocked.js
    ├── getClientIp.js
    └── ownership.js
```

---

## API 그룹

| Base | 설명 | 인증 |
|------|------|------|
| `/api/auth` | 가입·로그인·비번재설정·이메일 | 공개 / 일부 토큰 |
| `/api/tierlists` | 커스텀 게시글 CRUD·좋아요·신고 | 일부 JWT |
| `/api/tierlists/:id/comments` | 댓글·대댓글 | 일부 JWT |
| `/api/notices` | 공지 | GET 공개 / 쓰기 Admin |
| `/api/inquiries` | 문의·답변·신고 | 쓰기 혼합 / 답변 Admin |
| `/api/admin` | 유저·차단·티어 신고 등 | **requireAdmin** |
| `/api/notifications` | 알림 | requireAuth |
| `/health` | 헬스체크 | 공개 |

실제 메서드·경로는 각 `routes/*.js` 가 정본입니다.

---

## 주요 모델

| 모델 | 용도 |
|------|------|
| **User** | nickname, email, password, isVerified, reset 토큰 해시 |
| **Admin** | 관리자 계정 (시드) |
| **TierList** | 커스텀 티어 게시글, likes, reported |
| **TierLike** | 좋아요 |
| **TierPostComment** | 댓글·대댓글, reported |
| **Notice** | 공지, category, isPinned |
| **Inquiry** | 문의 + answers[] |
| **Block** | 닉네임/IP 차단, 만료 |
| **Notification** | 사용자 알림 |

---

## 인증 미들웨어

```js
// middleware/auth.js
requireAuth  → JWT 검증 → req.auth
requireAdmin → requireAuth + isAdmin → 아니면 403
```

| 토큰 종류 | 클레임 포인트 |
|-----------|----------------|
| 일반 유저 | `signUserToken` — authToken |
| 관리자 | admin login — isAdmin true |

---

## 유틸 요약

| 유틸 | 역할 |
|------|------|
| `jwtAuth.js` | 토큰 발급·검증 |
| `appUrl.js` | APP_URL 기반 절대 링크 (메일) |
| `notificationService.js` | 알림 생성 |
| `checkBlocked.js` | 차단 검사 |
| `getClientIp.js` | IP (차단·신고 메타) |
| `ownership.js` | 리소스 소유 검증 |

---

## 환경 변수 (요약)

**필수**: `MONGO_URI`, `ADMIN_INPUT_ID`, `ADMIN_INPUT_PW`  
**권장**: `JWT_SECRET`, `EMAIL_USER`, `EMAIL_APP_PASSWORD`, `APP_URL`  
**선택**: `ADMIN_NAME`

`.env` 는 커밋 금지 — `.env.example` 만 공유.

---

## 기능 연동 표

| 프론트 기능 | 주요 API |
|-------------|----------|
| 로그인/가입 | `/api/auth/*` |
| 커스텀 게시판 | `/api/tierlists/*` |
| 공지 | `/api/notices` |
| 문의 | `/api/inquiries` |
| 관리 대시보드 | `/api/admin/*` + notice/inquiry 관리 메서드 |
| 헤더 알림 | `/api/notifications` |

## 관련 기록

- backend_0 ~ backend_14, 25~29  
- 특히 backend_27(배포), backend_28(requireAdmin)  
