---
name: project-wide
description: >
  휴버대 티어표 전역 작업, 새 기능, 크로스 모듈, 리팩터, 구조.
  Canonical skill for ANY AI agent.
---

# 공통 스킬 — 프로젝트 전역

> **정본**: `.agents` · 모든 AI(번외 포함) 적용  
> 주 골격: Grok/Claude/Codex 전용 팩은 이 내용을 도구 형식으로 복제한 것.

## When

- 2개 이상 폴더에 걸친 변경
- 새 기능, 대규모 리팩터, 구조·컨벤션 질문

## Read first

1. `.agents/common-rules.md` · `hierarchy.md`
2. `RDMD/features/overview.md`
3. `RDMD/guides/new-feature-checklist.md`
4. 사람 작업이면 `team/`

## Do

1. 영향 범위 목록화 (프론트 / `backend/` / `common.js` / `admin/`)
2. 권한: 비로그인 · 회원 · 관리자 (`overview` 표)
3. 경로·API: `.agents/common/skill.md` + `RDMD/guides/path-and-api.md`
4. 관리 API → `requireAdmin` + `getAdminAuthHeaders()`
5. 검증: `cd backend && npm start` → `:5000`
6. 큰 변경: RDMD · 모듈 README · **해당 `.agents/<기능>/skill.md` 현행화** · 규칙 변경 시 정본 후 주 골격 팩 동기화
7. 종료: 요약 + 수동 테스트 + 시크릿 점검

## 현재 우선순위 (2026-09-19 창시자 지시 — 최신)

- ✅ **프론트 작업은 `root-cloudflare/`(React)에만** 한다
- ⛔ **`root-render/`(바닐라)는 베타 종료 — 수정 금지** (기능·버그·CSS 전부)
- ⛔ **`npm run sync:render` 실행 금지** — React 수정이 바닐라 구본으로 덮어쓰임
- ✅ `backend/` 는 공용 API 서버라 계속 작업
- Cloudflare **배포 인프라**(Pages/CI/Wrangler)만 여전히 지시 대기 — 코드 작업과 혼동 금지

정본: `.agents/common-rules.md` ０항

## Do not

- `.env` / 시크릿 커밋·출력
- URL·API base 하드코딩
- 관리 기능 무인증
- 요청 밖 대규모 포맷
- GH Pages = 풀기능 단정
- 공통 룰을 약화하는 전용 스킬 작성
- **기존 주석 삭제** (코드가 바뀌면 주석 문구만 수정. 사람이 “지워” 하기 전엔 유지)

## Routing → 같은 폴더 skill

| 성격 | skill |
|------|--------|
| 헤더/경로/API | `common` |
| 티어 | `tier-class` |
| 커스텀 | `custom-maker` |
| 로그인 | `auth` |
| 공지 | `notice` |
| 문의 | `inquiry` |
| 관리자 | `admin` |
| 알림 | `notifications` |
| API | `backend` |
| 배포 | `deploy` |
| 문서 | `rdmd` |
| 온보딩 | `handoff` |
| React 정식 기획 | `react-rewrite` |

## Checklist

- [ ] 범위 · 권한 · path/API
- [ ] 문서 갱신 여부
- [ ] 테스트 안내
