---
area: frontend
---

# 커밋 요약 — 헤더 프로필 드롭다운을 어드민·일반 유저 완전히 동일하게 통일

## 개요

일반 유저 헤더 프로필을 유튜브식 드롭다운(`#user-profile-panel`)으로 바꾼 데 이어, 어드민 전용 전체화면 모달(`showAdminModal`)도 제거했다. **처음엔** 어드민 전용 드롭다운(👑 아바타 + "관리하기"/"로그아웃"만)으로 따로 만들었으나, 대화 중 요구사항이 바뀌어 **최종적으로는 어드민도 일반 유저와 완전히 같은 UI**(마이페이지·게시판·프로필사진변경·로그아웃)를 쓰고 **"관리하기" 메뉴 하나만 추가**되는 형태로 정리했다. 이유: 테스트 중에 "이 계정은 관리자다"라는 티가 나면 곤란하다는 요청.

## 관련 커밋

- **commit pending**

## 변경된 파일 목록

- Modified: `common.js` (`renderUserProfile()` 완전 통합, 신규 `getCurrentIdentity()`, `goToCustomBoard()`/`updateUserProfilePanelInfo()` 를 identity 기반으로 변경, `showAdminModal`/`closeAdminModal`/`goToAdminPage`/`logoutAdmin`/중복 `getAdminInfo` 제거)
- Modified: `Header_Footer.css` (어드민 전용 아바타/배지 CSS 추가했다가 이번에 다시 제거 — 최종적으로 일반 유저와 같은 스타일만 사용)
- Modified: `my-page/my-page.js` (`getMyPageUser()` 제거, `getCurrentIdentity()` 로 대체 — 어드민도 마이페이지 접근 가능)

## 왜 `getCurrentIdentity()` 인가

어드민 로그인은 `localStorage.user` 를 쓰지 않고 `adminName`/`isAdmin` 만 쓴다. 마이페이지·프로필 드롭다운·게시판 필터가 전부 `user.nickname` 을 직접 읽고 있어서, 어드민 계정으로는 아무것도 못 켜는 구조였다. 그래서 신원 조회를 한 곳으로 모았다:

```js
function getCurrentIdentity() {
  const isAdmin = localStorage.getItem('isAdmin') === 'true';
  if (isAdmin) {
    return { nickname: localStorage.getItem('adminName') || '관리자', email: '', isAdmin: true };
  }
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  return { nickname: user.nickname || '', email: user.email || '', isAdmin: false };
}
```

`renderUserProfile()`, `updateUserProfilePanelInfo()`, `goToCustomBoard()`, `my-page.js`의 `initMyPage()` 가 전부 이 함수 하나로 신원을 얻는다.

## 백엔드는 이미 준비돼 있었다 (변경 없음)

어드민 로그인(`admin-login.js`)이 `localStorage.authToken` 에도 어드민 JWT를 같이 저장해 두고 있어서(`signAdminToken` 결과), `getAuthHeaders()` 로 보내는 요청은 이미 유효한 인증으로 통한다. `requireAuth`/`optionalAuth` 는 `isAdmin` 여부를 따지지 않고 토큰만 검증하므로, **`/api/luck-draw/*`, `/api/tierlists?mine=true` 등 일반 회원 API를 어드민 계정이 그대로 쓸 수 있음을 확인**했다(합성 어드민 JWT로 실제 뽑기·통계·게시글 조회까지 curl로 검증). 즉 이번 변경은 순수 프론트 신원 조회 통합이고, 백엔드는 건드릴 필요가 없었다.

## 메뉴 구성

```
마이페이지 / 커스텀 게시판 보기 / 프로필 사진 변경 / (어드민이면) 관리하기 / 로그아웃
```

"관리하기" 항목만 `identity.isAdmin` 일 때 조건부로 끼워 넣는다. 로그아웃은 이제 일반 유저·어드민 구분 없이 `logout()` 하나만 쓴다 — 원래 `logout()`이 이미 `authToken`/`adminAuthToken`/`isAdmin`/`adminName`/`adminIp`/`user`/`profileImage` 를 전부 지우고 있어서(어드민 전용 `logoutAdmin()`은 완전한 부분집합이었음), 중복 함수를 없앴다.

## 죽은 코드 정리 (직접 손댄 영역만)

- `getAdminInfo()`, `logoutAdmin()` — common.js 안에 각각 두 번 중복 정의돼 있던 것 + 이번에 완전히 미사용이 된 것 정리
- `showAdminModal()`/`closeAdminModal()`/`#admin-modal`/`goToAdminPage()` — 드롭다운 통합으로 전부 미사용, grep으로 다른 파일 참조 없음 확인 후 삭제
- 어드민 전용 CSS(`.user-profile-avatar-admin` 등)를 한 번 추가했다가, 요구사항이 "완전히 같은 UI"로 바뀌면서 다시 제거 (같은 세션 내 왕복)

## 테스트 체크리스트

1. 관리자 로그인 → 헤더 아바타가 일반 유저와 똑같이 보임(👑 없음)
2. 드롭다운 클릭 → 마이페이지/게시판/사진변경/**관리하기**/로그아웃 5개 메뉴
3. "마이페이지" → 정상 진입, 통계 5칸 표시(게시글 0건이어도 에러 없음)
4. "관리하기" → `admin/comments/comment-management.html` 이동
5. "커스텀 게시판 보기" → `?search=@어드민이름` 으로 이동(글 없으면 빈 목록, 에러 아님)
6. "로그아웃" → 일반 유저 로그아웃과 동일하게 전부 정리 후 새로고침
7. 합성 어드민 JWT로 `/api/luck-draw/daily`, `/stats`, `/api/tierlists?mine=true` 호출 → 전부 정상 동작 확인(실제 curl 테스트, 데이터 정리 완료)
8. 일반 유저 로그인 상태에서 회귀 없음(기존과 동일)

## 향후 개선 제안

- 없음 — 관리자 전용 UI 차별화는 이번 요청과 반대 방향이라 보류

---
문서 생성일: 2026-08-31
