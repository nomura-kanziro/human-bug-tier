---
name: guide
description: >
  가이드 페이지(/guide), 가이드 모드 오버레이, 스테이지·단계, 왼쪽 아래 종료 버튼, GuideMode, guideCourses.
---

# Codex 스킬 — 가이드 모드 (guide)

> 정본 [`.Agents/skills/guide/SKILL.md`](../../../.Agents/skills/guide/SKILL.md) 의 복제본입니다. 규칙은 정본부터 고칩니다.

## When

- `/guide` 페이지, 가이드 모드 말풍선·강조·종료 버튼
- 스테이지·단계 추가, 화면을 바꿔 가이드 대상 요소가 사라졌을 때

## Code map

- `root-cloudflare/src/lib/guideCourses.js` — 스테이지·단계 정의(`route`, `target` 선택자 목록, `text`). 단계를 늘리려면 여기만 고친다
- `src/lib/guide.js` — 상태 저장소. 진행 중 `sessionStorage.hbtGuideSession`, 클리어 `localStorage.hbtGuideCleared`. 서버 저장 없음
- `src/components/GuideMode.jsx` — 오버레이(`main.jsx` 최상위 렌더)
- `src/pages/Guide.jsx` + `App.jsx` 라우트 + `Footer.jsx` 링크
- `src/styles/guide.css`

## Read first

- `RDMD/frontend/14-guide/01-guide-mode-record.md`

## 현재 (작업 전 이해)

- 스테이지 5개: `start` · `tier` · `maker` · `board` · `play`
- 켜져 있는 동안 뒤 화면 클릭을 막고(스크롤은 됨), 단계가 다른 화면이면 알아서 이동한다
- 왼쪽 아래 동그란 ✕ 또는 Esc 로 종료, ←/→ 로 단계 이동
- 대상 요소를 3초 안에 못 찾으면 강조 없이 말풍선만 띄운다

## Do

1. 화면의 버튼·선택자를 바꾸면 `guideCourses.js` 의 `target` 도 같이 고친다
2. `target` 은 PC·모바일 겸용으로 여러 개 둔다(보이는 첫 번째를 쓴다)
3. 말풍선은 한 줄로 짧게 쓴다
4. 메뉴 이름을 바꾸면 `ai-service/knowledge/*.md` 도 고친다

## Do not

- 설명 페이지처럼 긴 글로 바꾸기(게임처럼 따라가는 방식이 요구 사항)
- 왼쪽 아래 종료 버튼 없애기
- 진행 상태를 서버에 저장하기(먼저 사람과 정한다)

## Tasks

**A. 단계 추가** — `guideCourses.js` 만 수정
**B. 대상을 못 찾음** — 화면 선택자 ↔ `target` 대조, 로그인 상태별 확인

## Checklist

- [ ] PC·모바일 폭에서 강조와 말풍선 위치
- [ ] ✕ · Esc 종료 후 오버레이 제거
- [ ] 끝까지 진행 → STAGE CLEAR → `/guide` 에 CLEAR 표시
- [ ] 중간에 새로고침해도 이어짐
