# 경로 · API Base 가이드라인

배포(GitHub Pages 서브패스, Render 루트)와 로컬 다중 포트를 동시에 지원하기 위한 **필수 규칙**입니다.  
관련 구현: `common.js`, `auth_api.js`, `admin_api.js`, `backend/server.js`  
관련 기록: information27, information28, backend_27

---

## 1. getBasePath()

**목적**: 현재 HTML 깊이에 맞는 `../` 접두사로 header/footer·에셋·내부 링크를 맞춤.

| 환경 | 계산 요지 |
|------|-----------|
| 로컬 / Render 루트 | URL 디렉터리 세그먼트 수만큼 `../` |
| GitHub Pages (`repo.github.io/repo-name/...`) | 레포명을 루트로 보고 `segments.length - 1` |

```js
// 개념 (실제 코드는 common.js 참고)
return ups > 0 ? '../'.repeat(ups) : './';
```

### 규칙

- 새 페이지를 **N단계 하위 폴더**에 두면 script/link 상대 경로 depth를 맞출 것  
- 런타임 생성 링크는 `getBasePath() + 'path/to/page.html'`  
- root-absolute (`/foo`) 를 써야 하면 `fixRootLinksInElement` 대상에 포함  

---

## 2. fixRootLinksInElement(container)

header/footer 주입 직후 호출.

- `a[href^="/"]` → base + 경로  
- 상대 경로처럼 보이지만 루트 기준인 `img`/`link` 도 보정  
- 외부 URL, `#`, `javascript:`, `data:` 는 건드리지 않음  

---

## 3. getApiBase()

| 조건 | 반환 | 의미 |
|------|------|------|
| hostname `*.github.io` | `'GITHUB_STATIC'` | API 없음 — 호출 전 가드 |
| port 5500, 3000, 5173, 8080, 4200, 8000 또는 `file:` | `http://localhost:5000` | 분리 개발 |
| 그 외 (5000, Render, 커스텀 도메인) | `''` | `fetch('/api/...')` |

### 모듈별 헬퍼

| 파일 | 함수 (대표) | 용도 |
|------|-------------|------|
| `common.js` | `getApiBase`, `getAuthHeaders` | 전역·알림·공통 |
| `user_login/auth_api.js` | `getAuthApiBase` 등 | 로그인·가입 |
| `admin/admin_api.js` | admin API base + `getAdminAuthHeaders` | 관리자 |

**원칙**: 새 헬퍼를 만들 때 **위 표와 동일한 분기**를 복사·공유. 하드코딩 URL 금지.

---

## 4. 인증 헤더

```js
// 일반 사용자
fetch(`${getApiBase()}/api/tierlists`, {
  method: 'POST',
  headers: getAuthHeaders(),
  body: JSON.stringify(payload)
});

// 관리자
fetch(`${adminBase}/api/admin/users`, {
  headers: getAdminAuthHeaders()
});
```

| 실수 | 결과 |
|------|------|
| 관리 API에 `getAuthHeaders()` | 403 또는 권한 부족 |
| 헤더 생략 | 401 |
| GH Pages에서 fetch | 실패 — `GITHUB_STATIC` 체크 필요 |

---

## 5. 서버 측 경로 (server.js)

- `express.static(projectRoot)` — 레포 루트 기준 정적 파일  
- clean URL: 확장자 없는 경로 → `.html` 폴백  
- API 라우트 등록 후 정적/폴백 순서 유지 (기존 패턴 깨지 말 것)  

로컬에서 페이지만 열리고 API 404면: **backend로 실행 중인지**, rootDir 설정 확인.

---

## 6. 체크리스트 (경로 버그)

- [ ] 하위 폴더에서 로고·헤더 로드 OK  
- [ ] 사이드 메뉴 → 티어/커스텀/문의 이동 OK  
- [ ] 로그인 후 보호 API 200  
- [ ] 관리자 삭제/핀 200 (Admin 헤더)  
- [ ] Render 배포 후 상대 `/api` 동작  
- [ ] (선택) GH Pages 에서 정적 링크만 OK, API 안내  

---

## 7. 안티패턴

```js
// ❌ 배포 깨짐
window.location.href = '/admin/admin-login.html';
fetch('http://localhost:5000/api/auth/login'); // 프로덕션에 고정

// ✅
window.location.href = getBasePath() + 'admin/admin-login.html';
fetch(`${getApiBase()}/api/auth/login`, { ... });
```
