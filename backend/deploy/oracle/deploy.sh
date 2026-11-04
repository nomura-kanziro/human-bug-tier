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
#   bash backend/deploy/oracle/deploy.sh status    # 서버 pm2 상태 + /health (AI 서비스가 있으면 그것도)
#   bash backend/deploy/oracle/deploy.sh logs      # 서버 로그 최근 100줄   (logs ai → AI 서비스 로그)
#   bash backend/deploy/oracle/deploy.sh rollback  # 바로 전 릴리스로 되돌리기
#
# AI 전용 서비스(ai-service/, FastAPI) — 켜려면 최초 1회:
#   bash backend/deploy/oracle/deploy.sh ai-setup  # VM 에 파이썬 가상환경 준비(python3-venv 설치 포함)
#   AI_PROVIDER=none bash backend/deploy/oracle/deploy.sh ai-env   # shared/ai.env 만들기 + AI_SERVICE_KEY 를 backend 와 맞추기
#       AI_PROVIDER = none(문서 답만, 무료) | anthropic(Claude API — 서버에서 ANTHROPIC_API_KEY 를 직접 채운다) | ollama
#   그 다음 `deploy` 를 하면 ai-service 도 함께 올라간다. shared/ai.env 가 없으면 ai-service 는 올리지 않는다(사이트는 정상, /api/ai 만 503).
#
# 서버 구조:
#   /opt/human-bug-tier/releases/<시각>/   ← 배포본(backend + root-cloudflare/dist + tiers.json)
#   /opt/human-bug-tier/current           ← 지금 쓰는 릴리스를 가리키는 링크
#   /opt/human-bug-tier/shared/.env        ← 시크릿(배포본에는 절대 넣지 않음, 각 릴리스 backend/.env 로 링크)
#   /opt/human-bug-tier/shared/ai.env      ← ai-service 시크릿(각 릴리스 ai-service/.env 로 링크)
#   /opt/human-bug-tier/shared/ai-venv/    ← ai-service 파이썬 가상환경(릴리스 밖 — 의존성이 바뀔 때만 다시 설치)
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
    --exclude='ai-service/.venv' --exclude='ai-service/data' --exclude='ai-service/.env' --exclude='ai-service/.env.*' \
    --exclude='ai-service/.dev_service-*' --exclude='ai-service/tests' --exclude='ai-service/scripts' --exclude='__pycache__' --exclude='.pytest_cache' \
    backend \
    ai-service \
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

  ai-setup)
    need_host
    echo "== VM 에 ai-service 용 파이썬 가상환경 준비 =="
    rssh bash -s <<'EOF'
set -euo pipefail
V=/opt/human-bug-tier/shared/ai-venv
mkdir -p /opt/human-bug-tier/shared
python3 --version
mk() { rm -rf "$V"; python3 -m venv "$V"; }
if [ ! -x "$V/bin/python" ] || ! "$V/bin/python" -m pip --version >/dev/null 2>&1; then
  # Ubuntu 기본 이미지에는 python3-venv/pip 가 빠져 있다
  mk 2>/dev/null || { sudo apt-get update -y; sudo DEBIAN_FRONTEND=noninteractive apt-get install -y python3-venv python3-pip; mk; }
fi
"$V/bin/python" -m pip install -q --upgrade pip
"$V/bin/python" -m pip --version
free -m | sed -n '1,3p'
EOF
    echo "준비 완료. 다음: AI_PROVIDER=none bash $0 ai-env"
    ;;

  ai-env)
    need_host
    PROVIDER="${AI_PROVIDER:-}"
    case "$PROVIDER" in ""|none|anthropic|ollama) ;; *) echo "AI_PROVIDER 는 none | anthropic | ollama 중 하나" >&2; exit 1;; esac
    TEMPLATE="$REPO/ai-service/.env.production.example"
    [ -f "$TEMPLATE" ] || { echo "$TEMPLATE 가 없습니다" >&2; exit 1; }
    echo "== shared/ai.env 준비 (키 값은 출력하지 않음) =="
    rscp "$TEMPLATE" "$OCI_HOST:/tmp/ai.env.new"
    rssh bash -s -- "$PROVIDER" <<'EOF'
set -euo pipefail
PROVIDER="$1"
AI_ENV=/opt/human-bug-tier/shared/ai.env
BE_ENV=/opt/human-bug-tier/shared/.env
[ -f "$BE_ENV" ] || { echo "shared/.env 가 없습니다 — 먼저 env 를 실행하세요" >&2; exit 1; }
if [ ! -f "$AI_ENV" ]; then install -m 600 /tmp/ai.env.new "$AI_ENV"; echo "   ai.env 새로 만듦"; else echo "   ai.env 이미 있음(내용 유지)"; fi
rm -f /tmp/ai.env.new
chmod 600 "$AI_ENV"
getv() { grep -E "^$2=" "$1" | tail -1 | cut -d= -f2- || true; }
setv() { if grep -qE "^$2=" "$1"; then sed -i "s#^$2=.*#$2=$3#" "$1"; else echo "$2=$3" >> "$1"; fi; }
KEY="$(getv "$BE_ENV" AI_SERVICE_KEY)"
[ -n "$KEY" ] || KEY="$(getv "$AI_ENV" AI_SERVICE_KEY)"
[ -n "$KEY" ] || KEY="$(openssl rand -hex 24)"
setv "$AI_ENV" AI_SERVICE_KEY "$KEY"
setv "$BE_ENV" AI_SERVICE_KEY "$KEY"
[ -z "$PROVIDER" ] || setv "$AI_ENV" AI_LLM_PROVIDER "$PROVIDER"
echo "   AI_SERVICE_KEY: ai.env 와 backend(.env) 에 같은 값으로 설정됨 (값은 출력 안 함)"
echo "   AI_LLM_PROVIDER=$(getv "$AI_ENV" AI_LLM_PROVIDER)"
if [ "$(getv "$AI_ENV" AI_LLM_PROVIDER)" = anthropic ] && [ -z "$(getv "$AI_ENV" ANTHROPIC_API_KEY)" ]; then
  echo "   ※ ANTHROPIC_API_KEY 가 비어 있습니다 — 서버에서 직접 채우세요(채팅/명령줄에 키를 남기지 않기 위해):"
  echo "     ssh ... 'nano /opt/human-bug-tier/shared/ai.env'"
fi
EOF
    echo "   backend 는 다음 deploy(또는 pm2 reload human-bug-tier --update-env) 때 새 키를 읽습니다."
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
# ai-service — shared/ai.env 가 있을 때만. 의존성은 링크를 바꾸기 전에 설치한다(실패하면 사이트는 옛 버전 그대로)
AI_ON=0
if [ -f "$APP_DIR/shared/ai.env" ]; then
  AI_ON=1
  [ -x "$APP_DIR/shared/ai-venv/bin/python" ] || { echo "AI 가상환경이 없습니다 — 먼저 'ai-setup' 을 실행하세요" >&2; exit 1; }
  ln -sfn "$APP_DIR/shared/ai.env" "$REL/ai-service/.env"
  WANT="\$(sha256sum "$REL/ai-service/requirements-prod.txt" | cut -d' ' -f1)"
  if [ "\$(cat "$APP_DIR/shared/ai-venv/.req-hash" 2>/dev/null || true)" != "\$WANT" ]; then
    echo "== AI 의존성 설치 (처음에는 몇 분 걸립니다) =="
    "$APP_DIR/shared/ai-venv/bin/python" -m pip install --no-cache-dir -q -r "$REL/ai-service/requirements-prod.txt"
    echo "\$WANT" > "$APP_DIR/shared/ai-venv/.req-hash"
  fi
fi
ln -sfn "$REL" "$APP_DIR/current.new" && mv -Tf "$APP_DIR/current.new" "$APP_DIR/current"
pm2 startOrReload "$APP_DIR/ecosystem.config.js" --only human-bug-tier --update-env >/dev/null
if [ "\$AI_ON" = 1 ]; then pm2 startOrReload "$APP_DIR/ecosystem.config.js" --only hbt-ai --update-env >/dev/null; fi
pm2 save >/dev/null
# 오래된 릴리스 정리(최근 $KEEP_RELEASES 개만 남김)
ls -1dt "$APP_DIR"/releases/*/ | tail -n +$((KEEP_RELEASES + 1)) | xargs -r rm -rf
EOF
    echo "== 헬스 체크 =="
    for i in $(seq 1 20); do
      if rssh "curl -fsS http://127.0.0.1:5000/health" 2>/dev/null | grep -q '"status":"ok"'; then
        rssh "curl -fsS http://127.0.0.1:5000/health"; echo
        if rssh "test -f $APP_DIR/shared/ai.env"; then
          echo "== AI 서비스 확인 =="
          AI_OK=0
          for j in $(seq 1 20); do
            if rssh "curl -fsS http://127.0.0.1:8000/health" 2>/dev/null | grep -q '"status":"ok"'; then AI_OK=1; break; fi
            sleep 3
          done
          if [ "$AI_OK" = 1 ]; then
            rssh "curl -fsS http://127.0.0.1:8000/health"; echo
            rssh "free -m | sed -n '1,2p'"
          else
            echo "※ AI 서비스가 아직 응답하지 않습니다(사이트는 정상). 로그: bash $0 logs ai" >&2
          fi
        fi
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
    if rssh "test -f $APP_DIR/shared/ai.env"; then
      echo "== AI 서비스 =="
      rssh "curl -fsS http://127.0.0.1:8000/health || echo '(응답 없음)'; echo; free -m | sed -n '1,2p'"
    fi
    ;;

  logs)
    need_host
    if [ "${2:-}" = ai ]; then
      rssh "pm2 logs hbt-ai --lines 100 --nostream"
    else
      rssh "pm2 logs human-bug-tier --lines 100 --nostream"
    fi
    ;;

  rollback)
    need_host
    rssh bash -s <<EOF
set -euo pipefail
CUR="\$(readlink -f $APP_DIR/current)"
PREV="\$(ls -1dt $APP_DIR/releases/*/ | sed 's#/\$##' | grep -vx "\$CUR" | head -n 1)"
[ -n "\$PREV" ] || { echo "되돌릴 이전 릴리스가 없습니다" >&2; exit 1; }
ln -sfn "\$PREV" $APP_DIR/current.new && mv -Tf $APP_DIR/current.new $APP_DIR/current
pm2 startOrReload $APP_DIR/ecosystem.config.js --only human-bug-tier --update-env >/dev/null
# 되돌아간 릴리스에 ai-service 가 있을 때만 다시 띄운다(옛 릴리스에는 없다 → AI 만 멈추고 사이트는 정상)
if [ -f $APP_DIR/shared/ai.env ] && [ -d "\$PREV/ai-service" ]; then
  pm2 startOrReload $APP_DIR/ecosystem.config.js --only hbt-ai --update-env >/dev/null
else
  pm2 delete hbt-ai >/dev/null 2>&1 || true
fi
echo "되돌림: \$PREV"
EOF
    ;;

  *)
    sed -n '2,25p' "$0"
    exit 1
    ;;
esac
