# CLAUDE.md — 휴버대 티어표 (Claude Code / 팀 인수인계)

이 파일은 **Claude Code**가 프로젝트를 열 때 읽는 기본 지침이자,  
**팀원 온보딩·인수인계**용 요약입니다.

## 공통 계층 (필수)

1. **AI 공통 룰**: [`.Agents/common-rules.md`](./.Agents/common-rules.md)  
2. **권한**: [`.Agents/hierarchy.md`](./.Agents/hierarchy.md) — **Admin AI = Grok · Claude · Cursor** (셋은 동등, 공통 룰 수호). Claude 는 Admin AI 로서 공통 룰을 지키고 약화하지 않으며, 다른 Admin AI 와 해석이 다르면 사람에게 묻는다.  
3. **사람 규칙**: [`team/`](./team/README.md) (온보딩·리뷰 시 참고)  
4. 그 다음 아래 Claude 절차 · `.Claude/skills/`

## 프로젝트 한 줄

휴먼버그대학교 캐릭터 **공식 티어표** + **커스텀 티어 제작/게시판** +  
회원·공지·문의·관리자 기능을 갖춘 **Express/MongoDB** 사이트.  
2026-10-18 부터 **AI 전용 서비스 `ai-service/`**(Python FastAPI · LangChain · LangGraph · RAG)가 `/ai` 휴버봇 답변을 맡는다 — Express 와 분리된 별도 프로세스.

> ⛔ **2026-09-19 창시자 지시 — 프론트 작업은 `root-cloudflare/`(React 정식 버전)에만 한다.**  
> `root-render/`(바닐라, Render.com 배포)는 **베타 버전에서 업데이트 종료** — 기능 추가·버그 수정 포함 **모든 수정 금지**.  
> `backend/` 는 공용 API 서버라 계속 작업한다. 정본: [`.Agents/common-rules.md`](./.Agents/common-rules.md) ０항

## 로컬 실행 (필수)

```bash
cd backend
npm install
# 루트 또는 backend 에 env 설정 (example 복사)
# Windows: copy .env.example .env  (루트) / cd backend & copy .env.example .env
# 필수: MONGO_URI, ADMIN_INPUT_ID, ADMIN_INPUT_PW
npm start
```

→ **http://localhost:5000/** (프론트 정적 + API 통합)

AI 도우미(`/ai`)까지 보려면 AI 서비스를 따로 띄운다(Ollama `gemma4:12b`·`bge-m3` 필요 — `ollama pull` 후. Ollama 가 꺼져 있으면 문서 검색 답으로 동작):

```bash
cd ai-service
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt   # Linux/macOS: .venv/bin/python
.venv/Scripts/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```  
env 로드: 루트 `.env` 후 `backend/.env` (동일 키는 backend 우선)

`file://` 직접 열기 / GH Pages 만으로는 로그인·게시판 등 API가 동작하지 않습니다.

## Claude가 작업을 시작할 때

1. **`.Agents/common-rules.md`** + **`.Agents/skills/<기능>/SKILL.md`** (공통 정본, 최우선)
2. 요청이 속한 기능을 판별한다.
3. **`.Claude/skills/<기능>/SKILL.md`** 로 보강
4. 범위가 넓거나 애매하면 `.Claude/skills/project-wide/SKILL.md` 를 읽는다.
5. 상세 배경·이력은 `RDMD/` (필요 구간만). 공통 룰 충돌 시 사람 기준(Admin AI 끼리 다르면 사람에게 묻는다).

> 아래 표의 코드 위치는 `root-cloudflare/src/` 기준이다 (`root-render/` 는 수정 금지).

| 기능 | 스킬 경로 | 코드 주요 위치 |
|------|-----------|----------------|
| 전역/새기능 | `.Claude/skills/project-wide/SKILL.md` | 전 저장소 |
| 공통 경로·헤더 | `.Claude/skills/common/SKILL.md` | `components/Header.jsx`, `Footer.jsx`, `lib/api.js`, `lib/paths.js` |
| 공식 티어 | `.Claude/skills/tier-class/SKILL.md` | `pages/TierPage.jsx`, `data/tiers.json`, `public/tier-media/tier-image/` |
| 커스텀·게시판 | `.Claude/skills/custom-maker/SKILL.md` | `pages/CustomMaker.jsx`, `Board.jsx`, `PostDetail.jsx`, `PostEdit.jsx` |
| 인증 | `.Claude/skills/auth/SKILL.md` | `pages/Login.jsx`, `SignUp.jsx`, `FindAccount.jsx`, `ResetPassword.jsx`, `backend` auth |
| 공지 | `.Claude/skills/notice/SKILL.md` | `pages/NoticeHome.jsx`, `NoticeList.jsx`, `NoticeDetail.jsx` |
| 문의 | `.Claude/skills/inquiry/SKILL.md` | `pages/Inquiry.jsx` |
| 관리자 | `.Claude/skills/admin/SKILL.md` | `pages/AdminDashboard.jsx`, `components/Admin*.jsx` |
| 알림 | `.Claude/skills/notifications/SKILL.md` | `components/NotificationBell.jsx`, `lib/notifications.js`, `pages/Notifications.jsx` |
| 행운 뽑기·출석체크 | `.Claude/skills/luck-draw/SKILL.md` | `pages/LuckDraw.jsx`, `backend/*luckDraw*`, `backend/utils/attendance.js` |
| 마이페이지 | `.Claude/skills/my-page/SKILL.md` | `pages/MyPage.jsx`, `components/UserProfileMenu.jsx`, `AttendanceBoard.jsx` |
| 가이드 모드 | `.Claude/skills/guide/SKILL.md` | `pages/Guide.jsx`, `components/GuideMode.jsx`, `lib/guideCourses.js` |
| 이벤트·이벤트 디자인 | `.Claude/skills/event/SKILL.md` | `pages/EventPage.jsx`, `lib/season.js`, `backend/routes/eventRoutes.js` |
| 백엔드 | `.Claude/skills/backend/SKILL.md` | `backend/` |
| AI 전용 서비스 | `.Claude/skills/ai-service/SKILL.md` | `ai-service/`(FastAPI·LangGraph·RAG), `backend/routes/aiRoutes.js`, `pages/AiHelper.jsx` |
| 배포 | `.Claude/skills/deploy/SKILL.md` | `CLOUDFLARE.md`, `backend/deploy/oracle/` (Oracle 운영 서버), `root-cloudflare/functions/` (Pages `/api` 프록시) |
| 문서/RDMD | `.Claude/skills/rdmd/SKILL.md` | `RDMD/` |
| 인수인계 | `.Claude/skills/handoff/SKILL.md` | 팀 온보딩 |
| React 전환 기록 | `.Claude/skills/react-rewrite/SKILL.md` | 전환 이력 (작업은 `root-cloudflare/`) |

인덱스: [`.Claude/README.md`](./.Claude/README.md)

## 불변 규칙 (짧게)

| 항목 | 규칙 |
|------|------|
| **작업 대상** | **`root-cloudflare/`(React)만.** `root-render/` 는 베타 종료 — **수정 금지** |
| 실행 | 풀스택 = `backend` 포트 **5000** |
| 경로 | React Router 절대 경로(`<Link to="/…">`), 이미지 `tierImageUrl()`. `getBasePath` 는 바닐라 전용 |
| API Base | `src/lib/api.js`(`getApiBase`, `apiRequest`) — 개발 포트→`localhost:5000`, 동일 오리진→`''`, GH Pages→`GITHUB_STATIC` |
| 유저 토큰 | `localStorage.authToken` + `getAuthHeaders()` |
| 관리자 | `adminAuthToken` + `getAdminAuthHeaders()` + 서버 **`requireAdmin`** |
| 비번 재설정 | 랜덤 토큰 + **SHA-256 해시만 DB** (JWT URL 방식 금지) |
| 비밀 | `.env` 커밋·출력 금지. `.env.example` 만 공유 |
| 주석 | **기존 주석 삭제 금지.** 코드가 바뀌면 주석 **문구만** 수정. 사람이 “지워”라고 하기 전엔 유지 |
| 문서 | 큰 변경 → `RDMD/frontend|backend/<기능>/*-record.md` + features/guides (AI 서비스는 `RDMD/ai/`) |
| AI 지식 | 사이트 기능·규칙(수치·메뉴 이름)을 바꾸면 `ai-service/knowledge/*.md` 도 같이 고친다. AI 키는 `ai-service/.env` 에만, 대화는 저장하지 않음 |

## 문서 지도 (사람 + AI)

| 목적 | 위치 |
|------|------|
| 시연·소개 | `README.md` |
| 배포 | `DEPLOY.md` |
| 작업 이력 요약 | `RDMD/summary/work-history.md` |
| 기능 설명 | `RDMD/features/` |
| 개발 가이드 | `RDMD/guides/` |
| 커밋 단위 일지 | `RDMD/frontend/`, `RDMD/backend/` (기능 폴더 + record) |
| Grok 전용 스킬 | `.Grok/` (Claude는 `.Claude/skills` 우선) |
| Claude 스킬 | `.Claude/skills/*/SKILL.md` |
| Codex 스킬 | `AGENTS.md` + `.Codex/skills/*/SKILL.md` |
| 에이전트 폴더 | `.Grok` · `.Claude` · `.Cursor` · `.Codex` · `.Antigravity` · `.Manus` · `.Qwen` · `.Gemini` · `.Ollama` · `.Opencode` · `.Kimi` · `.Windsurf` (모두 `README.md` + `skills/<기능>/SKILL.md`) |
| 에이전트 완성도 점검 | `.Agents/agent-status.md` |
| **AI 공통 룰** | **`.Agents/`** |
| **사람 규칙** | **`team/`** |

## 폴더 한눈에

```
root-cloudflare/                       # ✅ React 정식 버전 (Vite) — 작업은 여기서만. npm run build → dist/ 를 backend 가 서빙
root-render/                           # ⛔ Render.com 바닐라 프론트 — 베타 종료, 수정 금지(보관용)
backend/                               # Express + Mongo + 정적 서빙 (공용, 작업 가능)
ai-service/                            # AI 전용 서비스 — FastAPI · LangChain · LangGraph · RAG (/api/ai 뒤, 127.0.0.1:8000)
RDMD/                                  # 기록·가이드
CLOUDFLARE.md                          # 배포 정본
.Agents/                               # 모든 AI 공통 정본 (룰 + 기능 skill)
.Grok/ · .Claude/ · .Cursor/ · .Codex/ · .Antigravity/ · .Manus/ · .Qwen/ · .Gemini/ · .Ollama/ · .Opencode/ · .Kimi/ · .Windsurf/  # 에이전트 폴더 (같은 구조: README.md + skills/<기능>/SKILL.md)
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
- Grok 사용: `.Grok/README.md` + `.Grok/skills/<기능>/SKILL.md`
- Codex 사용: `AGENTS.md` + `.Codex/skills/<기능>/SKILL.md`
- Cursor 사용: `.Cursor/README.md` + `.Cursor/skills/<기능>/SKILL.md`
- Antigravity · Manus · Qwen · Gemini · Ollama · Opencode · Kimi · Windsurf 사용: 각 폴더 `README.md` + `skills/<기능>/SKILL.md`
- 에이전트 폴더 12종은 **같은 구조·같은 규칙**입니다. 규칙 변경 시 `.Agents` 정본부터 고치고 12종을 맞추세요.
- ⚠ 도구가 찾는 폴더 이름은 소문자입니다(`.claude`, `.cursor`, `.gemini`, `.opencode`, `.windsurf`). Linux 에서는 `ln -s .Claude .claude` · `ln -s .Cursor .cursor` · `ln -s .Gemini .gemini` · `ln -s .Opencode .opencode` · `ln -s .Windsurf .windsurf` 가 필요합니다.
