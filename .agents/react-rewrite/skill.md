---
name: react-rewrite
description: >
  정식 버전 React 이식 기획. 바닐라 유지, Cloudflare 작업 중지.
  Canonical. Use when React rewrite, 정식 버전, 리액트 이식.
---

# 공통 스킬 — React 정식 버전 (기획만)

## When

- React / 리액트 / Next / 정식 버전 프론트 개편
- “바닐라를 React로”, “v1 다시 만들기”

## Read first

- **`RDMD/features/react-rewrite.md`** — 기획 정본
- `RDMD/features/overview.md` — 가져갈 기능 목록
- `.agents/common-rules.md`

## 현재 상태

- 제품은 **바닐라 `0.4.3`** — `root-render/` (Render 실무, 정본)
- **React 앵 = `root-cloudflare/`** (Vite+React 18+Router 6). 2026-09-05 창시자 지시로 **1~3단계 이식 완료**(레이아웃·홈·티어·공지). 4단계~는 `PendingPage`, 지시 대기
- 백엔드: `backend/` Express + Mongo **유지**. 기본 정적 루트 = `root-cloudflare/dist` (없으면 빌드 필요)
- **지금 실무 배포 = Render.com** (`root-render/` + `backend/`)
- **Cloudflare 배포 추가 작업은 하지 않음**

## Do

1. 다음 단계 이식은 **지시 받고** `react-rewrite.md` 순서로, 바닐라(`root-render/`)와 동작 바교
2. React 작업 위치 = `root-cloudflare/src/`. 스타일은 바닐라 CSS 그대로(`src/styles/`), 클래스명 유지
3. 티어 캐릭터 변경은 `root-render/tier-class/tierN.html` 수정 → `npm run extract:tiers` → 빌드
4. 권한·토큰·SHA-256 재설정·`requireAdmin` 을 약화하지 않음. 이미지 경로는 `tierImageUrl()` 만
5. 검증: `cd root-cloudflare && npm run build` → `cd backend && npm start` → `:5000`

## Do not

- 지시 없이 4단계 이후(인증·게시판·관리자 등) 이식
- `root-render/` 바닐라 삭제·임의 변경 (Render 정본)
- Express를 Workers로 교체, mongoose → D1
- Cloudflare Pages/시크릿/CI를 이 기획을 이유로 다시 손대기
- GH Pages/Pages = 풀기능

## Checklist

- [ ] 기획 문서 읽음
- [ ] 구현 지시 여부 확인
- [ ] 시크릿 미노출
