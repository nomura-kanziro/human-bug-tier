---
name: ai-service
description: >
  AI 도우미(/ai 휴버봇 챗봇 · 랜덤 추천 질문 3개), AI 전용 서비스 ai-service/(Python FastAPI · LangChain ·
  LangGraph · RAG · Ollama), Express 프록시 /api/ai(aiRoutes.js), 지식 문서 ai-service/knowledge, 에이전트 봇(Agent-Bot · /api/ai/agent · 오른쪽 아래 원형 버튼 · 포인트 요금). Use when /ai, ai-service, LangGraph, RAG, 휴버봇, 지식 문서.
---

# Codex 스킬 — AI 전용 서비스 (ai-service)

> 정본 [`.Agents/skills/ai-service/SKILL.md`](../../../.Agents/skills/ai-service/SKILL.md) 의 복제본입니다. 규칙은 정본부터 고칩니다.

> 2026-10-18 신설. **AI 기능은 Express 와 분리된 별도 서비스**다. 프론트·백엔드 작업 규칙(`root-cloudflare/` 만, `root-render/` 금지)은 그대로.

## When

- `/ai` 화면(휴버봇), 추천 질문, AI 답변 내용·말투·정확도
- **에이전트 봇** — 오른쪽 아래 원형 버튼·모달, 티어표 초안·분석·요약·브리핑·검색 작업, 작업 강도별 포인트 요금, `ai-service/app/Agent-Bot/`, `/api/ai/agent/*`
- `ai-service/` 코드(FastAPI · LangGraph · 검색 · 프롬프트 · 모델), `ai-service/knowledge/*.md`
- `backend/routes/aiRoutes.js`(`/api/ai`), `AI_SERVICE_URL`/`AI_SERVICE_KEY`/`ANTHROPIC_API_KEY`
- **사이트 기능·규칙(포인트·확률·배수·횟수·메뉴 이름)을 바꾸는 모든 작업** → 지식 문서 동기화 필요

## Code map

- 서비스 공용: `ai-service/app/main.py`(FastAPI 진입점), `app/config.py`
- **챗봇은 종류별 폴더로 나누고, 폴더마다 같은 6개 층을 둔다**: `schema/`(요청·응답 pydantic) · `router/`(HTTP) · `service/`(업무 로직) · `models/`(Oracle 테이블 행 모양) · `repository/`(Oracle SQL) · `database/`(Oracle 연결). 호출은 router → service → repository → database 한 방향.
  - 가이드 전용 챗봇 = `ai-service/app/guidans_Chat/` — `service/` 에 `chat_service.py`(진입)·`knowledge.py`(문서·BM25·CharacterIndex)·`embeddings.py`(bge-m3)·`retrieval.py`(BM25+벡터 RRF)·`graph.py`(LangGraph)·`prompts.py`·`llm.py`(Ollama/Claude)·`questions.py`, `database/chroma.py`·`repository/knowledge_vector_repository.py`·`models/knowledge_chunk.py`(ChromaDB 벡터 저장), `router/chat_router.py`, `schema/chat.py`
  - 에이전트 봇 = `ai-service/app/Agent-Bot/`(2026-11-12 구현 — "설명"이 아니라 "작업"을 한다). 폴더 이름에 하이픈이 있어 `app/agent_loader.py` 가 `app.agent_bot` 패키지로 올린다(임포트는 `from app.agent_bot…`). `service/` 에 `agent_service.py`(진입·이벤트 스트림)·`planner.py`(작업 판별 — 규칙 먼저, 애매하면 LLM)·`graph.py`(LangGraph)·`tools/`(`tier_builder`·`tier_review`·`digest`·`briefing`·`site_search`)·`catalog.py`·`prompts.py`·`llm.py`, `repository/site_repository.py`·`database/site_api.py`(사이트 백엔드 조회 API 호출), `router/agent_router.py`(`GET /agent/info` · `POST /agent/run` NDJSON), `schema/agent.py`. 새 챗봇 코드를 다른 챗봇 폴더에 섞지 않는다
  - 에이전트 봇 사이트 쪽: `backend/controllers/aiAgentController.js`(`/api/ai/agent/*` — 회원 확인·포인트 차감/환불·스트림 전달·전용 조회 API, 요금 `AGENT_COSTS`), 화면 `root-cloudflare/src/components/AgentBot.jsx`(오른쪽 아래 원형 버튼 + 모달)·`src/context/AgentBotContext.jsx`·`src/lib/agentApi.js`·`src/styles/agent-bot.css`
  - 공용: `app/main.py`(진입·라우터 연결), `config.py`, `deps.py`(X-AI-Key 검사)
- 지식: `ai-service/knowledge/01~14-*.md`(사용자용 — 이용 안내 8개 + **FAQ·용어집·단계별 사용법·문제 해결·공지/문의/알림·업데이트 이력** 6개) + `root-cloudflare/src/data/tiers.json`(직접 읽음). **AI 서버(Ollama)가 꺼져도 이 문서에서 그대로 답한다**(`service/doc_answer.py`) — 그래서 지식 문서가 곧 "AI OFF 시의 답"이다
- AI 서버 ON/OFF: `service/llm_status.py`(Ollama `/api/tags` 확인, 10초 기억), `GET /status`(ai-service) · `GET /api/ai/status`(Express) → `/ai` 화면 상단 알림("AI 서버 OFF 상태 (사이트의 정보내용을 끌어다 대답합니다.)")
- 테스트: `ai-service/tests/` (`.venv/Scripts/python -m pytest -q` — 가짜 모델·가짜 임베딩·메모리 ChromaDB 라 Ollama 없이 돈다). 실제 모델 점검: `scripts/eval_guide_chat.py`
- 프록시: `backend/routes/aiRoutes.js` → `server.js` `app.use('/api/ai', aiRoutes)` · 에이전트 봇은 `backend/controllers/aiAgentController.js`
- 화면: `root-cloudflare/src/pages/AiHelper.jsx`, `src/lib/aiApi.js`, `src/styles/ai-helper.css`, 라우트 `/ai`, 푸터 링크, 가이드 페이지 링크

## Read first

- `RDMD/features/ai-service.md` (구조·흐름·설정·배포 상태)
- `ai-service/README.md` (실행·지식 고치기 규칙)
- `RDMD/ai/01-ai-service-record.md` (설계 판단·확인 범위)
- `RDMD/features/agent-bot.md` · `RDMD/ai/06-agent-bot-record.md` (에이전트 봇 — 작업·요금·흐름·평가)

## Do

- 브라우저 → **Express `/api/ai`** → ai-service 순서 유지. ai-service 는 127.0.0.1 에만 바인드, 외부 포트·nginx 직접 연결 금지.
- 요청 제한·입력 길이 검사는 Express 에서 먼저(LLM 비용·남용 방지). ai-service 도 pydantic 으로 다시 검사.
- 운영에서는 `AI_SERVICE_KEY` 를 양쪽에 같은 값으로 설정(X-AI-Key).
- 기능·규칙 변경 시 **`ai-service/knowledge/*.md` 수치·문구를 서버 상수와 대조해 같이 고친다.** `tests/test_knowledge_sync.py` 가 확률·포인트·족보 배수·한도·출석 포인트·퀴즈 상금표를 코드와 비교하므로 **고친 뒤 `pytest` 를 돌린다**(안 맞으면 실패). 공식 티어표는 `tiers.json` 을 읽으므로 옮겨 적지 않는다.
- 지식 문서는 사용자 말(메뉴·버튼 이름)로, `##` 하나에 주제 하나.
- 캐릭터 티어는 검색 순위가 아니라 `CharacterIndex` 사실 주입으로 답한다 — 이 경로를 유지.
- LLM 실패는 예외 대신 fallback 답(`mode: fallback`). 키 없이도 서비스가 떠야 한다.
- 테스트는 가짜 LLM(`FakeListChatModel`)으로 — 실제 API 를 테스트에서 부르지 않는다.
- 의존성 버전은 `requirements.txt` 에 고정.

## Do not

- 서버(`shared/ai.env`)에 올릴 `ANTHROPIC_API_KEY` 를 채팅·명령줄·로그에 남기기 — 서버에서 직접 채운다
- 8000(ai-service)·11434(Ollama)를 nginx·보안 목록에 여는 것
- `requirements.txt` 를 고치고 `requirements-prod.txt` 를 빼먹기(운영 설치 목록은 따로 있다)

- **AI 서버가 꺼졌을 때 LLM 을 부르려고 기다리지 않는다**(`gate`). OFF 면 바로 지식 문서 답으로 가고, 화면에 OFF 안내가 나가야 한다. 문서 답은 지식 문서의 문장을 **그대로** 보여 주며 새 말을 지어내지 않는다.
- 서비스(uvicorn)가 쓰는 ChromaDB 폴더(`data/chroma`)를 다른 프로세스(스크립트·두 번째 서비스)가 같이 열지 않는다 — 서비스가 죽을 수 있다(스크립트는 `data/chroma-scripts` 를 쓴다). 로컬에서 띄울 때는 `scripts/dev_service.py`.
- **생성 모델(Ollama `gemma4:12b`)의 생각 모드를 켜지 않는다**(`reasoning=False`) — 켜면 토큰을 생각에 다 써서 답이 빈 문자열이 된다. 모델을 바꾸면 빈 답·속도를 먼저 확인한다.
- 벡터 색인이 실패해도 서비스는 BM25 로 계속 돌아야 한다(예외로 죽지 않게). 임베딩 모델을 바꾸면 컬렉션이 새로 만들어져 다시 색인된다.
- `MIN_VECTOR_SIM`(범위 밖 판단 기준, 0.52)·`MIN_LEXICAL_CLEAN`(벡터를 못 쓸 때, 12)은 실측값이다 — 지식·임베딩 모델을 바꾸면 `scripts/calibrate_relevance.py` 로 다시 확인하고 바꾼다.
- Ollama(11434)와 ai-service(8000)를 외부에 열지 않는다.
- **ai-service 에서 MongoDB 를 쓰지 않는다.** DB 가 필요하면 **Oracle SQL**(python-oracledb)만 — 값은 항상 바인드 변수(`:name`), 문자열을 SQL 에 이어 붙이지 않는다. 사이트 본체 `backend/` 의 MongoDB 와 섞지 않는다.
- 라우터에서 SQL 을 직접 쓰거나 서비스에서 HTTP 를 다루지 않는다(층 분리).
- **에이전트 봇(`app/Agent-Bot/`) 규칙**
  - 폴더 이름 `Agent-Bot` 을 바꾸지 않는다(창시자 지정). 임포트는 `agent_loader.load_agent_bot()` 뒤 `app.agent_bot` 로 한다.
  - 캐릭터 이름·배치·숫자는 **도구가 계산**한다. LLM 은 작업 분류(JSON)와 해설 글만 맡는다 — LLM 이 티어표 내용을 지어내게 하지 않는다.
  - 가이드 챗봇과 겹치는 일(이용법 설명)은 넣지 않고 `/ai` 로 안내한다(무료). 글·댓글 대리 작성, 행운 뽑기 대리 실행 같은 **쓰기 대행은 넣지 않는다**(사람과 먼저 정한다).
  - 포인트 값은 `backend/controllers/aiAgentController.js` 의 `AGENT_COSTS` 한 곳에만 둔다. ai-service 는 강도(level)만 알린다. 요금·한도를 바꾸면 `knowledge/08·09·05` 와 화면 문구가 같이 바뀌는지 `pytest` 로 확인한다.
  - 포인트는 `plan` 이벤트에서 차감하고 실패(오류 이벤트·끊김)하면 환불한다 — 이 순서를 바꾸지 않는다. 회원 전용(`requireAuth`, 관리자 계정 불가).
  - 에이전트 봇은 MongoDB·Oracle 에 직접 붙지 않는다. 게시판·공지는 `/api/ai/agent/data/*`(ai-service 전용 — X-AI-Key 또는 서버 안쪽 요청만)로 읽고, 회원 정보는 백엔드가 요청과 함께 넘긴 값만 쓴다(토큰을 ai-service 로 넘기지 않는다).
  - 느려지지 않게: 에이전트 봇 모델을 가이드 챗봇과 다르게 두지 않는다(`AGENT_OLLAMA_MODEL` 비움 = `OLLAMA_MODEL`), `num_ctx` 를 다르게 주지 않는다(모델이 다시 올라간다), 결과물을 해설보다 먼저 보낸다, 화면은 글자를 프레임 단위로 모아 그린다.
  - 에이전트 봇 대화도 저장하지 않는다(원장에는 "어떤 작업에 몇 포인트"만).
- LLM 키(`ANTHROPIC_API_KEY`)·`AI_SERVICE_KEY` 를 커밋·로그·응답에 넣지 않는다(`ai-service/.env` 는 gitignore — `.env` 패턴).
- **대화 내용을 저장하지 않는다**(현재 정책). 저장하려면 보관 기간·탈퇴 시 삭제·별도 DB 를 먼저 사람과 정한다.
- 관리자 기능·API 주소·서버 구조를 지식 문서에 넣지 않는다(사용자용).
- 프론트에서 ai-service 를 직접 부르지 않는다.
- 근거 없는 내용을 답하도록 프롬프트 규칙(사이트 정보만·추측 금지·역할 변경 거절)을 약화하지 않는다.

## 확인 방법

- `cd ai-service && .venv/Scripts/python -m pytest -q`
- `uvicorn app.main:app --port 8000` + `backend` :5000 → http://localhost:5000/ai
- 한글 질문 시험은 Node `fetch`·브라우저로(Windows Git Bash `curl` 은 한글 JSON 이 깨진다)

## 상태 (2026-11-12)

- **가이드 챗봇(휴버봇)은 운영 중** — 2026-11-11 새 Oracle VM 으로 옮기며 서버 안 Ollama(`gemma4:e4b`, CPU 약 6토큰/초)로 답한다. 벡터 검색은 서버에서 끔(BM25), 통계만 Oracle 에 저장(`AI_STORE_STATS`), 대화 원문은 저장하지 않는다(`RDMD/ai/05-oracle-storage-record.md`).
- **에이전트 봇은 커밋 완료 · 서버 반영 전**(2026-11-12). 반영은 `deploy.sh deploy`. 서버 nginx 에는 `/api/ai/agent/run` 스트림용 location(버퍼링 끔, 330초)을 따로 넣어야 한다(`backend/deploy/oracle/nginx-human-bug-tier.conf` — certbot 이 고친 서버 설정을 덮어쓰지 않게 손으로 추가). 서버가 CPU 라 해설이 길면 느리므로 `AGENT_SUMMARY_TOKENS` 를 줄이는 것을 권한다(`RDMD/ai/06-agent-bot-record.md`).
- 로컬 실측(RTX 4070 SUPER, gemma4:e4b): 결과물 0.1초 안, 해설 첫 글자 0.2~0.5초, 전체 3~5.5초. 실제 Claude 키로는 답 품질을 확인하지 않았다.
- `shared/ai.env` 가 없으면 `deploy.sh` 는 ai-service 를 올리지 않는다(사이트 정상, `/api/ai` 만 503).
