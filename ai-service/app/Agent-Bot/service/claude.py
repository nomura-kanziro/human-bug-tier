"""Claude 엔진 — 에이전트 봇에서 회원이 고른 Claude 모델·effort 로 해설(스트리밍)과 작업 분류를 한다.

무료 엔진(Ollama)과 달리 호출마다 Anthropic API 비용이 든다. 그래서 사이트 백엔드가 "휴버토큰"을 받고 부른다
(요금표는 `backend/utils/aiTokens.js` — 여기 `CLAUDE_MODELS` 의 모델 ID 와 같아야 한다. `tests/test_knowledge_sync.py` 가 대조).

공식 Anthropic SDK(`anthropic`)를 쓴다. 키는 `ai-service/.env` 의 `ANTHROPIC_API_KEY`(없으면 Claude 엔진은 꺼진 것으로 본다).
모델마다 다른 점(2026-11 기준):
  - effort(`output_config.effort`: low·medium·high·xhigh) — Haiku 4.5 는 지원하지 않아 보내지 않는다.
  - 생각(thinking)은 따로 설정하지 않는다. 최신 모델은 알아서(adaptive) 하고, Fable·Opus 5.5 는 끌 수도 없다.
    `budget_tokens`·`temperature` 는 최신 모델에서 400 이라 보내지 않는다.
  - 안전 분류기가 거절(`stop_reason: "refusal"`)할 수 있는 모델은 서버 쪽 대체 실행(fallbacks)을 켠다.
    대체 실행 요청이 거절되면(SDK·계정이 그 베타를 모르는 경우) 같은 요청을 대체 실행 없이 한 번 더 보낸다.
실패하면 예외를 올린다 — 부르는 쪽(agent_service)이 정해진 해설로 대신하고, 백엔드가 휴버토큰을 돌려준다.
"""
from __future__ import annotations

import logging
from collections.abc import Iterator

from ...config import Settings

log = logging.getLogger("ai-service.agent_bot.claude")

# 고를 수 있는 Claude 모델(모델 ID 그대로) → effort 지원 여부
CLAUDE_MODELS: dict[str, bool] = {
    "claude-haiku-5-5": True,
    "claude-haiku-4-5": False,
    "claude-sonnet-5-5": True,
    "claude-sonnet-5": True,
    "claude-opus-5-5": True,
    "claude-opus-5": True,
    "claude-fable-5-2": True,
    "claude-fable-5-1": True,
}
EFFORTS = ("low", "medium", "high", "xhigh")
DEFAULT_MODEL = "claude-sonnet-5-5"
DEFAULT_EFFORT = "medium"

# 안전 분류기 거절에 대비해 서버 쪽 대체 실행을 켜는 모델
_FALLBACK_MODELS = frozenset({"claude-fable-5-2", "claude-fable-5-1", "claude-opus-5-5", "claude-opus-5", "claude-sonnet-5-5"})
_FALLBACK_BETA = "server-side-fallback-2026-07-01"

WRITE_MAX_TOKENS = 4000     # 해설은 짧지만 생각 토큰이 여기에 같이 들어가므로 넉넉히 둔다
PLAN_MAX_TOKENS = 1024
TIMEOUT_SECONDS = 120.0


class ClaudeUnavailable(RuntimeError):
    """Claude 엔진을 쓸 수 없다(키 없음 · 모르는 모델)."""


class ClaudeRefused(RuntimeError):
    """모델이 요청을 거절했다."""


def claude_enabled(settings: Settings) -> bool:
    return bool(settings.anthropic_api_key)


def normalize_choice(model: str | None, effort: str | None) -> tuple[str, str | None]:
    """모델·effort 를 허용된 값으로 맞춘다. effort 를 지원하지 않는 모델이면 effort 는 None."""
    chosen = model if model in CLAUDE_MODELS else DEFAULT_MODEL
    if not CLAUDE_MODELS[chosen]:
        return chosen, None
    return chosen, effort if effort in EFFORTS else DEFAULT_EFFORT


def make_client(settings: Settings):
    if not claude_enabled(settings):
        raise ClaudeUnavailable("ANTHROPIC_API_KEY 가 없습니다.")
    import anthropic  # 쓸 때만 불러온다(키 없이 도는 환경에서 임포트 비용을 내지 않게)

    return anthropic.Anthropic(api_key=settings.anthropic_api_key, timeout=TIMEOUT_SECONDS, max_retries=1)


def _params(model: str, effort: str | None, system: str, messages: list[dict], max_tokens: int) -> dict:
    params: dict = {"model": model, "max_tokens": max_tokens, "system": system, "messages": messages}
    if effort:
        params["output_config"] = {"effort": effort}
    return params


def _check_stop(message) -> None:
    if getattr(message, "stop_reason", None) == "refusal":
        raise ClaudeRefused("모델이 요청을 거절했습니다.")


def stream_text(client, model: str, effort: str | None, system: str, messages: list[dict]) -> Iterator[str]:
    """해설 글자를 나오는 대로 내놓는다. messages 는 [{"role": "user"|"assistant", "content": str}, ...]."""
    import anthropic

    params = _params(model, effort, system, messages, WRITE_MAX_TOKENS)
    sent = False
    if model in _FALLBACK_MODELS:
        try:
            with client.beta.messages.stream(**params, betas=[_FALLBACK_BETA], fallbacks="default") as stream:
                for text in stream.text_stream:
                    sent = True
                    yield text
                _check_stop(stream.get_final_message())
            return
        except (anthropic.BadRequestError, TypeError) as err:
            # 대체 실행(베타)을 받지 않는 SDK·계정 — 글자가 나가기 전이면 같은 요청을 대체 실행 없이 다시 보낸다
            if sent:
                raise
            log.info("대체 실행 없이 다시 시도: %s", type(err).__name__)
    with client.messages.stream(**params) as stream:
        yield from stream.text_stream
        _check_stop(stream.get_final_message())


def complete_text(client, model: str, effort: str | None, system: str, user: str) -> str:
    """짧은 답 하나(작업 분류 JSON)를 받는다. effort 는 가장 낮게 — 분류에 깊은 생각이 필요 없다."""
    low = "low" if effort else None
    message = client.messages.create(**_params(model, low, system, [{"role": "user", "content": user}], PLAN_MAX_TOKENS))
    _check_stop(message)
    return "".join(block.text for block in message.content if getattr(block, "type", "") == "text")
