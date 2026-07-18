---
name: notice
description: >
  공지사항, 새 소식, 핀, 메인 미리보기. Canonical for ANY AI.
---

# 공통 스킬 — 공지사항

## When

- 공지/뉴스 목록·상세, 핀, 메인 미리보기, 관리자 공지 UI

## Code map

- `notice/*`, `index.html` 미리보기
- `admin/comments/comment-management.*`
- backend notice controller/model/routes

## Read first

- `RDMD/features/notice.md`
- `notice/README.md`

## Do

1. GET 공개 / 쓰기·핀·삭제 = **requireAdmin**
2. category `notice`|`news` — 확장 시 라벨·필터 동시 수정
3. 정렬: pinned → pinnedAt → createdAt
4. 관리 UI 색 #10b981, fetch **getAdminAuthHeaders()**
5. 링크 getBasePath

## Do not

- 공지 쓰기를 일반 회원에게 개방
- 관리 삭제 시 헤더 누락

## Checklist

- [ ] 비로그인 읽기
- [ ] 비관리자 쓰기 거부
- [ ] 관리자 CRUD·메인 미리보기
