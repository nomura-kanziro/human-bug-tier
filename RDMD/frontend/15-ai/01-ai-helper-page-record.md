---
area: frontend
feature: ai
---

# AI 도우미 화면 (`/ai`) — 휴버봇 챗봇 + 랜덤 추천 질문 3개

> AI 기능 전체 그림은 [`../../ai/01-ai-service-record.md`](../../ai/01-ai-service-record.md) · 기능 설명 [`../../features/ai-service.md`](../../features/ai-service.md).
> 이 문서는 **프론트(화면)** 기록이다. 서버 쪽은 [`../../backend/10-ai/01-ai-proxy-record.md`](../../backend/10-ai/01-ai-proxy-record.md).

## 관련 커밋

- `77cafa9` (2026-10-18) feat(ai): AI 도우미 화면(/ai) — 휴버봇 챗봇 + 랜덤 추천 질문 3개, 푸터·가이드 링크

## 화면

- 라우트 `/ai`(`App.jsx`, 공용 Layout 안). 로그인 불필요. 진입: 푸터 "이용 안내 → **AI 도우미**", 가이드 페이지(`/guide`) 하단 링크.
- 머리말(로고·"휴버봇에게 물어보세요"), **추천 질문 칩 3개 + "🔄 다른 질문"**, 대화창, 입력창.
- 대화창: 사용자는 오른쪽 노란 말풍선, 휴버봇은 왼쪽(로고 아바타). 답이 오는 동안 점 세 개 애니메이션. 답 아래에 **참고** 출처 제목, 문서 검색 답(`mode: fallback`)이면 "AI 연결 없이 사이트 문서에서 찾은 답이에요" 배지. 오류 답은 붉은 테두리.
- 입력: Enter 전송 · Shift+Enter 줄바꿈(한글 조합 중 Enter 는 무시) · 500자 카운터 · "대화 지우기".
- 하단 안내: 대화는 서버에 저장되지 않음 · 개인정보 입력 금지 · 답이 틀릴 수 있음.
- 모바일(600px 이하): 말풍선 폭 96%, 대화창 높이 58vh.

## 구현

| 파일 | 내용 |
|---|---|
| `src/pages/AiHelper.jsx` | 화면 전체. 대화는 `sessionStorage.hbtAiChat`(최근 40개)에만 보관. 질문마다 직전 대화를 `history` 로 같이 보냄(서버·AI 서비스가 다시 최근 것만 사용) |
| `src/lib/aiApi.js` | `fetchAiQuestions()`(`GET /api/ai/questions`), `askAi(message, history)`(`POST /api/ai/chat`). `auth:false` — 토큰을 붙이지 않는다. `AI_MAX_MESSAGE = 500` |
| `src/styles/ai-helper.css` | 사이트 CSS 변수(`--brand`, `--bg-elevated` …)만 써서 라이트·다크 모두 맞음. `prefers-reduced-motion` 이면 점 애니메이션 끔 |
| `App.jsx`, `Footer.jsx`, `pages/Guide.jsx`, `styles/guide.css` | 라우트·푸터 링크·가이드 하단 링크 한 줄 |

- 정적 미리보기(`GITHUB_STATIC`)에서는 요청 자체를 하지 않는다.
- 429(요청 제한)·503(AI 서비스 꺼짐) 응답의 `error` 문구를 그대로 대화창에 답으로 보여 준다.

## 알려진 함정

- 페이지 머리말에 `<header>` 태그를 쓰면 사이트 헤더 전역 스타일(`Header_Footer.css`·`app-shell.css` 의 `header { … }`)이 걸려 배치가 깨진다 → `<div>` 로 쓴다. 가이드 페이지 `.guide-hero` 도 같은 문제라 함께 고쳤다.

## 확인

- 실제 `ai-service` + 실제 `backend/routes/aiRoutes.js`(DB 없는 테스트용 Express) + 빌드된 화면을 Chrome DevTools Protocol 로 PC(1200)·모바일(390) 확인: 추천 질문 3개, 칩 클릭·직접 입력 질문 → 답·출처·fallback 배지.
- 실제 Claude 답은 키가 없어 확인하지 못했다(문서 검색 답만 확인).
