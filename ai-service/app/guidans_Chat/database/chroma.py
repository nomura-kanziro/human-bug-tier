"""ChromaDB 연결 — 지식 조각의 **벡터 저장소**(임베딩 검색용).

- 로컬 파일 저장(`CHROMA_DIR`, 기본 ai-service/data/chroma, gitignore). 따로 서버를 띄우지 않는다(임베디드 모드).
- 임베딩은 이 모듈이 만들지 않는다 — 호출하는 쪽(service/embeddings.py, bge-m3)이 벡터를 만들어 넘긴다. 그래서 컬렉션에
  `embedding_function=None` 으로 두어 Chroma 가 기본 임베딩 모델(MiniLM)을 몰래 내려받는 일이 없다.
- 컬렉션 이름에 임베딩 모델 이름을 넣는다 → 모델을 바꾸면 새 컬렉션이 만들어져 차원이 다른 벡터가 섞이지 않는다.
- Oracle(SQL) 층과는 별개다: Oracle 은 표 형태의 업무 데이터, ChromaDB 는 검색용 벡터.
"""
from __future__ import annotations

import re
from pathlib import Path

# chromadb 는 ChromaStore 를 만들 때 불러온다 — 벡터 검색을 끄고 쓰는 서버(메모리 1GB 운영 VM)에는 설치하지 않아도 서비스가 뜨게 한다

COLLECTION_PREFIX = "guide_knowledge"


def collection_name(embed_model: str) -> str:
    safe = re.sub(r"[^A-Za-z0-9._-]+", "-", embed_model).strip("-._") or "model"
    return f"{COLLECTION_PREFIX}__{safe}"[:200]


class ChromaStore:
    """ChromaDB 클라이언트와 컬렉션 하나를 들고 있다. path=None 이면 메모리에만 둔다(테스트)."""

    def __init__(self, path: Path | None, embed_model: str):
        import chromadb
        from chromadb.config import Settings as ChromaSettings

        opts = ChromaSettings(anonymized_telemetry=False)
        if path is None:
            self.client = chromadb.EphemeralClient(settings=opts)
        else:
            path.mkdir(parents=True, exist_ok=True)
            self.client = chromadb.PersistentClient(path=str(path), settings=opts)
        self.name = collection_name(embed_model)
        self.collection = self.client.get_or_create_collection(
            name=self.name,
            embedding_function=None,
            metadata={"hnsw:space": "cosine"},   # 코사인 거리 → 유사도 = 1 - 거리
        )

    def reset(self) -> None:
        """컬렉션을 비우고 새로 만든다(테스트·전체 재색인용)."""
        self.client.delete_collection(self.name)
        self.collection = self.client.get_or_create_collection(
            name=self.name, embedding_function=None, metadata={"hnsw:space": "cosine"},
        )
