---
name: hbu-project-wide
description: >
  휴버대 티어표 전역 작업 규칙. 새 기능, 크로스 모듈 변경, 리팩터, 온보딩,
  "전체적으로", "프로젝트 구조" 요청 시 사용. /hbu-project
---

# 에이전트 스킬 — 프로젝트 전역

## When (이 스킬을 따를 때)

- 기능 범위가 2개 이상 폴더에 걸칠 때
- 새 기능 추가·대규모 리팩터·구조 질문
- 사용자가 “전체”, “프로젝트”, “온보딩”, “컨벤션”을 말할 때

## Read first

1. `.agents/common-rules.md` · `hierarchy.md` (Grok Admin)
2. `RDMD/features/overview.md`
3. `RDMD/guides/new-feature-checklist.md`
4. 사람 영향 시 `team/`

## Do (반드시 할 일)

1. **영향 범위 파악**: 프론트 폴더 / `backend/` / `common.js` / `admin/` 중 어디인지 목록화
2. **권한 매트릭스 확인**: 비로그인 / 회원 / 관리자 — `RDMD/features/overview.md` 표 기준
3. **경로·API 규칙 준수**: `groks/common/grok_skill.md` 및 `RDMD/guides/path-and-api.md`
4. **관리 API** 가 있으면 `requireAdmin` + `getAdminAuthHeaders()` 쌍
5. 로컬 검증 기준: `cd backend && npm start` → `http://localhost:5000`
6. 의미 있는 변경 후: 모듈 README · RDMD 일지 · (규칙 변경 시) `.agents` 기준 스킬 3팩 동기화
7. Admin AI로서 공통 룰 위반 여부 점검
8. 사용자에게 **변경 요약 + 수동 테스트** 제시

## Do not

- `.env`, 시크릿, `node_modules` 커밋/출력
- `getBasePath` / `getApiBase` 를 무시하고 URL 하드코딩
- 관리 기능을 인증 없이 추가
- 관련 없는 대규모 포맷/리팩터
- `file://` 또는 GH Pages만으로 “풀기능 동작” 단정

## Cross-skill routing

| 요청 성격 | 읽을 스킬 |
|-----------|-----------|
| 헤더/경로/API base | `groks/common/grok_skill.md` |
| 티어 캐릭터 페이지 | `groks/tier-class/grok_skill.md` |
| 커스텀·게시판 | `groks/custom-maker/grok_skill.md` |
| 로그인·가입 | `groks/auth/grok_skill.md` |
| 공지 | `groks/notice/grok_skill.md` |
| 문의 | `groks/inquiry/grok_skill.md` |
| 관리자 | `groks/admin/grok_skill.md` |
| 알림 | `groks/notifications/grok_skill.md` |
| API·모델 | `groks/backend/grok_skill.md` |
| 배포 | `groks/deploy/grok_skill.md` |
| 문서/RDMD | `groks/rdmd/grok_skill.md` |

## Checklist (완료 전)

- [ ] 수정 파일 목록이 요청 범위와 일치
- [ ] 인증/인가 누락 없음
- [ ] 경로·API base 규칙 준수
- [ ] 필요 시 RDMD/README 모듈 문서 갱신 제안 또는 수행
- [ ] 테스트 방법을 사용자에게 전달
