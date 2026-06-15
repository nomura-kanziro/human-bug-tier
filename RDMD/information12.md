# 커밋 요약 — 정보 기록 (information12)

## 개요
일반 사용자 로그인·회원가입을 백엔드 API와 연동하고, 로그인 후 헤더에 표시되는 프로필 UI 및 모달 기능을 구현한 작업입니다.

---

## 관련 커밋
- **commit 8ca982b**
  - 제목: `feat(auth): 로그인 기능 백엔드 연동 및 일반 사용자 프로필 UI 개선`

---

## 변경된 파일 목록 (프론트엔드)
- Modified: `user_login/login.js` — `POST /api/auth/login` 연동, 응답 처리 및 localStorage 저장
- Modified: `user_login/sign_up.js` — `POST /api/auth/register` 연동
- Modified: `common.js` — `renderUserProfile()` 일반 유저 지원, 유저 프로필 모달·로그아웃 기능 추가

---

## 주요 구현 내용

### 1. 로그인 API 연동 (`login.js`)
- 이메일·비밀번호를 `http://localhost:5000/api/auth/login`으로 전송
- 성공 시 `user` 정보(nickname, email 등)를 `localStorage`에 저장
- 이메일 미인증·로그인 실패 시 서버 메시지 표시

### 2. 회원가입 API 연동 (`sign_up.js`)
- 닉네임·이메일·비밀번호를 `POST /api/auth/register`로 전송
- 성공/실패 알림 및 로그인 페이지 이동 처리

### 3. 헤더 프로필 UI (`common.js`)
- 로그인한 일반 유저·관리자 모두 햄버거 메뉴 왼쪽에 프로필 아이콘 표시
- 클릭 시 유저 전용 모달: 닉네임, 이메일, 커스텀 게시판 이동, 프로필 사진 변경, 로그아웃
- `logout()` 시 localStorage 정리 후 페이지 새로고침

---

## 네비게이션 흐름
```
user_login/login.html → 로그인 성공 → index.html (또는 이전 페이지)
  → 헤더 프로필 아이콘 클릭 → 유저 모달
    → 커스텀 게시판 / 프로필 사진 변경 / 로그아웃
```

---

## 테스트 체크리스트
1. 회원가입 후 로그인이 정상 동작하는지 확인
2. 로그인 성공 시 헤더에 프로필 아이콘이 표시되는지 확인
3. 프로필 모달에서 닉네임·이메일이 올바르게 보이는지 확인
4. 로그아웃 후 프로필 아이콘이 사라지는지 확인
5. 백엔드 미실행 시 적절한 오류 메시지가 표시되는지 확인

---

## 향후 개선 제안
- JWT/세션 기반 인증으로 localStorage 의존 축소
- 프로필 사진을 서버에 업로드·저장하는 API 연동
- 로그인 상태 유지(remember me) 및 토큰 만료 처리

---

문서 생성일: 2026-06-15