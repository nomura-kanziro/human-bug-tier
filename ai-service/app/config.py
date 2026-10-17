"""설정 — 환경 변수(또는 ai-service/.env)에서 읽는다.

.env 는 커밋하지 않는다(.env.example 만 공유). 값은 절대 로그로 출력하지 않는다.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

SERVICE_DIR = Path(__file__).resolve().parent.parent   # ai-service/
REPO_ROOT = SERVICE_DIR.parent                          # 저장소 루트


def _load_dotenv(path: Path) -> None:
    """아주 단순한 .env 로더 — 이미 환경 변수에 있는 키는 덮어쓰지 않는다(운영 환경 변수 우선)."""
    if not path.is_file():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def _path(env_key: str, default: Path) -> Path:
    raw = os.environ.get(env_key, "").strip()
    if not raw:
        return default
    p = Path(raw)
    return p if p.is_absolute() else (SERVICE_DIR / p).resolve()


def _int(env_key: str, default: int, low: int, high: int) -> int:
    try:
        value = int(os.environ.get(env_key, default))
    except ValueError:
        value = default
    return max(low, min(high, value))


@dataclass(frozen=True)
class Settings:
    anthropic_api_key: str      # 없으면 LLM 없이 "문서 검색 답변"(fallback)으로 동작
    model: str                  # Claude 모델 ID
    max_tokens: int             # 답변 최대 토큰
    knowledge_dir: Path         # 사이트 지식 문서(마크다운) 폴더
    tiers_json: Path            # 공식 티어표 정본(root-cloudflare/src/data/tiers.json)
    service_key: str            # Express 프록시와 공유하는 키(X-AI-Key). 비우면 검사 안 함(로컬 개발용)
    top_k: int                  # RAG 검색 문서 수
    history_turns: int          # LLM 에 넘길 최근 대화 수(메시지 단위)

    @property
    def llm_enabled(self) -> bool:
        return bool(self.anthropic_api_key)


def load_settings() -> Settings:
    _load_dotenv(SERVICE_DIR / ".env")
    return Settings(
        anthropic_api_key=os.environ.get("ANTHROPIC_API_KEY", "").strip(),
        model=os.environ.get("AI_MODEL", "claude-opus-5-5").strip() or "claude-opus-5-5",
        max_tokens=_int("AI_MAX_TOKENS", 700, 100, 4000),
        knowledge_dir=_path("AI_KNOWLEDGE_DIR", SERVICE_DIR / "knowledge"),
        tiers_json=_path("AI_TIERS_JSON", REPO_ROOT / "root-cloudflare" / "src" / "data" / "tiers.json"),
        service_key=os.environ.get("AI_SERVICE_KEY", "").strip(),
        top_k=_int("AI_TOP_K", 5, 1, 12),
        history_turns=_int("AI_HISTORY_TURNS", 6, 0, 20),
    )
