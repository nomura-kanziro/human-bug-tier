"""가이드 전용 챗봇 "휴버봇"(guidans_Chat) — 사이트 이용법·티어표를 사이트 지식(RAG)으로 답한다.

이 폴더에 가이드 챗봇의 기능이 전부 들어 있다:
  knowledge.py  지식 베이스(마크다운 + tiers.json → Document, 한국어 BM25 검색기, 캐릭터 이름 색인)
  graph.py      LangGraph 질문 처리 흐름(analyze → retrieve → generate / greet / out_of_scope)
  prompts.py    시스템 프롬프트·근거 블록
  llm.py        Claude(LangChain ChatAnthropic) 생성
  questions.py  랜덤 추천 질문 3개
공용 설정(config.py)과 FastAPI 진입점(main.py)은 app/ 에 있다. 에이전트 봇은 ../Agent-Bot/ (아직 계획 단계).
"""
