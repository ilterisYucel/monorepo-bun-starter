#!/usr/bin/env bash
# register-container.sh — Field'a bir konteyner service token'ı kaydeder ve
# bağlantı durumunu doğrular (elle curl uğraşını bitirir).
#
# Kullanım:
#   tools/register-container.sh [--env <dosya>] [--url <base>] [--container <id>] [--user <ad>]
#
# Örnek:
#   tools/register-container.sh --env deployment/aws/demo-edge/.env --url http://localhost:88
#
# Girdiler .env'den okunur: FIELD_ID, CONTAINER_TOKEN, SEED_ADMIN_PASSWORD.
# (Sırları komut satırına yazmaya gerek yok.)
set -euo pipefail

ENV_FILE="deployment/aws/demo-edge/.env"
BASE_URL="http://localhost:88"
CONTAINER_ID="container-1"
USER_NAME="admin"
WAIT_SECS=30

usage() {
  sed -n '2,14p' "$0" | sed 's/^# \{0,1\}//'
}

while [ $# -gt 0 ]; do
  case "$1" in
    --env)       ENV_FILE="$2"; shift 2 ;;
    --url)       BASE_URL="$2"; shift 2 ;;
    --container) CONTAINER_ID="$2"; shift 2 ;;
    --user)      USER_NAME="$2"; shift 2 ;;
    --wait)      WAIT_SECS="$2"; shift 2 ;;
    -h|--help)   usage; exit 0 ;;
    *) echo "Bilinmeyen argüman: $1" >&2; usage; exit 2 ;;
  esac
done

# --- renkler (tty ise) ---
if [ -t 1 ]; then B=$'\e[1m'; G=$'\e[32m'; R=$'\e[31m'; Y=$'\e[33m'; D=$'\e[2m'; N=$'\e[0m'; else B=; G=; R=; Y=; D=; N=; fi
ok()   { printf '  %s✓%s %s\n' "$G" "$N" "$1"; }
warn() { printf '  %s!%s %s\n' "$Y" "$N" "$1"; }
err()  { printf '  %s✗%s %s\n' "$R" "$N" "$1"; }
step() { printf '%s[%s]%s %s\n' "$D" "$1" "$N" "$2"; }

read_env() { grep -E "^$1=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2- | sed 's/[[:space:]]*$//'; }

jget() { python3 -c "import sys,json
try:
    print(json.load(sys.stdin).get(sys.argv[1],''))
except Exception:
    print('')" "$1"; }

printf '%s┌─ Konteyner Kaydı ─────────────────────────────────────────%s\n' "$B" "$N"
printf '│ Hedef      : %s\n' "$BASE_URL"
printf '│ Env        : %s\n' "$ENV_FILE"
printf '│ Konteyner  : %s\n' "$CONTAINER_ID"
printf '%s└───────────────────────────────────────────────────────────%s\n' "$B" "$N"

# ── 1) ortam ────────────────────────────────────────────────────────────────
if [ ! -f "$ENV_FILE" ]; then err "Env dosyası yok: $ENV_FILE"; exit 1; fi
FIELD_ID="$(read_env FIELD_ID)"
CONTAINER_TOKEN="$(read_env CONTAINER_TOKEN)"
ADMIN_PW="$(read_env SEED_ADMIN_PASSWORD)"

step 1/4 "Ortam okunuyor"
[ -n "$FIELD_ID" ] || { err "FIELD_ID boş ($ENV_FILE)"; exit 1; }
[ -n "$ADMIN_PW" ] || { err "SEED_ADMIN_PASSWORD boş ($ENV_FILE)"; exit 1; }
if [ "${#CONTAINER_TOKEN}" -lt 32 ]; then
  err "CONTAINER_TOKEN <32 karakter (şu an ${#CONTAINER_TOKEN})"; exit 1
fi
ok "FIELD_ID=${FIELD_ID:0:8}…  ·  token ${#CONTAINER_TOKEN} karakter  ·  kullanıcı $USER_NAME"

# ── 2) login ────────────────────────────────────────────────────────────────
step 2/4 "Admin girişi"
RESP="$(curl -s -w $'\n%{http_code}' -X POST "$BASE_URL/api/auth/login" \
  -H 'content-type: application/json' \
  -d "{\"username\":\"$USER_NAME\",\"password\":\"$ADMIN_PW\"}")"
CODE="$(printf '%s' "$RESP" | tail -n1)"
LOGIN_BODY="$(printf '%s' "$RESP" | sed '$d')"
if [ "$CODE" != "200" ]; then
  err "Giriş başarısız (HTTP $CODE): $LOGIN_BODY"
  [ "$CODE" = "429" ] && warn "Hesap geçici kilitli — 'docker exec <redis> redis-cli del login:lock:admin login:fail:admin'"
  exit 1
fi
ACCESS="$(printf '%s' "$LOGIN_BODY" | jget accessToken)"
[ -n "$ACCESS" ] || { err "accessToken alınamadı: $LOGIN_BODY"; exit 1; }
ok "Oturum açıldı (Bearer token alındı)"

AUTH=(-H "authorization: Bearer $ACCESS" -H 'content-type: application/json')

# ── 3) register ─────────────────────────────────────────────────────────────
step 3/4 "Service token kaydı"
RESP="$(curl -s -w $'\n%{http_code}' -X POST \
  "$BASE_URL/api/fields/$FIELD_ID/containers/$CONTAINER_ID/register" \
  "${AUTH[@]}" -d "{\"token\":\"$CONTAINER_TOKEN\"}")"
CODE="$(printf '%s' "$RESP" | tail -n1)"
BODY="$(printf '%s' "$RESP" | sed '$d')"
if [ "$CODE" = "201" ]; then
  ok "Kaydedildi (201): $BODY"
elif [ "$CODE" = "403" ]; then
  err "Yetki yok (403) — admin/boss gerekli"; exit 1
elif [ "$CODE" = "400" ]; then
  err "Geçersiz token (400): $BODY"; exit 1
else
  err "Kayıt başarısız (HTTP $CODE): $BODY"; exit 1
fi

# ── 4) bağlantı durumu ──────────────────────────────────────────────────────
step 4/4 "Konteyner bağlantısı bekleniyor (en çok ${WAIT_SECS}s)"
deadline=$(( $(date +%s) + WAIT_SECS ))
status=""
while [ "$(date +%s)" -lt "$deadline" ]; do
  CBODY="$(curl -s "${AUTH[@]}" "$BASE_URL/api/fields/$FIELD_ID/containers" || true)"
  status="$(printf '%s' "$CBODY" | python3 -c "import sys,json
try:
    d=json.load(sys.stdin)
    c=d if isinstance(d,list) else d.get('containers',[])
    m=[x for x in c if x.get('containerId')=='$CONTAINER_ID']
    print(m[0].get('connectionStatus','') if m else '')
except Exception:
    print('')" 2>/dev/null || true)"
  [ "$status" = "connected" ] && break
  sleep 2
done

if [ "$status" = "connected" ]; then
  ok "$CONTAINER_ID durumu: ${G}connected${N}"
  printf '\n%s✔ Hazır.%s Konteyner field'"'"'a bağlı — uzak BSC adımları (charge/discharge) çalışır.\n' "$G$B" "$N"
  exit 0
fi

warn "Durum: ${status:-bilinmiyor} (henüz connected değil)"
printf '\n%s! Kayıt yapıldı ama bağlantı beklemede.%s Kontroller:\n' "$Y$B" "$N"
printf '  • Konteyner service ayakta mı:  docker ps | grep container-web-service\n'
printf '  • FieldConnector açık mı:       .env FIELD_CONNECT_ENABLED=true\n'
printf '  • Konteyner logu:               docker logs aws-container-web-service | tail -30\n'
printf '  • Backoff normaldir — birkaç sn sonra tekrar: bu script veya /containers ucunu kontrol et.\n'
exit 1
