---
name: react-rewrite
description: >
  정식 버전 React 이식. 바닐라 기능 100% 반영 완료, 배포 전환은 지시 대기.
  Canonical. Use when React rewrite, 정식 버전, 리액트 이식.
---

# 공통 스킬 — React 정식 버전 (`root-cloudflare/`)

## When

- React / 리액트 / Next / 정식 버전 프론트 개편
- “바닐라를 React로”, “v1 다시 만들기”

## Read first

- **`RDMD/features/react-rewrite.md`** — 기획·이식 현황 정본
- `root-cloudflare/README.md` — 라우트 표 · 바닐라↔React 대응 표
- `RDMD/frontend/12-react/03-react-parity-complete-record.md` — 패리티 완료 기록
- `.agents/common-rules.md`

## 현재 상태 (2026-09-19 창시자 지시 반영)

- ✅ **`root-cloudflare/`(React)가 유일한 작업 대상.** 모든 신규 기능·버그수정을 여기서만 한다
- ⛔ **`root-render/`(바닐라)는 베타 버전에서 업데이트 종료 — 수정 금지**(보관용)
- ⛔ **`npm run sync:render` 는 더 이상 돌리지 않는다** — 돌리면 `src/styles/*.css` 가 바닐라
  구본으로 덮어쓰여져 React 수정이 사라진다. 이제 `src/styles/*.css` 도 직접 고쳐도 된다
- **2026-09-17 기준 바닐라 기능 100% 반영 완료** — 홈·티어·공지·커스텀 메이커(꾸미기 포함)·
  행운 뽑기·인증 4종·게시판(목록/상세/본인 글 수정)·마이페이지·알림 전체보기·문의·관리자
- 공식 티어표는 **한 페이지 + 내부 navbar**(`TierPage` 1개). 등급별 색은 `tier-board.css` 의
  `.tier-scope[data-tier="N"]` 변수 블록 한 곳에만 있다
- 백엔드: `backend/` Express + Mongo **유지**. 기본 정적 루트 = `root-cloudflare/dist` (없으면 빌드 필요)
- Cloudflare **배포 인프라**(Pages/CI/Wrangler)만 여전히 지시 대기 — 코드 작업과 혼동 금지

## Do

1. **이제 React 가 정본이다.** 바닐라를 참고는 하되 고치거나 동기화하지 않는다
2. 스타일은 `src/styles/` 에서 직접 수정한다. React 전용 규칙은 여전히
   **`src/styles/react-extra.css`** 에 모으면 추적이 쉽다
3. 티어·캐릭터 데이터는 `src/data/tiers.js` 단일 소스만 본다. 변경은
   `root-render/tier-class/tierN.html` 수정 → `npm run extract:tiers` → 빌드 (하드코딩 금지)
4. API 호출은 `lib/api.js` 만 쓴다 — 유저는 `apiRequest`, 관리자는 `adminRequest`(= `admin: true`).
   권한·토큰·SHA-256 재설정·서버 `requireAdmin` 을 약화하지 않는다(프론트 가드는 UX 용).
   이미지 경로는 `tierImageUrl()` 만 쓴다
5. 커스텀 메이커 저장 형식·localStorage 키는 바닐라·게시판 DB 와 호환 유지.
   **수정 모드(`editId`)에서는 localStorage 에 저장하지 않는다** (작업 중이던 티어표 보호)
6. 검증: `cd root-cloudflare && npm run build` → `cd backend && npm start` → `:5000`

## Do not

- **`root-render/` 수정** — 베타 종료, 작업 금지 (2026-09-19 지시). 참고만 하고 손대지 않는다
- **`npm run sync:render` 실행** — React 수정을 바닐라 구본으로 덮어씀
- 등급별 색·세부등급을 컴포넌트나 여러 CSS 파일에 흩뿌리기 (변수 블록·tiers.js 한 곳 유지)
- Express를 Workers로 교체, mongoose → D1
- Cloudflare Pages/시크릿/CI **배포 작업**을 이 기획을 이유로 다시 손대기 (코드 작업과 별개)
- GH Pages/Pages = 풀기능

## Checklist

- [ ] 바닐라 쪽 변경이면 `npm run sync:render` 먼저
- [ ] 새 스타일은 `react-extra.css`
- [ ] `npm run build` 경고 0
- [ ] `:5000` 에서 해당 라우트 수동 확인
- [ ] 시크릿 미노출
