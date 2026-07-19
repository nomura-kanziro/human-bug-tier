# 03 — 문법 · 코딩 스타일

프로젝트는 **바닐라 HTML/CSS/JS + Express** 입니다.  
프레임워크 강제 규칙은 없고 **일관성**이 우선입니다.

상세 보강: `RDMD/guides/coding-conventions.md`

---

## 공통

- 들여쓰기: 기존 파일 스타일 따르기 (섞지 말 것)  
- 의미 있는 이름: `getAdminAuthHeaders`, `loadNotices`  
- 주석은 “왜” 위주 (자명한 코드에 장문 주석 지양)  
- 커밋 메시지: **한국어** (영어 전용 금지). 예: `기능(관리자): ...` / `수정(경로): ...`  
  - 상세: [04-prohibitions.md](./04-prohibitions.md) · [commit_history README](../RDMD/commit_history/README.md)

## HTML

- 페이지에 header/footer placeholder + `common.js` 로드 패턴 유지  
- 인라인 `onclick` 지양 → JS에서 `addEventListener`  
- 접근성: 버튼에 type, 의미 있는 텍스트  

## CSS

- 공통은 `common.css` / `Header_Footer.css`, 페이지 전용은 해당 폴더  
- 관리자 공지 필터 색: **#10b981** 계열 유지 (기존 UI와 통일)  
- 티어 페이지에 전역 `body { text-align: center }` 재도입 금지  

## JavaScript (프론트)

```js
// API
const base = getApiBase();
if (base === 'GITHUB_STATIC') { /* 안내 후 return */ }
fetch(`${base}/api/...`, { headers: getAuthHeaders() });

// 관리자
fetch(..., { headers: getAdminAuthHeaders() });
```

- localStorage 키 임의 변경 금지: `authToken`, `user`, `adminAuthToken`, `isAdmin`  
- 새 전역 헬퍼는 `common.js` 또는 모듈 `*_api.js` 에 일관되게  

## JavaScript (백엔드)

- `routes` 에 비즈니스 로직 길게 넣지 않기 → `controllers`  
- 권한은 미들웨어 (`requireAuth`, `requireAdmin`)  
- 에러는 적절한 HTTP 상태 + 메시지로 (스택 과다 노출 주의)  

## 파일·폴더

- 기능 단위: `html` + `js` + `css` 동반  
- 문서 일지: `RDMD/frontend|backend/<기능>/NN-이름-record.md`  
- 에이전트 스킬 파일명 규칙  
  - Grok: `grok_skill.md`  
  - Claude: `SKILL.md`  
  - Codex: `skill.md`  

## 바이브 코딩 후 정리

빠르게 생성한 코드도 머지 전:

1. path/API/auth 규칙 통과  
2. 미사용 콘솔·더미 시크릿 제거  
3. 기존 이름·패턴과 맞춤  
