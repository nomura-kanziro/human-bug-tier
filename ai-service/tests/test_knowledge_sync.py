"""지식 문서 ↔ 서버 코드 동기화 테스트 — 사이트 규칙(확률·포인트·배수·한도)이 바뀌었는데 knowledge/*.md 를 안 고치면 여기서 실패한다.

AI 가 옛 규칙을 자신 있게 답하는 것을 막는 안전장치다. backend/ 코드가 없는 환경(운영 패키지 등)에서는 건너뛴다.
"""
from __future__ import annotations

import re
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
BACKEND = ROOT / "backend"
KNOW = Path(__file__).resolve().parents[1] / "knowledge"

pytestmark = pytest.mark.skipif(not BACKEND.is_dir(), reason="backend/ 코드가 없는 환경")


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def knowledge(name: str) -> str:
    return read(KNOW / name)


def num(x: float) -> str:
    """JS 숫자 → 문서 표기(정수는 소수점 없이)."""
    return str(int(x)) if float(x) == int(x) else str(x)


def js_object(src: str, name: str) -> str:
    m = re.search(rf"const {name} = \{{(.*?)\n\}};", src, re.S) or re.search(rf"const {name} = \{{(.*?)\}};", src, re.S)
    assert m, f"{name} 를 못 찾음"
    return m.group(1)


def test_daily_tier_probabilities_and_points():
    src = read(BACKEND / "controllers" / "luckDrawController.js")
    weights = dict(re.findall(r"(\d):\s*(\d+)", re.search(r"DAILY_TIER_WEIGHTS = \{(.*?)\};", src).group(1)))
    points = dict(re.findall(r"(\d):\s*(-?\d+)", re.search(r"POINTS_TABLE = \{(.*?)\};", src).group(1)))
    assert len(weights) == 9 and len(points) == 9
    text = knowledge("05-luck-draw.md")
    for t, w in weights.items():
        assert f"{t}티어 {w}%" in text, f"확률 {t}티어 {w}%"
    for t, p in points.items():
        assert f"{t}티어 {int(p):+d}" in text, f"포인트 {t}티어 {int(p):+d}"
    limit = int(re.search(r"MEMBER_DAILY_LIMIT = (\d+)", src).group(1))
    minutes = int(re.search(r"MEMBER_COOLDOWN_MS = (\d+) \* 60 \* 1000", src).group(1))
    assert f"하루 최대 {limit}회" in text and f"{minutes}분" in text


def test_poker_hands_and_multipliers():
    src = read(BACKEND / "controllers" / "luckPokerController.js")
    hands = re.findall(r"mult:\s*([\d.]+),\s*label:\s*'([^']+)'", re.search(r"const HANDS = \{(.*?)\n\};", src, re.S).group(1))
    assert len(hands) >= 15
    text = knowledge("05-luck-draw.md")
    for mult, label in hands:
        assert f"{label} {num(float(mult))}" in text, f"족보 {label} 배수 {num(float(mult))} 가 지식 문서에 없음"


def test_ladder_multipliers():
    src = read(BACKEND / "controllers" / "luckLadderController.js")
    group = re.search(r"GROUP_MULT = ([\d.]+)", src).group(1)
    parity = re.search(r"PARITY_MULT = ([\d.]+)", src).group(1)
    exact = {int(k): float(v) for k, v in re.findall(r"(\d):\s*([\d.]+)", re.search(r"EXACT_MULT = \{(.*?)\};", src).group(1))}
    text = knowledge("05-luck-draw.md")
    assert f"×{group}" in text and f"×{parity}" in text
    assert f"1티어 {num(exact[1])}" in text and f"2·3티어 {num(exact[2])}" in text
    assert f"4~6티어 {num(exact[4])}" in text and f"7~9티어 {num(exact[7])}" in text


def test_attendance_rewards():
    src = read(BACKEND / "utils" / "attendance.js")
    rewards = [int(x) for x in re.search(r"ATTENDANCE_REWARDS = \[(.*?)\]", src).group(1).split(",")]
    assert len(rewards) == 7
    text = knowledge("07-account-mypage.md")
    expect = ", ".join(f"{i}일 {r}" for i, r in enumerate(rewards, start=1))
    assert expect in text, f"출석 포인트 문서 표기가 코드와 다름: {expect}"
    faq = knowledge("09-faq.md")
    for i, r in enumerate(rewards, start=1):
        assert f"{i}일차 {r}" in faq or f"{i}일차 {r}포인트" in faq, f"FAQ 출석 {i}일차 {r}"


def test_quiz_prize_table():
    src = read(BACKEND / "controllers" / "eventController.js")
    rows = re.findall(r"\{ min: (\d+), max: (\d+), weight: (\d+) \}", re.search(r"QUIZ_PRIZE_TABLE = \[(.*?)\];", src, re.S).group(1))
    assert len(rows) == 7
    text = knowledge("06-events.md")
    for lo, hi, w in rows:
        pct = int(w) / 10
        assert f"{lo}~{hi}P {num(pct)}%" in text, f"퀴즈 상금 {lo}~{hi}P {num(pct)}%"
    assert "1~1000포인트" in text


def test_ids_and_limits_mentioned_in_knowledge():
    """닉네임 7일 · 자동 로그아웃 1시간 · 질문 500자 · 요청 제한 같은 값이 코드와 같은지."""
    auth = read(ROOT / "root-cloudflare" / "src" / "context" / "AuthContext.jsx")
    assert "SESSION_TIMEOUT_MS = 60 * 60 * 1000" in auth and "1시간" in knowledge("07-account-mypage.md")
    routes = read(BACKEND / "routes" / "aiRoutes.js")
    assert "MAX_MESSAGE = 500" in routes and "CHAT_LIMIT = 20" in routes
    assert "10분에 20번" in knowledge("12-troubleshooting.md") and "500자" in knowledge("12-troubleshooting.md")


def test_agent_bot_costs_and_limits():
    """에이전트 봇 요금(작업 강도별 포인트)·요청 한도가 지식 문서·ai-service 작업 목록과 같은지."""
    src = read(BACKEND / "controllers" / "aiAgentController.js")
    costs = {k: int(v) for k, v in re.findall(r"(\w+):\s*(\d+)", re.search(r"AGENT_COSTS = \{(.*?)\};", src).group(1))}
    assert set(costs) == {"free", "light", "normal", "heavy"} and costs["free"] == 0
    limit = int(re.search(r"RUN_LIMIT = (\d+)", src).group(1))
    minutes = int(re.search(r"RUN_WINDOW_MS = (\d+) \* 60 \* 1000", src).group(1))
    assert "MAX_MESSAGE = 500" in src
    expect = [f"가벼운 작업 {costs['light']}P", f"보통 작업 {costs['normal']}P", f"무거운 작업 {costs['heavy']}P"]
    for name in ("08-guide-and-ai.md", "09-faq.md"):
        text = knowledge(name)
        for phrase in expect:
            assert phrase in text, f"{name}: {phrase}"
        assert f"어떤 작업이든 {costs['light']}P만" in text, f"{name}: AI 서버 OFF 요금"
    guide = knowledge("08-guide-and-ai.md")
    assert f"{minutes}분에 {limit}번" in guide and "500자" in guide
    assert f"{costs['light']}P, {costs['normal']}P, {costs['heavy']}P" in knowledge("05-luck-draw.md")
    # 지식 문서가 말하는 작업 이름이 실제 작업 목록(ai-service)과 같아야 한다
    from app.agent_loader import load_agent_bot

    load_agent_bot()
    from app.agent_bot.service.planner import TASKS

    for _level, label, _desc, _example in TASKS.values():
        assert label in guide, f"작업 이름: {label}"
    levels = {task: level for task, (level, *_rest) in TASKS.items()}
    assert levels["search"] == "light" and levels["tier_build"] == "heavy"
