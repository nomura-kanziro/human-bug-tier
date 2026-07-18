# 커스텀 메이커 · 게시판

사용자가 직접 티어를 만들고, 공유·소통하는 핵심 기능입니다.

## 구성

```
custom-maker/
├── custom-maker.html / .js / .css     # 제작 화면
└── custom-maker_post/
    ├── custom-maker_post.html / .js   # 게시판 목록
    ├── post_detail.html / .js         # 상세 + 댓글
    └── *.css
```

모듈 상세: [`custom-maker/README.md`](../../custom-maker/README.md)

---

## 1. 티어 제작 (custom-maker.html)

| 기능 | 설명 |
|------|------|
| 드래그 앤 드롭 | 좌측 캐릭터 풀 ↔ 우측 티어 보드 (HTML5 DnD) |
| 티어 단계 | 1~9등급 보드 |
| 상태 | `tierState` 객체로 배치 관리 |
| 초기화 | 보드 비우기 |
| 다운로드 | **PNG** (html2canvas), **PDF** (jsPDF) |

로그인 없이도 제작·다운로드 가능합니다.  
**게시판 업로드**는 보통 로그인·API 연동이 필요합니다.

---

## 2. 게시판 (custom-maker_post)

| 기능 | 설명 |
|------|------|
| 목록 | 업로드된 커스텀 티어표 |
| 업로드 | 제목·설명·썸네일(첫 캐릭터 등)·tierData |
| 검색 | 클라이언트 필터 + `?search=` |
| 작성자 필터 | `@닉네임` 형태 지원(상세/목록 연동) |

### API 흐름

```
POST /api/tierlists          → 업로드
GET  /api/tierlists          → 목록
GET  /api/tierlists/:id      → 상세
```

---

## 3. 상세 페이지 (post_detail)

| 기능 | 설명 |
|------|------|
| 티어 보드 렌더 | 저장된 tierData 복원 |
| 댓글 / 대댓글 | CRUD |
| 좋아요 | TierLike 연동 |
| 신고 | 게시글·댓글 `reported` 플래그 |
| 알림 딥링크 | `?id=&comment=` + `buildTierPostDetailUrl` |

### 댓글 API (개요)

```
/api/tierlists/:id/comments
```

백엔드: `tierCommentController`, 모델 `TierPostComment`  
게시글 삭제 시 댓글 **연쇄 삭제**.

---

## 4. 신고 · 관리 연동

- 유저 신고 → `reported: true`  
- 관리자: `/api/admin/tier-reports/*` 로 조회 · dismiss · 삭제  
- 프론트: `admin/comments/comment-management` 티어 신고 섹션  

관련: [admin.md](./admin.md), RDMD `backend_14`, `information24`/`26`

---

## 5. 이미지 경로 주의

| 단계 | 처리 |
|------|------|
| 저장 | `normalizeImgForBoard()` 등으로 `/tier-image/...` 정규화 |
| 표시 | `resolveAssetPath()` / `getBasePath()` |
| GH Pages | 서브패스 포함 base 필수 |

---

## 유지보수 체크리스트

- [ ] 새 캐릭터 → `tier-image` + tier-class + 메이커 풀  
- [ ] 업로드 후 목록/상세 썸네일 깨짐 여부  
- [ ] 로그인 없이 댓글 시도 시 UX  
- [ ] 관리자 신고 삭제 후 목록 갱신  
- [ ] API Base (`getApiBase`) 로컬/Render 일치  

## 관련 기록

- information15~20, 26  
- backend_10, 15~20, 26  
