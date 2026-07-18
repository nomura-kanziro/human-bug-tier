# commit_history — 작성자별 커밋 기록

기능별 상세 일지(`frontend/`, `backend/`)와 별도로,  
**누가 어떤 커밋을 남겼는지** 사람 단위로 모아 두는 폴더입니다.

---

## 필수 규칙 (팀 전원)

### 커밋 · 푸시 전에 반드시 로그를 쓴다

```
1. 코드 작업 · 로컬 테스트 완료
2. RDMD/commit_history/{본인이름}.md 에 커밋 내용 작성  ← 필수
3. git add (코드 + 위 md 파일 포함)
4. git commit
5. (권장) hash 확정 후 md에 short/full hash 기입 → 필요 시 추가 커밋
6. git push
```

| 금지 | 설명 |
|------|------|
| 로그만 안 쓰고 커밋·푸시 | **규칙 위반** |
| 남의 `{이름}.md` 에 본인 커밋 기록 | 본인 파일만 사용 |
| 목차 없이 본문만 대충 추가 | 목차 행 + 상세 블록 **둘 다** |

- 파일 없으면 **본인 이름으로 새로 만든다** (`nomura.md` 형식 복사).  
- nomura → [nomura.md](./nomura.md)  
- 이 규칙은 `team/`, `.agents/`, RDMD 가이드에도 동일하게 명시됨.

---

## 파일

| 파일 | 대상 |
|------|------|
| [nomura.md](./nomura.md) | 작성자 **nomura** 전체 커밋 로그 + 목차 |
| `{이름}.md` | 팀원 추가 시 동일 규칙으로 생성 |

---

## 정렬 규칙 (중요)

```
위쪽  = 가장 오래된 커밋 (과거)
  ↓
아래쪽 = 가장 최신 커밋 (현재)
```

- **과거 → 현재** 가 **위에서 아래** 순이다.
- 새 커밋을 적을 때는 **파일 맨 아래(커밋 상세 구역 끝)** 에 추가한다.
- 목차 표에도 **같은 순서**로 한 줄을 **맨 아래**에 추가하고, `#` 번호를 이어 쓴다.

---

## 목차

- 각 작성자 md 상단에 **목차 표**를 둔다.
- 행: `#` · 날짜 · 단축 hash(앵커 링크) · 메시지 요약
- 상세 블록에는 `<a id="단축해시"></a>` 를 두어 목차에서 점프한다.
- 상세 하단에 `[▲ 목차로](#목차)` 링크를 둔다.
- 커밋 전 hash를 모를 때: 목차 hash 칸에 `pending` 후, 커밋 직후 실제 short hash로 교체.

---

## 쓰는 방법 (커밋 · 푸시 직전) — 필수 절차

### A. 커밋 전 (필수)

1. 커밋 메시지 문구를 정한다 (실제 `git commit -m` 과 **동일**하게).  
2. `RDMD/commit_history/{본인}.md` 를 연다.  
3. **목차 표 맨 아래**에 행 추가 (`#` 연속 번호).  
4. **커밋 상세 맨 아래**에 블록 추가 (아래 템플릿).  
5. 최소한 채울 것: **date, message, author, 범위, 요약**  
6. hash 아직 없으면 `pending` 로 둔다.  
7. `git add` 에 **이 md 파일을 포함**시킨다.  
8. `git commit` → `git push`

### B. 커밋 직후 (권장, 같은 작업 흐름 안)

```bash
git rev-parse --short HEAD
git rev-parse HEAD
```

- short/full hash 를 md 목차·상세·앵커 `id` 에 반영  
- hash 보정만 남았으면 작은 docs 커밋 후 푸시 (또는 아직 push 전이면 한 번에 정리 후 푸시)

### C. 기능이 클 때 (권장)

- `frontend/` · `backend/` 의 `*-record.md` 도 병행  
- 그래도 **commit_history 개인 로그는 생략 불가**

---

## 항목 필드

| 필드 | 필수 | 설명 |
|------|:----:|------|
| date | ✅ 커밋 전 | `YYYY-MM-DD` |
| **message** | ✅ 커밋 전 | **`git commit -m` 원문 그대로** (제목 문자열) |
| author | ✅ 커밋 전 | 본인 git 이름 |
| 범위 | ✅ 커밋 전 | frontend / backend / docs / deploy … |
| **요약** | ✅ 커밋 전 | **그 커밋이 한 일을 사람이 읽게 풀어 쓴 설명** (1~2문장). message 복붙 금지. 무엇을/어디를/왜 중심으로. |
| hash short/full | ✅ 커밋 후 ASAP | `pending` → 실제 해시 |
| git show | 권장 | `git show <short>` |
| 주요 파일 | 권장 | 핵심 경로 |
| 관련 RDMD | 선택 | frontend/backend record 링크 |

#### message vs 요약

| 필드 | 역할 | 예 |
|------|------|-----|
| **message** | 깃에 남은 커밋 한 줄 | `fix(auth): 비밀번호 재설정 링크 만료 오류 수정` |
| **요약** | 작업 내용 설명 | `재설정 토큰 방식을 바꿔 만료·링크 오류를 줄이고, 배포 URL에서도 메일이 맞게 가도록 수정함.` |

---

## 템플릿 (상세 블록)

```markdown
<a id="SHORT_HASH_or_pending"></a>

### N. YYYY-MM-DD — `SHORT_HASH_or_pending`

- **hash (short)**: `pending`  ← 커밋 후 교체
- **hash (full)**: `pending`
- **author**: (본인)
- **message**: (git commit -m 원문 그대로)
- **git**: `git show SHORT_HASH`
- **범위**: frontend | backend | docs | deploy | …
- **요약**: (실제 작업 내용 1~2문장 — message 복붙 금지)
- **주요 파일**: 
- **관련 RDMD**: 

[▲ 목차로](#목차)
```

---

## 다른 기록과의 차이

| 위치 | 관점 | 필수 여부 |
|------|------|:--------:|
| `commit_history/{사람}.md` | **작성자 타임라인** (과거→현재, 목차) | **매 커밋 전 필수** |
| `frontend/` · `backend/` | **기능·기술** 상세 일지 | 큰 기능 권장 |
| `summary/` | 프로젝트 전체 Phase 요약 | 큰 마일스톤 |

---

## 규칙이 적힌 다른 문서

| 문서 | 용도 |
|------|------|
| [../README.md](../README.md) | RDMD 전체 소개 |
| [../guides/rdmd-writing.md](../guides/rdmd-writing.md) | 기록 작성 가이드 |
| [../../team/01-rules.md](../../team/01-rules.md) | 사람 공통 룰 |
| [../../team/02-workflow.md](../../team/02-workflow.md) | 작업 흐름 |
| [../../team/04-prohibitions.md](../../team/04-prohibitions.md) | 금지 (로그 없이 푸시) |
| [../../team/06-checklist.md](../../team/06-checklist.md) | 제출 전 체크 |
| [../../.agents/common-rules.md](../../.agents/common-rules.md) | AI도 사람 커밋 돕기 전 상기 |

---

## nomura.md 스냅샷

- git log 기준 전체 커밋 수록 (재생성 가능)  
- 정렬: **과거(위) → 현재(아래)**  
- 상단 목차 → 단축 해시 앵커  

### 전체 재생성 (선택)

```bash
python RDMD/commit_history/_gen_nomura.py
```

수동 요약·RDMD 링크가 있다면 재생성 전 백업.

RDMD 소개: [../README.md](../README.md)
