---
name: rdmd
description: >
  RDMD 개발 일지, features/guides/summary, frontend|backend 기능폴더 *-record.md 문서화.
  Use when /rdmd or documentation requests.
---

# Antigravity 스킬 — RDMD 문서

> 정본 [`.Agents/skills/rdmd/SKILL.md`](../../../.Agents/skills/rdmd/SKILL.md) 의 복제본입니다. 규칙은 정본부터 고칩니다.

## When

- 작업 기록, 문서화, features/guides 갱신

## Code map

- `RDMD/README.md`, `summary/`, `features/`, `guides/`
- `RDMD/frontend/<기능>/*-record.md`
- `RDMD/backend/<기능>/*-record.md`
- 규칙: `.Agents/`, `team/`
- 에이전트 폴더: `.Grok/`, `.Claude/`, `.Cursor/`, `.Codex/`, `.Antigravity/`, `.Manus/`, `.Qwen/`

## Read first

- `RDMD/guides/rdmd-writing.md`
- `RDMD/frontend/README.md` / `RDMD/backend/README.md`

## Do

1. **사람 커밋 전 필수**: `commit_history/{작성자}.md` (목차+상세, 과거→현재 아래 추가) — 생략 금지 안내
2. 프론트: `frontend/<기능>/NN-키워드-record.md` (큰 기능)
3. 백엔드: `backend/<기능>/NN-키워드-record.md` (큰 기능)
4. 템플릿: 개요·커밋·파일·구현·전후·테스트·날짜
5. 큰 변경: summary + features + guides + 폴더 README
6. **유저 기능이 바뀌면** `RDMD/features/<기능>.md` 와 **`.Agents/skills/<기능>/SKILL.md`** 를 같이 갱신
7. 시크릿 금지
8. **규칙 변경 시 `.Agents` 정본 먼저**, 그다음 에이전트 폴더 + `team`

## Do not

- 루트 `backend_N.md` / `informationN.md` 재생성
- 코드·스킬의 **기존 주석/설명 문단 무단 삭제** (변경 시 문구만 수정. 사람이 “지워” 하기 전엔 유지)
- 커밋 해시 날조
- 기능 폴더 없이 평면 파일만 쌓기
- 에이전트 폴더만 고치고 `.Agents` 정본 방치
- 존재하지 않는 커밋 해시 날조
- features 와 일지 모순 방치
- 규칙 문서·스킬에서 기존 설명 문단을 무단 삭제 (내용 수정만)

## Tasks

**A. 방금 작업 기록** — diff → frontend/backend/ai 기능 폴더  
**B. 기능 가이드** — features + 인덱스  
**C. 온보딩** — summary → overview → path-and-api  

## Checklist

- [ ] commit_history 개인 로그 (커밋 전 필수) 상기·작성
- [ ] 기능 폴더·순서 번호
- [ ] 시크릿 없음
- [ ] README · 정본 동기화
