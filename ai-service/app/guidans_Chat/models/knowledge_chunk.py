"""지식 조각(벡터 DB 의 한 행) — ChromaDB 컬렉션에 들어가는 문서 한 개의 모양.

Oracle 테이블 모델이 아니라 **벡터 저장소(ChromaDB)** 용이다. 내용이 같으면 id 도 같아서(내용 해시) 지식 문서를 고쳐도
바뀐 조각만 다시 임베딩한다.
"""
from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class KnowledgeChunk:
    id: str                                   # 내용 해시(같은 내용 = 같은 id)
    text: str                                 # 임베딩·검색 대상 본문([제목] 포함)
    metadata: dict[str, Any] = field(default_factory=dict)   # source · title · kind · tier(숫자, 있을 때만)

    @staticmethod
    def make_id(text: str, title: str = "") -> str:
        return hashlib.sha1(f"{title}\n{text}".encode("utf-8")).hexdigest()[:32]

    @classmethod
    def from_parts(cls, text: str, metadata: dict[str, Any]) -> "KnowledgeChunk":
        # Chroma 메타데이터는 str·int·float·bool 만 받는다 — None 은 뺀다
        clean = {k: v for k, v in metadata.items() if isinstance(v, (str, int, float, bool))}
        return cls(id=cls.make_id(text, str(clean.get("title", ""))), text=text, metadata=clean)
