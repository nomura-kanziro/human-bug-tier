---
name: ai-service
description: >
  AI 도우미(/ai 휴버봇 챗봇 · 랜덤 추천 질문 3개), AI 전용 서비스 ai-service/(Python FastAPI · LangChain ·
  LangGraph · RAG · Claude), Express 프록시 /api/ai(aiRoutes.js), 지식 문서 ai-service/knowledge. Use when /ai, ai-service, LangGraph, RAG, 휴버봇, 지식 문서.
---

# Claude 스킬 — AI 전용 서비스 (ai-service)

> 2026-10-18 신설. **AI 기능은 Express 와 분리된 별도 서비스**다. 프론트·백엔드 작업 규칙(`root-cloudflare/` 만, `root-render/` 금지)은 그대로.

## When

- `/ai` 화면(휴버봇), 추천 질문, AI 답변 내용·말투·정확도
- `ai-service/` 코드(FastAPI · LangGraph · 검색 · 프롬프트 · 모델), `ai-service/knowledge/*.md`
- `backend/routes/aiRoutes.js`(`/api/ai`), `AI_SERVICE_URL`/`AI_SERVICE_KEY`/`ANTHROPIC_API_KEY`
- **사이트 기능·규칙(포인트·확률·배수·횟수·메뉴 이름)을 바꾸는 모든 작업** → 지식 문서 동기화 필요

## Code map

- 서비스 공용: `ai-service/app/main.py`(FastAPI 진입점), `app/config.py`
- **챗봇은 종류별 폴더로 나누고, 폴더마다 같은 6개 층을 둔다**: `schema/`(요청·응답 pydantic) · `router/`(HTTP) · `service/`(업무 로직) · `models/`(Oracle 테이블 행 모양) · `repository/`(Oracle SQL) · `database/`(Oracle 연결). 호출은 router → service → repository → database 한 방향.
  - 가이드 전용 챗봇 = `ai-service/app/guidans_Chat/` — `service/` 에 `chat_service.py`(진입)·`knowledge.py`(문서·BM25·CharacterIndex)·`embeddings.py`(bge-m3)·`retrieval.py`(BM25+벡터 RRF)·`graph.py`(LangGraph)·`prompts.py`·`llm.py`(Ollama/Claude)·`questions.py`, `database/chroma.py`·`repository/knowledge_vector_repository.py`·`models/knowledge_chunk.py`(ChromaDB 벡터 저장), `router/chat_router.py`, `schema/chat.py`
  - 에이전트 봇 = `ai-service/app/Agent-Bot/`(계획 단계 — 6개 층 폴더에 README 만, 구현·수정 금지). 새 챗봇 코드를 다른 챗봇 폴더에 섞지 않는다
  - 공용: `app/main.py`(진입·라우터 연결), `config.py`, `deps.py`(X-AI-Key 검사)
- 지식: `ai-service/knowledge/01~08-*.md`(사용자용 이용 안내) + `root-cloudflare/src/data/tiers.json`(직접 읽음)
- 테스트: `ai-service/tests/` (`.venv/Scripts/python -m pytest -q` — 가짜 모델·가짜 임베딩·메모리 ChromaDB 라 Ollama 없이 돈다). 실제 모델 점검: `scripts/eval_guide_chat.py`
- 프록시: `backend/routes/aiRoutes.js` → `server.js` `app.use('/api/ai', aiRoutes)`
- 화면: `root-cloudflare/src/pages/AiHelper.jsx`, `src/lib/aiApi.js`, `src/styles/ai-helper.css`, 라우트 `/ai`, 푸터 링크, 가이드 페이지 링크

## Read first

- `.agents/ai-service/skill.md` (정본, 최우선)
- `RDMD/features/ai-service.md` (구조·흐름·설정·배포 상태)
- `ai-service/README.md` (실행·지식 고치기 규칙)
- `RDMD/ai/01-ai-service-record.md` (설계 판단·확인 범위)

## Do

- 브라우저 → **Express `/api/ai`** → ai-service 순서 유지. ai-service 는 127.0.0.1 에만 바인드, 외부 포트·nginx 직접 연결 금지.
- 요청 제한·입력 길이 검사는 Express 에서 먼저(LLM 비용·남용 방지). ai-service 도 pydantic 으로 다시 검사.
- 운영에서는 `AI_SERVICE_KEY` 를 양쪽에 같은 값으로 설정(X-AI-Key).
- 기능·규칙 변경 시 **`ai-service/knowledge/*.md` 수치·문구를 서버 상수와 대조해 같이 고친다.** 공식 티어표는 `tiers.json` 을 읽으므로 옮겨 적지 않는다.
- 지식 문서는 사용자 말(메뉴·버튼 이름)로, `##` 하나에 주제 하나.
- 캐릭터 티어는 검색 순위가 아니라 `CharacterIndex` 사실 주입으로 답한다 — 이 경로를 유지.
- LLM 실패는 예외 대신 fallback 답(`mode: fallback`). 키 없이도 서비스가 떠야 한다.
- 테스트는 가짜 LLM(`FakeListChatModel`)으로 — 실제 API 를 테스트에서 부르지 않는다.
- 의존성 버전은 `requirements.txt` 에 고정.

## Do not

- **생성 모델(Ollama `gemma4:12b`)의 생각 모드를 켜지 않는다**(`reasoning=False`) — 켜면 토큰을 생각에 다 써서 답이 빈 문자열이 된다. 모델을 바꾸면 빈 답·속도를 먼저 확인한다.
- 벡터 색인이 실패해도 서비스는 BM25 로 계속 돌아야 한다(예외로 죽지 않게). 임베딩 모델을 바꾸면 컬렉션이 새로 만들어져 다시 색인된다.
- `MIN_VECTOR_SIM`(범위 밖 판단 기준, 0.50)은 실측값이다 — 지식·임베딩 모델을 바꾸면 `scripts/eval_guide_chat.py` 로 다시 확인하고 바꾼다.
- Ollama(11434)와 ai-service(8000)를 외부에 열지 않는다.
- **ai-service 에서 MongoDB 를 쓰지 않는다.** DB 가 필요하면 **Oracle SQL**(python-oracledb)만 — 값은 항상 바인드 변수(`:name`), 문자열을 SQL 에 이어 붙이지 않는다. 사이트 본체 `backend/` 의 MongoDB 와 섞지 않는다.
- 라우터에서 SQL 을 직접 쓰거나 서비스에서 HTTP 를 다루지 않는다(층 분리).
- LLM 키(`ANTHROPIC_API_KEY`)·`AI_SERVICE_KEY` 를 커밋·로그·응답에 넣지 않는다(`ai-service/.env` 는 gitignore — `.env` 패턴).
- **대화 내용을 저장하지 않는다**(현재 정책). 저장하려면 보관 기간·탈퇴 시 삭제·별도 DB 를 먼저 사람과 정한다.
- 관리자 기능·API 주소·서버 구조를 지식 문서에 넣지 않는다(사용자용).
- 프론트에서 ai-service 를 직접 부르지 않는다.
- 근거 없는 내용을 답하도록 프롬프트 규칙(사이트 정보만·추측 금지·역할 변경 거절)을 약화하지 않는다.

## 확인 방법

- `cd ai-service && .venv/Scripts/python -m pytest -q`
- `uvicorn app.main:app --port 8000` + `backend` :5000 → http://localhost:5000/ai
- 한글 질문 시험은 Node `fetch`·브라우저로(Windows Git Bash `curl` 은 한글 JSON 이 깨진다)

## 상태 (2026-10-18)

- 커밋 완료, **운영 배포 전**. 실제 Claude 키로 답 품질 미검증. `backend/deploy/oracle/deploy.sh` 는 ai-service 를 아직 묶지 않는다.
