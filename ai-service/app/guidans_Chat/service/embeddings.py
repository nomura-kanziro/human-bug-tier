"""임베딩 — Ollama 의 bge-m3(다국어, 1024차원). 한국어 질문과 한국어 지식 문서를 같은 벡터 공간에 올린다.

Ollama 가 꺼져 있거나 모델이 없으면 호출이 예외를 낸다 — 부르는 쪽(retrieval.py / chat_service.py)이 잡아서
벡터 검색 없이 BM25 만으로 계속 동작한다.
"""
from __future__ import annotations

import re

from langchain_ollama import OllamaEmbeddings

from ...config import Settings


def keep_alive_seconds(value: str, default: int = 1800) -> int:
    """'30m' · '2h' · '90s' · '600' → 초. OllamaEmbeddings 의 keep_alive 는 정수(초)만 받는다(ChatOllama 는 문자열도 됨)."""
    m = re.fullmatch(r"\s*(\d+)\s*([smh]?)\s*", str(value or ""))
    if not m:
        return default
    return int(m.group(1)) * {"": 1, "s": 1, "m": 60, "h": 3600}[m.group(2)]


def make_embeddings(settings: Settings) -> OllamaEmbeddings:
    return OllamaEmbeddings(
        model=settings.embed_model,
        base_url=settings.ollama_base_url,
        keep_alive=keep_alive_seconds(settings.ollama_keep_alive),
        client_kwargs={"timeout": 60},
    )
