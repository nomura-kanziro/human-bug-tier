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
  source: 'admin' | 'youtube',
  youtubePostId,               // 유튜브 커뮤니티 글 ID (sparse unique)
  youtubePostUrl,
  youtubeOriginalTitle,
  youtubeOriginalContent,
  youtubeTranslated,
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
| PUT / PATCH | `/api/notices/:id` | Admin (제목·본문·요약·분류 수정) |
| PATCH | `/api/notices/:id/pin` | Admin |
| DELETE | `/api/notices/:id` | Admin |
| GET | `/api/notices/youtube-sync/status` | Admin |
| POST | `/api/notices/youtube-sync` | Admin (채널 게시판 즉시 가져오기) |

보호: `requireAdmin` (`backend_28`)

## 정렬·핀

- 우선순위: `isPinned` → `pinnedAt` 최신 → `createdAt` 최신  
- 프론트 최대 핀: `MAX_PINNED_NOTICES = 5` (관리자 JS)  
- 백엔드 상한 검증은 강화 여지 있음  

## UI 규칙 (관리자)

- 공지 필터·버튼 색상: **#10b981** 계열 통일 (information29)  
- `.filter-nav.notice-filter-nav` 등 클래스 사용  
- 삭제/핀 시 반드시 `getAdminAuthHeaders()`  

## 유튜브 커뮤니티 → 새 소식

`backend/utils/youtubeCommunitySync.js` 가 `@humanbug_univ./posts` 페이지의 `ytInitialData`(해당 UI의 `ytd-backstage-post-thread-renderer`가 쓰는 데이터)를 읽어 새 글을 `category: news` 로 저장합니다.

- 주기: 기본 10분 (`YOUTUBE_POSTS_POLL_MS`) + 서버 기동 약 15초 후 1회
- 중복: `youtubePostId` sparse unique
- 이미지·본문 링크·원문 링크 포함
- 일본어 본문·제목은 한국어로 번역해 저장. 원문은 `youtubeOriginal*` 에 보관
- 관리자 페이지 **유튜브 게시판 가져오기** 버튼
- 공식 Data API에는 커뮤니티 글 목록이 없어서, 페이지 JSON 파싱에 의존함 (유튜브 UI 변경 시 깨질 수 있음)

## 유지보수

- 카테고리 추가 시: 모델 enum → 프론트 `NOTICE_CATEGORY_LABELS` → 관리 UI 필터  
- 상세 페이지 링크는 getBasePath 대응 유지  

## 관련 기록

- information10~12, 29  
- backend notice 관련 로그  
- [02-notice-update-put-record.md](../backend/04-notice/02-notice-update-put-record.md)
