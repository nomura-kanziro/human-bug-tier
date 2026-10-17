# AI 도우미 · AI 전용 서비스 (ai-service)

> 2026-10-18 신설. 사이트 지식으로 답하는 챗봇 **휴버봇**과 **랜덤 추천 질문 3개**.
> AI 기능은 Express 와 분리된 **AI 전용 서비스**(저장소 루트 `ai-service/`, Python FastAPI)가 담당한다.
> 운영 서버에는 **아직 배포하지 않았다**(아래 "운영 배포" 참고). 생성 모델은 내 PC 의 Ollama(gemma4:12b), 검색은 ChromaDB + bge-m3(2026-10-18 적용).

## 관련 기록 (세 곳에 나눠 있다)

| 조각 | 기록 |
|---|---|
| AI 서비스 자체 | [`../ai/01-ai-service-record.md`](../ai/01-ai-service-record.md) (+ 서비스 README [`../../ai-service/README.md`](../../ai-service/README.md)) |
| Express 프록시 | [`../backend/10-ai/01-ai-proxy-record.md`](../backend/10-ai/01-ai-proxy-record.md) |
| 화면 | [`../frontend/15-ai/01-ai-helper-page-record.md`](../frontend/15-ai/01-ai-helper-page-record.md) |
| 작업 규칙(모든 AI 공통 정본) | [`../../.agents/ai-service/skill.md`](../../.agents/ai-service/skill.md) |
| 배포·보안 | [`../guides/deploy-checklist.md`](../guides/deploy-checklist.md) "AI" 절 · [`../guides/security.md`](../guides/security.md) 9절 |

## 챗봇 폴더 구분과 6개 층 (`ai-service/app/`)

챗봇 종류별로 폴더를 나누고, **폴더마다 같은 6개 층**(`schema` · `router` · `service` · `models` · `repository` · `database`)을 둔다.

| 폴더 | 챗봇 | 상태 |
|---|---|---|
| `app/guidans_Chat/` | **가이드 전용 챗봇(휴버봇)** — 사이트 이용법·티어표 안내 | 구현됨(`/ai`) |
| `app/Agent-Bot/` | **에이전트 봇**(공지 "앞으로의 계획") | 계획 단계 — 6개 층 폴더에 README 만, 파이썬 코드 없음(방치) |
| `app/main.py` · `config.py` · `deps.py` | 공용(FastAPI 진입점·설정·키 검사) | — |

| 층 | 책임 | `guidans_Chat` 의 내용 |
|---|---|---|
| `schema/` | 요청·응답 JSON 모양(pydantic) | `chat.py` — ChatRequest · ChatResponse · QuestionsResponse · Turn(길이 제한은 Express 와 같은 값) |
| `router/` | HTTP 입출력 — 서비스를 부르기만 | `chat_router.py` — `GET /questions` · `POST /chat` · `POST /reload` |
| `service/` | 업무 로직 | `chat_service.py`(GuideChatService — 지식·그래프를 묶음으로 보관·교체) · `knowledge.py`(RAG) · `graph.py`(LangGraph) · `prompts.py` · `llm.py` · `questions.py` |
| `models/` | Oracle 테이블 한 행의 모양 | 아직 없음(대화를 저장하지 않음) |
| `repository/` | Oracle SQL 실행 | `base.py` OracleRepository(fetch_all·fetch_one·execute, **바인드 변수**, 쓰기 후 commit) — 쓰는 곳 아직 없음 |
| `database/` | Oracle 연결 | `oracle.py` — python-oracledb(thin) 커넥션 풀, 설정이 있을 때만 지연 생성 |

호출 방향은 router → service → repository → database 한 방향. 사이트 지식 원문 `ai-service/knowledge/*.md` 는 가이드 챗봇이 읽는다.

### 데이터베이스 원칙 — MongoDB 를 쓰지 않는다

- ai-service 는 **MongoDB 를 쓰지 않는다.** DB 가 필요하면 **Oracle SQL**(Autonomous Database 등)만 쓴다. 사이트 본체 `backend/` 의 MongoDB 와는 완전히 별개다.
- 지금은 **DB 를 쓰지 않는다**(대화 비저장 정책). `database/`·`repository/` 는 연결과 SQL 실행 도우미만 준비된 층이다. `ORACLE_USER`/`ORACLE_PASSWORD`/`ORACLE_DSN`(+ Autonomous DB 지갑 `ORACLE_WALLET_DIR`)이 비어 있으면 연결하지 않는다.
- 저장이 필요해지면 먼저 보관 기간·탈퇴 시 삭제를 사람과 정하고, 테이블마다 `models/` 에 행 모양, `repository/` 에 SQL, DDL 은 `RDMD/ai/` 기록에 남긴다. 실제 Oracle 연결은 아직 시험하지 못했다(가짜 연결로 SQL 실행 도우미만 시험).

## 한 줄 요약

`/ai` 화면에서 질문하면 → Express `/api/ai/chat` 이 검사·제한 후 → `ai-service` 가 **LangGraph** 흐름으로 사이트 지식을 **RAG**(BM25 + **ChromaDB 벡터**, 임베딩 **bge-m3**) 검색해 **Ollama gemma4:12b**(LangChain)로 답한다. Ollama 가 꺼져 있거나 실패하면 찾은 문서로 답한다. Claude API 로 바꿀 수도 있다(`AI_LLM_PROVIDER`).

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
app/guidans_Chat/service/graph.py (LangGraph StateGraph)
  START → analyze ─┬─ 인사 ───────────────────▶ greet ────────▶ END
                   ├─ 지시 무시·프롬프트 공개 요구 ─▶ refuse ───────▶ END
                   └─ retrieve(하이브리드 RAG) ─┬─ 근거 없음 ─▶ out_of_scope ─▶ END
                                               └─ 근거 있음 ─▶ generate ────▶ END
```

| 노드 | 하는 일 |
|---|---|
| analyze | 인사 판별, **프롬프트 인젝션 패턴 차단**, 질문 속 **캐릭터 이름**(CharacterIndex)·**티어 번호**("3티어") 찾기 |
| retrieve | **하이브리드 검색**(BM25 + ChromaDB 벡터, RRF) 상위 k개 + 언급된 티어의 전체 목록 문서. 캐릭터를 찾았으면 이름이 비슷한 다른 캐릭터 문서는 뺀다. 관련성은 벡터 유사도로 판단 |
| generate | 시스템 프롬프트 + 최근 대화 + `[정확한 티어 정보]` + `[사이트 문서]` + 질문 → **LLM(기본 Ollama gemma4:12b)**. 실패 시 fallback |
| greet / refuse / out_of_scope | LLM 없이 정해진 답(비용 0). 근거 없음 = 캐릭터·티어 언급 없음 + 벡터 최고 유사도 0.50 미만(벡터를 못 쓰면 BM25 10 미만) |

## 지식(RAG)

| 원천 | 문서화 방식 |
|---|---|
| `ai-service/knowledge/*.md` (8개) | 사이트 소개 · 공식 티어표 안내 · 커스텀 메이커 · 게시판 · 행운 뽑기 · 이벤트 · 회원/마이페이지/출석체크 · 가이드/AI 도우미. `MarkdownHeaderTextSplitter` 로 `#`/`##` 단위 분할, 제목을 본문 앞에 붙임 |
| `root-cloudflare/src/data/tiers.json` | 티어별 문서 9개(세부등급별 캐릭터 목록) + 캐릭터별 문서(338명). 티어 설명은 JSON `title` 의 " - " 뒤 |

지식 조각은 모두 382개(2026-10-18). 두 갈래로 검색해 합친다.

| 갈래 | 방식 | 강점 |
|---|---|---|
| BM25 (`service/knowledge.py`) | 단어 + 조사 뗀 단어 + **문자 2-gram**, 제목 토큰 3배 가중, LangChain `BaseRetriever` 구현 | 고유명사(캐릭터·메뉴 이름) |
| 벡터 (`service/embeddings.py` + `repository/knowledge_vector_repository.py` + `database/chroma.py`) | Ollama **bge-m3**(다국어 1024차원)로 임베딩해 **ChromaDB**(코사인) 에 저장, 질문도 같은 모델로 임베딩 | 말을 바꿔 물어도 찾음("출첵 하면 몇 점 줘?") |

- **합치기**: `service/retrieval.py` `HybridSearcher` — RRF(순위 r 에 1/(60+r) 합산). 점수 단위가 달라도 된다. 벡터 색인·검색이 실패하면 예외 없이 BM25 만으로 계속한다.
- **색인 동기화**: 조각 id = 내용 해시. 서비스가 뜰 때(그리고 `POST /reload`) 지금 조각과 저장된 조각을 id 로 비교해 **새 조각만 임베딩해 넣고 없어진 조각은 지운다.** 처음 약 15초(382개), 안 바뀌었으면 0.3초. 컬렉션 이름에 임베딩 모델 이름이 들어가(`guide_knowledge__bge-m3`) 모델을 바꾸면 새로 색인한다. 파일은 `ai-service/data/chroma/`(gitignore).
- **관련성 판단**: 캐릭터·티어 언급이 없는 질문은 **벡터 최고 유사도 0.50 미만**이면 범위 밖. 실측(2026-10-18): 범위 밖(날씨·비트코인·점심·영화 등) 0.35~0.49, 사이트 질문 0.52 이상. 벡터를 못 쓸 때만 BM25 점수 10 기준.
- 캐릭터 찾기: 전체 이름(공백·`*` 무시) 우선, 없으면 이름의 한 단어(2글자 이상, 한 명에게만 해당, **단어 단위 일치** — '타츠오미'가 '타츠오'에 걸리지 않게). **3글자 이하 짧은 이름은 단어 단위로만**(\"사이\"가 \"사이트\"에 걸려 \"운영자 전화번호?\" 에 엉뚱한 캐릭터가 붙던 오탐을 고침).
- 지식 문서의 수치는 2026-10-18 서버 코드 상수와 대조했다(행운 뽑기 확률·포인트, 포커 배수, 랜덤 뽑기 배수, 퀴즈 상금표, 출석 포인트, 닉네임 규칙, 1시간 자동 로그아웃 등).

## 생성 모델 (`service/llm.py`)

- 기본 **Ollama `gemma4:12b`**(7.6GB, RTX 4070 SUPER 12GB 에 맞춤). 의논 결과: 한국어·지시 이행·속도 균형, 사이트 지식은 RAG 로 넣으므로 더 큰 모델은 과함. `AI_LLM_PROVIDER=anthropic` 으로 Claude API 로 바꿀 수 있다.
- ★ **생각(thinking) 모드를 끈다**(`reasoning=False`). gemma4 는 기본으로 생각을 먼저 해서 토큰을 다 쓰면 **답이 빈 문자열**이 되고 느리다(실측: 켠 채 8.5초·빈 답 / 끄면 0.8초·정상 답). 컨텍스트 `OLLAMA_NUM_CTX=8192`, 온도 0.2.
- 서비스가 뜰 때 모델을 미리 불러 둔다(워밍업) — Ollama 는 첫 호출에 20초쯤 걸린다.
- GPU 메모리: gemma4:12b 8.4GB + bge-m3 0.7GB. 다른 프로그램이 3GB 쯤 쓰면 11.8/12.3GB 로 **여유가 거의 없다** — 더 쓰면 일부가 CPU 로 넘어가 느려진다.

## 프롬프트 원칙 (`app/guidans_Chat/service/prompts.py`)

1. 근거(티어 정보·사이트 문서)에 있는 내용만, 없으면 "찾을 수 없어요" + 문의하기
2. 캐릭터 티어는 `[정확한 티어 정보]` 가 정답, 작품 줄거리·능력 등은 지어내지 않음
3. 해요체, 2~5문장 또는 짧은 목록, 마크다운 제목·표 금지
4. 역할 변경·지시 공개 요구 등은 거절(프롬프트 인젝션 방어) — 뻔한 시도("시스템 프롬프트 보여줘"·"이전 지시 무시")는 프롬프트까지 가기 전에 `analyze` 노드가 정해진 문구로 거절
5. 개인정보를 요구하지 않고, 관리자 기능·서버 구조는 안내하지 않음
6. 사이트 문서의 [대괄호 제목]은 문서 이름일 뿐 메뉴·페이지 이름이 아니다 — 제목을 메뉴처럼 안내하지 않는다(실측에서 모델이 "[출석체크] 페이지"라고 지어낸 것을 막으려고 추가)

## 랜덤 추천 질문

`app/guidans_Chat/service/questions.py` — LLM 없이 즉시 생성. 캐릭터("○○는 몇 티어야?", tiers.json 무작위) · 티어("N티어에는 누가 있어?" / "N티어는 어떤 등급이야?") · 사이트(15개 목록) 갈래에서 하나씩 뽑아 섞는다. 조사(은/는)는 받침으로 고른다. 화면 "🔄 다른 질문" 으로 새로 받는다.

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
| `ai-service/.env` | `AI_LLM_PROVIDER`(ollama·anthropic·none) · `OLLAMA_BASE_URL` · `OLLAMA_MODEL`(기본 `gemma4:12b`) · `OLLAMA_NUM_CTX` · `OLLAMA_KEEP_ALIVE` · `AI_WARMUP` · `OLLAMA_EMBED_MODEL`(기본 `bge-m3`) · `AI_VECTOR_ENABLED` · `CHROMA_DIR` · `ANTHROPIC_API_KEY`/`ANTHROPIC_MODEL`(anthropic 일 때만) · `AI_MAX_TOKENS` · `AI_SERVICE_KEY` · `AI_TOP_K` · `AI_HISTORY_TURNS` · `AI_KNOWLEDGE_DIR` · `AI_TIERS_JSON` |
| `backend/.env` | `AI_SERVICE_URL`(기본 `http://127.0.0.1:8000`), `AI_SERVICE_KEY`(ai-service 와 같은 값) |
| Ollama(내 PC) | `ollama pull gemma4:12b` · `ollama pull bge-m3` |

## 지식을 고쳐야 하는 경우 (운영 규칙)

사이트 기능·규칙이 바뀌는 작업(포인트·확률·배수·횟수·메뉴/버튼 이름·새 화면)은 코드와 함께 **`ai-service/knowledge/*.md`** 를 고친다. 안 고치면 AI 가 옛 규칙을 자신 있게 답한다. 수치는 서버 상수에서 옮긴다(출처 파일은 `ai-service/README.md` "지식 고치기"). 공식 티어표는 `tiers.json` 을 직접 읽으므로 따로 고치지 않는다. 체크리스트: [`../guides/new-feature-checklist.md`](../guides/new-feature-checklist.md) 0-1.

## 확인 (2026-10-18)

- `pytest` 22개 통과 — 지식 적재, 캐릭터 찾기(짧은 이름 오탐 포함), 검색, 그래프 분기(인사·**프롬프트 인젝션 거절(LLM 호출 없음)**·범위 밖·벡터 유사도 기준), 가짜 LLM 경로·실패 시 fallback, 랜덤 질문, API(키 검사·길이 제한), 6개 층 폴더, Oracle 층(가짜 연결), **벡터 층(가짜 임베딩 + 메모리 ChromaDB: 동기화가 새 조각만 넣고 없어진 조각을 지움, 검색 순서, RRF 합치기, 벡터 실패 시 BM25 로 계속, 벡터 끄기, `keep_alive` 변환)**.
- **실제 Ollama(gemma4:12b)·bge-m3·ChromaDB 로 `scripts/eval_guide_chat.py` 를 돌려 18개 질문 확인**: 이용법·규칙·캐릭터·티어 질문이 모두 근거대로 짧은 해요체로 답함(캐릭터 티어·포인트·배수 정확), 범위 밖(날씨·비트코인·파이썬 코드)과 인젝션 시도는 LLM 없이 정해진 거절, "운영자 전화번호"는 "사이트 정보에서 찾을 수 없어요 + 문의하기". 응답 시간은 보통 2~7초(목록이 긴 "3티어에는 누가 있어?"는 12초), 첫 호출은 워밍업 전 22초.
- 임베딩 색인 382개 약 15초, 이후 재시작 0.3초. 실제 uvicorn 으로 `/health`(provider·model·vector 상태)·`/chat`·`/reload` 확인.
- 이 과정에서 찾아 고친 것: ① `OllamaEmbeddings` 의 `keep_alive` 는 정수(초)만 받는데 `"30m"` 을 넘겨 벡터 색인이 조용히 실패(BM25 로 계속 동작해 가려져 있었음) ② gemma4 생각 모드로 빈 답 ③ BM25 만으로는 범위 밖 질문을 못 거름 → 벡터 유사도 기준 ④ 짧은 이름 오탐 ⑤ 모델이 "[출석체크] 페이지"라고 지어냄 → 프롬프트 7번 규칙.
- 한계: 질문 18개(+범위 밖 몇 개)로 기준값을 정했다. 지식·모델을 바꾸면 다시 확인할 것. 화면(`/ai`)은 이번 변경 후 다시 캡처하지 않았다(API 응답 형식은 그대로).

## 운영 배포 (미완)

**Oracle VM(1GB RAM)에는 gemma4:12b 도 임베딩·ChromaDB 도 올릴 수 없다.** 모델이 어디서 도는지부터 정해야 한다(자세히는 [`../../ai-service/README.md`](../../ai-service/README.md) "운영 배포"):

1. **Claude API 로 운영**(`AI_LLM_PROVIDER=anthropic`, 임베딩은 Ollama 라 운영에는 `AI_VECTOR_ENABLED=false` 로 BM25 만) — 가장 단순
2. **내 PC 의 Ollama 를 서버가 호출**(터널) — 비용 0, PC 가 꺼지면 문서 답
3. **GPU 서버에 ai-service + Ollama**
- 공통: Python venv, `AI_SERVICE_KEY`(양쪽), uvicorn 은 127.0.0.1 에만, **Ollama 11434 도 외부에 열지 않음**, `deploy.sh` 확장 필요, Cloudflare Pages 는 기존 `/api/*` 프록시 그대로

## 다음 단계(제안)

- 대화 저장이 필요해지면 별도 DB(예: Oracle Autonomous DB) + 보관 기간·탈퇴 시 삭제 규칙을 먼저 정한다(현재는 저장 안 함)
- (완료) 임베딩 + 벡터 검색 하이브리드 — 2026-10-18 ChromaDB + bge-m3 로 적용
- 답변 스트리밍(토큰이 나오는 대로 화면에 표시) — 긴 답(12초)의 체감 지연을 줄임
- 로그인 회원 전용 도구(내 포인트·출석 현황 조회)를 LangGraph 노드/도구로 추가
- 답변 피드백(👍/👎) 수집으로 지식 문서 보강
