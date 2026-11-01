---
name: event
description: >
  이벤트 페이지(/event) 매일 퀴즈·메모리 게임·티어표 공개, 관리자 이벤트 관리, 이벤트 디자인(할로윈·크리스마스 계절 배경), SeasonalBackdrop.
---

# Qwen 스킬 — 이벤트 · 이벤트 디자인 (event)

> 정본 [`.Agents/skills/event/SKILL.md`](../../../.Agents/skills/event/SKILL.md) 의 복제본입니다. 규칙은 정본부터 고칩니다.

## When

- `/event` 화면, 매일 퀴즈, 메모리 게임, 티어표 공개
- 관리자 이벤트 관리, 이벤트 디자인(계절 배경) 적용

## Code map

- 화면: `root-cloudflare/src/pages/EventPage.jsx`, `src/components/EventQuizPanel.jsx`, `EventMemoryPanel.jsx`, `EventShowcasePanel.jsx`, `src/lib/eventFormat.js`, `src/styles/event.css`
- 관리: `src/components/AdminEventManager.jsx`, `src/styles/admin-event.css`
- 서버: `backend/routes/eventRoutes.js`(`/api/events`), `controllers/eventController.js`, 모델 `EventQuizAttempt`, `EventMemoryPeriod`, `EventMemorySession`, `EventShowcase`, `EventShowcaseEntry`, `EventShowcaseVote`
- 이벤트 디자인: `src/lib/season.js`, `src/components/SeasonalBackdrop.jsx`, `AdminSeasonManager.jsx`, `src/styles/season.css`, `admin-season.css`
- 설정: `backend/routes/siteRoutes.js`(`GET /api/site/settings`), `POST /api/admin/site/seasonal-theme`, `controllers/siteSettingController.js`, `models/SiteSetting.js`

## Read first

- `RDMD/frontend/13-event/01-event-page-record.md`, `02-admin-event-management-record.md`, `03-showcase-launch-record.md`

## 현재 (작업 전 이해)

- 이벤트 디자인 값은 `halloween` · `christmas` · `none`. 서버에서 받아 `<html data-season="…">` 으로 붙이고, 첫 화면 깜빡임을 줄이려고 `localStorage.hbtSeason` 에 기억한다
- 커스텀 메이커의 "할로윈" 배경 이펙트(`lib/tierStyle.js`)는 이벤트 디자인과 별개다 → `custom-maker` 스킬
- 관리자가 이벤트를 여는 순간 회원 전체 알림이 나간다(되돌릴 수 없음)

## Do

1. 채점·보상·기록은 서버가 정한다. 클라이언트 값을 믿지 않는다
2. 관리 라우트는 `requireAdmin`, 참여 라우트는 `requireAuth`
3. 포인트를 바꾸면 저장 직후 `recordPointChange()`
4. 규칙 수치를 바꾸면 `ai-service/knowledge/*.md` 도 고친다

## Do not

- 운영 서버에서 시험 삼아 이벤트 열기(전체 알림)
- `normalizeSeason` 화이트리스트 없이 계절 값을 `data-season` 에 넣기

## Tasks

**A. 새 계절 추가** — `season.js` `SEASONS` + `season.css` + `SeasonalBackdrop` + 서버 허용 값
**B. 이벤트 규칙 변경** — `eventController` + 패널 + 지식 문서

## Checklist

- [ ] 라이트·다크 테마 모두에서 배경 확인
- [ ] 일반 토큰으로 관리 API → 403
- [ ] 비로그인 화면에서 오류 없이 안내
