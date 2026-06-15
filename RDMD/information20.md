# 커밋 요약 — 정보 기록 (information20)

## 개요
커스텀 메이커 **게시글 상세 페이지**(`post_detail`)에 티어표 렌더링, 댓글 CRUD·답변·신고, 본인 글 삭제, 추천(좋아요) UI를 구현한 작업입니다.

---

## 관련 커밋
- **commit 3e82458** — 댓글·삭제·상세 접근 수정
- **commit 8fbbe60** — JWT 헤더·좋아요 중복 방지·이벤트 버튼 정리

---

## 변경된 파일 목록
- Modified: `custom-maker/custom-maker_post/post_detail.html`
- Modified: `custom-maker/custom-maker_post/post_detail.js`
- Modified: `custom-maker/custom-maker_post/post_detail.css`

---

## 주요 구현 내용

### 1. 상세 페이지 접근 수정
- URL `?id=` 파라미터 + `sessionStorage` 백업으로 게시글 ID 복구
- `getTierApiBase()` 절대 URL로 API 호출
- ObjectId 형식 검증 — 유효하지 않으면 "잘못된 접근" 처리

### 2. 티어표 렌더링
- 저장된 `tierData` 기반 티어 행·이미지 슬롯 표시
- 이전/다음 게시글 네비게이션

### 3. 댓글 시스템
- `GET /api/tierlists/:id/comments` — 댓글 목록 (대댓글 포함)
- `POST` — 댓글 작성
- `PATCH` — 본인 댓글 수정
- `DELETE` — 본인 댓글 삭제
- `POST .../report` — 타인 댓글 신고
- 답변(인용)·수정 인라인 UI, 댓글 영역 너비를 티어표와 동일하게 정렬

### 4. 게시글 액션
- **삭제** — 본인 글만 `DELETE /api/tierlists/:id`
- **신고** — 타인 글만 신고 모달
- **추천** — `PATCH /api/tierlists/:id/like`, `likedByMe` 시 버튼 비활성
- **공유** — 현재 URL 클립보드 복사

### 5. 이벤트 버튼 (준비 중)
- 본인 게시글에만 `🎉 이벤트 참여` 버튼 표시
- 백엔드 참여 API는 **미구현** — 클릭 시 "이벤트 기능은 준비 중입니다." 안내

### 6. 로그인 연동
- `getLoggedInUser()` — 일반 유저 + 관리자 세션(`isAdmin`, `adminName`) 모두 인식
- `apiHeaders()` / `getAuthHeaders()`로 JWT Bearer 헤더 첨부

---

## 네비게이션 흐름
```
custom-maker_post.html (목록)
  → post_detail.html?id={_id}
    ├─ 댓글 작성/답변/수정/삭제/신고
    ├─ 추천 (1인 1회)
    ├─ 본인 글 삭제
    └─ 이벤트 버튼 (준비 중)
```

---

## 테스트 체크리스트
1. 상세 페이지 정상 로드 (잘못된 접근 없음)
2. 댓글 CRUD·답변·신고 동작
3. 본인 글 삭제 버튼 표시 및 삭제 후 목록 이동
4. 추천 1회 후 버튼 비활성 확인
5. 관리자 로그인 상태에서도 댓글 작성 가능
6. 이벤트 버튼 — 본인 글만 표시, 준비 중 안내

---

문서 생성일: 2026-06-16