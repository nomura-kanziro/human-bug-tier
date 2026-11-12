---
area: frontend
feature: ai
---

# 휴버대 에이전트 봇 화면 — 오른쪽 아래 원형 버튼 + 대형 모달

> 전체 그림은 [`../../features/agent-bot.md`](../../features/agent-bot.md) · ai-service 쪽은 [`../../ai/06-agent-bot-record.md`](../../ai/06-agent-bot-record.md).
> 이 문서는 **프론트(화면)** 기록이다. 서버 쪽은 [`../../backend/10-ai/02-agent-bot-proxy-record.md`](../../backend/10-ai/02-agent-bot-proxy-record.md).

## 관련 커밋

- `3559ed2` (2026-11-12) feat(agent-bot): 오른쪽 아래 원형 버튼·대형 모달 추가 — 모달을 닫아도 작업 계속, 요금표 상시 표시, 초안을 커스텀 메이커로 열기

## 파일

| 파일 | 내용 |
|---|---|
| `src/components/AgentBot.jsx` | 원형 버튼 · 모달 · 메시지 · 결과 카드 5종 |
| `src/context/AgentBotContext.jsx` | 대화·진행 중인 스트림·요금 정보·포인트 상태(라우트 바깥) |
| `src/lib/agentApi.js` | `fetchAgentInfo` · `runAgent` |
| `src/lib/api.js` | `apiStream` — NDJSON 스트림 래퍼(줄이 올 때마다 `onEvent`) |
| `src/lib/makerState.js` | `zonesToMakerState` · `makerStateToZones` · `MAKER_REPLACED_EVENT` |
| `src/styles/agent-bot.css` | 버튼·모달 스타일(테마 변수 사용, 다크·모바일 포함) |
| `src/main.jsx` | `<AgentBotProvider>` 로 `<App />` 을 감싸고 `<AgentBot />` 을 붙임 |
| `src/pages/CustomMaker.jsx` | `MAKER_REPLACED_EVENT` 를 받으면 저장된 배치를 다시 읽음(신규 제작 화면만) |
| `src/pages/AiHelper.jsx` | 머리말에 에이전트 봇으로 가는 안내 한 줄 |

## 동작

- **작업이 끊기지 않는 이유**: Provider 가 `main.jsx` 에서 라우트(`App`) 바깥에 있다. 모달은 열고 닫는 화면일 뿐이고, 스트림을 읽는 `send()` 는 Provider 안에서 계속 돈다. 그래서 모달을 닫아도, 다른 페이지로 이동해도, 스크롤해도 끝까지 간다. 탭을 닫거나 새로고침하면 끊긴다(서버도 연결이 끊기면 멈춘다).
- **원형 버튼**: 평소에는 로고 + 로봇 표식. 작업 중에는 고리가 돌고 "작업 중…", 모달이 닫힌 사이에 끝나면 "작업 완료 ✓". 로그인·회원가입 등 단독 페이지, 관리자 화면, 가이드 모드 중에는 숨긴다(작업이 돌고 있으면 그대로 둔다).
- **모달**: 왼쪽에 작업 목록·요금·포인트 규칙, 오른쪽에 대화. 작업 항목을 누르면 예시가 입력창에 들어간다. Enter 실행 · Shift+Enter 줄바꿈 · Esc 닫기. 작업 중에는 "■ 중지".
- **메시지**: 작업 이름·강도·차감 포인트 → 진행 단계 → 결과 카드 → 해설. 오류면 환불 안내, 포인트 부족이면 "포인트 모으러 가기", 이용법 질문이면 "AI 도우미에게 물어보기".
- **초안 열기**: `zonesToMakerState` 가 이름을 카탈로그(`ALL_CHARACTERS`)의 `{ id, name, img }` 로 바꾼다(카탈로그에 없는 이름은 버림). 기존 배치가 있으면 확인을 받고 저장 → `MAKER_REPLACED_EVENT` → `/custom-maker` 로 이동.
- **분석용 배치 전달**: 요청할 때 지금 저장된 커스텀 메이커 배치를 이름만 추려(`makerStateToZones`) 같이 보낸다.
- 대화는 sessionStorage(`hbtAgentBot`, 최근 24개)에만 둔다. 로그아웃하면 지운다. 새로고침 전에 돌던 작업은 "중단됨"으로 표시한다.

## 느려지지 않게 한 것

- 해설 글자는 초당 수십 조각으로 온다. 조각마다 `setState` 하지 않고 ref 에 모았다가 `requestAnimationFrame` 마다 한 번에 반영한다(탭이 가려져 있으면 타이머로 대신).
- `Message` 는 `memo` — 글자가 들어올 때 다시 그려지는 건 마지막 메시지 하나뿐이다.
- sessionStorage 저장은 작업이 도는 동안 하지 않고 끝났을 때만 한다.
- 요금·상태 조회(`/agent/info`)는 모달이 열려 있는 동안만(30초 간격).
- 사용자가 위로 올려 읽는 중이면 자동으로 끌어내리지 않는다.

## 확인

가짜 API 서버(빌드 결과 + 스트림 흉내)와 헤드리스 크롬으로 화면을 찍어 확인했다.

- 홈 → 버튼 → 모달(빈 상태·예시) → 입력·Enter → 결과 카드와 해설이 차례로 나옴
- 실행 중 모달을 닫고 `/board` 로 이동 → 버튼이 `is-running` "작업 중…" 유지 → 끝나면 "작업 완료 ✓"
- 다시 열어 "커스텀 메이커에서 열기" → `/custom-maker`, 저장된 배치 63명, 화면에 1티어 30명
- 다크 테마, 폭 390px(요금 규칙 접힘), 비로그인(로그인 안내), `/login` 에서는 버튼 없음
- `npx vite build` 통과

실제 백엔드·실제 모델을 붙인 브라우저 조작(사람 손)은 하지 않았다.
