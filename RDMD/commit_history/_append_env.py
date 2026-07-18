# -*- coding: utf-8 -*-
import re
from datetime import date
from pathlib import Path

path = Path(__file__).resolve().parent / "nomura.md"
text = path.read_text(encoding="utf-8")
today = date.today().isoformat()

if "pending-env-root" in text or "docs(env): add root and backend .env.example" in text:
    # allow re-run only if still pending
    if "docs(env): add root and backend .env.example" in text and "pending-env-root" not in text:
        print("already committed entry may exist")
        # still allow pending append once
        pass

pending_id = "pending-env-root"
if pending_id in text:
    print("pending already present")
    raise SystemExit(0)

planned = {
    "short": pending_id,
    "full": "pending",
    "msg": "docs(env): add root and backend .env.example with dual dotenv load",
    "scope": "docs / backend / env",
    "summary": "루트·backend용 .env.example을 정리하고, server.js가 루트 .env 후 backend/.env를 로드하도록 했다. DEPLOY/README/팀 규칙에 설정 절차를 반영함. 실 .env는 gitignore 유지.",
    "files": "`.env.example`, `backend/.env.example`, `backend/server.js`, `README.md`, `DEPLOY.md`, `CLAUDE.md`, `team/01-rules.md`",
    "rdmd": "_(환경변수 문서)_",
}

nums = [int(x) for x in re.findall(r"^\| (\d+) \|", text, re.M)]
n = max(nums) + 1
last = max(nums)
msg = planned["msg"] if len(planned["msg"]) <= 80 else planned["msg"][:77] + "..."
toc = f"| {n} | {today} | [`{planned['short']}`](#{planned['short']}) | {msg} |"

m = re.search(rf"(\| {last} \|[^\n]+\n)", text)
text = text[: m.end()] + toc + "\n" + text[m.end() :]
text = re.sub(
    r"\| \*\*커밋 수\*\* \| \d+ \|",
    f"| **커밋 수** | {n} |",
    text,
    count=1,
)
text = re.sub(
    r"(\| \*\*기간\*\* \| 2026-03-20 ~ )[^|]+(\|)",
    rf"\g<1>{today}\2",
    text,
    count=1,
)

block = f"""<a id="{planned['short']}"></a>

### {n}. {today} — `{planned['short']}`

- **hash (short)**: `{planned['short']}`
- **hash (full)**: `{planned['full']}`
- **author**: nomura
- **message**: {planned['msg']}
- **git**: `git show {planned['short']}`
- **범위**: {planned['scope']}
- **요약**: {planned['summary']}
- **주요 파일**: {planned['files']}
- **관련 RDMD**: {planned['rdmd']}

[▲ 목차로](#목차)

---
"""

marker = "## 빈 템플릿 (이후 커밋 추가용)"
idx = text.find(marker)
text = text[:idx] + block + "\n" + text[idx:]
path.write_text(text, encoding="utf-8")
print("appended entry", n, planned["short"])
