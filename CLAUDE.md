# CLAUDE.md — 휴버대 티어표 (Claude Code / 팀 인수인계)

이 파일은 **Claude Code**가 프로젝트를 열 때 읽는 기본 지침이자,  
**팀원 온보딩·인수인계**용 요약입니다.

## 공통 계층 (필수)

1. **AI 공통 룰**: [`.agents/common-rules.md`](./.agents/common-rules.md)  
2. **권한**: [`.agents/hierarchy.md`](./.agents/hierarchy.md) — **Grok = Admin AI** (공통 룰 수호). Claude는 실무 에이전트로 공통 룰을 약화하지 않음.  
3. **사람 규칙**: [`team/`](./team/README.md) (온보딩·리뷰 시 참고)  
4. 그 다음 아래 Claude 절차 · `.claude/skills/`

## 프로젝트 한 줄

휴먼버그대학교 캐릭터 **공식 티어표** + **커스텀 티어 제작/게시판** +  
회원·공지·문의·관리자 기능을 갖춘 **바닐라 HTML/CSS/JS + Express/MongoDB** 사이트.

## 로컬 실행 (필수)

```bash
cd backend
npm install
cp .env.example .env   # Windows: copy .env.example .env
# .env 에 MONGO_URI, ADMIN_INPUT_ID, ADMIN_INPUT_PW 등 설정
npm start
```

→ **http://localhost:5000/** (프론트 정적 + API 통합)

`file://` 직접 열기 / GH Pages 만으로는 로그인·게시판 등 API가 동작하지 않습니다.

## Claude가 작업을 시작할 때

1. **`.agents/common-rules.md`** + **`.agents/<기능>/skill.md`** (공통 정본, 최우선)
2. 요청이 속한 기능을 판별한다.
3. **`.claude/skills/<기능>/SKILL.md`** 로 보강 (Claude 주 골격 팩)
4. 범위가 넓거나 애매하면 `.claude/skills/project-wide/SKILL.md` 를 읽는다.
5. 상세 배경·이력은 `RDMD/` (필요 구간만). 공통 룰 충돌 시 Grok/사람 기준.

| 기능 | 스킬 경로 | 코드 주요 위치 |
|------|-----------|----------------|
| 전역/새기능 | `.claude/skills/project-wide/SKILL.md` | 전 저장소 |
| 공통 경로·헤더 | `.claude/skills/common/SKILL.md` | `common.js`, `header.html` |
| 공식 티어 | `.claude/skills/tier-class/SKILL.md` | `tier-class/`, `tier-image/` |
| 커스텀·게시판 | `.claude/skills/custom-maker/SKILL.md` | `custom-maker/` |
| 인증 | `.claude/skills/auth/SKILL.md` | `user_login/`, `backend` auth |
| 공지 | `.claude/skills/notice/SKILL.md` | `notice/` |
| 문의 | `.claude/skills/inquiry/SKILL.md` | `Contact_us/` |
| 관리자 | `.claude/skills/admin/SKILL.md` | `admin/` |
| 알림 | `.claude/skills/notifications/SKILL.md` | Notification + `common.js` |
| 백엔드 | `.claude/skills/backend/SKILL.md` | `backend/` |
| 배포 | `.claude/skills/deploy/SKILL.md` | `DEPLOY.md`, `render.yaml` |
| 문서/RDMD | `.claude/skills/rdmd/SKILL.md` | `RDMD/` |
| 인수인계 | `.claude/skills/handoff/SKILL.md` | 팀 온보딩 |

인덱스: [`.claude/README.md`](./.claude/README.md)

## 불변 규칙 (짧게)

| 항목 | 규칙 |
|------|------|
| 실행 | 풀스택 = `backend` 포트 **5000** |
| 경로 | `getBasePath()` / `fixRootLinksInElement` — 절대 `/...` 하드코딩 금지 |
| API Base | `getApiBase()` 등 — 개발 포트→`localhost:5000`, 동일 오리진→`''`, GH Pages→`GITHUB_STATIC` |
| 유저 토큰 | `localStorage.authToken` + `getAuthHeaders()` |
| 관리자 | `adminAuthToken` + `getAdminAuthHeaders()` + 서버 **`requireAdmin`** |
| 비번 재설정 | 랜덤 토큰 + **SHA-256 해시만 DB** (JWT URL 방식 금지) |
| 비밀 | `.env` 커밋·출력 금지. `.env.example` 만 공유 |
| 문서 | 큰 변경 → `RDMD/frontend|backend/<기능>/*-record.md` + features/guides |

## 문서 지도 (사람 + AI)

| 목적 | 위치 |
|------|------|
| 시연·소개 | `README.md` |
| 배포 | `DEPLOY.md` |
| 작업 이력 요약 | `RDMD/summary/work-history.md` |
| 기능 설명 | `RDMD/features/` |
| 개발 가이드 | `RDMD/guides/` |
| 커밋 단위 일지 | `RDMD/frontend/`, `RDMD/backend/` (기능 폴더 + record) |
| Grok 전용 스킬 | `groks/` (Claude는 `.claude/skills` 우선) |
| Claude 스킬 | `.claude/skills/*/SKILL.md` |
| Codex 스킬 | `AGENTS.md` + `codex/*/skill.md` |
| **AI 공통 룰** | **`.agents/`** |
| **사람 규칙** | **`team/`** |

## 폴더 한눈에

```
index.html, common.js, header/footer   # 공통
tier-class/, tier-image/               # 공식 티어
custom-maker/                          # 제작 + 게시판
user_login/                            # 인증
notice/                                # 공지
Contact_us/                            # 문의
admin/                                 # 관리자
backend/                               # Express + Mongo + 정적 서빙
RDMD/                                  # 기록·가이드
groks/                                 # Grok 스킬
.claude/skills/                        # Claude 스킬
```

## 작업 종료 시 Claude가 할 일

1. 변경 요약 (무엇을 / 왜)
2. 수동 테스트 방법 (`:5000` 기준)
3. **커밋·푸시 전** `RDMD/commit_history/{작성자}.md` 작성 필수 안내 (팀 규칙)
4. 큰 기능이면 `frontend`/`backend` record 제안
5. 시크릿이 diff에 없는지 확인

## 팀원에게

- 첫날: `README.md` 시연 → `team/` → `RDMD/summary/work-history.md` → `RDMD/features/overview.md` → `RDMD/guides/path-and-api.md` → **커밋 전 `commit_history` 규칙**
- Claude 사용: 이 `CLAUDE.md` + 해당 기능 `SKILL.md`
- Grok 사용: `groks/AGENTS.md` + `groks/<기능>/grok_skill.md`
- Codex 사용: `AGENTS.md` + `codex/<기능>/skill.md`
- 스킬 세트는 **같은 규칙**을 다른 에이전트 포맷으로 둔 것입니다. 규칙 변경 시 `codex` · `groks` · `.claude` 를 맞추세요.
