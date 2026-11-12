"""도구: 사이트 통합 검색 — 캐릭터(공식 티어표) · 게시판 · 공지를 한 번에 찾는다.

가이드 챗봇과 다른 점: 가이드 챗봇은 캐릭터 한 명의 티어를 "말로" 알려 주고 게시판·공지의 실제 글은 모른다.
이 도구는 조건(이름 일부·티어·세부등급)으로 **여러 명을 목록으로** 뽑고, 게시판·공지의 **실제 글을 링크와 함께** 찾아 준다.
LLM 을 쓰지 않아 바로 끝난다(가벼움).
"""
from __future__ import annotations

from ....guidans_Chat.service.knowledge import compact
from ...database import SiteApiError
from ...repository import SiteRepository
from ..catalog import Catalog

MAX_CHARACTERS = 30
MAX_POSTS = 6
MAX_NOTICES = 5
MIN_TEXT_QUERY = 2      # 게시판·공지를 글자로 찾을 때 필요한 최소 글자 수


def _character_card(c) -> dict:
    return {"name": c.plain_name, "tier": c.tier, "grade": c.grade, "link": f"/tier/{c.tier}"}


def search_characters(args: dict, catalog: Catalog) -> tuple[list[dict], int]:
    """(보여 줄 카드, 조건에 맞는 전체 수)."""
    names = [catalog.lookup(n) for n in args.get("names") or []]
    hits = [c for c in names if c]
    tiers, grade = set(args.get("tiers") or []), args.get("grade") or ""
    key = compact(args.get("keyword") or "")
    if not hits:
        if tiers or grade:
            hits = [c for c in catalog.characters if (not tiers or c.tier in tiers) and (not grade or c.grade == grade)]
            if key:
                narrowed = [c for c in hits if key in compact(c.plain_name)]
                hits = narrowed or hits
        elif len(key) >= 1:
            hits = [c for c in catalog.characters if key in compact(c.plain_name)]
    # 같은 캐릭터가 두 번 나오지 않게
    seen, unique = set(), []
    for c in hits:
        if c.name not in seen:
            seen.add(c.name)
            unique.append(c)
    unique.sort(key=lambda c: (c.tier, c.order))
    return [_character_card(c) for c in unique[:MAX_CHARACTERS]], len(unique)


def run_search(args: dict, catalog: Catalog, site: SiteRepository) -> dict:
    targets = args.get("targets") or ["character", "board", "notice"]
    keyword = (args.get("keyword") or "").strip()
    # 게시판·공지는 글자로 찾는다 — 캐릭터 이름으로 물었으면 그 이름(첫 번째)을 검색어로 쓴다
    text_query = keyword or next((n.lstrip("*") for n in args.get("names") or []), "")
    if len(text_query) < MIN_TEXT_QUERY:
        text_query = ""        # 한 글자("류")로 글 본문을 뒤지면 "종류" 같은 말에 다 걸린다 — 캐릭터 이름 찾기에만 쓴다
    result: dict = {"keyword": keyword, "query": text_query, "characters": [], "character_total": 0, "posts": [], "notices": [], "failed": []}

    if "character" in targets:
        result["characters"], result["character_total"] = search_characters(args, catalog)
    if text_query and "board" in targets:
        try:
            result["posts"] = [p.to_card() for p in site.posts(search=text_query, sort="likes", limit=MAX_POSTS)]
        except SiteApiError:
            result["failed"].append("게시판")
    if text_query and "notice" in targets:
        try:
            result["notices"] = [n.to_card() for n in site.notices(search=text_query, limit=MAX_NOTICES)]
        except SiteApiError:
            result["failed"].append("공지")
    result["total"] = result["character_total"] + len(result["posts"]) + len(result["notices"])
    return result


def describe_search(r: dict) -> str:
    what = f"\"{r['query']}\"" if r["query"] else "조건"
    if not r["total"]:
        text = f"{what}에 맞는 결과를 찾지 못했어요. 다른 말로 다시 찾아보세요."
    else:
        parts = []
        if r["character_total"]:
            shown = len(r["characters"])
            parts.append(f"캐릭터 {r['character_total']}명" + (f"(앞 {shown}명 표시)" if shown < r["character_total"] else ""))
        if r["posts"]:
            parts.append(f"게시글 {len(r['posts'])}건")
        if r["notices"]:
            parts.append(f"공지 {len(r['notices'])}건")
        text = f"{what} 검색 결과예요 — " + " · ".join(parts) + ". 항목을 누르면 해당 화면으로 이동해요."
    if r["failed"]:
        text += f"\n({' · '.join(r['failed'])} 자료는 지금 불러오지 못했어요.)"
    return text
