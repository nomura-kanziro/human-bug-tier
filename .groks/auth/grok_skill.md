---
name: hbu-auth
description: >
  회원가입, 로그인, 아이디 찾기, 비밀번호 재설정, JWT, auth_api.js.
  인증·계정 작업 시 사용.
---

# 에이전트 스킬 — 인증 (user_login)

## When

- 로그인/회원가입/계정 찾기/비번 재설정
- JWT, `authToken`, 이메일 인증
- `auth_api.js`, `authController`
- 차단 유저 로그인 거부

## Code map

| 경로 | 역할 |
|------|------|
| `user_login/login.*` | 로그인 |
| `user_login/sign_up.*` | 가입 |
| `user_login/find_account.*` | 아이디 찾기 |
| `user_login/reset_password.*` | 비번 재설정 페이지 |
| `user_login/auth_api.js` | API base |
| `backend/controllers/authController.js` | 인증 로직 |
| `backend/models/User.js` | 유저 스키마 |
| `backend/routes/authRoutes.js` | 라우트 |
| `backend/utils/jwtAuth.js`, `appUrl.js` | 토큰·메일 URL |
| `common.js` → `getAuthHeaders` | 전역 헤더 |

## Read first

- `RDMD/features/auth.md`
- `user_login/README.md`
- `RDMD/guides/security.md` (재설정 토큰 규칙)

## Do

1. **비밀번호 재설정**: 랜덤 토큰 + **SHA-256 해시만 DB 저장** 유지 (JWT URL 방식 재도입 금지)
2. API base는 `auth_api.js` / `getApiBase` 규칙과 동일
3. 성공 로그인 시 localStorage 키 유지: `authToken`, `user`
4. 관리자 토큰(`adminAuthToken`)과 섞지 말 것
5. 이메일 미설정 시 기존 폴백(`isVerified` 즉시 등) 동작 문서와 맞출 것
6. 차단 검사 연동 유지
7. 메일 링크는 `APP_URL` / `appUrl.js` 사용

## Do not

- 비밀번호·리셋 토큰 평문 로그/응답
- `.env` 값 커밋
- 일반 유저 JWT에 임의 `isAdmin: true` 부여
- CORS를 `*` + credentials 로 과도 개방

## Agent tasks

### A. 로그인 버그
1. 프론트 fetch URL·헤더 확인  
2. 백엔드 login 컨트롤러·Block 체크  
3. 토큰 localStorage 저장·이후 `getAuthHeaders`  

### B. 회원가입 / 이메일
1. `EMAIL_*` 유무 분기 읽기  
2. 검증·에러 메시지 UX  
3. 중복 닉네임/이메일 처리  

### C. 비밀번호 재설정
1. forgot → validate → reset 흐름 유지  
2. 토큰 해시 비교·만료·1회성 클리어  
3. 프론트 `reset_password` 쿼리 `token`  

### D. 새 인증 API
1. `authRoutes` + controller  
2. 필요 시 `requireAuth`  
3. `user_login` 또는 호출 측 헤더  
4. security 가이드 준수  

## Checklist

- [ ] 가입 → 로그인 → 보호 API 한 번 호출
- [ ] 잘못된 비번 401/메시지
- [ ] 리셋 토큰 DB에 평문 없음
- [ ] auth 페이지에 `auth_api.js` 로드 여부
