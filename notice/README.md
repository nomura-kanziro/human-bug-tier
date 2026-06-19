# Notice (공지사항 시스템)

사이트 전체 공지와 새 소식을 관리하는 기능입니다.

## 주요 기능

- **전체 공지**와 **새 소식** 두 가지 카테고리
- 관리자만 작성/수정/삭제 가능
- **고정(Pin)** 기능 (최대 5개)
- 메인 페이지에서 최신  공지 미리보기 표시
- 상세 페이지 (`notice-detail.html`)

## 작동 원리

### 데이터 모델
```js
{
  title,
  summary,
  content,
  category: 'notice' | 'news',
  isPinned,
  pinnedAt,
  createdAt
}
```

### API
- GET `/api/notices` — 전체 목록 (공개)
- POST `/api/notices` — 작성 (Admin only)
- PATCH `/api/notices/:id/pin` — 고정 토글 (Admin)
- DELETE `/api/notices/:id` — 삭제 (Admin)

### 프론트 렌더링
- `notice/notice.js`에서 카테고리별 필터링
- 홈페이지(`index.html`)에서는 별도 API 호출로 미리보기 렌더링
- 관리자 페이지에서는 별도 필터 UI 제공

## 파일 구조

```
notice/
├── notice.html / notice.js           # 목록 + 작성 폼
├── all_notices.html
├── news.html
├── notice-detail.html / .js          # 상세 보기
└── notice.css
```

## 유지보수 가이드

### 새 공지 카테고리 추가
1. 백엔드 `Notice` 모델에 category 값 추가
2. 프론트 필터 로직 (`NOTICE_CATEGORY_LABELS`) 수정
3. 관리자 페이지 CSS 색상 추가 (필요시)

### 고정 기능 제한
- 현재 `MAX_PINNED_NOTICES = 5` (admin JS)
- 백엔드에서도 별도 검증 로직 추가 고려

### 정렬 규칙
- 홈/목록: `isPinned` 우선 → `pinnedAt` 최신 → `createdAt` 최신

### 관리자 페이지 연동
`admin/comments/comment-management.js`에서 공지 관리 UI를 함께 제공합니다.

## 보안
- 공개 조회는 누구나 가능
- 생성/수정/삭제/핀은 `requireAdmin` 미들웨어로 철저히 보호

---

**참고**
- 루트 README의 시연 가이드
- 관리자 페이지 문서 (`admin/README.md`)
