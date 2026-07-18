# .claude — Claude Code 스킬 · 팀 인수인계

Claude Code가 자동으로 찾는 프로젝트 스킬 위치입니다.

**모든 AI 공통 정본(더 상위)**: [`.agents/`](../.agents/README.md)  
— `common-rules` + **`<기능>/skill.md`**. Grok이 Admin AI로 수호.  
— 번외 AI는 여기만 사용. Claude 팩은 주 골격 보강.  
**사람 규칙**: [`team/`](../team/README.md)

```
.claude/
├── README.md                 ← 지금 이 파일
├── skills/
│   ├── project-wide/SKILL.md
│   ├── common/SKILL.md
│   ├── tier-class/SKILL.md
│   ├── custom-maker/SKILL.md
│   ├── auth/SKILL.md
│   ├── notice/SKILL.md
│   ├── inquiry/SKILL.md
│   ├── admin/SKILL.md
│   ├── notifications/SKILL.md
│   ├── backend/SKILL.md
│   ├── deploy/SKILL.md
│   ├── rdmd/SKILL.md
│   └── handoff/SKILL.md      ← 팀 온보딩·인수인계 전용
```

루트 **`CLAUDE.md`**: 프로젝트를 열 때 Claude(와 사람)가 먼저 읽는 총괄 지침.

## Claude Code에서 쓰는 법

| 방식 | 설명 |
|------|------|
| 자동 | 요청 내용이 skill `description` 과 맞으면 Claude가 로드 |
| 슬래시 | `/project-wide`, `/common`, `/admin` … (폴더 이름) |
| 인수인계 | `/handoff` 또는 “온보딩”, “인수인계” 요청 |

공식 형식: **`.claude/skills/<name>/SKILL.md`** (파일명 `SKILL.md` 권장 — Claude 인식용).

## 사람과 팀원

1. 루트 `CLAUDE.md` 읽기  
2. `/handoff` 스킬 또는 `skills/handoff/SKILL.md`  
3. `RDMD/features/overview.md`  
4. 담당 기능 `SKILL.md` + 모듈 `README.md`  

## 다른 에이전트와의 관계

| 에이전트 | 위치 |
|----------|------|
| Claude | `.claude/skills/*/SKILL.md` + `CLAUDE.md` |
| Grok | `groks/*/grok_skill.md` + `groks/AGENTS.md` |
| Codex | `codex/*/skill.md` + 루트 `AGENTS.md` |

규칙은 동일합니다. 한쪽에만 수정하지 마세요.

## 스킬 작성 규칙

- YAML frontmatter: `name`, `description` (트리거 키워드 포함)
- 본문: When / Do / Do not / Tasks / Checklist
- 배경 설명은 `RDMD/` 로 링크
- 시크릿·실 `.env` 값 금지
