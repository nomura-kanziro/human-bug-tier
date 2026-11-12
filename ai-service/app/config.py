"""설정 — 환경 변수(또는 ai-service/.env)에서 읽는다.

.env 는 커밋하지 않는다(.env.example 만 공유). 값은 절대 로그로 출력하지 않는다.
"""
from __future__ import annotations

import os
import re
from dataclasses import dataclass
from pathlib import Path

SERVICE_DIR = Path(__file__).resolve().parent.parent   # ai-service/
REPO_ROOT = SERVICE_DIR.parent                          # 저장소 루트

PROVIDERS = ("ollama", "anthropic", "none")


def _clean_value(raw: str) -> str:
    """.env 값 정리 — 따옴표로 감싼 값은 그 안쪽 그대로, 아니면 `값   # 설명` 의 같은 줄 뒤 주석(공백 + #)을 뗀다.
    (.env.example 의 `OLLAMA_EMBED_MODEL=bge-m3      # 다국어…` 를 그대로 복사해 써도 값이 깨지지 않게)"""
    value = raw.strip()
    if value[:1] in ("'", '"'):
        end = value.find(value[0], 1)
        if end != -1:
            return value[1:end]
        return value[1:]
    return re.split(r"\s+#", value, maxsplit=1)[0].strip()


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
        if key and key not in os.environ:
            os.environ[key] = _clean_value(value)


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


def _timeout(env_key: str, default: int) -> float | None:
    """초 단위. 0 이하(또는 'off')면 None = 제한 없음."""
    raw = os.environ.get(env_key, "").strip().lower()
    if not raw:
        return float(default)
    if raw in ("off", "none", "false"):
        return None
    try:
        value = float(raw)
    except ValueError:
        return float(default)
    return value if value > 0 else None


def _bool(env_key: str, default: bool) -> bool:
    raw = os.environ.get(env_key, "").strip().lower()
    if not raw:
        return default
    return raw not in ("0", "false", "no", "off")


@dataclass(frozen=True)
class Settings:
    # --- 답변 생성 LLM ---
    llm_provider: str           # 'ollama'(기본, 내 PC GPU) | 'anthropic'(Claude API) | 'none'(문서 검색 답만)
    max_tokens: int             # 답변 최대 토큰
    ollama_base_url: str        # Ollama 서버 주소
    ollama_model: str           # 생성 모델(기본 gemma4:12b — 12GB GPU)
    ollama_num_ctx: int         # Ollama 컨텍스트 길이(프롬프트가 3~4천 토큰이라 8192 이상 필요)
    ollama_keep_alive: str      # 모델을 메모리에 붙들어 두는 시간(첫 호출 지연 방지)
    ollama_timeout: float | None  # Ollama 응답을 기다리는 최대 시간(초). None 이면 제한 없음(OLLAMA_TIMEOUT=0)
    anthropic_api_key: str
    anthropic_model: str
    # --- 임베딩 · 벡터 검색(ChromaDB) ---
    embed_model: str            # Ollama 임베딩 모델(기본 bge-m3, 1024차원)
    warmup: bool                # 서비스가 뜰 때 Ollama 모델을 미리 불러 둘지(첫 질문 지연 방지)
    vector_enabled: bool        # False 면 BM25 만 쓴다
    chroma_dir: Path            # ChromaDB 저장 폴더(gitignore)
    # --- 지식 ---
    knowledge_dir: Path         # 사이트 지식 문서(마크다운) 폴더
    tiers_json: Path            # 공식 티어표 정본(root-cloudflare/src/data/tiers.json)
    # --- 공용 ---
    service_key: str            # Express 프록시와 공유하는 키(X-AI-Key). 비우면 검사 안 함(로컬 개발용)
    top_k: int                  # RAG 검색 문서 수
    history_turns: int          # LLM 에 넘길 최근 대화 수(메시지 단위)
    # --- Oracle 저장(둘 다 기본 꺼짐 — 켜도 ORACLE_USER/PASSWORD/DSN 이 없으면 저장하지 않는다) ---
    store_stats: bool = False   # 사용 통계(질문·답변 내용 제외)를 hbt_chat_stat 에 남길지
    store_chat: bool = False    # 질문·답변 원문을 hbt_chat_log 에 남길지(개인정보 안내 문구와 함께 켜야 한다)
    chat_retention_days: int = 30   # 대화 원문 보관 일수 — 지나면 자동 삭제
    # --- 에이전트 봇(app/Agent-Bot) ---
    agent_model: str = ""           # 에이전트 봇 생성 모델(Ollama). 비우면 가이드 챗봇과 같은 모델(ollama_model)을 쓴다 — 모델을 두 개 올리면 GPU 에서 서로 밀어내 느려진다
    agent_summary_tokens: int = 260  # 에이전트 봇 해설(스트리밍) 최대 토큰 — 짧게 잡아 빨리 끝낸다
    site_api_url: str = "http://127.0.0.1:5000"   # 에이전트 봇 도구가 게시판·공지를 읽어 오는 사이트 백엔드(Express) 주소
    site_api_timeout: float = 6.0   # 사이트 백엔드 응답을 기다리는 최대 시간(초)

    @property
    def llm_enabled(self) -> bool:
        """LLM 을 쓰도록 설정돼 있는지(ollama 는 켜져 있는지까지는 호출할 때 확인하고, 실패하면 문서 답으로 대신한다)."""
        if self.llm_provider == "ollama":
            return True
        if self.llm_provider == "anthropic":
            return bool(self.anthropic_api_key)
        return False

    @property
    def model(self) -> str:
        """지금 쓰는 생성 모델 이름."""
        return self.anthropic_model if self.llm_provider == "anthropic" else self.ollama_model

    @property
    def agent_model_name(self) -> str:
        """에이전트 봇이 쓰는 생성 모델 이름(따로 정하지 않으면 가이드 챗봇과 같다)."""
        if self.llm_provider == "anthropic":
            return self.anthropic_model
        return self.agent_model or self.ollama_model


def load_settings() -> Settings:
    _load_dotenv(SERVICE_DIR / ".env")
    provider = os.environ.get("AI_LLM_PROVIDER", "ollama").strip().lower()
    if provider not in PROVIDERS:
        provider = "ollama"
    return Settings(
        llm_provider=provider,
        max_tokens=_int("AI_MAX_TOKENS", 700, 100, 4000),
        ollama_base_url=os.environ.get("OLLAMA_BASE_URL", "http://127.0.0.1:11434").strip().rstrip("/") or "http://127.0.0.1:11434",
        ollama_model=os.environ.get("OLLAMA_MODEL", "gemma4:12b").strip() or "gemma4:12b",
        ollama_num_ctx=_int("OLLAMA_NUM_CTX", 8192, 2048, 65536),
        ollama_keep_alive=os.environ.get("OLLAMA_KEEP_ALIVE", "30m").strip() or "30m",
        ollama_timeout=_timeout("OLLAMA_TIMEOUT", 180),
        anthropic_api_key=os.environ.get("ANTHROPIC_API_KEY", "").strip(),
        # 예전 변수 AI_MODEL 도 받는다(Claude 모델 이름이었다)
        anthropic_model=(os.environ.get("ANTHROPIC_MODEL") or os.environ.get("AI_MODEL") or "claude-sonnet-5-5").strip(),
        embed_model=os.environ.get("OLLAMA_EMBED_MODEL", "bge-m3").strip() or "bge-m3",
        warmup=_bool("AI_WARMUP", True),
        vector_enabled=_bool("AI_VECTOR_ENABLED", True),
        chroma_dir=_path("CHROMA_DIR", SERVICE_DIR / "data" / "chroma"),
        knowledge_dir=_path("AI_KNOWLEDGE_DIR", SERVICE_DIR / "knowledge"),
        tiers_json=_path("AI_TIERS_JSON", REPO_ROOT / "root-cloudflare" / "src" / "data" / "tiers.json"),
        service_key=os.environ.get("AI_SERVICE_KEY", "").strip(),
        top_k=_int("AI_TOP_K", 5, 1, 12),
        history_turns=_int("AI_HISTORY_TURNS", 6, 0, 20),
        store_stats=_bool("AI_STORE_STATS", False),
        store_chat=_bool("AI_STORE_CHAT", False),
        chat_retention_days=_int("AI_CHAT_RETENTION_DAYS", 30, 1, 365),
        agent_model=os.environ.get("AGENT_OLLAMA_MODEL", "").strip(),
        agent_summary_tokens=_int("AGENT_SUMMARY_TOKENS", 260, 60, 1200),
        site_api_url=os.environ.get("AGENT_SITE_API_URL", "http://127.0.0.1:5000").strip().rstrip("/") or "http://127.0.0.1:5000",
        site_api_timeout=float(_int("AGENT_SITE_API_TIMEOUT", 6, 1, 60)),
    )
