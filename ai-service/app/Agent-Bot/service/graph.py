"""에이전트 봇 작업 흐름 — LangGraph StateGraph.

    START → plan ─┬─(무료: 이용 안내·거절·못 알아들음·분석할 티어표 없음)→ END
                  ├─ tier_build → END      티어표 초안 만들기(무거움)
                  ├─ review     → END      내 티어표 분석(보통)
                  ├─ digest     → END      게시판·공지 요약(보통)
                  ├─ briefing   → END      내 활동 브리핑(보통)
                  └─ search     → END      통합 검색(가벼움)

- plan : 규칙으로 먼저 정하고(`planner.plan_by_rules`), 애매한 말만 LLM 에게 JSON 으로 묻는다. LLM 이 꺼져 있거나 답이 깨지면 무료 안내로 보낸다.
- 도구 노드 : 계산·조회만 한다(LLM 없음). 결과물(result)·해설용 사실(facts)·LLM 없이 쓸 해설(fallback)을 상태에 담는다.
해설 글은 그래프 밖(`agent_service.py`)에서 스트리밍으로 쓴다 — 글자가 나오는 대로 내보내려고 그래프 노드에 넣지 않았다.
서비스는 `graph.stream(..., stream_mode="updates")` 로 노드가 끝날 때마다 진행 상황을 화면에 보낸다.
"""
from __future__ import annotations

import json
import logging
import random
from typing import Any, TypedDict

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import END, START, StateGraph

from ..repository import SiteRepository
from ..schema import UserContext
from . import planner
from .catalog import Catalog
from .planner import Plan
from .tools import (
    briefing_facts, build_facts, build_tier_list, describe_briefing, describe_build, describe_digest, describe_review,
    describe_search, digest_facts, review_facts, review_tier_list, run_briefing, run_digest, run_search,
)

log = logging.getLogger("ai-service.agent_bot.graph")

TOOL_NODES = ("tier_build", "review", "digest", "briefing", "search")

# 화면에 보여 줄 진행 단계(작업별)
STEPS = {
    "tier_build": ["요청 조건 읽기", "공식 티어표에서 캐릭터 고르기", "배치 만들기", "해설 쓰기"],
    "review": ["내 티어표 읽기", "공식 티어표와 비교", "해설 쓰기"],
    "digest": ["게시판·공지 불러오기", "인기·최신 글 고르기", "요약 쓰기"],
    "briefing": ["내 현황 읽기", "오늘 할 일 고르기", "브리핑 쓰기"],
    "search": ["검색 조건 읽기", "캐릭터·게시판·공지 찾기"],
}


class AgentState(TypedDict, total=False):
    request: str
    user: UserContext
    maker: dict[str, list[str]]
    plan: Plan
    kind: str            # 결과물 종류(화면이 어떤 카드로 그릴지)
    result: dict
    facts: str           # LLM 해설용 사실 묶음(없으면 해설을 LLM 에 맡기지 않는다)
    fallback: str        # LLM 없이 쓰는 해설


def _maker_count(maker: dict | None) -> int:
    return sum(len(v) for v in (maker or {}).values() if isinstance(v, list))


def _parse_json(text: str) -> dict | None:
    """LLM 답에서 JSON 객체 하나를 꺼낸다(앞뒤에 군말이 붙어도)."""
    raw = str(text or "")
    start, end = raw.find("{"), raw.rfind("}")
    if start == -1 or end <= start:
        return None
    try:
        data = json.loads(raw[start:end + 1])
    except ValueError:
        return None
    return data if isinstance(data, dict) else None


def build_graph(catalog: Catalog, site: SiteRepository, planner_llm: BaseChatModel | None = None, *, gate=None, rng: random.Random | None = None):
    """gate: LlmStatus 같은 객체(is_on() · failed() · succeeded()). 없으면 planner_llm 이 있을 때 항상 시도한다."""

    def ask_llm_plan(text: str, maker_count: int) -> Plan | None:
        if planner_llm is None or (gate is not None and not gate.is_on()):
            return None
        try:
            out = planner_llm.invoke([SystemMessage(planner.PLANNER_SYSTEM), HumanMessage(f"사용자: {text}")])
            data = _parse_json(getattr(out, "content", out))
            if gate is not None:
                gate.succeeded()
            if data is None:
                return None
            plan = planner.plan_from_llm_json(data, text, catalog, maker_count=maker_count)
            plan.via = "llm"      # 무료 안내로 끝나도 "LLM 이 판단했다"는 표시는 남긴다
            return plan
        except Exception as err:  # noqa: BLE001 — 분류 실패는 안내 문구로 대신한다
            log.warning("작업 분류 LLM 실패: %s", type(err).__name__)
            if gate is not None:
                gate.failed()
            return None

    def plan_node(state: AgentState) -> AgentState:
        text = state["request"]
        count = _maker_count(state.get("maker"))
        plan = planner.plan_by_rules(text, catalog, maker_count=count)
        if plan is None:
            plan = ask_llm_plan(text, count) or planner.free_plan("unknown", planner.UNKNOWN_MESSAGE)
        elif plan.task == "tier_build" and planner.build_needs_llm(plan.args, text):
            # 만들라는 건 알겠는데 조건을 규칙으로 못 읽은 긴 말 — LLM 이 읽은 범위·랜덤만 보탠다
            refined = ask_llm_plan(text, count)
            if refined is not None and refined.task == "tier_build":
                plan = refined
        return {"plan": plan}

    def route(state: AgentState) -> str:
        task = state["plan"].task
        return task if task in TOOL_NODES else END

    def tier_build(state: AgentState) -> AgentState:
        result = build_tier_list(state["plan"].args, catalog, rng=rng, nickname=state["user"].nickname)
        return {"kind": "tier_list", "result": result, "facts": build_facts(result), "fallback": describe_build(result)}

    def review(state: AgentState) -> AgentState:
        result = review_tier_list(state.get("maker") or {}, catalog)
        return {"kind": "review", "result": result, "facts": review_facts(result), "fallback": describe_review(result)}

    def digest(state: AgentState) -> AgentState:
        result = run_digest(state["plan"].args, site)
        # 모은 글이 하나도 없으면 LLM 에게 쓸 거리가 없다 — 정해진 문구로 끝낸다
        facts = digest_facts(result) if result["total"] else ""
        return {"kind": "digest", "result": result, "facts": facts, "fallback": describe_digest(result)}

    def briefing(state: AgentState) -> AgentState:
        result = run_briefing(state["user"])
        return {"kind": "briefing", "result": result, "facts": briefing_facts(result), "fallback": describe_briefing(result)}

    def search(state: AgentState) -> AgentState:
        result = run_search(state["plan"].args, catalog, site)
        return {"kind": "search", "result": result, "facts": "", "fallback": describe_search(result)}   # 검색은 LLM 해설 없이 바로 끝

    g: StateGraph[Any] = StateGraph(AgentState)
    g.add_node("plan", plan_node)
    for name, fn in (("tier_build", tier_build), ("review", review), ("digest", digest), ("briefing", briefing), ("search", search)):
        g.add_node(name, fn)
        g.add_edge(name, END)
    g.add_edge(START, "plan")
    g.add_conditional_edges("plan", route, {**{n: n for n in TOOL_NODES}, END: END})
    return g.compile()
