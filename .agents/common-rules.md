# 전 에이전트 공통 룰 (MUST)

**모든 AI**(Grok, Claude, Codex 및 이후 추가 에이전트)는  
기능 스킬을 읽기 **전에** 이 문서를 준수합니다.

Grok은 이 문서의 **수호자(Admin AI)** 입니다.  
다른 에이전트는 이 룰을 완화·무시하는 스킬을 만들지 않습니다.

---

## A. 실행 · 환경

1. 풀스택 검증은 항상 `cd backend && npm start` → **포트 5000**  
2. `file://` 단독 실행, GH Pages 만으로 “풀기능 OK” 단정 금지  
3. `.env` 실값 읽어서 채팅에 출력·커밋 금지 (키 이름만 안내)

---

## B. 경로 · API (프론트)

1. 내부 링크: `getBasePath()` / 상대 경로 — 선행 `/` 하드코딩 지양  
2. header/footer 주입 후 `fixRootLinksInElement` 패턴 유지  
3. API: `getApiBase()` / 모듈 `get*ApiBase()`  
   - 개발 포트 → `http://localhost:5000`  
   - 동일 오리진 → `''`  
   - GH Pages → `GITHUB_STATIC` (API 호출 가드)  
4. 프로덕션 코드에 `localhost:5000` 고정 금지  

상세: `RDMD/guides/path-and-api.md`

---

## C. 인증 · 인가

| 주체 | 토큰 | 헤더 | 서버 |
|------|------|------|------|
| 일반 유저 | `authToken` | `getAuthHeaders()` | `requireAuth` |
| 관리자 | `adminAuthToken` | `getAdminAuthHeaders()` | **`requireAdmin`** |

1. 관리 API에 일반 유저 토큰으로 “되게” 만들지 말 것  
2. 새 관리 라우트 = **반드시 requireAdmin**  
3. 비밀번호 재설정: **랜덤 토큰 + SHA-256 해시만 DB** (JWT URL 방식 금지)  
4. 토큰·비밀번호 평문 로그/응답 금지  

상세: `RDMD/guides/security.md`

---

## D. 코드 변경 범위

1. 요청 범위 밖 대규모 리팩터·포맷 금지  
2. `node_modules` 수정 금지  
3. 시크릿·실 계정 정보를 소스/문서에 박지 말 것  
4. 레이어: 백엔드는 `routes → controllers → models`  

---

## E. 문서 · 커밋 로그 · 스킬 동기화

1. **사람 커밋·푸시 전 (필수, 팀이 지킬 규칙)**  
   - `RDMD/commit_history/{작성자}.md` 에 커밋 내용 작성 후 커밋·푸시  
   - 에이전트가 커밋을 **대신 제안·수행**할 때도 이 순서를 **상기·준수**  
   - **커밋 메시지(`git commit -m`)·history `message` = 한국어** — 영어 전용 메시지 금지 (`team/04-prohibitions.md`)  
   - 상세: `RDMD/commit_history/README.md`  
2. 의미 있는 변경 → `RDMD/frontend|backend/<기능>/*-record.md` (해당 시)  
3. 공통 룰 변경 → **`.agents` 먼저**, 그다음  
   - `groks/` · `.claude/skills/` · `codex/` · `team/`  
4. 한 에이전트 스킬만 “느슨한 규칙”으로 단독 변경 금지  
5. 상세 이력은 `RDMD/` 링크  

동기화: [sync-skills.md](./sync-skills.md)

---

## F. 작업 종료 시 (에이전트 응답)

모든 에이전트는 작업 후 가능하면:

1. **무엇을 / 왜** 바꿨는지 요약  
2. **수동 테스트** (`:5000` 기준)  
3. **commit_history** 작성 여부 안내 (사람 필수 규칙) + 기능 record 제안  
4. 시크릿 미포함 확인  

---

## G. Grok 전용 추가 의무 (Admin AI)

1. 다른 에이전트가 공통 룰을 깨면 **지적하고 수정**  
2. 전역(경로·보안·배포) 이슈는 기능 스킬보다 **이 문서 우선**  
3. `.agents` 와 `team/` 이 모순이면 사람에게 알리고 정본을 맞출 것  

---

## H. 금지 요약 (한 장)

- ❌ `.env` 커밋/출력  
- ❌ 관리 API 무인증  
- ❌ getBasePath/getApiBase 무시 URL  
- ❌ GH Pages = 풀 API  
- ❌ 요청 없는 전 파일 리포맷  
- ❌ 시크릿을 README/RDMD/스킬에 기록  
- ❌ **commit_history 없이 커밋·푸시** (사람 필수; AI도 상기)  
- ❌ **영어 전용 커밋 메시지** (한국어 필수; AI도 상기)  
