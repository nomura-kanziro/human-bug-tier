"""라우터 공용 의존성 — 서비스 키(X-AI-Key) 검사. 챗봇이 늘어도 같은 검사를 쓴다."""
from __future__ import annotations

from fastapi import Header, HTTPException, Request


def check_key(request: Request, x_ai_key: str | None = Header(default=None)) -> None:
    settings = getattr(request.app.state, "settings", None)
    if settings is None:
        raise HTTPException(503, "AI 서비스가 아직 준비되지 않았습니다.")
    expected = settings.service_key
    if expected and x_ai_key != expected:
        raise HTTPException(401, "인증되지 않은 요청입니다.")
