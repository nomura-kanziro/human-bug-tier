"""랜덤 추천 질문 — 화면에 3개를 띄워 눌러서 바로 물어보게 한다.

LLM 없이 만든다(빠르고 공짜). 캐릭터·티어 질문은 tiers.json 에서 매번 무작위로 뽑고,
사이트 이용 질문은 아래 목록에서 뽑는다. 세 개가 서로 다른 갈래(캐릭터 / 티어 / 사이트)가 되도록 섞는다.
"""
from __future__ import annotations

import random

from .knowledge import KnowledgeBase

SITE_QUESTIONS = [
    "출석체크 포인트는 어떻게 받아?",
    "커스텀 티어표는 어떻게 만들어?",
    "꾸미기에서 이펙트 색은 어떻게 바꿔?",
    "행운 티어 포커 족보 배수 알려줘",
    "랜덤 뽑기는 몇 분마다 열려?",
    "오늘의 행운 티어 확률이 어떻게 돼?",
    "매일 퀴즈 상금은 얼마까지 받을 수 있어?",
    "닉네임은 언제 바꿀 수 있어?",
    "가이드 모드는 어떻게 꺼?",
    "갑급 을급 병급 정급이 뭐야?",
    "게시판에서 특정 사람 글만 보려면?",
    "메모리 게임은 어떻게 참여해?",
    "로그인하면 뭘 더 할 수 있어?",
    "만든 티어표를 이미지로 저장하려면?",
    "티어표 공개 이벤트는 어떻게 참가해?",
]


def _josa(word: str, with_final: str, without_final: str) -> str:
    """받침 유무에 따라 조사를 고른다(은/는, 이/가)."""
    last = word.rstrip()[-1:] if word else ""
    if "가" <= last <= "힣":
        return with_final if (ord(last) - 0xAC00) % 28 else without_final
    return without_final


def random_questions(kb: KnowledgeBase, count: int = 3, rng: random.Random | None = None) -> list[str]:
    rng = rng or random.Random()
    pools: list[list[str]] = []

    chars = kb.characters.characters
    if chars:
        picks = rng.sample(chars, k=min(3, len(chars)))
        pools.append([f"{c.plain_name}{_josa(c.plain_name, '은', '는')} 몇 티어야?" for c in picks])
    if kb.tiers:
        nums = rng.sample(kb.tier_numbers, k=min(3, len(kb.tier_numbers)))
        pools.append([f"{n}티어에는 누가 있어?" if i % 2 == 0 else f"{n}티어는 어떤 등급이야?" for i, n in enumerate(nums)])
    pools.append(rng.sample(SITE_QUESTIONS, k=min(3, len(SITE_QUESTIONS))))

    out: list[str] = []
    # 갈래를 돌아가며 하나씩 — 3개면 캐릭터·티어·사이트가 하나씩 나온다
    i = 0
    while len(out) < count and any(pools):
        pool = pools[i % len(pools)]
        if pool:
            q = pool.pop(0)
            if q not in out:
                out.append(q)
        i += 1
    rng.shuffle(out)
    return out[:count]
