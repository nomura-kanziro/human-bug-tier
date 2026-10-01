---
area: frontend
feature: tier-class
---

# 커밋 요약 — 1·2티어 수정 + 9티어 중복 제거 (+ 티어 데이터 정본 정정)

## 요청

> 1티어: 우류 타츠오미는 `uryu3paze.webp` 만 남기고 나머지 제외, 토마 타츠노신 바뀐 이미지 적용.
> 2티어: 코사카 신타로(`kosaka shintaro.png`)·호자키 킷페이(`hozaki kikpei.jpg`) 변경된 이미지 확인 후 적용.
> 추가: 야시키 마시나리 중복, 츠루기 시노부 1갑으로(우류 바로 뒤), 세르지오 1정 맨 앞.

## 관련 커밋

- `ca7736c` (2026-10-01) fix(tier-class): 1·2티어 수정 — 토마·코사카·호자키 이미지 교체, 우류 1장만 표시, 츠루기 갑급·세르지오 정급 맨 앞, 9티어 야시키 마시나리 중복 제거

## 변경 (`root-cloudflare/src/data/tiers.json` 직접 수정)

| 등급 | 캐릭터 | 변경 |
|---|---|---|
| 1티어 갑급 | 우류 타츠오미 | 3장(`uryu3paze.webp`·`uryu2paze.jpg`·`uryu1paze.jpg`) → `uryu3paze.webp` 1장. 이름표가 가운데 `uryu2paze` 에 있어 남은 항목으로 옮김. 파일 2개는 행운 뽑기 풀(`luckPool.js` 의 `uryu2paze.jpg`)이 써서 지우지 않음 |
| 1티어 | 츠루기 시노부 | 을급 맨 앞 → **갑급**, 우류 바로 뒤 |
| 1티어 정급 | 세르지오 | 라이덴 뒤 → **맨 앞** |
| 1티어 | 토마 타츠노신 | 같은 파일명(`toma tatsunosin.jpg`)으로 이미지 교체 — 데이터 수정 없음 |
| 2티어 | 호자키 킷페이 | 같은 파일명으로 이미지 교체 — 데이터 수정 없음 |
| 2티어 | 코사카 신타로 | `.jpg` 삭제·`.png` 추가 → `tiers.json` 과 **`backend/data/luckPool.js`** 경로를 `.png` 로(안 고치면 행운 뽑기에서 깨진 이미지) |
| 9티어 | 야시키 마시나리 | 같은 이미지(`yashiki mashinari.webp`)가 "*야시키 마시나리"·"*야사키 마사나리" 두 이름으로 → 파일명과 맞는 "야시키 마시나리" 만 남김 |

## 확인

- 바뀐 이미지 3장을 교체 전(git HEAD)·후로 나란히 놓고 확인 — 모두 정사각형, 새 이미지로 교체됨.
- 로컬 빌드 후 `/tier/1`·`/tier/2` 캡처: 갑급 [우류, 츠루기], 정급 [세르지오, 라이덴, …], 새 이미지 표시.
- 같은 등급 안 같은 이미지 중복 검사: 1~6·8티어 0건. 7티어 "코모리 켄지"·"코모리", 9티어 "카케무사 미도 코사쿠"·"*미도 코사쿠" 는 이름이 달라 의도인지 몰라 그대로 둠(창시자 확인 대기).

## 함께 바로잡은 것 (2026-10-02 문서 갱신)

- `tiers.js` 주석·`extract-tiers.mjs`·`root-cloudflare/README.md`·react-rewrite 스킬·티어표 기능 문서/스킬은 "`root-render/tier-class/tierN.html` 이 정본 → `npm run extract:tiers`" 라고 안내했다.
  그러나 2026-09-19 이후 `root-render` 는 수정 금지라 09-20 이후 수정(`e6478dd`·`0ba93ea`·`8ef5db4`·`8f75701`·`ca7736c`)은 전부 `tiers.json` 에만 있다.
  확인: `root-render/tier-class` 에는 우류 3장·야사키 중복·코사카 `.jpg`·5티어 스가모가 그대로 → extract 를 돌리면 이 수정이 전부 되돌아간다.
- 그래서 **정본 = `tiers.json`, `extract:tiers`·`sync:render` 실행 금지**로 문서를 고치고, 코드 주석 2곳(`tiers.js`, `extract-tiers.mjs`)은 기존 주석을 지우지 않고 경고 줄만 덧붙였다.
