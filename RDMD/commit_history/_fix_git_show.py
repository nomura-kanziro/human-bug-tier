# -*- coding: utf-8 -*-
from pathlib import Path
import re

p = Path(__file__).resolve().parent / "nomura.md"
lines = p.read_text(encoding="utf-8").splitlines()
out = []
last_short = None
for line in lines:
    m = re.search(r"\*\*hash \(short\)\*\*: `([0-9a-f]+)`", line)
    if m:
        last_short = m.group(1)
    if last_short and "git show pending-" in line:
        line = re.sub(r"git show pending-\d+", f"git show {last_short}", line)
    out.append(line)
text = "\n".join(out)
text = text.replace(
    "배치 커밋 pending-96~104",
    "배치 커밋 #96~104 (+hash 보정)",
)
if not text.endswith("\n"):
    text += "\n"
p.write_text(text, encoding="utf-8")
print("pending left", text.count("pending"))
