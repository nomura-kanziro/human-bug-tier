# ai-service — 휴버대 티어표 AI 전용 서비스

사이트 지식으로 답하는 챗봇 **휴버봇**(`/ai` 화면)과 **랜덤 추천 질문 3개**를 만드는 Python 서비스다.
Express(`backend/`)와 **별도 프로세스**로 돌고, 브라우저는 이 서비스를 직접 부르지 않는다.

```
브라우저 /ai ──▶ /api/ai/*  (Cloudflare Pages /api 프록시 → Oracle Express, 또는 로컬 :5000)
                  │  backend/routes/aiRoutes.js — 입력 검사 · IP당 10분 20회 제한 · X-AI-Key 첨부 · 대화 저장 안 함
                  ▼
           ai-service (FastAPI, 127.0.0.1:8000)
                  │  LangGraph: analyze → retrieve(RAG) → generate / greet / out_of_scope
                  ├─ 지식: knowledge/*.md (사이트 이용 안내) + root-cloudflare/src/data/tiers.json (공식 티어표)
                  ├─ 검색: 한국어 2-gram BM25 (LangChain BaseRetriever 구현, 임베딩 API 불필요)
                  └─ 생성: Claude (LangChain ChatAnthropic) — 키가 없거나 실패하면 문서 답(fallback)
```

## 기술 구성

| 구성 | 쓰는 곳 |
|---|---|
| **FastAPI** + uvicorn | `app/main.py` — `/health`, `/questions`, `/chat`, `/reload` |
| **LangChain** | `langchain-core`(Document·BaseRetriever·메시지), `langchain-text-splitters`(MarkdownHeaderTextSplitter), `langchain-anthropic`(ChatAnthropic) |
| **LangGraph** | `app/guidans_Chat/graph.py` — `StateGraph` 질문 처리 흐름(조건 분기) |
| **RAG** | `app/guidans_Chat/knowledge.py` — 문서 적재·분할, BM25 검색기, 캐릭터 이름 색인, 근거를 프롬프트에 넣어 답 생성(`app/guidans_Chat/prompts.py`) |

## 폴더

챗봇 종류별로 폴더를 나눈다 — **가이드 전용 챗봇**은 `app/guidans_Chat/`, **에이전트 봇**은 `app/Agent-Bot/`(계획 단계, 폴더만).

```
ai-service/
├── app/
│   ├── main.py            # FastAPI 앱(공용 진입점) · 요청 모델(질문 500자, 이전 대화 12개) · X-AI-Key 검사
│   ├── config.py          # 공용 설정 — 환경 변수 / ai-service/.env
│   ├── guidans_Chat/      # ★ 가이드 전용 챗봇(휴버봇) — 관련 기능이 전부 이 안에
│   │   ├── knowledge.py   #   지식 베이스: 마크다운 + tiers.json → Document, BM25 검색기, CharacterIndex
│   │   ├── graph.py       #   LangGraph 흐름 + fallback 답
│   │   ├── prompts.py     #   시스템 프롬프트(사이트 정보만으로 답, 추측 금지, 역할 바꾸기 거절)
│   │   ├── llm.py         #   ChatAnthropic 생성(키 없으면 None)
│   │   └── questions.py   #   랜덤 추천 질문(캐릭터 / 티어 / 사이트 갈래 하나씩)
│   └── Agent-Bot/         # 에이전트 봇 자리(계획 단계 — README 만 있음, 구현 없음)
├── knowledge/             # 사이트 지식 원문(가이드 챗봇이 읽음) — 기능이 바뀌면 여기를 고친다
├── tests/                 # pytest (실제 LLM 호출 없음)
├── requirements.txt
└── .env.example
```

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

- `copy .env.example .env` 후 `ANTHROPIC_API_KEY` 를 넣으면 Claude 로 답한다. **비워 두면 LLM 없이 문서 검색 답(fallback)** 으로 동작해 키 없이도 화면·흐름을 시험할 수 있다.
- 백엔드(`backend`, :5000)를 같이 띄우면 http://localhost:5000/ai 에서 쓴다. 백엔드는 기본으로 `http://127.0.0.1:8000` 을 부른다(`backend/.env` 의 `AI_SERVICE_URL`).
- `AI_SERVICE_KEY` 를 쓰려면 `backend/.env` 와 `ai-service/.env` 에 **같은 값**을 넣는다.
- 테스트: `.venv/Scripts/python -m pytest -q`

## 환경 변수 (`.env.example`)

| 키 | 기본 | 설명 |
|---|---|---|
| `ANTHROPIC_API_KEY` | (없음) | Claude API 키. 없으면 fallback |
| `AI_MODEL` | `claude-opus-5-5` | 비용을 줄이려면 `claude-sonnet-5-5` / `claude-haiku-5-5` |
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

- **인사**("안녕" 등)는 LLM 없이 정해진 인사, **근거 없는 질문**(BM25 점수 10 미만이고 캐릭터·티어 언급 없음)은 LLM 없이 "사이트 정보에서 찾지 못했어요 + 문의하기" — 비용 절약과 사이트 밖 질문 차단.
- 질문에서 **캐릭터 이름**을 찾으면(전체 이름, 또는 한 명에게만 해당하는 이름 일부 단어) `tiers.json` 의 티어·세부등급·순서를 **[정확한 티어 정보]** 로 프롬프트에 넣는다. LLM 은 이것을 정답으로 쓴다.
- "N티어" 를 물으면 그 티어 전체 목록 문서를 근거 맨 앞에 넣는다.
- LLM 호출 실패(키 오류·시간 초과 등) 시 예외를 내지 않고 fallback 답으로 대신한다(`mode: "fallback"`). 화면에 "AI 연결 없이 사이트 문서에서 찾은 답" 표시가 붙는다.
- 대화는 **저장하지 않는다**. 화면(sessionStorage)에만 남고, 요청마다 최근 대화를 같이 보낸다.

## 운영 배포

**아직 운영 서버에 올리지 않았다.** 운영 서버(Oracle VM, 1GB RAM)에 올릴 때 할 일:

1. VM 에 Python 3.10+ · venv 준비, `ai-service/` 와 `tiers.json` 이 함께 있어야 한다(`AI_TIERS_JSON` 으로 위치 지정 가능 — 운영 패키지에는 `root-cloudflare/src` 가 없을 수 있음).
2. `ai-service/.env`(또는 환경 변수)에 `ANTHROPIC_API_KEY`, `AI_SERVICE_KEY` — `backend` 쪽 `.env` 에도 같은 `AI_SERVICE_KEY` 와 `AI_SERVICE_URL=http://127.0.0.1:8000`.
3. uvicorn 을 **127.0.0.1 에만** 바인드해 pm2(또는 systemd)로 상시 실행 — 외부 포트를 열지 않는다(nginx 에도 연결하지 않음. 바깥 요청은 Express `/api/ai` 로만 들어온다).
4. `backend/deploy/oracle/deploy.sh` 는 아직 ai-service 를 묶지 않는다 — 배포 스크립트 확장이 필요하다.
5. Cloudflare Pages 는 이미 `/api/*` 를 Oracle 로 넘기므로 추가 설정이 필요 없다.

AI 서비스가 꺼져 있어도 `/api/ai/*` 만 503("AI 도우미가 잠시 쉬는 중")이고 사이트의 다른 기능은 그대로다.
