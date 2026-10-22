---
status: active
space: process
tags: [runbook, demo, hub, ws-tunnel, e2e, operasyon]
review_date: 2026-10-22
---

# Demo Stack İşletim Runbook'u (hub/peer modeli)

> **Amaç:** v2/dev demo stack'ini (container-1 + container-2 + field) hub/peer mimarisiyle
> ayağa kaldırma, doğrulama ve arıza giderme adımları. Tunnel birleşmesinden (2026-10-21)
> sonra `register-container.sh` / `register:demo-integration` **YOKTUR** — konteynerler
> `HUB_PEER_TOKEN` ile hub'a peer olarak otomatik bağlanır.
> **İstasyon/fider modeli** hub'da değil, EMS domain'indedir: `GET /api/fields/:id/topology`.

## 1. Ön koşullar

- Bun **1.4.3** (`bun --version`), Docker + Compose v2.
- Hub/agent imajları (compose `HUB_IMAGE`/`AGENT_IMAGE` ile bekler):
  ```bash
  docker build -f packages/ws-tunnel-hub/Dockerfile -t ws-tunnel-hub:local .
  docker build -f packages/ws-tunnel-agent/Dockerfile -t ws-tunnel-agent:local .
  ```
- Env dosyaları (gitignore'lu; şablonları `.env.example`):
  - `deployment/v2/dev/field/.env`: `HUB_PEER_TOKEN`, `HUB_CONSUMER_TOKEN`, `FIELD_TOPOLOGY_PATH` (compose sabitler).
  - `deployment/v2/dev/container{,_2}/.env`: `HUB_PEER_ENABLED=true`, `HUB_PEER_URL=ws://hub-servis:5003/ws/peer`,
    `HUB_PEER_TOKEN=<field ile AYNI>`, `CONTAINER_ID=container-1|container-2`.
  - Eski `FIELD_CONNECT_ENABLED` / `FIELD_WS_URL` / `CONTAINER_TOKEN` bu modelde kullanılmaz.

## 2. Stack'i kaldırma / durdurma

```bash
bun run start:demo-integration   # 3 compose: container + container2 + field (hub, agent dahil)
bun run stop:demo-integration
```

Sağlık ve bağlantı kontrolü:

```bash
curl -s http://localhost:5009/health              # hub
curl -s http://localhost:5009/peers | jq '.peers[].peerId'   # container-1, container-2, demo-field-agent
curl -s http://localhost:5002/health              # field web-service
curl -s http://localhost:8088/login -o /dev/null -w '%{http_code}\n'
```

Beklenen: hub `200`, iki konteyner `connected`, field `200`, SPA `200`.
**Register adımı yok** — peer görünmüyorsa `HUB_PEER_TOKEN` iki tarafta aynı mı kontrol et.

## 3. İstasyon topolojisi (EMS domain)

- Kaynak: `deployment/v2/dev/field/topology.json` → web-service'te `FIELD_TOPOLOGY_PATH=/app/config/topology.json`.
- Uç: `GET /api/fields/:fieldId/topology` (Bearer token).
- İçerik: istasyonlar (`key`, `name`), iki fider (`feeders.A/B` + `cell` + `units`), `units`,
  `containers` (hub peer id'leri), `pcs` çifti, `mvDeviceId`.
- Doğrulama:
  ```bash
  PW=$(grep -E '^SEED_ADMIN_PASSWORD=' deployment/v2/dev/field/.env | cut -d= -f2-)
  FT=$(curl -s -X POST http://localhost:5002/api/auth/login -H 'Content-Type: application/json' \
       -d "{\"username\":\"admin\",\"password\":\"$PW\"}" | jq -r .accessToken)
  FID=$(grep -E '^FIELD_ID=' deployment/v2/dev/field/.env | cut -d= -f2-)
  curl -s -H "Authorization: Bearer $FT" "http://localhost:5002/api/fields/$FID/topology" | jq .
  ```
- Beklenen: `bess1` (BESS#1–9, container-1, PCS-1/2, DEMO-MV-1) ve `bess2` (BESS#10–18, container-2, PCS-3/4, DEMO-MV-2).

## 4. Doğrulama komutları

```bash
bun run test                     # tüm unit/component/integration (Vitest workspace)
bun run test:demo-integration    # gerçek stack entegrasyonu (API üzerinden)
# Playwright demo veri spec'leri (chromium; firefox/webkit imajları kurulu değil):
E2E_ADMIN_PASSWORD=password1234 bunx playwright test --project=chromium \
  e2e/demo-operations-data.spec.ts e2e/demo-maneuver-data.spec.ts \
  e2e/demo-operations-edge.spec.ts e2e/demo-target-soc.spec.ts \
  e2e/demo-device-data.spec.ts e2e/demo-faults.spec.ts e2e/demo-protection.spec.ts
```

Beklenen (2026-10-22): `bun run test` → 317 dosya / **2602 test**;
`test:demo-integration` → **108/108**; demo SPA'da istasyon geçişi + topology render.

## 5. Arıza giderme (dün karşılaşılanlar)

| Belirti | Neden | Çözüm |
|:--|:--|:--|
| device-service OOM / job'lar işlenmiyor | Demo Redis `maxmemory 256mb` + `noeviction` doldu | `for c in demo-field-redis demo-container-redis demo-container2-redis; do docker exec $c redis-cli FLUSHALL; done` + servisleri restart |
| `8088 /api` → `connect() failed (111) upstream 172.21.0.x` | nginx statik `proxy_pass` eski IP'yi önbelleğe aldı (backend recreate) | Düzeltme Dockerfile'da: `resolver 127.0.0.11 valid=10s ipv6=off;` + `set $backend ...; proxy_pass $backend;`. Acil: `docker restart demo-field-web` |
| BSC `charge` çalışmıyor, SOC sabit | BSC NORMAL değil (EMERGENCY) veya prep yok | `standby` operasyonu (pcs_standby + bsc_stop) → gerekirse `bsc_recovery`; demo operasyonları `bsc_prepare` içerir |
| `bsc_stop` 422 (CURRENT_FLOWS) | PCS gücü 0 olduktan sonra connector tick'i beklenmedi | PCS `standby/stop` komutlarında `minWaitMs: 1200` (config) |
| PCS durumu `fault`/`off`, telemetri 0 | MV fideri açık (GridLink de-enerjili) | İlgili istasyonun MV'sinde feeder hücresini kapat (`H04_close`/`H05_close`) |
| Testler SOC üst sınırda takılıyor | Önceki koşulardan SOC %97'de | Debug inject `soc:50` (BSC) — `normalizeStack` bunu otomatik yapar |
| Fault kuralı sürekli emergency basıyor | Kapı/IMD enjeksiyonu temizlenmemiş | Debug inject: `CONTROL-PANEL-IO-1/battery_door_close`, `IMD-1/healthy`; sonra `standby` |

Debug injection uçları: container `15590`, container2 `15592` (dev'de yayınlı), field `15591`.

## 6. Dün koşulan komutların özeti (kronoloji)

1. Seçmeli cherry-pick (`8b4fb71`) + v1/aws-demo/SIM config dışlamaları.
2. Config kaynağı ayrımı (`configs/` production-only + `configs/sim/*`), BSC Rev AF hizası, drift kuralları.
3. Simülatör sözleşmesi (`ISimulator`), PCS→BSC güç linki (SOC formülü + connector + `powerScale`), GridLink.
4. İstasyon entegrasyonu: 2×9 ünite, istasyon başına MV, PCS eşleşmesi, UI seçici/trend/KPI/ops.
5. Demo stack + entegrasyon/e2e koşuları; bu sırada düzeltilenler: Redis OOM, eksik `.env` token/WS URL, PCS↔BSC hedef karışıklığı, `bsc_prepare`, `minWaitMs`, nginx resolver.
6. Tunnel branch main'e alındı (bun 1.4.3, bun-serialport, hub/agent); ardından demo-entegrasyon main ile birleştirildi ve **topoloji EMS endpoint'ine** taşındı (register kaldırıldı).

## 7. Bilinen sınırlar

- `aws-demo` tier'ı tunnel birleşmesiyle kaldırıldı; yalnız `v2/dev` stack'i vardır.
- Playwright firefox/webkit imajları kurulu değil; CI kapsamı chromium.
- ws-tunnel paketleri domain-agnostiktir — istasyon/konteyner iş mantığı oraya eklenmez.
