"""하이브리드 검색 — BM25(글자 일치) + ChromaDB 벡터 검색(의미 일치)을 RRF 로 합친다.

- BM25 는 고유명사(캐릭터·메뉴 이름)에 강하고, 벡터(bge-m3)는 말을 바꿔 물어도("출첵 몇 점?" = "출석체크 포인트") 찾는다.
- 합치는 방법: Reciprocal Rank Fusion — 각 검색의 순위 r 에 1/(60+r) 을 더해 높은 순으로 정렬. 점수 단위가 달라도 된다.
- 벡터 검색이 안 되면(Ollama 꺼짐·벡터 저장소 없음) 예외 없이 BM25 만으로 답한다. 한 번 실패하면 로그만 남긴다.
- "사이트와 관련 있는 질문인가"는 점수로 판단한다: BM25 최고 점수 또는 벡터 최고 유사도가 기준을 넘어야 한다(graph.py).
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Callable

from langchain_core.documents import Document

from ..models import KnowledgeChunk
from ..repository import KnowledgeVectorRepository
from .knowledge import KoreanBM25Retriever, strip_question_words

log = logging.getLogger("ai-service.guidans_chat.retrieval")

RRF_K = 60


@dataclass
class SearchResult:
    hits: list[tuple[Document, float]]          # (문서, 합친 점수) — 점수 높은 순
    lexical_best: float = 0.0                   # BM25 최고 점수
    lexical_clean: float = 0.0                  # 군더더기 말("어때·알려줘")을 뺀 질문의 BM25 최고 점수 — 벡터를 못 쓸 때의 관련성 판단용
    vector_best: float = 0.0                    # 벡터 최고 유사도(0~1, 벡터 검색을 못 했으면 0)
    used_vector: bool = False
    notes: list[str] = field(default_factory=list)


def _key(doc: Document) -> str:
    return KnowledgeChunk.make_id(doc.page_content, str(doc.metadata.get("title", "")))


class HybridSearcher:
    def __init__(
        self,
        bm25: KoreanBM25Retriever,
        vectors: KnowledgeVectorRepository | None = None,
        embed_query: Callable[[str], list[float]] | None = None,
        available: Callable[[], bool] | None = None,
    ):
        """available: 벡터 검색(임베딩)을 지금 시도해도 되는지(예: Ollama 가 켜져 있는지). False 면 시도조차 하지 않는다."""
        self.bm25 = bm25
        self.vectors = vectors
        self.embed_query = embed_query
        self.available = available
        self._warned = False

    @property
    def vector_ready(self) -> bool:
        return self.vectors is not None and self.embed_query is not None

    def _vector_hits(self, query: str, k: int) -> list[tuple[Document, float]]:
        if not self.vector_ready or (self.available is not None and not self.available()):
            return []
        try:
            found = self.vectors.query(self.embed_query(query), k)
        except Exception as err:  # noqa: BLE001 — 벡터 검색 실패는 BM25 로 대신한다
            if not self._warned:
                log.warning("벡터 검색 실패, BM25 로 대신함: %s", type(err).__name__)
                self._warned = True
            return []
        return [(Document(page_content=c.text, metadata=dict(c.metadata)), sim) for c, sim in found]

    def search(self, query: str, k: int = 5) -> SearchResult:
        pool = max(k * 2, 8)
        lexical = self.bm25.search(query, pool)
        vector = self._vector_hits(query, pool)
        clean_query = strip_question_words(query)
        clean_hits = self.bm25.search(clean_query, 1) if clean_query else []

        scores: dict[str, float] = {}
        docs: dict[str, Document] = {}
        for ranked in (lexical, vector):
            for rank, (doc, _) in enumerate(ranked, start=1):
                key = _key(doc)
                scores[key] = scores.get(key, 0.0) + 1.0 / (RRF_K + rank)
                docs.setdefault(key, doc)
        order = sorted(scores, key=scores.get, reverse=True)[:k]
        return SearchResult(
            hits=[(docs[key], scores[key]) for key in order],
            lexical_best=lexical[0][1] if lexical else 0.0,
            lexical_clean=clean_hits[0][1] if clean_hits else 0.0,
            vector_best=vector[0][1] if vector else 0.0,
            used_vector=bool(vector),
        )
