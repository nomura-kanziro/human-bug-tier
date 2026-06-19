# Backend 작업 로그 — backend_27

## 개요
Render.com 배포와 로컬 개발(통합 포트)을 지원하기 위한 backend 설정과 정적 파일 서빙 로직을 정리했습니다. GitHub Pages 프론트엔드와 연동되는 API 베이스 로직도 함께 다듬었습니다.

---

## 관련 커밋
- **commit 6afed99**, **7c328f6**, **4f78c6e**

---

## 변경된 파일
- Added: `render.yaml`
- Added: `backend/.env.example`
- Added: `DEPLOY.md` (문서지만 배포 가이드)
- Modified: `backend/server.js`
- Modified: `backend/controllers/authController.js` (getAppBaseUrl 연동)

---

## 주요 변경 사항

### 1. render.yaml
```yaml
services:
  - type: web
    rootDir: backend
    buildCommand: npm install
    startCommand: npm start
    envVars: MONGO_URI, ADMIN_*, JWT_SECRET, EMAIL_*, (APP_URL)
```

### 2. backend/server.js
- `express.static(projectRoot)` — 전체 프로젝트 루트(프론트엔드) 서빙
- clean URL 미들웨어:
  - GET /notice → notice.html
  - /api/* 는 제외
- `/health` 엔드포인트 (DB 상태 포함)
- PORT = process.env.PORT || 5000
- 상세 주석: 로컬 개발 시 `cd backend && npm start` 추천 이유 설명

### 3. .env.example
필수/권장 환경변수 문서화:
- MONGO_URI, ADMIN_INPUT_ID/PW
- JWT_SECRET, EMAIL_*, APP_URL

### 4. authController + appUrl
- `getAppBaseUrl(req)` 로 Render / 로컬 / APP_URL 환경 모두 지원
- 이메일 링크 생성 시 사용

---

## 로컬 실행 방식 (권장)
```bash
cd backend
npm start
# http://localhost:5000 에서 프론트 + API 모두 사용
```

---

## 테스트 체크리스트
1. `npm start` 후 /health 응답 확인
2. index.html, /notice, /custom-maker 등 정적 라우트 동작
3. Render free tier 배포 후 wake-up 및 모든 API 호출
4. EMAIL_* 미설정 시 회원가입 즉시 verified 처리 (조건부)

---
문서 생성일: 2026-06-20
