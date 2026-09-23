# Oracle Cloud 배포 가이드 (백엔드 + React 프론트 한 서버)

이 폴더의 스크립트로 **지금 로컬 코드**를 Oracle Cloud VM 한 대에 올린다.
Node 서버 하나가 API 와 React 빌드(`root-cloudflare/dist`)를 같이 서빙하므로(로컬 `:5000` 과 똑같은 구조) 코드 수정은 없다.

```
방문자 ──HTTPS──▶ Cloudflare(무료 DNS·프록시, 선택) ──HTTP──▶ Oracle VM: nginx :80 ──▶ Node(pm2) :5000 ──▶ MongoDB Atlas
```

| 파일 | 역할 |
|---|---|
| `deploy.sh` | 로컬(Git Bash)에서 실행 — VM 준비·`.env` 업로드·빌드/묶기/업로드/교체/재시작·상태·로그·롤백 |
| `setup-vm.sh` | VM 최초 1회 — Node 22 LTS, pm2, nginx, iptables 80/443 허용, 폴더 생성 |
| `ecosystem.config.js` | pm2 설정(프로세스 **1개만** — 스케줄러 중복 방지) |
| `nginx-human-bug-tier.conf` | 80 → 127.0.0.1:5000 프록시, 방문자 IP 전달 |

GitHub 에서 clone 하지 않는다 — 로컬 코드를 tar.gz 로 묶어 `scp` 로 올리므로 **푸시하지 않아도 배포된다**.
`.env`·`node_modules` 는 패키지에 절대 들어가지 않고(스크립트가 검사), 시크릿은 서버 `/opt/human-bug-tier/shared/.env` 에만 둔다.

---

## 1. Oracle Cloud 콘솔에서 할 일 (최초 1회)

1. **SSH 키 만들기** (로컬 Git Bash)
   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/oracle_hbt -C human-bug-tier
   ```
2. **인스턴스 만들기** — Compute → Instances → Create instance
   - Image: **Canonical Ubuntu 24.04** (또는 22.04)
   - Shape: **VM.Standard.A1.Flex** (Ampere, Always Free) — 1 OCPU / 6 GB 면 충분
     (재고 부족으로 안 만들어지면 리전을 바꾸거나 잠시 뒤 재시도. 대안: VM.Standard.E2.1.Micro(1 GB) — 이 경우 빌드는 로컬에서 하므로 가능은 하나 여유가 적음)
   - Networking: 공인 IPv4 자동 할당 켜기
   - SSH keys: `~/.ssh/oracle_hbt.pub` 내용 붙여넣기
3. **포트 열기** — 인스턴스의 VCN → Subnet → Security List → Ingress Rules 추가
   - `0.0.0.0/0` TCP **80**, `0.0.0.0/0` TCP **443** (22 는 기본으로 열려 있음)
   - VM 안쪽 방화벽(iptables)은 `setup-vm.sh` 가 연다 — **두 군데 다 열어야** 접속된다.
4. **MongoDB Atlas 허용 IP** — Atlas → Network Access 에 VM 의 **공인 IP** 추가
   (안 하면 서버가 떠도 `db: disconnected`)

## 2. 로컬에서 배포 (Git Bash, 레포 루트)

```bash
export OCI_HOST=ubuntu@<VM 공인 IP>
export OCI_KEY=~/.ssh/oracle_hbt

bash backend/deploy/oracle/deploy.sh setup    # 최초 1회: VM 준비
bash backend/deploy/oracle/deploy.sh env      # 최초 1회: backend/.env → 서버 shared/.env (내용 출력 안 함)
bash backend/deploy/oracle/deploy.sh deploy   # 배포(이후 업데이트도 이것만)
```

`deploy` 가 하는 일: 프론트 빌드 → 묶기(약 50 MB) → 업로드 → `releases/<시각>` 에 풀기 → `npm ci --omit=dev`
→ `current` 링크 교체 → `pm2 startOrReload` → `/health` 확인. 실패하면 `rollback` 으로 바로 전 버전 복귀.

기타: `status`(pm2·헬스) · `logs`(최근 로그 100줄) · `rollback` · `package`(업로드 없이 묶기만).

확인: 브라우저로 `http://<VM 공인 IP>/` , `http://<VM 공인 IP>/health`

## 3. 서버 `.env` 에서 바꿀 것

`env` 로 올린 뒤 서버에서 **APP_URL** 을 실제 접속 주소로 바꾼다(가입 인증·비번 재설정 메일 링크가 이 주소를 쓴다).

```bash
ssh -i ~/.ssh/oracle_hbt ubuntu@<IP> "sed -i 's#^APP_URL=.*#APP_URL=https://내도메인#' /opt/human-bug-tier/shared/.env"
bash backend/deploy/oracle/deploy.sh deploy   # 또는 서버에서 pm2 reload human-bug-tier --update-env
```

`PORT`·`NODE_ENV` 는 pm2 설정이 정한다(5000 / production). `JWT_SECRET` 은 운영용 긴 랜덤 값이어야 한다.

## 4. 도메인 + HTTPS (Cloudflare 무료)

1. Cloudflare DNS 에 `A  @  <VM 공인 IP>` (프록시 **주황 구름 켬**)
2. SSL/TLS 모드: 우선 **Flexible** 로 접속 확인 → 이후 Cloudflare **Origin Certificate** 를 VM nginx 443 에 붙이고 **Full (strict)** 로 올리는 것을 권장
3. 도메인 없이 IP 로만 쓸 거면 이 단계는 생략(HTTP 로만 동작)

## ⚠️ 운영 전에 꼭 알아둘 것

- **서버는 한 곳에서만 돌린다.** 이벤트 스케줄러·랜덤 뽑기 라운드·유튜브 동기화가 서버 프로세스 안에서 돈다.
  Oracle 서버가 뜬 뒤에도 로컬 `npm start` 를 **같은 Atlas DB** 로 켜 두면 스케줄러가 두 벌 돈다
  → 로컬 개발용은 별도 DB(개발용 MONGO_URI)를 쓰거나, 테스트할 때만 잠깐 켠다.
- pm2 `instances` 를 2 이상(cluster)으로 올리지 않는다 — 같은 이유.
- 방문자 IP(차단 기능)는 `x-forwarded-for` 맨 앞 값을 쓴다. Cloudflare 를 앞에 두면 정상 동작한다.
- 메일: Gmail SMTP(587)·Brevo·Resend(HTTPS) 모두 Oracle 에서 나간다(막히는 건 25 번 포트뿐).
