# 새 기능 추가 체크리스트

기능을 하나 넣을 때 빠지기 쉬운 항목을 순서대로 점검합니다.

---

## 0. 설계 (짧게)

- [ ] 누가 쓰는가? (비로그인 / 회원 / 관리자)  
- [ ] 데이터는 Mongo 모델이 필요한가, 정적 HTML로 충분한가?  
- [ ] 기존 모듈에 붙일지, 새 폴더를 만들지  
- [ ] 알림·신고·차단 중 연동이 필요한가  

문서: [features/overview.md](../features/overview.md)

---

## 1. 백엔드 (API 필요 시)

- [ ] `models/` 스키마  
- [ ] `controllers/` 비즈니스 로직  
- [ ] `routes/` 등록 + `server.js` 마운트 확인  
- [ ] `requireAuth` / `requireAdmin` / 소유권 검사  
- [ ] 에러 상태 코드·메시지  
- [ ] (메일 링크) `appUrl.js`  
- [ ] (알림) `notificationService`  
- [ ] `backend/README.md` API 표 한 줄 업데이트  

---

## 2. 프론트엔드

- [ ] 기능 폴더 `*.html` / `*.js` / `*.css`  
- [ ] header/footer placeholder + common 로드  
- [ ] 링크·에셋에 getBasePath 규칙  
- [ ] API: get*ApiBase + 가드 (`GITHUB_STATIC`)  
- [ ] 헤더: `getAuthHeaders` 또는 `getAdminAuthHeaders`  
- [ ] 헤더/사이드 메뉴 진입점 (필요 시 `header.html`)  
- [ ] 모듈 `README.md`  

---

## 3. 관리자 도구 (운영 기능이면)

- [ ] `comment-management` 또는 전용 UI  
- [ ] 모든 변경 API에 Admin 헤더  
- [ ] 목록 갱신 `load*()`  
- [ ] 공지 계열이면 색상 가이드 `#10b981`  

---

## 4. 경로 · 배포

- [ ] 로컬 `:5000` 스모크  
- [ ] 하위 폴더 깊이에서 UI 깨짐 없음  
- [ ] Render env 추가 필요 여부  
- [ ] clean URL 필요 시 `server.js` 폴백  

→ [path-and-api.md](./path-and-api.md), [deploy-checklist.md](./deploy-checklist.md)

---

## 5. 보안

- [ ] 권한 매트릭스 재확인  
- [ ] 입력 검증·XSS  
- [ ] 시크릿 미커밋  
- [ ] 신고/차단 우회 불가  

→ [security.md](./security.md)

---

## 6. 문서 · RDMD

- [ ] **`RDMD/commit_history/{본인}.md` 커밋 전 작성** (필수)  
- [ ] `frontend/<기능>/*-record.md` / `backend/<기능>/*-record.md` (큰 기능 권장)  
- [ ] 필요 시 `features/<기능>.md`  
- [ ] `RDMD/README.md` 분류에 한 줄  
- [ ] 커밋 메시지 컨벤션  

→ [rdmd-writing.md](./rdmd-writing.md)

---

## 7. 수동 테스트 시나리오 (예시)

작성해 두고 PR/커밋 설명에 붙이세요.

```
1. 비로그인으로 공개 페이지만 동작
2. 회원 로그인 후 쓰기 동작
3. 다른 회원으로 권한 거부 확인
4. 관리자만 관리 동작
5. 잘못된 토큰 → 401/403
```
