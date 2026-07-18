# RDMD 기록 작성 가이드

RDMD는 **커밋 단위 작업 일지**입니다. 미래의 나와 팀원이 “왜 이렇게 됐는지” 빠르게 찾게 합니다.

---

## 파일 체계

| 종류 | 패턴 | 내용 |
|------|------|------|
| 프론트 | `frontend/{NN-기능}/{순서}-{키워드}-record.md` | 기능별 폴더 + 순서 번호 + record |
| 백엔드 | `backend/{NN-기능}/{순서}-{키워드}-record.md` | 동일 규칙 |
| **작성자 커밋** | `commit_history/{이름}.md` | 사람별 타임라인 · **과거(위)→현재(아래)** · 목차 · **매 커밋 전 필수** |
| 요약 문서 | `summary/`, `features/`, `guides/` | 온보딩용 정리 |

- 프론트 인덱스: [../frontend/README.md](../frontend/README.md)  
- 백엔드 인덱스: [../backend/README.md](../backend/README.md)  
- 작성자 커밋: [../commit_history/README.md](../commit_history/README.md)  
- RDMD 소개: [../README.md](../README.md)

---

## ★ 커밋·푸시 전 필수 (commit_history)

사람(창시자·팀원)이 코드를 올릴 때:

1. **`git commit` / `git push` 하기 전에**  
   `RDMD/commit_history/{본인이름}.md` 에 이번 커밋 내용을 쓴다.  
2. 목차 **맨 아래 행** + 상세 **맨 아래 블록** (정렬: 위=과거, 아래=최신).  
3. **`message`** = `git commit -m` **원문**.  
4. **`요약`** = 그 커밋이 **실제로 한 일**을 1~2문장으로 (message 복붙 금지).  
5. 그 md 를 **스테이징에 포함**한 뒤 커밋·푸시.  
6. hash 는 커밋 직후 채우는 것을 권장 (`pending` → 실제 해시).

- **로그 없이 커밋·푸시 = 규칙 위반** (`team/04-prohibitions.md`)  
- 절차 전문: [../commit_history/README.md](../commit_history/README.md)

### 프론트 폴더

```
RDMD/frontend/
  01-common/ | 02-tier-class/ | 03-custom-maker/ | 04-notice/
  05-auth/   | 06-inquiry/    | 07-admin/        | 08-notifications/
  09-deploy-path/
```

### 백엔드 폴더

```
RDMD/backend/
  01-setup/ | 02-tierlists/ | 03-auth/ | 04-notice/
  05-inquiry/ | 06-admin/ | 07-deploy/
```

상단 YAML 권장:

```yaml
---
source: (optional commit note)
area: frontend   # 또는 backend
---
```

---

## 번호 선택

1. 해당 **기능 폴더** 안에서 마지막 `NN-` 다음 번호 사용  
2. 프론트만 → `frontend/<기능>/`  
3. 백엔드만 → `backend/<기능>/`  
4. 둘 다 → 양쪽 record 작성 후 서로 링크  

`RDMD/README.md` · 각 폴더 README 표도 큰 작업 후 갱신.

---

## 권장 템플릿

```markdown
---
source: (optional)
area: backend
---

# 커밋 요약 — (짧은 제목)

## 개요
(2~4문장: 무엇을, 왜)

## 관련 커밋
- **commit abc1234**
  - 제목: `feat(scope): ...`

## 변경된 파일 목록
- Modified: `path/to/file`

## 주요 구현 내용
### 1. ...

## 변경 전/후 (주요)
| 항목 | 변경 전 | 변경 후 |
|------|---------|---------|
| ... | ... | ... |

## 테스트 체크리스트
1. ...

## 향후 개선 제안
- ...

---
문서 생성일: YYYY-MM-DD
```

---

## 잘 쓰는 팁

- 커밋 해시·메시지를 적으면 git log 와 대조 가능  
- 코드 블록은 핵심만  
- 버그 수정이면 재현 조건 한 줄  
- 보안·배포 변경은 guides 영향 여부 한 줄  

## 하지 말 것

- 시크릿·실제 비밀번호·연결 문자열 기록  
- 루트에 다시 `backend_N.md` / `informationN.md` 쌓기  
- features/guides 와 모순 방치  

큰 아키텍처 변화 후:

1. `summary/work-history.md`  
2. `features/*.md`  
3. 필요 시 `guides/*`  
4. `.claude/skills` / `groks` / `codex` 규칙 동기화  
