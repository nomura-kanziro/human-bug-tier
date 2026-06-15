# 커밋 요약 — 정보 기록 (information22)

## 개요
전 페이지 공통 스크립트 `common.js`에 **JWT 인증 헤더** 유틸을 추가하고, 로그아웃 시 `authToken`을 함께 제거하도록 수정한 작업입니다.

---

## 관련 커밋
- **commit 8fbbe60**
  - 제목: `feat(auth): JWT 인증, 좋아요 중복 방지, 계정 복구, 관리자 티어 신고`

---

## 변경된 파일 목록
- Modified: `common.js`

---

## 주요 구현 내용

### 1. `getAuthHeaders(extraHeaders)`
- `localStorage.authToken`이 있으면 `Authorization: Bearer {token}` 헤더 자동 첨부
- 기본 `Content-Type: application/json` 설정
- 커스텀 메이커·상세·관리자 페이지에서 API 호출 시 공통 사용

### 2. 로그아웃 시 토큰 제거
- 일반 로그아웃·관리자 로그아웃·세션 만료 처리 시 `authToken` 삭제
- `user`, `admin` localStorage 항목과 함께 정리

### 3. 사용처
| 페이지 | 용도 |
|--------|------|
| `custom-maker.js` | 티어표 업로드 |
| `custom-maker_post.js` | 목록·신고 |
| `post_detail.js` | 상세·댓글·추천·삭제 |
| `comment-management.js` | 관리자 티어 신고 API |

---

## 인증 흐름
```
login.js / admin-login.js
  → localStorage.authToken 저장
    → getAuthHeaders()
      → API 요청 (Bearer JWT)
        → 서버 getActor(req) 검증
```

---

## 주의사항
- JWT 도입 **이전**에 로그인한 세션은 `authToken`이 없을 수 있음 → **재로그인** 필요
- 토큰 만료: 유저 7일, 관리자 24시간 (`jwtAuth.js`)

---

## 테스트 체크리스트
1. 로그인 후 `localStorage.authToken` 존재 확인
2. 로그아웃 후 `authToken` 삭제 확인
3. 보호된 API 호출 시 401 없이 정상 동작 (재로그인 후)

---

문서 생성일: 2026-06-16