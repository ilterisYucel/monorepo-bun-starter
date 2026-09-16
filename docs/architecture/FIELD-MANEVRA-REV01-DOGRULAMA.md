---
status: active
space: architecture
tags: [dogrulama, field, manevra, rev01, device-service, compose, panel, connector]
review_date: 2026-09-16
---

# Field Manevra Kataloğu REV.01 — DOGRULAMA

> **İş akışı aşaması:** 5/6 — SONUÇ (T-M3 panel + T-M4 compose kapanışı).
> **SPEC:** [FIELD-MANEVRA-KATALOGU-REV01-MIMARISI.md](./FIELD-MANEVRA-KATALOGU-REV01-MIMARISI.md) §10 (T-M3, T-M4), §8 (stack wiring).

## 1. Değişiklik Matrisi

| # | Değişiklik | Satır referansı | Neden |
|:--|:-----------|:----------------|:------|
| C1 | `PCS_BMS_TARGET_HOST/PORT` config tanımları | `packages/shared-utils/src/config/definitions.ts` (`deviceBmsTargetHost/Port`) | BSC→PCS connector hedefi deployment-bazlı olmalı (aws-edge: field-device-service, standalone: host.docker.internal) |
| C2 | `SimulatorRegistry` bmsTarget override | `services/device-service/src/simulator-registry.ts` (constructor + bsc-pcs-connector build) | mapping target'ını ezme; verilmezse davranış AYNEN |
| C3 | device-service run.ts env wiring | `services/device-service/run.ts` | ConfigLoader → registry |
| C4 | `fromConfigDir` options uzantısı | `services/device-service/src/device-service.ts:129` | bmsTarget iletimi |
| C5 | Panel gerçek yürütme (T-M3) | `apps/field/src/features/field-control/components/FieldManeuverPanel.tsx` | mockExecute/mockContainers KALDIRILDI; PCS adımları gerçek execute-multi'ye |
| C6 | `fieldControlApi` (yeni) | `apps/field/src/features/field-control/services/fieldControlApi.ts` | field web-service /commands/execute-multi istemcisi |
| C7 | i18n: `container.noPcs` | `apps/field/src/i18n/{tr,en}.ts` | boş hedef set durum mesajı |
| C8 | field.dev.yml: web-service config-field mount + DEVICE_CONFIG_DIR | `deployment/docker-compose.field.dev.yml` | **kritik hata:** önceki değer konteyner PCS config'ine bakıyordu (yanlış register map) |
| C9 | field.dev.yml + field.yml: device-service PG env + `15502:15502` | `deployment/docker-compose.field.{yml,dev.yml}` | alarm state tablosu + standalone'da connector erişimi |
| C10 | container.yml/.dev.yml: `PCS_BMS_TARGET_*` + device-service extra_hosts | `deployment/docker-compose.container.{yml,dev.yml}` | standalone connector hedefi |
| C11 | aws-edge.yml: **+field-device-service, +field-management-service** (yeni), field-web-service DEVICE_CONFIG_DIR + token, container-device-service hedef env'i | `deployment/docker-compose.aws-edge.yml` | field tier servis katmanı AWS'de YOKTU |
| C12 | env şablonları | `.env.container.example`, `.env.aws-edge.example` | yeni değişkenler yorumlu |

## 2. Test Kanıtları

```
nx run shared-utils:test     → 18 test YEŞİL (+bmsTarget tanımları)
nx run device-service:test   → 89 test YEŞİL (+simulator-registry-bms-target.test.ts 4 test)
nx run field:test            → 25 dosya / 158 test YEŞİL
  +fieldControlApi.test.ts (2)
  +FieldManeuverPanel.test.tsx (4 — gerçek yürütme kontratı)
docker compose config (5 dosya, dummy env'lerle) → OK
```

## 3. Kabul Kriteri Kanıtları

| Kod | Kriter | Kanıt |
|:----|:-------|:------|
| K-M3 | Panel PCS adımlarını execute-multi'ye çözümlenmiş gönderir; kısmi başarısızlık → failed + Tekrar Dene; API hatası yutulur | `FieldManeuverPanel.test.tsx` 4 senaryo |
| K-M6 | Field compose'da device-service + PCS config'ler çalışır | field/field.dev/aws-edge compose'larında field-device-service + config-field mount + PG env; `docker compose config` OK |
| K-C1 | Connector hedefi deployment-bazlı override edilebilir; override yoksa davranış değişmez | `simulator-registry-bms-target.test.ts` 4 senaryo |

## 4. Gözle Kontrol

- [x] `docker compose config` 5 dosyada geçerli (eksik env'ler yalnızca zorunlu değişken uyarısı).
- [x] field web-service komut çözümlemesi artık config-field'a bakar (konteyner PCS config'i DEĞİL — register map karışması giderildi).
- [x] aws-edge'de üç field servisi (device-service, management-service, web-service) tek edge-network'te; connector `field-device-service:15502`'ye bağlanır.
- [x] Standalone'da field device-service BMS portunu host'a açar (15502); container device-service `host.docker.internal` üzerinden ulaşır (extra_hosts eklendi).
- [x] Panel mock bağımlılığı tamamen kaldırıldı (mockContainers importu yok).

## 5. Sapmalar

| Sapma | Açıklama |
|:------|:---------|
| S1 | Boss tarafı değişmedi — uplink mevcut env tasarımıyla (`.env`'de FIELD_UPLINK_*); koşumda elle doğrulanır |
| S2 | Panel yalnızca PCS adımları üretir — konteyner cihaz adımları REV.01 katalogda yok; gerektiğinde `containersApi.executeCommands` (D5) hazır |
| S3 | `config-field/service.json` bayat (device-service artık ConfigLoader/env tabanlı) — kaldırılmadı, zararsız; temizlik ileride |

## 6. Genel Durum

T-M3 + T-M4 kapandı: field stack (dev/standalone/aws) device-service + management-service ile tam katmanlı çalışır durumda; panel gerçek komut hattına bağlı; connector hedefi üç deployment'ta env ile yapılandırılabilir. `review_date: 2026-09-16`.

## 7. Canlı Koşum Gözlemleri (2026-09-16 — 1 konteyner + 1 field + 1 boss .dev)

| # | Gözlem | Sonuç |
|:--|:-------|:------|
| G1 | Üç stack (`dev:all`) ayağa kalktı; konteyner → field `field_connected` (peerId=container-1), field → boss `field_connected` (peerId=FIELD_ID) | ✅ |
| G2 | BSC→PCS connector: `host.docker.internal:15502` erişimi + `Connector Link Status=1`, fail=0, write artıyor (restart sonrası bayat snapshot temizlendi) | ✅ |
| G3 | Field PCS komutu uçtan uca: `POST /api/commands/execute-multi` (PCS-1 stop) → `success:true, validated:true`; bilinmeyen cihaz → temiz 422 reason | ✅ |
| G4 | Çapraz yığın: `POST /api/fields/:f/containers/container-1/commands` (BSC-1 stop) → `success:true, validated:true`; field audit'inde `field_container_command` + konteyner audit'inde `command_executed` **AYNI traceId** | ✅ |
| G5 | **BUG:** `field_container_command` eventCode'u platform sözlüğünde YOKTU → TamperLogger fail-closed sessizce reddetti (audit loglanmıyordu). Düzeltme: `packages/platform/logging/src/event-codes.ts` + test | ✅ düzeltildi |
| G6 | **BUG:** container.dev.yml web-service env'leri sert kodluydu (`dev-secret-change-in-production` + default seed `admin123`) — field/boss ile tutarsızdı. Düzeltme: env konvansiyonu (`JWT_SECRET` + `SEED_*` .env.container'dan) | ✅ düzeltildi |
| G7 | R-06 kuralı stack açılışında kendiliğinden ateşlendi (E-stop=0 başlangıç → fault_reset + standby — komutlar device-service'te yürütüldü) | ✅ |
| G8 | container web-service yeniden başlatılınca TunnelConnector otomatik yeniden bağlandı (`field_connected`) | ✅ |

**Notlar:** G5/G6 düzeltmeleri DOGRULAMA'ya işlendi; dev compose'lara `platform/logging` src mount'u eklendi (hot-reload). Boss e2e kapsam dışı tutuldu.

## 8. Entegrasyon + E2E Kanıtları (2026-09-16 — manevra test stratejisi)

### 8.1 Integration spec'leri (vitest — Docker/Redis YOK)

| # | Spec | Kapsam | Sonuç |
|:--|:-----|:-------|:------|
| I-1 | `services/device-service/src/maneuver-command.spec.ts` (7 test) | Gerçek DeviceService + SimulatorRegistry + config'ler + test-local mq: BSC stop/open_contactors, CB open, HVAC force_cool, io-panel ışık, PCS forbid/allow — yazım + read-back doğrulama | ✅ |
| I-2 | `services/web-service/src/presentation/routes/field-container-command.spec.ts` (4 test) | Çapraz yığın: gerçek WS loopback (ContainerProxy+Gateway+TunnelProxy ↔ TunnelConnector+TunnelClient) + D3 route + upstream vekili: komut → doğrulanmış sonuç + trace başlığı | ✅ |
| I-3 | `services/management-service/src/ppc-rule.spec.ts` (4 test) | PPC zinciri: synthetic telemetri → snapshot → RuleEvaluator → container-command kanalı (0/2 tetikler, 1 tetiklemez, kenar-tetik, kanal fail kademeli) | ✅ |

### 8.2 E2E spec'leri (Playwright — .dev stack üzerinde, workers=1)

| # | Spec | Sonuç |
|:--|:-----|:------|
| E-1 | `e2e/field-maneuver.spec.ts` (YENİ — FL-05 + FL-03, gerçek PCS komutu, success durumu) | ✅ |
| E-3 | `e2e/cross-stack-command.spec.ts` (YENİ — D3 route → BSC-1 stop → field audit) | ✅ |
| E-2 | `e2e/maneuver-ui.spec.ts` (tamamlanma kanıtı eklendi) | ✅ |
| — | `e2e/field-flow.spec.ts` (K5.1) | ✅ |

### 8.3 Koşumda yakalanan ve düzeltilen hatalar

| # | Hata | Düzeltme |
|:--|:-----|:---------|
| G9 | **Boolean validate sözleşmesi:** `expectHolds(true, 1)` tutmuyordu — CB open / DC on / io-panel ışıkları PROD'da asla validated olamazdı (decoder sayısal 0/1 üretir, config boolean bekler) | `packages/shared-types/src/commands/validate-expect.ts` — 0/1 ↔ boolean sınır eşlemesi + testler |
| G10 | Tünel base modunda form girişi İMKANSIZDI (`persistTokens` tünel modunda no-op — Boss Faz 3 izolasyonu); field.dev compose `VITE_TUNNEL_BASE`'i koşulsuz setliyordu → standalone dev/e2e kilitli | `VITE_TUNNEL_BASE` env-controllable (varsayılan boş = "/" base); boss demosu env ile açar. Vite proxy'ye `/fields` rewrite+bypass kuralı eklendi; tunnel `/login` rotası eklendi |
| G11 | BMS port testleri SABİT 15502'ye bağlanıyordu → .dev stack ayaktayken port çakışması → suite kilitleniyor | testler `port: 0` (ephemeral) — `tcp-target.test.ts` + `bms-port-server.test.ts` |
| G12 | container.dev.yml web-service env'leri sert kodluydu (G6) | env konvansiyonu (JWT_SECRET + SEED_* .env.container'dan) |
| G13 | Bayat e2e seçicileri: container login input name'leri kaldırılmış, field-flow /frame rotası overlay'e dönmüş, Grafikler sayfası kaldırılmış, session audit eventCode değil mesaj render ediliyor | ilgili spec'ler güncellendi |

### 8.4 Çalıştırma

```bash
bun run test          # 214 dosya / 1884 test (integration spec'leri dahil — stack'lerle ÇAKIŞMAZ)
FIELD_ID=<uuid> bunx playwright test --project=chromium --workers=1   # stack'ler up iken
```
CI: `.github/workflows/e2e.yml` — container.dev + field.dev stack'leri + curl ile kayıt/şifre adımı + chromium.
