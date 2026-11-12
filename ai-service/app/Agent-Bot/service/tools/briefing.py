"""도구: 내 활동 브리핑 — 포인트·출석·오늘의 행운 티어·내 게시글 현황과 "오늘 할 만한 일".

값은 사이트 백엔드가 요청과 함께 보내 준 것(UserContext)만 쓴다 — 이 서비스는 회원 DB 를 직접 읽지 않고 토큰도 받지 않는다.
가이드 챗봇은 로그인 정보를 몰라 "규칙"만 설명하지만, 이 도구는 **내 현재 값**으로 답한다.
"""
from __future__ import annotations

from ...schema import UserContext


def run_briefing(user: UserContext) -> dict:
    points = user.points or 0
    left = max(0, user.daily_limit - user.today_draws) if user.daily_limit else None
    att = user.attendance
    cards = [
        {"label": "보유 포인트", "value": f"{points}P", "link": "/my-page"},
        {"label": "오늘의 행운 티어", "value": f"{user.today_draws}/{user.daily_limit}회" if user.daily_limit else f"{user.today_draws}회",
         "hint": f"{left}회 남음" if left is not None else "", "link": "/luck-draw#daily"},
        {"label": "출석체크", "value": ("오늘 완료" if att.today_done else "오늘 미완료") if att else "정보 없음",
         "hint": f"연속 {att.checked_days}일차" if att and att.checked_days else "", "link": "/my-page"},
        {"label": "내 게시글", "value": f"{user.post_count}개", "hint": f"추천 {user.post_likes} · 조회 {user.post_views}", "link": "/my-page"},
        {"label": "누적 뽑기", "value": f"{user.total_draws}회", "hint": f"최고 {user.best_tier}티어" if user.best_tier else "", "link": "/luck-draw#daily"},
    ]
    todo: list[str] = []
    if att and not att.today_done:
        todo.append(f"오늘 출석 보상이 아직 남아 있어요(다시 로그인하면 {att.next_day}일차 {att.next_reward}P).")
    if left:
        todo.append(f"오늘의 행운 티어를 {left}번 더 뽑을 수 있어요.")
    if points >= 10:
        todo.append("모은 포인트로 행운 티어 포커나 랜덤 뽑기에 도전해 볼 수 있어요.")
    if user.post_count == 0:
        todo.append("아직 올린 티어표가 없어요. \"티어표 만들어줘\"로 초안을 받아 커스텀 메이커에서 다듬어 보세요.")
    return {"nickname": user.nickname, "points": points, "cards": cards, "todo": todo}


def describe_briefing(r: dict) -> str:
    who = f"{r['nickname']}님" if r["nickname"] else "회원님"
    lines = [f"{who}의 현재 상태예요."]
    lines.extend(f"· {c['label']}: {c['value']}" + (f" ({c['hint']})" if c.get("hint") else "") for c in r["cards"])
    if r["todo"]:
        lines.append("")
        lines.append("오늘 할 만한 일")
        lines.extend(f"· {t}" for t in r["todo"])
    return "\n".join(lines)


def briefing_facts(r: dict) -> str:
    lines = [f"회원 닉네임: {r['nickname'] or '(없음)'}"]
    lines.extend(f"- {c['label']}: {c['value']}" + (f" ({c['hint']})" if c.get("hint") else "") for c in r["cards"])
    if r["todo"]:
        lines.append("[오늘 할 만한 일]")
        lines.extend(f"- {t}" for t in r["todo"])
    return "\n".join(lines)
