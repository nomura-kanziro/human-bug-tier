"""도구: 티어표 초안 만들기 — 조건(범위·이동·제외·랜덤)대로 커스텀 메이커에 올릴 배치를 만든다.

바탕은 항상 **공식 티어표**다. 300명이 넘는 캐릭터를 하나씩 끌어다 놓는 수고를 줄이는 게 목적이라,
"공식 그대로 깔고 → 범위를 좁히고 → 몇 명만 옮기거나 빼는" 흐름으로 만든다. 배치는 전부 규칙으로 계산한다(LLM 이 이름을 지어낼 수 없다).

결과의 `zones` 는 커스텀 메이커 저장 형식의 칸 이름 → 캐릭터 이름 목록이다. 이미지·id 는 프론트가 자기 카탈로그(tiers.json)로 다시 맞춘다
(`src/lib/makerState.js` rematchToCatalog). 그래서 여기서는 **카탈로그에 있는 표기 이름만** 내보낸다.
"""
from __future__ import annotations

import random

from ..catalog import Catalog, zone_key

DEFAULT_TITLE = "에이전트 봇 초안"


def _target_grade(catalog: Catalog, tier: int, wanted: str | None, original: str) -> str:
    """옮겨 갈 칸의 세부등급 — 지정했으면 그대로, 아니면 원래 세부등급을 유지하고, 그 티어에 없는 등급이면 맨 아래 칸."""
    grades = catalog.grades(tier)
    if wanted and wanted in grades:
        return wanted
    if original in grades:
        return original
    return grades[-1]


def build_tier_list(args: dict, catalog: Catalog, *, rng: random.Random | None = None, nickname: str = "") -> dict:
    rng = rng or random.Random()
    all_tiers = catalog.tier_numbers
    tiers = [t for t in args.get("tiers") or [] if t in catalog.tiers] or all_tiers
    only = [catalog.lookup(n) for n in args.get("only_names") or []]
    only_names = {c.name for c in only if c}
    notes: list[str] = []
    changes: list[str] = []

    # 1) 공식 배치에서 시작 — 칸마다 이름 목록
    placement: dict[tuple[int, str], list[str]] = {(t, g): [] for t in all_tiers for g in catalog.grades(t)}
    for t in all_tiers:
        for grade, names in catalog.tiers[t]["rows"]:
            for name in names:
                if only_names:
                    if name in only_names:
                        placement[(t, grade)].append(name)
                elif t in tiers:
                    placement[(t, grade)].append(name)

    if only_names:
        notes.append(f"지정한 캐릭터 {len(only_names)}명만 공식 위치에 넣었어요.")
    elif len(tiers) < len(all_tiers):
        notes.append(f"공식 티어표의 {_tier_span(tiers)} 캐릭터만 가져왔어요.")
    else:
        notes.append("공식 티어표 전체를 바탕으로 깔았어요.")

    # 2) 랜덤 — 고른 캐릭터를 섞어서, 캐릭터가 있던 칸들의 자리 수 그대로 다시 채운다(표 모양은 유지)
    if args.get("random"):
        slots = [(key, len(names)) for key, names in placement.items() if names]
        pool = [n for names in placement.values() for n in names]
        rng.shuffle(pool)
        cursor = 0
        for key, size in slots:
            placement[key] = pool[cursor:cursor + size]
            cursor += size
        notes.append("캐릭터를 무작위로 섞어 다시 배치했어요.")

    # 3) 이름별 지시 — 이동 · 한 단계 올리기/내리기 · 빼기
    where = {name: key for key, names in placement.items() for name in names}
    for op in args.get("ops") or []:
        c = catalog.lookup(op.get("name", ""))
        if not c:
            continue
        current = where.get(c.name)
        kind = op.get("op")
        if kind == "remove":
            if current:
                placement[current].remove(c.name)
                where.pop(c.name, None)
                changes.append(f"{c.plain_name} 제외")
            continue
        base_tier, base_grade = current or (c.tier, c.grade)
        if kind == "shift":
            tier = max(all_tiers[0], min(all_tiers[-1], base_tier + int(op.get("by", 0))))
            grade = _target_grade(catalog, tier, None, base_grade)
        elif kind == "move":
            tier = int(op.get("tier", base_tier))
            if tier not in catalog.tiers:
                continue
            grade = _target_grade(catalog, tier, op.get("grade"), base_grade)
        else:
            continue
        if current == (tier, grade):
            continue
        if current:
            placement[current].remove(c.name)
        placement[(tier, grade)].append(c.name)
        where[c.name] = (tier, grade)
        origin = f"{base_tier}티어 {base_grade}" if current else f"공식 {c.tier}티어 {c.grade}"
        changes.append(f"{c.plain_name}: {origin} → {tier}티어 {grade}")

    zones = {zone_key(t, g): names for (t, g), names in placement.items() if names}
    total = sum(len(v) for v in zones.values())
    table = []
    for t in all_tiers:
        rows = [{"grade": g, "names": [n.lstrip("*") for n in placement[(t, g)]]} for g in catalog.grades(t) if placement[(t, g)]]
        if rows:
            table.append({"tier": t, "title": catalog.tiers[t]["title"], "count": sum(len(r["names"]) for r in rows), "rows": rows})

    title = (args.get("title") or "").strip() or (f"{nickname}의 티어표 초안" if nickname else DEFAULT_TITLE)
    return {
        "title": title[:40],
        "zones": zones,
        "table": table,
        "total": total,
        "tier_count": len(table),
        "changes": changes[:40],
        "notes": notes,
        "random": bool(args.get("random")),
    }


def _tier_span(tiers: list[int]) -> str:
    """[1,2,3] → "1~3티어", [1,3,5] → "1·3·5티어"."""
    ordered = sorted(tiers)
    if len(ordered) >= 2 and ordered == list(range(ordered[0], ordered[-1] + 1)):
        return f"{ordered[0]}~{ordered[-1]}티어"
    return "·".join(str(t) for t in ordered) + "티어"


def describe_build(result: dict) -> str:
    """LLM 없이 쓰는 해설(AI 서버 OFF·LLM 실패 때)."""
    lines = [f"\"{result['title']}\" 초안을 만들었어요. 총 {result['total']}명을 {result['tier_count']}개 티어에 배치했어요."]
    lines.extend(result["notes"])
    if result["changes"]:
        lines.append("바꾼 곳: " + " / ".join(result["changes"][:8]) + (" …" if len(result["changes"]) > 8 else ""))
    lines.append("\"커스텀 메이커에서 열기\"를 누르면 이 배치가 그대로 올라가요. 거기서 더 고치고 PNG 저장·게시판 업로드까지 할 수 있어요.")
    return "\n".join(lines)


def build_facts(result: dict) -> str:
    """LLM 해설용 사실 묶음 — 이름을 전부 넘기면 느려지므로 요약만."""
    lines = [f"제목: {result['title']}", f"배치 인원: 총 {result['total']}명, {result['tier_count']}개 티어"]
    for row in result["table"]:
        sample = ", ".join(row["rows"][0]["names"][:3])
        lines.append(f"- {row['tier']}티어({row['title']}): {row['count']}명 (맨 위 칸: {sample} 등)")
    lines.extend(f"- {n}" for n in result["notes"])
    if result["changes"]:
        lines.append("바꾼 곳: " + " / ".join(result["changes"][:10]))
    return "\n".join(lines)
