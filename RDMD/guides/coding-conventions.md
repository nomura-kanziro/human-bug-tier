# 코딩 컨벤션

프로젝트가 **바닐라 HTML/CSS/JS + Express** 구조이므로, 프레임워크 규칙 대신 **일관성**을 우선합니다.

---

## 프론트엔드

### 파일 배치

- 기능 단위 폴더: `html` + `js` + `css` 동반  
- 공통만 루트 (`common.js`, `common.css`, `header.html`, `footer.html`)  
- 페이지 전용 API 헬퍼는 모듈 안 (`auth_api.js`, `admin_api.js`)

### HTML

- header/footer placeholder 유지  
- 인라인 `onclick` 지양 → `addEventListener` (information1 이후 방향)  
- 스크립트 로드 순서: API 유틸 → 페이지 JS → (필요 시) common 패턴 준수  

### JS

- 전역 함수 남용 최소화. 기존 코드가 전역이면 **같은 스타일**로 확장  
- API 호출:
  ```js
  const base = getApiBase(); // 또는 getAuthApiBase / getAdminApiBase
  if (base === 'GITHUB_STATIC') { /* 안내 후 return */ }
  fetch(`${base}/api/...`, { headers: getAuthHeaders() })
  ```
- 관리자 전용: `getAdminAuthHeaders()` **필수**  
- localStorage 키 이름 기존 유지: `authToken`, `user`, `adminAuthToken`, `isAdmin`  

### CSS

- 공통 vs 페이지 분리  
- 관리자 공지 필터: **#10b981 / #059669** 계열 유지 (information29)  
- 티어 페이지에서 전역 `text-align: center` 재도입 금지  

### 경로

- 내부 앵커: 가능하면 **선행 `/` 없는 상대 경로** (`tier-class/tier1.html`)  
- 동적 로드 콘텐츠는 `fixRootLinksInElement`  
- 상세 URL 생성은 `buildTierPostDetailUrl` 등 기존 헬퍼 재사용  

---

## 백엔드

### 레이어

```
routes → controllers → models
         ↘ utils / middleware
```

- 라우트 파일에 비즈니스 로직을 길게 넣지 않기  
- DB 스키마 변경 시 컨트롤러 응답 필드·프론트 렌더 동시 수정  

### 미들웨어

```js
// 관리자
router.post('/', requireAdmin, createNotice);

// 로그인 유저
router.get('/', requireAuth, listMine);
```

권한 체크를 컨트롤러 내부에 중복 구현하기보다 **미들웨어 우선**.

### 응답

- 기존 컨트롤러 스타일 유지 (JSON `{ message, data }` 등 패턴 존중)  
- 에러 시 적절한 HTTP 상태 (401, 403, 404, 400, 500)  
- 민감 정보(해시 전 토큰, 비밀번호) 응답 금지  

### 네이밍

- 컨트롤러: `getReportedPosts`, `deleteInquiry` 등 동사+명사  
- 모델: PascalCase 파일 (`TierList.js`)  
- 라우트 path: kebab-case (`tier-reports`)  

---

## 문서

- 기능 변경 시 모듈 `README.md` 한 줄이라도 갱신  
- 큰 작업은 `RDMD/frontend|backend/<기능>/*-record.md`  
- 가이드 폴더(`RDMD/guides`, `features`)는 구조·규칙 변경 시 업데이트  

---

## 하지 말 것

- `node_modules`, `.env` 커밋  
- 관리 API에 인증 없는 새 엔드포인트  
- GH Pages 전용 절대 하드코딩 (`/human-bug-tier/...` 고정) — getBasePath 사용  
- 비밀번호 재설정 토큰 **평문 DB 저장**  
- 기존 localStorage 키 임의 변경 (로그인 전역 깨짐)  
