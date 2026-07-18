---
source: RDMD/information18.md
legacy_id: information18
area: frontend
---

> **원본 일지**: `information18.md` → 기능 폴더 재배치본  
> **순서 번호**: 파일명 앞 숫자 = 해당 기능 내 기록 순서

---
# 커밋 요약 — 정보 기록 (information18)

## 개요
공지사항 시스템을 프론트엔드·백엔드 전반에 걸쳐 구현한 작업입니다. 관리자 공지 등록·고정·삭제, 사용자-facing 목록·상세 페이지, 홈 공지 섹션 API 연동 및 기존 모달 방식 제거를 포함합니다.

---

## 관련 커밋
- **commit fbdcd19**
  - 제목: `feat: 공지사항 시스템 프론트엔드·백엔드 연동 및 상세 페이지 구현`

---

## 변경된 파일 목록 (프론트엔드)
- Added: `notice/notice.js` — 공지 통합 스크립트 (목록·홈·상세)
- Added: `notice/notice-detail.html` — 공지 상세 페이지
- Modified: `notice/notice.html` — API 기반 동적 목록 렌더링
- Modified: `notice/all_notices.html` — 전체 공지 목록 API 연동
- Modified: `notice/news.html` — 새 소식 목록 API 연동
- Modified: `notice/notice.css` — 상세 페이지·카테고리 뱃지·고정 스타일 추가
- Modified: `index.html` — 홈 공지 섹션 API 연동, 모달 제거, UI 클래스 정리
- Modified: `common.css` — 홈 공지 섹션 링크·아이템 스타일 보완
- Modified: `common.js` — 프로필 기본 이미지 로컬 로고로 변경 (외부 placeholder 제거)
- Modified: `admin/comments/comment-management.html` — 공지 올리기 섹션 추가
- Modified: `admin/comments/comment-management.js` — 공지 CRUD·고정·필터·페이지네이션
- Modified: `admin/comments/comment-management.css` — 공지 관리 UI 스타일

---

## 주요 구현 내용

### 1. `notice.js` 통합 스크립트
- 페이지 타입 자동 감지: `home` / `notice_main` / `all_notices` / `news` / `detail`
- `GET /api/notices` — 카테고리(`notice` | `news`)·limit 필터 목록 조회
- `GET /api/notices/:id` — 상세 조회
- 고정 공지 우선 정렬 반영
- 상대·절대 경로 모두 지원하는 상세 URL 생성

### 2. 공지 상세 페이지 (`notice-detail.html`)
- URL `?id=` 파라미터·sessionStorage 백업으로 ID 복구
- `data-page="notice-detail"` + `initNoticeDetailPage()` 명시적 초기화
- 카테고리별 목록 복귀 링크 (전체 공지 → `all_notices.html`, 새 소식 → `news.html`)
- 모달 방식 완전 제거

### 3. 홈·목록 페이지
- `index.html` — 최근 공지 2건씩 API 렌더링, Tailwind 미사용 CSS 클래스로 UI 복구
- `notice.html` — 전체 공지/새 소식 미리보기 5건
- `all_notices.html` / `news.html` — 카테고리별 전체 목록

### 4. 관리자 공지 관리
- 공지 작성 폼: 제목·요약·내용·분류(전체 공지/새 소식)
- 공지 목록: 고정/해제(최대 5개), 삭제
- 분류 필터 드롭다운, 10개 단위 페이지네이션

### 5. 기타 프론트 개선
- `common.js` — `via.placeholder.com` 제거, `tier-image/logo.webp` 로컬 fallback
- `backend/server.js` — 정적 파일 서빙 추가 (`localhost:5000` 단일 서버 접근 가능)

---

## 공지 분류
| category 값 | 표시명 |
|-------------|--------|
| `notice` | 전체 공지 |
| `news` | 새 소식 |

---

## 네비게이션 흐름
```
index.html (홈 공지 2건)
  → notice/notice.html (공지 메인)
    ├─ all_notices.html (전체 공지 목록)
    └─ news.html (새 소식 목록)
  → notice/notice-detail.html?id={_id} (상세)

관리자 comment-management.html
  → 공지 올리기 → POST /api/notices
  → 목록에서 고정/삭제
```

---

## 테스트 체크리스트
1. `backend npm start` 후 `http://localhost:5000/` 홈 공지 표시 확인
2. 공지 클릭 시 상세 페이지 이동 및 내용 표시 확인
3. 관리자에서 공지 등록·고정·삭제 동작 확인
4. 고정 5개 초과 시 고정 버튼 비활성 확인
5. 분류 필터·페이지네이션(10개) 동작 확인
6. 상세 페이지 "잘못된 접근" 없이 정상 로드 확인
7. 프로필 이미지 placeholder 외부 요청 오류 없음 확인

---

## 향후 개선 제안
- 공지 수정(PUT) API 및 관리자 수정 UI
- 홈·목록 페이지 페이지네이션 실제 페이지 이동
- 공지 검색·공지 작성 에디터(마크다운/WYSIWYG)
- 공지 조회수·첨부파일 지원

---

문서 생성일: 2026-06-15