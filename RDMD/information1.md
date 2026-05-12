```markdown
# 휴버대 티어표 (Human Bug Tier)

휴먼버그대학교 시리즈 캐릭터들의 전투력 순위 및 정보를 보여주는 미니 웹사이트

## 📌 주요 리팩토링 완료 (2026.05)

### 1. Header & Footer 공통화
- `header.html`, `footer.html`을 별도 파일로 분리
- 모든 페이지에서 `<div id="header-placeholder"></div>` / `<div id="footer-placeholder"></div>` 사용
- `common.js` 하나로 header/footer 동적 로드 (`fetch`)

### 2. 경로 자동 보정 시스템 구현
- `getBasePath()` 함수로 현재 폴더 위치 판단
- `tier-class/`, `Contact_us/` 등 하위 폴더에서도 정상 작동
- 로고 이미지 경로 자동 보정 (`fixImagePaths`)
- 문의하기 링크 자동 보정 (`fixFooterLinks`)
- 사이드 메뉴 링크 절대경로(`/tier-class/...`)로 변경 → 경로 중복 문제 해결

### 3. 이벤트 처리 개선
- `onclick` → `addEventListener` 방식으로 변경
- header가 나중에 로드된 후에도 버튼 정상 작동 (`attachHeaderEvents`)

### 4. CSS 구조 정리
- `common.css` + `Header_Footer.css`로 분리
- 각 tier 페이지별 `tierN.css`에서 `body { text-align: center }` 제거 (가운데 쏠림 문제 해결)

## 📁 프로젝트 구조

```
human-bug-tier/
├── home.html
├── header.html
├── footer.html
├── common.css
├── Header_Footer.css
├── common.js          ← 공통 스크립트 (header/footer 로드 담당)
├── tier-class/
│   ├── tier1.html
│   ├── tier2.html
│   ├── ...
│   └── tierN.css
├── Contact_us/
│   └── index.html
└── tier-image/
```

## 🚀 실행 방법

### 1. VS Code Live Server 추천 (필수)
1. VS Code에서 프로젝트 전체 폴더 열기
2. `home.html` 오른쪽 클릭 → **Open with Live Server**
3. `http://127.0.0.1:xxxx/home.html` 주소로 열림

### 2. Python 서버 (Live Server 없을 때)
```bash
python -m http.server 8000
```
→ 브라우저에서 `http://localhost:8000/home.html` 접속

> **주의**: `file:///` 방식(F5 직접 열기)으로는 `fetch()`가 동작하지 않습니다.

## ✅ 현재 상태
- [x] header/footer 중복 제거 및 공통화
- [x] 모든 하위 폴더에서 정상 작동
- [x] 로고, 문의하기, 사이드 메뉴 링크 정상
- [x] tier 페이지 레이아웃 깨짐 현상 해결

## 📌 향후 계획 (TODO)
- tier 페이지별 CSS 더 깔끔하게 통합
- 반응형 디자인 개선 (모바일 사이드 메뉴)
- GitHub Pages 배포 준비
- admin 페이지 연동

---