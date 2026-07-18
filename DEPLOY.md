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
- `EMAIL_USER` + `EMAIL_APP_PASSWORD` = Gmail + app password (for user signup emails)
- `APP_URL` = https://your-app.onrender.com (after first deploy)

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
- All frontend API calls use relative paths (works on Render).

## Troubleshooting
- 500 on registration? Check EMAIL or MONGO.
- Admin can't create notices? Check ADMIN_ vars and admin token in localStorage.
- Homepage shows JSON? Check if static serving is working (should be fixed).

Good luck!
