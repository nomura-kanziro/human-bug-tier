# 개발 환경 · 작업 흐름

> ⚠ `backend/.env` 는 `override: true` 로 읽혀 **셸 환경 변수보다 우선**합니다. `MONGO_URI` 를 셸에서 넘겨도 `.env` 의 DB 로 붙으니, 테스트 데이터를 넣기 전에 `/health` 와 `.env` 를 먼저 확인하세요. 격리 실행 예시: [`docs/readme/tools/guard-env.js`](../../docs/readme/tools/guard-env.js)

## 권장 로컬 실행

```bash
cd backend
npm install
npm start          # 또는 npm run dev (nodemon)
```

브라우저: **http://localhost:5000/**

- 프론트 정적 파일 + `/api/*` 가 **같은 포트**  
- `getApiBase()` 가 빈 문자열 → 상대 경로로 API 호출 (배포와 동일)

### AI 전용 서비스 (선택, 2026-10-18~)

`/ai`(휴버봇)를 쓰려면 Python 서비스를 따로 띄운다. 안 띄우면 `/api/ai/*` 만 503 이고 나머지는 정상.

```bash
ollama pull gemma4:12b ; ollama pull bge-m3                    # 처음 한 번(Ollama 는 켜져 있어야 함)
cd ai-service
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt     # Linux/macOS: .venv/bin/python
copy .env.example .env                                         # 기본값 = Ollama gemma4:12b + bge-m3. Ollama 가 꺼져 있으면 문서 검색 답(fallback)
.venv/Scripts/python scripts/dev_service.py start             # 떼어서 띄움(터미널을 닫아도 안 꺼짐) · status · stop. 또는 아래 uvicorn 직접 실행
# .venv/Scripts/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
.venv/Scripts/python -m pytest -q                              # 테스트(Ollama·Claude·Oracle 호출 없음)
.venv/Scripts/python scripts/eval_guide_chat.py                # 실제 모델로 질문 묶음 점검(--no-llm 은 검색·분기만)
```

- backend 는 기본으로 `http://127.0.0.1:8000` 을 부른다(`backend/.env` `AI_SERVICE_URL`). `AI_SERVICE_KEY` 는 양쪽 같은 값.
- **backend 코드(`routes/aiRoutes.js` 등)를 바꾸면 :5000 서버를 재시작**해야 새 라우트가 잡힌다(안 하면 "없는 API" 404). ai-service 도 코드·지식 변경 후 재시작(또는 `POST /reload`).
- Windows Git Bash `curl` 로 한글 JSON 을 보내면 깨진다 — Node `fetch`·브라우저로 시험.
- 처음 뜰 때 지식 조각(약 380개)을 임베딩해 `ai-service/data/chroma/` 에 저장한다(약 15초, 이후엔 바뀐 조각만). 파일을 지우면 다시 만든다.
- 상세: [`../../ai-service/README.md`](../../ai-service/README.md), [`../features/ai-service.md`](../features/ai-service.md)

### 대안 (프론트만 다른 포트)

- Live Server 등 `5500/3000/...` + backend `5000` 동시 실행  
- `getApiBase()` 가 자동으로 `http://localhost:5000` 지정  
- 가능하지만, 경로·쿠키·동일 오리진 이슈 디버깅이 어려울 수 있음  

### 비권장

| 방식 | 이유 |
|------|------|
| `file://` 로 HTML 직접 열기 | fetch(header/footer, API) 실패 |
| `npx serve . -p 5000` | backend와 포트 충돌, clean URL·API 없음 |
| GH Pages만으로 기능 테스트 | API 없음 (`GITHUB_STATIC`) |

---

## 환경 변수

```bash
cd backend
copy .env.example .env   # Windows
# 또는 cp .env.example .env
```

| 구분 | 변수 |
|------|------|
| 필수 | `MONGO_URI`, `ADMIN_INPUT_ID`, `ADMIN_INPUT_PW` |
| 권장 | `JWT_SECRET`, `EMAIL_USER`, `EMAIL_APP_PASSWORD`, `APP_URL` |

MongoDB는 로컬 또는 Atlas. 네트워크 IP 허용 확인.

---

## 작업 흐름 권장

```
1. 기능/버그 파악 → features/ 또는 모듈 README
2. 브랜치 생성 (선택)
3. 백엔드 routes → controllers → models 순 또는 프론트 우선
4. requireAdmin / requireAuth 누락 없는지 확인
5. localhost:5000 에서 수동 시나리오 테스트
6. ★ 커밋 전 `RDMD/commit_history/{본인}.md` 작성 (필수)
7. git add (코드 + commit_history md) → git commit → git push
8. (권장) 큰 기능이면 frontend|backend `*-record.md`
```

### 커밋 메시지 스타일 (팀 규칙)

- 형태: **`type(scope): 한국어 설명`** (`team/04-prohibitions.md`)
- **type / scope = 영어** (`feat`, `fix`, `docs`, `chore` …)
- **콜론 뒤 = 한국어** (설명만 영어 문장 금지)

```
feat(admin): 댓글·티어 게시판 관리 기능 강화
fix(deploy): get*ApiBase() 로컬·Render 동작 통일
chore(deploy): Render.com 용 render.yaml 추가
docs(commit_history): 커밋 해시 기입
```

---

## 디렉터리 역할 재확인

| 경로 | 수정 시 |
|------|---------|
| `root-cloudflare/src/components/Layout.jsx`, `Header.jsx`, `Footer.jsx`, `src/lib/api.js` | **전 페이지** 영향 — 회귀 테스트 필수 |
| `backend/middleware/auth.js` | 보안 전역 — 신중히 |
| `backend/models/*` | 컨트롤러·프론트 필드 동기화 |
| `root-cloudflare/src/pages/Admin*.jsx`, `components/Admin*.jsx` | Admin 헤더 + requireAdmin 쌍 |
| 화면 · 기능 · 숫자 | README 장면 · 숫자도 함께 갱신 ([`docs/readme/README.md`](../../docs/readme/README.md)) |
| `tier-image/*` | 용량·파일명·경로 정규화 |
| `RDMD/*` | 문서만 — 런타임 영향 없음 |
| `ai-service/knowledge/*.md` | **AI 답이 바뀐다** — 사이트 규칙과 수치가 맞는지 확인 |
| `ai-service/app/*` | AI 서비스(별도 프로세스) — `pytest` 후 재시작 |
| `mcps/` | 도구 스키마 — 앱 런타임과 무관 |

---

## 기본 스모크 테스트

서버 기동 후:

1. `GET /health`  
2. 메인 → 티어1 → 헤더/푸터 표시  
3. 회원가입 또는 기존 로그인  
4. 커스텀 메이커 배치 → (가능 시) 업로드  
5. 관리자 로그인 → 공지 하나 작성 → 메인 미리보기  
6. 문의 작성 → 관리자 답변  
7. (AI 서비스를 띄웠다면) `/ai` → 추천 질문 클릭 → 답·출처 표시  

실패 시: [path-and-api.md](./path-and-api.md), [security.md](./security.md)

---

## 브랜치·원격 참고

현재 워크스페이스 상태는 git 상황에 따라 다를 수 있습니다.  
`master`가 `origin/master` 보다 뒤처져 있을 수 있으니 pull/rebase 전 로컬 문서 작업과 충돌 여부만 확인하세요.
