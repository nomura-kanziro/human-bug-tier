# 공통 인프라 (Header / Footer / common.js)

모든 페이지가 공유하는 **경로 처리 · API Base · 인증 헤더 · 레이아웃 로드** 규칙입니다.

## 관련 파일

| 파일 | 역할 |
|------|------|
| `common.js` | getBasePath, getApiBase, loadCommon, getAuthHeaders, 네비·알림 등 |
| `common.css` | 전역 스타일 |
| `Header_Footer.css` | 헤더·푸터·사이드 메뉴 |
| `header.html` | 네비게이션 마크업 (동적 주입) |
| `footer.html` | 푸터·문의 링크 |

## 핵심 개념

### 1. Header/Footer 동적 로드

페이지에는 placeholder만 두고 `common.js`가 fetch로 삽입합니다.

```html
<div id="header-placeholder"></div>
...
<div id="footer-placeholder"></div>
<script src=".../common.js"></script>
```

- 로드 후 `attachHeaderEvents()` 로 햄버거·로고 등 이벤트 연결  
- `fixRootLinksInElement()` 로 링크/이미지 경로 보정  

### 2. getBasePath()

현재 URL 깊이에 맞춰 `./` 또는 `../` 를 반환합니다.

- **로컬 / 루트 배포**: 경로 세그먼트 수 = 올라갈 단계  
- **GitHub Pages** (`*.github.io`): 첫 세그먼트(레포명)를 사이트로 보고 보정  

하위 폴더(`admin/comments/`, `tier-class/` 등)에서도 header/footer·에셋이 404 나지 않게 하는 핵심입니다.

### 3. getApiBase()

| 조건 | 반환값 |
|------|--------|
| `*.github.io` | `'GITHUB_STATIC'` (API 호출 스킵용) |
| 개발 포트 `5500, 3000, 5173, 8080, 4200, 8000` 또는 `file:` | `http://localhost:5000` |
| 그 외 (Render, :5000 통합 등) | `''` (상대 경로 `/api/...`) |

페이지별 전용 유틸:

- `user_login/auth_api.js` — 인증 API  
- `admin/admin_api.js` — 관리자 API  

동일 원칙으로 Base URL을 맞춥니다.

### 4. getAuthHeaders()

```js
// common.js
function getAuthHeaders(extraHeaders = {}) {
  const headers = { ...extraHeaders };
  const token = localStorage.getItem('authToken');
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
  return headers;
}
```

관리자는 `getAdminAuthHeaders()` (`admin_api.js`) — `adminAuthToken` 사용.

### 5. 기타 공통 유틸 (common.js)

| 함수 | 용도 |
|------|------|
| `isUserLoggedIn()` | localStorage user / isAdmin |
| `buildTierPostDetailUrl()` | 게시글 상세 URL (서브패스 대응) |
| `goHome()` 등 이동 헬퍼 | getBasePath + 상대 경로 |
| 알림 폴링 / resolveNotificationLink | 헤더 알림 |

## 페이지 추가 시 필수 체크

1. header / footer placeholder 포함  
2. `common.js` 경로를 `getBasePath` 깊이에 맞게 script 태그로 로드  
3. 내부 링크는 선행 `/` 최소화 → 상대 경로 또는 fixRootLinks 대상  
4. API 호출은 `getApiBase()` 또는 모듈 `get*ApiBase()` + `getAuthHeaders()`  

## 장애 대응

| 증상 | 확인 |
|------|------|
| Header/Footer 404 | script 경로, getBasePath, 서버 정적 루트 |
| API CORS / 연결 실패 | 프론트 포트 vs backend 5000, getApiBase |
| 로그인 후 401 | authToken, getAuthHeaders 사용 여부 |
| GH Pages에서 링크 깨짐 | header 상대 경로, fixRootLinksInElement |

## 관련 기록

- `information1.md` — 공통화 시작  
- `information27.md` — getBasePath · fixRootLinks · 배포 경로  
- `information28.md` — API Base 통합  
