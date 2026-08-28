---
area: frontend
feature: tier-class
---

# 1티어 헤이지 이미지 교체 · 사타케 이미지 추가

## 개요
1티어 을급 헤이지 이미지를 png에서 jpg로 바꿨다. 쓰이지 않던 `hikurumi.png`는 제거했고, `satake hirohumi.png`를 1티어 이미지 폴더에 넣었다.

## 변경된 파일
- `tier-class/tier1.html` — 헤이지 src `heiji.jpg`
- `tier-image/1 tier/heiji.jpg` (신규) / `heiji.png` (삭제)
- `tier-image/1 tier/hikurumi.png` (삭제)
- `tier-image/1 tier/satake hirohumi.png` (신규, HTML 미연결)

## 테스트
1. `/tier-class/tier1.html` 을급에서 헤이지 이미지가 보이는지
2. 구 `heiji.png`·`hikurumi.png` 404가 없는지

## 날짜
2026-08-28
