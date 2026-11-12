"""에이전트 봇 라우터 — 가이드 챗봇과 경로가 겹치지 않게 접두사 `/agent` 를 붙인다.

  GET  /agent/info   AI 서버 ON/OFF · 모델 · 할 수 있는 작업 목록(강도 포함)
  POST /agent/run    요청 하나 실행 — 줄 단위 JSON(NDJSON) 스트림으로 이벤트를 흘려보낸다

브라우저가 직접 부르지 않는다. 사이트 백엔드(Express `/api/ai/agent/*`)가 로그인·포인트·요청 수를 확인한 뒤 부른다.
스트림은 동기 제너레이터라 FastAPI 가 스레드에서 돌린다(LLM 호출이 블로킹이어도 다른 요청을 막지 않는다).
"""
from __future__ import annotations

import json
from collections.abc import Iterator

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse

from ...deps import check_key
from ..schema import MAX_MAKER_ZONES, MAX_NAME_CHARS, MAX_ZONE_NAMES, AgentInfoResponse, AgentRunRequest
from ..service.agent_service import AgentBotService

router = APIRouter(prefix="/agent", dependencies=[Depends(check_key)])


def get_service(request: Request) -> AgentBotService:
    service = getattr(request.app.state, "agent_bot", None)
    if service is None:
        raise HTTPException(503, "에이전트 봇이 아직 준비되지 않았습니다.")
    return service


@router.get("/info", response_model=AgentInfoResponse)
def info(service: AgentBotService = Depends(get_service)):
    return AgentInfoResponse(**service.info())


def _ndjson(events: Iterator[dict]) -> Iterator[bytes]:
    for event in events:
        yield (json.dumps(event, ensure_ascii=False) + "\n").encode("utf-8")


@router.post("/run")
def run(body: AgentRunRequest, service: AgentBotService = Depends(get_service)):
    if not body.message.strip():
        raise HTTPException(400, "요청을 입력해 주세요.")
    # 커스텀 메이커 상태 크기 검사(이름만 오지만 터무니없이 큰 값은 받지 않는다)
    if len(body.maker) > MAX_MAKER_ZONES or any(
        len(names) > MAX_ZONE_NAMES or any(len(str(n)) > MAX_NAME_CHARS for n in names) for names in body.maker.values()
    ):
        raise HTTPException(400, "티어표 상태가 너무 큽니다.")
    return StreamingResponse(
        _ndjson(service.run(body)),
        media_type="application/x-ndjson",
        # 중간(nginx 등)에서 모았다가 한꺼번에 보내지 않게 — 글자가 나오는 대로 흘러가야 한다
        headers={"Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no"},
    )
