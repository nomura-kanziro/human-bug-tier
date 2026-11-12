"""사이트 백엔드(Express) 조회 API 연결 — 에이전트 봇 도구가 게시판·공지를 읽을 때 쓰는 "연결" 층.

에이전트 봇은 MongoDB 에 직접 붙지 않는다(ai-service 규칙). 대신 사이트 백엔드가 에이전트 봇 전용으로 열어 둔
가벼운 조회 API(`/api/ai/agent/data/*` — 공개 글·공지의 필요한 필드만)를 HTTP 로 부른다.
  - 주소: `AGENT_SITE_API_URL`(기본 http://127.0.0.1:5000) — 같은 서버 안쪽 주소만 쓴다.
  - `AI_SERVICE_KEY` 가 있으면 X-AI-Key 헤더로 붙여 보낸다(백엔드는 이 키가 맞는 요청만 받는다).
  - 표준 라이브러리(urllib)만 써서 의존성을 늘리지 않는다.
연결 실패·시간 초과는 SiteApiError 로 바꿔 던지고, 부르는 쪽(repository)이 "지금은 불러올 수 없음"으로 처리한다.
"""
from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request


class SiteApiError(RuntimeError):
    """사이트 백엔드에서 자료를 가져오지 못했다."""


class SiteApi:
    def __init__(self, base_url: str, *, key: str = "", timeout: float = 6.0):
        self.base_url = base_url.rstrip("/")
        self.key = key
        self.timeout = timeout

    def get_json(self, path: str, params: dict | None = None):
        query = urllib.parse.urlencode({k: v for k, v in (params or {}).items() if v not in (None, "")})
        url = f"{self.base_url}{path}{'?' + query if query else ''}"
        request = urllib.request.Request(url, headers={"Accept": "application/json"})
        if self.key:
            request.add_header("X-AI-Key", self.key)
        try:
            with urllib.request.urlopen(request, timeout=self.timeout) as res:
                return json.load(res)
        except (urllib.error.URLError, OSError, ValueError, TimeoutError) as err:
            raise SiteApiError(type(err).__name__) from err
