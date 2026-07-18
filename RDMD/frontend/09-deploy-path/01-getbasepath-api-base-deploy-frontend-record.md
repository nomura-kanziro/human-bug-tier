---
source: RDMD/information27.md
legacy_id: information27
area: frontend
---

> **원본 일지**: `information27.md` → 기능 폴더 재배치본  
> **순서 번호**: 파일명 앞 숫자 = 해당 기능 내 기록 순서

---
# 커밋 요약 — 정보 기록 (information27)

## 개요
Render.com 배포와 GitHub Pages (서브경로) 환경을 모두 지원하도록 대대적인 경로 및 API 설정 통합 작업을 수행했습니다. `getBasePath()` / `get*ApiBase()` 개선, header/footer 404 해결, 상대 경로 링크 정리, 정적 파일 + clean URL 서빙, DEPLOY 가이드 추가 등이 포함됩니다.

---

## 관련 커밋
- **commit 6afed99** `chore(deploy): add render.yaml for Render.com deployment`
- **commit 7c328f6** `fix(deploy): unify get*ApiBase() logic for local + Render.com (relative URLs on same origin)`
- **commit 4f78c6e** `chore(deploy): prepare for Render.com deployment`
- (이전 GH Pages 시도 01bddd4 는 revert 되었으며, 본 작업에서 더 안정적인 방식으로 재구현)

---

## 변경된 파일 목록 (주요)
**프론트엔드 공통**
- `common.js` (getBasePath, fixRootLinksInElement, getApiBase, loadCommon, resolveNotificationLink, go* 함수 대거 수정)
- `header.html` (모든 링크에서 선행 `/` 제거 → `tier-class/...` 등 상대형)
- `index.html`, `Contact_us/*`, `custom-maker/*`, `notice/*`, `user_login/*`, `admin/*` 등 다수 페이지의 링크/스크립트/리다이렉트 수정

**배포 설정**
- `render.yaml` 추가 및 업데이트
- `DEPLOY.md` 신규 작성
- `backend/.env.example` 추가
- `backend/server.js` (static serving + clean URL fallback 대폭 강화)

**기타**
- `user_login/login.html`, `sign_up.html` 등에 `auth_api.js` script 태그 추가

---

## 주요 구현 내용

### 1. getBasePath() 개선 (GitHub Pages 서브경로 대응)
```js
const isGitHubPages = /\.github\.io$/i.test(hostname);
ups = isGitHubPages ? Math.max(0, segments.length - 1) : segments.length;
return ups > 0 ? '../'.repeat(ups) : './';
```
- root에서는 `./`, 하위 폴더 깊이에 맞춰 `../../` 자동 계산

### 2. fixRootLinksInElement()
- header/footer 로드 후 `a[href^="/"]` 및 root-relative 경로를 `getBasePath() + ...` 로 자동 보정
- img[src], link[href]도 처리
- GitHub Pages /repo-name/ 하위에서 절대경로 404 방지

### 3. API Base 통일 (`getApiBase`, getAuthApiBase 등)
- 개발 포트(5500/3000/5173...) → `http://localhost:5000`
- Render, 동일 오리진, GitHub Pages → `''` (상대 경로)
- 모든 JS에서 `getApiBase() + '/api/xxx'` 사용

### 4. Backend 정적 서빙 (server.js)
- `express.static(projectRoot)` 로 전체 프론트엔드 제공
- clean URL: `/notice` → `notice.html` 자동
- `/health` , favicon 등 지원
- 로컬 추천: `cd backend && npm start` (포트 5000에서 프론트+API 통합)

### 5. Render 배포 지원
- render.yaml (rootDir: backend, build/start)
- DEPLOY.md 상세 가이드 (env, Mongo Atlas, local test 방법 포함)
- APP_URL 지원으로 이메일 절대 링크 생성

### 6. 링크 일관성
- `goHome()`, `goToCustomBoard()`, `goToAdminPage()` 등 모두 `getBasePath() + path` 사용
- header.html, index.html 등에서 `./` 또는 상대 경로로 변경

---

## 주요 문제 해결
- GitHub Pages에서 index → inquiry/버튼 클릭 시 header/footer 404
- 네비게이션 클릭 404
- 로컬 별도 서빙(5500) + backend(5000) 환경에서도 동작
- Render root 배포 시 동일 오리진 API 호출 정상화

---

## 테스트 체크리스트
1. 로컬 `cd backend; npm start` → http://localhost:5000 에서 모든 페이지 이동 + header/footer 로드
2. npx serve 로 다른 포트에서 테스트 (API는 5000)
3. GitHub Pages preview (가능 시) 에서 모든 링크/네비 정상
4. Render 배포 후 /health, admin 로그인, 공지 작성, 문의 등 전체 플로우
5. console에 getBasePath 로그 확인 (서브경로 ups 수치)

---

## 향후 개선 제안
- 빌드 타임에 base 경로 주입 (Vite 등)
- GitHub Actions 배포 시 .nojekyll 자동 생성 확인

---
문서 생성일: 2026-06-20
