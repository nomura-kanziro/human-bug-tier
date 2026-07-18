---
name: rdmd
description: >
  RDMD 개발 일지, features/guides/summary, frontend|backend 기능폴더 *-record.md.
  Codex: documentation records.
---

# Codex 스킬 — RDMD 문서

## When

- 작업 기록, 커밋 일지, features/guides 갱신, “정리해”, “문서화”

## Code map

- `RDMD/README.md`, `summary/`, `features/`, `guides/`
- `RDMD/frontend/<기능>/*-record.md`
- `RDMD/backend/<기능>/*-record.md`
- 에이전트: `codex/`, `groks/`, `.claude/skills/`

## Read first

- `RDMD/guides/rdmd-writing.md`
- `RDMD/frontend/README.md` / `RDMD/backend/README.md`

## Do

1. **사람 커밋 전 필수**: `RDMD/commit_history/{작성자}.md` (목차+상세) — 생략 금지 안내
2. 프론트: `frontend/<기능>/NN-키워드-record.md` (큰 기능)
3. 백엔드: `backend/<기능>/NN-키워드-record.md` (큰 기능)
4. 템플릿: 개요·커밋·파일·구현·전후·테스트·날짜
5. 큰 변경: summary + features + guides + 폴더 README
6. 시크릿 금지
7. 규칙 변경 시 **`.agents` + codex + .groks + .claude** 동기화

## Do not

- 루트 `backend_N.md` / `informationN.md` 재생성
- 커밋 해시 날조
- 기능 폴더 없이 평면 파일만 쌓기
- commit_history 없이 커밋·푸시 하도록 안내

## Checklist

- [ ] commit_history 개인 로그 (커밋 전 필수)
- [ ] 기능 폴더·순서 번호
- [ ] 시크릿 없음
- [ ] README 링크
