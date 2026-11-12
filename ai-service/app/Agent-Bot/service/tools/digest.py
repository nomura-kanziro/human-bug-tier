"""도구: 게시판 · 공지 요약 — 인기/최신 티어표와 최근 공지를 모은다(요약 글은 LLM 이 쓴다).

검색(site_search)은 "이 말이 들어간 글"을 찾고, 요약(digest)은 검색어 없이 "요즘 무슨 글이 올라왔나"를 훑는다.
가져오지 못한 쪽은 failed 에 적고 나머지로 계속한다.
"""
from __future__ import annotations

from ...database import SiteApiError
from ...repository import SiteRepository

TOP = 5


def run_digest(args: dict, site: SiteRepository) -> dict:
    targets = args.get("targets") or ["board", "notice"]
    result: dict = {"targets": targets, "popular": [], "recent": [], "notices": [], "post_total": 0, "failed": []}
    if "board" in targets:
        try:
            result["popular"] = [p.to_card() for p in site.posts(sort="likes", limit=TOP)]
            result["recent"] = [p.to_card() for p in site.posts(sort="recent", limit=TOP)]
            result["post_total"] = site.post_stats()["total"]
        except SiteApiError:
            result["failed"].append("게시판")
    if "notice" in targets:
        try:
            result["notices"] = [n.to_card() for n in site.notices(limit=TOP)]
        except SiteApiError:
            result["failed"].append("공지")
    result["total"] = len(result["popular"]) + len(result["recent"]) + len(result["notices"])
    return result


def describe_digest(r: dict) -> str:
    lines = []
    if r["popular"]:
        top = r["popular"][0]
        lines.append(f"게시판에 공개 티어표가 {r['post_total']}개 있어요. 추천이 가장 많은 글은 \"{top['title']}\"({top['author']}, 추천 {top['likes']})이에요.")
    if r["recent"]:
        lines.append("최근 올라온 글: " + ", ".join(f"\"{p['title']}\"" for p in r["recent"][:3]))
    if r["notices"]:
        lines.append("최근 공지: " + ", ".join(f"\"{n['title']}\"" for n in r["notices"][:3]))
    if not lines:
        lines.append("지금은 모아 볼 글이 없어요.")
    if r["failed"]:
        lines.append(f"({' · '.join(r['failed'])} 자료는 지금 불러오지 못했어요.)")
    return "\n".join(lines)


def digest_facts(r: dict) -> str:
    lines = []
    if "board" in r["targets"]:
        lines.append(f"게시판 공개 티어표 수: {r['post_total']}")
        if r["popular"]:
            lines.append("[추천 많은 글]")
            lines.extend(f"- \"{p['title']}\" / 작성자 {p['author']} / 추천 {p['likes']} / 조회 {p['views']} / {p['date']}"
                         + (f" / 설명: {p['description'][:60]}" if p["description"] else "") for p in r["popular"])
        if r["recent"]:
            lines.append("[최근 글]")
            lines.extend(f"- \"{p['title']}\" / 작성자 {p['author']} / 추천 {p['likes']} / {p['date']}" for p in r["recent"])
    if "notice" in r["targets"] and r["notices"]:
        lines.append("[최근 공지·새 소식]")
        lines.extend(f"- ({n['category']}{' · 고정' if n['pinned'] else ''}) \"{n['title']}\" / {n['date']} / {n['excerpt'][:120]}" for n in r["notices"])
    if r["failed"]:
        lines.append(f"(불러오지 못한 자료: {', '.join(r['failed'])})")
    return "\n".join(lines) or "모은 자료 없음"
