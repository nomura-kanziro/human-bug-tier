# 06. 휴버대 에이전트 봇 구현 기록 (ai-service `app/Agent-Bot`)

> 날짜: 2026-11-12 · 작성: nomura
> 기능 설명은 [`../features/agent-bot.md`](../features/agent-bot.md). 백엔드 쪽은 [`../backend/10-ai/02-agent-bot-proxy-record.md`](../backend/10-ai/02-agent-bot-proxy-record.md), 화면은 [`../frontend/15-ai/02-agent-bot-ui-record.md`](../frontend/15-ai/02-agent-bot-ui-record.md).

## 관련 커밋

- `febe87f` feat(ai-service): 휴버대 에이전트 봇 구현 — 티어표 초안·분석·요약·브리핑·검색 도구와 NDJSON 스트리밍
- `cb4e9a9` feat(backend): 에이전트 봇 프록시 /api/ai/agent — 작업 강도별 포인트 차감·환불, 스트림 전달, 전용 조회 API
- `3559ed2` feat(agent-bot): 오른쪽 아래 원형 버튼·대형 모달 추가

## 한 줄 요약

계획 단계로 폴더만 있던 `app/Agent-Bot/` 에, 말로 시킨 작업을 도구로 실행하고 결과물과 해설을 스트림으로 돌려주는 에이전트 봇을 넣었다.

## 요청과 판단

창시자 요청: 가이드 채팅보다 섬세하고 강력한 작업 기능, 프롬프트로 티어표 만들기, 자동 검색, 그 밖에 필요한 기능을 만들어 평가하고 겹치면 차별화하거나 빼기, 느린 출력 방지, 작업 강도별 포인트, 사이트에 명시.

| 판단 | 내용 |
|---|---|
| 모델 | 운영과 같은 `gemma4:e4b` 를 그대로 쓴다. 에이전트 봇 전용 모델을 따로 두지 않았다(`AGENT_OLLAMA_MODEL` 기본 비움 = `OLLAMA_MODEL`) — 모델을 두 개 올리면 서로 밀어내 부를 때마다 다시 올라간다 |
| 작은 모델에 맡기는 범위 | 4B급 모델에게 캐릭터 300여 명의 배치를 쓰게 하면 이름을 지어내고 느리다. 그래서 **배치·숫자는 도구가 계산**하고 LLM 은 작업 분류(짧은 JSON)와 해설만 한다 |
| 작업 판별 | 규칙이 먼저다. 뻔한 요청은 LLM 없이 0초에 정한다. 규칙이 못 정한 말만 LLM 에 묻는다 |
| 응답 방식 | 결과물을 먼저 보내고 해설은 스트리밍. 전부 만들어질 때까지 빈 화면으로 기다리지 않는다 |
| DB | ai-service 는 MongoDB 를 쓰지 않는다는 원칙을 지켰다. 게시판·공지는 백엔드의 전용 조회 API 로 읽고, 회원 정보는 백엔드가 요청과 함께 넘긴다. Oracle 도 쓰지 않는다(대화 저장 없음) |
| 폴더 이름 | `Agent-Bot`(하이픈)을 그대로 두고 `app/agent_loader.py` 가 `importlib` 로 `app.agent_bot` 패키지로 올린다 |
| 요금 값의 위치 | 포인트 값은 백엔드 한 곳(`AGENT_COSTS`)에만 둔다. ai-service 는 강도만 알린다 |

넣은 기능과 뺀 기능의 평가 표는 [`../features/agent-bot.md`](../features/agent-bot.md) "평가" 절에 있다.

## 구성 (`ai-service/app/Agent-Bot/`)

| 층 | 파일 | 내용 |
|---|---|---|
| schema | `agent.py` | `AgentRunRequest`(message·history·user·maker) · `UserContext` · 이벤트 형식 설명 |
| router | `agent_router.py` | `GET /agent/info` · `POST /agent/run`(NDJSON `StreamingResponse`) |
| service | `agent_service.py` | 진입. LangGraph 를 `stream_mode="updates"` 로 돌리며 이벤트를 내고, 해설을 `llm.stream()` 으로 흘려보낸다 |
| | `planner.py` | 규칙 판별(`plan_by_rules`) · 조건 읽기(`parse_build_args`·`parse_search_args`·`parse_digest_args`) · LLM 판별 프롬프트와 JSON 검사 · 작업 목록 `TASKS` |
| | `graph.py` | `START → plan → (tier_build｜review｜digest｜briefing｜search) → END`, 무료 작업은 plan 에서 끝 |
| | `tools/` | `tier_builder` · `tier_review` · `digest` · `briefing` · `site_search` — 결과물 + LLM 용 사실 묶음 + LLM 없이 쓰는 해설 |
| | `catalog.py` · `prompts.py` · `llm.py` | 카탈로그·칸 이름 규칙 · 해설 프롬프트 · 모델 |
| models | `site.py` | `BoardPost` · `SiteNotice` |
| repository | `site_repository.py` | `posts()` · `post_stats()` · `notices()` |
| database | `site_api.py` | 백엔드 조회 API 연결(urllib, X-AI-Key) |

공용: `app/agent_loader.py`(패키지 올리기) · `app/main.py`(라우터 연결, `/health` 에 `agent`) · `app/config.py`(`agent_model`·`agent_summary_tokens`·`site_api_url`·`site_api_timeout`).

## 조건 읽기에서 신경 쓴 것

- 캐릭터 이름이 나온 자리 순서대로 문장을 끊어, 이름 뒤에 붙은 지시(이동·올리기/내리기·빼기)를 읽는다. "A랑 B를 1티어로"처럼 바로 이어진 이름은 뒤 지시를 물려받는다.
- 이동 지시에 쓰인 "2티어"를 범위("1~3티어")로 다시 읽지 않게 그 자리를 가린다.
- 커스텀 메이커 칸 이름은 프론트와 같은 규칙(`"<0부터 시작하는 등급 번호>_<세부등급>"`, 세부등급의 줄바꿈은 공백 하나)을 쓴다. 9티어는 `8_미묘사 인원들`.
- 검색어가 한 글자면 캐릭터 이름 찾기에만 쓴다(게시판·공지 본문을 한 글자로 뒤지면 "종류" 같은 말에 다 걸린다).

## 실측 (로컬, RTX 4070 SUPER 12GB, `gemma4:e4b`, 2026-11-12)

| 요청 | 판별 | 결과물 | 첫 글자 | 전체 |
|---|---|---|---|---|
| "1~3티어 캐릭터로 티어표 만들어줘. 츠루기 시노부는 2티어로 옮기고 우류 타츠오미는 빼줘" | 규칙 | 0.07초 | 0.47초 | 5.5초 |
| "강한 애들만 모아서 표 하나 짜줄래" | LLM(0.86초) → 1~2티어 | 0.86초 | 1.06초 | 4.5초 |
| "내 포인트랑 출석 브리핑해줘" | 규칙 | 0.03초 | 0.21초 | 2.7초 |
| "요즘 인기 있는 티어표랑 최근 공지 정리해줘"(백엔드 경유) | 규칙 | 0.09초 | 0.51초 | 4.9초 |
| "이름에 류가 들어가는 캐릭터 찾아줘"(백엔드 경유) | 규칙 | 0.06초 | — | 0.06초 |
| "오늘 저녁 뭐 먹지" | LLM → 해당 없음(무료 안내) | — | — | 0.65초 |

해설은 도구가 준 사실 안에서 썼고(인원 수·옮긴 캐릭터·공지 제목이 결과물과 일치), 지어낸 캐릭터나 기능은 없었다.

## 찾아 고친 것

- 예전 테스트 `test_layer_folders_exist` 가 "Agent-Bot 에 파이썬 코드가 없어야 한다"를 검사하고 있었다 → 층마다 `__init__.py` 가 있는지 검사하도록 바꿨다.
- 검색어 정리 순서: 군말을 먼저 빼면 "검색해줘" 에서 "해줘"가 남았다 → 작업을 가리키는 말을 먼저 떼고 군말을 뺀다.
- 한 글자 검색어 "류"로 공지 본문을 찾으니 5건이 걸렸다 → 글 검색은 2글자부터.
- LLM 이 "해당 없음"으로 판단해도 `via` 가 `rule` 로 나갔다 → `llm` 으로 표시.

## 테스트

`tests/test_agent_bot.py` 31개(칸 이름 규칙 · 규칙 판별 10종 · 조건 읽기 · 도구 5개 · 이벤트 순서 · AI OFF · LLM 판별 · 해설 중단 시 reset · HTTP). 전체 85개 통과.
`tests/test_knowledge_sync.py::test_agent_bot_costs_and_limits` 가 요금·한도·작업 이름을 지식 문서와 대조한다.

## 남은 일 · 주의

- **운영 서버 반영 전.** 운영은 CPU(약 6토큰/초)라 해설 260토큰이면 40초를 넘긴다. `AGENT_SUMMARY_TOKENS` 를 120 정도로 줄이는 것을 권한다(결과물은 그와 무관하게 바로 나온다).
- 서버 nginx 에 `/api/ai/agent/run` location(버퍼링 끔)을 손으로 추가해야 스트림이 모이지 않고 흐른다.
- Cloudflare Pages 프록시(`functions/api/[[path]].js`)는 응답을 그대로 흘려보내는 구조라 바꾸지 않았다. 운영에서 실제로 조각조각 오는지는 확인하지 못했다.
- Claude API(`AI_LLM_PROVIDER=anthropic`)로는 돌려 보지 않았다.
- 로컬 `ai-service/.env` 의 `OLLAMA_MODEL` 은 `gemma4:12b` 다. 로컬에서도 운영과 같은 `gemma4:e4b` 로 보려면 그 값을 바꾼다(실측은 환경 변수로 `gemma4:e4b` 를 줘서 했다).
- 쓰기 대행(글·댓글 작성, 뽑기 실행)을 넣으려면 먼저 사람과 범위·한도를 정한다.
