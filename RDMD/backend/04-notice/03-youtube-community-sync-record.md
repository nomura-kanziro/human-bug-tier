---
area: backend
feature: notice
---

# 유튜브 커뮤니티 → 새 소식 자동 연동

## 개요
휴먼버그대학교 유튜브 채널 게시판(`/@humanbug_univ./posts`)에 새 글이 올라오면, 본문·이미지·원문 링크를 사이트의 **새 소식**으로 저장한다.

유튜브 공식 Data API에는 커뮤니티(Posts) 목록이 없어서, 채널 `/posts` 페이지의 `ytInitialData`(화면의 `ytd-backstage-post-thread-renderer`가 쓰는 데이터)를 읽고, 비면 InnerTube browse를 보조로 쓴다.

## 변경된 파일
- `backend/models/Notice.js` — `source`, `youtubePostId`(sparse unique), `youtubePostUrl`
- `backend/utils/youtubeCommunitySync.js` — 수집·중복 방지·스케줄러
- `backend/controllers/noticeController.js` — 동기화 API
- `backend/routes/noticeRoutes.js` — `GET/POST .../youtube-sync` (`/:id`보다 앞)
- `backend/server.js` — 기동 시 스케줄러, `/health`에 상태
- `backend/.env.example`, `render.yaml`

## 동작
- 서버 기동 약 15초 후 1회, 이후 기본 10분마다
- 이미 있는 `youtubePostId`는 건너뜀. 일본어가 남아 있으면 한국어로 다시 번역
- 일본어 → 한국어 번역 후 저장 (`translateJaKo.js`). 원문은 `youtubeOriginalTitle` / `youtubeOriginalContent`
- 첫 적재는 알림 없음. 이후 새 글만 알림
- 관리자 `POST /api/notices/youtube-sync`로 즉시 실행
- 공개 쓰기 경로는 열지 않음 (`requireAdmin` + 서버 내부 작업만)

## 환경변수
- `YOUTUBE_POSTS_SYNC_ENABLED` (기본 true)
- `YOUTUBE_POSTS_URL`
- `YOUTUBE_POSTS_POLL_MS` (최소 60000)
- `YOUTUBE_POSTS_SYNC_NOTIFY`

## 테스트
1. `cd backend && npm start` → 로그에 동기화 시작 문구
2. 15초 뒤 Mongo에 `category: news`, `source: youtube` 문서 생성
3. 같은 글을 다시 돌려도 중복 없음
4. 비관리자 `POST /api/notices/youtube-sync` → 401/403

## 날짜
2026-08-30
