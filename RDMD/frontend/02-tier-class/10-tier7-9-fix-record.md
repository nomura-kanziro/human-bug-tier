---
area: frontend
feature: tier-class
---

# 7~9티어 이름·이미지 정정

## 관련 커밋

- `acda3d3` (2026-10-08) fix(tier-class): 7~9티어 이름·이미지 정정 — 가짜 미도·야시키 마사나리·마네다, 요네쿠라 추가, 니시키도·미츠이케·코모리·미도·야마미소 사진 교체

## 변경 (정본 `root-cloudflare/src/data/tiers.json` + `public/tier-media/tier-image/`)

| 티어 | 변경 |
|---|---|
| 7티어 | **요네쿠라 토시후미** 추가(`yonekura toshifumi.webp`) · 미네다 → **마네다**(이름·`maneda.webp`) · 카케무사 미도 코사쿠 → **가짜 미도 코사쿠**(이름) · 코모리 사진 교체(`komori.webp`) · 니시키도(`nikishido.webp`)·미츠이케(`mitsuike.webp`) 사진 교체(미츠이케 파일 135KB → 9KB) |
| 8티어 | 이소미림·야마미소 사진 파일(`isomirim.jpg`·`yamamiso.jpg`)의 내용을 맞바꿈(야마미소 사진 교체) |
| 9티어 | **\*야시키 마시나리 → \*야시키 마사나리**(이름 오타) · 미도 사진 `mido kosaku real.webp` 로 교체 |

## 메모

- 티어표 화면·커스텀 메이커 풀·이벤트 퀴즈(`backend/data/tierCatalog.js`)·**AI 도우미**(`ai-service` 가 `tiers.json` 을 직접 읽음)가 같은 `tiers.json` 을 쓰므로 이 파일 하나만 고치면 따라온다.
- 행운 뽑기는 **별도** `backend/data/luckPool.js` 를 쓴다 — 이름·이미지가 바뀌면 그쪽도 확인해야 한다(이번 커밋에서는 `tiers.json` 만 수정).
- `npm run extract:tiers` / `sync:render` 는 실행하지 않는다(최근 수정이 바닐라 HTML 로 덮어써 사라진다).
