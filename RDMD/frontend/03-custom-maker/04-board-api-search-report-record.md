---
source: RDMD/information19.md
legacy_id: information19
area: frontend
---

> **원본 일지**: `information19.md` → 기능 폴더 재배치본  
> **순서 번호**: 파일명 앞 숫자 = 해당 기능 내 기록 순서

---
# 커밋 요약 — 정보 기록 (information19)

## 개요
커스텀 메이커 **게시판 목록 페이지**(`custom-maker_post`)를 백엔드 API와 연동하고, 검색·신고·상세 이동 흐름을 정리한 작업입니다.

---

## 관련 커밋
- **commit 3e82458**
  - 제목: `feat(custom-maker): 게시판 댓글·상세 페이지·본인 글 삭제`

---

## 변경된 파일 목록
- Modified: `custom-maker/custom-maker_post/custom-maker_post.html`
- Modified: `custom-maker/custom-maker_post/custom-maker_post.js`
- Modified: `custom-maker/custom-maker_post/custom-maker_post.css`
- Modified: `index.html` — 커스텀 메이커 진입 링크 보완

---

## 주요 구현 내용

### 1. 게시글 목록 API 연동
- `GET /api/tierlists` — 전체 티어 게시글 목록 조회
- `?search=` 쿼리로 제목·작성자 검색
- MongoDB ObjectId 형식 검증 후 상세 페이지로 이동

### 2. 상세 페이지 이동
- `data-post-id` 클릭 시 `sessionStorage`에 게시글 ID 저장
- `post_detail.html?id={_id}` 절대 경로로 이동
- 잘못된 ID 접근 시 목록으로 복귀

### 3. 게시글 신고
- 로그인 사용자만 신고 가능
- 신고 사유 모달 (사전 정의 사유 + 상세 입력)
- `POST /api/tierlists/:id/report`
- 이미 신고된 글은 버튼 비활성

### 4. UI 개선
- 빈 게시판 메시지 그리드 전체 너비 가운데 정렬 (`.empty-message`)
- 카드형 목록 레이아웃·메타 정보(조회수·추천수·작성자) 표시

---

## 네비게이션 흐름
```
index.html
  → custom-maker/custom-maker_post/custom-maker_post.html (목록)
    → post_detail.html?id={_id} (상세)
```

---

## 테스트 체크리스트
1. 목록 로드 및 검색 동작 확인
2. 게시글 클릭 시 상세 페이지 정상 이동
3. 잘못된 ID로 접근 시 오류 없이 목록 복귀
4. 신고 모달·API 연동 확인
5. 게시글이 없을 때 빈 메시지 가운데 정렬 확인

---

문서 생성일: 2026-06-16