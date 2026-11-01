# `.Agents` — 전 AI 공통 권한 · 기능 스킬 (Canonical)

이 폴더는 **어떤 AI를 쓰든** (Grok · Claude · Cursor · Codex · Antigravity · Manus · Qwen · Gemini · Ollama · Opencode · Kimi · Windsurf · **그 외 번외 AI**)  
지켜야 할 **공통 룰 + 기능별 표준 `skills/<기능>/SKILL.md`** 의 **정본(canonical)** 입니다.

---

## 에이전트 폴더 구성

| 구분 | 역할 |
|------|------|
| **에이전트 폴더 12종** `.Grok` · `.Claude` · `.Cursor` · `.Codex` · `.Antigravity` · `.Manus` · `.Qwen` · `.Gemini` · `.Ollama` · `.Opencode` · `.Kimi` · `.Windsurf` | 모두 같은 구조(`README.md` + `skills/<기능>/SKILL.md`). 정본 스킬을 에이전트별로 복제해 둔 폴더. |
| **`.Agents`** | 도구와 무관한 **공통 정본**. 전용 폴더가 없는 번외 AI(그 외 채팅 등)도 **여기만 보고** 같은 품질로 작업 가능. |
| **Grok · Claude · Cursor** | 사람 다음 **최고 권한 Admin AI**(셋은 동등). `.Agents` 수호, 다른 폴더 정합. |

```
사람 (창시자/팀)  team/
        │
        ▼
   .Agents/          ← 모든 AI 공통 정본 (룰 + skills/<기능>/SKILL.md)
        │
   ├─ 에이전트 폴더(같은 구조의 복제본) .Grok · .Claude · .Cursor · .Codex · .Antigravity · .Manus · .Qwen · .Gemini · .Ollama · .Opencode · .Kimi · .Windsurf
   └─ 번외 AI 는 .Agents 만으로 충분
```

- 에이전트별 전용 폴더  
  - Grok → `.Grok/skills/<기능>/SKILL.md` + `.Grok/README.md`  
  - Claude → `.Claude/skills/<기능>/SKILL.md` + `CLAUDE.md`  
  - Codex → `.Codex/skills/<기능>/SKILL.md` + 루트 `AGENTS.md`  
  - Cursor → `.Cursor/skills/<기능>/SKILL.md` + `.Cursor/README.md`  
  - Antigravity → `.Antigravity/skills/<기능>/SKILL.md` + `.Antigravity/README.md`  
  - Manus → `.Manus/skills/<기능>/SKILL.md` + `.Manus/README.md`  
  - Qwen → `.Qwen/skills/<기능>/SKILL.md` + `.Qwen/README.md`  
  - Gemini → `.Gemini/skills/<기능>/SKILL.md` + `.Gemini/README.md`  
  - Ollama → `.Ollama/skills/<기능>/SKILL.md` + `.Ollama/README.md`  
  - Opencode → `.Opencode/skills/<기능>/SKILL.md` + `.Opencode/README.md`  
  - Kimi → `.Kimi/skills/<기능>/SKILL.md` + `.Kimi/README.md`  
  - Windsurf → `.Windsurf/skills/<기능>/SKILL.md` + `.Windsurf/README.md`  
- 전용 폴더 내용이 `.Agents` 와 **모순되면 `.Agents` 가 이김** (Admin AI 가 정렬).  
- **번외 AI** 사용 인원:  
  1. `.Agents/common-rules.md`  
  2. `.Agents/skills/<기능>/SKILL.md`  
  3. `RDMD/` · `team/` (사람)

---

## 읽는 순서

### 모든 AI (번외 포함)

1. [common-rules.md](./common-rules.md)  
2. [hierarchy.md](./hierarchy.md)  
3. **`.Agents/skills/<기능>/SKILL.md`**  
4. (전용 폴더가 있으면) 자신 폴더로 보강  
5. `RDMD/` 상세  

### 사람

→ [`team/`](../team/README.md)

---

## 루트 문서 (룰 · 권한)

| 파일 | 내용 |
|------|------|
| [hierarchy.md](./hierarchy.md) | 사람 > Grok · Claude · Cursor > 실무 AI |
| [common-rules.md](./common-rules.md) | 전 AI MUST (D-5: 기존 주석 삭제 금지) |
| [authority-matrix.md](./authority-matrix.md) | 권한 표 |
| [sync-skills.md](./sync-skills.md) | 정본→전용 폴더 동기화 |
| [agent-status.md](./agent-status.md) | 에이전트 폴더 완성도 점검 결과 |

---

## 기능별 스킬 (공통 정본)

| 폴더 | 담당 |
|------|------|
| [skills/project-wide/SKILL.md](./skills/project-wide/SKILL.md) | 전역·크로스 모듈 |
| [skills/common/SKILL.md](./skills/common/SKILL.md) | header/footer, 경로·API Base |
| [skills/tier-class/SKILL.md](./skills/tier-class/SKILL.md) | 공식 티어 |
| [skills/custom-maker/SKILL.md](./skills/custom-maker/SKILL.md) | 커스텀·게시판 |
| [skills/auth/SKILL.md](./skills/auth/SKILL.md) | 인증 |
| [skills/notice/SKILL.md](./skills/notice/SKILL.md) | 공지 |
| [skills/inquiry/SKILL.md](./skills/inquiry/SKILL.md) | 문의 |
| [skills/admin/SKILL.md](./skills/admin/SKILL.md) | 관리자 |
| [skills/notifications/SKILL.md](./skills/notifications/SKILL.md) | 알림 |
| [skills/luck-draw/SKILL.md](./skills/luck-draw/SKILL.md) | 행운 뽑기 (+ 출석체크) |
| [skills/ai-service/SKILL.md](./skills/ai-service/SKILL.md) | **AI 전용 서비스** — `/ai` 휴버봇, `ai-service/`(FastAPI · LangChain · LangGraph · RAG), `/api/ai` 프록시, 지식 문서 |
| [skills/my-page/SKILL.md](./skills/my-page/SKILL.md) | 마이페이지 · 프로필 드롭다운 |
| [skills/guide/SKILL.md](./skills/guide/SKILL.md) | 가이드 페이지 · 가이드 모드 |
| [skills/event/SKILL.md](./skills/event/SKILL.md) | 이벤트 · 이벤트 디자인 |
| [skills/backend/SKILL.md](./skills/backend/SKILL.md) | Express API |
| [skills/deploy/SKILL.md](./skills/deploy/SKILL.md) | 배포 |
| [skills/rdmd/SKILL.md](./skills/rdmd/SKILL.md) | 문서 일지 |
| [skills/handoff/SKILL.md](./skills/handoff/SKILL.md) | 온보딩·인수인계 |
| [skills/react-rewrite/SKILL.md](./skills/react-rewrite/SKILL.md) | React 전환 기록 (작업은 `root-cloudflare/`) |

파일명: **`SKILL.md`** (모든 에이전트 폴더 동일).

---

## 충돌 시

```
사람 창시자 지시
  > .Agents (common-rules + 기능 SKILL.md)
  > 에이전트 전용 폴더 (.Grok / .Claude / .Codex / .Cursor / .Antigravity / .Manus / .Qwen / .Gemini / .Ollama / .Opencode / .Kimi / .Windsurf)
  > RDMD 과거 일지
```

Admin AI 는 `.Agents` 를 갱신·수호하고, 전용 폴더가 어긋나면 맞춥니다.

---

## 스킬 작성 규칙

- When / Do / Do not / Checklist  
- 특정 제품명에 묶인 표현 최소화 (“Grok만”, “Claude 슬래시만” 지양) — 필요 시 “에이전트 폴더 참고” 한 줄  
- 시크릿·`.env` 실값 금지  
- 배경은 `RDMD/features` · `RDMD/guides` 링크  
