"""가이드 챗봇 API 스키마. 길이 제한은 Express(`backend/routes/aiRoutes.js`)와 같은 값이다 — 한쪽을 바꾸면 같이 바꾼다."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

MAX_MESSAGE = 500          # 질문 최대 글자 수
MAX_HISTORY_ITEMS = 12     # 같이 받는 이전 대화 최대 개수
MAX_HISTORY_CHARS = 2000   # 이전 대화 한 개의 최대 글자 수


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


class QuestionsResponse(BaseModel):
    questions: list[str]
