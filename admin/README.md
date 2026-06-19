# Admin (관리자 페이지)

휴버대 티어표의 **모든 관리 기능**을 제공하는 관리자 전용 영역입니다.

## 접속 방법
```
/admin/admin-login.html
```

관리자 계정으로 로그인해야 접근할 수 있습니다.

## 주요 관리 기능

### 1. 전체 댓글 관리
- 일반 유저 댓글 / 관리자 댓글 / 신고된 댓글 필터
- 최신순/오래된순 정렬
- 삭제 기능

### 2. 공지사항 관리
- 전체 공지 / 새 소식 분류
- 고정(Pin) 기능 (최대 5개)
- 작성, 수정, 삭제

### 3. 문의/댓글 관리
- 사용자 문의 목록 확인
- 답변 작성 및 수정
- 문의 삭제

### 4. 사용자 차단 관리
- 닉네임 또는 IP 차단
- 차단 해제
- 만료 시간 설정 가능

### 5. 티어 신고 관리
- 신고된 커스텀 게시글 확인
- 신고된 댓글 확인
- 해제(dismiss) 또는 삭제

## 기술적 원리

### 인증 방식
- `admin-login.js`에서 `/api/admin/login` 호출
- 성공 시 `adminAuthToken`과 `isAdmin` 저장
- 이후 모든 관리 API 호출 시 `getAdminAuthHeaders()` 사용

```js
// admin_api.js
function getAdminAuthHeaders() {
  const token = getAdminAuthToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };
}
```

### 백엔드 보호
모든 관리자 API는 `backend/middleware/auth.js`의 `requireAdmin` 미들웨어로 보호됩니다.

```js
router.get('/users', requireAdmin, getUsers);
router.delete('/inquiries/:id', requireAdmin, deleteInquiry);
```

## 파일 구조

```
admin/
├── admin-login.html / .js          # 관리자 로그인
├── admin_api.js                    # API 베이스 + 인증 헤더 유틸
└── comments/
    ├── comment-management.html     # 메인 관리 대시보드
    ├── comment-management.js
    ├── comment-management.css
    └── comment-detail.html         # 문의 상세 (답변)
```

## 유지보수 방법

### 새로운 관리 기능 추가 시
1. 프론트에 관리 UI 추가
2. 백엔드에 `requireAdmin` 라우트 추가
3. `getAdminAuthHeaders()`로 fetch 호출
4. `comment-management.js` 스타일 패턴 참고

### 색상/스타일 변경
- 공지 관련 필터는 `#10b981` (초록) 계열로 통일
- `.filter-nav.notice-*` 클래스 적극 활용

### 인증 문제 디버깅
- `localStorage.adminAuthToken` 확인
- 토큰 만료 시 재로그인 필요
- 관리자 권한 없는 일반 토큰으로는 403 발생

### 데이터 동기화
관리자 페이지에서 삭제/수정 시:
- 해당 API가 DB를 직접 수정
- 목록은 삭제 후 `load*()` 함수로 즉시 갱신

## 보안 주의사항
- 절대 일반 사용자에게 관리자 페이지 링크를 노출하지 마세요.
- `requireAdmin`이 빠진 라우트가 생기지 않도록 항상 확인
- JWT_SECRET은 정기적으로 변경 고려

---

**관련 문서**
- 프로젝트 루트 [README.md](../README.md)
- [backend/README.md](../backend/README.md)
- RDMD 폴더의 admin 관련 기록
