# 스킬 · 규칙 동기화

## 정본

**`.Agents/`** = 모든 AI 공통 정본  
- `common-rules.md`  
- `<기능>/skill.md`  

에이전트 폴더는 **정본의 복제본**이고, 구조가 모두 같다.

| 에이전트 | 경로 | 파일명 |
|---------|------|--------|
| Grok · Claude · Cursor (Admin AI) | `.Grok/skills/<기능>/` · `.Claude/skills/<기능>/` · `.Cursor/skills/<기능>/` | `SKILL.md` |
| Codex · Antigravity · Manus · Qwen · Gemini · Ollama · Opencode · Kimi · Windsurf (실무) | `.Codex/skills/<기능>/` · `.Antigravity/skills/<기능>/` · `.Manus/skills/<기능>/` · `.Qwen/skills/<기능>/` · `.Gemini/skills/<기능>/` · `.Ollama/skills/<기능>/` · `.Opencode/skills/<기능>/` · `.Kimi/skills/<기능>/` · `.Windsurf/skills/<기능>/` | `SKILL.md` |

`name` 은 폴더 이름과 같게 둔다.  
본문은 정본과 같다(제목의 에이전트 이름과 첫머리 정본 링크만 다름). **복제본은 손으로 고치지 말고 정본을 고친 뒤 12종에 복제한다.** `description` 은 폴더별로 트리거 키워드를 다르게 둘 수 있다.  
**번외 AI**는 전용 폴더 없이 `.Agents` 만 사용.

## 동기화 순서 (규칙·기능 스킬 변경 시)

1. **`.Agents/common-rules.md`** 및/또는 **`.Agents/skills/<기능>/SKILL.md`**  
2. **`team/`** (사람에게 영향 있으면)  
3. 에이전트 폴더 12종 내용 정렬 (Do/Do not 모순 제거)  
4. `RDMD/guides/` 상세  
5. 루트 `README` / `AGENTS.md` / `CLAUDE.md` / `.Grok/README.md` 진입 문구  

Admin AI 가 이 순서를 점검·지시한다.

## 새 기능 스킬 추가

1. `.Agents/skills/<새기능>/SKILL.md` 생성 (정본)  
2. 에이전트 폴더 12종의 `skills/<기능>/SKILL.md` 에 같은 내용 추가, 각 README 의 트리 갱신  
3. `.Agents/README.md` 표 갱신  
4. 각 전용 README 인덱스 갱신  

## 충돌

```
.Agents 정본 > 에이전트 전용 폴더 > 오래된 RDMD 문장
```
