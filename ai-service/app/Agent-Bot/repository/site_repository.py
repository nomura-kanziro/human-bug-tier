"""사이트 자료 조회 — 게시판 글 · 공지. 도구(service/tools)는 이 클래스만 부르고 HTTP 는 모른다.

백엔드의 에이전트 봇 전용 조회 API(`backend/routes/aiRoutes.js`)를 부른다:
  GET /api/ai/agent/data/posts?search=&sort=likes|recent&limit=    공개 글만(필요한 필드만 — 배치 데이터·썸네일 제외)
  GET /api/ai/agent/data/notices?search=&limit=                    공지·새 소식(본문은 앞부분만)
가져오지 못하면 SiteApiError 가 올라간다 — 도구가 잡아 "지금은 불러올 수 없어요"로 안내한다.
"""
from __future__ import annotations

from ..database import SiteApi
from ..models import BoardPost, SiteNotice

MAX_LIMIT = 30


def _limit(value: int) -> int:
    return max(1, min(MAX_LIMIT, int(value)))


class SiteRepository:
    def __init__(self, api: SiteApi):
        self.api = api

    def posts(self, *, search: str = "", sort: str = "recent", limit: int = 10) -> list[BoardPost]:
        data = self.api.get_json("/api/ai/agent/data/posts", {
            "search": search.strip()[:60],
            "sort": "likes" if sort == "likes" else "recent",
            "limit": _limit(limit),
        })
        rows = data.get("posts", []) if isinstance(data, dict) else []
        return [BoardPost.from_json(r) for r in rows if isinstance(r, dict)]

    def post_stats(self) -> dict:
        data = self.api.get_json("/api/ai/agent/data/posts", {"limit": 1})
        return {"total": int(data.get("total", 0))} if isinstance(data, dict) else {"total": 0}

    def notices(self, *, search: str = "", limit: int = 6) -> list[SiteNotice]:
        data = self.api.get_json("/api/ai/agent/data/notices", {"search": search.strip()[:60], "limit": _limit(limit)})
        rows = data.get("notices", []) if isinstance(data, dict) else []
        return [SiteNotice.from_json(r) for r in rows if isinstance(r, dict)]
