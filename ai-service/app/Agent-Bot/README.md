# Agent-Bot (에이전트 봇) — 계획 단계, 아직 구현 없음

> 이 폴더는 **자리만 잡아 둔 것**이다. 지금은 방치한다(창시자 지시: "아직 계획 단계라 폴더만").
> 사이트 공지 "앞으로의 계획"의 **에이전트 봇** 전용 챗봇이 들어올 자리다.

- 가이드 전용 챗봇은 [`../guidans_Chat/`](../guidans_Chat/__init__.py) 에 있다(사이트 이용법·티어표 안내, 도구 호출 없음).
- 이 폴더에는 **에이전트 봇 관련 코드만** 둔다. 가이드 챗봇 코드와 섞지 않는다.
- 가이드 챗봇과 **같은 6개 층**을 둔다: `schema/` · `router/` · `service/` · `models/` · `repository/` · `database/` (지금은 각 폴더에 README 만). 호출은 router → service → repository → database 한 방향.
- DB 는 **MongoDB 를 쓰지 않고 Oracle SQL 만** 쓴다(`../guidans_Chat/database/`·`repository/` 의 연결·SQL 도우미를 참고).
- 폴더 이름에 하이픈(`-`)이 있어 이대로는 파이썬 패키지로 `import` 할 수 없다. 구현을 시작할 때 `agent_bot` 같은 임포트 가능한 이름(또는 `importlib` 로 로드)으로 정하고 이 README 를 갱신한다.
- 구현 전에 사람과 정할 것(예): 하는 일(도구 호출 범위 — 내 포인트·출석 조회 등), 로그인 회원 전용 여부, 대화 저장 DB·보관 기간·탈퇴 시 삭제, 월 사용료 상한.
