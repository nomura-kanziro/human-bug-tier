"""벡터(ChromaDB) 층 테스트 — 실제 Ollama 없이 가짜 임베딩 + 메모리 ChromaDB 로 확인한다.
(실제 bge-m3·gemma4 호출은 시험 스크립트로 따로 확인했다 — RDMD/ai 기록 참고)"""
from __future__ import annotations

import hashlib
import math

import pytest

from app.config import load_settings
from app.guidans_Chat.database import ChromaStore, collection_name
from app.guidans_Chat.models import KnowledgeChunk
from app.guidans_Chat.repository import KnowledgeVectorRepository
from app.guidans_Chat.service.chat_service import GuideChatService
from app.guidans_Chat.service.knowledge import build_knowledge_base
from app.guidans_Chat.service.retrieval import HybridSearcher
from app.guidans_Chat.schema import ChatRequest


def vec(text: str, dims: int = 64) -> list[float]:
    """글자 2-gram 을 해시해 만든 가짜 임베딩 — 글자가 겹치는 문장끼리 가깝다."""
    v = [0.0] * dims
    t = "".join(text.split())
    for i in range(max(1, len(t) - 1)):
        v[int(hashlib.md5(t[i:i + 2].encode()).hexdigest(), 16) % dims] += 1.0
    n = math.sqrt(sum(x * x for x in v)) or 1.0
    return [x / n for x in v]


class FakeEmbeddings:
    def __init__(self):
        self.document_calls = 0

    def embed_documents(self, texts):
        self.document_calls += len(texts)
        return [vec(t) for t in texts]

    def embed_query(self, text):
        return vec(text)


class BrokenEmbeddings(FakeEmbeddings):
    def embed_query(self, text):
        raise ConnectionError("ollama down")


@pytest.fixture()
def store():
    s = ChromaStore(None, "fake-test")
    s.reset()
    return s


def chunks():
    return [
        KnowledgeChunk.from_parts("[출석체크] 로그인하면 하루에 한 번 포인트를 받아요", {"title": "출석체크", "kind": "guide"}),
        KnowledgeChunk.from_parts("[포커] 족보와 배수로 딜러와 겨뤄요", {"title": "포커", "kind": "guide", "tier": 3}),
        KnowledgeChunk.from_parts("[닉네임] 7일에 한 번만 바꿀 수 있어요", {"title": "닉네임", "kind": "guide"}),
    ]


def test_collection_name_includes_model():
    assert collection_name("bge-m3") == "guide_knowledge__bge-m3"
    assert collection_name("a b/c") == "guide_knowledge__a-b-c"


def test_chunk_id_is_content_hash_and_metadata_cleaned():
    a = KnowledgeChunk.from_parts("본문", {"title": "t", "tier": None, "n": 3})
    b = KnowledgeChunk.from_parts("본문", {"title": "t"})
    assert a.id == b.id and "tier" not in a.metadata and a.metadata["n"] == 3
    assert KnowledgeChunk.from_parts("다른 본문", {"title": "t"}).id != a.id


def test_sync_adds_only_new_and_removes_stale(store):
    repo, emb = KnowledgeVectorRepository(store), FakeEmbeddings()
    cs = chunks()
    assert repo.sync(cs, emb.embed_documents) == {"added": 3, "removed": 0, "total": 3}
    assert repo.sync(cs, emb.embed_documents) == {"added": 0, "removed": 0, "total": 3}   # 안 바뀌면 다시 임베딩 안 함
    assert emb.document_calls == 3
    changed = cs[:2] + [KnowledgeChunk.from_parts("[닉네임] 14일에 한 번", {"title": "닉네임", "kind": "guide"})]
    assert repo.sync(changed, emb.embed_documents) == {"added": 1, "removed": 1, "total": 3}
    assert repo.count() == 3


def test_query_returns_closest_with_similarity(store):
    repo, emb = KnowledgeVectorRepository(store), FakeEmbeddings()
    cs = chunks()
    repo.sync(cs, emb.embed_documents)
    top, sim = repo.query(emb.embed_query(cs[1].text), 2)[0]
    assert top.id == cs[1].id and sim > 0.99 and top.metadata["tier"] == 3


def test_hybrid_searcher_fuses_and_survives_vector_failure(store):
    s = load_settings()
    kb = build_knowledge_base(s.knowledge_dir, s.tiers_json)
    repo, emb = KnowledgeVectorRepository(store), FakeEmbeddings()
    repo.sync([KnowledgeChunk.from_parts(d.page_content, d.metadata) for d in kb.documents], emb.embed_documents)

    hybrid = HybridSearcher(kb.retriever, repo, emb.embed_query)
    r = hybrid.search("출석체크 포인트", 5)
    assert r.used_vector and r.vector_best > 0 and r.lexical_best > 0 and len(r.hits) == 5

    broken = HybridSearcher(kb.retriever, repo, BrokenEmbeddings().embed_query)
    r2 = broken.search("출석체크 포인트", 5)
    assert not r2.used_vector and r2.vector_best == 0 and r2.hits          # BM25 로 계속
    assert not HybridSearcher(kb.retriever).search("포커", 3).used_vector     # 벡터 저장소 없음


def test_service_builds_vector_index_and_degrades_gracefully(monkeypatch, store):
    monkeypatch.setenv("AI_LLM_PROVIDER", "none")
    s = load_settings()
    svc = GuideChatService(s, store=store, embeddings=FakeEmbeddings())
    assert svc.vector_info["ready"] and svc.vector_info["chunks"] == len(svc.kb.documents)
    assert svc.ask(ChatRequest(message="츠루기 시노부는 몇 티어야?")).characters[0]["tier"] == 1
    assert svc.stats()["vector"]["ready"] is True

    class FailingEmbeddings(FakeEmbeddings):
        def embed_documents(self, texts):
            raise ConnectionError("ollama down")

    store.reset()
    svc2 = GuideChatService(s, store=store, embeddings=FailingEmbeddings())
    assert svc2.vector_info["ready"] is False and svc2.vector_info["error"] == "ConnectionError"
    assert svc2.ask(ChatRequest(message="출석체크 포인트")).mode == "fallback"      # BM25 문서 답으로 계속


def test_vector_disabled_by_setting(monkeypatch, store):
    monkeypatch.setenv("AI_LLM_PROVIDER", "none")
    monkeypatch.setenv("AI_VECTOR_ENABLED", "false")
    svc = GuideChatService(load_settings(), store=store, embeddings=FakeEmbeddings())
    assert svc.vector_info == {"enabled": False, "ready": False, "embed_model": "bge-m3"}


def test_keep_alive_seconds_and_real_embeddings_object_builds():
    """OllamaEmbeddings 는 keep_alive 를 정수(초)만 받는다 — 설정값 '30m' 을 변환해 넘기지 않으면 만들 때 오류가 난다."""
    from app.guidans_Chat.service.embeddings import keep_alive_seconds, make_embeddings

    assert keep_alive_seconds("30m") == 1800 and keep_alive_seconds("2h") == 7200
    assert keep_alive_seconds("90s") == 90 and keep_alive_seconds("600") == 600 and keep_alive_seconds("abc") == 1800
    assert make_embeddings(load_settings()).keep_alive == 1800     # 실제 객체 생성(네트워크 호출 없음)
