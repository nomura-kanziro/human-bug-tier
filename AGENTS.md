# AGENTS.md — Codex / 멀티 에이전트 진입점

이 파일은 **OpenAI Codex**(CLI · IDE)와 기타 에이전트가 프로젝트를 열 때 참고하는 **진입 지침**입니다.

## ⚠️ 모든 AI — 공통 정본 먼저

1. **[`.Agents/common-rules.md`](./.Agents/common-rules.md)**  
2. **[`.Agents/hierarchy.md`](./.Agents/hierarchy.md)** — Admin AI = Grok · Claude · Cursor (동등)  
3. **[`.Agents/skills/<기능>/SKILL.md`](./.Agents/README.md)** — 기능 표준 스킬 (번외 AI도 동일)  
4. Codex면 이어서 **`.Codex/skills/<기능>/SKILL.md`**

정본: [`.Agents/README.md`](./.Agents/README.md)  
(모든 에이전트 폴더는 `README.md` + `skills/<기능>/SKILL.md` 로 구조가 같음. 충돌 시 `.Agents` 우선)

사람(창시자·팀원) 규칙: [`team/README.md`](./team/README.md)

## 프로젝트

**휴버대 티어표** — 바닐라 HTML/CSS/JS + Express/MongoDB.  
공식 1~9티어(이미지 폴더 일치) · 커스텀 제작/게시판/**본인 글 수정** · 회원 · 공지(관리자 수정) · 문의 · 관리자 · PWA.  
**AI 전용 서비스** `ai-service/`(Python FastAPI · LangChain · LangGraph · RAG) — `/ai` 휴버봇. Express `/api/ai` 뒤에서만 호출. 정본 스킬 `.Agents/skills/ai-service/SKILL.md`.

> ⛔ **2026-09-19 창시자 지시 — 작업은 `root-cloudflare/`(React)에만 한다.**  
> `root-render/`(바닐라, Render.com)는 **베타 버전에서 업데이트 종료 → 수정 금지**.  
> 정본: [`.Agents/common-rules.md`](./.Agents/common-rules.md) ０항

## Codex가 할 일 (순서)

1. `.Agents` 공통 룰 준수  
2. 요청 기능 판별 → **`.Codex/skills/<기능>/SKILL.md`**  
3. 범위가 넓으면 `.Codex/skills/project-wide/SKILL.md`  
4. 상세 배경은 `RDMD/` (필요 구간만)  
5. 공통 룰 충돌 시 **Admin AI/사람** 기준으로 맞춤 (룰 약화 금지)

인덱스: [`.Codex/README.md`](./.Codex/README.md)

## 로컬 실행

```bash
cd backend
npm install
# .env.example → .env (MONGO_URI, ADMIN_INPUT_ID, ADMIN_INPUT_PW …)
npm start
```

→ http://localhost:5000/ (프론트 정적 + API 통합)

AI 서비스(선택): `cd ai-service` → venv + `pip install -r requirements.txt` → `python -m uvicorn app.main:app --host 127.0.0.1 --port 8000` ([`ai-service/README.md`](./ai-service/README.md))

## 불변 규칙

| 항목 | 규칙 |
|------|------|
| **작업 대상** | **`root-cloudflare/`(React)만.** `root-render/` 는 베타 종료 — **수정 금지** |
| 실행 | 풀스택 = `backend` 포트 **5000** |
| 경로 | React Router 절대 경로(`<Link to="/…">`), 이미지 `tierImageUrl()`. `getBasePath` 는 바닐라 전용 |
| API Base | `getApiBase()` — 개발 포트→`localhost:5000`, 동일 오리진→`''`, GH Pages→`GITHUB_STATIC` |
| 유저 | `authToken` + `getAuthHeaders()` |
| 관리자 | `adminAuthToken` + `getAdminAuthHeaders()` + **`requireAdmin`** |
| 비번 재설정 | 랜덤 토큰 + **SHA-256 해시만 DB** |
| 비밀 | `.env` 커밋·출력 금지 |
| 주석 | **기존 주석 삭제 금지.** 코드가 바뀌면 주석 **문구만** 수정. 사람이 “지워”라고 하기 전엔 유지 |
| 문서 | 큰 변경 → `RDMD/frontend|backend/<기능>/*-record.md` (AI 서비스는 `RDMD/ai/`) |
| AI 지식 | 기능·규칙을 바꾸면 `ai-service/knowledge/*.md` 동기화. AI 키 커밋 금지, 대화 저장 안 함 |

## 에이전트별 스킬 위치

| 계층 | 위치 |
|------|------|
| **공통 AI 룰** | **`.Agents/`** (Grok · Claude · Cursor 가 Admin 으로 수호) |
| **사람 룰** | **`team/`** |
| Codex 기능 스킬 | `.Codex/skills/<기능>/SKILL.md` |
| Claude | `CLAUDE.md` + `.Claude/skills/*/SKILL.md` |
| Grok | `.Grok/README.md` + `.Grok/skills/<기능>/SKILL.md` |
| Cursor | `.Cursor/README.md` + `.Cursor/skills/<기능>/SKILL.md` |
| Antigravity · Manus · Qwen | 각 폴더 `README.md` + `skills/<기능>/SKILL.md` |

규칙 변경: [`.Agents/sync-skills.md`](./.Agents/sync-skills.md)

## 작업 종료 시

- 변경 요약 (무엇을/왜)
- 수동 테스트 (`:5000`)
- **커밋·푸시 전** `RDMD/commit_history/{작성자}.md` 작성 필수 (팀 규칙) — 안내/준수
- 기능 record (`frontend`/`backend`) 권장
- 시크릿 미포함 확인
