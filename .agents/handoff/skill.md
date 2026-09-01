---
name: handoff
description: >
  팀 인수인계, 온보딩, 번외 AI 포함 프로젝트 안내. Canonical for ANY AI.
---

# 공통 스킬 — 팀 인수인계 · 온보딩

## When

- 새 팀원, “인수인계”, “온보딩”, “프로젝트 설명해”
- **번외 AI** 사용자에게 어디를 보라고 안내할 때

## 현재 상태 (반드시 말할 것)

- 바닐라 **0.4.1**. 프론트 `root-cloudflare/` · `root-render/`
- **지금 실무 = Render.com** (`root-render/` + `backend/`). Cloudflare 추가 작업 중지. 로컬에서 Render 화면은 `STATIC_ROOT=root-render`
- 정식 버전 React = 기획만 `RDMD/features/react-rewrite.md`. **구현 지시 전 착수 금지**

## Do

1. 사람 → [`team/README.md`](../team/README.md)  
2. AI(아무 제품) → [`.agents/common-rules.md`](../common-rules.md) + 이 폴더 기능 `skill.md`  
3. 주 골격 AI면 추가로:  
   - Grok → `groks/`  
   - Claude → `CLAUDE.md` + `.claude/skills/`  
   - Codex → `AGENTS.md` + `codex/`  
4. 실행: `cd backend && npm start` → `:5000`  
5. 시크릿 실값 묻지/출력하지 말 것  

## Do not

- RDMD 전체 일지 덤프
- “GH Pages만 되면 전부 됨”
- 시크릿 예시 날조

## Day-0 (사람)

| 순서 | 문서 |
|:----:|------|
| 1 | `README.md` |
| 2 | `team/01-rules.md` · `04-prohibitions.md` |
| 3 | `RDMD/summary/work-history.md` |
| 4 | `RDMD/features/overview.md` |
| 5 | `RDMD/guides/path-and-api.md` |

## Day-0 (번외 AI에게 시킬 때)

```
1. .agents/common-rules.md
2. .agents/<기능>/skill.md
3. RDMD/features/<기능>.md
4. 코드 수정 후 localhost:5000 테스트 안내
```

## 함정 6

1. backend :5000 통합  
2. getBasePath  
3. requireAdmin + getAdminAuthHeaders  
4. 재설정 토큰 해시만 DB  
5. `.env` 미커밋  
6. **커밋·푸시 전 `RDMD/commit_history/{본인}.md` 미작성**  

## Checklist

- [ ] team / .agents 경로 안내
- [ ] commit_history 규칙 안내 (커밋 전 필수)
- [ ] 주 골격 vs 번외 구분 설명
- [ ] 시크릿 미노출
