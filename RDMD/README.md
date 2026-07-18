# RDMD — 휴버대 티어표 개발 기록실

**RDMD** = **R**ecor**d** + **MD** (Markdown).  
휴버대 티어표(`human-bug-tier`) 프로젝트의 **작업 이력 · 기능 설명 · 개발 가이드**를 모아 둔 문서 폴더입니다.

코드 옆에 흩어진 메모 대신, 여기서 프로젝트의 “왜 이렇게 됐는지”와 “어떻게 고칠지”를 찾으면 됩니다.

---

## 이 폴더는 무엇을 담나요?

| 구분 | 폴더 | 한 줄 설명 |
|------|------|------------|
| 요약 | [`summary/`](./summary/) | 지금까지 한 일을 Phase·타임라인으로 정리 |
| 기능 설명 | [`features/`](./features/) | 각 기능이 무엇인지, 어디에 코드가 있는지 |
| 가이드 | [`guides/`](./guides/) | 로컬 실행, 경로/API, 보안, 배포, 기록 방법 |
| 프론트 일지 | [`frontend/`](./frontend/) | 프론트엔드 커밋·작업 상세 기록 (기능별) |
| 백엔드 일지 | [`backend/`](./backend/) | 백엔드 커밋·작업 상세 기록 (기능 폴더 + `*-record.md`) |
| **작성자 커밋 로그** | [`commit_history/`](./commit_history/) | **사람별** 커밋 타임라인 (과거→현재, 목차 포함 · 예: `nomura.md`) |

> 예전에 루트에 있던 `information1.md` ~ `information29.md` 는  
> 모두 **`frontend/` 기능 폴더**로 옮긴 뒤 **삭제**되었습니다.  
> 프론트 기록은 이제 `frontend/` 만 보면 됩니다.

---

## 처음 보는 분 — 읽는 순서

```
1. 이 README (지금 문서)
2. summary/work-history.md     ← 프로젝트 히스토리 한 바퀴
3. features/overview.md        ← 기능·폴더 지도
4. guides/path-and-api.md      ← 경로·API 함정 (필수)
5. 담당 영역
   · 기능 이해 → features/<이름>.md
   · 상세 이력 → frontend/ 또는 backend/
   · 작업 규칙 → guides/
```

로컬 실행·시연은 저장소 루트 [`../README.md`](../README.md) 를 참고하세요.  
권장: `cd backend && npm start` → `http://localhost:5000`

---

## 폴더 상세 소개

### 1. `summary/` — 작업 정리

| 파일 | 내용 |
|------|------|
| [summary/work-history.md](./summary/work-history.md) | Phase별 성과, 완성 기능 체크리스트 |
| [summary/timeline.md](./summary/timeline.md) | 개발 흐름 타임라인 |
| [summary/README.md](./summary/README.md) | 요약 폴더 안내 |

**언제 보나?** 온보딩, “지금까지 뭐 했지?” 할 때.

---

### 2. `features/` — 기능 설명서

현재 사이트에 있는 기능을 **역할·권한·코드 위치** 중심으로 설명합니다.

| 문서 | 주제 |
|------|------|
| [overview.md](./features/overview.md) | 전체 맵 · 사용자 여정 · 권한 표 |
| [common-infra.md](./features/common-infra.md) | common.js, Header/Footer, 경로·API Base |
| [tier-class.md](./features/tier-class.md) | 공식 1~9 티어표 |
| [custom-maker.md](./features/custom-maker.md) | 커스텀 제작 · 게시판 · 댓글 |
| [auth.md](./features/auth.md) | 회원가입 · 로그인 · 비번 재설정 |
| [notice.md](./features/notice.md) | 공지 · 새 소식 · 핀 |
| [inquiry.md](./features/inquiry.md) | 문의하기 · 답변 |
| [admin.md](./features/admin.md) | 관리자 대시보드 |
| [notifications.md](./features/notifications.md) | 헤더 알림 |
| [backend-api.md](./features/backend-api.md) | API 그룹 · 모델 · 미들웨어 |

인덱스: [features/README.md](./features/README.md)

**언제 보나?** 기능을 고치기 전 “이게 원래 어떻게 동작하지?” 할 때.

---

### 3. `guides/` — 개발 가이드라인

팀이 같은 방식으로 코드를 건드리고 배포하기 위한 규칙입니다.

| 문서 | 내용 |
|------|------|
| [development.md](./guides/development.md) | 로컬 실행, 작업 흐름 |
| [coding-conventions.md](./guides/coding-conventions.md) | 프론트·백 코딩 규칙 |
| [path-and-api.md](./guides/path-and-api.md) | getBasePath / getApiBase / 인증 헤더 |
| [security.md](./guides/security.md) | JWT, Admin, 토큰, env |
| [deploy-checklist.md](./guides/deploy-checklist.md) | Render · GH Pages 체크리스트 |
| [rdmd-writing.md](./guides/rdmd-writing.md) | RDMD에 기록 남기는 방법 |
| [new-feature-checklist.md](./guides/new-feature-checklist.md) | 새 기능 추가 체크리스트 |

인덱스: [guides/README.md](./guides/README.md)

**언제 보나?** 새 페이지·API·배포·보안 관련 작업을 시작하기 전.

---

### 4. `frontend/` — 프론트엔드 작업 일지

커밋/작업 단위 상세 기록입니다. **기능별 하위 폴더**로 나뉩니다.

```
frontend/
├── README.md              ← 파일 목록 · 요약 표
├── 01-common/             공통 UI · JWT 유틸
├── 02-tier-class/         공식 티어 관련
├── 03-custom-maker/       제작 · 게시판 · 상세
├── 04-notice/             공지
├── 05-auth/               로그인 · 가입 · 재설정
├── 06-inquiry/            문의
├── 07-admin/              관리자 UI
├── 08-notifications/      알림
└── 09-deploy-path/        경로 · API Base · 배포 프론트
```

- 파일명: `{순서}-{키워드}-record.md`  
- 예: `05-auth/04-password-reset-frontend-record.md`  
- 상세 목록: [frontend/README.md](./frontend/README.md)

**언제 보나?** “이 화면은 언제 어떻게 바뀌었지?” 커밋 단위로 볼 때.

---

### 5. `backend/` — 백엔드 작업 일지

Express · MongoDB · 미들웨어 · 배포 서버 쪽 **상세 일지**입니다.  
`frontend/` 와 같이 **기능 폴더 + 순서 번호 + `*-record.md`** 입니다.

```
backend/
├── README.md              ← 파일 목록 · legacy 대응표
├── 01-setup/              Node · DB 연결
├── 02-tierlists/          게시글 · 댓글 · 좋아요 · 신고
├── 03-auth/               User · JWT · 비번 재설정
├── 04-notice/             공지 API
├── 05-inquiry/            문의 · 답변
├── 06-admin/              관리자 · Block · requireAdmin
└── 07-deploy/             Render · 정적 서빙
```

- 예: `03-auth/04-password-reset-token-hash-record.md`
- 상세 목록: [backend/README.md](./backend/README.md)

**언제 보나?** API·모델·권한·서버 변경 이력을 찾을 때.

---

## 한눈에 보는 전체 트리

```
RDMD/
├── README.md                 ← 지금 이 소개 문서
├── summary/                  작업 요약 · 타임라인
├── features/                 기능 설명 (what)
├── guides/                   개발 규칙 (how)
├── frontend/                 프론트 상세 일지
│   ├── 01-common/ … 09-deploy-path/
│   └── *-record.md
├── backend/                  백엔드 상세 일지
│   ├── 01-setup/ … 07-deploy/
│   └── *-record.md
└── commit_history/           작성자별 커밋 로그
    ├── README.md
    └── nomura.md             ← 창시자 nomura
```

---

## 에이전트 · 팀 · 규칙 계층

| 대상 | 위치 |
|------|------|
| **사람 규칙** | [`../team/`](../team/README.md) |
| **AI 공통 룰** (Grok Admin) | [`../.agents/`](../.agents/README.md) |
| Claude | [`CLAUDE.md`](../CLAUDE.md), [`.claude/skills/`](../.claude/README.md) |
| Grok | [`groks/`](../groks/README.md) |
| Codex | [`AGENTS.md`](../AGENTS.md), [`codex/`](../codex/README.md) |
| 배포 | [`../DEPLOY.md`](../DEPLOY.md) |

충돌 시: 사람 지시 → `.agents` → 에이전트 스킬 → RDMD 이력.

---

## 새 기록을 남길 때

### ★ 커밋·푸시 전 (사람 · 필수)

1. **`commit_history/{본인이름}.md`** 에 이번 커밋 내용을 **먼저** 작성  
   - 목차 **맨 아래** 행 + 상세 **맨 아래** 블록  
   - 정렬: **위=과거, 아래=최신** · 메시지는 실제 `git commit -m` 과 동일  
2. 그 md 를 `git add` 에 포함 → **`git commit` → `git push`**  
3. nomura: [commit_history/nomura.md](./commit_history/nomura.md)  
4. 절차 전문: [commit_history/README.md](./commit_history/README.md)  
5. **로그 없이 커밋·푸시 금지** (`team/04-prohibitions.md`)

### 기능 상세 일지 (권장)

1. **프론트** → `frontend/<기능-폴더>/NN-키워드-record.md`  
2. **백엔드** → `backend/<기능-폴더>/NN-키워드-record.md`  
3. 큰 변화면 `summary/work-history.md` · 해당 `features/*.md` · 각 폴더 README 표 갱신  
4. 작성법: [guides/rdmd-writing.md](./guides/rdmd-writing.md)

---

## 절대 넣지 말 것

- `.env` 실값, DB 비밀번호, JWT 시크릿, 관리자 비밀번호  
- 개인 토큰 · 메일 앱 비밀번호  

환경 변수 **이름**만 적어도 됩니다 (`MONGO_URI`, `ADMIN_INPUT_ID` 등).

---

## 관련 링크 모음

| 목적 | 링크 |
|------|------|
| 프로젝트 시연 | [../README.md](../README.md) |
| 작업 이력 요약 | [summary/work-history.md](./summary/work-history.md) |
| 기능 맵 | [features/overview.md](./features/overview.md) |
| 경로·API 가이드 | [guides/path-and-api.md](./guides/path-and-api.md) |
| 프론트 일지 인덱스 | [frontend/README.md](./frontend/README.md) |
| 백엔드 일지 인덱스 | [backend/README.md](./backend/README.md) |
| 작성자 커밋 (nomura) | [commit_history/nomura.md](./commit_history/nomura.md) |
| 배포 | [../DEPLOY.md](../DEPLOY.md) |

---

**마지막 업데이트**: 2026-07-18  
`backend/` 기능 폴더 재배치 · frontend 와 동일 규칙 적용
