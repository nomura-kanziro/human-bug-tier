"""AI 서버(Ollama) ON/OFF 상태 — 켜져 있는지 미리 알아 두고, 꺼져 있으면 LLM 을 아예 부르지 않는다.

- ON/OFF 는 화면(`/ai`)이 "AI 서버 OFF 상태 (사이트의 정보내용을 끌어다 대답합니다.)" 알림을 띄우는 근거다.
- Ollama 는 `GET /api/tags`(2초 제한)로 확인하고 결과를 짧게(10초) 기억한다. 꺼져 있으면 질문마다 연결 시도를 기다리지 않고
  바로 지식 문서 답으로 간다(주소가 응답 없이 막혀 있어도 질문이 3분씩 걸리지 않게).
- LLM 호출이 실제로 실패하면 `failed()` 로 바로 OFF 로 바꾼다. 성공하면 `succeeded()` 로 ON.
- provider 가 anthropic 이면 키가 있을 때 ON(핑하지 않음), none 이면 항상 OFF.
"""
from __future__ import annotations

import json
import threading
import time
import urllib.error
import urllib.request
from dataclasses import dataclass

from ...config import Settings

PING_TIMEOUT = 2.0        # 초
ON_TTL = 10.0             # ON 으로 확인한 결과를 기억하는 시간(초)
OFF_TTL = 5.0             # OFF 는 더 짧게 — 켜지면 빨리 알아채게


@dataclass(frozen=True)
class AiStatus:
    on: bool
    reason: str = ""      # OFF 일 때: unreachable | model_missing | disabled | no_key

    @property
    def label(self) -> str:
        return "on" if self.on else "off"


def _model_present(names: list[str], wanted: str) -> bool:
    base = wanted.split(":", 1)[0]
    return any(n == wanted or (":" not in wanted and n.split(":", 1)[0] == base) for n in names)


class LlmStatus:
    def __init__(self, settings: Settings):
        self.settings = settings
        self._lock = threading.Lock()
        self._cached: AiStatus | None = None
        self._until = 0.0

    def _ping_ollama(self) -> AiStatus:
        s = self.settings
        try:
            with urllib.request.urlopen(f"{s.ollama_base_url}/api/tags", timeout=PING_TIMEOUT) as res:
                names = [m.get("name", "") for m in json.load(res).get("models", [])]
        except (urllib.error.URLError, OSError, ValueError, TimeoutError):
            return AiStatus(False, "unreachable")
        return AiStatus(True) if _model_present(names, s.ollama_model) else AiStatus(False, "model_missing")

    def _compute(self) -> AiStatus:
        s = self.settings
        if s.llm_provider == "ollama":
            return self._ping_ollama()
        if s.llm_provider == "anthropic":
            return AiStatus(True) if s.anthropic_api_key else AiStatus(False, "no_key")
        return AiStatus(False, "disabled")

    def _set(self, status: AiStatus) -> AiStatus:
        with self._lock:
            self._cached = status
            self._until = time.monotonic() + (ON_TTL if status.on else OFF_TTL)
        return status

    def get(self, *, force: bool = False) -> AiStatus:
        with self._lock:
            if not force and self._cached is not None and time.monotonic() < self._until:
                return self._cached
        return self._set(self._compute())

    def is_on(self) -> bool:
        return self.get().on

    def failed(self) -> None:
        """LLM 호출이 실패했을 때 — 다음 확인 때까지 OFF 로 본다."""
        self._set(AiStatus(False, "unreachable"))

    def succeeded(self) -> None:
        self._set(AiStatus(True))
