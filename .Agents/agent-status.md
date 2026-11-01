# 에이전트 폴더 완성도 점검

> **점검일 2026-11-02.** 같은 날 실무 폴더 5종(`.Gemini` · `.Ollama` · `.Opencode` · `.Kimi` · `.Windsurf`)을 더한 뒤 다시 측정했다. 스킬을 고치면 다시 측정해 맞춥니다.  
> 권한의 정본은 [hierarchy.md](./hierarchy.md), 동기화 순서는 [sync-skills.md](./sync-skills.md) 입니다.

## 1. 폴더별 상태

모든 폴더가 `README.md` + `skills/<기능>/SKILL.md` 구조이고, 스킬의 `name` 은 폴더 이름과 같습니다. 복제본 본문은 정본과 같고, 제목의 에이전트 이름과 첫머리 정본 링크만 다릅니다.

| 폴더 | 권한 | 기능 스킬 | 구조 밖 파일 | 자동 로드 확인 |
|------|------|-----------|--------------|----------------|
| `.Agents` | 정본 | 19/19 | 공통 문서 5개 | 해당 없음 |
| `.Claude` | Admin | 19/19 | 없음 | Windows 에서 확인: 새 스킬과 수정한 설명이 실행 중인 세션의 스킬 목록에 나타남. Linux 는 링크 필요 |
| `.Grok` | Admin | 19/19 | 없음 | 확인 못 함 |
| `.Cursor` | Admin | 19/19 | `rules/hbt-project.mdc` | 확인 못 함 |
| `.Codex` | 실무 | 19/19 | 없음 | 확인 못 함 |
| `.Antigravity` | 실무 | 19/19 | 없음 | 확인 못 함 |
| `.Manus` | 실무 | 19/19 | 없음 | 확인 못 함 |
| `.Qwen` | 실무 | 19/19 | 없음 | 확인 못 함 |
| `.Gemini` | 실무 | 19/19 | 없음 | 확인 못 함 |
| `.Ollama` | 실무 | 19/19 | 없음 | 확인 못 함 |
| `.Opencode` | 실무 | 19/19 | 없음 | 확인 못 함 |
| `.Kimi` | 실무 | 19/19 | 없음 | 확인 못 함 |
| `.Windsurf` | 실무 | 19/19 | 없음 | 확인 못 함 |

"확인 못 함"은 해당 도구를 이 점검에서 직접 실행하지 않았다는 뜻입니다. 동작하지 않는다는 뜻이 아닙니다.

## 2. 검사 결과

- **상대 링크**: 에이전트 폴더 13개(`.Agents` 포함)의 상대 링크 332개를 대소문자까지 구분해 검사했다. 깨진 링크 없음. `RDMD/commit_history` 와 옛 일지에 있던 깨진 링크는 이력이라 그대로 두었다.
- **스킬에 적힌 코드 경로**: `.Agents/skills` 에 적힌 `root-cloudflare/`·`src/`·`backend/`·`ai-service/`·`RDMD/` 파일 경로를 실제 파일과 대조. 없는 경로 없음.

## 3. 알고 두는 잔여 항목

- **`root-render/` README 4개**(`README.md`, `luck-draw/`, `my-page/`, `notifications/`)는 옛 경로(`.agents/…`, `.claude/…`)를 적어 두고 있습니다. `root-render/` 는 수정 금지라 그대로 둡니다. `root-render/README.md` 의 링크는 Windows 에서 열리지만, 나머지 3개가 글로 적은 `.agents/<기능>/skill.md` 는 이제 없는 경로입니다.
- **`RDMD/commit_history/nomura.md`** 와 옛 작업 기록은 이력이라 당시 경로·문구를 그대로 둡니다.
- **`RDMD/guides/path-and-api.md`** 본문은 바닐라 설명으로 남겨 두고, 맨 위에 현재 규칙을 적었습니다.
- **Linux** 에서는 도구가 `.Claude`·`.Cursor`·`.Gemini`·`.Opencode`·`.Windsurf` 를 못 찾습니다. `ln -s .Claude .claude` · `ln -s .Cursor .cursor` · `ln -s .Gemini .gemini` · `ln -s .Opencode .opencode` · `ln -s .Windsurf .windsurf` 가 필요합니다([hierarchy.md](./hierarchy.md) 3절). Kimi·Ollama 는 소문자 폴더를 자동으로 찾는지 확인하지 못했습니다.
