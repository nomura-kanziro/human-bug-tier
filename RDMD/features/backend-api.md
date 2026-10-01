# 백엔드 API · 모델 맵

> 2026-10-02 갱신 — `backend/server.js` 라우터 등록·`models/`·`utils/`·`data/` 실제 목록과 대조. 행운 뽑기·이벤트·프로필 API 와 관련 모델이 빠져 있던 것을 채웠다. 경로·권한의 정본은 각 `routes/*.js`.

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
├── server.js               # env 로드 → DB 연결 → API 라우터 → 정적 서빙(root-cloudflare/dist) → 스케줄러 시작
├── config/db.js
├── controllers/
├── routes/
├── models/
├── middleware/auth.js      # requireAuth, optionalAuth, requireAdmin
├── data/
│   ├── luckPool.js         # 행운 뽑기 캐릭터 풀(오늘의 행운 티어·랜덤 뽑기)
│   └── tierCatalog.js      # 공식 티어표 카탈로그(이벤트 퀴즈 보기 등 — root-cloudflare/src/data/tiers.json 을 읽음)
├── deploy/oracle/          # Oracle Cloud 배포 스크립트·가이드
└── utils/
    ├── jwtAuth.js
    ├── appUrl.js           # APP_URL 기반 절대 링크(메일)
    ├── mail.js             # 메일 발송(Brevo → Resend → Gmail SMTP, 가입 메일은 sendSignupMail)
    ├── mailTemplate.js     # 인증·아이디 찾기·재설정 메일 공용 HTML 틀
    ├── notificationService.js
    ├── checkBlocked.js
    ├── getClientIp.js
    ├── ownership.js
    ├── kstDate.js          # KST 날짜 문자열
    ├── luckPointLog.js     # 행운 뽑기 포인트 증감 원장 기록
    ├── tierMediaDir.js     # 캐릭터 이미지 폴더 경로 대응
    ├── youtubeCommunitySync.js  # 유튜브 커뮤니티 → 새 소식 자동 동기화
    └── translateJaKo.js    # 유튜브 글 일본어 → 한국어 번역
```

---

## API 그룹

| Base | 설명 | 인증 |
|------|------|------|
| `/api/auth` | 가입·로그인·비번재설정·이메일 | 공개 / 일부 토큰 |
| `/api/tierlists` | 커스텀 게시글 CRUD·좋아요·신고 | 일부 JWT. 수정은 작성자 PUT/PATCH `/:id` |
| `/api/tierlists/:id/comments` | 댓글·대댓글 | 일부 JWT |
| `/api/notices` | 공지 | GET 공개 / 쓰기 Admin. 수정은 PUT/PATCH `/:id`. 유튜브 동기화는 `/youtube-sync` |
| `/api/inquiries` | 문의·답변·신고 | 쓰기 혼합 / 답변 Admin |
| `/api/admin` | 로그인(공개) · 유저·차단·티어 신고 · 행운 뽑기 조회(`/luck/*`) | **requireAdmin** |
| `/api/notifications` | 알림 | requireAuth |
| `/api/luck-draw` | 오늘의 행운 티어 · 포커(`/poker/*`) · 랜덤 뽑기(`/ladder/*`) | optionalAuth / requireAuth — [luck-draw.md](./luck-draw.md) |
| `/api/profile` | 닉네임 변경(`POST /nickname`) | requireAuth |
| `/api/events` | 매일 퀴즈(`/quiz/*`) · 메모리 게임(`/memory/*`) · 티어표 공개(`/showcase/*`) | requireAuth / optionalAuth, 관리 기능 requireAdmin |
| `/api/ext` | 브라우저 확장이 치는 주소 — 204 만 돌려줌(우리 API 아님) | — |
| `/health` | 헬스체크(DB·메일·APP_URL·유튜브 동기화 상태) | 공개 |

등록되지 않은 `/api/*` 는 HTML 이 아니라 **JSON 404** 를 돌려준다(API 라우터를 정적 서빙보다 앞에 둠).

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
| **Notice** | 공지, category, isPinned, source, youtubePostId |
| **Inquiry** | 문의 + answers[] |
| **Block** | 닉네임/IP 차단, 만료 |
| **Notification** | 사용자 알림 |
| **LuckProfile** | 행운 뽑기 지갑·누적 카운터(회원당 1건, 포인트 잔액) |
| **LuckDraw** | 오늘의 행운 티어 이력(회원당 최근 5건) |
| **LuckPokerRound** | 포커 판(카드·배팅·정산 결과) |
| **LuckLadderRound** / **LuckLadderBet** | 랜덤 뽑기 회차 / 배팅 |
| **LuckPointLog** | 포인트 증감 원장(2026-10-01~) |
| **EventQuizAttempt** | 매일 퀴즈(회원당 하루 1판, 최근 15건 보관) |
| **EventMemoryPeriod** / **EventMemorySession** | 메모리 기록 이벤트 회차 / 판 |
| **EventShowcase** / **EventShowcaseEntry** / **EventShowcaseVote** | 티어표 공개 회차 / 출품 / 투표 |

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
| `mail.js` / `mailTemplate.js` | 메일 발송 / 공용 메일 HTML(`buildAppMailHtml`) |
| `luckPointLog.js` | 포인트 증감 원장 `recordPointChange()` — 실패해도 예외 없음 |
| `kstDate.js` | KST 날짜(`getKstDateString`) |
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
| 관리 대시보드 | `/api/admin/*` + notice/inquiry 관리 메서드 + `/api/events/*/admin` 류 |
| 헤더 알림 | `/api/notifications` |
| 행운 뽑기 | `/api/luck-draw/*` |
| 이벤트 | `/api/events/*` |
| 마이페이지 | `/api/luck-draw/stats`, `/api/profile/nickname`, `/api/tierlists?mine=true` |

## 관련 기록

- backend_0 ~ backend_14, 25~29  
- 특히 backend_27(배포), backend_28(requireAdmin)  
