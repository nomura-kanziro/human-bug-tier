# 공식 티어표 (tier-class)

휴먼버그대학교 캐릭터를 **1티어 ~ 9티어**(각 등급 안에 갑·을·병·정급 등 세부등급)로 나눈 정보 페이지입니다.

> 2026-10-02 갱신 — 현행 React 기준으로 다시 썼다. **티어 데이터의 정본은 `root-cloudflare/src/data/tiers.json`** 이다.
> 바닐라 시절 절차("`root-render/tier-class/tierN.html` 을 고치고 `npm run extract:tiers`")는 **쓰지 않는다** — 아래 "주의" 참고.

## 위치 (React)

```
root-cloudflare/
├── src/data/tiers.json          # ★ 정본 — 등급 제목·세부등급(rows)·캐릭터({ img, alt, name })
├── src/data/tiers.js            # tiers.json 을 읽어 TIERS·ALL_CHARACTERS 등으로 파생(화면은 이것만 본다)
├── src/pages/TierPage.jsx       # /tier/:n — 1~9등급을 한 페이지에서 navbar 로 전환(/tier → /tier/1)
├── src/styles/tier-board.css    # 등급별 색(.tier-scope[data-tier="N"])·카드
├── src/styles/tier-nav.css
└── public/tier-media/tier-image/1 tier/ … 9 tier/   # 캐릭터 이미지(빌드 시 dist 로 복사)
```

이미지 주소는 `src/lib/paths.js` `tierImageUrl()` 로만 만든다(`/tier-media/tier-image/` + 인코딩).

## 이 데이터를 함께 쓰는 곳

| 사용처 | 방식 |
|---|---|
| 공식 티어표 `/tier/:n` | `tiers.js` 의 `TIERS` |
| 커스텀 메이커 캐릭터 풀 | `tiers.js` 의 `ALL_CHARACTERS`(+ 저장된 배치를 `makerState.js` 가 현재 카탈로그로 다시 맞춤) |
| 게시글 상세 | `TIERS` |
| 이벤트 매일 퀴즈(서버) | `backend/data/tierCatalog.js` 가 같은 `tiers.json` 파일을 읽는다 |
| 행운 뽑기(서버) | **별도** `backend/data/luckPool.js`(티어별 이름·이미지 경로) — `tiers.json` 을 읽지 않는다 |

## 유지보수

### 캐릭터 추가

1. 이미지를 `root-cloudflare/public/tier-media/tier-image/N tier/` 에 넣는다
2. `tiers.json` 의 해당 등급 `rows[세부등급].items` 지정 위치에 `{ "img": "N tier/파일명", "alt": "이름", "name": "이름" }` 추가
3. 빌드(`npm run build`) 후 `/tier/N` 과 커스텀 메이커 풀에서 확인

### 티어 이동 (승격·추락)

1. 이미지를 출발 티어 폴더 → 도착 티어 폴더로 옮긴다(`git mv`)
2. `tiers.json` 에서 항목을 빼서 도착 등급의 지정 세부등급·위치에 넣고 `img` 경로를 새 폴더로 고친다
3. 그 캐릭터가 `luckPool.js` 에 있으면 그쪽 티어 키·`imagePath` 도 고친다

같은 티어 안 재배치는 `tiers.json` 의 항목 순서만 바꾼다. 폴더는 그대로 둔다.

### 이미지 교체

- **같은 파일명으로 덮어쓰면** 데이터 수정이 필요 없다(예: 2026-10-01 토마 타츠노신·호자키 킷페이).
- **확장자·파일명이 바뀌면** `tiers.json` 과 `luckPool.js` 의 경로를 **둘 다** 고친다(예: 코사카 신타로 jpg → png — `luckPool.js` 를 안 고치면 행운 뽑기에서 깨진 이미지).

## ⚠️ 주의 — `extract:tiers` · `sync:render` 실행 금지

`root-cloudflare/scripts/extract-tiers.mjs`(`npm run extract:tiers`, `npm run sync:render` 에도 포함)는
`root-render/tier-class/tierN.html` 을 파싱해 **`tiers.json` 을 통째로 덮어쓴다**. 그런데 2026-09-19 이후 `root-render/` 는 수정 금지라
그 뒤의 티어표 수정은 전부 `tiers.json` 에 직접 했고, 바닐라 HTML 에는 반영돼 있지 않다.
2026-10-02 확인 기준 `root-render` 쪽에는 우류 타츠오미 3장·9티어 야시키 중복·코사카 `.jpg`(삭제된 파일)·5티어 스가모가 그대로 남아 있어,
실행하면 09-20 이후 수정(`0ba93ea`·`e6478dd`·`8ef5db4`·`8f75701`·`ca7736c`)이 되돌아가고 코사카 이미지가 깨진다.

## 최근 변경

| 날짜 | 커밋 | 내용 |
|---|---|---|
| 09-20 | `e6478dd` | 9티어 카제타니·카모카와 이미지 jpg 교체, 카제티니 오타 → 카제타니 |
| 09-20 | `0ba93ea` | 5티어 스가모 제거 |
| 09-21 | `8ef5db4` · `8f75701` | 5티어 하야미 타이키 · 7티어 카타쿠라 중복 제거 |
| 10-01 | `ca7736c` | 1티어: 우류 타츠오미 `uryu3paze.webp` 1장만, 츠루기 시노부 을급 → **갑급**(우류 뒤), 세르지오 정급 **맨 앞**, 토마 타츠노신 이미지 교체 / 2티어: 코사카 신타로(png)·호자키 킷페이 이미지 교체 / 9티어: 야시키 마시나리 중복("야사키 마사나리") 제거 |

상세 기록: [`../frontend/02-tier-class/`](../frontend/02-tier-class/)

## 권한

전원 열람 가능 (인증 불필요).
