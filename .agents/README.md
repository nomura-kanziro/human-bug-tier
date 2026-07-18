# `.agents` — 전 AI 공통 권한 · 기능 스킬 (Canonical)

이 폴더는 **어떤 AI를 쓰든** (Grok · Claude · Codex · **그 외 번외 AI**)  
지켜야 할 **공통 룰 + 기능별 표준 skill.md** 의 **정본(canonical)** 입니다.

---

## 왜 Grok / Claude / Codex 는 따로 skill 이 있나?

| 구분 | 역할 |
|------|------|
| **Grok · Claude · Codex** | 이 프로젝트의 **주 골격(backbone)** AI. 가장 자주 쓰고, 권한·진입점이 명확함. 각 도구가 인식하는 **포맷·경로**가 달라 **전용 팩**을 둔다. |
| **`.agents`** | 도구와 무관한 **공통 정본**. 번외 AI(Cursor 기본, Gemini, 기타 채팅 등)도 **여기만 보고** 같은 품질로 작업 가능. |
| **Grok** | 사람 다음 **최고 권한 Admin AI**. `.agents` 수호, 다른 팩 정합. |

```
사람 (창시자/팀)  team/
        │
        ▼
   .agents/          ← 모든 AI 공통 정본 (룰 + 기능 skill.md)
        │
   ┌────┼────────────┐
   ▼    ▼            ▼
 Grok  Claude      Codex     … 번외 AI 도 .agents 만으로 충분
 (전용 팩은 주 골격 · 도구 최적화 복제본)
```

- **주 골격 AI** 전용 폴더  
  - Grok → `groks/<기능>/grok_skill.md` + `groks/AGENTS.md`  
  - Claude → `.claude/skills/<기능>/SKILL.md` + `CLAUDE.md`  
  - Codex → `codex/<기능>/skill.md` + 루트 `AGENTS.md`  
- 전용 팩 내용이 `.agents` 와 **모순되면 `.agents` 가 이김** (Grok이 정렬).  
- **번외 AI** 사용 인원:  
  1. `.agents/common-rules.md`  
  2. `.agents/<기능>/skill.md`  
  3. `RDMD/` · `team/` (사람)

---

## 읽는 순서

### 모든 AI (번외 포함)

1. [common-rules.md](./common-rules.md)  
2. [hierarchy.md](./hierarchy.md)  
3. **`.agents/<기능>/skill.md`**  
4. (주 골격이면) 자신 전용 팩으로 보강  
5. `RDMD/` 상세  

### 사람

→ [`team/`](../team/README.md)

---

## 루트 문서 (룰 · 권한)

| 파일 | 내용 |
|------|------|
| [hierarchy.md](./hierarchy.md) | 사람 > Grok > 기타 AI |
| [common-rules.md](./common-rules.md) | 전 AI MUST |
| [authority-matrix.md](./authority-matrix.md) | 권한 표 |
| [sync-skills.md](./sync-skills.md) | 정본→전용 팩 동기화 |

---

## 기능별 skill.md (공통 정본)

| 폴더 | 담당 |
|------|------|
| [project-wide/skill.md](./project-wide/skill.md) | 전역·크로스 모듈 |
| [common/skill.md](./common/skill.md) | header/footer, 경로·API Base |
| [tier-class/skill.md](./tier-class/skill.md) | 공식 티어 |
| [custom-maker/skill.md](./custom-maker/skill.md) | 커스텀·게시판 |
| [auth/skill.md](./auth/skill.md) | 인증 |
| [notice/skill.md](./notice/skill.md) | 공지 |
| [inquiry/skill.md](./inquiry/skill.md) | 문의 |
| [admin/skill.md](./admin/skill.md) | 관리자 |
| [notifications/skill.md](./notifications/skill.md) | 알림 |
| [backend/skill.md](./backend/skill.md) | Express API |
| [deploy/skill.md](./deploy/skill.md) | 배포 |
| [rdmd/skill.md](./rdmd/skill.md) | 문서 일지 |
| [handoff/skill.md](./handoff/skill.md) | 온보딩·인수인계 |

파일명: **`skill.md`** (도구 중립).

---

## 충돌 시

```
사람 창시자 지시
  > .agents (common-rules + 기능 skill.md)
  > 주 골격 전용 팩 (groks / .claude / codex)
  > RDMD 과거 일지
```

Grok(Admin)은 `.agents` 를 갱신·수호하고, 전용 팩이 어긋나면 맞춥니다.

---

## 스킬 작성 규칙

- When / Do / Do not / Checklist  
- 특정 제품명에 묶인 표현 최소화 (“Grok만”, “Claude 슬래시만” 지양) — 필요 시 “주 골격 팩 참고” 한 줄  
- 시크릿·`.env` 실값 금지  
- 배경은 `RDMD/features` · `RDMD/guides` 링크  
