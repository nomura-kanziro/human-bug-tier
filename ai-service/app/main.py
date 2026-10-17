"""휴버대 티어표 AI 전용 서비스 — FastAPI 진입점.

실행(개발):  cd ai-service && .venv/Scripts/python -m uvicorn app.main:app --port 8000
            (Linux/macOS: .venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000)

외부에 직접 열지 않는다. 브라우저 → Express(/api/ai/*, 요청 수 제한·검증) → 이 서비스(127.0.0.1:8000) 순서로만 부른다.
AI_SERVICE_KEY 를 설정하면 X-AI-Key 헤더가 같은 요청만 받는다(Express 가 붙여 보낸다).

챗봇은 종류별 폴더로 나뉜다(폴더마다 schema · router · service · models · repository · database 층):
  guidans_Chat/  가이드 전용 챗봇(휴버봇) — 구현됨
  Agent-Bot/     에이전트 봇 — 계획 단계(폴더만, 파이썬 코드 없음)
이 파일은 공용 부분(설정·키 검사·/health)만 맡고, 각 챗봇의 라우터를 붙인다.
DB 는 MongoDB 를 쓰지 않는다 — 필요해지면 Oracle SQL(python-oracledb)만 쓴다(각 챗봇 폴더의 database/).

엔드포인트
  GET  /health            상태(문서 수·캐릭터 수·LLM 사용 여부·모델)
  GET  /questions?count=3 랜덤 추천 질문            ┐
  POST /chat              { message, history? }      ├ guidans_Chat/router
  POST /reload            지식 다시 읽기(키 필요)   ┘
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request

from .config import load_settings
from .guidans_Chat.router import router as guide_chat_router
from .guidans_Chat.service.chat_service import GuideChatService

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = load_settings()
    app.state.settings = settings
    app.state.guide_chat = GuideChatService(settings)
    yield


app = FastAPI(title="휴버대 티어표 AI 서비스", version="1.0.0", lifespan=lifespan)
app.include_router(guide_chat_router)


@app.get("/health")
def health(request: Request):
    service = getattr(request.app.state, "guide_chat", None)
    if service is None:
        raise HTTPException(503, "AI 서비스가 아직 준비되지 않았습니다.")
    return {"status": "ok", **service.stats()}
