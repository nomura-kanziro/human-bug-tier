"""GuideChatService — 가이드 챗봇의 진입 서비스. 라우터는 이 클래스만 부른다.

지식 베이스와 LangGraph 그래프를 한 묶음으로 들고 있다가 reload() 때 통째로 바꾼다(요청 중에도 안전하게 교체).
DB 는 쓰지 않는다 — 대화는 저장하지 않는 정책이라 repository/database 층은 아직 연결하지 않았다.
"""
from __future__ import annotations

import logging
import threading

from ...config import Settings
from ..schema import ChatRequest, ChatResponse
from .graph import build_graph
from .knowledge import KnowledgeBase, build_knowledge_base
from .llm import make_llm
from .questions import random_questions

log = logging.getLogger("ai-service.guidans_chat")


class GuideChatService:
    def __init__(self, settings: Settings):
        self.settings = settings
        self._lock = threading.Lock()
        self.kb: KnowledgeBase | None = None
        self._graph = None
        self.reload()

    def reload(self) -> None:
        s = self.settings
        kb = build_knowledge_base(s.knowledge_dir, s.tiers_json, k=s.top_k)
        graph = build_graph(kb, make_llm(s), top_k=s.top_k, history_turns=s.history_turns)
        with self._lock:
            self.kb, self._graph = kb, graph
        log.info("지식 베이스 로드: 문서 %d개, 캐릭터 %d명, LLM %s", len(kb.documents), len(kb.characters.characters),
                 s.model if s.llm_enabled else "없음(fallback)")

    def stats(self) -> dict:
        kb = self.kb
        return {
            "documents": len(kb.documents) if kb else 0,
            "characters": len(kb.characters.characters) if kb else 0,
            "llm": self.settings.llm_enabled,
            "model": self.settings.model if self.settings.llm_enabled else None,
        }

    def questions(self, count: int = 3) -> list[str]:
        return random_questions(self.kb, count)

    def ask(self, body: ChatRequest) -> ChatResponse:
        """질문 하나를 처리한다(LLM 호출이 블로킹이라 라우터가 스레드풀에서 부른다)."""
        state = {"question": body.message.strip(), "history": [t.model_dump() for t in body.history]}
        with self._lock:
            graph = self._graph
        result = graph.invoke(state)
        return ChatResponse(
            answer=result.get("answer", ""),
            mode=result.get("mode", "fallback"),
            sources=result.get("sources", []),
            characters=[{"name": c.plain_name, "tier": c.tier, "grade": c.grade} for c in result.get("characters", [])],
        )
