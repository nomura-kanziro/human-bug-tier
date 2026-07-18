# -*- coding: utf-8 -*-
"""Append planned multi-feature commit entries to nomura.md (before commits)."""
import re
from datetime import date
from pathlib import Path

path = Path(__file__).resolve().parent / "nomura.md"
text = path.read_text(encoding="utf-8")
today = date.today().isoformat()

planned = [
    {
        "short": "pending-96",
        "full": "pending",
        "msg": "docs(RDMD): restructure frontend work logs into feature folders",
        "scope": "docs / RDMD / frontend",
        "summary": "루트 information1~29 일지를 삭제하고 RDMD/frontend 아래 기능 폴더·순서 번호 *-record.md 구조로 재배치했다. 프론트 작업 이력을 기능 단위로 찾도록 정리함.",
        "files": "`RDMD/frontend/`, `RDMD/information*.md`(삭제)",
        "rdmd": "[frontend/README.md](../frontend/README.md)",
    },
    {
        "short": "pending-97",
        "full": "pending",
        "msg": "docs(RDMD): restructure backend work logs into feature folders",
        "scope": "docs / RDMD / backend",
        "summary": "backend_0~29 평면 일지를 삭제하고 RDMD/backend 아래 01-setup~07-deploy 기능 폴더와 *-record.md, README 인덱스로 재구성했다.",
        "files": "`RDMD/backend/01-setup/` ~ `07-deploy/`, `RDMD/backend/README.md`, `RDMD/backend/backend_*.md`(삭제)",
        "rdmd": "[backend/README.md](../backend/README.md)",
    },
    {
        "short": "pending-98",
        "full": "pending",
        "msg": "docs(RDMD): add features, guides, and summary documentation",
        "scope": "docs / RDMD",
        "summary": "온보딩용 features(기능 설명), guides(개발 규칙), summary(작업 이력·타임라인) 문서를 추가해 프로젝트 이해와 유지보수 가이드를 분리했다.",
        "files": "`RDMD/features/`, `RDMD/guides/`, `RDMD/summary/`",
        "rdmd": "[features/README.md](../features/README.md), [guides/README.md](../guides/README.md)",
    },
    {
        "short": "pending-99",
        "full": "pending",
        "msg": "docs(RDMD): add commit_history author log and mandatory pre-commit rule",
        "scope": "docs / RDMD / commit_history",
        "summary": "작성자별 커밋 타임라인 폴더를 만들고 nomura.md에 전체 git 이력을 수록했다. 커밋·푸시 전 본인 md 작성 필수 규칙과 목차·과거→현재 정렬 명세를 README에 정의함.",
        "files": "`RDMD/commit_history/`",
        "rdmd": "[commit_history/README.md](./README.md)",
    },
    {
        "short": "pending-100",
        "full": "pending",
        "msg": "docs(agents): add .agents common rules and canonical feature skills",
        "scope": "docs / agents",
        "summary": "모든 AI 공통 정본(.agents)에 hierarchy·common-rules·권한 매트릭스와 기능별 skill.md를 추가했다. Grok을 Admin AI로 두고 번외 AI도 동일 스킬을 쓰도록 함.",
        "files": "`.agents/`",
        "rdmd": "_(에이전트 규칙)_",
    },
    {
        "short": "pending-101",
        "full": "pending",
        "msg": "docs(team): add human worker rules for vibe and hardcoding",
        "scope": "docs / team",
        "summary": "창시자·팀원용 team/ 규칙(공통 룰, 워크플로, 코딩 스타일, 금지, 가이드, 체크리스트)을 추가했다. 커밋 전 commit_history 작성 의무를 포함함.",
        "files": "`team/`",
        "rdmd": "[../../team/README.md](../../team/README.md)",
    },
    {
        "short": "pending-102",
        "full": "pending",
        "msg": "docs(claude): add CLAUDE.md and .claude feature skills",
        "scope": "docs / claude",
        "summary": "Claude Code 진입용 CLAUDE.md와 .claude/skills 기능별 SKILL.md·handoff 온보딩 스킬을 추가했다. .agents 정본을 우선 따르도록 연결함.",
        "files": "`CLAUDE.md`, `.claude/`",
        "rdmd": "_(Claude 스킬 팩)_",
    },
    {
        "short": "pending-103",
        "full": "pending",
        "msg": "docs(groks): add Grok Admin AI skill pack",
        "scope": "docs / groks",
        "summary": "Grok 전용 .groks 스킬 팩과 AGENTS.md를 추가해 Admin AI로서 공통 룰 수호·기능 작업 절차를 정의했다.",
        "files": "`.groks/`",
        "rdmd": "_(Grok 스킬 팩)_",
    },
    {
        "short": "pending-104",
        "full": "pending",
        "msg": "docs(codex): add Codex skills, root AGENTS.md, and README map",
        "scope": "docs / codex",
        "summary": "Codex용 .codex 기능 skill.md와 루트 AGENTS.md를 추가하고, 루트 README에 team/.agents/주 골격 AI/RDMD 진입 지도를 반영했다.",
        "files": "`.codex/`, `AGENTS.md`, `README.md`",
        "rdmd": "_(Codex 스킬 팩 + 루트 안내)_",
    },
]

# Avoid double-append
if "pending-96" in text:
    print("entries already present, skip append")
else:
    toc_lines = []
    for i, p in enumerate(planned):
        n = 96 + i
        msg = p["msg"]
        if len(msg) > 80:
            msg = msg[:77] + "..."
        toc_lines.append(f"| {n} | {today} | [`{p['short']}`](#{p['short']}) | {msg} |")

    m = re.search(r"(\| 95 \|[^\n]+\n)", text)
    if not m:
        raise SystemExit("TOC #95 not found")
    text = text[: m.end()] + "\n".join(toc_lines) + "\n" + text[m.end() :]

    text = re.sub(
        r"\| \*\*커밋 수\*\* \| \d+ \|",
        f"| **커밋 수** | {95 + len(planned)} |",
        text,
        count=1,
    )
    text = re.sub(
        r"(\| \*\*기간\*\* \| 2026-03-20 ~ )[^|]+(\|)",
        rf"\g<1>{today}\2",
        text,
        count=1,
    )

    blocks = []
    for i, p in enumerate(planned):
        n = 96 + i
        blocks.append(
            f"""<a id="{p['short']}"></a>

### {n}. {today} — `{p['short']}`

- **hash (short)**: `{p['short']}`
- **hash (full)**: `{p['full']}`
- **author**: nomura
- **message**: {p['msg']}
- **git**: `git show {p['short']}`
- **범위**: {p['scope']}
- **요약**: {p['summary']}
- **주요 파일**: {p['files']}
- **관련 RDMD**: {p['rdmd']}

[▲ 목차로](#목차)

---
"""
        )

    marker = "## 빈 템플릿 (이후 커밋 추가용)"
    idx = text.find(marker)
    if idx < 0:
        raise SystemExit("template marker not found")
    text = text[:idx] + "\n".join(blocks) + "\n" + text[idx:]

    text = re.sub(
        r"\*\*마지막 갱신\*\*:.*",
        f"**마지막 갱신**: {today} · 총 {95 + len(planned)} 항목 · 배치 커밋 pending-96~104 · 정렬 = 과거→현재",
        text,
        count=1,
    )
    path.write_text(text, encoding="utf-8")
    print("appended", len(planned))


def patch_hash(text: str, pending_id: str, short: str, full: str) -> str:
    text = text.replace(f"`{pending_id}`", f"`{short}`")
    text = text.replace(f"(#{pending_id})", f"(#{short})")
    text = text.replace(f'id="{pending_id}"', f'id="{short}"')
    # full hash line that still says pending after short replace on pending-N
    # fix full hash field for this entry only is hard; do global for pending full near short
    return text


# export planned for shell
Path(__file__).resolve().parent.joinpath("_planned_msgs.txt").write_text(
    "\n".join(p["msg"] for p in planned), encoding="utf-8"
)
print("msgs written")
