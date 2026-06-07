# 커밋 요약 — 정보 기록 (information11)

## 개요
이 문서는 최근에 커밋된 인증 및 Contact_us 관련 변경사항을 정리합니다. 주요 내용은 Contact_us에서 로그인으로 이동하는 전역 함수 추가와 사용자 로그인/회원가입/계정 찾기 페이지(user_login/*)의 추가입니다.

---

## 관련 커밋
- commit de28858b
  - 제목: feat(contact): Contact_us 로그인 이동 처리 함수 추가
  - 작업 요약: `Contact_us/common-v2.js`에 전역 함수 `goToLogin()` 추가. Contact_us에서 호출 시 상대 경로로 로그인 페이지로 이동하도록 처리.

- commit 68b3b84b
  - 제목: feat(auth): 아이디/비밀번호 찾기 페이지 추가 및 로그인 네비게이션 개선
  - 작업 요약: `user_login` 폴더에 로그인/회원가입/계정찾기 페이지 및 스타일/스크립트 추가. `login.js`에 `findAccount()` 추가.

---

## 변경된 파일 목록 (주요)
- Modified: `Contact_us/common-v2.js` — 전역 로그인 이동 함수(`goToLogin`) 추가, 버튼 연결 수정

- Added: `user_login/login.html`
- Added: `user_login/login.css`
- Added: `user_login/login.js` (로그인 로직, 네비게이션)
- Added: `user_login/sign_up.html`
- Added: `user_login/sign_up.css`
- Added: `user_login/sign_up.js`
- Added: `user_login/find_account.html`
- Added: `user_login/find_account.css`
- Added: `user_login/find_account.js`

---

## 변경 목적 및 의도
- Contact_us 페이지에서 "로그인 하러 가기" 버튼이 제대로 동작하도록 전역 네비게이션 함수를 추가.
- 로그인 관련 프론트엔드 흐름을 완성: 로그인, 회원가입, 아이디/비밀번호 찾기 페이지를 제공하여 사용자가 인증 관련 작업으로 자연스럽게 이동할 수 있도록 함.
- 프론트엔드에서 기본 유효성 검사/플로우(데모 알림)를 구현하여 추후 백엔드 연동 시 구현 교체가 용이하도록 설계.

---

## 네비게이션 흐름
- Contact_us (로그인 필요 상태) → 버튼 클릭 → `goToLogin()` 호출 → `user_login/login.html` 로 이동
- 로그인 화면에서:
  - 회원가입 버튼 → `sign_up.html`
  - 아이디/비밀번호 찾기 링크 → `find_account.html`
- 회원가입 화면에서 "이미 계정이 있으신가요? 로그인하기" → `login.html`
- 계정 찾기 화면에서 탭으로 '아이디 찾기' / '비밀번호 찾기' 전환

---

## 테스트 체크리스트
1. `Contact_us` 페이지에서 "로그인 하러 가기" 클릭 → `user_login/login.html` 로 이동 확인
2. `user_login/login.html`에서 "아이디 및 비밀번호 찾기" 클릭 → `find_account.html` 로 이동
3. `find_account.html`의 탭 전환(아이디/비밀번호 찾기) 동작 확인
4. `sign_up.html`에서 "이미 계정이 있으신가요? 로그인하기" 클릭 → `login.html` 로 이동
5. 각 폼에서 필수 입력 검증(빈값 체크) 동작 확인

---

## 향후 개선 제안
- 백엔드와 연동하여 실제 인증(로그인/회원가입/비밀번호 재설정) 로직 구현
- `goToLogin()` 함수의 경로 결정 로직을 `common.js`의 `getBasePath()`와 통합하여 모든 페이지에서 일관되게 동작하도록 개선
- 접근성(ARIA) 및 폼 에러 메시지 UI 개선
- 모바일 반응형 CSS 보완 및 작은 화면에서 패딩/간격 최적화
- `find_account`에서 이메일 전송 대신 API 호출 및 성공/실패 UX 처리

---

문서 생성일: 2026-06-07
