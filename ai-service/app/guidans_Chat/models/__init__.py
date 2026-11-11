"""모델 층 — 저장소에 들어가는 한 행의 모양(데이터클래스). 요청·응답 JSON 모양은 ../schema/ 에 둔다.

지금 있는 모델
  KnowledgeChunk  벡터 DB(ChromaDB)에 들어가는 지식 조각 하나 — 사이트 지식 문서·티어표를 잘라 임베딩해 둔 것
  ChatStat        Oracle HBT_CHAT_STAT 한 행 — 질문 처리 통계(내용 없음). AI_STORE_STATS=true 일 때만
  ChatLog         Oracle HBT_CHAT_LOG 한 행 — 질문·답변 원문. AI_STORE_CHAT=true 일 때만(기본 꺼짐)

Oracle 테이블 모델은 파일 하나에 데이터클래스와 DDL(CREATE TABLE) 을 같이 둔다. 테이블은 scripts/init_oracle.py 가 만든다.
"""
from . import chat_log, chat_stat  # noqa: F401
from .chat_log import ChatLog  # noqa: F401
from .chat_stat import ChatStat  # noqa: F401
from .knowledge_chunk import KnowledgeChunk  # noqa: F401

# init_oracle.py 가 순서대로 만드는 Oracle 테이블 목록: (테이블 이름, DDL 문장들)
ORACLE_TABLES = (
    (chat_stat.TABLE, chat_stat.DDL),
    (chat_log.TABLE, chat_log.DDL),
)
