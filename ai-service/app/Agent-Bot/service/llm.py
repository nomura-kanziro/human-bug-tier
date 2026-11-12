"""에이전트 봇 LLM — 가이드 챗봇과 같은 Ollama 서버를 쓴다(기본 모델도 같다: `OLLAMA_MODEL`, 운영은 gemma4:e4b).

느려지지 않게 지키는 것
- **모델을 하나만 쓴다.** `AGENT_OLLAMA_MODEL` 을 비워 두면 가이드 챗봇과 같은 모델이라, 이미 메모리에 올라와 있어 바로 답한다.
  다른 모델을 지정하면 GPU 메모리가 모자랄 때 두 모델이 서로 밀어내며 부를 때마다 다시 올라간다(수십 초).
- **`num_ctx` 를 가이드 챗봇과 똑같이 둔다.** Ollama 는 컨텍스트 길이가 바뀌면 같은 모델도 다시 올린다.
- **생각(thinking) 모드를 끈다**(`reasoning=False`) — 켜면 토큰을 생각에 다 써 답이 비고 느리다(가이드 챗봇에서 실측).
- 해설은 `num_predict` 를 짧게(`AGENT_SUMMARY_TOKENS`, 기본 260) 잡고 **스트리밍**으로 내보낸다 — 첫 글자가 바로 보인다.
- 작업 분류는 `format="json"` + 토큰 120 으로 짧게 끝낸다(규칙으로 못 정한 말에만 부른다).
"""
from __future__ import annotations

from langchain_core.language_models.chat_models import BaseChatModel

from ...config import Settings

PLANNER_TOKENS = 120


def make_agent_llm(settings: Settings, *, json_mode: bool = False) -> BaseChatModel | None:
    """json_mode=True 면 작업 분류용(짧은 JSON), False 면 해설용(스트리밍)."""
    max_tokens = PLANNER_TOKENS if json_mode else settings.agent_summary_tokens
    if settings.llm_provider == "ollama":
        from langchain_ollama import ChatOllama  # 쓸 때만 불러온다

        return ChatOllama(
            model=settings.agent_model_name,
            base_url=settings.ollama_base_url,
            num_ctx=settings.ollama_num_ctx,       # ★ 가이드 챗봇과 같은 값(다르면 모델을 다시 올린다)
            num_predict=max_tokens,
            temperature=0.0 if json_mode else 0.3,
            reasoning=False,                       # ★ 생각 모드 끄기
            keep_alive=settings.ollama_keep_alive,
            format="json" if json_mode else None,
            client_kwargs={"timeout": settings.ollama_timeout},
        )
    if settings.llm_provider == "anthropic" and settings.anthropic_api_key:
        from langchain_anthropic import ChatAnthropic

        return ChatAnthropic(
            model=settings.anthropic_model,
            api_key=settings.anthropic_api_key,
            max_tokens=max_tokens,
            timeout=40,
            max_retries=1,
        )
    return None
