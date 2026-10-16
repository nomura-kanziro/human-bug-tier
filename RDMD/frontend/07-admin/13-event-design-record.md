---
area: frontend
feature: admin
---

# 커밋 요약 — 관리자 "이벤트 디자인 적용" (할로윈 · 크리스마스 사이트 배경)

## 요청

> 사이트 배경을 휴먼버그대학교 다운 컨셉으로. 바로 적용하지 말고 관리자 페이지 "이벤트 디자인 적용"에서
> 할로윈 디자인 on/off · 크리스마스 디자인 on/off — 하나를 켜면 다른 것은 꺼진다. 크리스마스 배경까지 미리 만들어도 좋다.

## 관련 커밋

- `93170c6` (2026-10-17) feat(event-design): 관리자 "이벤트 디자인 적용" — 할로윈·크리스마스 사이트 배경 on/off(한 번에 하나만)

## 동작

- 관리자 페이지 **🎨 이벤트 디자인 적용**(빠른 이동 "이벤트 디자인", 이벤트 관리와 행운 뽑기 관리 사이)에 카드 2개 — 할로윈 / 크리스마스, 각각 ON/OFF 스위치.
- 서버는 값 하나만 저장(`SiteSetting` 의 `seasonalTheme` = `none` | `halloween` | `christmas`)하므로 **동시에 두 개가 켜질 수 없다**.
  할로윈 ON 상태에서 크리스마스를 켜면 할로윈은 자동 OFF, 켜진 것을 다시 누르면 기본 배경.
- 바꾸기 전에 확인창(다른 디자인이 켜져 있으면 "지금 켜져 있는 … 디자인은 꺼집니다" 안내). 바꾸면 관리자 화면에는 즉시 적용.
- 방문자: 페이지를 열 때 `GET /api/site/settings` 로 받아 적용 + 30분마다·탭으로 돌아올 때 재확인. 마지막 값을 `localStorage.hbtSeason` 에 기억해 `index.html` 이 React 보다 먼저 붙여 깜빡임을 줄인다.

## 파일

| 파일 | 역할 |
|---|---|
| `backend/models/SiteSetting.js` (신규) | 사이트 운영 설정 키-값 |
| `backend/controllers/siteSettingController.js` (신규) | 조회(메모리 캐시) · 변경. 허용 값 외 400 |
| `backend/routes/siteRoutes.js` (신규) + `server.js` | `GET /api/site/settings` (공개) |
| `backend/routes/adminRoutes.js` | `POST /api/admin/site/seasonal-theme` (`requireAdmin`) |
| `root-cloudflare/src/lib/season.js` (신규) | `<html data-season>` 적용·기억·동기화, `SEASON_EVENT` |
| `root-cloudflare/src/components/SeasonalBackdrop.jsx` (신규) | 모든 페이지 뒤 장식 층(SVG), `main.jsx` 에서 앱 최상위에 렌더 → 단독 페이지(로그인·관리자)까지 적용 |
| `root-cloudflare/src/styles/season.css` (신규) | 계절별·라이트/다크별 색과 배치, 애니메이션. `main.jsx` 에서 맨 마지막에 불러옴 |
| `root-cloudflare/src/components/AdminSeasonManager.jsx` + `styles/admin-season.css` (신규) | 관리자 섹션 |
| `root-cloudflare/src/pages/AdminDashboard.jsx`, `index.html` | 섹션·빠른 이동 연결, 첫 화면 적용 스크립트 |

## 디자인 — 휴버대 모티프

로고의 **붉은 눈**(지켜보는 눈), **H** 문장, 로고 옆 **세 자루 창**을 계절 장식에 녹였다.

| 할로윈 | 크리스마스 |
|---|---|
| 붉은 눈이 박힌 보름달(홍채가 좌우로 움직임), 박쥐 떼(날갯짓), 눈 모양으로 파낸 호박(다크에선 불빛 깜빡임), H 묘비와 세 자루 창, 어둠 속에서 깜빡이는 붉은 눈, 거미줄과 거미, 아래쪽 안개 | 내리는 눈(두 겹), 헤더 아래 전구 가랜드(깜빡임), 눈알 오너먼트를 단 트리와 별, 선물 상자, 눈 덮인 H 문장, 밤하늘 별(다크) |

- 본문이 읽히도록 **라이트는 밝은 계절 배경**(할로윈 살구빛, 크리스마스 눈빛 하늘색), **다크는 어두운 계절 배경**(할로윈 보랏빛 밤, 크리스마스 남색 밤)으로 따로 칠했다. 카드 배경은 그대로.
- 장식 층은 `position:fixed; z-index:-1; pointer-events:none` — 본문 클릭·스크롤에 영향 없음.
- 768px 이하: 달·거미줄을 오른쪽/왼쪽 모서리로 작게(소개 글 뒤에 밝은 달이 오지 않게), 박쥐 2마리·붉은 눈 숨김, 가랜드는 화면보다 넓게 그려 전구 크기 유지.
- `prefers-reduced-motion: reduce` 이면 모든 애니메이션을 끈다.

## 확인

- 컨트롤러를 가짜 저장소로: 처음 none → 할로윈 → 크리스마스(할로윈 자동 해제) → none, 허용 외 값 400.
- 가짜 서버(빌드된 dist + 메모리 설정 API, 운영 DB 미접속) + Chrome DevTools Protocol:
  홈을 PC(1300)·모바일(390) × 라이트·다크 × 두 계절로 캡처, 관리자 섹션에서 할로윈 ON → 크리스마스 클릭(확인창 문구·할로윈 OFF·배경 교체) → 크리스마스 클릭(기본 배경) 확인.
- 첫 캡처에서 박쥐가 점처럼 작고, 크리스마스 가랜드가 홈 제목 뒤에 겹치고, 모바일에서 달이 소개 글 뒤에 깔리는 문제를 찾아 고친 뒤 다시 확인.
- **운영 배포·실제 서버 저장은 아직 하지 않았다**(커밋만).
