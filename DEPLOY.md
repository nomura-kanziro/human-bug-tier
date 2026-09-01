# Render.com Deployment Guide

## Prerequisites
- MongoDB Atlas account (free tier OK)
- Render.com account

## 1. Prepare Environment Variables
For local testing, set env in either place (backend overrides root for the same key):

```bash
# 루트 (권장 공유 키)
copy .env.example .env

# 또는 backend 전용
cd backend
copy .env.example .env
```

See root `.env.example` and `backend/.env.example`.

For Render:
Set these in the Render dashboard (Environment Variables):

**Required:**
- `MONGO_URI` = your Atlas connection string (mongodb+srv://...)
- `ADMIN_INPUT_ID` = admin login id
- `ADMIN_INPUT_PW` = admin password

**Recommended:**
- `JWT_SECRET` = strong random string
- `APP_URL` = https://your-app.onrender.com (선택사항 — 미설정 시 Render가 자동 주입하는 `RENDER_EXTERNAL_URL`을 대신 사용함. 커스텀 도메인을 쓸 때만 직접 설정 권장)

**메일 발송 (아이디 찾기 · 비밀번호 재설정 · 가입 인증에 필요):**
- `EMAIL_USER` = Gmail 주소
- `EMAIL_APP_PASSWORD` = Google **앱 비밀번호** (일반 로그인 비밀번호 아님, 2단계 인증 필요, 공백 없이 16자리)
- ⚠️ render.yaml에 `sync: false`로 선언만 되어 있고 값은 **Render 대시보드 → 서비스 → Environment 탭에서 직접 입력**해야 합니다. Blueprint로 서비스를 만들었어도 값은 자동으로 채워지지 않습니다.
- 미설정 시: 가입은 “인증 생략”으로 완료되지만, **비밀번호/아이디 찾기 API는 503** 으로 안내합니다 (`/health` 의 `emailConfigured: false`).
- 설정 후에도 메일이 없으면: 스팸함, Gmail 앱 비밀번호 오류(Render Logs의 `EMAIL_SEND_FAILED` / SMTP EAUTH), 아이디·이메일 일치 여부 확인.
- 확인 방법: 배포 후 `https://your-app.onrender.com/health` 접속 → `emailConfigured: true` 인지 확인.

**Optional:**
- `ADMIN_NAME`
- `YOUTUBE_POSTS_SYNC_ENABLED` — 유튜브 커뮤니티 글을 새 소식으로 가져오기 (기본 켜짐, `false`로 끄기)
- `YOUTUBE_POSTS_URL` — 기본 `https://www.youtube.com/@humanbug_univ./posts`
- `YOUTUBE_POSTS_POLL_MS` — 확인 주기(ms). 기본 600000(10분), 최소 60000

Free 플랜은 잠자기 때문에, 잠든 동안에는 자동 확인이 멈춥니다. 서버가 다시 켜지면 재개됩니다.

## 2. Local Test First (Strongly Recommended)

**Recommended way (everything unified on port 5000):**
```bash
cd backend
npm install
npm start
```

Open **http://localhost:5000/**

- The backend (`server.js`) serves **both** the frontend static files **and** all `/api/*` endpoints on the same port.
- **로컬:** `root-cloudflare/`. **Render.com:** `root-render/` (`RENDER=true`). 로컬에서 Render 프론트를 보려면 `STATIC_ROOT=root-render`.
- This matches the frontend JS logic (`get*ApiBase()`) which uses relative URLs when on port 5000.
- All features work: API, health check, clean URL fallback, etc.

**`npx serve .` 사용에 대해**
- `npx serve .` (기본 3000 포트) 는 **빠른 정적 미리보기** 용도로만 사용 가능.
- 이 경우 프론트는 3000, API는 별도로 실행 중인 backend(5000)를 바라보게 됩니다. (코드가 자동 지원)
- **5000으로 통일하고 싶다면 비추천**:
  - `npx serve . -p 5000` 하면 backend와 포트 충돌.
  - 백엔드 기능(동적 API, .html fallback, /health 등)을 잃음.
  - 두 개의 서버를 동시에 관리해야 함.
- 권장: 풀스택 테스트 시에는 항상 `cd backend && npm start` 사용.

Visit:
- http://localhost:5000/  (should show homepage)
- http://localhost:5000/health
- Test admin login at /admin/admin-login.html
- Test creating a notice as admin
- Test user registration/login (make sure login.html and sign_up.html include auth_api.js)

## 3. Deploy to Render
**Option A: Blueprint (recommended)**
- Connect repo in Render
- Use the `render.yaml` in root

**Option B: Manual Web Service**
- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `npm start`
- Plan: Free (or paid)

## 4. MongoDB Atlas Setup
- Allow access from anywhere: Network Access → 0.0.0.0/0
- Get connection string and set as MONGO_URI

## 5. After Deploy
- Visit your Render URL
- Check /health
- Login as admin
- Create a test notice
- Test public pages

## Notes
- Free tier sleeps after inactivity.
- First cold start may take 30-60s.
- If no EMAIL_* set, user registration will complete without email verification.
- Password / ID recovery **requires** EMAIL_* on Render (otherwise the UI shows a clear 503 message).
- All frontend API calls use relative paths (works on Render).

## Troubleshooting
- 500 on registration? Check EMAIL or MONGO.
- **비밀번호 재설정 메일이 안 옴?**
  1. `https://your-app.onrender.com/health` → `emailConfigured: true`, `emailProvider` 확인. **콤마로 여러 개**가 뜰 수 있음(예: `brevo,gmail-smtp`) — `sendAppMail()`이 우선순위(Brevo→Resend→Gmail)대로 **설정된 걸 전부 순서대로 시도**하기 때문. 앞 방식이 막혀 있어도 뒤에 설정된 게 있으면 자동으로 그걸로 발송됨(단일 장애점 방지)
  2. Render Environment: **`BREVO_API_KEY` + `BREVO_FROM`** (Brevo Senders에서 인증한 메일). Gmail SMTP만으로는 Render에서 실패하는 경우가 많음
  3. 화면 alert의 `detail` — **설정된 provider가 여러 개인데 전부 실패했으면, 시도한 provider 전부의 실패 이유가 `Brevo: ... / Resend: ... / Gmail: ...` 형태로 다 나옵니다.** ( `/` 로 구분된 각 항목이 그 provider의 원인. 뒤 provider가 성공하면 그 시점에 발송이 끝나서 alert 자체가 안 뜸 — detail이 보인다는 건 설정된 걸 전부 다 시도했는데도 안 됐다는 뜻)
     - `Brevo ... 401` → API 키가 아님/잘림. 새 키 발급, 따옴표 없이 붙여넣기, IP 제한 해제
     - `Brevo ... 403` → 키는 통과. **Senders에서 발신 메일 인증**(받은 6자리 코드 입력) 후 `BREVO_FROM`을 그 주소와 동일하게. 그래도 `permission_denied` / `not yet activated` 이면 **Brevo 계정 자체가 아직 트랜잭션(SMTP) 발송이 승인 안 된 상태** — Brevo 고객지원(contact@brevo.com 또는 대시보드)에 **Transactional/SMTP 활성화** 요청 필요(코드로 해결 불가, Brevo 쪽 수동 승인 대기)
     - `Resend ... 403` + "own email address" / "verify a domain" → **`RESEND_API_KEY`를 등록해도 도메인 인증 전에는 Resend 계정 본인 가입 이메일에만 보낼 수 있습니다.** 다른 사람(테스트 계정 등)에게 보내려면 resend.com에서 커스텀 도메인을 인증하고 `RESEND_FROM`을 그 도메인 주소로 바꿔야 함 — `RESEND_API_KEY`만 채워 넣는 걸로는 임의 수신자 발송이 안 됨
     - `Gmail: SMTP 연결 자체가 안 됨 (ETIMEDOUT 등)` → Render 같은 클라우드 호스팅은 SMTP 아웃바운드 포트(465/587)를 통째로 막아두는 경우가 많아서, 재시도해도 계속 같은 에러만 남음. **Gmail은 애초에 Render에서 될 수가 없는 경우**이니 위 Brevo/Resend 쪽을 해결해야 함
  4. **Brevo 승인을 기다리는 동안 당장 메일을 보내야 하면**: 가장 확실한 건 Resend에서 **도메인 인증**까지 끝내는 것(위 항목 참고) — `RESEND_API_KEY`만 등록하고 도메인 인증을 안 하면 본인 이메일 말고는 여전히 안 나갑니다
  5. 응답이 성공인데 메일 없음 → 아이디·이메일이 DB와 다르거나 스팸함 (계정 존재 여부는 보안상 숨김)
- Admin can't create notices? Check ADMIN_ vars and admin token in localStorage.
- Homepage shows JSON? Check if static serving is working (should be fixed).

Good luck!
