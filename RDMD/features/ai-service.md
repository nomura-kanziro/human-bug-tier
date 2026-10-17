# AI 도우미 · AI 전용 서비스 (ai-service)

> 2026-10-18 신설. 사이트 지식으로 답하는 챗봇 **휴버봇**과 **랜덤 추천 질문 3개**.
> AI 기능은 Express 와 분리된 **AI 전용 서비스**(저장소 루트 `ai-service/`, Python FastAPI)가 담당한다.
> 운영 서버에는 **아직 배포하지 않았다**(아래 "운영 배포" 참고).

## 관련 기록 (세 곳에 나눠 있다)

| 조각 | 기록 |
|---|---|
| AI 서비스 자체 | [`../ai/01-ai-service-record.md`](../ai/01-ai-service-record.md) (+ 서비스 README [`../../ai-service/README.md`](../../ai-service/README.md)) |
| Express 프록시 | [`../backend/10-ai/01-ai-proxy-record.md`](../backend/10-ai/01-ai-proxy-record.md) |
| 화면 | [`../frontend/15-ai/01-ai-helper-page-record.md`](../frontend/15-ai/01-ai-helper-page-record.md) |
| 작업 규칙(모든 AI 공통 정본) | [`../../.agents/ai-service/skill.md`](../../.agents/ai-service/skill.md) |
| 배포·보안 | [`../guides/deploy-checklist.md`](../guides/deploy-checklist.md) "AI" 절 · [`../guides/security.md`](../guides/security.md) 9절 |

## 한 줄 요약

`/ai` 화면에서 질문하면 → Express `/api/ai/chat` 이 검사·제한 후 → `ai-service` 가 **LangGraph** 흐름으로 사이트 지식을 **RAG** 검색해 **Claude(LangChain)** 로 답한다. 키가 없거나 LLM 이 실패하면 찾은 문서로 답한다.

## 왜 별도 서비스인가

| 이유 | 내용 |
|---|---|
| 언어·생태계 | LangChain · LangGraph · RAG 도구가 Python 중심. Express(Node) 와 섞지 않는다 |
| 장애 격리 | AI 서비스가 죽거나 느려도 `/api/ai/*` 만 503 이고 로그인·게시판·뽑기 등은 영향 없음 |
| 비용·보안 경계 | LLM 키는 AI 서비스에만 둔다. 요청 수 제한·입력 검사는 그 앞의 Express 가 먼저 한다 |
| 확장 | 이후 대화 저장(별도 DB), 벡터 검색, 도구 호출(내 포인트 조회 등)을 이 서비스 안에서 키운다 |

## 구성

```
root-cloudflare/src/pages/AiHelper.jsx (/ai) ─ lib/aiApi.js
        │  GET /api/ai/questions · POST /api/ai/chat { message, history }
        ▼
backend/routes/aiRoutes.js (/api/ai, server.js 에 연결)
        │  · 질문 1~500자, 이전 대화 최근 12개(각 2000자)만
        │  · IP 당 10분 20회(메모리, 초과 429 + 남은 시간)
        │  · X-AI-Key = AI_SERVICE_KEY 첨부, 45초 타임아웃
        │  · AI 서비스 응답 실패 → 503 { unavailable:true }
        ▼
ai-service/app/main.py (FastAPI, 127.0.0.1:8000)
        │  GET /health · GET /questions · POST /chat · POST /reload(키 필요)
        ▼
app/graph.py (LangGraph StateGraph)
  START → analyze ─┬─ 인사 ───────────────▶ greet ────────▶ END
                   └─ retrieve(RAG) ─┬─ 근거 없음 ─▶ out_of_scope ─▶ END
                                     └─ 근거 있음 ─▶ generate ────▶ END
```

| 노드 | 하는 일 |
|---|---|
| analyze | 인사 판별, 질문 속 **캐릭터 이름**(CharacterIndex)·**티어 번호**("3티어") 찾기 |
| retrieve | BM25 상위 k개 + 언급된 티어의 전체 목록 문서. 캐릭터를 찾았으면 이름이 비슷한 다른 캐릭터 문서는 뺀다 |
| generate | 시스템 프롬프트 + 최근 대화 + `[정확한 티어 정보]` + `[사이트 문서]` + 질문 → Claude. 실패 시 fallback |
| greet / out_of_scope | LLM 없이 정해진 답(비용 0). 근거 없음 = BM25 최고 점수 10 미만 + 캐릭터·티어 언급 없음 |

## 지식(RAG)

| 원천 | 문서화 방식 |
|---|---|
| `ai-service/knowledge/*.md` (8개) | 사이트 소개 · 공식 티어표 안내 · 커스텀 메이커 · 게시판 · 행운 뽑기 · 이벤트 · 회원/마이페이지/출석체크 · 가이드/AI 도우미. `MarkdownHeaderTextSplitter` 로 `#`/`##` 단위 분할, 제목을 본문 앞에 붙임 |
| `root-cloudflare/src/data/tiers.json` | 티어별 문서 9개(세부등급별 캐릭터 목록) + 캐릭터별 문서(338명). 티어 설명은 JSON `title` 의 " - " 뒤 |

- 검색: 단어 + 조사 뗀 단어 + **문자 2-gram** BM25(`rank_bm25`), 제목 토큰 가중(3배). 임베딩 API·벡터 DB 가 없어 1GB VM 에서도 가볍다. `KoreanBM25Retriever` 는 LangChain `BaseRetriever` 라 `invoke()` 로도 쓸 수 있다.
- 캐릭터 찾기: 전체 이름(공백·`*` 무시) 우선, 없으면 이름의 한 단어(2글자 이상, 한 명에게만 해당, **단어 단위 일치** — '타츠오미'가 '타츠오'에 걸리지 않게).
- 지식 문서의 수치는 2026-10-18 서버 코드 상수와 대조했다(행운 뽑기 확률·포인트, 포커 배수, 랜덤 뽑기 배수, 퀴즈 상금표, 출석 포인트, 닉네임 규칙, 1시간 자동 로그아웃 등).

## 프롬프트 원칙 (`app/prompts.py`)

1. 근거(티어 정보·사이트 문서)에 있는 내용만, 없으면 "찾을 수 없어요" + 문의하기
2. 캐릭터 티어는 `[정확한 티어 정보]` 가 정답, 작품 줄거리·능력 등은 지어내지 않음
3. 해요체, 2~5문장 또는 짧은 목록, 마크다운 제목·표 금지
4. 역할 변경·지시 공개 요구 등은 거절(프롬프트 인젝션 방어)
5. 개인정보를 요구하지 않고, 관리자 기능·서버 구조는 안내하지 않음

## 랜덤 추천 질문

`app/questions.py` — LLM 없이 즉시 생성. 캐릭터("○○는 몇 티어야?", tiers.json 무작위) · 티어("N티어에는 누가 있어?" / "N티어는 어떤 등급이야?") · 사이트(15개 목록) 갈래에서 하나씩 뽑아 섞는다. 조사(은/는)는 받침으로 고른다. 화면 "🔄 다른 질문" 으로 새로 받는다.

## 화면 (`/ai`, `AiHelper.jsx` + `styles/ai-helper.css`)

- 머리말(로고·"휴버봇에게 물어보세요"), 추천 질문 칩 3개 + 다른 질문, 대화창(사용자 오른쪽 노란 말풍선 / 휴버봇 왼쪽), "답을 쓰는 중" 점 애니메이션
- 답 아래 **참고** 출처 제목, fallback 이면 "AI 연결 없이 사이트 문서에서 찾은 답이에요" 배지
- 입력: Enter 보내기 · Shift+Enter 줄바꿈(한글 조합 중 Enter 무시) · 500자 카운터 · 대화 지우기
- 대화는 `sessionStorage.hbtAiChat`(최근 40개)에만 — 서버 저장 없음. 개인정보 입력 금지·답이 틀릴 수 있음 안내
- 진입: 푸터 "이용 안내 → AI 도우미", 가이드 페이지 하단 링크. 로그인 불필요
- 페이지 머리말은 `<header>` 대신 `<div>` — 사이트 헤더 전역 스타일(`header { … }`)이 걸려 배치가 깨졌다(가이드 페이지 `.guide-hero` 도 같은 이유로 함께 고침)

## 설정

| 위치 | 키 |
|---|---|
| `ai-service/.env` | `ANTHROPIC_API_KEY`, `AI_MODEL`(기본 `claude-opus-5-5`), `AI_MAX_TOKENS`, `AI_SERVICE_KEY`, `AI_TOP_K`, `AI_HISTORY_TURNS`, `AI_KNOWLEDGE_DIR`, `AI_TIERS_JSON` |
| `backend/.env` | `AI_SERVICE_URL`(기본 `http://127.0.0.1:8000`), `AI_SERVICE_KEY`(ai-service 와 같은 값) |

## 지식을 고쳐야 하는 경우 (운영 규칙)

사이트 기능·규칙이 바뀌는 작업(포인트·확률·배수·횟수·메뉴/버튼 이름·새 화면)은 코드와 함께 **`ai-service/knowledge/*.md`** 를 고친다. 안 고치면 AI 가 옛 규칙을 자신 있게 답한다. 수치는 서버 상수에서 옮긴다(출처 파일은 `ai-service/README.md` "지식 고치기"). 공식 티어표는 `tiers.json` 을 직접 읽으므로 따로 고치지 않는다. 체크리스트: [`../guides/new-feature-checklist.md`](../guides/new-feature-checklist.md) 0-1.

## 확인 (2026-10-18)

- `pytest` 7개 통과 — 지식 적재(문서 382 · 캐릭터 338 · 티어 9), 캐릭터 찾기(전체·부분·오탐 없음), 검색 순위, 그래프 fallback/인사/범위 밖, **가짜 LLM(FakeListChatModel)으로 LLM 경로·LLM 실패 시 fallback**, 랜덤 질문, API(키 검사 401·질문 500자 초과 422).
- 실제 uvicorn + 실제 `aiRoutes.js`(테스트용 Express, DB 없음) + 빌드된 화면을 Chrome DevTools Protocol 로: 추천 질문 3개 표시, 칩 클릭·직접 입력 질문 → 답·출처·fallback 배지, PC·모바일 캡처. 요청 21번 연속 → 21번째부터 429.
- **실제 Claude API 로는 시험하지 못했다**(이 개발 환경에 키 없음). LLM 경로는 가짜 모델로만 검증 — 키를 넣고 실제 답 품질을 확인해야 한다.

## 운영 배포 (미완)

1. Oracle VM 에 Python venv + `ai-service/` + `tiers.json`(경로 `AI_TIERS_JSON`)
2. `ANTHROPIC_API_KEY`, 양쪽 `AI_SERVICE_KEY`, 백엔드 `AI_SERVICE_URL`
3. uvicorn 을 127.0.0.1:8000 으로 pm2/systemd 상시 실행(외부 포트·nginx 연결 없음)
4. `backend/deploy/oracle/deploy.sh` 에 ai-service 묶기·재시작 추가 필요
5. 메모리: VM 1GB(+스왑 2GB). 서비스 상주 메모리를 배포 후 측정할 것
6. Cloudflare Pages 는 기존 `/api/*` 프록시 그대로

## 다음 단계(제안)

- 대화 저장이 필요해지면 별도 DB(예: Oracle Autonomous DB) + 보관 기간·탈퇴 시 삭제 규칙을 먼저 정한다(현재는 저장 안 함)
- 지식이 커지면 임베딩 + 벡터 검색을 BM25 와 섞는 하이브리드 검색
- 로그인 회원 전용 도구(내 포인트·출석 현황 조회)를 LangGraph 노드/도구로 추가
- 답변 피드백(👍/👎) 수집으로 지식 문서 보강
