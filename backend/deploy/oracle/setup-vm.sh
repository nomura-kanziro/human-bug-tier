#!/usr/bin/env bash
# ======================================================================
# Oracle Cloud VM 최초 1회 준비 (Ubuntu 22.04 / 24.04 이미지 기준)
# 로컬에서 `bash deploy.sh setup` 을 실행하면 이 파일을 VM 에 올려 실행한다(직접 실행해도 됨).
#   - Node.js 22 LTS, pm2, nginx 설치
#   - Oracle Ubuntu 이미지의 iptables 가 80/443 을 막고 있어 허용 규칙 추가(콘솔 보안 목록과 별개로 필요)
#   - /opt/human-bug-tier/{releases,shared} 폴더 생성
#   - nginx 사이트 설정 설치, pm2 부팅 자동 시작 등록
# ======================================================================
set -euo pipefail

APP_DIR=/opt/human-bug-tier
RUN_USER="${SUDO_USER:-$(whoami)}"
HERE="$(cd "$(dirname "$0")" && pwd)"

echo "== 스왑 2GB (메모리 1GB 인 E2.1.Micro 에서 npm ci 가 메모리 부족으로 죽지 않게) =="
if ! swapon --show | grep -q /swapfile; then
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile >/dev/null
  sudo swapon /swapfile
  grep -q /swapfile /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
fi

echo "== 패키지 설치 =="
sudo apt-get update -y
# iptables-persistent 는 설치 중 "현재 규칙 저장할까요?" 창을 띄우므로 비대화형으로 설치한다
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y curl ca-certificates nginx tar gzip iptables-persistent netfilter-persistent

if ! command -v node >/dev/null 2>&1 || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 20 ]; then
  echo "== Node.js 22 LTS 설치 =="
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
node -v
npm -v

if ! command -v pm2 >/dev/null 2>&1; then
  echo "== pm2 설치 =="
  sudo npm install -g pm2
fi

echo "== 방화벽(iptables) 80/443 허용 =="
# Oracle 이 제공하는 Ubuntu 이미지는 INPUT 체인 끝에 REJECT 규칙이 있어 22 번 외에는 막혀 있다.
# REJECT 의 줄 번호는 이미지마다 달라서(예: 5번) 고정 번호 대신 REJECT 줄을 찾아 그 바로 앞에 넣는다.
for port in 80 443; do
  if ! sudo iptables -C INPUT -p tcp --dport "$port" -m state --state NEW -j ACCEPT 2>/dev/null; then
    REJECT_LINE="$(sudo iptables -L INPUT -n --line-numbers | awk '$2=="REJECT"{print $1; exit}')"
    sudo iptables -I INPUT "${REJECT_LINE:-1}" -p tcp --dport "$port" -m state --state NEW -j ACCEPT
  fi
done
sudo netfilter-persistent save

echo "== 앱 폴더 =="
sudo mkdir -p "$APP_DIR/releases" "$APP_DIR/shared"
sudo chown -R "$RUN_USER":"$RUN_USER" "$APP_DIR"

echo "== nginx 설정 =="
if [ -f "$HERE/nginx-human-bug-tier.conf" ]; then
  sudo cp "$HERE/nginx-human-bug-tier.conf" /etc/nginx/sites-available/human-bug-tier
  sudo ln -sf /etc/nginx/sites-available/human-bug-tier /etc/nginx/sites-enabled/human-bug-tier
  sudo rm -f /etc/nginx/sites-enabled/default
  sudo nginx -t
  sudo systemctl enable --now nginx
  sudo systemctl reload nginx
fi

echo "== pm2 부팅 자동 시작 등록 =="
sudo env PATH="$PATH" pm2 startup systemd -u "$RUN_USER" --hp "$(eval echo ~"$RUN_USER")" >/dev/null

if [ ! -f "$APP_DIR/shared/.env" ]; then
  echo
  echo "※ $APP_DIR/shared/.env 가 아직 없습니다."
  echo "   로컬에서 bash deploy.sh env 로 올리거나, 서버에서 직접 만들어 주세요(backend/.env.example 참고)."
fi
echo
echo "VM 준비 완료."
