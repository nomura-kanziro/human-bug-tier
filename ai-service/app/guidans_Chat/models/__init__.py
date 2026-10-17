"""모델 층 — 저장소에 들어가는 한 행의 모양(데이터클래스). 요청·응답 JSON 모양은 ../schema/ 에 둔다.

지금 있는 모델
  KnowledgeChunk  벡터 DB(ChromaDB)에 들어가는 지식 조각 하나 — 사이트 지식 문서·티어표를 잘라 임베딩해 둔 것

Oracle 테이블 모델은 아직 없다(대화를 저장하지 않는 정책). 저장이 필요해지면 테이블마다 파일 하나로 추가하고 DDL 도 기록에 남긴다.
"""
from .knowledge_chunk import KnowledgeChunk  # noqa: F401
