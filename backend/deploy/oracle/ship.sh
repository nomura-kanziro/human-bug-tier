#!/usr/bin/env bash
# ======================================================================
# 원클릭 배포 (Oracle Cloud) — 로컬 PC(Git Bash)에서 실행한다. deploy.sh 는 고치지 않고 호출만 한다.
#
#   bash backend/deploy/oracle/ship.sh            # 전체: env 동기화 → 커밋 기준 배포 → 샘플 준비 → 확인(실패 시 자동 롤백)
#   bash backend/deploy/oracle/ship.sh --dry-run  # 미리보기: 서버에 덧붙일 ORACLE_* 키 이름과 배포할 커밋만 보여 준다(아무것도 바꾸지 않음)
#   bash backend/deploy/oracle/ship.sh check      # 확인만: /health · /api/db-health · /api/db-sample
#
# 하는 일
#   1) 서버 shared/.env 를 .env.bak.<시각> 으로 백업하고, 서버에 "없는" ORACLE_* 키만 PC backend/.env 에서 덧붙인다.
#      이미 있는 키(APP_URL 등 포함)는 절대 덮어쓰지 않는다. 값은 화면에 출력하지 않는다.
#   2) git HEAD(커밋된 상태)만 임시 worktree 로 꺼내 그 안의 deploy.sh deploy 를 실행한다.
#      → 커밋 안 된 변경(ai-service 등)은 올라가지 않는다.
#   3) 서버에서 scripts/init-sample.js 실행 → /api/db-health · /api/db-sample 확인.
#      실패하면 current 링크가 바뀐 경우에만 deploy.sh rollback 으로 되돌린다.
#
# 접속 정보: 같은 폴더의 ship.local.env (git 무시 대상)에서 OCI_HOST · OCI_KEY 를 읽는다. 환경변수로 덮어쓸 수 있다.
# ======================================================================
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../../.." && pwd)"
APP_DIR=/opt/human-bug-tier
LOCAL_ENV="$REPO/backend/.env"
MODE="${1:-ship}"

if [ -f "$HERE/ship.local.env" ]; then
  # shellcheck disable=SC1091
  . "$HERE/ship.local.env"
fi
: "${OCI_HOST:?OCI_HOST 가 없습니다. $HERE/ship.local.env 에 OCI_HOST=ubuntu@<IP> 를 넣으세요}"
: "${OCI_KEY:?OCI_KEY 가 없습니다. $HERE/ship.local.env 에 OCI_KEY=<개인키 경로> 를 넣으세요}"
export OCI_HOST OCI_KEY

SSH_OPTS=(-i "$OCI_KEY" -o BatchMode=yes -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=30)
rssh() { ssh "${SSH_OPTS[@]}" "$OCI_HOST" "$@"; }
say() { printf '\n== %s ==\n' "$*"; }

# ---------- 확인 ----------
check_endpoints() {
  local ok=1
  rssh "curl -fsS http://127.0.0.1:5000/health" >/dev/null && echo "  /health        OK" || { echo "  /health        실패"; ok=0; }
  local h s
  h="$(rssh "curl -sS http://127.0.0.1:5000/api/db-health" || true)"
  if [[ "$h" == *'"ok":true'* ]]; then echo "  /api/db-health OK"; else echo "  /api/db-health 실패: $h"; ok=0; fi
  s="$(rssh "curl -sS http://127.0.0.1:5000/api/db-sample" || true)"
  if [[ "$s" == *'"ok":true'* ]]; then
    echo "  /api/db-sample OK ($(printf '%s' "$s" | grep -o '"ID":' | wc -l | tr -d ' ')행)"
  else echo "  /api/db-sample 실패: $s"; ok=0; fi
  [ "$ok" = 1 ]
}

if [ "$MODE" = check ]; then
  say "확인 ($OCI_HOST)"
  check_endpoints && echo "모두 정상" || { echo "실패한 항목이 있습니다" >&2; exit 1; }
  exit 0
fi

# ---------- 0) 사전 점검 ----------
say "사전 점검"
[ -f "$LOCAL_ENV" ] || { echo "$LOCAL_ENV 가 없습니다" >&2; exit 1; }
ORACLE_LINES="$(grep -E '^ORACLE_[A-Z_]*=.+' "$LOCAL_ENV" | tr -d '\r' || true)"
[ -n "$ORACLE_LINES" ] || { echo "PC backend/.env 에 값이 채워진 ORACLE_* 키가 없습니다" >&2; exit 1; }
echo "  PC ORACLE_* 키: $(printf '%s\n' "$ORACLE_LINES" | cut -d= -f1 | tr '\n' ' ')"
HEAD_REV="$(git -C "$REPO" rev-parse --short HEAD)"
echo "  배포할 커밋: $HEAD_REV ($(git -C "$REPO" branch --show-current)) — $(git -C "$REPO" log -1 --format=%s)"
if [ -n "$(git -C "$REPO" status --porcelain)" ]; then
  echo "  참고: 커밋 안 된 변경 $(git -C "$REPO" status --porcelain | wc -l)개는 이번 배포에 포함되지 않습니다"
fi
rssh "test -f $APP_DIR/shared/.env" || { echo "서버에 $APP_DIR/shared/.env 가 없습니다 — 먼저 deploy.sh env 로 만드세요" >&2; exit 1; }

# ---------- 1) 서버 .env 에 없는 ORACLE_* 키만 덧붙이기 ----------
say "서버 shared/.env — 없는 ORACLE_* 키만 덧붙임 (값은 출력하지 않음)"
DRY=0; [ "$MODE" = --dry-run ] && DRY=1
# 서버에서 돌릴 스크립트(값은 다루기만 하고 출력하지 않는다)
read -r -d '' ENV_SYNC <<'REMOTE' || true
set -eu
NEW=$(mktemp); trap 'rm -f "$NEW"' EXIT; cat > "$NEW"
ADD=""
while IFS= read -r line; do
  k=${line%%=*}
  if grep -qE "^$k=" "$F"; then echo "  $k: 서버에 이미 있음 — 그대로 둠"; else echo "  $k: 추가"; ADD=1; fi
done < "$NEW"
if [ "$DRY" = 1 ]; then echo "  (dry-run: 바꾸지 않음)"; exit 0; fi
if [ -n "$ADD" ]; then
  B="$F.bak.$(date +%Y%m%d-%H%M%S)"; cp -p "$F" "$B"; chmod 600 "$B"; echo "  백업: $B"
  [ -z "$(tail -c1 "$F")" ] || echo >> "$F"
  while IFS= read -r line; do k=${line%%=*}; grep -qE "^$k=" "$F" || printf '%s\n' "$line" >> "$F"; done < "$NEW"
  chmod 600 "$F"
else
  echo "  덧붙일 키 없음"
fi
REMOTE
# 값은 명령줄이 아니라 stdin 으로만 넘긴다(ps 등에 남지 않게). 스크립트는 %q 로 안전하게 인용
printf '%s\n' "$ORACLE_LINES" | rssh "DRY=$DRY F=$APP_DIR/shared/.env bash -c $(printf '%q' "$ENV_SYNC")"

if [ "$DRY" = 1 ]; then
  say "dry-run 끝 — 실제 배포는 인자 없이 실행"
  exit 0
fi

# ---------- 2) 커밋 기준 클린 worktree 에서 deploy.sh deploy ----------
say "커밋 $HEAD_REV 을 임시 worktree 로 꺼내 배포"
WT="$(mktemp -d)/hbt-ship"
cleanup() { git -C "$REPO" worktree remove --force "$WT" >/dev/null 2>&1 || true; }
trap cleanup EXIT
git -C "$REPO" worktree add --detach "$WT" HEAD >/dev/null
echo "  프론트 의존성 설치 (root-cloudflare, npm ci)"
(cd "$WT/root-cloudflare" && npm ci --no-audit --no-fund >/dev/null)

PREV="$(rssh "readlink -f $APP_DIR/current")"
if ! bash "$WT/backend/deploy/oracle/deploy.sh" deploy; then
  echo "deploy.sh deploy 실패" >&2
  NOW="$(rssh "readlink -f $APP_DIR/current" || true)"
  if [ "$NOW" != "$PREV" ]; then say "자동 롤백"; bash "$WT/backend/deploy/oracle/deploy.sh" rollback || true; fi
  exit 1
fi

# ---------- 3) 샘플 준비 + 확인, 실패 시 롤백 ----------
say "샘플 테이블 준비 (init-sample.js)"
INIT_OK=1
rssh "cd $APP_DIR/current/backend && node scripts/init-sample.js" || INIT_OK=0
say "확인"
if [ "$INIT_OK" = 1 ] && check_endpoints; then
  say "배포 완료 — $HEAD_REV"
else
  say "확인 실패 — 이전 릴리스로 자동 롤백"
  bash "$WT/backend/deploy/oracle/deploy.sh" rollback || echo "롤백도 실패 — deploy.sh status 로 상태를 확인하세요" >&2
  echo "서버 로그: bash backend/deploy/oracle/deploy.sh logs" >&2
  exit 1
fi
