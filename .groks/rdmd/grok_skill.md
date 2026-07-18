---
name: hbu-rdmd
description: >
  RDMD 개발 일지, features/guides/summary, frontend|backend 기능폴더 *-record.md 작성.
  문서화·작업 기록 요청 시 사용.
---

# 에이전트 스킬 — RDMD 문서

## When

- 작업 기록, 커밋 일지, 문서화
- `RDMD/frontend/*`, `RDMD/backend/*`
- features / guides / summary 갱신

## Code map

```
RDMD/
├── README.md
├── summary/ features/ guides/
├── commit_history/{작성자}.md   ← 커밋·푸시 전 필수
├── frontend/<기능>/*-record.md
└── backend/<기능>/*-record.md
```

## Read first

- `RDMD/commit_history/README.md`
- `RDMD/guides/rdmd-writing.md`
- `RDMD/README.md`

## Do

1. **커밋·푸시 전 필수**: `commit_history/{작성자}.md` (목차+상세, 아래=최신)
2. 프론트: `frontend/<기능>/NN-키워드-record.md` (큰 기능)
3. 백엔드: `backend/<기능>/NN-키워드-record.md` (큰 기능)
4. 템플릿·체크리스트 (`rdmd-writing.md`)
5. 큰 변경: summary / features / guides / 폴더 README
6. 시크릿 금지
7. 스킬 규칙 변경 시 `.agents` + .groks + .claude + .codex 동기화

## Do not

- commit_history 없이 커밋·푸시하도록 안내
- 루트 `backend_N.md` / `informationN.md` 다시 만들기
- 커밋 해시 날조

## Checklist

- [ ] commit_history 개인 로그 (커밋 전 필수)
- [ ] 기능 폴더·순서 번호 올바름
- [ ] 시크릿 없음
- [ ] 인덱스 README 갱신 여부
