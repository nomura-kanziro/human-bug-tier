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
for port in 80 443; do
  if ! sudo iptables -C INPUT -p tcp --dport "$port" -m state --state NEW -j ACCEPT 2>/dev/null; then
    sudo iptables -I INPUT 6 -p tcp --dport "$port" -m state --state NEW -j ACCEPT
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
