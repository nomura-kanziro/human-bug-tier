# groks — Grok 에이전트 전용 스킬

이 폴더는 **휴버대 티어표** 저장소 전용 Grok 에이전트 지침입니다.  
각 기능 폴더의 `grok_skill.md`를 읽고, 해당 영역 작업 시 그 절차를 따릅니다.

## 사용 방법 (에이전트 · Grok Admin)

1. **`.agents/common-rules.md`** + **`.agents/<기능>/skill.md`** (정본)  
2. Grok Admin: [`AGENTS.md`](./AGENTS.md) · hierarchy  
3. 기능 → `groks/<기능>/grok_skill.md` (주 골격 보강)  
4. 작업 후 RDMD · 정본/팩 동기화 (`sync-skills`)

사람 규칙: [`../team/`](../team/README.md)

사람(개발자)이 직접 볼 때도 온보딩 체크리스트로 쓸 수 있다.

## 기능 폴더 목록

| 폴더 | 담당 영역 | 트리거 키워드 예 |
|------|-----------|------------------|
| [common](./common/grok_skill.md) | header/footer, common.js, 경로·API Base | 헤더, getBasePath, 404, 링크 |
| [tier-class](./tier-class/grok_skill.md) | 공식 1~9 티어표 | 티어표, 캐릭터 추가, tier1 |
| [custom-maker](./custom-maker/grok_skill.md) | 제작·게시판·댓글 | 커스텀, 게시판, 드래그, 좋아요 |
| [auth](./auth/grok_skill.md) | 가입·로그인·비번 재설정 | 로그인, JWT, 회원가입 |
| [notice](./notice/grok_skill.md) | 공지·새 소식·핀 | 공지, notice, pin |
| [inquiry](./inquiry/grok_skill.md) | 문의하기 | 문의, Contact_us |
| [admin](./admin/grok_skill.md) | 관리자 대시보드 | 관리자, 차단, 신고 관리 |
| [notifications](./notifications/grok_skill.md) | 알림 | 알림, notification |
| [backend](./backend/grok_skill.md) | Express API·모델·미들웨어 | API, 라우트, mongoose |
| [deploy](./deploy/grok_skill.md) | Render·GH Pages·env | 배포, render, DEPLOY |
| [rdmd](./rdmd/grok_skill.md) | 개발 기록·가이드 문서 | RDMD, 일지, 문서화 |
| [project-wide](./project-wide/grok_skill.md) | 전역 규칙·크로스 기능 | 새 기능, 전체, 리팩터 |

## 관련 문서

- 기능 설명: [`RDMD/features/`](../RDMD/features/README.md)
- 가이드라인: [`RDMD/guides/`](../RDMD/guides/README.md)
- 작업 이력: [`RDMD/summary/work-history.md`](../RDMD/summary/work-history.md)
- **Claude**: [`../.claude/`](../.claude/README.md), [`../CLAUDE.md`](../CLAUDE.md)
- **Codex**: [`../codex/`](../codex/README.md), [`../AGENTS.md`](../AGENTS.md)

규칙 변경 시 **`.agents` 정본** 후 `groks` · `.claude` · `codex` · `team` 을 맞춥니다.  
([sync-skills.md](../.agents/sync-skills.md))

## 스킬 파일 규칙

- 파일명: 반드시 `grok_skill.md`
- 언어: 한국어 지침 + 필요 시 코드/경로 영문 그대로
- 본문은 **에이전트 지시** 중심 (장황한 배경 설명은 RDMD로 링크)
- 시크릿·`.env` 실제 값 기록 금지
