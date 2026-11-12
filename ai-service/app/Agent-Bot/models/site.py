"""사이트에서 읽어 온 자료의 모양 — 게시판 글 · 공지.

백엔드가 주는 JSON 을 그대로 돌리지 않고 필요한 값만 이 모양으로 옮겨 담는다(필드가 빠져 있어도 죽지 않게).
"""
from __future__ import annotations

from dataclasses import dataclass


def _text(value, limit: int) -> str:
    return str(value or "").strip()[:limit]


def _count(value) -> int:
    try:
        return max(0, int(value))
    except (TypeError, ValueError):
        return 0


@dataclass(frozen=True)
class BoardPost:
    id: str
    title: str
    author: str
    description: str
    likes: int
    views: int
    created_at: str      # ISO 날짜 문자열(백엔드가 준 그대로)

    @classmethod
    def from_json(cls, raw: dict) -> "BoardPost":
        return cls(
            id=_text(raw.get("id") or raw.get("_id"), 40),
            title=_text(raw.get("title"), 120) or "(제목 없음)",
            author=_text(raw.get("author"), 60),
            description=_text(raw.get("description"), 200),
            likes=_count(raw.get("likes", raw.get("likeCount"))),
            views=_count(raw.get("views", raw.get("viewCount"))),
            created_at=_text(raw.get("createdAt"), 40),
        )

    @property
    def link(self) -> str:
        return f"/board/post?id={self.id}"

    def to_card(self) -> dict:
        return {"id": self.id, "title": self.title, "author": self.author, "description": self.description,
                "likes": self.likes, "views": self.views, "date": self.created_at[:10], "link": self.link}


@dataclass(frozen=True)
class SiteNotice:
    id: str
    title: str
    category: str        # notice | news
    pinned: bool
    excerpt: str         # 본문 앞부분(태그 뺀 글자)
    created_at: str

    @classmethod
    def from_json(cls, raw: dict) -> "SiteNotice":
        return cls(
            id=_text(raw.get("id") or raw.get("_id"), 40),
            title=_text(raw.get("title"), 160) or "(제목 없음)",
            category="news" if raw.get("category") == "news" else "notice",
            pinned=bool(raw.get("pinned", raw.get("isPinned"))),
            excerpt=_text(raw.get("excerpt"), 400),
            created_at=_text(raw.get("createdAt"), 40),
        )

    @property
    def link(self) -> str:
        return f"/notice/{self.id}"

    @property
    def category_label(self) -> str:
        return "새 소식" if self.category == "news" else "공지"

    def to_card(self) -> dict:
        return {"id": self.id, "title": self.title, "category": self.category_label, "pinned": self.pinned,
                "excerpt": self.excerpt[:140], "date": self.created_at[:10], "link": self.link}
