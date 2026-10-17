"""가이드 챗봇 라우터 — GET /questions · POST /chat · POST /reload (경로는 Express 프록시가 부르는 값이라 바꾸지 않는다).

에이전트 봇이 생기면 경로가 겹치지 않게 그쪽 라우터에 접두사(`/agent`)를 붙인다.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.concurrency import run_in_threadpool

from ...deps import check_key
from ..schema import ChatRequest, ChatResponse, QuestionsResponse
from ..service.chat_service import GuideChatService

router = APIRouter(dependencies=[Depends(check_key)])


def get_service(request: Request) -> GuideChatService:
    service = getattr(request.app.state, "guide_chat", None)
    if service is None:
        raise HTTPException(503, "AI 서비스가 아직 준비되지 않았습니다.")
    return service


@router.get("/questions", response_model=QuestionsResponse)
def questions(count: int = Query(3, ge=1, le=6), service: GuideChatService = Depends(get_service)):
    return QuestionsResponse(questions=service.questions(count))


@router.post("/chat", response_model=ChatResponse)
async def chat(body: ChatRequest, service: GuideChatService = Depends(get_service)):
    if not body.message.strip():
        raise HTTPException(400, "질문을 입력해 주세요.")
    return await run_in_threadpool(service.ask, body)


@router.post("/reload")
def reload_knowledge(service: GuideChatService = Depends(get_service)):
    if not service.settings.service_key:
        raise HTTPException(403, "AI_SERVICE_KEY 가 설정된 경우에만 쓸 수 있습니다.")
    service.reload()
    return {"ok": True, "documents": len(service.kb.documents)}
