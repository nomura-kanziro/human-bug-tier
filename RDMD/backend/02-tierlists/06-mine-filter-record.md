---
area: backend
---

# 커밋 요약 — `GET /api/tierlists` `mine=true` 필터 추가 (마이페이지용)

## 개요

마이페이지에서 "내가 쓴 글 전체보기"(비공개 포함)를 지원하기 위해, 기존 공개 목록 API에 `mine=true` 옵션을 추가했다. 본인 소유일 때만 `isPublic` 필터를 건너뛰도록 해서 다른 사람의 비공개 글이 새지 않도록 했다.

## 관련 커밋

- **commit pending**

## 변경된 파일 목록

- Modified: `backend/controllers/tierController.js` (`getAllTierLists`)

## 주요 구현 내용

```js
const isOwnerRequest = mine === 'true' && Boolean(author) && actor?.nickname === author;
const filter = isOwnerRequest ? {} : { isPublic: true };
```

- `getActor(req)` (JWT 우선, 없으면 body fallback)로 요청자를 식별
- `mine=true` 이면서 `author` 쿼리와 `actor.nickname` 이 **정확히 일치**할 때만 `isPublic` 필터 제외
- 토큰 없이 `mine=true` 만 붙이거나, 다른 사람 닉네임으로 `mine=true` 를 붙여도 기존과 동일하게 공개 글만 반환 (검증 완료)

## API

| 메서드 | 경로 | 변경 |
|--------|------|------|
| GET | `/api/tierlists?author=&mine=true` | 신규 옵션 — 본인 글만 비공개 포함 조회 |

## 테스트 체크리스트

1. `author=X` (mine 없음) → 비공개 글 제외 확인
2. `author=X&mine=true` + 본인 토큰 → 비공개 글 포함
3. `author=X&mine=true` + 토큰 없음 → 비공개 글 제외(우회 불가)
4. `author=X&mine=true` + 다른 사람 토큰(`actor.nickname !== X`) → 비공개 글 제외

합성 JWT(`signUserToken`, 실제 계정 미생성) + 임시 비공개 게시글로 위 4가지 케이스를 curl로 재현 후 게시글 삭제로 정리했다.

## 향후 개선 제안

- 목록이 커지면 페이지네이션 추가 (현재는 전체 배열 반환)

---
문서 생성일: 2026-08-31
