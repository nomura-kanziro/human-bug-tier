# -*- coding: utf-8 -*-
import re
from datetime import date
from pathlib import Path

path = Path(__file__).resolve().parent / "nomura.md"
text = path.read_text(encoding="utf-8")
today = date.today().isoformat()
pending = "pending-mongo-env"

if pending in text:
    print("pending already present")
    raise SystemExit(0)

p = {
    "short": pending,
    "full": "pending",
    "msg": "fix(backend): load backend .env with override so MONGO_URI is not blanked by root",
    "scope": "backend / env",
    "summary": "루트 .env 의 빈 MONGO_URI= 때문에 backend URI가 무시되던 dotenv 순서를 고쳤다. backend/.env 를 override로 우선 적용하고, DB 미연결 시 공지 API가 503으로 원인을 안내하도록 했다.",
    "files": "`backend/server.js`, `backend/controllers/noticeController.js`, `.env.example`, `backend/.env.example`",
    "rdmd": "_(env 로드 · 공지 조회)_",
}

nums = [int(x) for x in re.findall(r"^\| (\d+) \|", text, re.M)]
n = max(nums) + 1
last = max(nums)
msg = p["msg"] if len(p["msg"]) <= 80 else p["msg"][:77] + "..."
toc = f"| {n} | {today} | [`{p['short']}`](#{p['short']}) | {msg} |"
m = re.search(rf"(\| {last} \|[^\n]+\n)", text)
text = text[: m.end()] + toc + "\n" + text[m.end() :]
text = re.sub(r"\| \*\*커밋 수\*\* \| \d+ \|", f"| **커밋 수** | {n} |", text, count=1)
text = re.sub(r"(\| \*\*기간\*\* \| 2026-03-20 ~ )[^|]+(\|)", rf"\g<1>{today}\2", text, count=1)
block = f"""<a id="{p['short']}"></a>

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
marker = "## 빈 템플릿 (이후 커밋 추가용)"
idx = text.find(marker)
text = text[:idx] + block + "\n" + text[idx:]
path.write_text(text, encoding="utf-8")
print("appended", n, pending)
