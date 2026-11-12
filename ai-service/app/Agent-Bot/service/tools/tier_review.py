"""도구: 내 티어표 분석 — 커스텀 메이커에 배치된 상태를 공식 티어표와 비교한다.

비교는 전부 계산이다(LLM 은 숫자를 건드리지 않고 해설만 쓴다):
  - 캐릭터마다 "공식 티어 − 내가 놓은 티어" → 양수면 공식보다 높게, 음수면 낮게 평가한 것
  - 일치율, 가장 크게 올린/내린 캐릭터, 티어별 인원, 아직 안 넣은 캐릭터 수
카탈로그에 없는 이름(옛 글·이벤트 캐릭터)은 비교에서 빼고 개수만 알려 준다.
"""
from __future__ import annotations

from ..catalog import Catalog, parse_zone_key

TOP_N = 6


def review_tier_list(maker: dict[str, list[str]], catalog: Catalog) -> dict:
    placed: list[dict] = []
    unknown = 0
    seen: set[str] = set()
    for key, names in (maker or {}).items():
        parsed = parse_zone_key(key)
        if not parsed or not isinstance(names, list):
            continue
        tier, grade = parsed
        for raw in names:
            c = catalog.lookup(str(raw))
            if not c:
                unknown += 1
                continue
            if c.name in seen:
                continue
            seen.add(c.name)
            placed.append({"name": c.plain_name, "tier": tier, "grade": grade, "official": c.tier, "diff": c.tier - tier})

    total = len(placed)
    same = [p for p in placed if p["diff"] == 0]
    raised = sorted((p for p in placed if p["diff"] > 0), key=lambda p: (-p["diff"], p["name"]))
    lowered = sorted((p for p in placed if p["diff"] < 0), key=lambda p: (p["diff"], p["name"]))
    by_tier: dict[int, int] = {}
    for p in placed:
        by_tier[p["tier"]] = by_tier.get(p["tier"], 0) + 1
    catalog_total = len(catalog.by_name)

    def card(p: dict) -> dict:
        return {"name": p["name"], "from": p["official"], "to": p["tier"], "diff": abs(p["diff"])}

    return {
        "total": total,
        "unknown": unknown,
        "unplaced": max(0, catalog_total - total),
        "catalog_total": catalog_total,
        "same": len(same),
        "match_rate": round(len(same) * 100 / total) if total else 0,
        "raised_count": len(raised),
        "lowered_count": len(lowered),
        "raised": [card(p) for p in raised[:TOP_N]],
        "lowered": [card(p) for p in lowered[:TOP_N]],
        "by_tier": [{"tier": t, "count": by_tier[t]} for t in sorted(by_tier)],
        "avg_shift": round(sum(p["diff"] for p in placed) / total, 2) if total else 0,
    }


def describe_review(r: dict) -> str:
    lines = [f"배치된 캐릭터 {r['total']}명을 공식 티어표와 비교했어요. 공식과 같은 티어는 {r['same']}명({r['match_rate']}%)이에요."]
    lines.append(f"공식보다 높게 둔 캐릭터 {r['raised_count']}명, 낮게 둔 캐릭터 {r['lowered_count']}명이에요.")
    if r["raised"]:
        lines.append("가장 많이 올린 캐릭터: " + ", ".join(f"{p['name']}(공식 {p['from']}티어 → {p['to']}티어)" for p in r["raised"][:3]))
    if r["lowered"]:
        lines.append("가장 많이 내린 캐릭터: " + ", ".join(f"{p['name']}(공식 {p['from']}티어 → {p['to']}티어)" for p in r["lowered"][:3]))
    if r["unplaced"]:
        lines.append(f"아직 넣지 않은 캐릭터가 {r['unplaced']}명 남아 있어요.")
    if r["unknown"]:
        lines.append(f"지금 공식 티어표에 없는 이름 {r['unknown']}개는 비교에서 뺐어요.")
    return "\n".join(lines)


def review_facts(r: dict) -> str:
    lines = [
        f"배치 인원 {r['total']}명 / 전체 캐릭터 {r['catalog_total']}명 (안 넣은 캐릭터 {r['unplaced']}명)",
        f"공식과 같은 티어: {r['same']}명 ({r['match_rate']}%)",
        f"공식보다 높게: {r['raised_count']}명, 낮게: {r['lowered_count']}명, 평균 이동 {r['avg_shift']:+}티어(양수 = 공식보다 높게 평가)",
        "티어별 인원: " + ", ".join(f"{b['tier']}티어 {b['count']}명" for b in r["by_tier"]),
    ]
    if r["raised"]:
        lines.append("많이 올린 캐릭터: " + ", ".join(f"{p['name']}(공식 {p['from']}→{p['to']}티어)" for p in r["raised"]))
    if r["lowered"]:
        lines.append("많이 내린 캐릭터: " + ", ".join(f"{p['name']}(공식 {p['from']}→{p['to']}티어)" for p in r["lowered"]))
    return "\n".join(lines)
