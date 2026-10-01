# Oracle Cloud 배포 가이드 (백엔드 + React 프론트 한 서버)

이 폴더의 스크립트로 **지금 로컬 코드**를 Oracle Cloud VM 한 대에 올린다.
Node 서버 하나가 API 와 React 빌드(`root-cloudflare/dist`)를 같이 서빙하므로(로컬 `:5000` 과 똑같은 구조) 코드 수정은 없다.

```
방문자 ──HTTPS──▶ Cloudflare Pages(human-bug-tier.com · human-bug-tier.pages.dev) ── /api/* 프록시 ──▶ 아래 Oracle 주소
Pages Function / 운영자 확인 ──HTTPS──▶ Oracle VM(hbt-tier.duckdns.org): nginx :443(Let's Encrypt) ──▶ Node(pm2) :5000 ──▶ MongoDB Atlas
```

> **주소 정리 (2026-09-29~)**: 회원이 쓰는 정식 주소는 **`https://human-bug-tier.com`**(Cloudflare Pages 에 연결된 도메인)이고, 서버 `.env` 의 `APP_URL`(인증·재설정 메일 링크)도 이 주소다. `https://hbt-tier.duckdns.org` 는 Oracle 서버 직접 주소로, Pages Function 이 `/api/*` 를 넘기는 대상이자 서버 `/health` 확인용이다(Pages 는 `/api/*` 만 넘기므로 `human-bug-tier.com/health` 는 화면 HTML 이 나온다). 회원에게 duckdns 주소를 안내하지 않는다 — 일부 보안 프로그램·확장이 `*.duckdns.org` 를 차단한다.

## 지금 운영 중인 서버 (2026-09-28 배포)

| 항목 | 값 |
|---|---|
| 주소 | 서버 직접 **https://hbt-tier.duckdns.org/** (헬스: `/health`) — 회원용 정식 주소는 `https://human-bug-tier.com` |
| VM | 공인 IP `161.33.190.199`, Ubuntu 24.04, VM.Standard.E2.1.Micro(1 GB, x86_64) + 스왑 2 GB |
| SSH | `ssh -i ~/.ssh/oracle_hbt_rsa ubuntu@161.33.190.199` (Oracle 콘솔에서 받은 RSA 키 `ssh-key-2026-09-27.key` 를 복사해 둔 것) |
| 도메인 | DuckDNS 무료 서브도메인 `hbt-tier.duckdns.org` → A `161.33.190.199` |
| HTTPS | Let's Encrypt(certbot, nginx 플러그인). 자동 갱신 `certbot.timer`. http → https 301 |
| 서버 `APP_URL` | `https://human-bug-tier.com` (2026-09-29 변경, 그 전 `https://hbt-tier.duckdns.org`) |
| 버전 | Node 22, pm2 7, nginx 1.24, certbot 2.9 |

certbot 이 nginx 설정의 `server_name` 을 도메인으로 바꾸고 443 블록을 추가했기 때문에,
**`http://161.33.190.199/`(IP 직접 접속)는 404** 가 난다. 항상 도메인으로 접속한다.
Cloudflare Pages 프론트가 이 서버를 쓰는 구조는 [`CLOUDFLARE.md`](../../../CLOUDFLARE.md) 참고.

| 파일 | 역할 |
|---|---|
| `deploy.sh` | 로컬(Git Bash)에서 실행 — VM 준비·`.env` 업로드·빌드/묶기/업로드/교체/재시작·상태·로그·롤백 |
| `setup-vm.sh` | VM 최초 1회 — 스왑 2 GB, Node 22 LTS, pm2, nginx, iptables 80/443 허용, 폴더 생성 |
| `ecosystem.config.js` | pm2 설정(프로세스 **1개만** — 스케줄러 중복 방지) |
| `nginx-human-bug-tier.conf` | 80 → 127.0.0.1:5000 프록시, 방문자 IP 전달 (HTTPS 설정은 서버에서 certbot 이 덧붙임 — 4절) |

GitHub 에서 clone 하지 않는다 — 로컬 코드를 tar.gz 로 묶어 `scp` 로 올리므로 **푸시하지 않아도 배포된다**.
`.env`·`node_modules` 는 패키지에 절대 들어가지 않고(스크립트가 검사), 시크릿은 서버 `/opt/human-bug-tier/shared/.env` 에만 둔다.

---

## 1. Oracle Cloud 콘솔에서 할 일 (최초 1회)

1. **SSH 키 만들기** (로컬 Git Bash)
   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/oracle_hbt -C human-bug-tier
   ```
   또는 인스턴스 만들 때 콘솔의 **Generate a key pair for me** 로 받은 키를 쓴다(지금 서버가 이 방식).
   받은 개인 키를 `~/.ssh/` 로 복사하고 권한을 줄인다: `cp ssh-key-*.key ~/.ssh/oracle_hbt_rsa && chmod 600 ~/.ssh/oracle_hbt_rsa`
2. **인스턴스 만들기** — Compute → Instances → Create instance
   - Image: **Canonical Ubuntu 24.04** (또는 22.04)
   - Shape: **VM.Standard.A1.Flex** (Ampere, Always Free) — 1 OCPU / 6 GB 면 충분
     (재고 부족으로 안 만들어지면 리전을 바꾸거나 잠시 뒤 재시도. 대안: VM.Standard.E2.1.Micro(1 GB) — 이 경우 빌드는 로컬에서 하므로 가능은 하나 여유가 적음.
     지금 서버가 E2.1.Micro 이며, `setup-vm.sh` 가 스왑 2 GB 를 만들어 `npm ci` 가 메모리 부족으로 죽지 않게 한다)
   - Networking: 공인 IPv4 자동 할당 켜기
   - SSH keys: `~/.ssh/oracle_hbt.pub` 내용 붙여넣기
3. **포트 열기** — 인스턴스의 VCN → Subnet → Security List → Ingress Rules 추가
   - `0.0.0.0/0` TCP **80**, `0.0.0.0/0` TCP **443** (22 는 기본으로 열려 있음)
   - VM 안쪽 방화벽(iptables)은 `setup-vm.sh` 가 연다 — **두 군데 다 열어야** 접속된다.
     (Oracle Ubuntu 이미지는 INPUT 체인에 REJECT 규칙이 있고 줄 번호가 이미지마다 다르다. 스크립트는 REJECT 줄을 찾아 그 **앞**에 허용 규칙을 넣는다.
     확인: `sudo iptables -L INPUT -n --line-numbers` 에서 80/443 ACCEPT 가 REJECT 보다 위에 있어야 한다)
   - 콘솔 쪽을 안 열면 외부 접속이 **타임아웃**, 서버 안 `curl http://127.0.0.1/` 은 200 이 나온다.
4. **MongoDB Atlas 허용 IP** — Atlas → Network Access 에 VM 의 **공인 IP** 추가
   (안 하면 서버가 떠도 `db: disconnected`)

## 2. 로컬에서 배포 (Git Bash, 레포 루트)

```bash
export OCI_HOST=ubuntu@<VM 공인 IP>      # 지금 서버: ubuntu@161.33.190.199
export OCI_KEY=~/.ssh/oracle_hbt         # 지금 서버: ~/.ssh/oracle_hbt_rsa

bash backend/deploy/oracle/deploy.sh setup    # 최초 1회: VM 준비
bash backend/deploy/oracle/deploy.sh env      # 최초 1회: backend/.env → 서버 shared/.env (내용 출력 안 함)
bash backend/deploy/oracle/deploy.sh deploy   # 배포(이후 업데이트도 이것만)
```

`deploy` 가 하는 일: 프론트 빌드 → 묶기(약 50 MB) → 업로드 → `releases/<시각>` 에 풀기 → `npm ci --omit=dev`
→ `current` 링크 교체 → `pm2 startOrReload` → `/health` 확인. 실패하면 `rollback` 으로 바로 전 버전 복귀.

기타: `status`(pm2·헬스) · `logs`(최근 로그 100줄) · `rollback` · `package`(업로드 없이 묶기만).

확인: 브라우저로 `http://<VM 공인 IP>/` , `http://<VM 공인 IP>/health` (4절 HTTPS 를 붙인 뒤에는 `https://<도메인>/`, `https://<도메인>/health`)

> ⚠️ `setup` 은 레포의 `nginx-human-bug-tier.conf`(HTTP 전용)로 서버 nginx 설정을 **덮어쓴다**.
> HTTPS 를 붙인 서버에서 `setup` 을 다시 돌렸다면 `sudo certbot --nginx -d <도메인> --redirect` 를 다시 실행한다.
> 평소 업데이트인 `deploy` 는 nginx 를 건드리지 않는다.

## 3. 서버 `.env` 에서 바꿀 것

`env` 로 올린 뒤 서버에서 **APP_URL** 을 실제 접속 주소로 바꾼다(가입 인증·비번 재설정 메일 링크가 이 주소를 쓴다).

```bash
ssh -i ~/.ssh/oracle_hbt ubuntu@<IP> "sed -i 's#^APP_URL=.*#APP_URL=https://내도메인#' /opt/human-bug-tier/shared/.env"
bash backend/deploy/oracle/deploy.sh deploy   # 또는 서버에서 pm2 reload human-bug-tier --update-env
```

`PORT`·`NODE_ENV` 는 pm2 설정이 정한다(5000 / production). `JWT_SECRET` 은 운영용 긴 랜덤 값이어야 한다.

## 4. 도메인 + HTTPS

### 4-A. Let's Encrypt (지금 서버가 쓰는 방식)

1. 도메인 A 레코드를 VM 공인 IP 로. 도메인이 없으면 https://www.duckdns.org 에서 무료 서브도메인을 만들고 `current ip` 에 VM IP 를 넣는다.
   Cloudflare DNS 를 쓴다면 발급할 때는 **회색 구름(DNS only)** 으로 둔다.
2. 서버에서 발급(이메일 없이 등록):
   ```bash
   sudo apt-get install -y certbot python3-certbot-nginx
   sudo sed -i "s/server_name _;/server_name <도메인>;/" /etc/nginx/sites-available/human-bug-tier
   sudo nginx -t && sudo systemctl reload nginx
   sudo certbot --nginx -d <도메인> --non-interactive --agree-tos --register-unsafely-without-email --redirect
   sudo certbot renew --dry-run      # 자동 갱신 점검
   ```
3. 3절대로 `APP_URL` 을 `https://<도메인>` 으로 바꾸고 `pm2 reload human-bug-tier --update-env`.

인증서는 90일짜리이고 `certbot.timer` 가 하루 두 번 확인해 만료 30일 전부터 갱신한다.

### 4-B. Cloudflare 프록시 (대안)

1. Cloudflare DNS 에 `A  @  <VM 공인 IP>` (프록시 **주황 구름 켬**)
2. SSL/TLS 모드: 우선 **Flexible** 로 접속 확인 → 이후 Cloudflare **Origin Certificate** 를 VM nginx 443 에 붙이고 **Full (strict)** 로 올리는 것을 권장
3. 도메인 없이 IP 로만 쓸 거면 이 단계는 생략(HTTP 로만 동작)

## ⚠️ 운영 전에 꼭 알아둘 것

- **서버는 한 곳에서만 돌린다.** 이벤트 스케줄러·랜덤 뽑기 라운드·유튜브 동기화가 서버 프로세스 안에서 돈다.
  Oracle 서버가 뜬 뒤에도 로컬 `npm start` 를 **같은 Atlas DB** 로 켜 두면 스케줄러가 두 벌 돈다
  → 로컬 개발용은 별도 DB(개발용 MONGO_URI)를 쓰거나, 테스트할 때만 잠깐 켠다.
- pm2 `instances` 를 2 이상(cluster)으로 올리지 않는다 — 같은 이유.
- 방문자 IP(차단 기능)는 `x-forwarded-for` 맨 앞 값을 쓴다. Cloudflare 를 앞에 두면 정상 동작한다.
  Cloudflare Pages 를 거쳐 오는 `/api` 요청은 Pages Function 이 `cf-connecting-ip` 로 이 값을 채운다.
- 메일: Gmail SMTP(587)·Brevo·Resend(HTTPS) 모두 Oracle 에서 나간다(막히는 건 25 번 포트뿐).
