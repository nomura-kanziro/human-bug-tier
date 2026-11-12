"""에이전트 봇 폴더(`Agent-Bot`)를 파이썬 패키지 `app.agent_bot` 으로 불러온다.

폴더 이름에 하이픈(`-`)이 있어 `import app.Agent-Bot` 처럼 쓸 수 없다. 폴더 이름(창시자가 정한 `Agent-Bot`)은 그대로 두고,
여기서 `importlib` 로 한 번 읽어 `sys.modules["app.agent_bot"]` 에 올린다. 그 뒤로는 어디서든
`from app.agent_bot.service.agent_service import AgentBotService` 처럼 평소대로 쓸 수 있고,
폴더 안의 상대 임포트(`from ...config import Settings`)도 `app` 패키지를 기준으로 그대로 동작한다.

main.py 와 테스트가 맨 먼저 `load_agent_bot()` 을 부른다(여러 번 불러도 한 번만 읽는다).
"""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path
from types import ModuleType

PACKAGE = "app.agent_bot"
FOLDER = Path(__file__).resolve().parent / "Agent-Bot"


def load_agent_bot() -> ModuleType:
    module = sys.modules.get(PACKAGE)
    if module is not None:
        return module
    spec = importlib.util.spec_from_file_location(
        PACKAGE, FOLDER / "__init__.py", submodule_search_locations=[str(FOLDER)],
    )
    if spec is None or spec.loader is None:
        raise ImportError(f"에이전트 봇 폴더를 불러올 수 없습니다: {FOLDER}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[PACKAGE] = module       # 실행 전에 올려 둬야 폴더 안의 하위 모듈 임포트가 이 패키지를 찾는다
    try:
        spec.loader.exec_module(module)
    except Exception:
        sys.modules.pop(PACKAGE, None)
        raise
    return module
