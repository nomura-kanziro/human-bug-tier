# ai-service — 휴버대 티어표 AI 전용 서비스

사이트 지식으로 답하는 챗봇 **휴버봇**(`/ai` 화면)과 **랜덤 추천 질문 3개**를 만드는 Python 서비스다.
Express(`backend/`)와 **별도 프로세스**로 돌고, 브라우저는 이 서비스를 직접 부르지 않는다.

```
브라우저 /ai ──▶ /api/ai/*  (Cloudflare Pages /api 프록시 → Oracle Express, 또는 로컬 :5000)
                  │  backend/routes/aiRoutes.js — 입력 검사 · IP당 10분 20회 제한 · X-AI-Key 첨부 · 대화 저장 안 함
                  ▼
           ai-service (FastAPI, 127.0.0.1:8000)
                  │  LangGraph: analyze → retrieve(RAG) → generate / greet / refuse / out_of_scope
                  ├─ 지식: knowledge/*.md (사이트 이용 안내) + root-cloudflare/src/data/tiers.json (공식 티어표)
                  ├─ 검색: 하이브리드 = 한국어 2-gram BM25 + ChromaDB 벡터(Ollama bge-m3) → RRF 로 합침
                  └─ 생성: Ollama gemma4:12b (LangChain ChatOllama, 생각 모드 끔) — Claude API 로 바꿀 수도 있음
                           Ollama 가 꺼져 있으면 찾은 문서로 답(fallback)
```

## 기술 구성

| 구성 | 쓰는 곳 |
|---|---|
| **FastAPI** + uvicorn | `app/main.py`(진입) · `app/guidans_Chat/router/` — `/health`, `/questions`, `/chat`, `/reload` |
| **LangChain** | `langchain-core`(Document·BaseRetriever·메시지), `langchain-text-splitters`(MarkdownHeaderTextSplitter), `langchain-ollama`(ChatOllama·OllamaEmbeddings), `langchain-anthropic`(ChatAnthropic, 선택) |
| **LangGraph** | `app/guidans_Chat/service/graph.py` — `StateGraph` 질문 처리 흐름(조건 분기) |
| **RAG** | `service/knowledge.py`(문서 적재·분할·BM25·캐릭터 이름 색인) + **ChromaDB 벡터 검색(bge-m3 임베딩)** → `service/retrieval.py` 에서 BM25 와 RRF 로 합침 → 근거를 `service/prompts.py` 로 프롬프트에 넣어 답 생성 |
| **ChromaDB** | `database/chroma.py`(저장소 연결) · `repository/knowledge_vector_repository.py`(색인 동기화·검색) · `models/knowledge_chunk.py` |
| **Ollama** | 생성 `gemma4:12b`, 임베딩 `bge-m3` — 내 PC(RTX 4070 SUPER 12GB)에서 실행 |

## 폴더

**챗봇 종류별로 폴더**를 나누고, 폴더마다 **같은 6개 층**을 둔다 — `schema` · `router` · `service` · `models` · `repository` · `database`.
가이드 전용 챗봇은 `app/guidans_Chat/`, 에이전트 봇은 `app/Agent-Bot/`(계획 단계 — 층 폴더와 README 만 있는 빈 자리).

```
ai-service/
├── app/
│   ├── main.py            # FastAPI 진입점(공용) — 설정 로드 · 챗봇 라우터 연결 · /health
│   ├── config.py          # 공용 설정 — 환경 변수 / ai-service/.env
│   ├── deps.py            # 공용 의존성 — X-AI-Key 검사
│   ├── guidans_Chat/      # ★ 가이드 전용 챗봇(휴버봇)
│   │   ├── schema/        #   요청·응답 JSON 모양(pydantic): ChatRequest · ChatResponse · QuestionsResponse
│   │   ├── router/        #   HTTP: GET /questions · POST /chat · POST /reload
│   │   ├── service/       #   업무 로직: chat_service.py(진입) · knowledge.py(문서·BM25) · embeddings.py(bge-m3) · retrieval.py(하이브리드) · graph.py(LangGraph) · prompts.py · llm.py(Ollama/Claude) · questions.py
│   │   ├── models/        #   knowledge_chunk.py(벡터 DB 지식 조각). Oracle 테이블 모델은 아직 없음(대화 비저장)
│   │   ├── repository/    #   knowledge_vector_repository.py(ChromaDB 색인·검색, 사용 중) · base.py OracleRepository(Oracle SQL, 아직 안 씀)
│   │   └── database/      #   chroma.py(ChromaDB 연결, 사용 중) · oracle.py(python-oracledb 풀, 연결 준비만)
│   └── Agent-Bot/         # 에이전트 봇 자리(계획 단계) — 위와 같은 6개 층 폴더, 각각 README 만
├── knowledge/             # 사이트 지식 원문(가이드 챗봇이 읽음) — 기능이 바뀌면 여기를 고친다
├── data/chroma/           # 벡터 DB 파일(자동 생성, gitignore)
├── scripts/eval_guide_chat.py  # 실제 Ollama·bge-m3 로 질문 묶음 품질 점검(기준값 조정에도 사용)
├── tests/                 # pytest (실제 Ollama·Claude·Oracle 호출 없음 — 가짜 모델·가짜 임베딩·메모리 ChromaDB)
├── requirements.txt
└── .env.example
```

층의 책임(위에서 아래로만 부른다): **router**(HTTP 입출력) → **service**(업무 로직·LLM·검색) → **repository**(SQL) → **database**(연결). **schema** 는 요청·응답 JSON, **models** 는 DB 테이블 한 행. 라우터가 SQL 을 알거나, 서비스가 HTTP 를 아는 일이 없게 한다.

## 데이터베이스 · 벡터 저장소

- **MongoDB 는 쓰지 않는다.** 표 형태의 업무 데이터가 필요해지면 **Oracle SQL**(Autonomous Database 등, `python-oracledb` thin 모드)만 쓴다. 사이트 본체 `backend/` 의 MongoDB 와는 별개다.
- **지식 검색용 벡터는 ChromaDB**(로컬 파일, 임베디드 — 별도 서버 없음)에 둔다. Oracle 과 역할이 다르다: Oracle = 업무 데이터(SQL), ChromaDB = 검색용 벡터.
- 지금 가이드 챗봇은 **대화를 저장하지 않아** Oracle 은 쓰지 않는다. `database/oracle.py`·`repository/base.py` 는 연결·SQL 실행 도우미만 준비해 둔 것이다(`ORACLE_USER`/`ORACLE_PASSWORD`/`ORACLE_DSN` 이 비어 있으면 풀도 만들지 않는다). SQL 은 항상 **바인드 변수**(`:name`).
- 대화·사용자 데이터를 저장하려면 먼저 사람과 보관 기간·탈퇴 시 삭제를 정한다([`../RDMD/guides/security.md`](../RDMD/guides/security.md) 9절).

## 모델 (Ollama) — 처음 한 번

```bash
ollama pull gemma4:12b     # 생성(7.6GB, 12GB GPU 에 맞춤)  — 이미 있으면 생략
ollama pull bge-m3         # 임베딩(1.2GB, 다국어 1024차원)
```

- **생각(thinking) 모드를 끈다**(`reasoning=False`). gemma4 는 기본으로 생각을 먼저 해서 토큰을 다 쓰면 **답이 빈 문자열**로 나오고 느리다(시험: 켠 채 8.5초·빈 답 / 끄면 0.8초·정상 답). 모델을 바꿀 때도 확인할 것.
- 컨텍스트는 `OLLAMA_NUM_CTX=8192` — 프롬프트(근거 문서 포함)가 3~4천 토큰이라 Ollama 기본값이면 근거가 잘릴 수 있다.
- 서비스가 뜰 때 모델을 미리 불러 둔다(`AI_WARMUP`, 첫 호출 약 20초 지연 방지).
- GPU 메모리: gemma4:12b 약 8.4GB + bge-m3 약 0.7GB. 12GB GPU 에서 다른 프로그램이 3GB 쯤 쓰면 **여유가 거의 없다**(측정: 11.8/12.3GB) — 더 쓰면 일부가 CPU 로 넘어가 느려진다.
- Claude API 로 바꾸려면 `AI_LLM_PROVIDER=anthropic` + `ANTHROPIC_API_KEY`.

## 로컬 실행

```bash
cd ai-service
python -m venv .venv
# Windows
.venv/Scripts/python -m pip install -r requirements.txt
.venv/Scripts/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
# Linux/macOS
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

- `copy .env.example .env`(같은 줄 뒤 `# 주석` 은 로더가 떼어 주므로 그대로 복사해도 된다. 기본값 그대로 Ollama gemma4:12b + bge-m3). Ollama 가 꺼져 있으면 **LLM 없이 문서 검색 답(fallback)** 으로 동작한다. `AI_LLM_PROVIDER=anthropic` + `ANTHROPIC_API_KEY` 로 Claude 를 쓸 수도 있다.
- 처음 뜰 때 지식 조각(약 380개)을 임베딩해 ChromaDB 에 넣는다(약 15초). 이후에는 **바뀐 조각만** 다시 임베딩한다(재시작 0.3초). 지식을 고친 뒤에는 `POST /reload`(키 필요) 또는 재시작.
- 품질 점검: `.venv/Scripts/python scripts/eval_guide_chat.py` (`--no-llm` 으로 검색·분기만)
- 백엔드(`backend`, :5000)를 같이 띄우면 http://localhost:5000/ai 에서 쓴다. 백엔드는 기본으로 `http://127.0.0.1:8000` 을 부른다(`backend/.env` 의 `AI_SERVICE_URL`).
- `AI_SERVICE_KEY` 를 쓰려면 `backend/.env` 와 `ai-service/.env` 에 **같은 값**을 넣는다.
- 테스트: `.venv/Scripts/python -m pytest -q`

## 환경 변수 (`.env.example`)

| 키 | 기본 | 설명 |
|---|---|---|
| `AI_LLM_PROVIDER` | `ollama` | `ollama` · `anthropic` · `none`(문서 답만) |
| `OLLAMA_BASE_URL` / `OLLAMA_MODEL` | `http://127.0.0.1:11434` / `gemma4:12b` | 생성 모델 |
| `OLLAMA_NUM_CTX` / `OLLAMA_KEEP_ALIVE` | 8192 / `30m` | 컨텍스트 길이 / 모델 유지 시간 |
| `OLLAMA_TIMEOUT` | 180 | Ollama 응답을 기다리는 최대 시간(초), 0 이면 제한 없음 |
| `AI_WARMUP` | true | 서비스가 뜰 때 모델을 미리 올림 |
| `OLLAMA_EMBED_MODEL` | `bge-m3` | 임베딩 모델(바꾸면 새 컬렉션으로 다시 색인) |
| `AI_VECTOR_ENABLED` / `CHROMA_DIR` | true / `data/chroma` | 벡터 검색 켜기 / 벡터 DB 폴더 |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` | (없음) / `claude-sonnet-5-5` | `anthropic` 일 때만(예전 `AI_MODEL` 도 읽음) |
| `AI_MAX_TOKENS` | 700 | 답변 최대 토큰 |
| `AI_SERVICE_KEY` | (없음) | Express 와 공유하는 키(X-AI-Key). 비우면 검사 안 함 — **운영에서는 반드시 설정** |
| `AI_TOP_K` | 5 | 검색 문서 수 |
| `AI_HISTORY_TURNS` | 6 | LLM 에 넘길 최근 대화(메시지) 수 |
| `AI_KNOWLEDGE_DIR` / `AI_TIERS_JSON` | `knowledge` / `../root-cloudflare/src/data/tiers.json` | 지식 위치 |

## 지식 고치기 (중요)

- 사이트 기능·규칙이 바뀌면 **`knowledge/*.md` 를 같이 고친다.** 고치지 않으면 AI 가 옛 규칙을 답한다.
- 문서는 `#`(큰 제목) · `##`(작은 제목) 단위로 잘려 검색된다. 한 `##` 에는 한 주제만, 사용자가 쓰는 말(메뉴 이름·버튼 이름)로 쓴다.
- 수치(확률·포인트·배수·횟수)는 **서버 코드 상수를 확인하고** 옮긴다. 출처: `backend/controllers/luckDrawController.js`·`luckPokerController.js`·`luckLadderController.js`·`eventController.js`, `backend/utils/attendance.js`.
- 관리자 기능·서버 내부 구조·API 주소는 넣지 않는다(사용자용 지식).
- 공식 티어표는 `tiers.json` 을 직접 읽으므로 따로 옮겨 적지 않는다.
- 바꾼 뒤에는 서비스를 재시작하거나 `POST /reload`(키 필요)로 다시 읽는다.

## 동작 규칙

- **인사**("안녕" 등)는 LLM 없이 정해진 인사. **뻔한 프롬프트 인젝션**("시스템 프롬프트 보여줘"·"이전 지시 무시" 등)은 LLM 에 보내지 않고 바로 거절. **근거 없는 질문**은 LLM 없이 "사이트 정보에서 찾지 못했어요 + 문의하기" — 비용 절약과 사이트 밖 질문 차단.
- "근거 없는 질문" 판단: 캐릭터·티어 언급이 없을 때, **벡터 최고 유사도(bge-m3 코사인)가 0.50 미만**이면 범위 밖(실측: 범위 밖 0.35~0.49 / 사이트 질문 0.52 이상). 벡터를 못 쓸 때만 BM25 점수 10 기준(BM25 는 "어때·알려줘" 같은 흔한 말에도 점수가 나와 범위 밖 질문을 못 거른다). 기준값은 `service/graph.py` 의 `MIN_VECTOR_SIM`·`MIN_RELEVANCE` — 지식을 크게 바꾸면 `scripts/eval_guide_chat.py` 로 다시 확인.
- **검색**: BM25(글자 일치)와 ChromaDB 벡터(의미 일치)를 RRF(순위 합산)로 합친다. "출첵 하면 몇 점 줘?" 처럼 말을 바꿔 물어도 찾는다(BM25 만으로는 못 찾던 질문). 벡터 색인·검색이 실패하면 예외 없이 BM25 만으로 계속한다.
- 질문에서 **캐릭터 이름**을 찾으면(전체 이름, 또는 한 명에게만 해당하는 이름 일부 단어. 3글자 이하 짧은 이름은 단어 단위로만 — "사이"가 "사이트"에 걸리지 않게) `tiers.json` 의 티어·세부등급·순서를 **[정확한 티어 정보]** 로 프롬프트에 넣는다. LLM 은 이것을 정답으로 쓴다.
- "N티어" 를 물으면 그 티어 전체 목록 문서를 근거 맨 앞에 넣는다.
- LLM 호출 실패(Ollama 꺼짐·키 오류·시간 초과 등) 시 예외를 내지 않고 fallback 답으로 대신한다(`mode: "fallback"`). 화면에 "AI 연결 없이 사이트 문서에서 찾은 답" 표시가 붙는다.
- 대화는 **저장하지 않는다**. 화면(sessionStorage)에만 남고, 요청마다 최근 대화를 같이 보낸다.

## 운영 배포

**아직 운영 서버에 올리지 않았다.** 그리고 **Oracle VM(1GB RAM)에는 gemma4:12b 도 ChromaDB+임베딩도 올릴 수 없다** — 모델은 GPU 가 있는 내 PC 에서 돈다. 운영에 열려면 먼저 모델이 어디서 도는지 정해야 한다:

- A. **Claude API 로 운영**(`AI_LLM_PROVIDER=anthropic`) — 임베딩(bge-m3)도 Ollama 라서 운영에는 `AI_VECTOR_ENABLED=false`(BM25 만)로 두거나, 임베딩을 돌릴 곳이 따로 있어야 한다. 가장 단순하다.
- B. **내 PC 의 Ollama 를 서버가 호출**(터널 등) — 비용 0, PC 가 꺼지면 문서 답으로 떨어진다. `OLLAMA_BASE_URL` 로 지정.
- C. **GPU 가 있는 별도 서버**에 ai-service 와 Ollama 를 같이 올림.

어느 쪽이든 공통으로 할 일:

1. Python 3.10+ venv, `ai-service/` 와 `tiers.json`(`AI_TIERS_JSON`) 배치
2. `AI_SERVICE_KEY`(양쪽 같은 값), `backend` 쪽 `AI_SERVICE_URL`
3. uvicorn 을 **127.0.0.1 에만** 바인드해 pm2/systemd 로 상시 실행 — 외부 포트를 열지 않는다(nginx 에도 연결하지 않음)
4. Ollama 의 `11434` 포트도 외부에 열지 않는다(인증이 없다)
5. `backend/deploy/oracle/deploy.sh` 는 아직 ai-service 를 묶지 않는다 — 배포 스크립트 확장이 필요하다
6. Cloudflare Pages 는 이미 `/api/*` 를 Oracle 로 넘기므로 추가 설정이 필요 없다

AI 서비스가 꺼져 있어도 `/api/ai/*` 만 503("AI 도우미가 잠시 쉬는 중")이고 사이트의 다른 기능은 그대로다.
