# 개발 환경 · 작업 흐름

## 권장 로컬 실행

```bash
cd backend
npm install
npm start          # 또는 npm run dev (nodemon)
```

브라우저: **http://localhost:5000/**

- 프론트 정적 파일 + `/api/*` 가 **같은 포트**  
- `getApiBase()` 가 빈 문자열 → 상대 경로로 API 호출 (배포와 동일)

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
| `common.js`, header/footer | **전 페이지** 영향 — 회귀 테스트 필수 |
| `backend/middleware/auth.js` | 보안 전역 — 신중히 |
| `backend/models/*` | 컨트롤러·프론트 필드 동기화 |
| `admin/*` | Admin 헤더 + requireAdmin 쌍 |
| `tier-image/*` | 용량·파일명·경로 정규화 |
| `RDMD/*` | 문서만 — 런타임 영향 없음 |
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

실패 시: [path-and-api.md](./path-and-api.md), [security.md](./security.md)

---

## 브랜치·원격 참고

현재 워크스페이스 상태는 git 상황에 따라 다를 수 있습니다.  
`master`가 `origin/master` 보다 뒤처져 있을 수 있으니 pull/rebase 전 로컬 문서 작업과 충돌 여부만 확인하세요.
