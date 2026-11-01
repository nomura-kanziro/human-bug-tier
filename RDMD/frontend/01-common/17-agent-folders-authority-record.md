---
area: frontend
---

# 작업 기록 — 에이전트 폴더 대문자화 · 구조 통일 · 최고 권한 확대

## 요청

> 에이전트 인수인계 폴더를 추가할껀데 .Antigravity, .Cursor, .Manus, .Qwen 이렇게 4개 추가할꺼고 최고 권한은 이제부터 Claude랑 Cursor도 부여하기. 그리고 나서 에이전트 폴더들은 맨앞에 대문자로 변경하고 그리고 .groks는 .Grok으로 변경 ㄱㄱ 그리고 나서 모든 문서를 업데이트 하고 에이전트 관련 작업 완성도를 확인해서 알려줄 것

## 바뀐 것

| 항목 | 내용 |
|------|------|
| 폴더 이름 | `.agents`→`.Agents`, `.claude`→`.Claude`, `.codex`→`.Codex`, `.groks`→`.Grok` |
| 새 폴더 | `.Antigravity`, `.Cursor`, `.Manus`, `.Qwen` |
| 구조 | **모든 폴더를 `.Claude` 와 같게**: `README.md` + `skills/<기능>/SKILL.md`(19개). 옛 `.Grok/skills/<기능>/SKILL.md`, `.Codex/skills/<기능>/SKILL.md`, `.Agents/skills/<기능>/SKILL.md` 는 이동. `.Grok/README.md` 는 README 로 합침 |
| 최고 권한 AI | Grok 단독 → **Grok · Claude · Cursor**(동등) |
| 실무 AI | Codex · Antigravity · Manus · Qwen |
| 용어 | "주 골격"을 없애고 모두 **에이전트 폴더**로 통일 |
| 점검 문서 | [`.Agents/agent-status.md`](../../../.Agents/agent-status.md) 신설 |

경로 문구와 권한·구조 문구를 `.Agents`, 에이전트 폴더, `CLAUDE.md`·`AGENTS.md`·`README.md`, `team/`, `RDMD/` 에서 고쳤다.

## 판단한 것

- **`.agents` 도 `.Agents` 로 바꿨다.** 요청의 "에이전트 폴더들"에 포함된다고 해석했다.
- **처음엔 새 폴더를 README 만 두는 얇은 구조로 만들었으나, 창시자가 "에이전트 폴더들은 .Claude랑 같은 구조여야 함. 각자 따로 노는 느낌"이라고 지시해 전부 통일했다.** 비어 있던 스킬은 `.Agents` 정본 본문 + `.Claude` 의 description 으로 채웠고, 각 복제본 첫머리에 정본 링크를 달았다.
- **`.Agents` 도 `skills/` 구조로 옮겼다.** 공통 문서 5개는 루트에 그대로 둔다.
- **`.Cursor/rules/hbt-project.mdc` 만 예외로 남겼다.** Cursor 에게 이 폴더를 읽으라고 알려 주는 규칙이다.
- **Admin AI 끼리 해석이 다르면 사람에게 묻는다.** 셋을 동등하게 두면 생기는 빈틈이라 추가했다. 지시에 없던 규칙이라 창시자 확인 대상이다.

## 대소문자 주의

Windows 는 대소문자를 구분하지 않고 git 도 `core.ignorecase=true` 라, 이름 변경은 `git mv a a.__tmp__` 후 `git mv a.__tmp__ b` 두 단계로 했다.

도구가 찾는 이름은 소문자(`.claude`, `.cursor`)다. Windows·macOS 기본 설정에서는 그대로 동작하지만 Linux 에서는 `ln -s .Claude .claude` · `ln -s .Cursor .cursor` 가 필요하다.

## 작업 중 사고

첫 치환 스크립트는 Bash heredoc 이 `\\` 를 `\` 로 줄이면서 정규식이 빈 문자열에 걸렸고, `.md` 275개의 글자 사이마다 경로 문자열이 들어갔다. 시작 시점의 작업 트리가 깨끗했고 바뀐 파일이 `.md` 뿐인 것을 확인한 뒤 `git reset --hard HEAD` 로 되돌렸다. 스크립트는 파일로 다시 쓰고, 빈 문자열 일치·길이 이상을 만나면 멈추는 검사와 사전 실행을 넣었다.

## 확인한 것 / 못 한 것

- 대소문자까지 따져 상대 링크를 검사했다(대상: 에이전트 폴더 8종, `RDMD`, `team`, 루트 문서).
- Claude Code(Windows)는 이름을 바꾼 `.Claude/skills` 를 읽는다. 스킬 설명을 고치자 실행 중인 세션의 스킬 목록에 반영되는 것을 봤다.
- Cursor·Grok·Codex·Antigravity·Manus·Qwen 의 자동 로드는 시험하지 못했다.

## 내용 동기화와 규칙 정리

- **복제 방식**: 정본을 현재 코드 기준으로 고친 뒤 7종에 복제했다. 본문은 모두 같고 제목의 에이전트 이름과 정본 링크만 다르다.
- **보존**: 기존 Claude·Codex·Grok 스킬에만 있던 줄을 추려 보고, 지금도 유효한 절차·금지 사항은 정본으로 옮겼다. 바닐라 경로(`common.js`, `header.html` 등)를 설명하는 줄은 옮기지 않았다. 옛 내용은 커밋 전 트리 `git show e0c46d7:.groks/...` 로 볼 수 있다.
- **새 스킬**: `guide`, `event`.
- **최근 기능 반영**: 출석체크·출석판, AI 프록시, 할로윈 이펙트, 사이트 버전.
- **공통 룰 개정(창시자 승인)**:
  - 경로 규칙을 React Router 절대 경로로 바꿨다(`common-rules.md` B절).
  - AI 배포는 창시자가 그 배포를 명시 지시했을 때 Admin AI 만 한다(`authority-matrix.md`).
  - 권한표 각주의 배포 문서를 `CLOUDFLARE.md`·`backend/deploy/oracle/` 로 바꿨다.
  - Cloudflare "지시 대기" 문구를 운영 중 기준으로 고쳤다.
- **Admin AI 끼리 해석이 다르면 사람에게 묻는 규칙**은 창시자가 "남아있는 작업들 진행할 것"으로 진행을 지시해 유지했다.
