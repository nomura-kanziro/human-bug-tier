# 스킬 · 규칙 동기화

## 정본

**`.agents/`** = 모든 AI 공통 정본  
- `common-rules.md`  
- `<기능>/skill.md`  

주 골격 전용 팩은 **도구 최적화 복제본**이다.

| 주 골격 | 경로 | 파일명 |
|---------|------|--------|
| Grok (Admin AI) | `groks/<기능>/` | `grok_skill.md` |
| Claude | `.claude/skills/<기능>/` | `SKILL.md` |
| Codex | `codex/<기능>/` | `skill.md` |

**번외 AI**는 전용 팩 없이 `.agents` 만 사용.

## 동기화 순서 (규칙·기능 스킬 변경 시)

1. **`.agents/common-rules.md`** 및/또는 **`.agents/<기능>/skill.md`**  
2. **`team/`** (사람에게 영향 있으면)  
3. 주 골격 3팩 내용 정렬 (Do/Do not 모순 제거)  
4. `RDMD/guides/` 상세  
5. 루트 `README` / `AGENTS.md` / `CLAUDE.md` / `groks/AGENTS.md` 진입 문구  

Grok(Admin)이 이 순서를 점검·지시한다.

## 새 기능 스킬 추가

1. `.agents/<새기능>/skill.md` 생성 (정본)  
2. (선택) 주 골격 3팩에 동일 내용 이식  
3. `.agents/README.md` 표 갱신  
4. 각 전용 README 인덱스 갱신  

## 충돌

```
.agents 정본 > 주 골격 전용 팩 > 오래된 RDMD 문장
```
