---
source: RDMD/information21.md
legacy_id: information21
area: frontend
---

> **원본 일지**: `information21.md` → 기능 폴더 재배치본  
> **순서 번호**: 파일명 앞 숫자 = 해당 기능 내 기록 순서

---
# 커밋 요약 — 정보 기록 (information21)

## 개요
커스텀 메이커 **티어 제작 페이지**(`custom-maker`)에서 완성한 티어표를 게시판에 업로드하고, 관리자 세션으로도 업로드·작성이 가능하도록 보완한 작업입니다.

---

## 관련 커밋
- **commit 3e82458** — 업로드 API 연동·관리자 세션 인식
- **commit 8fbbe60** — JWT 인증 헤더 적용

---

## 변경된 파일 목록
- Modified: `custom-maker/custom-maker.html`
- Modified: `custom-maker/custom-maker.js`

---

## 주요 구현 내용

### 1. 게시판 업로드
- `POST /api/tierlists` — 제목·티어 데이터·이미지 정보 저장
- 업로드 성공 시 `custom-maker_post.html` 목록으로 이동 안내
- 로그인 필요 — 미로그인 시 로그인 페이지 유도

### 2. 관리자 세션 지원
- `getLoggedInUser()`가 `localStorage.admin` + `isAdmin` 인식
- 관리자도 일반 유저와 동일하게 티어표 업로드·작성자 표기 가능
- `adminName`을 작성자 닉네임으로 사용

### 3. JWT 인증 헤더
- 업로드 요청 시 `getAuthHeaders()`로 `Authorization: Bearer` 첨부
- 서버 `getActor(req)`가 JWT로 작성자 검증

### 4. 기존 기능 유지
- 드래그 앤 드롭 티어 배치
- PNG/PDF 클라이언트 다운로드
- 이미지 풀·티어 행 커스터마이징

---

## 네비게이션 흐름
```
custom-maker/custom-maker.html (티어 제작)
  → 업로드 완료
    → custom-maker_post/custom-maker_post.html (게시판 목록)
```

---

## 테스트 체크리스트
1. 로그인 후 티어표 업로드 성공
2. 관리자 로그인 상태에서 업로드·작성자 표기 확인
3. 미로그인 시 업로드 차단 및 로그인 유도
4. JWT 없는 구세션 — 재로그인 후 업로드 정상 동작

---

문서 생성일: 2026-06-16