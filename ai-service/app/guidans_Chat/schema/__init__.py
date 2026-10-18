"""요청·응답 스키마(pydantic) — 라우터가 받고 돌려주는 JSON 모양. DB 테이블 모양은 ../models/ 에 둔다."""
from .chat import (  # noqa: F401
    MAX_HISTORY_CHARS, MAX_HISTORY_ITEMS, MAX_MESSAGE,
    ChatRequest, ChatResponse, QuestionsResponse, StatusResponse, Turn,
)
