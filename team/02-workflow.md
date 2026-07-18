# 02 — 해야 할 것 · 작업 흐름

## 일상 개발 흐름

```
1. 이슈/할 일 확인
2. team/01-rules · 04-prohibitions 훑기
3. 관련 RDMD/features/*.md 또는 모듈 README
4. 브랜치 생성 (팀 규칙에 따름)
5. 구현 (프론트/백 해당 레이어)
6. localhost:5000 수동 테스트
7. ★ RDMD/commit_history/{본인}.md 에 커밋 내용 작성 (필수)
8. git add (코드 + commit_history md)
9. git commit → (hash 기입 권장) → git push
10. (권장) 큰 기능이면 frontend/backend *-record.md
11. 리뷰 · 머지
```

> **7번을 건너뛰고 커밋·푸시하지 말 것.**  
> 상세: [RDMD/commit_history/README.md](../RDMD/commit_history/README.md)

## 기능별 “어디를 만지나”

| 할 일 | 주로 볼 곳 |
|------|------------|
| 헤더/경로/공통 | `common.js`, `header.html`, `footer.html` |
| 공식 티어 | `tier-class/`, `tier-image/` |
| 커스텀·게시판 | `custom-maker/` |
| 로그인 | `user_login/` |
| 공지 | `notice/` |
| 문의 | `Contact_us/` |
| 관리자 | `admin/` |
| API·DB | `backend/` |
| 배포 설정 | `DEPLOY.md`, `render.yaml` |

AI에게 맡길 때도 위 경로를 지정하면 범위가 좁혀집니다.

## 새 기능 추가 시 해야 할 것

1. 권한(비로그인/회원/관리자) 정의  
2. API 필요 시 `routes → controllers → models`  
3. 관리 기능이면 `requireAdmin`  
4. 프론트 path/API base 규칙  
5. `RDMD/guides/new-feature-checklist.md` 체크  
6. 큰 기능이면 `RDMD/features/` 한 줄 + record  

## 버그 수정 시 해야 할 것

1. 재현 경로 적기 (어느 URL, 로그인 여부)  
2. 최소 수정  
3. 같은 계열 회귀 (예: 경로 버그면 하위 폴더 2곳 이상)  
4. 고친 이유 한 줄  

## 배포 전 해야 할 것

- [ ] `RDMD/guides/deploy-checklist.md`  
- [ ] `.env` 가 git에 없는지  
- [ ] 관리자 계정·JWT 강도  
- [ ] `/health` · 핵심 시나리오  
- 실행은 **사람** (콘솔·시크릿)

## 창시자가 추가로 해야 할 것

- 팀 온보딩: `team/` + `RDMD/summary` + `README` 시연  
- 규칙 개정 시 `.agents` + `team` + 에이전트 3팩 동기화 지시 (Grok Admin AI 활용 가능)  
- 시크릿·인프라 최종 관리  
