# 04. 운영 서버(Oracle VM) 배포 준비 — 가벼운 설치 · 배포 스크립트 확장

> 2026-11-05 · 서버에는 **아직 올리지 않았다**(스크립트·문서·테스트까지). 올리는 것은 창시자가 `deploy.sh` 를 실행할 때다.

## 요청

> ai 서비스 서버도 베포할 껀데 혹시 베포 조건이 갖춰졌는지 확인하고 아니면 바로 작업 좀 해줘

## 확인한 조건 (운영 VM `ubuntu@161.33.190.199`, 읽기 전용으로만 봄)

| 항목 | 상태 | 판단 |
|---|---|---|
| OS · CPU | Ubuntu 24.04, x86_64, 2코어 | 가능 |
| 메모리 | 954MB 중 사용 505MB · 가용 448MB, 스왑 2GB | **빠듯함** — 가벼운 설치 필요 |
| 디스크 | 48GB 중 5.9GB 사용 | 가능 |
| Python | 3.12.3 (`venv` 있음, **`pip` 없음**) | `python3-venv`·`python3-pip` 설치 필요 |
| pm2 | 백엔드 `human-bug-tier` 하나(약 107MB) | `hbt-ai` 추가 필요 |
| 서버 env | AI 관련 키 없음 | `ai-env` 로 생성 필요 |
| 배포 스크립트 | ai-service 를 묶지 않음 | **확장 필요** |
| 포트 | 외부는 80·443 만 | 8000 은 열지 않는다(그대로 유지) |

**부족했던 것**: ① 스크립트가 ai-service 를 안 올림 ② 서버에 pip·가상환경·pm2 항목·env 없음 ③ 시작할 때 `chromadb`·`langchain_ollama` 를 무조건 불러와, 벡터 검색을 끄고 써도 무거운 패키지를 다 설치해야 했음.

## 바꾼 것

1. **지연 import** — `database/chroma.py`(`import chromadb`)와 `service/embeddings.py`(`OllamaEmbeddings`)를 쓰는 순간에 불러온다. 벡터를 끈 서버에는 이 패키지가 없어도 뜬다. 벡터를 켰는데 `chromadb` 가 없으면 예외 없이 BM25 로 내려간다(기존 처리 그대로).
2. **`requirements-prod.txt`** — `chromadb`·`oracledb`·`pytest`·`httpx` 를 뺀 운영 설치 목록(버전은 `requirements.txt` 와 같음). Linux x86_64 · Python 3.12 용 휠이 54개(약 33MB) 전부 있는 것을 `pip download --platform ...` 으로 확인했다.
3. **`deploy.sh`** — `ai-setup`(가상환경) · `ai-env`(`shared/ai.env` 생성 + `AI_SERVICE_KEY` 를 backend 와 같은 값으로, 값은 출력 안 함) 추가. `deploy` 는 `shared/ai.env` 가 있을 때만 ai-service 를 묶어 올리고, 의존성은 **링크 교체 전에** 설치하며(실패하면 사이트는 옛 버전 그대로), 끝에서 AI `/health` 와 메모리를 보여 준다. `status`·`logs ai`·`rollback` 도 AI 를 다룬다. 묶을 때 `.venv`·`data`·`.env*`·`tests`·`scripts`·개발용 pid 는 뺀다.
4. **`ecosystem.config.js`** — `hbt-ai`(`python -m uvicorn ... --host 127.0.0.1 --port 8000`, 메모리 300M 초과 시 재시작) 추가. 가상환경은 릴리스 밖 `shared/ai-venv/` 에 두어 의존성이 바뀔 때만 다시 설치한다.
5. **`ai-service/.env.production.example`** — 운영용 설정 템플릿(키 값 없음).
6. 문서: `ai-service/README.md`, `features/ai-service.md`, `guides/deploy-checklist.md`, `backend/deploy/oracle/README.md`, `.Agents` 의 `ai-service` 스킬(12개 에이전트 폴더 복제).

## 확인 (서버에는 아무것도 보내지 않음)

- `ai-service` 테스트 **44개 통과**(새로 2개: ① 새 프로세스에서 앱을 띄워도 `chromadb`·`langchain_ollama` 가 불러와지지 않음 ② 벡터를 켰는데 `chromadb` 가 없어도 BM25 로 답함).
- `deploy.sh package` 로 실제 묶음을 만들어 내용물을 검사했다: ai-service 71개 파일, `.env`·`.venv`·`data`·`tests`·`__pycache__` 없음. (개발용 `.dev_service-8000.pid` 가 섞여 있어 제외 규칙을 더했다.)
- 그 묶음을 **풀어서 그대로 띄워** 확인: `/health` OK(문서 469조각·캐릭터 338명), 키 없음/틀림 → 401, 정상 키 → 200, "긴다 에이카쿠는 몇 티어야?" → "2티어 무급 1번째"(새 티어 데이터 반영). 상주 메모리 **약 91MB**(Windows 작업 집합 기준 — 서버 수치는 배포 후 `status` 로 다시 봐야 한다).
- `bash -n deploy.sh` 문법 OK, `ecosystem.config.js` 로드 OK(앱 2개).

## 알려진 한계

- **서버에서 실제로 돌려 보지 못했다.** `pip install` 의 실제 소요 시간과 `hbt-ai` 의 서버 메모리는 첫 배포 때 확인해야 한다(1GB VM 이라 설치 중 일시적으로 스왑을 쓸 수 있다).
- **BM25 만 쓰므로** 말을 바꿔 묻는 질문의 정확도는 벡터 검색을 켠 로컬보다 낮다. 실측 7개 질문 중 6개는 1순위가 정답이었고, "출석체크가 뭐야?"는 정답 절이 2·3순위에 함께 나왔다(1순위는 같은 문서의 알림 절 — 문서 제목에 "출석체크"가 들어 있어서).
- `none` 이면 화면 상단에 "AI 서버 OFF 상태" 안내가 항상 뜬다. 문서 답은 정상 동작이다.
- 실제 Claude 키로 `anthropic` 을 켠 답 품질은 확인하지 못했다.
- nginx `proxy_read_timeout` 이 60초라, 느린 원격 Ollama 를 쓰면 긴 답이 끊길 수 있다.

## 수동 테스트 (배포 후)

1. `deploy.sh status` → AI `/health` 의 `"provider"`, 메모리 여유
2. 서버 밖에서 `http://161.33.190.199:8000` 이 **열리지 않는지**
3. 사이트 `/ai` 에서 "출석체크가 뭐야?" · "긴다 에이카쿠는 몇 티어야?" 질문 → 답이 오는지, 상단 안내가 설정과 맞는지
4. 사이트 다른 기능(로그인·게시판)이 그대로인지
5. 문제가 생기면 `deploy.sh logs ai` → 안 풀리면 `rollback`
