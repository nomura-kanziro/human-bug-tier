# -*- coding: utf-8 -*-
"""Replace pending-N anchor/hash with real git short/full hash in nomura.md."""
import re
import sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: _set_hash.py pending-N SHORT FULL")

pending, short, full = sys.argv[1], sys.argv[2], sys.argv[3]
path = Path(__file__).resolve().parent / "nomura.md"
text = path.read_text(encoding="utf-8")
if pending not in text:
    raise SystemExit(f"{pending} not found")

text = text.replace(f'id="{pending}"', f'id="{short}"')
text = text.replace(f"(#{pending})", f"(#{short})")
text = text.replace(f"`{pending}`", f"`{short}`")
# full hash field still 'pending' for this entry — replace first remaining standalone pending full after short set is ambiguous
# Replace pattern for this commit block: after ### N. date — `short` the full line
text = re.sub(
    rf"(### \d+\. [0-9-]+ — `{re.escape(short)}`\n\n- \*\*hash \(short\)\*\*: `{re.escape(short)}`\n- \*\*hash \(full\)\*\*: )`pending`",
    rf"\1`{full}`",
    text,
    count=1,
)
# git show line
text = text.replace(f"`git show {short}`", f"`git show {short}`")  # already ok

path.write_text(text, encoding="utf-8")
print(f"set {pending} -> {short} / {full[:12]}...")
