# codex — OpenAI Codex 전용 스킬

이 폴더는 **휴버대 티어표**에서 Codex(CLI/IDE)가 따를 **기능별 작업 지침**입니다.  
ChatGPT Codex / Codex VS Code 확장과 함께 쓰도록 맞춰 두었습니다.

## 사용 방법 (Codex 에이전트)

1. **[`.agents/common-rules.md`](../.agents/common-rules.md)**  
2. **[`.agents/<기능>/skill.md`](../.agents/README.md)** — 공통 기능 정본  
3. 루트 **`AGENTS.md`**  
4. **`codex/<기능>/skill.md`** — Codex 주 골격 보강  
5. 충돌 시 **`.agents` 우선** (약화 금지). Grok = Admin AI  
6. 배경 `RDMD/`, 사람 `team/`  
7. 작업 후: **커밋·푸시 전** `RDMD/commit_history/{작성자}.md` 작성 필수 안내 + 기능 record 권장

사람은 온보딩·체크리스트로도 사용 가능.

## 기능 폴더 목록

| 폴더 | 담당 | 트리거 예 |
|------|------|-----------|
| [project-wide](./project-wide/skill.md) | 전역·새기능·크로스 모듈 | 전체, 리팩터, 구조 |
| [common](./common/skill.md) | header/footer, getBasePath, API Base | 헤더, 404, 경로 |
| [tier-class](./tier-class/skill.md) | 공식 1~9 티어 | 티어표, 캐릭터 |
| [custom-maker](./custom-maker/skill.md) | 제작·게시판·댓글 | 커스텀, 좋아요 |
| [auth](./auth/skill.md) | 가입·로그인·재설정 | 로그인, JWT |
| [notice](./notice/skill.md) | 공지·핀 | notice, 새 소식 |
| [inquiry](./inquiry/skill.md) | 문의 | Contact_us |
| [admin](./admin/skill.md) | 관리자 | 차단, 신고 관리 |
| [notifications](./notifications/skill.md) | 알림 | notification |
| [backend](./backend/skill.md) | Express API | 라우트, mongoose |
| [deploy](./deploy/skill.md) | 배포 | Render, env |
| [rdmd](./rdmd/skill.md) | 문서 일지 | RDMD, 기록 |
| [handoff](./handoff/skill.md) | 온보딩·인수인계 | 팀, 처음 |

## 다른 에이전트와의 관계

| 에이전트 | 위치 |
|----------|------|
| Codex | `AGENTS.md` + `codex/*/skill.md` |
| Claude | `CLAUDE.md` + `.claude/skills/*/SKILL.md` |
| Grok | `groks/AGENTS.md` + `groks/*/grok_skill.md` |

규칙 변경 시 **세 세트 + RDMD/guides** 동기화.

## 스킬 파일 규칙

- 파일명: **`skill.md`** (Codex 세트 표준)
- YAML frontmatter: `name`, `description`
- 본문: 에이전트 지시 중심 (배경은 RDMD 링크)
- 시크릿·`.env` 실값 금지

## 관련 문서

- [`RDMD/README.md`](../RDMD/README.md)
- [`RDMD/features/`](../RDMD/features/README.md)
- [`RDMD/guides/`](../RDMD/guides/README.md)
- 루트 [`README.md`](../README.md) · [`DEPLOY.md`](../DEPLOY.md)
