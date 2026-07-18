---
name: handoff
description: >
  팀 인수인계, 온보딩, 신규 팀원 가이드, "처음 보는 사람", "클로드 가이드",
  프로젝트 설명, handoff, onboarding. Use when /handoff.
---

# Claude 스킬 — 팀 인수인계 · 온보딩

## When

- 새 팀원 / 본인이 Claude로 프로젝트를 처음 다룰 때
- “인수인계”, “온보딩”, “프로젝트 설명해”, “클로드 가이드”
- 전체 구조·실행·문서 위치를 한 번에 안내할 때

## Do (에이전트가 할 일)

1. **루트 `CLAUDE.md`를 읽고** 실행 방법·불변 규칙을 요약해 전달한다.
2. 아래 **Day-0 체크리스트**를 순서대로 안내한다 (코드 수정 전).
3. 담당 예정 기능이 있으면 해당 `.claude/skills/<기능>/SKILL.md` 경로를 알려 준다.
4. 민감 정보(실 비밀번호, MONGO URI 실값)는 묻지 말고, `.env.example` 키 이름만 안내한다.
5. Grok → `groks/`, Codex → `codex/` + 루트 `AGENTS.md` 도 짧게 언급한다.

## Do not

- 첫 응답에서 전체 RDMD 29개 파일을 한꺼번에 덤프하지 말 것
- 배포 시크릿을 예시로 지어내 적지 말 것
- “GH Pages만 켜면 전부 된다”고 말하지 말 것

---

## Day-0 체크리스트 (팀원용)

### 1) 환경

```bash
cd backend
npm install
copy .env.example .env    # mac/linux: cp .env.example .env
# MONGO_URI, ADMIN_INPUT_ID, ADMIN_INPUT_PW 채우기
npm start
```

브라우저: http://localhost:5000/

- [ ] `/health` 확인  
- [ ] 메인·티어1·커스텀 메이커 페이지 로드  
- [ ] 헤더/푸터 깨지지 않음  

### 2) 읽기 순서 (사람)

| 순서 | 문서 | 목적 |
|:----:|------|------|
| 1 | `README.md` | 시연·기능 소개 |
| 2 | `CLAUDE.md` | AI·팀 공통 규칙 |
| 3 | `RDMD/summary/work-history.md` | 지금까지 한 일 |
| 4 | `RDMD/features/overview.md` | 기능 맵 |
| 5 | `RDMD/guides/path-and-api.md` | 경로/API 함정 |
| 6 | `DEPLOY.md` | 배포 (필요할 때) |

### 3) 기능별 코드 위치

| 기능 | 폴더 | Claude 스킬 |
|------|------|-------------|
| 공통 UI/경로 | `common.js`, header/footer | `common` |
| 공식 티어 | `tier-class/`, `tier-image/` | `tier-class` |
| 커스텀·게시판 | `custom-maker/` | `custom-maker` |
| 로그인 | `user_login/` | `auth` |
| 공지 | `notice/` | `notice` |
| 문의 | `Contact_us/` | `inquiry` |
| 관리자 | `admin/` | `admin` |
| API 서버 | `backend/` | `backend` |

### 4) 꼭 기억할 함정

1. **항상** `backend` 로 통합 실행 (포트 5000)  
2. 하위 폴더 링크 깨짐 → `getBasePath`  
3. 관리 API → `requireAdmin` + `getAdminAuthHeaders()`  
4. 비번 재설정 토큰은 DB에 **해시만**  
5. `.env` 는 git에 넣지 않음  

### 5) 첫 실습 시나리오

1. 회원가입 또는 기존 유저 로그인  
2. 커스텀 메이커에서 배치 후 (가능하면) 게시판 업로드  
3. `/admin/admin-login.html` 관리자 로그인  
4. 공지 하나 작성 → 메인 미리보기 확인  
5. 문의 작성 → 관리자 답변  

---

## 인수인계 문서 업데이트 시

담당자가 떠날 때 / 큰 기능 완료 시:

1. `RDMD/summary/work-history.md` 에 Phase 한 줄  
2. 해당 `RDMD/features/*.md`  
3. `.claude/skills` · `groks` · `codex` 규칙 동기화  
4. `CLAUDE.md` / `AGENTS.md` 표·경로가 맞는지 확인  

## Checklist (이 스킬 응답 후)

- [ ] 실행 방법 전달
- [ ] 읽기 순서 전달
- [ ] 담당 기능 스킬 경로 제시
- [ ] 함정 5가지 언급
- [ ] 시크릿 미노출
