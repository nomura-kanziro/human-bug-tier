---
area: frontend
---

# 커밋 요약 — 메인 행운 뽑기 위젯

## 개요

메인에 오늘의 행운 티어를 짧게 뽑는 위젯을 넣었다. 전용 페이지와 같은 `luck-draw-api.js`·게스트 `luckDrawGuestState`를 쓴다. 이후 버튼 아래를 고정 높이 스테이지로 다듬었다.

## 관련 커밋

- `a1164fa` feat(index): 메인 행운 뽑기 위젯
- `b3c185c` feat(index): 메인 행운 뽑기 위젯 스테이지 정리

## 변경된 파일

- `root-render/index.html`
- `root-render/index-home.css`
- `root-render/index-home.js`

## 구현

- `#home-luck-preview` 위젯: 버튼 → `POST /api/luck-draw/daily` (약 2.2초 릴)
- 게스트 24시간은 `localStorage` `luckDrawGuestState` (뽑기 페이지와 동일)
- 스테이지: placeholder `?` / loading 릴 / result 카드. `[hidden]`은 `display:none !important`로 flex 덮어쓰기 방지
- 빈 `#home-luck-status`는 숨김. GH Pages(`GITHUB_STATIC`)면 안내만

## 테스트

- 메인에서 뽑기 → 결과 카드, 쿨다운·한도 문구
- 게스트 24시간 재클릭 안내
- 로그인 후 횟수·쿨다운은 서버 429
