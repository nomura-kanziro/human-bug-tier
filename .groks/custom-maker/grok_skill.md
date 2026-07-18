---
name: hbu-custom-maker
description: >
  커스텀 티어 제작, PNG/PDF, 게시판, post_detail, 댓글, 좋아요, 신고.
  custom-maker 작업 시 사용.
---

# 에이전트 스킬 — 커스텀 메이커 · 게시판

## When

- 드래그 앤 드롭 티어 제작 UI
- 다운로드(PNG/PDF)
- 게시판 목록·업로드·상세
- 댓글/대댓글/좋아요/신고
- 썸네일·이미지 경로 깨짐

## Code map

| 경로 | 역할 |
|------|------|
| `custom-maker/custom-maker.*` | 제작 화면 |
| `custom-maker/custom-maker_post/*` | 게시판 목록 |
| `custom-maker/custom-maker_post/post_detail.*` | 상세·댓글 |
| `backend/controllers/tierController.js` | TierList API |
| `backend/controllers/tierCommentController.js` | 댓글 |
| `backend/models/TierList.js`, `TierPostComment.js`, `TierLike.js` | 모델 |
| `backend/routes/tierRoutes.js` | 라우트 |

## Read first

- `RDMD/features/custom-maker.md`
- `custom-maker/README.md`
- 변경 파일이 프론트만인지 백엔드 포함인지 판단

## Do

1. **제작 화면**: `tierState` / DnD 패턴 유지, 초기화·다운로드 회귀 방지  
2. **이미지 경로**: 저장 시 정규화(`normalizeImgForBoard` 등) + 표시 시 `getBasePath`/`resolveAssetPath`  
3. **API 호출**: `getApiBase()` + 쓰기는 `getAuthHeaders()`  
4. **댓글·좋아요·신고**: 백엔드 권한·소유권 로직과 프론트 UX 동기화  
5. 게시글 삭제 시 댓글 연쇄 삭제 등 기존 서버 동작 깨지 않기  
6. 신고 플래그는 관리자 화면과 연동 — admin 스킬 참고  
7. 상세 URL은 `buildTierPostDetailUrl` 재사용 (알림 딥링크 호환)

## Do not

- 비로그인 전용 API에 토큰 강제 없이 서버 검증 제거
- GH Pages에서 업로드가 된다고 가정
- 이미지 경로를 절대 `http://localhost` 로 저장
- 관리자 신고 API를 일반 유저 토큰으로 호출

## Agent tasks

### A. 제작 UI 버그 (DnD, 초기화)
1. `custom-maker.js` 상태 객체와 이벤트 핸들러 추적  
2. 최소 수정  
3. 1~9 보드 + 풀 왕복 테스트 시나리오 제시  

### B. 다운로드 PNG/PDF
1. html2canvas / jsPDF 호출부 확인  
2. 캡처 영역·한글 폰트 이슈 시 이미지 폴백 유지  
3. CORS/경로로 이미지 안  captur 되는 경우 base path 점검  

### C. 게시판·업로드
1. `POST /api/tierlists` 페이로드 필드와 모델 일치  
2. 목록 `GET` 렌더·검색 `?search=`  
3. 로그인 필요 시 UX 메시지  

### D. 댓글 / 좋아요 / 신고
1. 라우트·컨트롤러·프론트 fetch 헤더 일치  
2. 신고 후 admin tier-reports 노출 여부  
3. 401/403 처리  

### E. 백엔드 스키마 변경
1. `groks/backend/grok_skill.md` 병행  
2. 프론트 렌더 필드 동기화  
3. 기존 문서 데이터 호환 언급  

## Checklist

- [ ] 제작 + 다운로드 스모크
- [ ] 업로드·목록·상세
- [ ] 댓글 CRUD (로그인)
- [ ] 이미지 경로 로컬·(가능 시) 배포
- [ ] 모듈 README / RDMD 갱신 여부
