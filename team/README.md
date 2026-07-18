# `team/` — 사람 작업자 규칙 (창시자 · 팀원)

이 폴더는 **사람이** 코드를 짤 때 보는 규칙입니다.  
(바이브 코딩 · 하드코딩 · PR · 리뷰 모두 해당)

AI 에이전트 공통 룰은 [`.agents/`](../.agents/README.md) 입니다.  
사람은 여기(`team/`)를 먼저, AI는 `.agents` 를 먼저 봅니다.  
둘 다 **같은 제품 품질**을 목표로 합니다.

## 누구를 위한가

| 역할 | 사용법 |
|------|--------|
| **창시자** | 규칙 개정, 배포 승인, 팀 온보딩 |
| **팀원** | 일상 개발 전후 체크, 문법·금지사항 |
| **바이브 코딩** | 빠른 구현 후에도 `04-prohibitions` · `06-checklist` 필수 |
| **하드코딩/정석** | `03-coding-style` · `RDMD/guides` 병행 |

## 문서 목록 (읽는 순서)

| 순서 | 문서 | 내용 |
|:----:|------|------|
| 1 | [01-rules.md](./01-rules.md) | **공통 룰** (커밋 전 `commit_history` 포함) |
| 2 | [02-workflow.md](./02-workflow.md) | 해야 할 일 · 작업 흐름 |
| 3 | [03-coding-style.md](./03-coding-style.md) | 문법·코딩 스타일 |
| 4 | [04-prohibitions.md](./04-prohibitions.md) | **금지** (로그 없이 푸시 금지) |
| 5 | [05-guidelines.md](./05-guidelines.md) | 가이드라인 (바이브 vs 정석, 리뷰) |
| 6 | [06-checklist.md](./06-checklist.md) | 작업 전·중·후 체크리스트 |

**커밋 전 필수**: [`RDMD/commit_history/`](../RDMD/commit_history/README.md) 본인 md 작성 후 커밋·푸시.

## AI와의 관계

```
사람 작업  →  team/  (+ RDMD, 모듈 README)

AI 작업    →  .agents/common-rules + .agents/<기능>/skill.md   ← 모든 AI 정본
                 │
                 ├─ 주 골격: groks | .claude | codex (도구별 복제)
                 └─ 번외 AI: 정본만으로 작업
```

- **왜 Grok/Claude/Codex 만 전용 skill 팩?**  
  이 프로젝트의 **주 뼈대 AI**라서 도구별 진입 형식이 다름.  
  그 외 AI는 `.agents/<기능>/skill.md` 로 동일 기준 적용.
- AI 결과물이 **team 금지사항**을 깨면 머지하지 마세요.  
- 충돌: **창시자 > .agents 정본 > 주 골격 팩 > 옛 RDMD**

## 빠른 링크

| 목적 | 위치 |
|------|------|
| 로컬 실행·시연 | [../README.md](../README.md) |
| 배포 | [../DEPLOY.md](../DEPLOY.md) |
| 기능 맵 | [../RDMD/features/overview.md](../RDMD/features/overview.md) |
| 경로·API 상세 | [../RDMD/guides/path-and-api.md](../RDMD/guides/path-and-api.md) |
| AI 공통 룰 | [../.agents/common-rules.md](../.agents/common-rules.md) |
| 온보딩 (AI 안내) | `codex/handoff`, `.claude/skills/handoff` |

---

**원칙**: 빠르게 짜도 되고, 꼼꼼히 짜도 됩니다.  
**깨면 안 되는 것**만 `01` · `04` · `06` 에 모아 두었습니다.
