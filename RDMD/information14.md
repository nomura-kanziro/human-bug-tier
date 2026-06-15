# 커밋 요약 — 정보 기록 (information14)

## 개요
관리자 로그인을 클라이언트 직접 인증 방식에서 MongoDB 기반 백엔드 API 인증으로 전환하고, 관리자 로그인 시에도 헤더 프로필 버튼이 표시되도록 공통 스크립트를 수정한 작업입니다.

---

## 관련 커밋
- **commit 1539d6e**
  - 제목: `feat(admin): MongoDB 기반 관리자 로그인 API 및 프론트 연동`

---

## 변경된 파일 목록 (프론트엔드)
- Modified: `admin/admin-login.js` — `POST /api/admin/login` fetch 연동
- Modified: `common.js` — 관리자(`isAdmin`) 로그인 시 헤더 프로필 버튼 표시 조건 개선

---

## 주요 구현 내용

### 1. 관리자 로그인 API 연동 (`admin-login.js`)
- 기존 하드코딩 ID/PW 비교 제거
- `http://localhost:5000/api/admin/login`으로 아이디·비밀번호 전송
- 성공 시 `isAdmin`, `adminName`, `adminIp` 등을 localStorage에 저장
- 실패 시 서버 오류 메시지 표시

### 2. 헤더 프로필 표시 (`common.js`)
- `renderUserProfile()`에서 일반 유저 또는 관리자 로그인 시 프로필 아이콘 노출
- 관리자 클릭 시 `showAdminModal()` — 댓글 관리 페이지 이동·로그아웃 제공

---

## 네비게이션 흐름
```
admin/admin-login.html → 로그인 성공
  → localStorage에 isAdmin=true 저장
  → 헤더 프로필 클릭 → 관리자 모달
    → 댓글 관리 페이지 / 로그아웃
```

---

## 테스트 체크리스트
1. `.env`에 설정된 관리자 계정으로 로그인 성공 확인
2. 잘못된 비밀번호 입력 시 오류 메시지 확인
3. 관리자 로그인 후 헤더 프로필 아이콘 표시 확인
4. 관리자 모달에서 댓글 관리 페이지 이동 확인
5. 로그아웃 후 관리자 세션 해제 확인

---

## 향후 개선 제안
- 관리자 JWT/세션 토큰 기반 인증
- 관리자 전용 페이지 접근 권한 미들웨어
- 관리자 활동 로그 기록

---

문서 생성일: 2026-06-15