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

- 서비스: `ai-service/app/main.py`(FastAPI), `config.py`, `knowledge.py`(문서 적재·BM25·CharacterIndex), `graph.py`(LangGraph), `prompts.py`, `llm.py`(ChatAnthropic), `questions.py`
- 지식: `ai-service/knowledge/01~08-*.md`(사용자용 이용 안내) + `root-cloudflare/src/data/tiers.json`(직접 읽음)
- 테스트: `ai-service/tests/test_service.py` (`.venv/Scripts/python -m pytest -q`)
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
