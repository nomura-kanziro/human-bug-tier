"""LLM 생성 — LangChain ChatAnthropic(Claude). API 키가 없으면 None(문서 검색 답변만)."""
from __future__ import annotations

from langchain_core.language_models.chat_models import BaseChatModel

from ...config import Settings


def make_llm(settings: Settings) -> BaseChatModel | None:
    if not settings.llm_enabled:
        return None
    from langchain_anthropic import ChatAnthropic  # 키가 있을 때만 불러온다

    return ChatAnthropic(
        model=settings.model,
        api_key=settings.anthropic_api_key,
        max_tokens=settings.max_tokens,
        timeout=40,
        max_retries=1,
    )
