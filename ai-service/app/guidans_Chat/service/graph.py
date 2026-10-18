"""질문 처리 흐름 — LangGraph StateGraph.

    START → analyze ─┬─(인사)──────────────→ greet ──────────→ END
                     ├─(지시 무시·프롬프트 공개 요구)→ refuse ──→ END
                     └─(그 외)→ retrieve ─┬─(근거 없음)→ out_of_scope → END
                                          └─(근거 있음)→ generate ───→ END

- analyze   : 질문 속 캐릭터 이름(CharacterIndex)·티어 번호("3티어")를 찾고 의도를 나눈다. 뻔한 프롬프트 인젝션은 여기서 막는다.
- retrieve  : 하이브리드 검색(BM25 + ChromaDB 벡터, RRF) + 찾은 캐릭터의 "정확한 티어 정보" + 언급된 티어의 캐릭터 목록 문서.
              관련성은 벡터를 쓸 수 있으면 벡터 유사도(bge-m3)로, 못 쓰면 BM25 점수로 판단한다.
- generate  : LLM(기본 Ollama gemma4:12b)이 모은 근거만으로 답한다.
              LLM 이 꺼져 있거나 호출이 실패하면 근거 문서를 그대로 엮은 답(fallback)을 돌려준다.
- greet / refuse / out_of_scope : LLM 없이 정해진 문구로 답한다(비용 절약 + 사이트 밖 질문 차단).
"""
from __future__ import annotations

import logging
import re
from typing import Any, Literal, TypedDict

from langchain_core.documents import Document
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from langgraph.graph import END, START, StateGraph

from .doc_answer import build_doc_answer_with_sources
from .knowledge import Character, KnowledgeBase
from .prompts import SYSTEM_PROMPT, build_context_block

log = logging.getLogger("ai-service.graph")

# 사이트와 관계있는 질문인지 가르는 기준 — 캐릭터·티어 언급이 없을 때, BM25 최고 점수나 벡터 최고 유사도(bge-m3,
# 코사인) 중 하나라도 넘어야 한다. 둘 다 낮으면 "사이트와 관계없는 질문"으로 LLM 없이 정해진 답을 한다.
# bge-m3 로 실제 측정(2026-10-18, 지식 469조각): 범위 밖 질문 0.37~0.50, 사이트 질문 0.53 이상 → 0.52. 벡터를 못 쓸 때만 BM25 기준을 쓴다
# (BM25 는 "어때·알려줘" 같은 흔한 말에도 점수가 나와 범위 밖 질문을 못 거른다).
MIN_RELEVANCE = 10.0
MIN_VECTOR_SIM = 0.52
MIN_LEXICAL_CLEAN = 12.0   # 벡터를 못 쓸 때(AI 서버 OFF): 군더더기 말을 뺀 질문의 BM25 점수 기준(실측으로 정함 — scripts/calibrate_relevance.py)

_GREETING = re.compile(r"^\s*(안녕|하이|ㅎㅇ|hello|hi|반가워|헬로)[\s!~.?ㅎㅋ]*$", re.IGNORECASE)
# 지시 무시·프롬프트 공개 요구 같은 뻔한 시도는 LLM 에 보내지 않고 바로 거절한다(비용 0, 모델이 넘어갈 여지 없음)
_INJECTION = re.compile(
    r"(시스템\s*프롬프트|프롬프트\s*(를|좀)?\s*(보여|알려|공개|출력)|이전\s*(의\s*)?(지시|명령|규칙)|(지시|명령|규칙)(을|를)?\s*(모두\s*)?(무시|잊)"
    r"|역할\s*(을|를)?\s*바꿔|ignore\s+(all\s+|the\s+)?(previous|above|prior)|system\s*prompt|jailbreak|너는\s*이제)",
    re.IGNORECASE,
)
_TIER_NUM = re.compile(r"([1-9])\s*(?:티어|등급|tier)", re.IGNORECASE)


class ChatState(TypedDict, total=False):
    question: str
    history: list[dict[str, str]]
    intent: Literal["greeting", "blocked", "site"]
    characters: list[Character]
    tier_numbers: list[int]
    docs: list[Document]
    best_score: float
    best_vector: float
    best_clean: float
    used_vector: bool
    answer: str
    mode: Literal["llm", "fallback", "fixed"]
    sources: list[str]


def build_graph(kb: KnowledgeBase, llm: BaseChatModel | None, *, top_k: int = 5, history_turns: int = 6, searcher=None, gate=None):
    """gate: LlmStatus 같은 객체(is_on() · failed() · succeeded()). 없으면 LLM 이 있으면 항상 시도한다."""
    def analyze(state: ChatState) -> ChatState:
        q = state["question"]
        if _GREETING.match(q):
            return {"intent": "greeting", "characters": [], "tier_numbers": []}
        if _INJECTION.search(q):
            return {"intent": "blocked", "characters": [], "tier_numbers": []}
        tiers = sorted({int(n) for n in _TIER_NUM.findall(q) if int(n) in kb.tiers})
        return {"intent": "site", "characters": kb.characters.find(q), "tier_numbers": tiers}

    def retrieve(state: ChatState) -> ChatState:
        q = state["question"]
        if searcher is not None:   # BM25 + 벡터(ChromaDB) 하이브리드
            result = searcher.search(q, top_k)
            hits, best, best_vec, used_vec, best_clean = result.hits, result.lexical_best, result.vector_best, result.used_vector, result.lexical_clean
        else:                      # BM25 만
            hits = kb.retriever.search(q, top_k)
            best, best_vec, used_vec = (hits[0][1] if hits else 0.0), 0.0, False
            best_clean = best
        found = {c.plain_name for c in state.get("characters", [])}
        # 캐릭터를 찾았으면, 이름이 비슷해 걸린 다른 캐릭터 문서는 뺀다(혼동 방지)
        if found:
            hits = [(d, s) for d, s in hits
                    if d.metadata.get("kind") != "character" or d.metadata.get("title", "").rsplit(" › ", 1)[-1] in found]
        docs: list[Document] = [d for d, _ in hits]
        # 언급된 티어의 전체 목록 문서를 앞에 둔다(BM25 는 "3티어에는 누가?" 같은 질문에 약하다)
        for t in state.get("tier_numbers", []):
            for d in kb.documents:
                if d.metadata.get("kind") == "tier" and d.metadata.get("tier") == t and d not in docs:
                    docs.insert(0, d)
        return {"docs": docs, "best_score": best, "best_vector": best_vec, "best_clean": best_clean, "used_vector": used_vec}

    def route_after_retrieve(state: ChatState) -> str:
        if state.get("characters") or state.get("tier_numbers"):
            return "generate"
        if state.get("used_vector"):
            relevant = state.get("best_vector", 0) >= MIN_VECTOR_SIM
        else:
            # 벡터를 못 쓰는 상태(AI 서버 OFF 등)에서는 군더더기 말을 뺀 BM25 점수로 판단한다(searcher 없이 BM25 만 쓸 땐 기존 기준)
            relevant = state.get("best_clean", 0) >= (MIN_LEXICAL_CLEAN if searcher is not None else MIN_RELEVANCE)
        return "generate" if relevant else "out_of_scope"

    def greet(state: ChatState) -> ChatState:
        return {
            "answer": "안녕하세요! 휴버대 티어표 AI 도우미 휴버봇이에요. 티어표, 캐릭터 티어, 티어표 만들기, 행운 뽑기, 이벤트, 출석체크처럼 사이트에 관한 건 뭐든 물어보세요.",
            "mode": "fixed",
            "sources": [],
        }

    def refuse(state: ChatState) -> ChatState:
        return {
            "answer": "그 요청은 도와드릴 수 없어요. 저는 휴버대 티어표 사이트(티어표·캐릭터·커스텀 메이커·게시판·행운 뽑기·이벤트·회원 기능)에 관한 질문에 답해요.",
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
        # AI 서버가 꺼져 있다고 알려져 있으면 LLM 을 부르지 않고(기다리지 않고) 바로 지식 문서 답으로 간다
        if llm is not None and (gate is None or gate.is_on()):
            try:
                messages: list[BaseMessage] = [SystemMessage(SYSTEM_PROMPT)]
                for turn in (state.get("history") or [])[-history_turns:] if history_turns else []:
                    messages.append(HumanMessage(turn["content"]) if turn["role"] == "user" else AIMessage(turn["content"]))
                messages.append(HumanMessage(build_context_block(facts, docs) + f"\n\n[질문]\n{state['question']}"))
                reply = llm.invoke(messages)
                text = _text_of(reply.content).strip()
                if text:
                    if gate is not None:
                        gate.succeeded()
                    return {"answer": text, "mode": "llm", "sources": sources}
            except Exception as err:  # noqa: BLE001 — 어떤 실패든 문서 답으로 대신한다
                log.warning("LLM 호출 실패, 문서 답으로 대신함: %s", type(err).__name__)
                if gate is not None:
                    gate.failed()
        answer, shown = build_doc_answer_with_sources(state["question"], facts, docs)
        # 문서 답에서는 실제로 보여 준 문서만 출처로 올린다(캐릭터 질문은 위에서 정한 티어표 출처 그대로)
        return {"answer": answer, "mode": "fallback", "sources": sources if chars else shown}

    graph = StateGraph(ChatState)
    graph.add_node("analyze", analyze)
    graph.add_node("retrieve", retrieve)
    graph.add_node("greet", greet)
    graph.add_node("refuse", refuse)
    graph.add_node("out_of_scope", out_of_scope)
    graph.add_node("generate", generate)
    graph.add_edge(START, "analyze")
    graph.add_conditional_edges(
        "analyze",
        lambda s: {"greeting": "greet", "blocked": "refuse"}.get(s.get("intent"), "retrieve"),
        ["greet", "refuse", "retrieve"],
    )
    graph.add_edge("refuse", END)
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
