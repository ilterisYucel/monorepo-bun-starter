# AWS Deployment Runbook (demo)

**Kapsam:** container + field + boss tier'larının AWS EC2 üzerinde ayağa kaldırılması.
**Durum:** DEMO — TLS'siz `ws://` kabulüyle (FLAG; üretim geçişi §7'de).

> **Tek makine demo-edge (boss YOK, m6i.large):** §8 — `deployment/aws/demo-edge/`
> standalone stack (container+field + demo-field UI). Boss/uplink gerektirmez.

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

1. **Field uplink token'ı boss'a kaydet — UI ile:** boss UI (`http://<B_IP>:80`)
   → admin girişi → Sahalar → **"Saha Ekle"** formu:
   - **Saha Kimliği (UUID):** Makine A'daki `FIELD_ID` (boş bırakılırsa boss
     kendi UUID üretir ve uplink register'ı EŞLEŞMEZ — doldurulmalı).
   - **Uplink Token:** Makine A'daki `FIELD_UPLINK_TOKEN` düz metni (>=32;
     boss yalnızca SHA-256 hash saklar).
   - Alternatif: `POST /api/admin/fields` body `{ id, name, uplinkToken }`.
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
- [ ] Boss → field UI tüneli: `/fields/<FIELD_ID>/ui` (field SPA — asset'ler yüklenir, beyaz ekran/MIME hatası YOK; index.html'de `/fields/<FIELD_ID>/ui/assets/` yolları olmalı)
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

## 8. Demo-Edge — standalone (tek makine, m6i.large, boss YOK)

`deployment/aws/demo-edge/` container+field tier'larını **tek compose projesinde**
(`aws-edge-stack`) çalıştırır; boss ve uplink YOKTUR. UI: `apps/demo-field`
(nginx, `:88`). TLS yok (`ws://` + HTTP), MFA kapalı — demo kabulü.

### 8.1 EC2 / güvenlik grubu
- Tip: **m6i.large** (2 vCPU / 8GB), EBS gp3 100GB.
- SG: **22** (ofis IP), **88** (demo UI; demo boyunca açık).
- Açılmaz: 5432/5434 (PG), 6379/6381 (Redis) — host `127.0.0.1`'e bağlı;
  5001/5002/5003 — yalnızca network içi.
- Mem bütçesi: compose `mem_limit` toplamı ≈ 6.9GB → 8GB'a sığar (container PG 2g,
  diğer servisler 128–512m).

### 8.2 Kurulum
```bash
sudo apt-get update && sudo apt-get install -y docker.io docker-compose-v2 git
sudo usermod -aG docker $USER   # yeniden giriş
git clone <repo-url> ~/gd-pms-monorepo && cd ~/gd-pms-monorepo

# Env (SIRLAR repo'ya girmez — makinede üret):
cp deployment/.env.aws-edge.example deployment/aws/demo-edge/.env
#  doldur: JWT_SECRET, FIELD_JWT_SECRET, SEED_* (>=8), FIELD_ID (uuidgen),
#          CONTAINER_TOKEN (openssl rand -hex 32), FIELD_INTERNAL_API_TOKEN
#  standalone demo: FIELD_UPLINK_ENABLED=false, MFA_ENABLED=false

# EPİAŞ kimlikleri (gitignored — makinede oluştur):
cp deployment/aws/demo-edge/plugins/epias-market-prices.example.json \
   deployment/aws/demo-edge/plugins/epias-market-prices.json
#  username/password doldur; intervalMs=300000 önerilir.

# Ayağa kaldır (EC2'de build — tek seferlik, 2 vCPU'da ~10-20 dk):
docker compose --env-file deployment/aws/demo-edge/.env \
  -f deployment/aws/demo-edge/docker-compose.yml up -d --build
```

### 8.3 Doğrulama (API smoke)
```bash
# Konteyner token kaydı + bağlantı doğrulaması (tek komut, renkli çıktı):
tools/register-container.sh --env deployment/aws/demo-edge/.env --url http://localhost:88

B=http://localhost:88
TOKEN=$(curl -s -X POST $B/api/auth/login -H 'content-type: application/json' \
  -d '{"username":"admin","password":"<SEED_ADMIN_PASSWORD>"}' | \
  python3 -c 'import sys,json;print(json.load(sys.stdin)["accessToken"])')

curl -s $B/ | grep -o '<title>[^<]*</title>'                 # → GD-PMS — ÜNSAL DGES
curl -s -H "authorization: Bearer $TOKEN" "$B/api/data/PCS-1/latest?limit=5" | head -c 200
# charge: 200 + status "completed" (rolled_back İSE: FIELD_CONNECT_ENABLED/CONTAINER_TOKEN)
curl -s -X POST "$B/api/operations/charge/execute" -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' -d '{"params":{"powerKw":100}}'
curl -s -H "authorization: Bearer $TOKEN" "$B/api/unified/alarms"                 # {"alarms":[...]}
curl -s -H "authorization: Bearer $TOKEN" \
  "$B/api/unified/timeseries/external?source=epias&series=ptf&limit=5"            # points dolu
```
- `rolled_back` görülürse: konteyner field'a bağlanmamıştır →
  `.env` `FIELD_CONNECT_ENABLED=true` + `CONTAINER_TOKEN` dolu mu, container
  token'ı field'a kayıtlı mı kontrol et (§4.2) — yani `tools/register-container.sh`.
- **`relation "devices" does not exist` / Faults boş:** merged AWS network'ünde
  `timescaledb` alias'ı YALNIZCA `container-timescaledb`'de tanımlıdır. Bu yüzden
  `field-device-configs/service.json` → `postgresql.host` **`field-timescaledb`**
  olmalıdır (`timescaledb` kalırsa field-device-service yanlışlıkla konteyner
  DB'sine yazar → field `devices`/`device_alarms` oluşmaz). Değiştirdikten sonra:
  `docker compose ... up -d --force-recreate field-device-service`.
- Konteyner management-service kural ÇALIŞTIRMAZ (demo no-op rules) — gerçek
  kural seti test edilmeden aktive edilmez.

### 8.4 FLAG (demo kabulü)
- `ws://` (TLS'siz) + `:88` HTTP; MFA kapalı; DB yedekleme yok.
- Üretim geçişi: §7 (TLS/ACM, MFA=true, yedekleme) + field/kontrol kuralları.
