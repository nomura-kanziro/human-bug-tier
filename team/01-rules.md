# 01 — 공통 룰 (사람 · 팀)

창시자·팀원 **전원**이 지키는 최소 규칙입니다.  
AI 쪽 대응 문서: [`.agents/common-rules.md`](../.agents/common-rules.md)

---

## 1. 실행 환경

- 풀기능 확인은 **`backend` 서버 포트 5000**  
  ```bash
  cd backend
  npm install
  npm start
  ```
- Live Server 등 다른 포트는 미리보기용. API는 5000을 바라봄.  
- `file://` 로 HTML만 열어 전체 기능을 테스트하지 말 것.

## 2. 비밀 · 보안

- **루트 `.env` / `backend/.env` 커밋 금지** — `.env.example` 만 공유  
- 로컬: 루트 `.env.example` → `.env`, 필요 시 `backend/.env.example` → `backend/.env`  
- 채팅·이슈·스크린샷에 비밀번호·Mongo URI·JWT 실값 올리지 말 것  
- 관리자 비밀번호는 팀 채널이 아닌 안전한 방식으로만 공유  

## 3. 경로 · 프론트

- 하위 폴더 페이지에서도 헤더/푸터가 깨지지 않게  
  → `getBasePath`, 상대 링크, `common.js` 패턴 유지  
- API 주소 하드코딩 (`https://...` 또는 프로덕션에 localhost) 금지  
- 상세: `RDMD/guides/path-and-api.md`

## 4. 권한

- **일반 유저**와 **관리자** 토큰·API를 섞지 말 것  
- 관리 기능 추가 시 서버에 `requireAdmin`, 프론트에 `getAdminAuthHeaders()`  
- 비밀번호 재설정 토큰은 DB에 **해시만**

## 5. 변경 범위

- 이슈/요청과 **관련 없는 파일**을 대량 수정하지 말 것  
- “일단 전체 포맷” 금지 (리뷰 불가능)  
- 공용 파일(`common.js`, `middleware/auth.js`) 수정 시 **회귀 테스트** 필수  

## 6. 기록 · 커밋 전 로그 (필수)

### 6-1. commit_history (매 커밋 필수)

**`git commit` / `git push` 하기 전에** 반드시:

1. `RDMD/commit_history/{본인이름}.md` 에 이번 커밋 내용 작성  
   - 목차 행(맨 아래) + 상세 블록(맨 아래)  
   - 정렬: 위=과거, 아래=최신  
2. 커밋 메시지·요약·범위를 확정 (실제 `git commit -m` 과 동일)  
   - 형식: **`type(scope): 한국어 설명`** — type은 `feat`/`fix`/`docs` 등 **영어**, 콜론 뒤는 **한국어**  
   - [04-prohibitions](./04-prohibitions.md)  
3. 그 md 파일을 **스테이징에 포함**한 뒤 커밋  
4. 푸시  

- nomura → `RDMD/commit_history/nomura.md`  
- 절차 상세 → [RDMD/commit_history/README.md](../RDMD/commit_history/README.md)  
- **로그 없이 커밋·푸시 = 규칙 위반**  
- **콜론 뒤 설명만 영어 = 규칙 위반**

### 6-2. 기능 일지 (권장)

- 의미 있는 기능 변경 후 `RDMD/frontend` 또는 `RDMD/backend` 에 `*-record.md`  
- 규칙 자체를 바꿀 때는 **창시자 합의** + `.agents` / `team` 동시 갱신

## 7. AI 사용 시 (사람)

- AI가 준 코드도 **이 룰·04-prohibitions** 를 통과해야 머지  
- Grok = 규칙/전역 정렬에 강한 Admin AI, Claude/Codex = 구현 보조로 활용 가능  
- AI에게 시크릿을 붙여 넣지 말 것  
