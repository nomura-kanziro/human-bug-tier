"""AgentBotService — 에이전트 봇의 진입 서비스. 라우터는 이 클래스만 부른다.

요청 하나를 **이벤트 스트림**으로 처리한다(`run()` 이 이벤트 dict 를 하나씩 내놓는 제너레이터):
  plan → step… → result → token… → done        (형식은 `schema/agent.py` 맨 위 설명)
- 작업 판별·도구 실행은 LangGraph(`graph.py`)가 하고, 노드가 끝날 때마다 진행 상황을 내보낸다.
- 결과물(result)은 계산이 끝나는 즉시 먼저 나간다. 해설은 그 뒤에 LLM 이 쓰는 대로 글자 단위로 흘려보낸다
  → 화면에는 결과가 바로 보이고, 글은 타자 치듯 이어진다(전부 만들어질 때까지 빈 화면으로 기다리지 않는다).
- AI 서버(Ollama)가 꺼져 있으면 LLM 을 부르지 않고(기다리지 않고) 도구가 만든 정해진 해설을 그대로 쓴다(mode "fallback").
  이때는 `plan` 이벤트의 ai 가 "off" 라서 사이트 백엔드가 가벼움 요금만 받는다.
- 대화 내용은 저장하지 않는다(Oracle·파일 어디에도).
"""
from __future__ import annotations

import dataclasses
import logging
import random
import threading
from collections.abc import Iterator

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage

from ...config import Settings
from ...guidans_Chat.service.llm_status import LlmStatus
from ..database import SiteApi
from ..repository import SiteRepository
from ..schema import AgentRunRequest
from .catalog import Catalog, build_catalog
from .graph import STEPS, build_graph
from .llm import make_agent_llm
from .planner import TASKS
from .prompts import SYSTEM_PROMPT, build_user_prompt

log = logging.getLogger("ai-service.agent_bot")

HISTORY_TURNS = 4   # 해설에 넘기는 이전 대화 수(메시지 단위) — 길수록 느려져 짧게 둔다


class AgentBotService:
    def __init__(self, settings: Settings, *, site: SiteRepository | None = None, planner_llm=None, writer_llm=None,
                 status: LlmStatus | None = None, rng: random.Random | None = None):
        """site/planner_llm/writer_llm/status/rng 는 테스트에서 가짜를 꽂을 때만 넘긴다."""
        self.settings = settings
        self._lock = threading.Lock()
        self._site = site or SiteRepository(SiteApi(settings.site_api_url, key=settings.service_key, timeout=settings.site_api_timeout))
        self._rng = rng
        self._llm_override = planner_llm is not None or writer_llm is not None
        self._planner_llm = planner_llm if self._llm_override else make_agent_llm(settings, json_mode=True)
        self._writer_llm = writer_llm if self._llm_override else make_agent_llm(settings)
        # ON/OFF 확인은 가이드 챗봇의 LlmStatus 를 그대로 쓴다 — 확인할 모델 이름만 에이전트 봇 모델로 바꿔서
        self.llm_status = status or LlmStatus(dataclasses.replace(settings, ollama_model=settings.agent_model_name))
        self.catalog: Catalog | None = None
        self._graph = None
        self.reload()

    # ------------------------------------------------------------------ 준비
    def reload(self) -> None:
        catalog = build_catalog(self.settings.tiers_json)
        graph = build_graph(catalog, self._site, self._planner_llm, gate=self.llm_status, rng=self._rng)
        with self._lock:
            self.catalog, self._graph = catalog, graph
        log.info("에이전트 봇 준비: 캐릭터 %d명, 모델 %s", len(catalog.characters),
                 f"{self.settings.llm_provider}:{self.settings.agent_model_name}" if self.settings.llm_enabled else "없음(규칙 모드)")
        self._warm_up()

    def _warm_up(self) -> None:
        """가이드 챗봇과 다른 모델을 따로 지정했을 때만 미리 불러 둔다(같은 모델이면 가이드 챗봇이 이미 올려 둔다)."""
        s = self.settings
        if self._llm_override or s.llm_provider != "ollama" or not s.warmup or s.agent_model_name == s.ollama_model:
            return

        def run():
            try:
                make_agent_llm(s).invoke("안녕")
                log.info("에이전트 봇 모델 워밍업 완료")
            except Exception as err:  # noqa: BLE001
                log.info("에이전트 봇 모델 워밍업 건너뜀: %s", type(err).__name__)

        threading.Thread(target=run, name="agent-warmup", daemon=True).start()

    # ------------------------------------------------------------------ 조회
    def info(self) -> dict:
        st = self.llm_status.get()
        s = self.settings
        return {
            "ai": st.label,
            "reason": st.reason,
            "model": s.agent_model_name if s.llm_enabled else None,
            "tasks": [{"task": task, "label": label, "level": level, "description": desc, "example": example}
                      for task, (level, label, desc, example) in TASKS.items()],
        }

    def stats(self) -> dict:
        s = self.settings
        return {
            "characters": len(self.catalog.characters) if self.catalog else 0,
            "model": s.agent_model_name if s.llm_enabled else None,
            "ai": self.llm_status.get().label,
            "tasks": list(TASKS),
        }

    # ------------------------------------------------------------------ 실행
    def _write(self, task: str, request: str, facts: str, history: list[dict]) -> Iterator[str]:
        """해설을 LLM 이 쓰는 대로 조각조각 내놓는다."""
        messages: list[BaseMessage] = [SystemMessage(SYSTEM_PROMPT)]
        for turn in history[-HISTORY_TURNS:]:
            messages.append(HumanMessage(turn["content"]) if turn["role"] == "user" else AIMessage(turn["content"]))
        messages.append(HumanMessage(build_user_prompt(task, request, facts)))
        for chunk in self._writer_llm.stream(messages):
            content = getattr(chunk, "content", chunk)
            # Claude 는 content 가 블록 리스트로 올 수 있다 → 텍스트만 모은다
            text = "".join(b.get("text", "") for b in content if isinstance(b, dict)) if isinstance(content, list) else str(content or "")
            if text:
                yield text

    def run(self, body: AgentRunRequest) -> Iterator[dict]:
        """요청 하나를 처리하며 이벤트를 차례로 내놓는다(LLM 호출이 블로킹이라 라우터가 스레드에서 돌린다)."""
        request = body.message.strip()
        state = {"request": request, "user": body.user, "maker": body.maker}
        with self._lock:
            graph = self._graph
        ai_on = self._writer_llm is not None and self.llm_status.is_on()
        plan = None
        final: dict = {}
        try:
            for update in graph.stream(state, stream_mode="updates"):
                for node, values in update.items():
                    values = values or {}
                    if node == "plan":
                        plan = values["plan"]
                        if plan.is_free:
                            yield {"type": "plan", "task": plan.task, "label": plan.label, "level": "free", "steps": [], "via": plan.via, "ai": "on" if ai_on else "off"}
                            yield {"type": "done", "ok": True, "answer": plan.message, "mode": "fixed", "ai": "on" if ai_on else "off"}
                            return
                        steps = STEPS.get(plan.task, [])
                        yield {"type": "plan", "task": plan.task, "label": plan.label, "level": plan.level, "steps": steps, "via": plan.via, "ai": "on" if ai_on else "off"}
                        yield {"type": "step", "index": 0, "label": steps[0] if steps else plan.label, "status": "done"}
                        if len(steps) > 1:
                            yield {"type": "step", "index": 1, "label": steps[1], "status": "running"}
                    else:
                        final = values
        except Exception as err:  # noqa: BLE001 — 도구가 죽어도 스트림은 오류 이벤트로 끝낸다(백엔드가 포인트를 돌려준다)
            log.exception("에이전트 봇 작업 실패: %s", type(err).__name__)
            yield {"type": "error", "message": "작업을 끝내지 못했어요. 잠시 뒤에 다시 시도해 주세요."}
            return
        if plan is None or not final:
            yield {"type": "error", "message": "작업을 시작하지 못했어요. 잠시 뒤에 다시 시도해 주세요."}
            return

        steps = STEPS.get(plan.task, [])
        last = len(steps) - 1
        writes = bool(final.get("facts"))                 # 해설을 LLM 이 쓰는 작업인지
        tool_last = last if plan.task == "search" else max(0, last - 1)   # 검색은 마지막 단계까지 도구가 하고, 나머지는 마지막 단계가 "해설 쓰기"다
        for i in range(1, tool_last + 1):
            yield {"type": "step", "index": i, "label": steps[i], "status": "done"}
        # 결과물을 먼저 — 계산은 이미 끝났다
        yield {"type": "result", "kind": final["kind"], "data": final["result"]}

        answer, mode = final["fallback"], "fallback"
        if writes and ai_on:
            if tool_last < last:
                yield {"type": "step", "index": last, "label": steps[last], "status": "running"}
            parts: list[str] = []
            try:
                for text in self._write(plan.task, request, final["facts"], [t.model_dump() for t in body.history]):
                    parts.append(text)
                    yield {"type": "token", "text": text}
                written = "".join(parts).strip()
                if written:
                    answer, mode = written, "llm"
                    self.llm_status.succeeded()
            except Exception as err:  # noqa: BLE001 — 해설 실패는 정해진 해설로 대신한다(결과물은 이미 나갔다)
                log.warning("에이전트 봇 해설 LLM 실패, 정해진 해설로 대신: %s", type(err).__name__)
                self.llm_status.failed()
                if parts:
                    yield {"type": "reset"}          # 쓰다 만 글은 지우고 정해진 해설로 바꾼다
        if tool_last < last:
            yield {"type": "step", "index": last, "label": steps[last], "status": "done"}
        if mode != "llm" and plan.task == "search":
            mode = "tool"                                 # 검색은 원래 LLM 해설이 없는 작업
        yield {"type": "done", "ok": True, "answer": answer, "mode": mode, "ai": "on" if self.llm_status.get().on else "off"}
