# 마이페이지 (my-page)

코드: [`../../my-page/`](../../my-page/README.md)

## 한 줄 요약

로그인 유저가 자신의 커스텀 게시글·행운 뽑기 활동을 한눈에 보는 요약 페이지. **새 포인트 스키마 없이** 기존 `tierlists`/`luck-draw` API를 조합한 단순 집계다.

## 진입 경로

헤더 프로필 아이콘(`#user-profile`) 클릭 → 유튜브식 드롭다운(`#user-profile-panel`) → "마이페이지"

드롭다운은 알림 벨(`#notification-panel`)과 동일한 열기/닫기 패턴을 재사용한다. **어드민도 일반 유저와 완전히 같은 드롭다운·마이페이지를 쓴다** — 이전엔 전체화면 모달(`showAdminModal()`)이었다가, 관리자 전용 축소 메뉴를 거쳐, 최종적으로 "테스트 계정이 티 나면 안 된다"는 이유로 마이페이지·게시판·사진변경·로그아웃을 그대로 쓰고 **"관리하기" 한 줄만 추가**되는 형태로 정리했다. 상세: [`../frontend/01-common/06-admin-profile-dropdown-record.md`](../frontend/01-common/06-admin-profile-dropdown-record.md)

## 표시 항목

| 항목 | 데이터 출처 |
|------|-------------|
| 작성한 게시글 수 | `GET /api/tierlists?author=&mine=true` 배열 길이 |
| 받은 좋아요 합계 | 위 배열의 `likeCount` 합산(클라이언트) |
| 행운 뽑기 총 횟수 | `GET /api/luck-draw/stats` `.totalDraws` (누적 — 이력이 5건으로 잘려도 정확함) |
| 최고 등급 당첨 | `GET /api/luck-draw/stats` `.bestTier` (숫자가 작을수록 희귀) |
| 행운 포인트 | `GET /api/luck-draw/stats` `.points` (9티어 -5 ~ 1티어 +3 누적, 음수 가능) |
| 내가 쓴 게시글 최근 목록 | 위 tierlists 응답 상위 6개 (비공개는 🔒 표시) |
| ~~최근 뽑기 기록~~ | 2026-09-20 창시자 지시로 마이페이지에서 제거(`/history` API 는 행운 뽑기 페이지가 계속 사용) |

## 프로필 관리 (사진 · 닉네임) — 2026-09-20

마이페이지 프로필 영역에서 직접 바꾼다. 헤더 드롭다운의 "프로필 사진 변경"도 같은 로직을 쓴다.

| 항목 | 저장 위치 | 규칙 |
|------|-----------|------|
| 프로필 사진 | **이 브라우저의 localStorage**(`profileImage`) | 가운데 정사각형으로 잘라 256px JPEG 로 줄여 저장(수십 KB). "기본 이미지로"로 로고 복원. 기기를 바꾸면 초기화(알려진 한계) |
| 닉네임 | 서버 `User.nickname` | `POST /api/profile/nickname` — 2~20자, 한글·영문·숫자·`_ - .` 만(공백·`@` 불가), **7일에 한 번**, 대소문자 무시 중복 불가(회원 + 관리자 이름), 예약어(관리자/운영자/admin 등) 불가, 제재 중인 계정·차단된 값 불가 |

**닉네임은 로그인 아이디이기도 하다**(로그인이 닉네임으로 계정을 찾는다). 그래서 바꾼 뒤에는 새 닉네임으로 로그인해야 한다는 안내를 화면에 함께 보여준다.

닉네임을 바꾸면 서버가 내 글·댓글·알림·문의·뽑기 이력에 문자열로 복사돼 있던 이름을 새 이름으로 같이 갱신하고 새 토큰을 발급한다. 다른 기기에 남은 옛 토큰은 401(`NICKNAME_CHANGED`)로 거부되어 그 기기는 자동 로그아웃 + 안내가 뜬다. 관리자 이름은 `Admin` 체계라 여기서 바꿀 수 없고(버튼 숨김), 사진 변경만 가능하다.

상세: [`../frontend/11-my-page/02-profile-management-record.md`](../frontend/11-my-page/02-profile-management-record.md) · [`../backend/03-auth/09-nickname-change-record.md`](../backend/03-auth/09-nickname-change-record.md)

## 권한

| 동작 | 비로그인 | 로그인 |
|------|:---:|:---:|
| 페이지 접근 | X (로그인 유도 후 리다이렉트) | O |
| 본인 비공개 게시글 열람 | - | O |
| 프로필 사진·닉네임 변경 | X | O (닉네임은 일반 회원만, 관리자는 사진만) |

## 관련 백엔드 변경

- `GET /api/tierlists` 에 `mine=true` 옵션 추가 — `author` 쿼리와 인증된 유저 닉네임이 일치할 때만 `isPublic` 필터를 건너뜀 (다른 사람 비공개 글 노출 불가)
- `GET /api/luck-draw/stats` 신규 — `LuckDraw` 를 티어별로 `aggregate()` 집계만, 새 필드·컬렉션 없음

## 2차 이후 (이번에 만들지 않음)

- 실제 적립형 포인트 시스템(스키마 추가 필요)
- 다른 사람의 공개 프로필 페이지
- 게시글 목록 페이지네이션

관련 스킬: `.agents/my-page/skill.md`, `.claude/skills/my-page/SKILL.md`
