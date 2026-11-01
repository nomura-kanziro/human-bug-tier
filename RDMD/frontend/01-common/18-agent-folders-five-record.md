---
area: frontend
---

# 작업 기록 — 실무 에이전트 폴더 5종 추가

## 요청

> .Gemini .Ollama .Opencode .Kimi .Windsurf 이 5개를 현재 에이전트 폴더들의 구조를 완전히 잘 맞춰서 같게 만들고 한 치 오차없이 만들었으면 한다.

## 바뀐 것

| 항목 | 내용 |
|------|------|
| 새 폴더 | `.Gemini` · `.Ollama` · `.Opencode` · `.Kimi` · `.Windsurf` |
| 구조 | 기존 실무 폴더와 같음. `README.md` + `skills/<기능>/SKILL.md` 19개 |
| 권한 | **실무 에이전트**. Admin AI 는 그대로 Grok · Claude · Cursor |
| 스킬 본문 | `.Qwen` 복제본과 같고, 제목의 에이전트 이름만 다름 |
| 문서 | 살아 있는 규칙의 에이전트 목록을 12종으로 맞춤. `.Agents` 정본을 먼저 고치고 복제본을 맞춘 뒤 5종을 복제 |
| 점검 | [`.Agents/agent-status.md`](../../../.Agents/agent-status.md) 에 5행 추가 |

## 판단한 것

- **권한은 실무로 두었다.** 이번에 최고 권한을 넓히라는 지시는 없었다. 폴더 구조를 같게 만드는 일과 권한을 올리는 일은 별개다.
- **복제 원본은 `.Qwen` 이다.** 실무 폴더의 스킬은 서로 같고 제목만 다르다. 새 폴더도 그 형식이다.
- **「쓰는 법」 문단만 도구마다 다르다.** 기존 폴더도 이 문단은 도구마다 다르다. Gemini·Opencode·Windsurf 는 도구가 소문자 폴더를 찾는 경우의 Linux 링크를 적었다. Kimi·Ollama 는 그 경로를 확인하지 못해 적지 않았다.
- **Ollama 폴더는 휴버봇 모델 설정이 아니다.** `gemma4`·`bge-m3` 는 `ai-service/` 용이다.
- **`.Cursor/rules/` 같은 예외 파일은 넣지 않았다.** 예외는 Cursor 규칙 파일뿐이다.
- **옛 기록은 고치지 않았다.** `17-agent-folders-authority-record.md` 와 `commit_history` 는 당시 문장 그대로다. `root-render/` 는 수정하지 않았다.

## 확인한 것 / 못 한 것

- 새 폴더 스킬 19개는 `.Qwen` 과 비교해 제목의 이름만 다르다.
- 다섯 README 는 같은 절 구성을 유지하고, 관계 표에 12종이 모두 있다.
- 다섯 도구로 자동 로드를 시험하지는 못했다. 각 README 에 그 사실을 적었다.
