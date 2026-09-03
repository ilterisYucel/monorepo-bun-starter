# Platform Paket Yapısı Planı

> **Karar tarihi:** 2026-08-31 · **Durum:** Aşama 0-2 uygulanacak; Aşama 4-5 ayrı plan.
> **Amaç:** `packages/core` proje-bağımsız (başka şirkette başka projede yeniden kullanılabilir) kalmalı; GD-PMS'ye özgü kod `packages/platform/` altında toplanmalı.

## Neden? (araştırma özeti)

- **Nx resmi önerisi:** projeleri teknik türüne göre değil **scope'a (domain) göre grupla**; gruplama klasörü = sahiplik sınırı. Proje sayısı arttıkça düz `packages/*` yapısı anlamsızlaşır.
- **"Core" anti-paterni:** `core`/`shared` paketleri domain mantığı emmemeli. `core` herkesin kullandığı stabil çekirdek olmalı; domain kodu kendi scope paketine gider.
- **Backstage emsali:** `core-*` paketleri stabil framework sınırı; domain/plugin paketleri önekli ayrı paketler.
- **FSD/Nx DDD:** `scope:` + `type:` etiketleriyle `enforce-module-boundaries` (ayrı plan — Aşama 5).

## Core audit (2026-08-31)

| Genel (core'da kalır) | GD-PMS platform özgü (taşınır) |
|---|---|
| `errors/` (Result, DomainError) | `container-proxy/` → ✅ `platform/container-access` |
| `modbus/` (client, device, decoder, transport) | `tunnel/` → ✅ `platform/container-access` (ileride ayrı ürün) |
| `sql/` (postgres adapter) | JobType/DeviceJob kuyrukları → ✅ `platform/messaging` |
| `timeseries/` (ITimeseriesDatabase + adaptörler) | tier defaults → ✅ `platform/logging` |
| `canbus/`, `mqtt/` (stub) | olay sözlüğü (LOG_EVENT_CODES) → ✅ `platform/logging` |
| `messaging/redis.ts` + generic BullMQ katmanı | `shared-types` platform tipleri (Aşama 4 — ayrı plan) |
| `logging/` → ✅ AYRI JENERİK paket `packages/tamper-logger` (TamperLogger, pipeline, sink'ler, verifyChain, signing key — eventCode serbest string + validator enjeksiyonu) | |

Notlar:
- `container-proxy` core'da yalnızca **interface** içeriyordu; implementasyon web-service'te. Sözleşme platform paketine taşınır.
- `tunnel` ileride AYRI BİR ÜRÜN PAKETİ haline getirilecek — şimdilik `platform/container-access` içinde taşınır.
- `simulators`, `ui`, `epias-client`, `plugin-sdk`, `plugins/*` zaten ayrı paketler — yapı değişmez.

## Hedef yapı

```
packages/
  core/                      # JENERİK — başka şirkette kullanılabilir
  platform/
    messaging/               # PlatformMessageQueue + QUEUE_NAMES + retry haritası (JobType bilen TEK yer)
    container-access/        # IContainerProxy sözleşmesi + tunnel frame-codec/types
    logging/                 # TIER_LOGGER_DEFAULTS + loggerConfigForTier
  shared-types/              # şimdilik aynı; Aşama 4'te generic/platform ayrımı
  simulators/ ui/ epias-client/ plugin-sdk/ plugins/  # mevcut
```

Bağımlılık yönü (Aşama 5'te lint ile zorlanacak):

```
core → shared-types (genel kısımlar)
platform/* → core + shared-types
services/, apps/ → platform/* + core
core → platform  YASAK
```

## Aşamalar

| Aşama | İçerik | Durum |
|---|---|---|
| 0 | Generic `BullMQAdapter` + `BullMQQueue` (core) + `platform/messaging` (`PlatformMessageQueue`) + bootstrap geçişi | ✅ tamam (2026-08-31) |
| 1 | `platform/container-access`: container-proxy + tunnel taşıma | ✅ tamam (2026-08-31) |
| 2 | `platform/logging`: tier defaults taşıma | ✅ tamam (2026-08-31) |
| 2.5 | `packages/tamper-logger`: TamperLogger + pipeline + sink'ler + verify-chain core'dan AYRI JENERİK pakete çıkarıldı; eventCode serbest string + `eventCodeValidator` enjeksiyonu; GD-PMS olay sözlüğü (`LOG_EVENT_CODES`/`isLogEventCode`) platform/logging'e taşındı | ✅ tamam (2026-08-31) |
| 3 | (ileride) tunnel → ayrı ürün paketi | ayrı plan |
| 4 | shared-types generic/platform ayrımı | ayrı plan |
| 5 | Nx tags + enforce-module-boundaries | ayrı plan |

## Kurallar

- Taşınan modüller testleriyle birlikte taşınır (TDD — testler yeşil kalır veya önce kırmızı).
- Core barrel'ından kaldırılan export'lar geçiş sırasında tek seferde tüketicilerle güncellenir (re-export köprüsü YOK — temiz göç).
- Yeni paket kalıbı: package.json (`@gd-monorepo/platform-*`), Nx project.json (core target'larını aynalar), tsconfig (references), vitest.config (alias), barrel index.
- Bun workspaces `packages/**` deseni iç içe klasörleri zaten destekliyor.
