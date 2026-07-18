---
source: RDMD/information25.md
legacy_id: information25
area: frontend
---

> **원본 일지**: `information25.md` → 기능 폴더 재배치본  
> **순서 번호**: 파일명 앞 숫자 = 해당 기능 내 기록 순서

---
# 커밋 요약 — 정보 기록 (information25)

## 개요
비밀번호 재설정 링크의 안정성을 개선했습니다. 기존 JWT 기반 URL 대신 짧은 랜덤 토큰 + SHA-256 해시 저장 방식을 도입하여 링크 손상·만료 오류를 줄이고, 배포 환경(APP_URL)에서도 올바른 링크가 생성되도록 했습니다.

---

## 관련 커밋
- **commit 8ecfddc**
  - 제목: `fix(auth): 비밀번호 재설정 링크 만료 오류 수정`

---

## 변경된 파일 목록
- Modified: `user_login/auth_api.js`
- Modified: `user_login/find_account.html`
- Modified: `user_login/find_account.js`
- Modified: `user_login/reset_password.html`
- Modified: `user_login/reset_password.js`

---

## 주요 구현 내용

### 1. auth_api.js - API 베이스 자동 결정
- `getAuthApiBase()` 추가
  - localhost 개발 포트(5500, 3000 등) → `http://localhost:5000`
  - 그 외 (Render, GitHub Pages, 같은 오리진) → `''` (상대 경로)
- 모든 fetch가 `getAuthApiBase() + '/api/...' ` 사용

### 2. 비밀번호 찾기 흐름 (find_account.js)
- `POST /api/auth/forgot-password` 호출
- 응답 후 `validate-reset-token` 사전 검증 지원

### 3. 비밀번호 재설정 페이지 (reset_password.js / .html)
- URL `?token=...` 로드 시 `/api/auth/validate-reset-token` 호출
- 유효하지 않거나 만료된 경우 에러 표시 후 차단
- `POST /api/auth/reset-password` 로 새 비밀번호 전송

### 4. 기타
- find_account.html 등에 `<script src="auth_api.js">` 추가로 API 베이스 로직 공유

---

## 네비게이션 흐름
```
비밀번호 찾기 (find_account.html)
  → forgot-password API 호출
  → 이메일로 전달된 reset_password.html?token=xxx
    → validate-reset-token (사전 확인)
    → reset-password 제출
      → 성공 시 로그인 안내
```

---

## 테스트 체크리스트
1. 개발 환경(포트 5500 등)에서 비밀번호 찾기 → localhost:5000 API 호출 확인
2. 재설정 링크 클릭 → validate API 성공
3. 잘못된/만료 토큰 입력 시 명확한 오류 메시지
4. 새 비밀번호 설정 후 로그인 가능
5. Render 배포 시 APP_URL 또는 자동 host 기반 링크 생성 확인

---

## 향후 개선 제안
- 재설정 토큰 만료 시간 사용자에게 표시
- 이메일 템플릿 디자인 개선

---
문서 생성일: 2026-06-20
