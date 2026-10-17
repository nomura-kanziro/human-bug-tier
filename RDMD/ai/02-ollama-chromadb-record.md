---
area: ai
feature: ai-service
---

# 생성 모델을 Ollama gemma4:12b 로, 검색에 ChromaDB + bge-m3 벡터 추가

> 앞선 [01-ai-service-record.md](./01-ai-service-record.md) 는 Claude API + BM25 만 쓰는 첫 버전이다. 이 기록이 그 위에 얹은 변경이며, 기능 설명은 [`../features/ai-service.md`](../features/ai-service.md).

## 요청 · 결정

> 모델은 12GB GPU 라 **gemma4:12b**. `ai-service/app/guidans_Chat` 에 **ChromaDB** 를 쓰고 임베딩은 **bge-m3**.

의논 단계에서 고른 근거: 후보 6개(`llama3.1:8b` · `qwen3.8:27b` · `gemma4:e4b` · `gemma4:12b` · `qwen3:8b` · `llama3.2:3b`) 중 한국어·지시 이행·속도·메모리 균형이 가장 좋을 것으로 본 `gemma4:12b`(7.6GB). 사이트 지식은 RAG 로 넣으므로 27b 는 과하고, llama 계열은 한국어가 약하다고 판단. (순위는 추정이라 아래 실측으로 확인.)

## 변경

| 영역 | 내용 |
|---|---|
| 생성 | `service/llm.py` — provider 선택(`AI_LLM_PROVIDER` = `ollama`(기본) · `anthropic` · `none`). Ollama 는 LangChain `ChatOllama`(`gemma4:12b`, `num_ctx 8192`, 온도 0.2, **`reasoning=False`**). Claude 경로는 그대로 남김(`ANTHROPIC_MODEL`, 기본 `claude-sonnet-5-5`; 예전 `AI_MODEL` 도 읽음) |
| 임베딩 | `service/embeddings.py` — `OllamaEmbeddings(bge-m3)`(1024차원). `keep_alive` 는 정수(초)만 받아 `"30m"` 을 변환(`keep_alive_seconds`) |
| 벡터 저장 | `database/chroma.py`(ChromaDB 로컬 파일 `data/chroma`, 코사인, 컬렉션 `guide_knowledge__<임베딩모델>`, 텔레메트리 끔, Chroma 기본 임베딩 모델 미사용) · `models/knowledge_chunk.py`(조각 id = 내용 해시) · `repository/knowledge_vector_repository.py`(`sync` 새 조각만 임베딩·없어진 조각 삭제, `query`) |
| 검색 | `service/retrieval.py` `HybridSearcher` — BM25 + 벡터를 RRF 로 합침. 벡터 실패 시 BM25 만으로 계속 |
| 흐름 | `service/graph.py` — 관련성 판단을 벡터 유사도(`MIN_VECTOR_SIM = 0.50`)로(벡터를 못 쓸 때만 BM25 10), **프롬프트 인젝션 차단 노드 `refuse`** 추가 |
| 서비스 | `service/chat_service.py` — 색인 동기화·하이브리드 검색기 구성, 모델 **워밍업**(`AI_WARMUP`), `/health` 에 `provider`·`vector` 상태 |
| 프롬프트 | 7번 규칙 추가("[대괄호 제목]은 문서 이름이지 메뉴 이름이 아님") |
| 지식 | `CharacterIndex` — 3글자 이하 짧은 이름은 단어 단위로만(오탐 수정) |
| 도구 | `scripts/eval_guide_chat.py` — 실제 Ollama·bge-m3 로 질문 묶음 점검(`--no-llm`) |
| 설정 | `requirements.txt`(+`chromadb==1.5.9`·`langchain-ollama==1.1.0`), `.env.example` 재작성, `.gitignore` 에 `ai-service/data/` |

## 실측으로 알게 된 것

1. **gemma4:12b 는 기본이 생각(thinking) 모드다**(`ollama show` 의 thinking default true). 켠 채로 `num_predict 400` 이면 토큰을 생각에 다 써서 **답이 빈 문자열**, 8.5초. `think=false` 면 0.8초에 정상 답. → `reasoning=False` 필수. (모델을 바꿀 때마다 확인할 것.)
2. **벡터 색인이 처음에는 조용히 실패했다** — `OllamaEmbeddings(keep_alive="30m")` 가 정수만 받는 필드라 객체 생성에서 `ValidationError`. 서비스는 BM25 로 계속 동작해서 오류 없이 가려졌고, 실제 객체로 돌려 본 뒤에야 발견. 같은 이유로 가짜 임베딩 테스트가 못 잡으므로 실제 객체 생성 테스트를 추가했다.
3. **기준값은 실측으로 정했다.** bge-m3 코사인 유사도: 범위 밖 질문 0.35~0.49(날씨 0.464·점심 0.491·로또 0.486), 사이트 질문 0.52 이상(퀴즈 상금 0.523, 친구 링크 0.549) → 0.50. 경계에 "운영자 전화번호"(0.512)가 있는데, 통과시켜 LLM 이 "사이트 정보에서 찾을 수 없어요 + 문의하기"로 답하게 둔다. BM25 는 범위 밖 질문도 12~19점이 나와(어/알려줘 같은 흔한 말) 거르지 못한다.
4. **벡터가 BM25 가 못 찾는 질문을 찾는다**: "출첵 하면 몇 점 줘?" — BM25 12.3점으로 엉뚱한 문서였지만 벡터 0.666, 모델이 1~7일차 포인트를 정확히 답함.
5. **캐릭터 오탐**: "이 사이트 운영자의 전화번호가 뭐야?" 에 캐릭터 "사이"(9티어)가 붙었다("사이트" 속 글자). BM25 만 쓰던 때부터 있던 버그 — 짧은 이름은 단어 단위로.
6. 모델이 문서 제목을 메뉴처럼 지어냄("[출석체크] 페이지") → 프롬프트 7번.
7. GPU: gemma4:12b 8.4GB + bge-m3 0.7GB, 다른 프로그램 3GB 와 합쳐 **11.8/12.3GB** — 여유가 거의 없다.

## 확인

- `pytest` 22개 통과(벡터 층·하이브리드·인젝션·짧은 이름·유사도 기준·`keep_alive` 포함).
- `scripts/eval_guide_chat.py` 18개 질문(실제 모델): 이용법·규칙·캐릭터·티어는 근거대로 정확, 범위 밖·인젝션은 LLM 없이 거절. 응답 2~7초(긴 목록 12초, 워밍업 전 첫 호출 22초). 실제 uvicorn 으로 `/health`·`/chat`(대화 이력 포함 3.4초)·`/reload`.
- 색인 382개 15초 → 재시작 0.3초.

## 한계 · 남은 일

- 질문 18개 규모의 점검이다. 지식·모델을 바꾸면 `eval_guide_chat.py` 로 다시 확인하고 `MIN_VECTOR_SIM` 을 조정한다.
- 화면(`/ai`)을 이번 변경 후 다시 캡처하지 않았다(API 응답 형식은 그대로).
- **운영 서버(Oracle VM 1GB)에서는 이 구성을 못 돌린다** — 모델·임베딩이 어디서 돌지 정해야 한다([`../features/ai-service.md`](../features/ai-service.md) "운영 배포").
- 답변 스트리밍(긴 답 체감 지연), 질문 재작성(대화 이력 반영 검색)은 필요해지면.
