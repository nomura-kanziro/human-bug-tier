# 05. ai-service Oracle 저장(통계·대화 원문)과 새 Oracle VM 전환 기록

> 날짜: 2026-11-11 · 작성: nomura

## 한 줄 요약

ai-service 가 Oracle Autonomous DB 에 **사용 통계**와 **대화 원문**을 저장할 수 있게 했다(둘 다 기본 꺼짐). 그리고 사이트 전체를 새 Oracle VM(`158.101.145.56`, A1.Flex 4코어/24GB)으로 옮겼다.

## 저장 스위치 (`ai-service/.env`, 서버는 `shared/ai.env`)

| 변수 | 기본 | 뜻 |
|---|---|---|
| `AI_STORE_STATS` | false | 질문 수·답변 방식·응답 시간 같은 **통계만** `HBT_CHAT_STAT` 에 저장(질문·답변 내용 없음) |
| `AI_STORE_CHAT` | false | 질문·답변 **원문**을 `HBT_CHAT_LOG` 에 저장. 켜기 전에 `/ai` 화면·개인정보 안내의 "대화를 저장하지 않습니다" 문구를 먼저 고친다 |
| `AI_CHAT_RETENTION_DAYS` | 30 | 원문 보관 일수. 지나면 저장소가 자동 삭제(최대 1시간 간격) |

`ORACLE_USER`/`ORACLE_PASSWORD`/`ORACLE_DSN` 이 비어 있으면 스위치가 켜져 있어도 저장하지 않는다. 저장은 응답을 늦추지 않게 뒤 스레드에서 하고, 실패해도 답변에는 영향이 없다.

## 테이블 (DDL 은 `models/chat_stat.py`·`chat_log.py`)

- `HBT_CHAT_STAT`: id, created_at, answer_mode, ai, provider, question_len, source_count, character_count, latency_ms
- `HBT_CHAT_LOG`: id, created_at, expires_at, answer_mode, question, answer(CLOB). 회원 ID·IP 는 담지 않는다
- 컬럼 이름 `mode` 는 Oracle 예약어(ORA-03050)라 `answer_mode` 를 쓴다 — 실제 DB 에 붙여 보고서야 드러난 문제라 가짜 연결 테스트로는 못 잡는다
- 테이블 만들기: `python scripts/init_oracle.py`(서버는 `deploy.sh ai-oracle`, `--check` 는 연결만). 이미 있는 테이블은 건드리지 않는다

## 배포 스크립트 (`backend/deploy/oracle/deploy.sh`)

- `ai-wallet <zip>`: Autonomous DB 지갑을 서버 `shared/oracle-wallet` 에 풀고 `ORACLE_WALLET_DIR` 설정
- `oracle-pass`: DB 비밀번호를 터미널 **숨김 입력**으로 받아 ssh 표준입력으로 서버 `shared/.env`·`ai.env` 에 넣는다(화면·명령줄·기록에 남지 않음)
- `ai-oracle [--check]`: 서버에서 연결 확인 + 테이블 생성
- 패키지에 `ai-service/scripts/init_oracle.py` 가 포함되도록 제외 규칙을 고쳤다(`scripts/` 통째 제외 → 나머지 3개만 제외)
- `requirements-prod.txt` 에 `oracledb` 추가

## 새 VM 전환 (2026-11-11)

1. 새 VM 준비: Node 22·pm2·nginx·iptables(`deploy.sh setup`), 파이썬 venv(`ai-setup`)
2. Ollama 0.40.16(arm64, systemd 서비스 127.0.0.1:11434), 모델 `bge-m3`·`gemma4:e4b`(CPU 약 6토큰/초, 답 하나 30~40초). 서버 설정: `AI_LLM_PROVIDER=ollama`, `OLLAMA_MODEL=gemma4:e4b`, `AI_MAX_TOKENS=400`, 벡터 검색은 끔
3. 기존 서버에서 지갑·`shared/.env` 를 복사하고, PC 의 `ORACLE_*` 만 덧붙임 → `deploy.sh deploy`
4. 기존 서버 백엔드는 `pm2 stop`(스케줄러 중복 방지). DuckDNS `hbt-tier` → 새 IP, certbot(Let's Encrypt, 자동 갱신)
5. Autonomous DB 접근 제어(ACL)에 새 VM IP 추가. DB 에는 `HBT_APP` 계정이 아예 없었다(처음 ORA-01017 의 원인). 먼저 `ADMIN` 비밀번호를 새로 정해 서버를 `ADMIN` 으로 연결해 테이블을 만들었고, 같은 날 최소 권한 앱 계정 `HBT_APP` 으로 옮겼다
6. `HBT_APP` 생성: ADMIN 으로 접속해 무작위 24자 비밀번호로 `CREATE USER`, 권한은 `CREATE SESSION`·`CREATE TABLE`·`CREATE SEQUENCE` 만(IDENTITY 컬럼에 CREATE SEQUENCE 가 필요 — 없으면 ORA-01031). 비밀번호는 서버 `shared/.env`·`ai.env` 에만 있고 출력·기록하지 않았다. 서버 `ORACLE_USER=HBT_APP`. 테이블(`HBT_CHAT_STAT`·`HBT_CHAT_LOG`·`HBT_SAMPLE`)은 `HBT_APP` 소유로 다시 만들었다
7. 옛 서버(161.33.190.199): pm2 앱 삭제, nginx 중지·자동 시작 해제, certbot 갱신 해제, 배포 코드(releases) 삭제. 비밀 백업(`shared/.env`·지갑)은 남겨 뒀다
8. `ship.local.env` 를 새 VM 으로 변경, 사이트 버전 `SITE_VERSION` 1.0.5 → 1.1.0

## 확인한 것

- `GET /api/db-health` `ok:true`, `/api/db-sample` 정상, AI `/health` 에 `oracle: {configured:true, stats:true, chat:false}`
- 실제 질문 1건 → `HBT_CHAT_STAT` 에 행 1개(llm, 출처 3, 36291ms), `HBT_CHAT_LOG` 는 0행
- pytest 51개 통과(Oracle 저장 테스트 7개는 가짜 연결)

## 남은 일 · 주의

- `ADMIN` 스키마에 처음 만든 테스트 테이블 3개(`ADMIN.HBT_CHAT_STAT`·`HBT_CHAT_LOG`·`HBT_SAMPLE`)는 콘솔 Database Actions SQL 에서 `DROP TABLE … PURGE` 로 지웠다. 지금 `HBT_*` 테이블은 `HBT_APP` 소유 3개뿐이다
- `deploy.sh oracle-grant`: ADMIN 비밀번호를 숨김 입력으로 받아 `HBT_APP` 에 `CREATE SEQUENCE` 를 주는 명령(이번에는 콘솔 Database Actions 에서 같은 GRANT 를 실행했다)
- 같은 Atlas DB 로 두 서버 백엔드를 동시에 켜지 않는다(랜덤 뽑기·이벤트 스케줄러 중복). 옛 서버(`161.33.190.199`)는 서비스를 모두 멈추고 정리했다
- `ship.sh` 는 `ship.local.env`(git 무시 대상)의 `OCI_HOST`·`OCI_KEY` 를 읽는다 — 지금은 새 VM(`158.101.145.56`, 키 `~/.ssh/oracle_hbt_rsa`)
- 답변이 느리면 `AI_LLM_PROVIDER=anthropic` 으로 바꾸는 방법이 있다
