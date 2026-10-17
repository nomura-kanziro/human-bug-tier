"""가이드 전용 챗봇 "휴버봇"(guidans_Chat) — 사이트 이용법·티어표를 사이트 지식(RAG)으로 답한다.

챗봇 폴더는 같은 6개 층으로 이루어진다(호출은 router → service → repository → database 한 방향):
  schema/      요청·응답 JSON 모양(pydantic)
  router/      HTTP 라우터(GET /questions · POST /chat · POST /reload)
  service/     업무 로직 — chat_service(진입) · knowledge(RAG) · graph(LangGraph) · prompts · llm · questions
  models/      Oracle 테이블 한 행의 모양(아직 없음 — 대화 비저장)
  repository/  Oracle SQL 실행 도우미
  database/    Oracle 연결(python-oracledb). ai-service 는 MongoDB 를 쓰지 않는다.
공용 설정(config.py)·키 검사(deps.py)·FastAPI 진입점(main.py)은 app/ 에 있다. 에이전트 봇은 ../Agent-Bot/ (아직 계획 단계).
"""
