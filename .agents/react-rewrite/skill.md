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

## 현재 상태

- 제품은 **바닐라 `0.5.0`** — `root-render/` (Render 실무, 정본)
- **React 앱 = `root-cloudflare/`** (Vite+React 18+Router 6).
  **2026-09-17 기준 바닐라 기능 100% 반영 완료** — 홈·티어·공지·커스텀 메이커(꾸미기 포함)·
  행운 뽑기·인증 4종·게시판(목록/상세/본인 글 수정)·마이페이지·알림 전체보기·문의·관리자
- 남은 것은 **8단계 배포뿐**. React 를 실무 배포로 전환하는 건 **창시자 지시 후**
- 공식 티어표는 **한 페이지 + 내부 navbar**(`TierPage` 1개). 등급별 색은 `tier-board.css` 의
  `.tier-scope[data-tier="N"]` 변수 블록 한 곳에만 있다
- 백엔드: `backend/` Express + Mongo **유지**. 기본 정적 루트 = `root-cloudflare/dist` (없으면 빌드 필요)
- **지금 실무 배포 = Render.com** (`root-render/` + `backend/`)
- **Cloudflare 배포 추가 작업은 하지 않음**

## Do

1. **바닐라가 정본.** 바닐라 CSS·티어 데이터·`tier-media` 가 바뀌면 손으로 복사하지 말고
   `cd root-cloudflare && npm run sync:render` 를 먼저 돌린다
2. React 전용 스타일은 **`src/styles/react-extra.css`** 에만 쓴다 (동기화가 덮어쓰지 않는 유일한 파일).
   나머지 `src/styles/*.css` 는 동기화 산출물이라 직접 고치면 다음 동기화에 사라진다
3. 티어·캐릭터 데이터는 `src/data/tiers.js` 단일 소스만 본다. 변경은
   `root-render/tier-class/tierN.html` 수정 → `npm run extract:tiers` → 빌드 (하드코딩 금지)
4. API 호출은 `lib/api.js` 만 쓴다 — 유저는 `apiRequest`, 관리자는 `adminRequest`(= `admin: true`).
   권한·토큰·SHA-256 재설정·서버 `requireAdmin` 을 약화하지 않는다(프론트 가드는 UX 용).
   이미지 경로는 `tierImageUrl()` 만 쓴다
5. 커스텀 메이커 저장 형식·localStorage 키는 바닐라·게시판 DB 와 호환 유지.
   **수정 모드(`editId`)에서는 localStorage 에 저장하지 않는다** (작업 중이던 티어표 보호)
6. 검증: `cd root-cloudflare && npm run build` → `cd backend && npm start` → `:5000`

## Do not

- 지시 없이 React 를 실무 배포로 전환 (8단계)
- `src/styles/*.css`(동기화 산출물) 직접 수정 — `react-extra.css` 로
- 등급별 색·세부등급을 컴포넌트나 여러 CSS 파일에 흩리기 (변수 블록·tiers.js 한 곳 유지)
- `root-render/` 바닐라 삭제·임의 변경 (Render 정본)
- Express를 Workers로 교체, mongoose → D1
- Cloudflare Pages/시크릿/CI를 이 기획을 이유로 다시 손대기
- GH Pages/Pages = 풀기능

## Checklist

- [ ] 바닐라 쪽 변경이면 `npm run sync:render` 먼저
- [ ] 새 스타일은 `react-extra.css`
- [ ] `npm run build` 경고 0
- [ ] `:5000` 에서 해당 라우트 수동 확인
- [ ] 시크릿 미노출
