"""저장소 층 — 데이터 저장소와 말하는 곳. 서비스는 DB 의 API/SQL 을 모르고 여기 메서드만 부른다.

  knowledge_vector_repository.py  ChromaDB 에 지식 조각 넣기(sync)·비슷한 것 찾기(query) — 사용 중
  base.py                         Oracle SQL 실행 도우미(OracleRepository) — 쓰는 곳 아직 없음(대화 비저장)
"""
from .base import OracleRepository  # noqa: F401
from .knowledge_vector_repository import KnowledgeVectorRepository  # noqa: F401
