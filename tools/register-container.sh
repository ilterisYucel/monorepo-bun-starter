#!/usr/bin/env bash
# register-container.sh — Field'a BİR VEYA DAHA FAZLA konteyner service token'ı
# kaydeder ve bağlantı durumunu doğrular (elle curl uğraşını bitirir).
#
# Kullanım:
#   tools/register-container.sh [--env <field-env>] [--container-env <dosya[,dosya...]>]
#                               [--url <base>] [--container <id[,id...]>]
#                               [--station <id[,id...]>] [--token-var <VAR[,VAR...]>]
#                               [--user <ad>] [--wait <sn>]
#
# Çoklu kayıt (virgüllü, indeks hizalı):
#   tools/register-container.sh \
#     --env deployment/v2/aws/.env --container-env deployment/v2/aws/.env \
#     --container container-1,container-2 --station bess1,bess2 \
#     --token-var C1_CONTAINER_TOKEN,C2_CONTAINER_TOKEN --url http://localhost:88
#
# Tek kayıt (geriye dönük):
#   tools/register-container.sh --env deployment/v2/dev/field/.env \
#     --container-env deployment/v2/dev/container/.env --url http://localhost:5002
#
# --station   : BESS MV istasyon etiketi (UC-13) — field kaydına yazılır (opsiyonel).
# --token-var : token değişkeni (varsayılan CONTAINER_TOKEN). Virgüllü listede
#               eksik öğeler için SON değer tekrarlanır.
#
# Girdiler: FIELD_ID + SEED_ADMIN_PASSWORD --env (field) dosyasından, token'lar
# --container-env dosya(lar)ından okunur (sırlar komut satırına yazılmaz).
set -euo pipefail

ENV_FILE="deployment/v2/aws/field/.env"
BASE_URL="http://localhost:88"
USER_NAME="admin"
WAIT_SECS=30

CONTAINERS=("container-1")
STATIONS=("")
TOKEN_VARS=("CONTAINER_TOKEN")
CONTAINER_ENVS=("deployment/v2/aws/container/.env")

usage() {
  sed -n '2,24p' "$0" | sed 's/^# \{0,1\}//'
}

split() { local IFS=','; read -r -a "$1" <<< "$2"; }

# at <arrayName> <index> — index yoksa son öğeyi döner (eksik listeler hizalanır).
at() {
  local -n arr="$1"
  if [ "${#arr[@]}" -eq 0 ]; then printf ''; return; fi
  if [ "$2" -lt "${#arr[@]}" ]; then printf '%s' "${arr[$2]}"; else printf '%s' "${arr[${#arr[@]}-1]}"; fi
}

while [ $# -gt 0 ]; do
  case "$1" in
    --env)           ENV_FILE="$2"; shift 2 ;;
    --container-env) split CONTAINER_ENVS "$2"; shift 2 ;;
    --url)           BASE_URL="$2"; shift 2 ;;
    --container)     split CONTAINERS "$2"; shift 2 ;;
    --station)       split STATIONS "$2"; shift 2 ;;
    --token-var)     split TOKEN_VARS "$2"; shift 2 ;;
    --user)          USER_NAME="$2"; shift 2 ;;
    --wait)          WAIT_SECS="$2"; shift 2 ;;
    -h|--help)       usage; exit 0 ;;
    *) echo "Bilinmeyen argüman: $1" >&2; usage; exit 2 ;;
  esac
done

# --- renkler (tty ise) ---
if [ -t 1 ]; then B=$'\e[1m'; G=$'\e[32m'; R=$'\e[31m'; Y=$'\e[33m'; D=$'\e[2m'; N=$'\e[0m'; else B=; G=; R=; Y=; D=; N=; fi
ok()   { printf '  %s✓%s %s\n' "$G" "$N" "$1"; }
warn() { printf '  %s!%s %s\n' "$Y" "$N" "$1"; }
err()  { printf '  %s✗%s %s\n' "$R" "$N" "$1"; }
step() { printf '%s[%s]%s %s\n' "$D" "$1" "$N" "$2"; }

read_var() { grep -E "^$2=" "$1" 2>/dev/null | head -1 | cut -d= -f2- | sed 's/[[:space:]]*$//'; }

jget() { python3 -c "import sys,json
try:
    print(json.load(sys.stdin).get(sys.argv[1],''))
except Exception:
    print('')" "$1"; }

printf '%s┌─ Konteyner Kaydı ─────────────────────────────────────────%s\n' "$B" "$N"
printf '│ Hedef      : %s\n' "$BASE_URL"
printf '│ Env        : %s\n' "$ENV_FILE"
printf '│ Konteyner  : %s\n' "${CONTAINERS[*]}"
printf '%s└───────────────────────────────────────────────────────────%s\n' "$B" "$N"

# ── 1) ortam ────────────────────────────────────────────────────────────────
if [ ! -f "$ENV_FILE" ]; then err "Field env dosyası yok: $ENV_FILE"; exit 1; fi
FIELD_ID="$(read_var "$ENV_FILE" FIELD_ID)"
ADMIN_PW="$(read_var "$ENV_FILE" SEED_ADMIN_PASSWORD)"
[ -n "$ADMIN_PW" ] || ADMIN_PW="$(read_var "$ENV_FILE" FIELD_SEED_ADMIN_PASSWORD)"

step 1/4 "Ortam okunuyor"
[ -n "$FIELD_ID" ] || { err "FIELD_ID boş ($ENV_FILE)"; exit 1; }
[ -n "$ADMIN_PW" ] || { err "SEED_ADMIN_PASSWORD/FIELD_SEED_ADMIN_PASSWORD boş ($ENV_FILE)"; exit 1; }

# Her konteyner için token + kaynak env dosyası çöz.
TOKENS=()
ENVS_USED=()
for i in "${!CONTAINERS[@]}"; do
  cenv="$(at CONTAINER_ENVS "$i")"
  tvar="$(at TOKEN_VARS "$i")"
  [ -n "$tvar" ] || tvar="CONTAINER_TOKEN"
  if [ ! -f "$cenv" ]; then err "Container env dosyası yok: $cenv"; exit 1; fi
  tok="$(read_var "$cenv" "$tvar")"
  [ -n "$tok" ] || tok="$(read_var "$ENV_FILE" "$tvar")"
  if [ "${#tok}" -lt 32 ]; then
    err "$tvar <32 karakter veya boş (${CONTAINERS[$i]} · $cenv)"; exit 1
  fi
  TOKENS+=("$tok")
  ENVS_USED+=("$cenv")
  ok "${CONTAINERS[$i]}: $tvar (${#tok} karakter) ← $cenv"
done
ok "FIELD_ID=${FIELD_ID:0:8}…  ·  kullanıcı $USER_NAME"

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
step 3/4 "Service token kaydı (${#CONTAINERS[@]} konteyner)"
for i in "${!CONTAINERS[@]}"; do
  cid="${CONTAINERS[$i]}"
  st="$(at STATIONS "$i")"
  body="{\"token\":\"${TOKENS[$i]}\"}"
  [ -n "$st" ] && body="{\"token\":\"${TOKENS[$i]}\",\"station\":\"$st\"}"
  RESP="$(curl -s -w $'\n%{http_code}' -X POST \
    "$BASE_URL/api/fields/$FIELD_ID/containers/$cid/register" \
    "${AUTH[@]}" -d "$body")"
  CODE="$(printf '%s' "$RESP" | tail -n1)"
  BODY="$(printf '%s' "$RESP" | sed '$d')"
  case "$CODE" in
    201) ok "Kaydedildi (201): $cid${st:+ · station $st} → $BODY" ;;
    403) err "Yetki yok (403) — admin/boss gerekli ($cid)"; exit 1 ;;
    400) err "Geçersiz token (400): $cid → $BODY"; exit 1 ;;
    *)   err "Kayıt başarısız (HTTP $CODE): $cid → $BODY"; exit 1 ;;
  esac
done

# ── 4) bağlantı durumu ──────────────────────────────────────────────────────
step 4/4 "Konteyner bağlantıları bekleniyor (en çok ${WAIT_SECS}s)"
deadline=$(( $(date +%s) + WAIT_SECS ))
declare -A STATE=()
connected_count=0
while [ "$(date +%s)" -lt "$deadline" ]; do
  CBODY="$(curl -s "${AUTH[@]}" "$BASE_URL/api/fields/$FIELD_ID/containers" || true)"
  connected_count=0
  for cid in "${CONTAINERS[@]}"; do
    st="$(printf '%s' "$CBODY" | python3 -c "import sys,json
try:
    d=json.load(sys.stdin)
    c=d if isinstance(d,list) else d.get('containers',[])
    m=[x for x in c if x.get('containerId')=='$cid']
    print(m[0].get('connectionStatus','') if m else '')
except Exception:
    print('')" 2>/dev/null || true)"
    STATE["$cid"]="$st"
    [ "$st" = "connected" ] && connected_count=$((connected_count+1))
  done
  [ "$connected_count" -eq "${#CONTAINERS[@]}" ] && break
  sleep 2
done

for cid in "${CONTAINERS[@]}"; do
  if [ "${STATE[$cid]:-}" = "connected" ]; then
    ok "$cid durumu: ${G}connected${N}"
  else
    warn "$cid durumu: ${STATE[$cid]:-bilinmiyor} (henüz connected değil)"
  fi
done

if [ "$connected_count" -eq "${#CONTAINERS[@]}" ]; then
  printf '\n%s✔ Hazır.%s Tüm konteynerler field'"'"'a bağlı — uzak BSC adımları (charge/discharge) çalışır.\n' "$G$B" "$N"
  exit 0
fi

printf '\n%s! Kayıt yapıldı ama bazı bağlantılar beklemede.%s Kontroller:\n' "$Y$B" "$N"
printf '  • Konteyner service ayakta mı:  docker ps | grep -- -web-service\n'
printf '  • FieldConnector açık mı:       FIELD_CONNECT_ENABLED=true\n'
printf '  • Konteyner logu:               docker logs <container>-web-service | tail -30\n'
printf '  • Backoff normaldir — birkaç sn sonra tekrar: bu script veya /containers ucunu kontrol et.\n'
exit 1
