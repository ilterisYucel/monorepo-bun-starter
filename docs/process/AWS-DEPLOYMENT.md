# AWS Deployment Runbook (demo)

**Kapsam:** container + field + boss tier'larının AWS EC2 üzerinde ayağa kaldırılması.
**Durum:** DEMO — TLS'siz `ws://` kabulüyle (FLAG; üretim geçişi §7'de).

## 1. Topoloji

```
                    Makine A (edge)                          Makine B (boss)
                m6i.large 2 vCPU / 8GB                     t3.medium 2 vCPU / 4GB
        ┌───────────────────────────────────┐         ┌───────────────────────────┐
        │ container tier + field tier (tek  │         │ boss tier                 │
        │ compose projesi: aws-edge-stack)  │         │ (aws-boss-stack)          │
        │                                   │         │                           │
        │ container-web-service ──ws://─────► field-web-service ──ws://──────────► web-service:5003
        │   (5001, FieldConnector)          │         │   (5003, field uplink)    │
        │                                   │         │ web:80 (boss UI)          │
        │ container-web:80  field-web:88    │         │ integration-service       │
        └───────────────────────────────────┘         └───────────────────────────┘
```

- Konteyner → field: merged compose network'ü içi servis adı (`field-web-service:5002/ws/container`) — host'a port açılmaz.
- Field → boss: outbound `ws://<BOSS_EC2_IP>:5003/ws/field` — B'de 5003 inbound.
- Yönetim erişimi: boss UI `http://<B_IP>:80` (container/field UI'larına boss tüneliyle erişilir).

## 2. EC2 boyutlandırma ve maliyet (on-demand, x86)

| Makine | İçerik | Önerilen tip | RAM | Aylık maliyet |
|---|---|---|---|---|
| A | container + field (2× PG, 2× Redis, 5 servis) | `m6i.large` | 8 GB | ≈ $70 |
| B | boss | `t3.medium` | 4 GB | ≈ $30 |

Toplam ≈ **$100/ay** + EBS. (Tek 16GB makine alternatifi: ≈ $121-140/ay — bölünmüş yapı hem ucuz hem üretim topolojisine birebir.)

**Neden A 8GB:** container PG §8.3 edge profili (`shared_buffers=768MB`, `effective_cache_size=5GB`, `synchronous_commit=off`) + `web-service mem_limit 1g` ile toplam çalışma seti ≈ 6.5GB. Mevcut prod compose'taki 4GB/12GB "sunucu profili" 8GB makinede OOM yapar — AWS compose'ları §8.3 değerleriyle yazıldı (bkz. `deployment/STORAGE-ESTIMATE.md` §8).

**EBS:** A için 100GB gp3 (1 yıllık plan: 1TB — STORAGE-ESTIMATE §6), B için 30GB gp3.

## 3. Güvenlik grupları

| Makine | Port | Kaynak | Amaç |
|---|---|---|---|
| A | 22 | ofis IP | SSH |
| A | 80 | opsiyonel (ofis IP / B SG) | container UI doğrudan erişim (tünel dışı) |
| A | 88 | opsiyonel | field UI doğrudan erişim |
| B | 22 | ofis IP | SSH |
| B | 80 | ofis IP | boss UI (üst yönetim) |
| B | 5003 | **yalnızca A'nın IP'si/SG'si** | field uplink WS |

Postgres/Redis host portları `127.0.0.1`'e bağlı — kamuya açık değil; SG'de yer almaz.

## 4. Kurulum adımları

Her iki makinede:

```bash
# 1. Docker + compose plugin (Ubuntu 24.04 örneği)
sudo apt-get update && sudo apt-get install -y docker.io docker-compose-v2 git
sudo usermod -aG docker $USER   # yeniden giriş gerekir

# 2. Repo (bind mount'lar repo-relative — yol korunmalı)
git clone <repo-url> ~/gd-pms-monorepo && cd ~/gd-pms-monorepo

# 3. Env üretimi — YEREL dosyalardaki sırları ASLA kopyalamayın, yeniden üretin:
#    Makine A (deployment/.env.aws-edge):
#      JWT_SECRET / FIELD_JWT_SECRET / CONTAINER_TOKEN / FIELD_UPLINK_TOKEN: openssl rand -hex 32
#      SEED_*: >=8 karakter
#      FIELD_ID: uuidgen
#      FIELD_UPLINK_WS_URL: ws://<B_EC2_IP>:5003/ws/field
#    Makine B (deployment/.env.aws-boss):
#      JWT_SECRET + SEED_*
```

### 4.1 Boss önce kalkar (Makine B)

```bash
bun run start:aws-boss    # build + up
docker ps --format '{{.Names}} {{.Status}}' | grep aws-boss
curl -s http://localhost:5003/health
```

### 4.2 Token kayıtları (sıra serbest — outbound + backoff)

1. **Field uplink token'ı boss'a kaydet:** boss UI / API üzerinden saha kaydı —
   `POST /api/admin/fields` body'sine `uplinkToken` olarak Makine A'daki
   `FIELD_UPLINK_TOKEN` düz metni verilir (boss yalnızca SHA-256 hash saklar).
2. **Konteyner token'ını field'a kaydet — UI ile:** field UI
   (`http://<A_IP>:88`) → admin girişi → **Konteynerler** sayfası →
   **"Konteyner Kaydet"** → Konteyner Kimliği (`container-1`) + Service Token
   (`CONTAINER_TOKEN` düz metni) → Kaydet. Form `POST /api/fields/:fieldId/containers/:containerId/register`
   çağırır; field yalnızca SHA-256 hash saklar. (Alternatif: aynı endpoint curl ile.)

Not: Servis başlatma sırası zorunlu DEĞİL — her iki bağlantı da outbound ve
register reddedilirse otomatik backoff ile yeniden denenir; kayıt yapılınca
ilk retry bağlanır. Sıra yalnızca "kayıtları register denemelerinden önce
bitirme" konforu içindir.

### 4.3 Edge kalkar (Makine A)

```bash
bun run start:aws-edge     # build + up
docker ps --format '{{.Names}} {{.Status}}' | grep aws-
curl -s http://localhost:5001/health
curl -s http://localhost:5002/health
docker logs aws-container-device-service | grep "Cihaz tablosu hazir"
```

Bilinen tuzak: device-service PG bağlantısı `config-docker/service.json`'daki
hardcoded `timescaledb` host'unu kullanır — AWS compose'da `container-timescaledb`
servisine `timescaledb` network alias'ı verilmiştir (compose içi yorum; alias
kaldırılırsa `DNSException: ENOTFOUND` alınır).

## 5. Doğrulama kontrol listesi

- [ ] `docker ps`: 10 servis (A) / 5 servis (B) sağlıklı
- [ ] Boss UI: `http://<B_IP>:80` → admin girişi (MFA KAPALI — demo; TOTP adımı yok)
- [ ] Boss'ta saha listesi: field "online" (uplink register-ack)
- [ ] Boss → field UI tüneli: `/fields/<FIELD_ID>/ui` (field SPA)
- [ ] Field UI → konteyner UI tüneli: `/containers/<CONTAINER_ID>/ui`
- [ ] Konteyner telemetri: boss/field UI'da canlı seriler + tarihsel grafik
- [ ] Konteyner alarmı: device_alarm logu → field → boss olay aktarımı (Faz 5)

## 6. Yedekleme (FLAG)

Compose'larda DB yedekleme mekanizması yok. Demo için kabul; üretimden önce:
A'da `container-timescaledb` için günlük `pg_dump`/WAL arşiv + EBS snapshot
politikası kurulmalı.

## 7. FLAG — üretim geçişi

- `FIELD_WS_URL` / `FIELD_UPLINK_WS_URL` → `wss://` (ALB/nginx + ACM sertifikası).
- Boss UI (80) → HTTPS terminate (ALB).
- **MFA:** demo'da `MFA_ENABLED=false` (TOTP kapalı) — üretimde `true`
  (admin/teknik için zorunlu kayıt).
- WireGuard yedek yol etkinleştirilecekse `web-service` Dockerfile'ında
  `wg-quick` bulunmalı; compose'da `cap_add: NET_ADMIN` + `/dev/net/tun`
  hazırdır (şu an `WG_CLIENT_PRIVATE_KEY` boş → modül kapalı).
