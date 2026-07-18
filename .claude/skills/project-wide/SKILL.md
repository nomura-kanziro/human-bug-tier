---
name: project-wide
description: >
  휴버대 티어표 전역 작업, 새 기능, 크로스 모듈, 리팩터, 프로젝트 구조,
  컨벤션. Use when /project-wide or multi-feature changes.
---

# Claude 스킬 — 프로젝트 전역

## When

- 2개 이상 폴더에 걸친 변경
- 새 기능 추가, 대규모 리팩터, 구조 질문

## Read first

1. `.agents/common-rules.md` (전 AI 공통; Grok = Admin AI)
2. 루트 `CLAUDE.md`
3. `RDMD/features/overview.md`
4. `RDMD/guides/new-feature-checklist.md`

## Do

1. 영향 범위 목록화 (프론트 / backend / common / admin)
2. 권한: 비로그인 · 회원 · 관리자 (`overview` 표)
3. 경로·API: `common` 스킬 + `RDMD/guides/path-and-api.md`
4. 관리 API면 `requireAdmin` + `getAdminAuthHeaders()`
5. 검증 기준: `cd backend && npm start` → `:5000`
6. 큰 변경 후 RDMD · 모듈 README · (규칙 변경 시) `groks` · `codex` · `.claude` 동기화 제안
7. 종료 시: 요약 + 수동 테스트 + 시크릿 점검

## Do not

- `.env` / 시크릿 커밋·출력
- URL·API base 하드코딩
- 관리 기능 무인증 추가
- 요청 밖 대규모 포맷팅
- GH Pages = 풀기능이라고 단정

## Routing

| 성격 | 스킬 |
|------|------|
| 헤더/경로/API base | `common` |
| 티어 페이지 | `tier-class` |
| 커스텀·게시판 | `custom-maker` |
| 로그인 | `auth` |
| 공지 | `notice` |
| 문의 | `inquiry` |
| 관리자 | `admin` |
| 알림 | `notifications` |
| API·모델 | `backend` |
| 배포 | `deploy` |
| 문서 | `rdmd` |
| 온보딩 | `handoff` |

## Checklist

- [ ] 범위 일치
- [ ] 인증/인가
- [ ] path/API 규칙
- [ ] 문서 갱신 여부
- [ ] 테스트 안내
