# Backend 작업 로그 — backend_11

## 개요
**JWT 인증 시스템**을 도입했습니다. 유저·관리자 로그인 시 토큰을 발급하고, 티어/댓글 API에서 `getActor`로 요청자를 식별합니다.

---

## 관련 커밋
- **commit 8fbbe60**
  - 제목: `feat(auth): JWT 인증, 좋아요 중복 방지, 계정 복구, 관리자 티어 신고`

---

## 변경된 파일
- Added: `backend/utils/jwtAuth.js`
- Added: `backend/utils/ownership.js`
- Modified: `backend/controllers/authController.js` — `signUserToken`
- Modified: `backend/controllers/adminController.js` — `signAdminToken`
- Modified: `backend/controllers/tierController.js` — `getActor` 적용
- Modified: `backend/controllers/tierCommentController.js` — `getActor` 적용
- Modified: `backend/routes/tierRoutes.js` — `router.use(optionalAuth)`
- Modified: `backend/routes/adminRoutes.js` — `requireAdmin` 미들웨어

---

## jwtAuth.js 주요 함수

| 함수 | 설명 |
|------|------|
| `signUserToken(user)` | 유저 JWT (7일, `isAdmin: false`) |
| `signAdminToken(admin)` | 관리자 JWT (24시, `isAdmin: true`) |
| `verifyToken(token)` | JWT 검증 |
| `extractToken(req)` | `Authorization: Bearer` 추출 |
| `optionalAuth` | 토큰 있으면 `req.auth` 설정, 없어도 통과 |
| `requireAuth` | 토큰 필수, 없으면 401 |
| `getActor(req)` | JWT → `{ nickname, email, isAdmin }`, 없으면 body 폴백 |

### JWT Payload
```json
{
  "nickname": "닉네임",
  "email": "user@example.com",
  "isAdmin": false,
  "sub": "userObjectId"
}
```

### 시크릿
- `process.env.JWT_SECRET` 또는 개발 기본값 `human-bug-tier-dev-secret`

---

## ownership.js 주요 함수

| 함수 | 설명 |
|------|------|
| `isSameAuthor(record, actor)` | 이메일 우선, 닉네임 폴백 |
| `isTierListOwner(tierList, actor)` | 게시글 소유자 |
| `isCommentOwner(comment, actor)` | 댓글 소유자 |
| `getVoterKey(actor)` | 좋아요 유니크 키 (`email:` / `admin:` / `nick:`) |

---

## requireAdmin (adminRoutes.js)
```
requireAuth → req.auth.isAdmin === true → next()
아니면 403
```

---

## 테스트 체크리스트
1. 유저·관리자 로그인 시 `token` 필드 반환
2. Bearer 토큰으로 tier 생성·삭제 성공
3. 토큰 없이 보호 API → 401
4. 만료·위조 토큰 → 401
5. 관리자 토큰으로 tier-reports 접근 가능

---

문서 생성일: 2026-06-16