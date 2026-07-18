---
source: RDMD/information26.md
legacy_id: information26
area: frontend
---

> **원본 일지**: `information26.md` → 기능 폴더 재배치본  
> **순서 번호**: 파일명 앞 숫자 = 해당 기능 내 기록 순서

---
# 커밋 요약 — 정보 기록 (information26)

## 개요
관리자 페이지에서 커스텀 메이커(티어) 게시글·댓글 데이터가 표시되지 않던 문제를 해결했습니다. 관리자용 API 분리(`admin_api.js`)와 로그인 플로우 정리를 통해 일반 로그인 사용자도 데이터 조회가 가능하도록 했습니다.

---

## 관련 커밋
- **commit a3ee179**
  - 제목: `fix(admin): 어드민 커스텀 메이커 게시글/댓글 미표시 문제 수정`

---

## 변경된 파일 목록
- Modified: `admin/admin-login.html`
- Modified: `admin/admin-login.js`
- Added: `admin/admin_api.js`
- Modified: `admin/comments/comment-detail.html`
- Modified: `admin/comments/comment-detail.js`
- Modified: `admin/comments/comment-management.html`
- Modified: `admin/comments/comment-management.js`
- Modified: `common.js`
- Modified: `user_login/login.js`

---

## 주요 구현 내용

### 1. admin_api.js 신규
- `getApiBase()` (공통 API 베이스 결정)
- `getAdminAuthToken()` / `getAdminAuthHeaders()` 분리 관리
  - `adminAuthToken` 우선, 없으면 `authToken` 중 admin JWT만 사용
- `isAdminJwt()` 로 토큰 페이로드 검사

### 2. 관리자 로그인 흐름 정리 (`admin-login.js`)
- 로그인 성공 시 `localStorage.adminAuthToken` + `isAdmin` 저장
- `authToken`도 함께 저장 (호환)

### 3. comment-management / comment-detail
- tier-reports GET 시 `requireAdmin` 제거 전환 (당시)
- 목록 로드 시 `getAdminAuthHeaders()` 사용
- 일반 유저도 데이터 확인 가능하도록 API 조건 완화 (조회용)

### 4. 기타
- `common.js` 일부 함수 보강
- 로그인 페이지에서 관리자 세션 초기화 로직 추가

---

## 네비게이션 흐름
```
admin-login.html → 로그인 성공
  → comment-management.html
    ├─ 문의/공지/유저 관리 (기존)
    └─ 티어 신고 관리 (표시 문제 해결)
```

---

## 테스트 체크리스트
1. 일반 계정으로 로그인해도 admin 페이지에서 티어 데이터 조회됨
2. adminAuthToken 저장 확인
3. admin 로그인 시 isAdmin 플래그 설정
4. 티어 신고 목록/해제/삭제 동작
5. 비관리자 토큰으로 민감 작업 403 확인

---

## 향후 개선 제안
- admin 전용 토큰과 일반 토큰 명확한 분리 정책 수립
- admin 페이지 접근 시 강제 admin 로그인 요구

---
문서 생성일: 2026-06-20
