---
area: frontend
---

# 커밋 요약 — 캐릭터 풀 뷰포트 화살표

## 개요

커스텀 메이커(제작·글 수정)에서 전체 캐릭터 풀이 화면에 들어오면 반투명 화살표를 띄운다. ▲는 티어표, ▼는 풀 맨 아래로 이동한다. PNG 캡처 영역(`#tier-capture-area`) 밖이라 다운로드에 포함되지 않는다.

## 관련 커밋

- `682c21c` feat(custom-maker): 캐릭터 풀 화살표로 티어표·풀 이동

## 변경된 파일

- `root-render/custom-maker/custom-maker.html`
- `root-render/custom-maker/post_edit.html`
- `root-render/custom-maker/custom-maker.js`
- `root-render/custom-maker/custom-maker.css`

## 구현

- `#pool-viewport-arrows` + `initPoolMaxWindow()`
- `IntersectionObserver` (`threshold: 0`, `rootMargin: 120px 0 80px 0`)로 `.character-pool`이 보이면 화살표 표시
- ▲ → `#tier-capture-area` 또는 `#tier-list` `scrollIntoView`
- ▼ → 풀 wrap `block:end` 후 `#character-pool` `scrollTop = scrollHeight`
- 헤더 위에 오도록 `.pool-arrow` z-index를 높게 둠

## 테스트

- `/custom-maker/custom-maker.html` 풀이 보일 때만 화살표
- ▲▼ 동작, PNG에 화살표가 안 찍히는지
