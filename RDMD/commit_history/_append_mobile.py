# -*- coding: utf-8 -*-
import re
from datetime import date
from pathlib import Path

path = Path(__file__).resolve().parent / "nomura.md"
text = path.read_text(encoding="utf-8")
today = date.today().isoformat()

if "pending-105" in text:
    print("already appended")
    raise SystemExit(0)

planned = [
    {
        "short": "pending-105",
        "full": "pending",
        "msg": "fix(ui): mobile responsive layout for header auth board inquiry",
        "scope": "frontend / mobile",
        "summary": "헤더·메인·로그인/가입·게시판·문의 화면에 모바일 미디어쿼리와 터치 영역을 적용하고, 사이드 메뉴 토글 첫 탭 열림 버그를 수정했다.",
        "files": "`Header_Footer.css`, `common.css`, `common.js`, `user_login/*.css`, `Contact_us/contact_us.css`, `custom-maker*/*.css`",
        "rdmd": "[guides/mobile-pwa.md](../guides/mobile-pwa.md)",
    },
    {
        "short": "pending-106",
        "full": "pending",
        "msg": "feat(pwa): add web manifest, service worker, and install icons",
        "scope": "frontend / pwa",
        "summary": "manifest·sw.js·PWA 아이콘을 추가하고 common.js/로그인 페이지에서 서비스 워커를 등록해 홈 화면 설치가 가능하게 했다. API는 네트워크 우선이다.",
        "files": "`manifest.webmanifest`, `sw.js`, `pwa-register.js`, `tier-image/pwa/*`, `common.js`, `user_login/*.html`",
        "rdmd": "[guides/mobile-pwa.md](../guides/mobile-pwa.md)",
    },
    {
        "short": "pending-107",
        "full": "pending",
        "msg": "docs(RDMD): add mobile and PWA usage guide",
        "scope": "docs / RDMD",
        "summary": "모바일 반응형·PWA 설치 방법과 검증 체크리스트를 RDMD/guides/mobile-pwa.md 로 문서화했다.",
        "files": "`RDMD/guides/mobile-pwa.md`, `RDMD/guides/README.md`",
        "rdmd": "[guides/mobile-pwa.md](../guides/mobile-pwa.md)",
    },
]

nums = [int(x) for x in re.findall(r"^\| (\d+) \|", text, re.M)]
start = max(nums) + 1
last = max(nums)

toc = []
blocks = []
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
text = re.sub(
    r"\| \*\*커밋 수\*\* \| \d+ \|",
    f"| **커밋 수** | {last + len(planned)} |",
    text,
    count=1,
)
text = re.sub(
    r"(\| \*\*기간\*\* \| 2026-03-20 ~ )[^|]+(\|)",
    rf"\g<1>{today}\2",
    text,
    count=1,
)
marker = "## 빈 템플릿 (이후 커밋 추가용)"
idx = text.find(marker)
text = text[:idx] + "\n".join(blocks) + "\n" + text[idx:]
path.write_text(text, encoding="utf-8")
print("appended", start, "to", start + len(planned) - 1)
