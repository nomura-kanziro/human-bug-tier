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

- 제품은 **바닐라 `0.4.1`**. 프론트: `root-cloudflare/` (로컬), `root-render/` (Render)
- 백엔드: `backend/` Express + Mongo **유지**
- **지금 실무 = Render.com** (`root-render/` + `backend/`)
- **Cloudflare 배포 추가 작업은 하지 않음**
- React **구현은 창시자 지시 전 금지**

## Do

1. 기획·패리티·불변 규칙만 문서/안내에 맞춘다
2. 구현 지시가 오면 `react-rewrite.md` 단계대로, 바닐라와 동작 비교
3. 권한·토큰·SHA-256 재설정·`requireAdmin` 을 약화하지 않음
4. 검증은 여전히 `cd backend && npm start` → `:5000` (API 동일 오리진 또는 localhost:5000)

## Do not

- 지시 없이 `create-react-app` / Vite React / Next 스캐폴드
- 바닐라 페이지를 임의로 삭제
- Express를 Workers로 교체, mongoose → D1
- Cloudflare Pages/시크릿/CI를 이 기획을 이유로 다시 손대기
- GH Pages/Pages = 풀기능

## Checklist

- [ ] 기획 문서 읽음
- [ ] 구현 지시 여부 확인
- [ ] 시크릿 미노출
