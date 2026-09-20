---
area: frontend
---

# 커밋 요약 — 마이페이지 프로필 관리(사진 · 닉네임)

## 개요

마이페이지 프로필 영역에서 **프로필 사진**과 **닉네임**을 직접 바꿀 수 있게 했다. 사진은 그대로 이 브라우저에만 저장하되 리사이즈·오류 처리를 붙였고, 닉네임은 새 서버 API(`POST /api/profile/nickname`)로 바꾼다. 서버 쪽 규칙·전파는 [`../../backend/03-auth/09-nickname-change-record.md`](../../backend/03-auth/09-nickname-change-record.md).

## 변경된 파일 목록

- Modified: `root-cloudflare/src/pages/MyPage.jsx` (프로필 관리 UI·닉네임 변경 폼)
- Modified: `root-cloudflare/src/styles/my-page.css` (버튼·폼·안내 스타일, 다크 모드, 모바일)
- Modified: `root-cloudflare/src/context/AuthContext.jsx` (`changeProfileImage` 리사이즈, `resetProfileImage`, `applyIdentity`)
- Modified: `root-cloudflare/src/components/UserProfileMenu.jsx` (사진 변경 실패 안내)
- Modified: `root-cloudflare/src/lib/api.js` (`NICKNAME_CHANGED` 401 → 자동 로그아웃 + 안내)

## 주요 구현 내용

### 1. 프로필 사진
- 아바타(우하단 📷 배지) 또는 "사진 변경" 버튼 → 파일 선택 → **가운데 정사각형 크롭 → 256px JPEG(품질 0.85)** 로 줄여 `localStorage.profileImage` 에 저장. 투명 PNG 는 흰 배경을 깐다.
- 기존에는 원본 파일을 통째로 base64 로 넣어서, 큰 사진이면 localStorage 용량(약 5MB)을 넘겨 저장이 예외로 끊겼다(사용자에게 아무 안내도 없음). 이제 18MB 가로 사진도 수 KB 로 저장된다.
- 이미지가 아닌 파일·디코딩 실패·저장 실패는 `{ ok: false, error }` 로 돌려줘 화면에 안내한다. 파일 선택을 취소하면 `null`.
- "기본 이미지로"(커스텀 사진이 있을 때만 표시)로 사이트 로고 복원.
- **한계**: 서버에 올리지 않으므로 기기·브라우저를 바꾸면 초기화된다(기존과 동일).

### 2. 닉네임 변경
- "닉네임 변경" → 입력 폼(현재 닉네임 채움, 규칙 안내) → 저장 시 `confirm`("닉네임은 로그인 아이디로도 쓰이고, 7일에 한 번만…") → `POST /api/profile/nickname`.
- 성공하면 `applyIdentity()` 가 응답의 `user`·새 `token` 을 localStorage 에 반영하고 `refresh()` — 마이페이지 제목·헤더 드롭다운이 즉시 바뀌고, 게시글 조회 effect 가 닉네임을 의존성으로 가져 새 이름으로 다시 불러온다. 다음 변경 가능일도 안내한다.
- 오류(규칙 위반·중복·7일 제한·제재)는 서버 문구를 그대로 붉게 표시하고 폼은 유지한다.
- 관리자는 이름이 `Admin` 체계라 닉네임 변경 버튼만 숨긴다(사진 변경은 가능).

### 3. 다른 기기의 옛 토큰
JWT 에 닉네임이 들어 있어, 다른 기기에서 닉네임을 바꾸면 이 기기의 토큰은 옛 이름이다. 서버가 401(`code: NICKNAME_CHANGED`)로 거부하면 `apiRequest` 가 `user/authToken/loginAt/lastActiveAt` 을 지우고 `storage` 이벤트로 `AuthContext` 를 로그아웃 상태로 만든 뒤 한 번 안내한다(프로필 사진은 지우지 않음).

## 테스트 체크리스트 (`:5000`)

1. 마이페이지 → "사진 변경" → 큰 사진 선택 → 헤더·마이페이지 아바타가 즉시 바뀌고 안내가 뜬다
2. 사진이 아닌 파일 선택 → 오류 안내, 기존 사진 유지 / 선택 취소 → 아무 일 없음
3. "기본 이미지로" → 로고로 복원, 버튼 사라짐
4. "닉네임 변경" → 공백 포함 입력 → 규칙 오류 / 정상 입력 → 확인창 → 제목·헤더·"내가 쓴 게시글" 유지
5. 바로 다시 변경 → "7일에 한 번" 오류
6. (다른 기기·탭) 옛 토큰 상태로 접속 → 안내창 후 로그아웃, 새 닉네임으로 로그인 가능
7. 관리자 로그인 → 닉네임 변경 버튼 없음, 사진 변경 가능

## 향후 개선 제안

- 프로필 사진 서버 저장(기기 간 동기화) — `User` 에 사진 필드를 두거나 별도 컬렉션
- 다음 닉네임 변경 가능일을 페이지 진입 시에도 보여주기(현재는 변경 직후·시도 시 오류 문구로만 안내)

---
문서 생성일: 2026-09-20
