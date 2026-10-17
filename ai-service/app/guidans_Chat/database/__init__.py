"""데이터베이스 층 — 연결만 맡는다.

  oracle.py  Oracle SQL 연결(python-oracledb). ai-service 는 MongoDB 를 쓰지 않는다. 지금은 대화를 저장하지 않아 쓰는 곳이 없다.
  chroma.py  ChromaDB 벡터 저장소 연결 — 지식 조각의 임베딩 검색용(사용 중).
"""
from .chroma import ChromaStore, collection_name  # noqa: F401
from .oracle import OracleDatabase, OracleNotConfigured, OracleSettings  # noqa: F401
