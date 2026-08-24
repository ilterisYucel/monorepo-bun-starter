#!/usr/bin/env bash
set -euo pipefail

# Wiki.js yedeği: PostgreSQL dump + data volume tar.
# Çıktı: deployment/wiki/backups/wiki-db-<ts>.sql + wiki-data-<ts>.tar.gz
# Cron önerisi: 0 3 * * * bash <repo>/deployment/wiki/backup.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/../docker-compose.wiki.yml"
BACKUP_DIR="$SCRIPT_DIR/backups"
KEEP=14

STAMP="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "[wiki-backup] DB dump başlıyor..."
docker compose -f "$COMPOSE_FILE" exec -T wiki-db pg_dump -U wikijs wiki > "$BACKUP_DIR/wiki-db-$STAMP.sql"

echo "[wiki-backup] Data volume paketleniyor..."
docker run --rm \
  -v wiki-stack_wiki-data:/data:ro \
  -v "$BACKUP_DIR":/backup \
  alpine:3.20 tar czf "/backup/wiki-data-$STAMP.tar.gz" -C /data .

echo "[wiki-backup] Eski yedekler temizleniyor (son $KEEP adet korunur)..."
ls -1t "$BACKUP_DIR"/wiki-db-*.sql 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -f
ls -1t "$BACKUP_DIR"/wiki-data-*.tar.gz 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -f

echo "[wiki-backup] Tamamlandı: $BACKUP_DIR"
