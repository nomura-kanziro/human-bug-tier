# 07. 에이전트 봇 엔진 선택 · 휴버토큰 기록

> 날짜: 2026-11-17 · 작성: nomura
> 기능 설명은 [`../features/agent-bot.md`](../features/agent-bot.md) "엔진과 요금" · "휴버토큰". 앞선 구현은 [06](./06-agent-bot-record.md).

## 관련 커밋

- `bb5a584` feat(agent-bot): 엔진 선택 도입 — 무료 엔진(Ollama) 하루 횟수 제한, Claude 엔진(모델·effort)과 AI 전용 포인트 휴버토큰·충전 신청
- `dc9f084` feat(agent-bot): 엔진·모델·effort 선택 UI, 휴버토큰 잔액·요금표·충전 신청 패널, 관리자 휴버토큰 관리 화면

## 요청

창시자: 작업이 중단되지 않게 · 무료(Ollama)는 하루 횟수 제한 · Claude API 는 모델(Haiku 4.5/5.5, Sonnet 5.0/5.5, Opus 5.0/5.5, Fable 5.1/5.2)과 effort(small·medium·high·extra high)를 골라 쓰고 AI 전용 포인트 "휴버토큰"으로 · 모델마다 한 번 사용 평균값 · 기본 500, 나머지는 후원·구매 · API 키는 `.env` 에(가능하면, 안 되면 안내).

## 판단

| 질문 | 결정 | 이유 |
|---|---|---|
| 행운 뽑기 포인트 차감(2·4·8P) | **없앴다** | 무료 엔진은 "하루 횟수", 유료는 "휴버토큰" 으로 지시됨. 두 지갑을 섞으면 경제가 꼬인다 |
| 무료 하루 횟수 | **20회** | 가이드 챗봇 IP 제한(10분 20회)·오늘의 행운 티어 하루 20회와 같은 감각. 서버 CPU 부담도 감당 가능 |
| 휴버토큰 값 | **1토큰 ≈ $0.001**, 평균 한 번 = 입력 2,500 + 출력 700 토큰 | 에이전트 봇 해설 프롬프트 실측 크기(사실 묶음 + 지시) 기준. 모델 API 가격표로 계산해 올림 |
| effort 배수 | small 0.6 · medium 1 · high 1.6 · extra high 2.4 | effort 가 생각·출력 토큰을 늘리는 정도를 단순화. 실측 정산이 아니라 "실행 전에 보이는 정액" |
| 정액 vs 실사용 정산 | **정액** | 실행 전에 값을 보여 줘야 한다는 요구. 실제 사용량과 차이는 평균값으로 흡수 |
| 기본 500 | 지갑이 처음 만들어질 때 1회 | 회원가입 시점이 아니라 처음 쓸 때 만든다(기존 회원도 받는다) |
| 충전 | **신청 → 관리자 승인** | 결제 대행(PG) 계약이 없다. 카드·계좌 번호를 받지 않는다. 후원은 기존 Buy Me a Coffee 링크 |
| 끊기지 않게 | 고른 엔진 → 무료 엔진 → 정해진 해설 | Claude 키가 없거나 API 가 실패·거절해도 결과와 해설이 나간다. Claude 가 못 쓰면 토큰은 환불 |
| LLM 을 안 쓰는 검색 | 토큰 0, 무료 횟수 1회 | 비용이 들지 않는 작업에 휴버토큰을 받지 않는다 |
| API 키 | `.env` 에 **자리만** 만들었다 | 키는 Anthropic 콘솔에서 사람이 발급해야 한다(AI 가 대신 만들 수 없음). 값은 채팅·커밋에 남기지 않는다 |

## 구성

- 백엔드: `utils/aiTokens.js`(요금표·지갑 처리), 모델 `AiTokenWallet`·`AiTokenLog`·`AiTokenOrder`, `controllers/aiTokenController.js`(내 지갑·충전 신청·관리자 승인/거절/직접 지급), `controllers/aiAgentController.js`(엔진 검사·plan 에서 받기·환불), 라우트 `/api/ai/tokens*` · `/api/admin/ai-tokens/*`.
- ai-service: `Agent-Bot/service/claude.py`(공식 `anthropic` SDK 스트리밍 — `output_config.effort`, Haiku 4.5 는 effort 미전송, 거절 대비 서버 쪽 fallbacks 를 쓰고 받지 않으면 없이 재시도, `thinking`·`temperature` 미전송), 요청 `engine`, plan 의 `uses_llm`·`engine`, done 의 `engine_used`. 애매한 말의 작업 분류도 고른 Claude 모델(가장 낮은 effort)로, 실패하면 무료 엔진으로.
- 화면: `AgentBotPanels.jsx`(EnginePicker · TokenShop), `AgentBot.jsx`·`AgentBotContext.jsx`(잔액·남은 횟수·엔진 기억 `hbtAgentEngine`), 관리자 `AdminAiTokens.jsx`.
- 의존성: `anthropic==1.15.0` 을 `requirements.txt`·`requirements-prod.txt` 에 고정(langchain-anthropic 과 함께 설치되던 버전).

## 확인

| 확인 | 결과 |
|---|---|
| pytest | 93개 통과 — 가짜 Claude 클라이언트 8개(모델·effort 전달, Haiku 4.5 effort 없음, fallbacks, 실패 시 무료 엔진, 거절, 키 없음, 검색 토큰 0, 분류는 low effort), 요금표 백엔드↔ai-service 모델 목록 대조, 지식 문서 수치 대조 |
| 격리 서버 + 임시 회원 + 실제 `gemma4:e4b` | 무료 실행 → 남은 횟수 20→19 · Claude(Opus 5.5 · extra high, 키 없음) → 58토큰 차감 후 환불, 답은 무료 엔진이 이어서 씀 · 검색은 토큰 0 · 하루 한도 초과 429 · 구매 신청 승인 +1,000, 같은 신청 재승인 409 · 후원 신청은 토큰 수 없으면 400, 정하면 +2,500 · 회원 토큰으로 관리자 API 403 · 행운 포인트 변화 없음 |
| 화면(가짜 API + 헤드리스 크롬) | 엔진 탭 → Sonnet 5.5 · high = 20토큰 표시 → 실행 후 잔액 480 · 충전 패널 요금표·묶음·후원 신청 |
| 정리 | 임시 회원·지갑·원장·신청 삭제(남은 것 0) |

## 남은 일 · 주의

- **실제 Claude API 호출은 확인하지 못했다**(키 없음). 키를 넣은 뒤 Haiku 5.5 · small(1토큰)로 한 번, Fable 5.2 로 한 번 돌려 해설 품질·속도와 `fallbacks` 수락 여부를 확인한다.
- 운영 반영 전(`deploy.sh deploy`). 반영 후 서버 `shared/ai.env` 에 `ANTHROPIC_API_KEY` 를 **서버에서 직접** 입력한다(채팅·명령줄에 남기지 않음).
- 휴버토큰 정액은 평균값이라 긴 대화·큰 사실 묶음에서는 실제 비용이 더 클 수 있다. Anthropic 콘솔 사용량과 원장(`AiTokenLog` agent_run 합계)을 한 달 뒤 비교해 평균값을 다시 맞춘다.
- 모델 가격이 바뀌면 `utils/aiTokens.js` 의 base 와 지식 문서 08·09 를 같이 고친다(`pytest` 가 어긋남을 잡는다).
