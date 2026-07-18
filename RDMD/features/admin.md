# 관리자 시스템 (admin)

공지·문의·댓글·차단·티어 신고를 한곳에서 다루는 **운영 전용** 영역입니다.

## 접속

```
/admin/admin-login.html
```

환경변수 `ADMIN_INPUT_ID` / `ADMIN_INPUT_PW` 기반 시드 계정 (서버 기동 시 `seedAdmin`).

상세: [`admin/README.md`](../../admin/README.md)

---

## 파일 구조

```
admin/
├── admin-login.html / .js / .css
├── admin_api.js                 # API Base + getAdminAuthHeaders
└── comments/
    ├── comment-management.html  # 통합 대시보드
    ├── comment-management.js / .css
    └── comment-detail.html / .js  # 문의 상세·답변
```

---

## 관리 기능 목록

### 1. 전체 댓글 관리

- 필터: 일반 / 관리자 / 신고된 댓글  
- 정렬: 최신·오래된  
- 삭제  

### 2. 공지사항 관리

- 카테고리: 전체 공지 / 새 소식  
- 작성 · 수정 · 삭제 · 핀 (최대 5)  
- 필터 UI 색상 `#10b981` 통일  

### 3. 문의 관리

- 목록 · 상세 답변 · 삭제  
- comment-detail 에서 대화형 답변  

### 4. 사용자 차단

- 닉네임 또는 IP  
- 만료 시간 설정 · 해제  
- 모델: `Block`  

### 5. 티어 신고 관리

- 신고된 게시글 / 댓글  
- dismiss (해제) 또는 삭제  
- API: `/api/admin/tier-reports/*`  

---

## 인증 원리

```
admin-login.js
  → POST /api/admin/login
  → adminAuthToken, isAdmin 저장

이후 모든 관리 fetch
  → getAdminAuthHeaders()
  → Authorization: Bearer <adminAuthToken>

백엔드
  → requireAdmin (requireAuth + isAdmin 확인)
```

### getAdminAuthHeaders (개념)

```js
function getAdminAuthHeaders() {
  const token = getAdminAuthToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };
}
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

1. 백엔드 라우트 + `requireAdmin`  
2. 컨트롤러 로직  
3. `comment-management` UI 패턴 복제  
4. `getAdminAuthHeaders()` 로 fetch  
5. 성공 후 `load*()` 로 목록 갱신  
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
