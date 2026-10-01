---
area: frontend
feature: notice
---

# 커밋 요약 — 전체 공지 · 새 소식 목록 제목의 점 간격

## 요청

> 전체 공지, 새 소식: h1 텍스트와 span dot 이 서로 붙어 있는 간격을 벌릴 것 (`/notice/all`, `/notice/news`)

## 관련 커밋

- `4dd0282` (2026-10-01) style(notice): 전체 공지·새 소식 목록 제목 앞 점과 글자 사이 간격 확대

## 원인 · 수정

- `src/pages/NoticeList.jsx` 의 제목은 `<h1 class="notice-title"><span class="notice-dot" /> {label}</h1>` 구조인데,
  `.notice-title` 은 flex 가 아니고 간격 설정도 없어 색 점이 글자에 붙어 보였다(공지 메인의 두 칸 소제목 `.notice-col-title` 은 flex + `gap: 10px` 이라 문제없음).
- `src/styles/notice.css` 에 `.notice-title .notice-dot { margin-right: 14px; vertical-align: middle; position: relative; top: -2px; }` 추가 — 34px 글자 높이 가운데 정렬.
- 제목 **안의 점에만** 적용되는 선택자라, 점이 없는 공지 메인 "공지사항" 제목(`NoticeHome.jsx` 의 `.notice-title`)에는 영향 없음.

## 확인

- 로컬 빌드 후 `/notice/all`·`/notice/news` 캡처 — 점과 글자 사이가 벌어짐.
