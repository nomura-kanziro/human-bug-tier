---
area: frontend
---

# 커밋 요약 — 메인 홈 퀵 네비·미리보기·가로 폭

## 개요

Render 메인(`root-render/index.html`)에 퀵 카드 스크롤, 커스텀 메이커 미리보기, 공식 티어표 제목, 섹션 가로 폭 통일을 넣었다. 실무 프론트는 `root-render/`만 해당한다.

## 관련 커밋

- `59fc3e5` feat(index): 퀵 카드 클릭 시 관련 섹션으로 이동
- `45b0d94` feat(index): 메인 커스텀 메이커 미리보기
- `57a9298` feat(index): 공식 티어표 제목 및 메인 가로 폭 통일

## 변경된 파일

- `root-render/index.html`
- `root-render/index-home.css`
- `root-render/index-home.js`

## 구현

1. 퀵 카드에 `data-scroll-target` (`#home-tiers`, `#home-maker-preview`, `#home-luck-preview`). 카드 본체 클릭만 스크롤하고, 안쪽 `<a>`는 그대로 이동한다.
2. 메이커 미리보기: 어두운 미니 보드 + 제작하기·게시판 버튼.
3. `.tiers`를 `.home-tiers-section#home-tiers`로 감싸고 제목 **공식 티어표**.
4. 퀵·공지·미리보기·티어 카드 가로를 `max-width: 1200px`, 좌우 `20px`로 맞춤.

## 테스트

- `http://localhost:5000/` 에서 퀵 카드 → 해당 섹션 스크롤
- 내부 목록 링크는 티어/메이커/뽑기 페이지로 이동
- 데스크톱·모바일에서 섹션 폭이 서로 어긋나지 않는지
