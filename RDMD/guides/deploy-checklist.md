# 배포 체크리스트

상세 절차: 루트 [`DEPLOY.md`](../../DEPLOY.md), `render.yaml`

---

## A. 로컬 사전 검증

- [ ] `cd backend && npm start` 성공  
- [ ] `http://localhost:5000/health`  
- [ ] 메인 · 티어 · 커스텀 · 공지 · 문의 페이지 로드  
- [ ] 회원가입/로그인 (EMAIL 없여도 가입 되는지 정책 확인)  
- [ ] 관리자 로그인 → 공지 작성 → 메인 반영  
- [ ] 커스텀 게시글 + 댓글 (DB 연결 시)  
- [ ] `.env` 가 git status 에 안 잡힘  

---

## B. MongoDB Atlas

- [ ] 클러스터 생성, DB user  
- [ ] Network Access: 필요 IP 또는 `0.0.0.0/0` (Render)  
- [ ] `MONGO_URI` 연결 문자열 복사 (password URL-encode)  

---

## C. Render.com (풀스택)

### 환경 변수

- [ ] `MONGO_URI`  
- [ ] `ADMIN_INPUT_ID` / `ADMIN_INPUT_PW`  
- [ ] `JWT_SECRET`  
- [ ] `APP_URL` = `https://<service>.onrender.com` (첫 배포 후 확정 가능)  
- [ ] (선택) `EMAIL_USER`, `EMAIL_APP_PASSWORD`, `ADMIN_NAME`  

### 서비스 설정

- [ ] Root Directory: `backend` (Blueprint/`render.yaml` 일치)  
- [ ] Build: `npm install`  
- [ ] Start: `npm start`  

### 배포 후

- [ ] 사이트 URL 접속  
- [ ] `/health`  
- [ ] 관리자 로그인  
- [ ] 공지 작성  
- [ ] 유저 가입 · 로그인  
- [ ] 메일 기능 사용 시 재설정 링크 도메인이 `APP_URL` 인지  

### Free tier 참고

- 비활성 시 슬립 → 첫 요청 지연  
- 슬립 중 메일/크론 의존 로직 주의  

---

## D. GitHub Pages (정적 미리보기만)

- [ ] `.github/workflows/deploy-pages.yml` 정상  
- [ ] **API 기능 기대하지 않음**  
- [ ] getBasePath / 상대 링크로 네비만 확인  
- [ ] common.js 가 `GITHUB_STATIC` 처리하는지  

풀 기능 데모는 **Render** 를 사용하세요.

---

## E. 배포 직후 보안

- [ ] 관리자 기본 비밀번호 변경 또는 강한 값 사용  
- [ ] 프로덕션에서 예제 JWT_SECRET 미사용  
- [ ] 브라우저에서 `.env` 나 소스맵으로 시크릿 노출 없는지  

---

## F. 롤백

- Render: 이전 배포 인스턴스 재활성화  
- Git: 문제 커밋 revert 후 재배포  
- DB: 스키마 파괴적 변경 시 백업/마이그레이션 계획 필요 (현재 별도 마이그레이션 툴 없음 → 모델 변경 신중)  

---

## 문제 빠른 표

| 증상 | 조치 |
|------|------|
| 502 / 앱 다운 | Render 로그, Mongo IP, start command |
| 로그인 500 | MONGO_URI, JWT_SECRET |
| 메일 안 감 | EMAIL_*, APP_URL, Gmail 앱 비번 |
| 정적 404 | rootDir backend + static projectRoot |
| 관리 401 | admin 토큰, requireAdmin, 헤더 |
