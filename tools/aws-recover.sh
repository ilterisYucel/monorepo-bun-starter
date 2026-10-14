#!/usr/bin/env bash
# aws-recover.sh — telemetri YAZIM hattı takıldığında tek komut kurtarma.
#
# Belirti: UI'da mode/SOC donuk; komutlar çalışıyor ama konteyner telemetrisi
# güncellenmiyor; `device_bsc_1`'in en yeni satırı dakikalar önce.
#
# Yaptığı (sırayla):
#   1) 5 dk'dan eski "running" operasyon koşularını failed'e çeker (takılı run).
#   2) c1/c2 redis kuyruklarını boşaltır (bozuk/stalled iş birikimi).
#   3) c1/c2 device + data servislerini yeniden başlatır (worker taze).
#
# Kullanım:
#   tools/aws-recover.sh [--env <env>] [--compose <yml>]
#
# Varsayılanlar AWS demo stack'ine göredir.
set -euo pipefail

ENV_FILE="deployment/v2/aws/.env"
COMPOSE_FILE="deployment/v2/aws/docker-compose.yml"
TS_CONTAINER="aws-demo-timescaledb"
DB="battery"

usage() { sed -n '2,15p' "$0" | sed 's/^# \{0,1\}//'; }

while [ $# -gt 0 ]; do
  case "$1" in
    --env)     ENV_FILE="$2"; shift 2 ;;
    --compose) COMPOSE_FILE="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Bilinmeyen argüman: $1" >&2; usage; exit 2 ;;
  esac
done

if [ -t 1 ]; then B=$'\e[1m'; G=$'\e[32m'; Y=$'\e[33m'; D=$'\e[2m'; N=$'\e[0m'; else B=; G=; Y=; D=; N=; fi
step() { printf '%s[%s]%s %s\n' "$D" "$1" "$N" "$2"; }
ok()   { printf '  %s✓%s %s\n' "$G" "$N" "$1"; }
warn() { printf '  %s!%s %s\n' "$Y" "$N" "$1"; }

[ -f "$ENV_FILE" ] || { echo "env yok: $ENV_FILE" >&2; exit 1; }
[ -f "$COMPOSE_FILE" ] || { echo "compose yok: $COMPOSE_FILE" >&2; exit 1; }

printf '%s┌─ AWS yazım hattı kurtarma ────────────────────────────────%s\n' "$B" "$N"

step 1/3 "Takılı (running >5 dk) koşular kapatılıyor"
OUT="$(docker exec "$TS_CONTAINER" psql -U postgres -d "$DB" -tc \
  "UPDATE operation_runs SET status='failed', finished_at=now()
   WHERE status='running' AND started_at < now() - interval '5 minutes';")"
ok "kapatılan: ${OUT//[!0-9]/}"
echo "$OUT"

step 2/3 "c1/c2 redis kuyrukları boşaltılıyor"
docker exec aws-demo-redis-c1 redis-cli FLUSHDB >/dev/null && ok "redis-c1"
docker exec aws-demo-redis-c2 redis-cli FLUSHDB >/dev/null && ok "redis-c2"

step 3/3 "device + data servisleri yeniden başlatılıyor"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" \
  restart c1-device-service c1-data-service c2-device-service c2-data-service >/dev/null
ok "restart tamam"

printf '\n%s✔ Bitti.%s 30-60 sn sonra doğrula:\n' "$G$B" "$N"
printf '  docker exec %s psql -U postgres -d container1 -tAc \\\n' "$TS_CONTAINER"
printf '   "SELECT max(timestamp) FROM device_bsc_1;" && date -u\n'
warn "Yazım hâlâ duruyorsa: docker logs aws-demo-c1-data-service --tail 30"
