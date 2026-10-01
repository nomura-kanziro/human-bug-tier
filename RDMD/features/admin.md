# 관리자 시스템 (admin)

공지·문의·댓글·차단·티어 신고·이벤트·행운 뽑기를 한곳에서 다루는 **운영 전용** 영역입니다.

> 2026-10-02 갱신 — 현행은 React(`root-cloudflare/`) 관리자 화면이다. 아래 "파일 구조"·"새 관리 기능 추가 절차"를 React 기준으로 고쳤고,
> 바닐라(`root-render/admin/`) 경로는 베타 종료·수정 금지 보관본으로만 남긴다.

## 접속

```
/admin/login   → 로그인 (옛 주소 /admin/admin-login.html 도 같은 화면으로 이동)
/admin         → 통합 대시보드
/admin/comment → 문의(댓글) 상세·답변
```

환경변수 `ADMIN_INPUT_ID` / `ADMIN_INPUT_PW` 기반 시드 계정 (서버 기동 시 `seedAdmin`).

(바닐라 시절 상세: `root-render/admin/README.md`)

로그인 후에는 사이트 헤더의 프로필 아이콘을 눌러도 진입 가능 — 아이콘·메뉴 전부 일반 유저와 **완전히 동일**(마이페이지·게시판·사진변경·로그아웃)하고 "관리하기" 한 줄만 추가된다. 관리자 전용 표시(왕관 아이콘 등)는 의도적으로 넣지 않았다 — 테스트 계정이 관리자 티가 나면 안 된다는 요청. 상세: [`../frontend/01-common/06-admin-profile-dropdown-record.md`](../frontend/01-common/06-admin-profile-dropdown-record.md)

---

## 파일 구조 (React)

```
root-cloudflare/src/
├── pages/AdminLogin.jsx           # /admin/login
├── pages/AdminDashboard.jsx       # /admin — 섹션 전부 + 빠른 이동 태그 목록(quickItems)
├── pages/AdminCommentDetail.jsx   # /admin/comment — 문의 상세·답변
├── components/AdminQuickNav.jsx   # 상단 "빠른 이동" 바(sticky·스크롤 스파이·#해시)
├── components/AdminEventManager.jsx  # 이벤트 관리(메모리 기록 이벤트 · 티어표 공개)
├── components/AdminLuckManager.jsx   # 행운 뽑기 관리
├── components/AdminPagination.jsx
├── components/NoticeEditor.jsx    # 공지 작성·수정 폼
├── lib/api.js                     # adminRequest · getAdminAuthHeaders
└── lib/adminApi.js                # 관리자 목록 조회·표시 도우미
```

## 화면 구성 (위 → 아래, 빠른 이동 바와 같은 순서)

| 섹션(id) | 빠른 이동 태그 | 내용 |
|---|---|---|
| `admin-inquiries` | 💬 댓글 | 전체 댓글(문의) 관리 |
| `admin-tier` | 🎨 커스텀 메이커 신고 | 신고된 게시글·댓글 |
| `admin-notices` | 📢 공지 | 공지 작성·수정·고정·유튜브 동기화 상태 |
| `admin-events` (`admin-memory-events`, `admin-showcase`) | 🃏 메모리 기록 이벤트 · 🖼️ 티어표 공개 | 이벤트 관리 |
| `admin-luck` | 🍀 행운 뽑기 관리 | 회원별 뽑기 기록·포인트 내역(조회 전용) |
| `admin-blocks` | 🚫 차단 | 회원 목록(인증·삭제)·닉네임/IP 차단 |

---

## 관리 기능 목록

### 1. 전체 댓글 관리

- 필터: 일반 / 관리자 / 신고된 댓글  
- 정렬: 최신·오래된  
- 삭제  

### 2. 공지사항 관리

- 카테고리: 전체 공지 / 새 소식  
- 작성 · **수정**(PUT/PATCH `/api/notices/:id`) · 삭제 · 핀 (최대 5)  
- 관리 페이지 목록의 수정 버튼으로 폼을 채워 저장  
- 필터 UI 색상 `#10b981` 통일  

### 3. 문의 관리

- 목록 · 상세 답변 · 삭제  
- comment-detail 에서 대화형 답변  

### 4. 사용자 차단 · 회원 삭제

- 닉네임 또는 IP  
- 만료 시간 설정 · 해제  
- 모델: `Block`  
- 회원 삭제: `DELETE /api/admin/users/:id` (`requireAdmin`) — 계정과 해당 닉네임의 커스텀 게시글·댓글·문의·알림·차단 기록을 함께 제거  
- 회원 직접 인증: `PATCH /api/admin/users/:id/verify` (`requireAdmin`) — 인증 메일이 안 온 계정을 `isVerified=true` 로 처리. 대시보드 회원 표 **인증하기** 버튼

### 5. 티어 신고 관리

- 신고된 게시글 / 댓글
- dismiss (해제) 또는 삭제
- API: `/api/admin/tier-reports/*`

### 6. 이벤트 관리

- 메모리 게임 기록 이벤트: 회차 작성 → 열기(회원 전체 알림) → 마감 → 정산(1위 상금, 1000P 이상)
- 제작한 티어표 공개: 접수 예약·열기(회원 전체 알림)·마감·우승작 선정·결과 발표
- 상세: [`../frontend/13-event/02-admin-event-management-record.md`](../frontend/13-event/02-admin-event-management-record.md), [`03-showcase-launch-record.md`](../frontend/13-event/03-showcase-launch-record.md)

### 7. 행운 뽑기 관리 (2026-10-01)

- **조회 전용** — 포인트 수정·지급 기능은 없다.
- 회원 목록: 닉네임(관리자 이름 포함) 검색, 20명씩, 최근 활동 순. 보유 포인트·오늘의 행운 티어 횟수·최고 티어·포커 판수·랜덤 뽑기 배팅 수, 위쪽에 이용 회원 수·전체 보유 포인트 합계.
- **기록 보기** → 탭 4개: 오늘의 행운 티어(티어별 누적 + 최근 5건) / 행운 티어 포커(배팅·결과·족보·지급·순증감, 최근 50판) / 랜덤 뽑기(회차·배팅 종류·금액·배수·라운드 결과·증감, 최근 50건) / 포인트 내역(얻음·사용 합계, 출처별 합계, 원장 30건씩).
- 지갑 주인 배지: **[관리자]** = 관리자 계정으로 뽑은 기록(지갑이 Admin id), **[탈퇴]** = 회원·관리자 어디에도 없는 계정. 일반 회원은 배지 없음.
- 한계: 포인트 내역은 2026-10-01 배포 이후 증감부터, 포커 승패는 그 이후 정산된 판부터 보인다.
- API: `GET /api/admin/luck/users?q=&page=`, `/api/admin/luck/users/:userId`, `/api/admin/luck/users/:userId/points?page=` (`requireAdmin`)
- 상세: [`../backend/08-luck-draw/04-point-ledger-admin-api-record.md`](../backend/08-luck-draw/04-point-ledger-admin-api-record.md), [`../frontend/07-admin/12-admin-luck-manager-record.md`](../frontend/07-admin/12-admin-luck-manager-record.md)

---

## 인증 원리

```
AdminLogin.jsx (/admin/login)
  → POST /api/admin/login
  → adminAuthToken, isAdmin 저장

이후 모든 관리 fetch
  → getAdminAuthHeaders()
  → Authorization: Bearer <adminAuthToken>

백엔드
  → requireAdmin (requireAuth + isAdmin 확인)
```

### getAdminAuthHeaders (`root-cloudflare/src/lib/api.js`)

```js
export function getAdminAuthHeaders(extraHeaders = {}) {
  const headers = { ...extraHeaders };
  const token = localStorage.getItem('adminAuthToken');
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
  return headers;
}
// 관리자 요청은 adminRequest(path, options) — apiRequest 에 admin:true 를 붙여 위 헤더를 쓴다.
```

information29: 공지 삭제·핀·문의·차단·신고 등 **모든 보호 fetch** 에 헤더 적용해 401 방지.

---

## 백엔드 보호 (backend_28)

| 라우트 그룹 | 미들웨어 |
|-------------|----------|
| `/api/admin/*` | requireAdmin |
| notice 작성/핀/삭제 | requireAdmin |
| inquiry 답변/삭제 | requireAdmin |
| 사용자 목록 등 | requireAdmin |

새 관리 API 추가 시 **requireAdmin 누락 금지**.

---

## 새 관리 기능 추가 절차

1. 백엔드 라우트 + `requireAdmin` (`backend/routes/adminRoutes.js` 또는 기능 라우트)
2. 컨트롤러 로직
3. 화면: 큰 기능은 `src/components/Admin*Manager.jsx` 로 분리(예: `AdminEventManager`·`AdminLuckManager`), `<section ... id="admin-xxx" data-admin-anchor>` 로 감싼다
4. `AdminDashboard.jsx` 에 컴포넌트를 넣고 `quickItems` 에 빠른 이동 태그를 같은 순서로 추가
5. 요청은 `adminRequest()` (관리자 토큰) — 성공 후 목록 다시 불러오기
6. RDMD 기록 추가 권장

---

## 보안 주의

- 일반 유저에게 관리 URL 노출 최소화  
- 일반 JWT로 관리 API 호출 → 403  
- JWT_SECRET · ADMIN 비밀번호 주기적 점검  
- 일괄 삭제 API 사용 시 확인 다이얼로그  

## 관련 기록

- information24, 26, 29
- backend_14, 26, 28
- [`../frontend/07-admin/`](../frontend/07-admin/) (React 이식 이후: 버튼 간격 10, 빠른 이동 11, 행운 뽑기 관리 12)
- [`../frontend/13-event/02-admin-event-management-record.md`](../frontend/13-event/02-admin-event-management-record.md)
- [`../backend/08-luck-draw/04-point-ledger-admin-api-record.md`](../backend/08-luck-draw/04-point-ledger-admin-api-record.md)
