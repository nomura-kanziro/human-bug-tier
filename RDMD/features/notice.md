# 공지사항 · 새 소식

사이트 공지와 업데이트를 게시하는 기능입니다.

## 위치

```
notice/
├── notice.html / notice.js      # 목록·작성 연동
├── all_notices.html
├── news.html
├── notice-detail.html
└── notice.css
```

메인 `index.html`에서도 최신 공지 미리보기 API를 호출합니다.  
관리: `admin/comments/comment-management` 공지 섹션.

상세: [`notice/README.md`](../../notice/README.md)

---

## 데이터 모델 (요약)

```js
{
  title,
  summary,
  content,
  category: 'notice' | 'news',  // 전체 공지 | 새 소식
  isPinned,
  pinnedAt,
  createdAt
}
```

## API

| 메서드 | 경로 | 권한 |
|--------|------|------|
| GET | `/api/notices` | 공개 |
| POST | `/api/notices` | Admin |
| PATCH | `/api/notices/:id/pin` | Admin |
| DELETE | `/api/notices/:id` | Admin |
| (수정 엔드포인트) | 컨트롤러 기준 | Admin |

보호: `requireAdmin` (`backend_28`)

## 정렬·핀

- 우선순위: `isPinned` → `pinnedAt` 최신 → `createdAt` 최신  
- 프론트 최대 핀: `MAX_PINNED_NOTICES = 5` (관리자 JS)  
- 백엔드 상한 검증은 강화 여지 있음  

## UI 규칙 (관리자)

- 공지 필터·버튼 색상: **#10b981** 계열 통일 (information29)  
- `.filter-nav.notice-filter-nav` 등 클래스 사용  
- 삭제/핀 시 반드시 `getAdminAuthHeaders()`  

## 유지보수

- 카테고리 추가 시: 모델 enum → 프론트 `NOTICE_CATEGORY_LABELS` → 관리 UI 필터  
- 상세 페이지 링크는 getBasePath 대응 유지  

## 관련 기록

- information10~12, 29  
- backend notice 관련 로그  
