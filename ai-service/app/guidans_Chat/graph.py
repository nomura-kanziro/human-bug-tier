"""질문 처리 흐름 — LangGraph StateGraph.

    START → analyze ─┬─(인사)──────────────→ greet ───────→ END
                     └─(그 외)→ retrieve ─┬─(근거 없음)→ out_of_scope → END
                                          └─(근거 있음)→ generate ───→ END

- analyze   : 질문 속 캐릭터 이름(CharacterIndex)·티어 번호("3티어")를 찾고 의도를 나눈다.
- retrieve  : BM25 검색(RAG) + 찾은 캐릭터의 "정확한 티어 정보" + 언급된 티어의 캐릭터 목록 문서를 모은다.
- generate  : LLM(Claude, LangChain ChatAnthropic)이 모은 근거만으로 답한다.
              API 키가 없거나 호출이 실패하면 근거 문서를 그대로 엮은 답(fallback)을 돌려준다.
- greet / out_of_scope : LLM 없이 정해진 문구로 답한다(비용 절약 + 사이트 밖 질문 차단).
"""
from __future__ import annotations

import logging
import re
from typing import Any, Literal, TypedDict

from langchain_core.documents import Document
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from langgraph.graph import END, START, StateGraph

from .knowledge import Character, KnowledgeBase
from .prompts import SYSTEM_PROMPT, build_context_block

log = logging.getLogger("ai-service.graph")

# BM25 점수가 이보다 낮고 캐릭터·티어 언급도 없으면 "사이트와 관계없는 질문"으로 본다
MIN_RELEVANCE = 10.0

_GREETING = re.compile(r"^\s*(안녕|하이|ㅎㅇ|hello|hi|반가워|헬로)[\s!~.?ㅎㅋ]*$", re.IGNORECASE)
_TIER_NUM = re.compile(r"([1-9])\s*(?:티어|등급|tier)", re.IGNORECASE)


class ChatState(TypedDict, total=False):
    question: str
    history: list[dict[str, str]]
    intent: Literal["greeting", "site"]
    characters: list[Character]
    tier_numbers: list[int]
    docs: list[Document]
    best_score: float
    answer: str
    mode: Literal["llm", "fallback", "fixed"]
    sources: list[str]


def build_graph(kb: KnowledgeBase, llm: BaseChatModel | None, *, top_k: int = 5, history_turns: int = 6):
    def analyze(state: ChatState) -> ChatState:
        q = state["question"]
        if _GREETING.match(q):
            return {"intent": "greeting", "characters": [], "tier_numbers": []}
        tiers = sorted({int(n) for n in _TIER_NUM.findall(q) if int(n) in kb.tiers})
        return {"intent": "site", "characters": kb.characters.find(q), "tier_numbers": tiers}

    def retrieve(state: ChatState) -> ChatState:
        q = state["question"]
        hits = kb.retriever.search(q, top_k)
        found = {c.plain_name for c in state.get("characters", [])}
        # 캐릭터를 찾았으면, 이름이 비슷해 걸린 다른 캐릭터 문서는 뺀다(혼동 방지)
        if found:
            hits = [(d, s) for d, s in hits
                    if d.metadata.get("kind") != "character" or d.metadata.get("title", "").rsplit(" › ", 1)[-1] in found]
        docs: list[Document] = [d for d, _ in hits]
        best = hits[0][1] if hits else 0.0
        # 언급된 티어의 전체 목록 문서를 앞에 둔다(BM25 는 "3티어에는 누가?" 같은 질문에 약하다)
        for t in state.get("tier_numbers", []):
            for d in kb.documents:
                if d.metadata.get("kind") == "tier" and d.metadata.get("tier") == t and d not in docs:
                    docs.insert(0, d)
        return {"docs": docs, "best_score": best}

    def route_after_retrieve(state: ChatState) -> str:
        if state.get("characters") or state.get("tier_numbers"):
            return "generate"
        return "generate" if state.get("best_score", 0) >= MIN_RELEVANCE else "out_of_scope"

    def greet(state: ChatState) -> ChatState:
        return {
            "answer": "안녕하세요! 휴버대 티어표 AI 도우미 휴버봇이에요. 티어표, 캐릭터 티어, 티어표 만들기, 행운 뽑기, 이벤트, 출석체크처럼 사이트에 관한 건 뭐든 물어보세요.",
            "mode": "fixed",
            "sources": [],
        }

    def out_of_scope(state: ChatState) -> ChatState:
        return {
            "answer": "그 질문은 사이트 정보에서 답을 찾지 못했어요. 저는 휴버대 티어표 사이트(티어표·캐릭터·커스텀 메이커·게시판·행운 뽑기·이벤트·회원 기능)에 관한 질문에 답할 수 있어요. 더 궁금한 점은 푸터의 \"문의하기\"로 남겨 주세요.",
            "mode": "fixed",
            "sources": [],
        }

    def generate(state: ChatState) -> ChatState:
        facts = [c.fact() for c in state.get("characters", [])]
        docs = state.get("docs", [])
        chars = state.get("characters", [])
        if chars:
            sources = _unique([f"공식 티어표 › {c.tier}티어" for c in chars] + [d.metadata.get("title", "") for d in docs[:2] if d.metadata.get("kind") == "guide"])
        else:
            sources = _unique([d.metadata.get("title", "") for d in docs[:3]])
        if llm is not None:
            try:
                messages: list[BaseMessage] = [SystemMessage(SYSTEM_PROMPT)]
                for turn in (state.get("history") or [])[-history_turns:] if history_turns else []:
                    messages.append(HumanMessage(turn["content"]) if turn["role"] == "user" else AIMessage(turn["content"]))
                messages.append(HumanMessage(build_context_block(facts, docs) + f"\n\n[질문]\n{state['question']}"))
                reply = llm.invoke(messages)
                text = _text_of(reply.content).strip()
                if text:
                    return {"answer": text, "mode": "llm", "sources": sources}
            except Exception as err:  # noqa: BLE001 — 어떤 실패든 문서 답으로 대신한다
                log.warning("LLM 호출 실패, 문서 답으로 대신함: %s", type(err).__name__)
        return {"answer": _fallback_answer(facts, docs), "mode": "fallback", "sources": sources}

    graph = StateGraph(ChatState)
    graph.add_node("analyze", analyze)
    graph.add_node("retrieve", retrieve)
    graph.add_node("greet", greet)
    graph.add_node("out_of_scope", out_of_scope)
    graph.add_node("generate", generate)
    graph.add_edge(START, "analyze")
    graph.add_conditional_edges("analyze", lambda s: "greet" if s.get("intent") == "greeting" else "retrieve", ["greet", "retrieve"])
    graph.add_conditional_edges("retrieve", route_after_retrieve, ["generate", "out_of_scope"])
    graph.add_edge("greet", END)
    graph.add_edge("out_of_scope", END)
    graph.add_edge("generate", END)
    return graph.compile()


def _unique(items: list[str]) -> list[str]:
    out: list[str] = []
    for item in items:
        if item and item not in out:
            out.append(item)
    return out


def _text_of(content: Any) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):  # 블록 리스트 응답
        return "".join(b.get("text", "") if isinstance(b, dict) else str(b) for b in content)
    return str(content)


def _fallback_answer(facts: list[str], docs: list[Document]) -> str:
    """LLM 없이 근거만으로 만드는 답 — 캐릭터 사실을 먼저, 그다음 가장 관련 있는 문서 한두 개의 본문."""
    parts: list[str] = []
    if facts:
        # 캐릭터 질문은 정확한 티어 사실만으로 충분하다
        parts.append("\n".join(f"• {f}" for f in facts))
        parts.append("메뉴 \"티어표\"에서 해당 티어 화면을 열면 같은 등급의 다른 캐릭터도 볼 수 있어요.")
        return "\n\n".join(parts)
    for d in docs[:2]:
        body = d.page_content
        if body.startswith("["):
            body = body.split("\n", 1)[1] if "\n" in body else body
        parts.append(f"📄 {d.metadata.get('title', '')}\n{body.strip()[:700]}")
    if not parts:
        return "관련 정보를 찾지 못했어요. 푸터의 \"문의하기\"로 남겨 주세요."
    return "\n\n".join(parts)
