"""데이터베이스 층 — 연결만 맡는다.

  oracle.py  Oracle SQL 연결(python-oracledb). ai-service 는 MongoDB 를 쓰지 않는다. AI_STORE_STATS / AI_STORE_CHAT 이 켜졌을 때만 쓴다(기본 꺼짐).
  migrate.py Oracle 테이블 만들기(ensure_tables)·연결 확인(ping) — scripts/init_oracle.py 가 부른다.
  chroma.py  ChromaDB 벡터 저장소 연결 — 지식 조각의 임베딩 검색용(사용 중).
"""
from .chroma import ChromaStore, collection_name  # noqa: F401
from .oracle import OracleDatabase, OracleNotConfigured, OracleSettings  # noqa: F401
from .migrate import ensure_tables, ping  # noqa: F401
