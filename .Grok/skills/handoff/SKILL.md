---
name: handoff
description: >
  팀 인수인계, 온보딩, 신규 팀원 가이드, "처음 보는 사람", "클로드 가이드",
  프로젝트 설명, handoff, onboarding. Use when /handoff.
---

# Grok 스킬 — 팀 인수인계 · 온보딩

> 정본 [`.Agents/skills/handoff/SKILL.md`](../../../.Agents/skills/handoff/SKILL.md) 의 복제본입니다. 규칙은 정본부터 고칩니다.

## When

- 새 팀원, “인수인계”, “온보딩”, “프로젝트 설명해”
- **번외 AI** 사용자에게 어디를 보라고 안내할 때

## 현재 상태 (반드시 말할 것)

- 프론트는 두 폴더: `root-cloudflare/`(React) · `root-render/`(바닐라)
- ✅ **작업은 `root-cloudflare/`(React)에만 한다** (2026-09-19 창시자 지시)
- ⛔ **`root-render/`(Render.com 바닐라)는 베타 버전에서 업데이트 종료 — 수정 금지**(보관용)
- ⛔ `npm run sync:render` 금지 — React 수정을 바닐라 구본으로 덮어씁
- ✅ `backend/` 는 두 프론트 공용 API 서버 — 계속 작업
- 바닐라 기능은 React 에 100% 반영 완료: `RDMD/features/react-rewrite.md`

## Do

1. 사람 → [`team/README.md`](../../../team/README.md)  
2. AI(아무 제품) → [`.Agents/common-rules.md`](../../../.Agents/common-rules.md) + 이 폴더 기능 `skills/<기능>/SKILL.md`  
3. 전용 폴더가 있는 AI면 추가로:  
   - Grok → `.Grok/`  
   - Claude → `CLAUDE.md` + `.Claude/skills/`  
   - Codex → `AGENTS.md` + `.Codex/`  
   - Cursor → `.Cursor/`  
   - Antigravity → `.Antigravity/`  
   - Manus → `.Manus/`  
   - Qwen → `.Qwen/`  
   - Gemini → `.Gemini/`  
   - Ollama → `.Ollama/`  
   - Opencode → `.Opencode/`  
   - Kimi → `.Kimi/`  
   - Windsurf → `.Windsurf/`  
4. 실행: `cd backend && npm start` → `:5000`  
5. 시크릿 실값 묻지/출력하지 말 것  

## Do not

- RDMD 전체 일지 덤프
- “GH Pages만 되면 전부 됨”
- 시크릿 예시 날조
- 첫 응답에서 RDMD 파일을 한꺼번에 덤프

## Day-0 (사람)

| 순서 | 문서 |
|:----:|------|
| 1 | `README.md` |
| 2 | `team/01-rules.md` · `04-prohibitions.md` |
| 3 | `RDMD/summary/work-history.md` |
| 4 | `RDMD/features/overview.md` |
| 5 | `RDMD/guides/path-and-api.md` |

## Day-0 (번외 AI에게 시킬 때)

```
1. .Agents/common-rules.md
2. .Agents/skills/<기능>/SKILL.md
3. RDMD/features/<기능>.md
4. 코드 수정 후 localhost:5000 테스트 안내
```

## 실행

```bash
cd backend
npm install
copy .env.example .env    # mac/linux: cp .env.example .env
# MONGO_URI, ADMIN_INPUT_ID, ADMIN_INPUT_PW 채우기
npm start
```

브라우저: http://localhost:5000/ — `/health`, 메인·티어·커스텀 메이커 로드, 헤더/푸터 확인.

## 기능별 코드 위치

| 기능 | 코드 | 스킬 |
|------|------|------|
| 공통 UI/경로 | `src/components/Header.jsx`, `Footer.jsx`, `src/lib/` | `common` |
| 공식 티어 | `src/pages/TierPage.jsx`, `src/data/tiers.json` | `tier-class` |
| 커스텀·게시판 | `src/pages/CustomMaker.jsx`, `Board.jsx`, `PostDetail.jsx` | `custom-maker` |
| 로그인 | `src/pages/Login.jsx`, `SignUp.jsx` | `auth` |
| 공지 | `src/pages/NoticeHome.jsx`, `NoticeList.jsx`, `NoticeDetail.jsx` | `notice` |
| 문의 | `src/pages/Inquiry.jsx` | `inquiry` |
| 관리자 | `src/pages/AdminDashboard.jsx` | `admin` |
| 이벤트 | `src/pages/EventPage.jsx` | `event` |
| 가이드 | `src/pages/Guide.jsx`, `src/components/GuideMode.jsx` | `guide` |
| API 서버 | `backend/` | `backend` |
| AI 도우미 | `ai-service/`, `src/pages/AiHelper.jsx` | `ai-service` |

## 첫 실습

1. 회원가입 또는 기존 유저 로그인
2. 커스텀 메이커에서 배치 후 게시판 업로드
3. `/admin/login` 관리자 로그인
4. 공지 하나 작성 → 메인 미리보기 확인 (운영 서버에서는 전체 회원 알림이 가므로 로컬에서만)
5. 문의 작성 → 관리자 답변

## 인수인계 문서 업데이트 시

담당자가 떠날 때 / 큰 기능 완료 시:

1. `.Agents` 정본과 에이전트 폴더 12종 규칙 동기화
2. `CLAUDE.md` / `AGENTS.md` 표·경로가 맞는지 확인

## 함정 6

1. backend :5000 통합  
2. 내부 이동은 React Router, API 는 `src/lib/api.js`  
3. requireAdmin + getAdminAuthHeaders  
4. 재설정 토큰 해시만 DB  
5. `.env` 미커밋  
6. **커밋·푸시 전 `RDMD/commit_history/{본인}.md` 미작성**  

## Checklist

- [ ] 실행 방법 전달
- [ ] 담당 기능 스킬 경로 제시
- [ ] 실행 방법 전달
- [ ] 담당 기능 스킬 경로 제시
- [ ] team / .Agents 경로 안내
- [ ] commit_history 규칙 안내 (커밋 전 필수)
- [ ] 에이전트 폴더 12종(같은 구조) / 번외 AI 구분 설명
- [ ] 시크릿 미노출
