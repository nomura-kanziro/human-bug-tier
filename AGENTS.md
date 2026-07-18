# AGENTS.md — Codex / 멀티 에이전트 진입점

이 파일은 **OpenAI Codex**(CLI · IDE)와 기타 에이전트가 프로젝트를 열 때 참고하는 **진입 지침**입니다.

## ⚠️ 모든 AI — 공통 정본 먼저

1. **[`.agents/common-rules.md`](./.agents/common-rules.md)**  
2. **[`.agents/hierarchy.md`](./.agents/hierarchy.md)** — Grok = Admin AI  
3. **[`.agents/<기능>/skill.md`](./.agents/README.md)** — 기능 표준 스킬 (번외 AI도 동일)  
4. Codex면 이어서 **`codex/<기능>/skill.md`** (주 골격 보강)

정본: [`.agents/README.md`](./.agents/README.md)  
(주 골격 Grok/Claude/Codex 전용 팩 = 도구 최적화 복제본. 충돌 시 `.agents` 우선)

사람(창시자·팀원) 규칙: [`team/README.md`](./team/README.md)

## 프로젝트

**휴버대 티어표** — 바닐라 HTML/CSS/JS + Express/MongoDB.  
공식 티어표 · 커스텀 메이커/게시판 · 회원 · 공지 · 문의 · 관리자.

## Codex가 할 일 (순서)

1. `.agents` 공통 룰 준수  
2. 요청 기능 판별 → **`codex/<기능>/skill.md`**  
3. 범위가 넓으면 `codex/project-wide/skill.md`  
4. 상세 배경은 `RDMD/` (필요 구간만)  
5. 공통 룰 충돌 시 **Grok/사람** 기준으로 맞춤 (룰 약화 금지)

인덱스: [`codex/README.md`](./codex/README.md)

## 로컬 실행

```bash
cd backend
npm install
# .env.example → .env (MONGO_URI, ADMIN_INPUT_ID, ADMIN_INPUT_PW …)
npm start
```

→ http://localhost:5000/ (프론트 정적 + API 통합)

## 불변 규칙

| 항목 | 규칙 |
|------|------|
| 실행 | 풀스택 = `backend` 포트 **5000** |
| 경로 | `getBasePath()` / `fixRootLinksInElement` — `/...` 하드코딩 금지 |
| API Base | `getApiBase()` — 개발 포트→`localhost:5000`, 동일 오리진→`''`, GH Pages→`GITHUB_STATIC` |
| 유저 | `authToken` + `getAuthHeaders()` |
| 관리자 | `adminAuthToken` + `getAdminAuthHeaders()` + **`requireAdmin`** |
| 비번 재설정 | 랜덤 토큰 + **SHA-256 해시만 DB** |
| 비밀 | `.env` 커밋·출력 금지 |
| 문서 | 큰 변경 → `RDMD/frontend|backend/<기능>/*-record.md` |

## 에이전트별 스킬 위치

| 계층 | 위치 |
|------|------|
| **공통 AI 룰** | **`.agents/`** (Grok이 Admin으로 수호) |
| **사람 룰** | **`team/`** |
| Codex 기능 스킬 | `codex/<기능>/skill.md` |
| Claude | `CLAUDE.md` + `.claude/skills/*/SKILL.md` |
| Grok | `groks/AGENTS.md` + `groks/<기능>/grok_skill.md` |

규칙 변경: [`.agents/sync-skills.md`](./.agents/sync-skills.md)

## 작업 종료 시

- 변경 요약 (무엇을/왜)
- 수동 테스트 (`:5000`)
- **커밋·푸시 전** `RDMD/commit_history/{작성자}.md` 작성 필수 (팀 규칙) — 안내/준수
- 기능 record (`frontend`/`backend`) 권장
- 시크릿 미포함 확인
