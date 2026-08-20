# 06 — 작업 전·중·후 체크리스트

인쇄하거나 PR 템플릿으로 복사해 쓰세요.

---

## 작업 전

- [ ] 할 일이 한 문장으로 정의됨  
- [ ] `team/01-rules.md` · `04-prohibitions.md` 인지  
- [ ] 관련 폴더/모듈 README 또는 `RDMD/features` 확인  
- [ ] `.env` 는 로컬에만 있고 커밋 대상 아님  

## 구현 중

- [ ] 변경 파일이 요청 범위 안  
- [ ] 프론트: getBasePath / getApiBase / 올바른 Auth 헤더  
- [ ] 백엔드: 미들웨어 권한 맞음  
- [ ] 관리 기능이면 requireAdmin + getAdminAuthHeaders  
- [ ] 시크릿·localhost 하드코딩 없음  

## 작업 후 (필수 스모크)

`cd backend && npm start` → http://localhost:5000

- [ ] `/health`  
- [ ] 헤더/푸터 (가능하면 하위 폴더 페이지 포함)  
- [ ] 변경한 유저 시나리오 1회  
- [ ] 관리자 관련이면 admin 로그인 후 해당 동작  
- [ ] 콘솔·네트워크에 치명 에러 없음  

## 제출 전 (커밋 · 푸시)

- [ ] **`RDMD/commit_history/{본인}.md` 에 이번 커밋 내용 작성 완료** (목차+상세, 맨 아래 추가)  
- [ ] 커밋 메시지 = 로그에 적은 message 와 동일  
- [ ] **커밋 메시지 = `type(scope): 한국어 설명`** (type 영어, 콜론 뒤 한국어)  
- [ ] `git add` 에 위 md 포함  
- [ ] 커밋 메시지 이해 가능  
- [ ] diff에 `.env` / 키 / 비밀번호 없음  
- [ ] (권장) 큰 기능이면 `frontend`/`backend` record  
- [ ] (규칙 변경 시) `.agents` + `team` + 에이전트 스킬 동기화 여부  
- [ ] 그 다음 `git commit` → `git push`

## AI 결과물 받을 때 추가

- [ ] AI가 금지사항 어긴 줄 없는지  
- [ ] “전체 리팩터”가 몰래 들어오지 않았는지  
- [ ] 테스트는 **내가** :5000 에서 함  

---

**한 줄**: 빠르게 짜도 된다. **commit_history 없이 커밋·푸시하지 말 것. 커밋은 type 영어 + 콜론 뒤 한국어.**
