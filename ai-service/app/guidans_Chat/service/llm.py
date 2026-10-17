"""LLM 생성 — LangChain 채팅 모델. 기본은 내 PC 의 Ollama(gemma4:12b), 설정하면 Claude API.

provider(`AI_LLM_PROVIDER`):
  ollama     (기본) ChatOllama. **생각(thinking) 모드를 끈다** — gemma4 는 기본으로 생각을 먼저 해서 토큰을 다 쓰면
             답이 빈 문자열로 나오고 느리다(시험: 켠 채 8.5초·빈 답 / 끄면 0.8초·정상 답).
  anthropic  ChatAnthropic(Claude API). 키가 없으면 None.
  none       LLM 을 쓰지 않고 문서 검색 답만 돌려준다.
돌려주는 모델이 호출에 실패하면(Ollama 가 꺼져 있는 등) graph.py 가 예외 대신 문서 답으로 대신한다.
"""
from __future__ import annotations

from langchain_core.language_models.chat_models import BaseChatModel

from ...config import Settings


def make_llm(settings: Settings) -> BaseChatModel | None:
    if settings.llm_provider == "ollama":
        from langchain_ollama import ChatOllama  # 쓸 때만 불러온다

        return ChatOllama(
            model=settings.ollama_model,
            base_url=settings.ollama_base_url,
            num_ctx=settings.ollama_num_ctx,
            num_predict=settings.max_tokens,
            temperature=0.2,           # 사실 안내 봇이라 낮게
            reasoning=False,           # ★ 생각 모드 끄기(위 설명)
            keep_alive=settings.ollama_keep_alive,
            client_kwargs={"timeout": 60},
        )
    if settings.llm_provider == "anthropic" and settings.anthropic_api_key:
        from langchain_anthropic import ChatAnthropic

        return ChatAnthropic(
            model=settings.anthropic_model,
            api_key=settings.anthropic_api_key,
            max_tokens=settings.max_tokens,
            timeout=40,
            max_retries=1,
        )
    return None
