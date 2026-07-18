# 모바일 · PWA 가이드

## 목표 (1차)

| 항목 | 내용 |
|------|------|
| 반응형 | 폰 브라우저에서 레이아웃·터치 사용 가능 |
| PWA | 홈 화면 설치 (standalone) |
| 풀플로우 | 로그인 · 커스텀 게시판 · 문의 |

관리자 화면 모바일 최적화·스토어 앱은 1차 범위 밖.

## 사용 방법

### 배포 URL (권장)

1. Render 등 **HTTPS** 배포 주소로 폰 브라우저 접속  
2. 로그인 → 게시판 → 문의 시나리오 확인  
3. **홈 화면에 추가**  
   - Android Chrome: 메뉴 → 홈 화면에 추가 / 앱 설치  
   - iOS Safari: 공유 → 홈 화면에 추가  

### 로컬 개발

```bash
cd backend
npm start
```

- PC: http://localhost:5000  
- 같은 Wi‑Fi 폰: `http://<PC LAN IP>:5000` (방화벽 허용 필요)  
- Service Worker는 `localhost` / HTTPS 에서만 동작 (`file://` 제외)

## 파일

| 파일 | 역할 |
|------|------|
| `manifest.webmanifest` | 앱 이름, 아이콘, display |
| `sw.js` | 셸 캐시, `/api/*` 는 네트워크 우선 |
| `tier-image/pwa/icon-192.png` · `icon-512.png` | 설치 아이콘 |
| `common.js` → `ensurePwaAssets` / `registerServiceWorker` | manifest 링크·SW 등록 |
| `Header_Footer.css` · `common.css` · 각 페이지 CSS | 반응형 |

## 동작 메모

- **API 오프라인**: 게시판/로그인은 서버 필요. SW는 API 실패 시 503 JSON 안내.  
- **GH Pages**: 정적 미리보기만. 로그인·게시판은 **Render URL** 사용.  
- **캐시 갱신**: `sw.js` 의 `CACHE_VERSION` 문자열을 올리고 재배포.  
- **사이드 메뉴**: `toggleMenu` 가 첫 탭에서 열리도록 수정됨.

## 모바일 제작(커스텀 메이커)

- PC: 드래그 앤 드롭  
- 모바일: **캐릭터 탭 선택 → 티어 칸 탭** 으로 배치 / 풀 탭으로 되돌리기  
- 상단 노란 안내 바가 선택 상태를 표시  

## 알려진 한계

- **관리자 페이지** 모바일 최적화는 후속  
- 오프라인에서 로그인/게시판 API는 불가 (설계상 정상)  
- 행운 뽑기·이벤트 메뉴는 **준비 중** 표시  

## 수동 체크리스트

- [ ] ~390px 너비에서 로그인/가입 폼 가로 스크롤 없음  
- [ ] 햄버거 메뉴 열기/닫기  
- [ ] 게시판 목록·상세·댓글  
- [ ] 문의 작성  
- [ ] 커스텀 메이커: 탭 선택 후 티어 칸 배치  
- [ ] HTTPS에서 설치 프롬프트 또는 홈 화면 추가  

## 관련 규칙

- 커밋 전: `RDMD/commit_history/{본인}.md`  
- 경로/API: `path-and-api.md`  
