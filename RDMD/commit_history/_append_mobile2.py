# -*- coding: utf-8 -*-
import re
from datetime import date
from pathlib import Path

path = Path(__file__).resolve().parent / "nomura.md"
text = path.read_text(encoding="utf-8")
today = date.today().isoformat()

if "pending-mobile2-1" in text:
    print("already present")
    raise SystemExit(0)

planned = [
    {
        "short": "pending-mobile2-1",
        "full": "pending",
        "msg": "feat(custom-maker): mobile tap-to-place characters and maker layout",
        "scope": "frontend / custom-maker / mobile",
        "summary": "모바일에서 DnD 대신 캐릭터 탭 선택 후 티어 칸 탭으로 배치·풀 복귀가 되게 했다. 제작 화면 안내 문구·선택 하이라이트·레이아웃을 보강하고 이미지 경로 슬래시를 고쳤다.",
        "files": "`custom-maker/custom-maker.js`, `custom-maker.html`, `custom-maker.css`, `custom-maker_post.html`",
        "rdmd": "[guides/mobile-pwa.md](../guides/mobile-pwa.md)",
    },
    {
        "short": "pending-mobile2-2",
        "full": "pending",
        "msg": "fix(ui): goHome always to index, tier mobile CSS, coming-soon nav",
        "scope": "frontend / mobile / common",
        "summary": "goHome을 항상 index.html로 통일하고, 공식 티어 페이지 공통 모바일 CSS를 적용했다. 미구현 메뉴(이벤트·행운 뽑기)는 준비 중으로 표시해 빈 # 링크 혼란을 줄였다.",
        "files": "`common.js`, `header.html`, `index.html`, `Header_Footer.css`, `tier-class/tier-responsive.css`, `tier1-9.html`",
        "rdmd": "[guides/mobile-pwa.md](../guides/mobile-pwa.md)",
    },
]

nums = [int(x) for x in re.findall(r"^\| (\d+) \|", text, re.M)]
start = max(nums) + 1
last = max(nums)
toc, blocks = [], []
for i, p in enumerate(planned):
    n = start + i
    msg = p["msg"] if len(p["msg"]) <= 80 else p["msg"][:77] + "..."
    toc.append(f"| {n} | {today} | [`{p['short']}`](#{p['short']}) | {msg} |")
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

m = re.search(rf"(\| {last} \|[^\n]+\n)", text)
text = text[: m.end()] + "\n".join(toc) + "\n" + text[m.end() :]
text = re.sub(r"\| \*\*커밋 수\*\* \| \d+ \|", f"| **커밋 수** | {last + len(planned)} |", text, count=1)
text = re.sub(r"(\| \*\*기간\*\* \| 2026-03-20 ~ )[^|]+(\|)", rf"\g<1>{today}\2", text, count=1)
marker = "## 빈 템플릿 (이후 커밋 추가용)"
idx = text.find(marker)
text = text[:idx] + "\n".join(blocks) + "\n" + text[idx:]
path.write_text(text, encoding="utf-8")
print("ok", start, "to", start + len(planned) - 1)
