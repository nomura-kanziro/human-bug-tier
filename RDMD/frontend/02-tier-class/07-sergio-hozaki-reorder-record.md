---
area: frontend
---

# 커밋 요약 — 세르지오·호자키 공식 티어 재배치

## 개요

Render 공식 티어표만 수정. 세르지오는 같은 1티어 안에서 병→정, 이후 라이덴 바로 뒤. 호자키는 같은 2티어 안에서 을→갑, 다비츠 바로 뒤. 이미지 폴더는 그대로.

## 관련 커밋

- `2ab62c8` feat(tier-class): 세르지오 1병에서 1정으로 추락
- `a494cb7` feat(tier-class): 세르지오를 라이덴 바로 뒤로 재배치
- `828d0b7` feat(tier-class): 호자키 킷페이 2을에서 2갑으로 상승

## 변경된 파일

- `root-render/tier-class/tier1.html`
- `root-render/tier-class/tier2.html`

## 배치 (작업 후)

- **세르지오**: 1정, 라이덴 다음
- **호자키 킷페이**: 2갑, 다비츠 다음

## 테스트

- `/tier-class/tier1.html` · `tier2.html`에서 카드 순서
- 커스텀 메이커 풀 파싱이 깨지지 않는지 (같은 티어 HTML만 이동)
