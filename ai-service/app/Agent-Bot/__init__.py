"""휴버대 에이전트 봇 — 가이드 챗봇(guidans_Chat)보다 한 단계 더 "일을 해 주는" 봇.

가이드 챗봇은 사이트 지식 문서로 "설명"만 한다. 에이전트 봇은 요청을 작업으로 바꿔 **도구를 실행**하고 결과물을 돌려준다:
  tier_build  프롬프트로 커스텀 티어표 초안 만들기(공식 티어표를 바탕으로 범위·이동·제외·랜덤)   [무거움]
  review      지금 커스텀 메이커에 만들고 있는 티어표를 공식 티어표와 비교 분석               [보통]
  digest      게시판 인기·최신 티어표 / 최근 공지를 모아 요약                                   [보통]
  briefing    내 포인트·출석·뽑기·게시글 현황 브리핑                                           [보통]
  search      캐릭터·게시판·공지 통합 검색                                                     [가벼움]
이용법 질문(가이드 챗봇과 겹치는 일)은 하지 않고 `/ai` 로 안내한다(무료).

폴더 이름이 `Agent-Bot`(하이픈)이라 `app/agent_loader.py` 가 `app.agent_bot` 패키지로 올린다.
층은 가이드 챗봇과 같다: schema · router · service · models · repository · database (router → service → repository → database).
이 봇은 MongoDB 도 Oracle 도 직접 쓰지 않는다 — 게시판·공지는 사이트 백엔드(Express)의 조회 API 로 읽고(`database/site_api.py`),
포인트 차감·내 정보 조회는 Express(`backend/routes/aiRoutes.js`)가 맡는다. 대화 내용은 어디에도 저장하지 않는다.
"""
