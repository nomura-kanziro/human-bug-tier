---
name: rdmd
description: >
  RDMD 개발 일지, features/guides/summary, frontend|backend 기능폴더 *-record.md 문서화.
  Use when /rdmd or documentation requests.
---

# Claude 스킬 — RDMD 문서

## When

- 작업 기록, 커밋 일지, features/guides 갱신, “정리해”, “문서화”

## Code map

- `RDMD/README.md`, `summary/`, `features/`, `guides/`
- `RDMD/frontend/<기능>/*-record.md`
- `RDMD/backend/<기능>/*-record.md`
- 병렬: `groks/`, `.claude/skills/`

## Read first

- `RDMD/guides/rdmd-writing.md`
- `RDMD/frontend/README.md` / `RDMD/backend/README.md`

## Do

1. 프론트: `frontend/<기능>/NN-키워드-record.md`
2. 백엔드: `backend/<기능>/NN-키워드-record.md` (해당 기능 폴더 안 다음 번호)
3. 템플릿: 개요·커밋·파일·구현·전후·테스트·날짜
4. 큰 변경: summary + features + guides + 폴더 README 표
5. 시크릿 금지
6. 규칙 변경 시 **`.claude/skills` · `groks` · `codex`** 갱신

## Do not

- 루트에 `backend_N.md` / `informationN.md` 재생성
- 존재하지 않는 커밋 해시 날조
- features 와 일지 모순 방치

## Tasks

**A. 방금 작업 기록** — diff → frontend/backend 기능 폴더  
**B. 기능 가이드** — features + 인덱스  
**C. 가이드라인** — guides + 스킬 동기화  
**D. 온보딩** — summary → overview → path-and-api  

## Checklist

- [ ] 올바른 기능 폴더·순서 번호
- [ ] 시크릿 없음
- [ ] README 링크
