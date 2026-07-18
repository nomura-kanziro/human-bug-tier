---
name: hbu-deploy
description: >
  Render.com, GitHub Pages, render.yaml, DEPLOY.md, 환경변수, 배포 경로.
  배포·환경 설정 작업 시 사용.
---

# 에이전트 스킬 — 배포 (deploy)

## When

- Render / GitHub Pages 배포
- `render.yaml`, `DEPLOY.md`, `.env.example`
- 배포 후 API·경로 깨짐
- 환경변수 안내

## Code map

| 경로 | 역할 |
|------|------|
| `DEPLOY.md` | 배포 가이드 |
| `render.yaml` | Render Blueprint |
| `backend/.env.example` | env 템플릿 |
| `backend/server.js` | 정적+API 통합 |
| `.github/workflows/deploy-pages.yml` | GH Pages |
| `common.js` getBasePath / getApiBase | 프론트 환경 분기 |

## Read first

- `DEPLOY.md`
- `RDMD/guides/deploy-checklist.md`
- `RDMD/guides/path-and-api.md`

## Do

1. **풀스택 권장 경로 = Render** (backend rootDir, Mongo Atlas)
2. **GH Pages = 정적 미리보기만** — API 없다고 명시
3. 로컬 검증: `cd backend && npm start` (포트 5000 통합)
4. env 안내 시 **이름만** 나열, 사용자 비밀 값 요구·저장 금지
5. `APP_URL` 배포 URL 설정 안내 (메일 링크)
6. path/API 수정 시 common + auth_api + admin_api 일관성
7. `render.yaml` 변경 시 start/build/rootDir 일치 확인

## Do not

- `.env` 내용을 채팅/커밋에 붙이기
- `npx serve -p 5000` 을 프로덕션 대체로 추천
- GH Pages에서 로그인·게시판 “고침”을 배포 완료로 오안내
- Mongo IP 제한을 무시하라고 단정 (Atlas 설정은 사용자 책임으로 안내)

## Agent tasks

### A. 배포 문서/설정 수정
1. DEPLOY.md · render.yaml · .env.example 동기화  
2. 체크리스트 항목 업데이트 (`RDMD/guides/deploy-checklist.md`)  

### B. 배포 후 404 / API 실패
1. Root Directory = backend 여부  
2. 정적 파일 projectRoot  
3. getApiBase 가 상대 경로인지  
4. Mongo / 로그  

### C. 메일 링크 잘못됨
1. APP_URL  
2. appUrl.js  
3. 재설정·인증 메일 템플릿  

### D. GH Pages only
1. 워크플로 확인  
2. getBasePath 서브패스  
3. API 불가 UX (GITHUB_STATIC)  

## Checklist

- [ ] 로컬 :5000 스모크 안내
- [ ] 필수 env 목록 제시 (값 없이)
- [ ] Render vs Pages 역할 구분 명시
- [ ] 시크릿 미노출
