# Backend (Express + MongoDB)

휴버대 티어표의 **전체 백엔드 서버**입니다.

프론트엔드 정적 파일도 함께 서빙하며, 모든 API 요청을 처리합니다.

## 주요 역할
- Express 서버로 프론트엔드 정적 파일 제공 (`/`, `/notice`, `/custom-maker` 등)
- MongoDB와 연동 (Mongoose)
- 사용자 인증 (JWT)
- 관리자 권한 관리
- 공지, 문의, 커스텀 게시글, 티어, 댓글, 신고, 차단 등 모든 비즈니스 로직

## 기술 스택
- Node.js + Express 5
- MongoDB + Mongoose
- JWT (jsonwebtoken + bcryptjs)
- Nodemailer (이메일)
- dotenv, cors

## 실행 방법

```bash
cd backend
npm install
npm start          # 프로덕션 모드 (node server.js)
npm run dev        # 개발 모드 (nodemon)
```

서버 실행 후 `http://localhost:5000` 에서 전체 사이트 이용 가능.

## 폴더 구조

```
backend/
├── server.js                 # 메인 서버 (정적 서빙 + 라우팅)
├── config/db.js              # MongoDB 연결
├── controllers/              # 비즈니스 로직
│   ├── authController.js
│   ├── tierController.js
│   ├── noticeController.js
│   ├── inquiryController.js
│   ├── adminController.js
│   └── ...
├── routes/                   # API 라우트 정의
├── models/                   # Mongoose 스키마
├── middleware/
│   └── auth.js               # requireAuth, requireAdmin
├── utils/
│   ├── jwtAuth.js
│   ├── appUrl.js
│   └── ...
└── .env.example
```

## 주요 API 그룹

| 경로                  | 설명                     | 인증 |
|-----------------------|--------------------------|------|
| `/api/auth`           | 로그인, 회원가입, 비번재설정 | 공개/일부 JWT |
| `/api/tierlists`      | 티어 게시글 CRUD, 좋아요, 신고 | 일부 JWT |
| `/api/notices`        | 공지사항                 | GET 공개, 나머지 Admin |
| `/api/inquiries`      | 문의 + 답변              | 일부 Admin |
| `/api/admin`          | 관리자 전용 (유저, 차단, 신고) | requireAdmin |
| `/api/notifications`  | 알림                     | requireAuth |

## 데이터 모델 (주요)

- **User**: nickname, email, password, isVerified, reset tokens
- **TierList**: title, tierData, author, likes, reported
- **TierPostComment**: 댓글 + 대댓글, reported
- **Notice**: title, content, category(notice/news), isPinned
- **Inquiry**: 문의 + 답변 배열
- **Block**: 사용자/IP 차단
- **Admin**: 관리자 계정

## 인증 시스템 원리

1. 일반 사용자: `signUserToken`으로 JWT 발급 (`authToken`)
2. 관리자 로그인: 별도 `admin/login` → `isAdmin: true` 포함 토큰
3. `middleware/auth.js`
   - `requireAuth`: JWT 검증 후 `req.auth` 세팅
   - `requireAdmin`: `requireAuth` 후 `isAdmin` 확인
4. 프론트에서는 `getAuthHeaders()` 또는 `getAdminAuthHeaders()`로 헤더 첨부

## 유지보수 가이드

### 환경 변수
필수:
- `MONGO_URI`
- `ADMIN_INPUT_ID`, `ADMIN_INPUT_PW`

이메일 기능 사용 시:
- `EMAIL_USER`, `EMAIL_APP_PASSWORD`
- `APP_URL` (Render 배포 후 설정)

### DB 마이그레이션 / 변경
- 모델 변경 시 `models/` 수정
- 관련 컨트롤러와 라우트 동기화 필수
- 기존 데이터 영향 확인

### 이메일 기능
- Nodemailer + Gmail 앱 비밀번호 사용
- `EMAIL_*` 미설정 시 회원가입 즉시 `isVerified: true` 처리 (코드에서 조건부)

### 관리자 초기화
서버 시작 시 `seedAdmin()`이 실행되어 환경변수 기반 관리자 계정을 자동 생성합니다.

### 로깅 & 에러
- `server.js`에 기본 에러 핸들러 존재
- 운영 환경에서는 더 강력한 로깅 (winston 등) 도입 고려

### 성능 / 보안 팁
- 모든 관리자 API는 `requireAdmin` 미들웨어 적용
- 신고 기능은 별도 `reported` 필드로 관리
- JWT_SECRET은 강력한 랜덤 문자열 사용

## 테스트 추천

로컬에서:
1. `npm start`
2. `/health` 확인
3. 회원가입 → 로그인
4. 티어 게시글 작성 + 댓글
5. 관리자 로그인 후 공지 작성

---

**참고 문서**
- 프로젝트 루트 [README.md](../README.md)
- [DEPLOY.md](../DEPLOY.md)
