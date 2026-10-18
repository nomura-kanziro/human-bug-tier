"""AI 서버(Ollama) OFF 일 때 — 지식 문서에서 그대로 답하는지, ON/OFF 상태가 맞게 나오는지."""
from __future__ import annotations

import json
import socket
import threading
from dataclasses import replace
from http.server import BaseHTTPRequestHandler, HTTPServer

import pytest
from langchain_core.documents import Document
from langchain_core.language_models.fake_chat_models import FakeListChatModel

from app.config import load_settings
from app.guidans_Chat.service.doc_answer import HEADER, NOT_FOUND, build_doc_answer, pick_lines
from app.guidans_Chat.service.graph import build_graph
from app.guidans_Chat.service.knowledge import build_knowledge_base, strip_question_words
from app.guidans_Chat.service.llm_status import LlmStatus
from app.guidans_Chat.service.retrieval import HybridSearcher


def free_port() -> int:
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    port = s.getsockname()[1]
    s.close()
    return port


class FakeOllama:
    """/api/tags 만 답하는 가짜 Ollama 서버(모델 목록)."""

    def __init__(self, models):
        class Handler(BaseHTTPRequestHandler):
            def do_GET(self):
                body = json.dumps({"models": [{"name": m} for m in models]}).encode()
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(body)

            def log_message(self, *args):
                pass

        self.server = HTTPServer(("127.0.0.1", 0), Handler)
        self.url = f"http://127.0.0.1:{self.server.server_port}"
        threading.Thread(target=self.server.serve_forever, daemon=True).start()

    def close(self):
        self.server.shutdown()


@pytest.fixture(scope="module")
def kb():
    s = load_settings()
    return build_knowledge_base(s.knowledge_dir, s.tiers_json)


def test_status_off_when_ollama_unreachable():
    s = replace(load_settings(), llm_provider="ollama", ollama_base_url=f"http://127.0.0.1:{free_port()}")
    st = LlmStatus(s).get()
    assert st.on is False and st.reason == "unreachable" and st.label == "off"


def test_status_on_and_model_missing():
    fake = FakeOllama(["gemma4:12b", "bge-m3:latest"])
    try:
        s = replace(load_settings(), llm_provider="ollama", ollama_base_url=fake.url, ollama_model="gemma4:12b")
        assert LlmStatus(s).get().on is True
        missing = LlmStatus(replace(s, ollama_model="qwen3:8b")).get()
        assert missing.on is False and missing.reason == "model_missing"
    finally:
        fake.close()


def test_status_for_other_providers():
    base = load_settings()
    assert LlmStatus(replace(base, llm_provider="none")).get().reason == "disabled"
    assert LlmStatus(replace(base, llm_provider="anthropic", anthropic_api_key="")).get().reason == "no_key"
    assert LlmStatus(replace(base, llm_provider="anthropic", anthropic_api_key="x")).get().on is True


def test_status_is_cached_and_failed_flips_to_off():
    fake = FakeOllama(["gemma4:12b"])
    s = replace(load_settings(), llm_provider="ollama", ollama_base_url=fake.url, ollama_model="gemma4:12b")
    st = LlmStatus(s)
    assert st.is_on() is True
    fake.close()                       # 서버가 꺼져도 캐시 동안은 ON 으로 기억
    assert st.is_on() is True
    st.failed()                        # LLM 호출이 실패하면 바로 OFF
    assert st.get().on is False
    st.succeeded()
    assert st.get().on is True


def test_graph_skips_llm_when_off_and_answers_from_knowledge(kb):
    class MustNotCall(FakeListChatModel):
        def _call(self, *args, **kwargs):
            raise AssertionError("AI 서버 OFF 면 LLM 을 부르면 안 된다")

    class OffGate:
        def is_on(self):
            return False

        def failed(self):
            raise AssertionError("부르지 않았으니 실패도 없다")

        def succeeded(self):
            raise AssertionError("부르지 않았으니 성공도 없다")

    g = build_graph(kb, MustNotCall(responses=["x"]), gate=OffGate())
    r = g.invoke({"question": "닉네임은 언제 바꿀 수 있어?", "history": []})
    assert r["mode"] == "fallback" and HEADER in r["answer"]
    assert "7일에 한 번" in r["answer"]            # 지식 문서의 내용 그대로


def test_graph_marks_failed_when_llm_raises_and_ok_when_answers(kb):
    calls = []

    class Gate:
        def is_on(self):
            return True

        def failed(self):
            calls.append("failed")

        def succeeded(self):
            calls.append("ok")

    class Broken(FakeListChatModel):
        def _call(self, *args, **kwargs):
            raise RuntimeError("down")

    r = build_graph(kb, Broken(responses=["x"]), gate=Gate()).invoke({"question": "출석체크 포인트", "history": []})
    assert r["mode"] == "fallback" and calls == ["failed"]
    calls.clear()
    r = build_graph(kb, FakeListChatModel(responses=["네, 알려 드려요."]), gate=Gate()).invoke({"question": "출석체크 포인트", "history": []})
    assert r["mode"] == "llm" and calls == ["ok"]


def test_doc_answer_picks_relevant_lines_only():
    doc = Document(
        page_content="[행운 뽑기 › 오늘의 행운 티어]\n" + "\n".join([
            "캐릭터 1명을 뽑아 그 캐릭터의 티어만큼 포인트가 오르내립니다. " * 2,
            "- 로그인하지 않아도 뽑을 수 있지만 결과만 보여 주고 저장하지 않습니다.",
            "- 로그인하면 하루 최대 20회(한국 시간 자정에 초기화), 뽑기 사이 3분 대기가 있습니다.",
            "- 기록은 최근 5건만 보여 주고, 누적 횟수·최고 티어·포인트는 따로 계속 쌓입니다. " * 4,
        ]),
        metadata={"title": "행운 뽑기 › 오늘의 행운 티어", "kind": "guide"},
    )
    lines, best = pick_lines(doc, "하루에 몇 번 뽑을 수 있어? 대기 시간은?")
    assert best > 0 and any("20회" in ln for ln in lines)
    assert not any("누적 횟수" in ln for ln in lines)          # 관련 없는 줄은 뺀다


def test_doc_answer_shapes():
    assert build_doc_answer("x", [], []) == NOT_FOUND
    facts = build_doc_answer("츠루기 시노부", ["츠루기 시노부: 공식 티어표 1티어 갑급 2번째."], [])
    assert facts.startswith("• 츠루기") and "티어표" in facts and HEADER not in facts
    one = Document(page_content="[제목]\n내용 한 줄", metadata={"title": "문서 제목", "kind": "guide"})
    out = build_doc_answer("내용", [], [one])
    assert out.startswith(HEADER) and "▸ 문서 제목" in out and "내용 한 줄" in out


def test_strip_question_words():
    assert strip_question_words("오늘 날씨 어때?") == "날씨"
    assert strip_question_words("알려줘 어때") == ""
    assert "출석체크" in strip_question_words("출석체크 포인트는 어떻게 받아?")


def test_hybrid_does_not_try_vectors_when_unavailable(kb):
    tried = []

    class Repo:
        def query(self, emb, k):
            tried.append("query")
            return []

    def embed(q):
        tried.append("embed")
        return [0.0]

    h = HybridSearcher(kb.retriever, Repo(), embed, available=lambda: False)
    r = h.search("출석체크 포인트", 3)
    assert tried == [] and r.used_vector is False and r.hits and r.lexical_clean > 0


def test_offline_gate_uses_clean_lexical_score(kb):
    """벡터를 못 쓸 때: 군더더기 말만 겹치는 범위 밖 질문은 거절, 주제어가 겹치는 질문은 문서 답."""
    h = HybridSearcher(kb.retriever, None, None)
    g = build_graph(kb, None, searcher=h)
    assert g.invoke({"question": "오늘 날씨 어때?", "history": []})["mode"] == "fixed"
    assert g.invoke({"question": "대통령이 누구야?", "history": []})["mode"] == "fixed"
    r = g.invoke({"question": "출석체크 포인트는 어떻게 받아?", "history": []})
    assert r["mode"] == "fallback" and "출석" in r["answer"]


def test_status_endpoint_and_ai_field(monkeypatch):
    from fastapi.testclient import TestClient

    monkeypatch.setenv("AI_LLM_PROVIDER", "none")
    monkeypatch.setenv("AI_VECTOR_ENABLED", "false")
    monkeypatch.setenv("AI_SERVICE_KEY", "k")
    from app import main

    with TestClient(main.app) as client:
        h = {"X-AI-Key": "k"}
        assert client.get("/status").status_code == 401
        st = client.get("/status", headers=h).json()
        assert st["ai"] == "off" and st["reason"] == "disabled" and st["provider"] == "none" and st["documents"] > 0
        res = client.post("/chat", json={"message": "닉네임은 언제 바꿀 수 있어?"}, headers=h).json()
        assert res["ai"] == "off" and res["mode"] == "fallback" and "7일에 한 번" in res["answer"]
        assert client.get("/health").json()["ai"] == "off"
