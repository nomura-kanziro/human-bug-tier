"""KnowledgeVectorRepository — 지식 조각을 ChromaDB 에 넣고(sync) 비슷한 것을 찾는다(query).

service 는 벡터 DB 의 API 를 모르고 이 클래스의 메서드만 부른다.
- sync(): 지금 지식 조각 목록과 저장된 것을 id(내용 해시)로 비교해 **새 조각만 임베딩해 넣고, 없어진 조각은 지운다.**
  지식 문서를 고치지 않았다면 임베딩을 하나도 다시 만들지 않는다(재시작이 빠르다).
- query(): 질문 벡터와 가장 가까운 조각 k 개를 (조각, 유사도)로 돌려준다. 유사도 = 1 - 코사인 거리(1에 가까울수록 비슷).
"""
from __future__ import annotations

from typing import Callable, Sequence

from ..database import ChromaStore
from ..models import KnowledgeChunk

EmbedDocuments = Callable[[list[str]], list[list[float]]]
BATCH = 64


class KnowledgeVectorRepository:
    def __init__(self, store: ChromaStore):
        self.store = store

    def count(self) -> int:
        return self.store.collection.count()

    def sync(self, chunks: Sequence[KnowledgeChunk], embed_documents: EmbedDocuments) -> dict[str, int]:
        col = self.store.collection
        wanted = {c.id: c for c in chunks}
        have = set(col.get(include=[])["ids"])
        stale = sorted(have - wanted.keys())
        fresh = [wanted[i] for i in wanted if i not in have]

        if stale:
            col.delete(ids=stale)
        for start in range(0, len(fresh), BATCH):
            part = fresh[start:start + BATCH]
            vectors = embed_documents([c.text for c in part])
            col.upsert(
                ids=[c.id for c in part],
                embeddings=vectors,
                documents=[c.text for c in part],
                metadatas=[c.metadata or None for c in part],
            )
        return {"added": len(fresh), "removed": len(stale), "total": len(wanted)}

    def query(self, embedding: list[float], k: int) -> list[tuple[KnowledgeChunk, float]]:
        col = self.store.collection
        if col.count() == 0:
            return []
        res = col.query(query_embeddings=[embedding], n_results=min(k, col.count()),
                        include=["documents", "metadatas", "distances"])
        out = []
        for cid, text, meta, dist in zip(res["ids"][0], res["documents"][0], res["metadatas"][0], res["distances"][0]):
            out.append((KnowledgeChunk(id=cid, text=text, metadata=dict(meta or {})), 1.0 - float(dist)))
        return out
