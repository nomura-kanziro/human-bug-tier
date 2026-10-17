"""AI 서비스 테스트 — 실제 LLM 은 부르지 않는다(가짜 모델 / 키 없음)."""
from __future__ import annotations

import os
import random

import pytest
from fastapi.testclient import TestClient
from langchain_core.language_models.fake_chat_models import FakeListChatModel

from app.config import load_settings
from app.guidans_Chat.service.graph import build_graph
from app.guidans_Chat.service.knowledge import build_knowledge_base
from app.guidans_Chat.service.questions import random_questions


@pytest.fixture(scope="module")
def kb():
    s = load_settings()
    return build_knowledge_base(s.knowledge_dir, s.tiers_json)


def test_knowledge_loaded(kb):
    assert len(kb.characters.characters) > 300
    assert sorted(kb.tiers) == list(range(1, 10))
    titles = {d.metadata["title"] for d in kb.documents}
    assert "회원 · 마이페이지 · 출석체크 › 출석체크" in titles


def test_character_lookup_full_and_partial(kb):
    assert [c.plain_name for c in kb.characters.find("츠루기 시노부는 몇 티어야?")] == ["츠루기 시노부"]
    # 이름 일부(단어 단위) — 다른 캐릭터 '요시나가 타츠오'에 걸리면 안 된다
    names = [c.plain_name for c in kb.characters.find("타츠오미 티어")]
    assert names == ["우류 타츠오미"]
    assert kb.characters.find("오늘 날씨 어때") == []


def test_retrieval_finds_rules(kb):
    top = kb.retriever.search("출석체크 7일차 포인트", 1)[0][0]
    assert "50" in top.page_content and top.metadata["source"] == "07-account-mypage.md"
    top = kb.retriever.search("포커 족보 배수", 1)[0][0]
    assert "로얄 스트레이트 플러시" in top.page_content


def test_graph_fallback_without_llm(kb):
    g = build_graph(kb, None)
    r = g.invoke({"question": "츠루기 시노부는 몇 티어야?", "history": []})
    assert r["mode"] == "fallback" and "1티어" in r["answer"]
    r = g.invoke({"question": "3티어에는 누가 있어?", "history": []})
    assert r["docs"][0].metadata.get("tier") == 3
    r = g.invoke({"question": "안녕", "history": []})
    assert r["mode"] == "fixed"
    r = g.invoke({"question": "비트코인 시세 알려줘", "history": []})
    assert r["mode"] == "fixed" and "문의하기" in r["answer"]


def test_graph_llm_path_and_failure(kb):
    g = build_graph(kb, FakeListChatModel(responses=["츠루기 시노부는 1티어 갑급이에요."]))
    r = g.invoke({"question": "츠루기 시노부 티어?", "history": [{"role": "user", "content": "안녕"}, {"role": "assistant", "content": "안녕하세요"}]})
    assert r["mode"] == "llm" and "1티어" in r["answer"]

    class Broken(FakeListChatModel):
        def _call(self, *a, **k):
            raise RuntimeError("down")

    r = build_graph(kb, Broken(responses=["x"])).invoke({"question": "출석체크 포인트", "history": []})
    assert r["mode"] == "fallback" and "출석" in r["answer"]


def test_random_questions(kb):
    qs = random_questions(kb, 3, random.Random(7))
    assert len(qs) == 3 and len(set(qs)) == 3
    assert any("몇 티어야" in q for q in qs) and any("티어" in q and "몇" not in q for q in qs)


def test_api(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "")
    monkeypatch.setenv("AI_SERVICE_KEY", "test-key")
    from app import main

    with TestClient(main.app) as client:
        assert client.get("/health").json()["llm"] is False
        assert client.get("/questions").status_code == 401
        h = {"X-AI-Key": "test-key"}
        assert len(client.get("/questions", headers=h).json()["questions"]) == 3
        res = client.post("/chat", json={"message": "츠루기 시노부는 몇 티어야?"}, headers=h).json()
        assert res["characters"][0]["tier"] == 1
        assert client.post("/chat", json={"message": "x" * 501}, headers=h).status_code == 422
    os.environ.pop("AI_SERVICE_KEY", None)


def test_layer_folders_exist():
    """챗봇 폴더마다 schema·router·service·models·repository·database 층이 있다(Agent-Bot 은 README 자리만)."""
    from pathlib import Path

    app_dir = Path(__file__).resolve().parent.parent / "app"
    layers = ["schema", "router", "service", "models", "repository", "database"]
    for bot in ("guidans_Chat", "Agent-Bot"):
        for layer in layers:
            assert (app_dir / bot / layer).is_dir(), f"{bot}/{layer}"
    assert not list((app_dir / "Agent-Bot").rglob("*.py")), "Agent-Bot 은 계획 단계 — 파이썬 코드가 없어야 한다"
