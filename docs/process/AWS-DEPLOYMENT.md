# AWS Deployment Runbook (demo)

**Kapsam:** container + field + boss tier'larının AWS EC2 üzerinde ayağa kaldırılması.
**Durum:** DEMO — TLS'siz `ws://` kabulüyle (FLAG; üretim geçişi §7'de).

> **Tek makine demo-edge (boss YOK, m6i.large):** §8 — `deployment/v2/aws/`
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
#    Makine A (deployment/v1/aws/{container,field}/.env — her app kendi .env'i):
#      container: JWT_SECRET / CONTAINER_TOKEN: openssl rand -hex 32
#      field:     FIELD_JWT_SECRET / FIELD_UPLINK_TOKEN: openssl rand -hex 32
#      SEED_*: >=8 karakter (her iki tier)
#      FIELD_ID: uuidgen (field)
#      FIELD_UPLINK_WS_URL: ws://<B_EC2_IP>:5003/ws/field (field)
#    Makine B (deployment/v1/aws/boss/.env):
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

`deployment/v2/aws/` container+field tier'larını **iki ayrı compose projesi** olarak
(`v2-aws-edge-container` + `v2-aws-edge-field`; ortak `v2-aws-edge-network`) çalıştırır;
boss ve uplink YOKTUR. UI: `apps/demo-field` (nginx, `:88`). TLS yok (`ws://` + HTTP),
MFA kapalı — demo kabulü.

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

# Env (SIRLAR repo'ya girmez — makinede üret; her app kendi .env'ini taşır):
cp deployment/v2/aws/container/.env.example deployment/v2/aws/container/.env
cp deployment/v2/aws/field/.env.example     deployment/v2/aws/field/.env
#  container: JWT_SECRET, CONTAINER_TOKEN (openssl rand -hex 32), SEED_*
#  field:     FIELD_JWT_SECRET, FIELD_ID (uuidgen), SEED_*, FIELD_INTERNAL_API_TOKEN
#  standalone demo: FIELD_UPLINK_ENABLED=false, MFA_ENABLED=false

# EPİAŞ kimlikleri (gitignored — makinede oluştur):
cp deployment/v2/aws/field/plugins/epias-market-prices.example.json \
   deployment/v2/aws/field/plugins/epias-market-prices.json
#  username/password doldur; intervalMs=300000 önerilir.

# Ayağa kaldır (EC2'de build — tek seferlik, 2 vCPU'da ~10-20 dk):
#  ÖNCE container (ortak ağı tanımlar), SONRA field:
docker compose --env-file deployment/v2/aws/container/.env \
  -f deployment/v2/aws/container/docker-compose.yml up -d --build
docker compose --env-file deployment/v2/aws/field/.env \
  -f deployment/v2/aws/field/docker-compose.yml up -d --build
```

### 8.3 Doğrulama (API smoke)
```bash
# Konteyner token kaydı + bağlantı doğrulaması (tek komut, renkli çıktı):
tools/register-container.sh --env deployment/v2/aws/field/.env \
  --container-env deployment/v2/aws/container/.env --url http://localhost:88

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
- **Trend grafikleri boş (Network'te 0 B / status yok):** downsampled sorgusu
  `names` filtresi olmadan tüm isimler için dev sorgu üretir → 60 sn
  `statementTimeoutMs` aşılır. Güncel SPA sorguyu
  `names=Battery Pack SOC,Grid Active Power,Highest Cell Temperature` ile yapar;
  boşsa `field-web` imajı güncel mi (repo'da bu değişiklik var mı) kontrol et ve
  `docker compose ... build field-web && up -d field-web`. Ayrıca compose'da
  `field-timescaledb` `mem_limit 1g` + `shared_buffers 384MB` olmalı.
- Konteyner management-service kural ÇALIŞTIRMAZ (demo no-op rules) — gerçek
  kural seti test edilmeden aktive edilmez.
- **Standby sonrası SOC durmuyor / mod "Charging" kalıyor:** konteyner `bsc_stop`
  manevrası stop'tan ÖNCE charge/discharge setpoint'lerini 0'lar — yoksa BSC
  simülatörü "akım akarken stop"u reddeder (`CURRENT_FLOWS`), adım düşer ama
  field standby `onFailure: continue` ile "DONE" görünür. Config güncel mi:
  `deployment/v2/aws/container[2]/maneuvers/maneuvers.json` (`bsc_stop` 3 adım);
  değilse `git pull` + `docker compose ... restart c1-web-service c2-web-service`.
- **Availability 0/X (taze stack):** PCS `STOP` ile başlar; `register:aws-demo`
  sonunda otomatik FL-01 Start-Up PCS'i Standby'e alır. Atlandıysa UI ›
  Operations › FL-01 Start-Up.

### 8.4 FLAG (demo kabulü)
- `ws://` (TLS'siz) + `:88` HTTP; MFA kapalı; DB yedekleme yok.
- Üretim geçişi: §7 (TLS/ACM, MFA=true, yedekleme) + field/kontrol kuralları.

### 8.5 Telemetri disk hacmi (retention + compression)

Demo-edge iki tier birden telemetri yazar; baskın hacim **BSC-1/2 ve PCS-1/2**'dir
(6 saatlik tek ham chunk ≈ 5.5 GB; iki tier toplamı ≈ **80 GB/gün**). EPİAŞ
`external_series` ihmal edilebilir (≈144 kB). 96 GB EBS'te retention/compression
olmadan disk ~1 günde dolar.

**Ayarlar** (`deployment/v2/aws/{container,field}/docker-compose.yml` + `deployment/v2/dev/{container,field}/docker-compose.yml`;
hem `*-data-service` hem `*-web-service`, her iki tier):
- `TIMESCALE_RETENTION_AFTER: "24 hours"` — chunk bu süreden sonra silinir.
- `TIMESCALE_COMPRESS_AFTER: "6 hours"` — chunk kapanınca sıkışır (chunk = 6s).

Retention artık `TimescaleDBAdapter.ensureTableExists` içinde kurulur (compression
ile aynı yerde) — böylece her tier'da ve yeni cihaz tablolarında otomatik uygulanır;
eski `index.ts` container-tier guard'ı field DB'sini atlıyordu. Beklenen sabit
boyut ≈ **10-15 GB** (raw 6-12s + sıkışık geri kalan).

**Mevcut stack'e uygulama (tek seferlik — politikaları düzelt + veriyi hemen geri kazan):**

```bash
cd ~/gd-pms-monorepo && git pull
docker compose --env-file deployment/v2/aws/container/.env \
  -f deployment/v2/aws/container/docker-compose.yml \
  up -d --build container-data-service
docker compose --env-file deployment/v2/aws/field/.env \
  -f deployment/v2/aws/field/docker-compose.yml \
  up -d --build field-web-service field-data-service

# Her iki DB: politikaları 24s/6s'e sabitle + >6s chunk'ları sıkıştır
for db in container field; do
  docker exec aws-$db-timescaledb psql -U postgres -d battery -c "DO \$\$ DECLARE r record; BEGIN
    FOR r IN SELECT hypertable_name FROM timescaledb_information.hypertables WHERE hypertable_name LIKE 'device_%' LOOP
      BEGIN PERFORM remove_retention_policy(r.hypertable_name::regclass, true); EXCEPTION WHEN OTHERS THEN NULL; END;
      PERFORM add_retention_policy(r.hypertable_name::regclass, INTERVAL '24 hours', true);
      BEGIN PERFORM remove_compression_policy(r.hypertable_name::regclass, true); EXCEPTION WHEN OTHERS THEN NULL; END;
      PERFORM add_compression_policy(r.hypertable_name::regclass, INTERVAL '6 hours', true);
      BEGIN EXECUTE format('SELECT compress_chunk(c, true) FROM show_chunks(%L, older_than => INTERVAL ''6 hours'') c', r.hypertable_name); EXCEPTION WHEN OTHERS THEN NULL; END;
    END LOOP; END \$\$;"
  docker exec aws-$db-timescaledb psql -U postgres -d battery -tAc "select pg_size_pretty(pg_database_size('battery'));"
done
df -h /
```

Yerelde aynı işlem sonucu: container **51 GB → 11 GB**, field **10 GB → 3.4 GB**.
Taze stack'te (>6 saat veri yoksa) sıkıştırma adımı no-op'tur; yalnızca politika
tesisi ileriyi sınırlar — bu durumda recreate yeterlidir.

### 8.6 Tek-compose varyantı — 2 konteyner + paylaşımlı TimescaleDB (önerilen)

8GB'ı verimli kullanmak için 3 ayrı TimescaleDB yerine **tek instance + tier başına
ayrı DB** ve **iki konteyner + bir field** tek compose'da çalışır:
`deployment/v2/aws/docker-compose.yml`.

- DB'ler: field → `battery`, container-1 → `container1`, container-2 → `container2`
  (`initdb/001-create-dbs.sql`; her DB'ye `timescaledb` uzantısı da kurulur — yoksa
  `create_hypertable` çalışmaz). Redis tier başına ayrı kalır.
- `device-service` PG'yi `device-configs/service.json`'dan okur (env override yok):
  c1→`container1`, c2→`container2`, field→`battery`; host `timescaledb`
  (field service.json `field-timescaledb` — paylaşımlı servis bu alias'ı taşır).
- Env tek dosyada, tier'a göre PREFİKSLİ: `FIELD_*`, `C1_*`, `C2_*`
  (`deployment/v2/aws/.env.example`). Kullanımdan önce `cp ... .env` + doldur.
- Mem: `mem_limit` toplamı ≈ **6.8GB** → 8GB'a sığar; EC2'de varsayılan swap YOK →
  **en az 2GB swapfile** önerilir.

```bash
cp deployment/v2/aws/.env.example deployment/v2/aws/.env   # doldur (FIELD_*, C1_*, C2_*)
docker compose --env-file deployment/v2/aws/.env -f deployment/v2/aws/docker-compose.yml up -d --build
bun run register:aws-demo     # container-1=bess1 + container-2=bess2 (tek çağrı; sonunda otomatik FL-01 Start-Up → PCS Standby, Availability dolu)
# UI: http://<host>:88  (field-web nginx → field-web-service)
```

İki ayrı compose (§8.2, `start:aws-demo-edge`) tek-konteynerli eski varyant olarak
korunur; iki konteyner + RAM tasarrufu için bu tek-compose tercih edilir.
Konteyner-1 SOC 50, konteyner-2 SOC 72 (`container2/device-configs/bsc-*.json`
`details.initialSocPercent`) ile başlar.

**Config senkronu (dev ↔ aws):** `aws/{field,container,container2}` config ağaçları
`dev`'in kopyasıdır; dev'de değişen cihaz config'i/manevra AWS'e de taşınmalıdır
(aksi halde eski davranış kalır — ör. field manevralarında `set_command_source`
adımı eksikse PCS simülatörü S01≠1 (HMI) iken start/stop/standby/setpoint
komutlarını **sessizce yok sayar** → Start-Up/Standby/Stop çalışmaz, Availability
0 kalır). Senkron dışı tutulan AWS'a ÖZGÜ deltalar:
- `*/device-configs/service.json` → redis host + tier DB (`battery` / `container1` / `container2`).
- `container/rules/rules.json` → demo no-op (dev'de gerçek TMS kuralları var).
Senkron komutu:
```bash
rsync -a --exclude='service.json' deployment/v2/dev/field/device-configs/     deployment/v2/aws/field/device-configs/
cp deployment/v2/dev/field/maneuvers/*.json                                   deployment/v2/aws/field/maneuvers/
rsync -a --exclude='service.json' deployment/v2/dev/container/device-configs/  deployment/v2/aws/container/device-configs/
rsync -a deployment/v2/dev/container/maneuvers/                               deployment/v2/aws/container/maneuvers/
rsync -a --exclude='service.json' deployment/v2/dev/container2/device-configs/ deployment/v2/aws/container2/device-configs/
rsync -a deployment/v2/dev/container2/maneuvers/                              deployment/v2/aws/container2/maneuvers/
```

