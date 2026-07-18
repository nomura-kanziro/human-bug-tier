# -*- coding: utf-8 -*-
"""Generate nomura.md from full git log (oldest -> newest), README 명세 준수."""
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent / "nomura.md"


def run_git(args: list[str]) -> bytes:
    return subprocess.run(
        ["git", *args],
        capture_output=True,
        cwd=ROOT,
        check=False,
    ).stdout


def decode_git(raw: bytes) -> tuple[str, str]:
    for enc in ("utf-8", "utf-8-sig", "cp949", "mbcs"):
        try:
            candidate = raw.decode(enc)
        except Exception:
            continue
        if any("\uac00" <= ch <= "\ud7a3" for ch in candidate):
            return candidate, enc
        text, used = candidate, enc
    else:
        return raw.decode("utf-8", errors="replace"), "utf-8-replace"
    return text, used


def infer_scope(subject: str) -> str:
    s = subject.lower()
    tags = []
    rules = [
        (r"deploy|render|github pages|pages|workflow|\.nojekyll", "deploy"),
        (r"\bdocs?\b|docx|rdmd|readme|information|문서", "docs"),
        (r"admin|어드민|관리자|requireadmin|middleware", "admin"),
        (r"auth|login|signup|jwt|password|회원가입|로그인|비번", "auth"),
        (r"notice|공지", "notice"),
        (r"inquiry|contact|문의", "inquiry"),
        (r"custom-maker|tierlist|게시판|메이커|post_detail|댓글", "custom-maker"),
        (r"notification|알림", "notifications"),
        (r"backend|api|mongo|mongoose|model|controller|route|server\.js", "backend"),
        (r"tier|티어|캐릭터", "tier-class"),
        (r"common\.js|header|footer|getbasepath|getapibase|경로", "common"),
        (r"config|chore|gitignore|deps|lockfile|ignore", "chore"),
        (r"style|css", "style"),
        (r"merge|revert", "meta"),
        (r"feat|fix|frontend|프론트|html|페이지", "frontend"),
    ]
    for pat, tag in rules:
        if re.search(pat, s, re.I) or re.search(pat, subject, re.I):
            if tag not in tags:
                tags.append(tag)
    if not tags:
        tags.append("misc")
    # keep concise
    return " / ".join(tags[:4])


def parse_commit_type(subject: str) -> str:
    """feat/fix/docs/... 접두 추출."""
    m = re.match(
        r"^\s*(feat|fix|docs?|docx|style|refactor|chore|config|test|build|ci|perf|revert|merge)\b",
        subject,
        re.I,
    )
    if m:
        return m.group(1).lower()
    if re.search(r"merge\s+branch|merge\s+pull", subject, re.I):
        return "merge"
    if re.search(r"^\s*revert\b", subject, re.I):
        return "revert"
    return ""


def strip_type_prefix(subject: str) -> str:
    """커밋 메시지에서 type(scope): 접두를 제거한 본문."""
    s = subject.strip()
    s = re.sub(
        r"^\s*(feat|fix|docs?|docx|style|refactor|chore|config|test|build|ci|perf|revert)\s*(\([^)]*\))?\s*[:：\-]?\s*",
        "",
        s,
        count=1,
        flags=re.I,
    )
    s = re.sub(r"^\s*(feat|fix|docs?|docx)\s+", "", s, count=1, flags=re.I)
    return " ".join(s.split())


def areas_from_files(files: list[str]) -> list[str]:
    areas = []
    mapping = [
        (r"^backend/", "백엔드"),
        (r"^admin/", "관리자"),
        (r"^user_login/", "인증(유저)"),
        (r"^custom-maker/", "커스텀 메이커/게시판"),
        (r"^notice/", "공지"),
        (r"^Contact", "문의"),
        (r"^tier-class/", "공식 티어 페이지"),
        (r"^tier-image/", "티어 이미지"),
        (r"^RDMD/", "RDMD 문서"),
        (r"^(common\.js|common\.css|header\.html|footer\.html|Header_Footer)", "공통 UI/경로"),
        (r"^index\.html", "메인 페이지"),
        (r"render\.yaml|DEPLOY|\.github/", "배포 설정"),
        (r"^\.agents/|^team/|^\.groks/|^\.codex/|^\.claude/|^AGENTS\.md|^CLAUDE\.md", "에이전트/팀 규칙"),
        (r"^README", "README"),
    ]
    for f in files:
        for pat, label in mapping:
            if re.search(pat, f, re.I) and label not in areas:
                areas.append(label)
                break
    return areas[:5]


def action_verb(ctype: str, subject: str) -> str:
    """서술용 동사구 (조사 없이)."""
    if ctype == "feat":
        return "기능을 추가·개선했다"
    if ctype == "fix":
        return "문제를 수정했다"
    if ctype in ("docs", "doc", "docx"):
        return "문서를 정리·추가했다"
    if ctype == "style":
        return "UI/스타일을 조정했다"
    if ctype == "refactor":
        return "구조를 리팩터했다"
    if ctype in ("chore", "config", "build", "ci"):
        return "설정·도구를 손봤다"
    if ctype == "merge":
        return "브랜치/PR을 병합했다"
    if ctype == "revert":
        return "이전 변경을 되돌렸다"
    if re.search(r"추가|add", subject, re.I):
        return "내용을 추가했다"
    if re.search(r"수정|fix|해결|고침", subject, re.I):
        return "오류·동작을 고쳤다"
    if re.search(r"구현|완성", subject, re.I):
        return "기능을 구현했다"
    if re.search(r"연동", subject, re.I):
        return "API/화면을 연동했다"
    if re.search(r"정리|문서", subject, re.I):
        return "기록을 정리했다"
    if re.search(r"변경|이동|rename|폴더", subject, re.I):
        return "구조·경로를 바꿨다"
    return "변경을 반영했다"


def file_hints(files: list[str]) -> list[str]:
    joined = " ".join(files).lower()
    hints = []
    checks = [
        (r"middleware|requireadmin|auth\.js", "권한/미들웨어"),
        (r"user_login|authcontroller|jwt", "로그인·JWT"),
        (r"admin", "관리자 화면/API"),
        (r"custom-maker|tierlist|tierpost", "커스텀 게시판"),
        (r"notice", "공지"),
        (r"contact|inquiry", "문의"),
        (r"notification", "알림"),
        (r"render\.yaml|deploy|\.github/workflows", "배포 설정"),
        (r"common\.js|getbasepath|getapibase|header\.html|footer\.html", "공통 경로/헤더"),
        (r"tier-image/", "캐릭터 이미지"),
        (r"tier-class/", "공식 티어 HTML"),
        (r"rdmd/", "RDMD 문서"),
        (r"server\.js|models/|controllers/|routes/", "Express API/모델"),
        (r"\.env|gitignore|package", "환경·의존성"),
    ]
    for pat, label in checks:
        if re.search(pat, joined, re.I) and label not in hints:
            hints.append(label)
        if len(hints) >= 4:
            break
    return hints


def build_summary(subject: str, files: list[str]) -> str:
    """
    message와 역할이 다름:
    - message: 깃 커밋 한 줄 원문
    - 요약: 어디를 어떻게 손댔는지 작업 설명 (1~2문장, 메시지 복붙 금지)
    """
    ctype = parse_commit_type(subject)
    areas = areas_from_files(files)
    verb = action_verb(ctype, subject)
    hints = file_hints(files)

    if ctype == "merge":
        return "원격/다른 브랜치 변경을 현재 브랜치에 합쳤다. 기능 변경 요약은 개별 커밋을 본다."
    if ctype == "revert":
        return "직전에 넣었던 변경을 되돌려 이전 상태로 복구했다."

    # 1문장: 어디 + 무엇을
    if areas:
        where = "·".join(areas[:3])
        s1 = f"{where} 영역을 중심으로 {verb}."
    elif hints:
        s1 = f"{'·'.join(hints[:3])} 관련으로 {verb}."
    else:
        s1 = f"저장소 파일을 수정하며 {verb}."

    # 2문장: 파일/키워드 기반 구체화 (메시지 본문 복붙 지양)
    s2_parts = []
    if hints and areas:
        # 겹치지 않는 힌트만
        extra = [h for h in hints if h not in " ".join(areas)]
        if extra:
            s2_parts.append("손댄 포인트: " + ", ".join(extra[:3]) + ".")
    elif files:
        names = [Path(f).name for f in files[:4]]
        s2_parts.append("대표 변경 파일: " + ", ".join(names) + ".")

    # 메시지에만 있는 특수 단서 (폴더 rename 등) — 짧게 키워드만
    if re.search(r"Contact_us|Contact us", subject, re.I):
        s2_parts.append("문의 폴더명/경로 정리 포함.")
    if re.search(r"home\.html|index\.html", subject, re.I):
        s2_parts.append("메인 진입 HTML 이름 정리 포함.")
    if re.search(r"getBasePath|getApiBase|GitHub Pages|Render", subject, re.I):
        s2_parts.append("경로·API Base·배포 환경 대응 포함.")
    if re.search(r"SHA-256|재설정|reset", subject, re.I):
        s2_parts.append("비밀번호 재설정 토큰/보안 흐름 포함.")
    if re.search(r"requireAdmin|middleware", subject, re.I):
        s2_parts.append("관리자 API 보호 강화 포함.")

    if s2_parts:
        return s1 + " " + " ".join(s2_parts)
    return s1


def changed_files(full_hash: str, limit: int = 8) -> list[str]:
    raw = run_git(
        ["-c", "core.quotepath=false", "show", "--name-only", "--pretty=format:", full_hash]
    )
    text, _ = decode_git(raw)
    files = [ln.strip() for ln in text.splitlines() if ln.strip()]
    seen = set()
    out = []
    for f in files:
        if f not in seen:
            seen.add(f)
            out.append(f)
        if len(out) >= limit:
            break
    return out


def main() -> None:
    raw = run_git(
        [
            "-c",
            "i18n.logOutputEncoding=utf-8",
            "log",
            "--reverse",
            "--format=%H%x09%h%x09%ad%x09%an%x09%s",
            "--date=short",
        ]
    )
    text, used = decode_git(raw)
    lines = [ln for ln in text.splitlines() if ln.strip()]
    entries = []
    for ln in lines:
        parts = ln.split("\t", 4)
        if len(parts) < 5:
            continue
        full, short, date, author, subject = parts
        entries.append((full, short, date, author, subject))

    n = len(entries)
    if n == 0:
        raise SystemExit("no commits parsed")

    L: list[str] = []
    A = L.append

    A("# nomura — 커밋 기록 (전체)")
    A("")
    A("| 항목 | 내용 |")
    A("|------|------|")
    A("| **작성자** | nomura |")
    A("| **역할** | 창시자 / 메인 작업자 |")
    A("| **git user** | nomura (일부 PR merge: nomura-kanziro) |")
    A("| **저장소** | human-bug-tier |")
    A("| **정렬** | **과거 → 현재** (위 = 오래됨, 아래 = 최신) |")
    A(f"| **커밋 수** | {n} |")
    A(f"| **기간** | {entries[0][2]} ~ {entries[-1][2]} |")
    A("| **명세** | [README.md](./README.md) 필드·템플릿 준수 |")
    A("")
    A(
        "> 폴더 안내: [README.md](./README.md)  ·  "
        "상세 기능 일지: [../frontend/](../frontend/README.md) · "
        "[../backend/](../backend/README.md)"
    )
    A(">")
    A("> 목차 링크는 각 커밋 단축 해시 앵커(`#c70f64f`)로 이동합니다.")
    A(">")
    A(
        "> **필수 규칙**: 커밋·푸시 **전** 이 파일에 작성 후 스테이징에 포함 "
        "([README 필수 절차](./README.md))."
    )
    A(">")
    A("> **새 커밋 추가 위치**: 목차 표 **맨 아래 행** + 커밋 상세 **맨 아래 블록**.")
    A(">")
    A(
        "> **message** = git 커밋 메시지 **원문**.  "
        "**요약** = 그 커밋이 한 일을 사람이 읽기 쉽게 풀어 쓴 설명(메시지 복붙 아님)."
    )
    A(">")
    A(
        "> **범위·요약·주요 파일** 은 메시지/변경 경로로 자동 생성했습니다. "
        "더 정확한 요약이 필요하면 수동 수정하세요."
    )
    A("")
    A("---")
    A("")
    A("## 목차")
    A("")
    A("| # | 날짜 | hash | 메시지 |")
    A("|--:|------|------|--------|")
    for i, (full, short, date, author, subject) in enumerate(entries, 1):
        msg = subject.replace("|", "\\|")
        if len(msg) > 80:
            msg = msg[:77] + "..."
        A(f"| {i} | {date} | [`{short}`](#{short}) | {msg} |")

    A("")
    A("---")
    A("")
    A("## 커밋 상세 (과거 → 현재)")
    A("")

    for i, (full, short, date, author, subject) in enumerate(entries, 1):
        files = changed_files(full)
        scope = infer_scope(subject)
        # 파일 경로도 범위 보강
        if files:
            file_scope = infer_scope(" ".join(files) + " " + subject)
            # merge unique
            parts = []
            for p in (scope + " / " + file_scope).split(" / "):
                p = p.strip()
                if p and p not in parts:
                    parts.append(p)
            scope = " / ".join(parts[:4])
        summary = build_summary(subject, files)
        files_md = ", ".join(f"`{f}`" for f in files) if files else "_(파일 목록 없음 / merge 등)_"

        A(f'<a id="{short}"></a>')
        A("")
        A(f"### {i}. {date} — `{short}`")
        A("")
        A(f"- **hash (short)**: `{short}`")
        A(f"- **hash (full)**: `{full}`")
        A(f"- **author**: {author}")
        A(f"- **message**: {subject}")
        A(f"- **git**: `git show {short}`")
        A(f"- **범위**: {scope}")
        A(f"- **요약**: {summary}")
        A(f"- **주요 파일**: {files_md}")
        A("- **관련 RDMD**: _(선택 — 기능 일지 있으면 링크)_")
        A("")
        A("[▲ 목차로](#목차)")
        A("")
        A("---")
        A("")

    A("## 빈 템플릿 (이후 커밋 추가용)")
    A("")
    A("**최신 항목은 커밋 상세 구역의 맨 아래(이 템플릿 바로 위)** 에 붙인다.")
    A("")
    A("커밋·푸시 **전** 작성 → `git add` 에 이 파일 포함 → `git commit` → `git push`")
    A("")
    A("```markdown")
    A('<a id="SHORT_HASH_or_pending"></a>')
    A("")
    A("### N. YYYY-MM-DD — `SHORT_HASH_or_pending`")
    A("")
    A("- **hash (short)**: `pending`")
    A("- **hash (full)**: `pending`")
    A("- **author**: nomura")
    A("- **message**: (git commit -m 원문 그대로)")
    A("- **git**: `git show SHORT_HASH`")
    A("- **범위**: frontend | backend | docs | deploy | …")
    A("- **요약**: (이 커밋이 실제로 한 일을 1~2문장으로 — message 복붙 금지)")
    A("- **주요 파일**: ")
    A("- **관련 RDMD**: ")
    A("")
    A("[▲ 목차로](#목차)")
    A("```")
    A("")
    A("---")
    A("")
    A(
        f"**마지막 갱신**: git log 기준 {entries[-1][2]} · 총 {n} 커밋 · "
        f"정렬 = 과거→현재 (위→아래) · generator encoding={used}"
    )
    A("")

    OUT.write_text("\n".join(L), encoding="utf-8")
    print(f"wrote {n} commits -> {OUT} (git decode={used})")
    print("first:", entries[0][4][:50])
    print("last:", entries[-1][1], entries[-1][4][:50])


if __name__ == "__main__":
    main()
