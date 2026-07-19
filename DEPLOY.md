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
- `APP_URL` = https://your-app.onrender.com (메일 재설정/인증 링크용, 배포 후 설정)

**메일 발송 (아이디 찾기 · 비밀번호 재설정 · 가입 인증에 필요):**
- `EMAIL_USER` = Gmail 주소
- `EMAIL_APP_PASSWORD` = Google **앱 비밀번호** (일반 로그인 비밀번호 아님, 2단계 인증 필요)
- 미설정 시: 가입은 “인증 생략”으로 완료되지만, **비밀번호/아이디 찾기 API는 503** 으로 안내합니다 (`/health` 의 `emailConfigured: false`).
- 설정 후에도 메일이 없으면: 스팸함, Gmail 앱 비밀번호 오류(Render Logs의 `EMAIL_SEND_FAILED` / SMTP EAUTH), 아이디·이메일 일치 여부 확인.

**Optional:**
- `ADMIN_NAME`

## 2. Local Test First (Strongly Recommended)

**Recommended way (everything unified on port 5000):**
```bash
cd backend
npm install
npm start
```

Open **http://localhost:5000/**

- The backend (`server.js`) serves **both** the frontend static files (index.html, /notice, /custom-maker 등) **and** all `/api/*` endpoints on the same port.
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
  1. `https://your-app.onrender.com/health` → `emailConfigured` 가 `true` 인지
  2. Render Environment에 `EMAIL_USER`, `EMAIL_APP_PASSWORD`(앱 비밀번호), 권장 `APP_URL`
  3. 찾기 요청 직후 Render **Logs** — `비밀번호 찾기 메일 실패` / `EAUTH` 이면 Gmail 설정 문제
  4. 응답이 성공인데 메일 없음 → 아이디·이메일이 DB와 다르거나 스팸함 (계정 존재 여부는 보안상 숨김)
- Admin can't create notices? Check ADMIN_ vars and admin token in localStorage.
- Homepage shows JSON? Check if static serving is working (should be fixed).

Good luck!
