#!/usr/bin/env bash
# ======================================================================
# Oracle Cloud 배포 스크립트 — 로컬 PC(Git Bash)에서 실행한다.
#
# GitHub 에서 clone 하지 않고 "지금 로컬 코드"를 묶어서 올린다(원격 저장소와 로컬이 달라도 로컬 기준으로 배포됨).
#
# 사용법 (레포 어디서든):
#   export OCI_HOST=ubuntu@<VM 공인 IP>
#   export OCI_KEY=~/.ssh/oracle_hbt        # VM 만들 때 등록한 SSH 개인 키
#
#   bash backend/deploy/oracle/deploy.sh setup     # 최초 1회: VM 에 Node·pm2·nginx·방화벽 준비
#   bash backend/deploy/oracle/deploy.sh env       # 최초 1회(또는 .env 바꿀 때): backend/.env 를 서버로 복사
#   bash backend/deploy/oracle/deploy.sh deploy    # 빌드 → 묶기 → 업로드 → 교체 → 재시작 → 헬스 체크
#   bash backend/deploy/oracle/deploy.sh package   # 묶기만(업로드 없이 로컬에 tar.gz 생성 — 점검용)
#   bash backend/deploy/oracle/deploy.sh status    # 서버 pm2 상태 + /health
#   bash backend/deploy/oracle/deploy.sh logs      # 서버 로그 최근 100줄
#   bash backend/deploy/oracle/deploy.sh rollback  # 바로 전 릴리스로 되돌리기
#
# 서버 구조:
#   /opt/human-bug-tier/releases/<시각>/   ← 배포본(backend + root-cloudflare/dist + tiers.json)
#   /opt/human-bug-tier/current           ← 지금 쓰는 릴리스를 가리키는 링크
#   /opt/human-bug-tier/shared/.env        ← 시크릿(배포본에는 절대 넣지 않음, 각 릴리스 backend/.env 로 링크)
# ======================================================================
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../../.." && pwd)"
APP_DIR=/opt/human-bug-tier
KEEP_RELEASES=3
CMD="${1:-}"

need_host() {
  if [ -z "${OCI_HOST:-}" ]; then
    echo "OCI_HOST 가 비어 있습니다. 예) export OCI_HOST=ubuntu@123.45.67.89" >&2
    exit 1
  fi
  SSH_OPTS=(-o StrictHostKeyChecking=accept-new -o ServerAliveInterval=30)
  if [ -n "${OCI_KEY:-}" ]; then SSH_OPTS+=(-i "$OCI_KEY"); fi
}
rssh() { ssh "${SSH_OPTS[@]}" "$OCI_HOST" "$@"; }
rscp() { scp "${SSH_OPTS[@]}" "$@"; }

make_package() {
  echo "== 프론트 빌드 (root-cloudflare → dist) =="
  (cd "$REPO/root-cloudflare" && npm run build >/dev/null)
  [ -f "$REPO/root-cloudflare/dist/index.html" ] || { echo "dist 빌드 실패" >&2; exit 1; }

  STAMP="$(date +%Y%m%d-%H%M%S)"
  REV="$(git -C "$REPO" rev-parse --short HEAD 2>/dev/null || echo nogit)"
  DIRTY="$(git -C "$REPO" status --porcelain 2>/dev/null | grep -q . && echo '-dirty' || true)"
  PKG_NAME="hbt-${STAMP}-${REV}${DIRTY}"
  OUT_DIR="$REPO/.deploy-out"
  mkdir -p "$OUT_DIR"
  PKG="$OUT_DIR/$PKG_NAME.tar.gz"

  echo "== 묶기: $PKG_NAME =="
  # .env·node_modules·로그는 절대 넣지 않는다(시크릿은 서버 shared/.env 로만 관리)
  tar -czf "$PKG" -C "$REPO" \
    --exclude='backend/node_modules' \
    --exclude='backend/.env' --exclude='backend/.env.*' --exclude='*.log' \
    --exclude='backend/deploy' \
    backend \
    root-cloudflare/dist \
    root-cloudflare/src/data/tiers.json
  # 넣으면 안 되는 게 섞였는지 마지막으로 확인
  if tar -tzf "$PKG" | grep -E '(^|/)\.env$|node_modules/' >/dev/null; then
    echo "패키지에 .env 또는 node_modules 가 섞였습니다 — 중단" >&2; rm -f "$PKG"; exit 1
  fi
  echo "   $(du -h "$PKG" | cut -f1)  $PKG"
  echo "$REV$DIRTY" > "$OUT_DIR/.last-rev"
}

case "$CMD" in
  setup)
    need_host
    rssh "mkdir -p /tmp/hbt-setup"
    rscp "$HERE/setup-vm.sh" "$HERE/nginx-human-bug-tier.conf" "$OCI_HOST:/tmp/hbt-setup/"
    rssh "bash /tmp/hbt-setup/setup-vm.sh"
    ;;

  env)
    need_host
    SRC="${2:-$REPO/backend/.env}"
    [ -f "$SRC" ] || { echo "$SRC 가 없습니다" >&2; exit 1; }
    echo "== $SRC → 서버 $APP_DIR/shared/.env (내용은 출력하지 않음) =="
    rssh "mkdir -p $APP_DIR/shared"
    rscp "$SRC" "$OCI_HOST:$APP_DIR/shared/.env"
    rssh "chmod 600 $APP_DIR/shared/.env"
    echo "   복사 완료. ※ 서버에서 APP_URL 을 실제 접속 주소로 바꿔야 메일 링크가 맞습니다:"
    echo "     ssh ... \"sed -i 's#^APP_URL=.*#APP_URL=https://내도메인#' $APP_DIR/shared/.env\""
    ;;

  package)
    make_package
    ;;

  deploy)
    need_host
    rssh "test -f $APP_DIR/shared/.env" || { echo "서버에 $APP_DIR/shared/.env 가 없습니다. 먼저 'env' 를 실행하세요." >&2; exit 1; }
    make_package
    REL="$APP_DIR/releases/$PKG_NAME"
    echo "== 업로드 =="
    rscp "$PKG" "$HERE/ecosystem.config.js" "$OCI_HOST:/tmp/"
    echo "== 서버에서 풀기·의존성 설치·교체·재시작 =="
    rssh bash -s <<EOF
set -euo pipefail
mkdir -p "$REL"
tar -xzf "/tmp/$PKG_NAME.tar.gz" -C "$REL"
rm -f "/tmp/$PKG_NAME.tar.gz"
cp /tmp/ecosystem.config.js "$APP_DIR/ecosystem.config.js"
ln -sfn "$APP_DIR/shared/.env" "$REL/backend/.env"
cd "$REL/backend"
npm ci --omit=dev --no-audit --no-fund >/dev/null
ln -sfn "$REL" "$APP_DIR/current.new" && mv -Tf "$APP_DIR/current.new" "$APP_DIR/current"
pm2 startOrReload "$APP_DIR/ecosystem.config.js" --update-env >/dev/null
pm2 save >/dev/null
# 오래된 릴리스 정리(최근 $KEEP_RELEASES 개만 남김)
ls -1dt "$APP_DIR"/releases/*/ | tail -n +$((KEEP_RELEASES + 1)) | xargs -r rm -rf
EOF
    echo "== 헬스 체크 =="
    for i in $(seq 1 20); do
      if rssh "curl -fsS http://127.0.0.1:5000/health" 2>/dev/null | grep -q '"status":"ok"'; then
        rssh "curl -fsS http://127.0.0.1:5000/health"; echo
        echo "배포 완료: $PKG_NAME"
        exit 0
      fi
      sleep 3
    done
    echo "헬스 체크 실패 — 로그 확인: bash $0 logs  /  되돌리기: bash $0 rollback" >&2
    exit 1
    ;;

  status)
    need_host
    rssh "pm2 ls; echo; readlink -f $APP_DIR/current; curl -fsS http://127.0.0.1:5000/health; echo"
    ;;

  logs)
    need_host
    rssh "pm2 logs human-bug-tier --lines 100 --nostream"
    ;;

  rollback)
    need_host
    rssh bash -s <<EOF
set -euo pipefail
CUR="\$(readlink -f $APP_DIR/current)"
PREV="\$(ls -1dt $APP_DIR/releases/*/ | sed 's#/\$##' | grep -vx "\$CUR" | head -n 1)"
[ -n "\$PREV" ] || { echo "되돌릴 이전 릴리스가 없습니다" >&2; exit 1; }
ln -sfn "\$PREV" $APP_DIR/current.new && mv -Tf $APP_DIR/current.new $APP_DIR/current
pm2 startOrReload $APP_DIR/ecosystem.config.js --update-env >/dev/null
echo "되돌림: \$PREV"
EOF
    ;;

  *)
    sed -n '2,25p' "$0"
    exit 1
    ;;
esac
