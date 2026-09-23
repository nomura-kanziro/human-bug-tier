---
area: backend
---

# 커밋 요약 — Oracle Cloud 배포 준비(스크립트·설정·가이드)

## 요청

> oracle cloud MCP 연결도 됐는데 배포 가능하면 커넥터 시키고, 백엔드 배포하기 위한 준비를 전부 마치고 나서 oracle cloud 에 배포를 해봐.

## 결과

- **배포 준비는 완료**: `backend/deploy/oracle/` 에 스크립트·설정·가이드.
- **실제 배포는 못 함**: 이 작업 세션에는 Oracle Cloud MCP 도구가 로드되지 않았고(도구 검색·MCP 설정·리소스 목록 어디에도 없음),
  OCI CLI·`~/.oci` 인증 정보·VM SSH 키도 없어 Oracle 계정에 접근할 방법이 없었다.
  MCP 가 이 세션에 붙거나(세션 재시작 필요할 수 있음) VM 의 IP·SSH 키가 생기면 `deploy.sh` 로 바로 배포할 수 있다.

## 구성

Node 서버 하나가 API + React 빌드(`root-cloudflare/dist`)를 같이 서빙(로컬 `:5000` 과 동일) → **코드 수정 없음**.
`방문자 → (Cloudflare 무료 DNS/HTTPS, 선택) → nginx :80 → pm2 Node :5000 → MongoDB Atlas`

| 파일 | 역할 |
|---|---|
| `deploy.sh` | 로컬 실행: `setup`(VM 준비) · `env`(.env 업로드, 내용 출력 안 함) · `deploy`(빌드→묶기→업로드→릴리스 교체→pm2 재시작→/health) · `status` · `logs` · `rollback` · `package` |
| `setup-vm.sh` | VM 1회: Node 22 LTS·pm2·nginx, Oracle Ubuntu 이미지의 iptables 80/443 허용, `/opt/human-bug-tier/{releases,shared}` |
| `ecosystem.config.js` | pm2 — 프로세스 1개(fork). 스케줄러가 프로세스 안에서 돌아 cluster 금지 |
| `nginx-human-bug-tier.conf` | 80 → 127.0.0.1:5000, x-forwarded-for 전달(차단 기능의 방문자 IP) |
| `README.md` | 콘솔 작업(인스턴스·보안 목록·Atlas 허용 IP)부터 도메인/HTTPS·주의사항까지 |

설계 포인트:

- **GitHub clone 이 아니라 로컬 코드를 tar.gz 로 묶어 scp** — 원격 저장소가 로컬보다 94 커밋 뒤처져 있고 "푸시 금지" 상태라, clone 방식이면 옛 버전이 올라간다.
- 패키지: `backend`(node_modules·.env·deploy 제외) + `root-cloudflare/dist` + `root-cloudflare/src/data/tiers.json`(백엔드 tierCatalog 가 직접 읽음). 묶은 뒤 `.env`·`node_modules` 가 섞였는지 검사하고 섞이면 중단.
- 시크릿은 서버 `shared/.env` 에만 두고 각 릴리스 `backend/.env` 로 링크. 릴리스는 최근 3개만 유지, `current` 링크 교체로 무중단에 가깝게 전환, 실패 시 `rollback`.
- `.deploy-out/`(로컬 패키지 출력) `.gitignore` 추가.

## 확인(로컬에서 서버 흉내)

`deploy.sh package` → 49 MB, `.env`/`node_modules`/deploy 폴더 미포함 확인 →
임시 폴더에 풀고 `npm ci --omit=dev`(103 패키지) → 로컬 서버를 멈춘 상태에서(스케줄러 중복 방지) 5055 포트로 실행:
`/health` ok·db connected·메일 설정 인식, `/`·`/tier/1`·`/custom-maker`·`/event`·`/admin`(SPA 폴백) 200,
JS 번들·manifest·캐릭터 이미지(webp) 200, `/api/tierlists`·`/api/events/*`·`/api/notices` 200.
테스트 후 임시 폴더(.env 사본 포함) 삭제, 로컬 서버 원상 복구.

`setup-vm.sh`·`deploy.sh` 의 VM 쪽 동작(apt·iptables·pm2·nginx)은 실제 VM 이 없어 **문법 검사(bash -n)까지만** 했다.

## 운영 주의

- Oracle 서버가 뜬 뒤 로컬 서버를 **같은 Atlas DB** 로 켜 두면 스케줄러(이벤트·랜덤 뽑기·유튜브 동기화)가 두 벌 돈다 → 로컬은 개발용 DB 권장.
- Atlas Network Access 에 VM 공인 IP 추가 필요. 서버 `.env` 의 `APP_URL` 을 실제 주소로.
