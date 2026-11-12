"""공식 티어표 카탈로그 — 에이전트 봇의 도구들이 캐릭터·등급 구조를 알기 위해 쓰는 읽기 전용 자료.

정본은 `root-cloudflare/src/data/tiers.json` 이다(가이드 챗봇과 같은 파일). 파일 읽기와 이름 찾기는 가이드 챗봇의
검증된 코드(`guidans_Chat/service/knowledge.py` 의 load_tiers · CharacterIndex)를 그대로 불러 쓴다 — 같은 일을 두 번 만들지 않는다.

커스텀 메이커의 칸 이름은 `"<0부터 시작하는 등급 번호>_<세부등급>"` 이다(프론트 `src/lib/makerState.js` zoneKey 와 같은 규칙).
예) 1티어 갑급 → "0_갑급", 9티어 → "8_미묘사 인원들". 세부등급 이름의 줄바꿈은 프론트와 똑같이 공백 하나로 편다(load_tiers 가 처리).
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

from ...guidans_Chat.service.knowledge import Character, CharacterIndex, compact, load_tiers


def zone_key(tier: int, grade: str) -> str:
    return f"{tier - 1}_{grade}"


def parse_zone_key(key: str) -> tuple[int, str] | None:
    """ "0_갑급" → (1, "갑급"). 모양이 다르면 None."""
    head, sep, grade = str(key).partition("_")
    if not sep or not head.isdigit():
        return None
    return int(head) + 1, grade.strip()


@dataclass
class Catalog:
    characters: list[Character]
    tiers: dict[int, dict]                       # {1: {"title": "...", "rows": [(세부등급, [이름...]), ...]}, ...}
    index: CharacterIndex = field(init=False)
    by_name: dict[str, Character] = field(init=False)     # 표기 이름 그대로(별표 포함) → 캐릭터
    by_plain: dict[str, Character] = field(init=False)    # 비교용(공백·기호 뺀) 이름 → 캐릭터

    def __post_init__(self) -> None:
        self.index = CharacterIndex(self.characters)
        self.by_name = {}
        self.by_plain = {}
        for c in self.characters:
            self.by_name.setdefault(c.name, c)
            self.by_plain.setdefault(compact(c.plain_name), c)

    @property
    def tier_numbers(self) -> list[int]:
        return sorted(self.tiers)

    def grades(self, tier: int) -> list[str]:
        return [grade for grade, _ in self.tiers[tier]["rows"]]

    def lookup(self, name: str) -> Character | None:
        """이름 하나(표기 그대로이거나 별표·공백이 조금 달라도)로 캐릭터를 찾는다."""
        return self.by_name.get(name) or self.by_plain.get(compact(name))

    def find_in_text(self, text: str, limit: int = 40) -> list[Character]:
        return self.index.find(text, limit=limit)

    def position(self, text: str, character: Character) -> tuple[int, int] | None:
        """문장 안에서 이 캐릭터 이름이 나온 자리(시작, 끝). 전체 이름이 없으면 이름의 한 부분으로 찾는다."""
        candidates = [character.plain_name] + [p for p in character.plain_name.split() if len(p) >= 2]
        for cand in candidates:
            # 글자 사이 공백은 있어도 없어도 맞게("츠루기시노부" = "츠루기 시노부")
            pattern = r"\s*".join(re.escape(ch) for ch in cand if not ch.isspace())
            m = re.search(pattern, text, re.IGNORECASE)
            if m:
                return m.start(), m.end()
        return None


def build_catalog(tiers_json: Path) -> Catalog:
    characters, tiers = load_tiers(tiers_json)
    return Catalog(characters=characters, tiers=tiers)
