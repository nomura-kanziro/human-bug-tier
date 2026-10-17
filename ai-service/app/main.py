"""휴버대 티어표 AI 전용 서비스 — FastAPI 진입점.

실행(개발):  cd ai-service && .venv/Scripts/python -m uvicorn app.main:app --port 8000
            (Linux/macOS: .venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000)

외부에 직접 열지 않는다. 브라우저 → Express(/api/ai/*, 요청 수 제한·검증) → 이 서비스(127.0.0.1:8000) 순서로만 부른다.
AI_SERVICE_KEY 를 설정하면 X-AI-Key 헤더가 같은 요청만 받는다(Express 가 붙여 보낸다).

엔드포인트
  GET  /health            상태(문서 수·캐릭터 수·LLM 사용 여부·모델)
  GET  /questions?count=3 랜덤 추천 질문
  POST /chat              { message, history? } → { answer, mode, sources, characters }
  POST /reload            지식 문서·티어표 다시 읽기(키 필요)
"""
from __future__ import annotations

import logging
import threading
from contextlib import asynccontextmanager
from typing import Literal

from fastapi import Depends, FastAPI, Header, HTTPException, Query
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field

from .config import Settings, load_settings
from .graph import build_graph
from .knowledge import KnowledgeBase, build_knowledge_base
from .llm import make_llm
from .questions import random_questions

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("ai-service")

MAX_MESSAGE = 500
MAX_HISTORY_ITEMS = 12
MAX_HISTORY_CHARS = 2000


class Turn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=MAX_HISTORY_CHARS)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=MAX_MESSAGE)
    history: list[Turn] = Field(default_factory=list, max_length=MAX_HISTORY_ITEMS)


class ChatResponse(BaseModel):
    answer: str
    mode: Literal["llm", "fallback", "fixed"]
    sources: list[str]
    characters: list[dict]


class Runtime:
    """지식 베이스와 그래프를 함께 들고 있다가 /reload 때 통째로 바꾼다."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.lock = threading.Lock()
        self.kb: KnowledgeBase | None = None
        self.graph = None
        self.reload()

    def reload(self) -> None:
        s = self.settings
        kb = build_knowledge_base(s.knowledge_dir, s.tiers_json, k=s.top_k)
        graph = build_graph(kb, make_llm(s), top_k=s.top_k, history_turns=s.history_turns)
        with self.lock:
            self.kb, self.graph = kb, graph
        log.info("지식 베이스 로드: 문서 %d개, 캐릭터 %d명, LLM %s", len(kb.documents), len(kb.characters.characters),
                 s.model if s.llm_enabled else "없음(fallback)")


runtime: Runtime | None = None


@asynccontextmanager
async def lifespan(_: FastAPI):
    global runtime
    runtime = Runtime(load_settings())
    yield


app = FastAPI(title="휴버대 티어표 AI 서비스", version="1.0.0", lifespan=lifespan)


def get_runtime() -> Runtime:
    if runtime is None:
        raise HTTPException(503, "AI 서비스가 아직 준비되지 않았습니다.")
    return runtime


def check_key(x_ai_key: str | None = Header(default=None), rt: Runtime = Depends(get_runtime)) -> None:
    expected = rt.settings.service_key
    if expected and x_ai_key != expected:
        raise HTTPException(401, "인증되지 않은 요청입니다.")


@app.get("/health")
def health(rt: Runtime = Depends(get_runtime)):
    kb = rt.kb
    return {
        "status": "ok",
        "documents": len(kb.documents) if kb else 0,
        "characters": len(kb.characters.characters) if kb else 0,
        "llm": rt.settings.llm_enabled,
        "model": rt.settings.model if rt.settings.llm_enabled else None,
    }


@app.get("/questions", dependencies=[Depends(check_key)])
def questions(count: int = Query(3, ge=1, le=6), rt: Runtime = Depends(get_runtime)):
    return {"questions": random_questions(rt.kb, count)}


@app.post("/chat", response_model=ChatResponse, dependencies=[Depends(check_key)])
async def chat(body: ChatRequest, rt: Runtime = Depends(get_runtime)):
    question = body.message.strip()
    if not question:
        raise HTTPException(400, "질문을 입력해 주세요.")
    state = {"question": question, "history": [t.model_dump() for t in body.history]}
    # LLM 호출이 블로킹이라 스레드에서 돌린다
    result = await run_in_threadpool(rt.graph.invoke, state)
    return ChatResponse(
        answer=result.get("answer", ""),
        mode=result.get("mode", "fallback"),
        sources=result.get("sources", []),
        characters=[{"name": c.plain_name, "tier": c.tier, "grade": c.grade} for c in result.get("characters", [])],
    )


@app.post("/reload", dependencies=[Depends(check_key)])
def reload_knowledge(rt: Runtime = Depends(get_runtime)):
    if not rt.settings.service_key:
        raise HTTPException(403, "AI_SERVICE_KEY 가 설정된 경우에만 쓸 수 있습니다.")
    rt.reload()
    return {"ok": True, "documents": len(rt.kb.documents)}
