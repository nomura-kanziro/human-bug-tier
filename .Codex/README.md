# .Codex — Codex 스킬 · 팀 인수인계

**휴버대 티어표** 저장소에서 Codex(CLI/IDE)가 따를 기능별 작업 지침입니다.

**모든 AI 공통 정본(더 상위)**: [`.Agents/`](../.Agents/README.md)
— `common-rules` + **`skills/<기능>/SKILL.md`**. Admin AI(Grok · Claude · Cursor)가 수호.
**사람 규칙**: [`team/`](../team/README.md)

**주석**: 기존 설명 주석은 삭제 금지. 코드가 바뀌면 문구만 수정. 사람이 “지워” 하기 전엔 유지 (`.Agents/common-rules.md` D-5).

```
.Codex/
├── README.md                 ← 지금 이 파일
└── skills/
    ├── project-wide/SKILL.md
    ├── common/SKILL.md
    ├── tier-class/SKILL.md
    ├── custom-maker/SKILL.md
    ├── auth/SKILL.md
    ├── notice/SKILL.md
    ├── inquiry/SKILL.md
    ├── admin/SKILL.md
    ├── notifications/SKILL.md
    ├── luck-draw/SKILL.md
    ├── ai-service/SKILL.md   ← AI 전용 서비스(FastAPI · LangGraph · RAG)
    ├── my-page/SKILL.md
    ├── guide/SKILL.md        ← 가이드 페이지 · 가이드 모드
    ├── event/SKILL.md        ← 이벤트 · 이벤트 디자인
    ├── backend/SKILL.md
    ├── deploy/SKILL.md
    ├── rdmd/SKILL.md
    ├── handoff/SKILL.md      ← 팀 온보딩·인수인계 전용
    └── react-rewrite/SKILL.md ← React 전환 기록
```

루트 **`AGENTS.md`**: Codex 가 먼저 읽는 총괄 지침.

## 권한과 할 일

이 에이전트는 **실무 에이전트**입니다. 사람과 최고 권한 AI(Grok · Claude · Cursor)의 판단을 따릅니다.

- 기능 단위 구현·리팩터·문서 보조를 맡습니다.
- 공통 룰을 혼자 바꾸거나 이 폴더에만 느슨한 규칙을 두지 않습니다. 바꿀 일이 있으면 Admin AI 나 사람에게 제안합니다.
- 최종 배포 승인과 시크릿 입력은 **사람**의 몫입니다.

## Codex 에서 쓰는 법

루트 `AGENTS.md` 를 읽은 뒤 요청 기능의 `skills/<기능>/SKILL.md` 를 따릅니다.

이 폴더를 만들 때 Codex 로 직접 시험하지는 못했습니다. 자동으로 읽는지 믿지 말고 처음 한 번 확인해 주세요.

## 작업 순서

1. `.Agents/common-rules.md` + `.Agents/skills/<기능>/SKILL.md` (정본)
2. `.Codex/skills/<기능>/SKILL.md` (이 폴더)
3. 범위가 넓으면 `skills/project-wide/SKILL.md`
4. 배경은 `RDMD/`, 사람 규칙은 `team/`
5. 충돌하면 **`.Agents` 우선** (약화 금지)

## 작업 종료 시

1. 변경 요약 (무엇을 / 왜)
2. 수동 테스트 방법 (`:5000` 기준)
3. **커밋·푸시 전** `RDMD/commit_history/{작성자}.md` 작성 필수 안내
4. 큰 기능이면 `RDMD/` record 제안
5. 시크릿이 diff 에 없는지 확인

## 사람과 팀원

1. 루트 `README.md` · `CLAUDE.md` 읽기
2. `skills/handoff/SKILL.md`
3. `RDMD/features/overview.md`
4. 담당 기능 `SKILL.md` + 모듈 `README.md`

## 다른 에이전트와의 관계

모든 에이전트 폴더는 구조가 같습니다.

| 에이전트 | 권한 | 스킬 위치 | 루트 진입 문서 |
|----------|------|-----------|----------------|
| Grok | Admin | `.Grok/skills/*/SKILL.md` | — |
| Claude | Admin | `.Claude/skills/*/SKILL.md` | `CLAUDE.md` |
| Cursor | Admin | `.Cursor/skills/*/SKILL.md` | — |
| Codex | 실무 | `.Codex/skills/*/SKILL.md` | `AGENTS.md` |
| Antigravity | 실무 | `.Antigravity/skills/*/SKILL.md` | — |
| Manus | 실무 | `.Manus/skills/*/SKILL.md` | — |
| Qwen | 실무 | `.Qwen/skills/*/SKILL.md` | — |

규칙은 동일합니다. 한쪽에만 수정하지 마세요([`sync-skills.md`](../.Agents/sync-skills.md)).

## 스킬 작성 규칙

- 위치·파일명: **`.Codex/skills/<name>/SKILL.md`** (모든 에이전트 동일)
- YAML frontmatter: `name`(폴더 이름과 같게), `description` (트리거 키워드 포함)
- 본문: When / Do / Do not / Tasks / Checklist
- 배경 설명은 `RDMD/` 로 링크
- 시크릿·실 `.env` 값 금지
