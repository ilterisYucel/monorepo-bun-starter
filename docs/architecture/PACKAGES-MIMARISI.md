---
status: active
space: architecture
tags: [mimari, indeks, packages, spec]
review_date: 2026-11-10
---

# PACKAGES — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/4 — SPEC (Plan aşaması, DeepSeek V4 Pro).
> **Durum:** ONAY BEKLİYOR — implementasyon developer onayından sonra başlar.
> **İlişkili:** `DOKUMAN-YAPISI-MIMARISI.md` (reorg ana SPEC'i), `docs/architecture/SPEC-SABLONU.md`.

## 1. Amaç ve Bağlam

`packages/` altındaki her üst dizinin tek bir SPEC sahibi olması kuralının (K2) haritası. Bu doküman derinlik taşımaz: her modülün sorumluluğunu, birim SPEC yolunu ve durumunu tek bakışta gösterir. Modül kararları kendi SPEC'inde yaşar.

| Katman | Kapsam |
|:-------|:-------|
| dahil | 12 paket modülünün haritası, birim SPEC linkleri, durum takibi |
| hariç | Modül içi kararlar (kendi SPEC'lerinde), ayrı projeler (tamper-logger, zero-trust — ilgili klasör docs'larında) |

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, tarihli)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K1 | Her paket dizini için 1 SPEC + 1 KAPANIŞ (`<MODUL>-MIMARISI.md` / `-KAPANIS.md`) | Bu indeksin satırları birebir o dosyalara bağlanır |
| K2 | Ayrı projeler bu indekse girmez: `packages/tamper-logger/docs/`, `zero-trust-application-tunnel/docs/` | İndekste yalnız referans satırı |
| K3 | İndeks "durum" kolonu yaşar: `yazılacak` → `✅ Approved` → `🟢 Doğrulanmış` | Kapanış takibi indeksten görünür |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | Paket kararları 97 dokümana dağılmış; birim sınırı yok | `docs/architecture/` envanteri (2026-11-10) |
| B2 | `packages/device-library` src'siz ölü dizin | `DOKUMAN-YAPISI-MIMARISI.md` B5 |

## 4. Mimari

### 4.1 Modül haritası

| Dizin | Sorumluluk (tek satır) | Birim SPEC | Durum |
|:------|:-----------------------|:-----------|:------|
| `packages/core` | 6 doküman (K16 istisnası): modbus, timeseries, messaging, sql, canbus, mqtt | `MODBUS-MIMARISI.md` ✅, `TIMESERIES-MIMARISI.md` ✅, `MESAJLASMA-MIMARISI.md` ✅, `SQL-MIMARISI.md` ✅, `CANBUS-MIMARISI.md` ✅, `MQTT-MIMARISI.md` ✅ | 6/6 yazıldı |
| `packages/shared-types` | Sistem geneli veri sözleşmeleri (telemetri, config, alarm, DTO, zod şemaları) | `SHARED-TYPES-MIMARISI.md` | ✅ yazıldı |
| `packages/shared-utils` | ConfigLoader + kaynaklar + birim normalizasyonu + config kataloğu | `SHARED-UTILS-MIMARISI.md` | ✅ yazıldı |
| `packages/result` | Result/DomainError ailesi (hata sözleşmesi) | `RESULT-MIMARISI.md` | ✅ yazıldı |
| `packages/logger` | pino ince sarmalayıcı + sink'ler | `LOGGER-MIMARISI.md` | mevcut (🟢 Doğrulanmış) |
| `packages/ui` | Transport/provider kontratları, renk/ikon/sprite pipeline, Pixi grafik, paylaşılan bileşenler | `UI-MIMARISI.md` | ✅ yazıldı |
| `packages/simulators` | Kolaylık simülatörleri + fiziksel saha simülatörü + sim-lab | `SIMULATORS-MIMARISI.md` | ✅ yazıldı |
| `packages/epias-client` | EPİAŞ istemcisi + TGT yaşam döngüsü | `EPIAS-CLIENT-MIMARISI.md` | ✅ yazıldı |
| `packages/plugin-sdk` | Plugin framework (manifest/registry/loader/context/http) | `PLUGIN-SDK-MIMARISI.md` | ✅ yazıldı |
| `packages/platform` | commands (komut/manevra yürütücü), messaging (JobType sahibi), logging (sözlük/tier), container-access (port) | `PLATFORM-MIMARISI.md` | ✅ yazıldı |
| `packages/plugins` | Örnek entegrasyon plugin'i (epias-market-prices) | `PLUGINS-MIMARISI.md` | ✅ yazıldı |
| `packages/eslint-plugin-energy` | Güvenlik lint kuralları (kök lint'te bağlı) | `ESLINT-PLUGIN-ENERGY-MIMARISI.md` | ✅ yazıldı |

### 4.2 Ayrı proje referansları

| Proje | Doküman konumu |
|:------|:---------------|
| Tamper Logger | `packages/tamper-logger/docs/TAMPER-LOGGER-MIMARISI.md` |
| Zero-Trust Application Tunnel | `zero-trust-application-tunnel/docs/WS-TUNNEL-{CEKIRDEK,HUB,AGENT}-MIMARISI.md` |
| Ölü dizin (silinecek) | `packages/device-library` |

### 4.3 Çalışma zamanı ve yapı notları (AGENTS-INFRA'dan taşındı)

| Katman | Ne | Yer |
|:-------|:---|:----|
| Platform (engine) | Yeniden kullanılabilir kütüphaneler — import edilir, deploy edilmez | `packages/` |
| Capabilities | Deploy edilebilir, config-driven parçalar | `services/` + `apps/` |
| Products | Capability + config birleşimi | `deployment/` |

- `packages/core` JENERİKTİR; GD-PMS'ye özgü kod (`JobType`, tier defaults, kontenaj sözleşmeleri) `packages/platform/*`'da yaşar. Bağımlılık yönü: `core → platform` YASAK; `platform → core` serbest.
- Servisler ürün DEĞİLDİR; ürün = configured composition (örn. site ürünü = device-service + data-service + web-service + site app + compose + device configs + `SERVICE_TIER=field`).
- `packages/` = import-only. `run.ts`/Dockerfile taşıyan ve deploy edilen şey `services/` veya `apps/`'e aittir.

**Build sırası (Nx `^build`):** `shared-types, result` → `logger, shared-utils, core, tamper-logger, simulators, plugin-sdk, ws-tunnel` → `platform/*` → `epias-client` → `plugins/*, ui` → servisler/app'ler.

**Sürümler:** Bun **1.4.3** (Docker digest-pinli) · Fastify v5 · React 19 / Vite 8 / TanStack Query 5 / Zustand 5 / Router 7 / Recharts 3 · Electron 39 / electron-vite 5 · PixiJS 8 / Emotion · TimescaleDB + Redis/BullMQ · jose 5 / awilix 11 / zod 3.

**Bun 1.4.3 / RTU:** RTU backend `bun-serialport` (bun:ffi) + `SerialSocketAdapter`; `bun:ffi` yalnız `connect()` anında dinamik import edilir; Bun-only'dir, `parity: mark|space` desteklenmez; donanımsız doğrulama `bun tools/rtu-loopback-check.mjs`. AVX2'siz eski x64 CPU'larda Bun >1.3.8 çöker (ARM/RevPi etkilenmez).

**SIGILL / 24-7 stabilite:** WS batch shaping, rAF batching, WebGL context lifecycle, PixiJS ticker throttle, WS ping/pong, dead-socket sweep, localStorage throttle, token refresh, error boundary, Electron crash handler — ayrıntı: `docs/process/24h-stability-fixes.md`.

## 5. Purity Kuralları (ZORUNLU)

1. İndeks derinlik taşımaz — modül kararı birim SPEC'indedir; indeks yalnız harita ve durumdur.
2. Her satırın birim SPEC linki zorunludur; link hedefi yoksa satır `yazılacak` durumundadır.
3. Modül eklenirse indeks satırı eklenir; modül silinirse satır "silindi" notuyla kapatılır (geçmiş kaybolmaz).

## 6. Use Case'ler

### 6.1 UC-1 — Paket İndeksinin Bakımı

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: modül haritası satırları, linkler, durum kolonu, yeni/silinen modül yansıması
- hariç: birim SPEC içerikleri

**Akış:**
1. Yeni paket eklenir/silinir → indeks satırı güncellenir.
2. Birim SPEC durumu değişir → durum kolonu güncellenir.
3. `bun run spec:check` temiz.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | Her paket dizini tek satırla temsil edilir; sorumluluk + SPEC yolu + durum taşır | AK-1.1 |
| FR-1.2 | Satır linkleri mevcut dosyaya veya `yazılacak` durumuna işaret eder | AK-1.2 |
| FR-1.3 | İndeks `bun run spec:check` lint'inden 0 hata ile geçer | AK-1.3 |

**Kabul Senaryoları (GWT):**

1. **AK-1.1 — GIVEN** `packages/` dizin listesi **WHEN** indeks okunur **THEN** her üst dizin için tam bir satır vardır
2. **AK-1.2 — GIVEN** indeks satırları **WHEN** linkler kontrol edilir **THEN** her satır ya mevcut dosyaya ya `yazılacak` durumuna işaret eder
3. **AK-1.3 — GIVEN** indeks dosyası **WHEN** spec:check koşulur **THEN** hata sayısı 0'dır

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | Dizin↔satır tam eşleşme | gözle | ⬜ |
| AK-1.2 | Link/durum tutarlılığı | gözle | ⬜ |
| AK-1.3 | spec:check çıkış kodu 0 | komut | ⬜ |

**T Görev Listesi:**
- [ ] T-1: İndeksin yazımı ve modül listesinin kodla eşleştirilmesi

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Birim SPEC henüz yok | Satır `yazılacak` durumunda kalır |
| Modül silindi | Satır "silindi (tarih)" notuyla kapatılır |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:-----------------|
| `docs/architecture/PACKAGES-MIMARISI.md` | Bu indeks |
| `packages/*/` | Haritalanan dizinler |

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| Yeni paket | Satır + birim SPEC görevi eklenir |
| Birim SPEC onaylandı | Durum `✅ Approved` |
| Birim KAPANIŞ tamamlandı | Durum `🟢 Doğrulanmış` |
| Link kırık | Lint/manuel kontrol; satır düzeltilir |

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | `packages/` altındaki her üst dizin indekste temsil edilir | gözle |
| SC-2 | İndeks spec:check 0 hata | komut |
| SC-3 | Durum kolonu gerçek SPEC durumlarıyla uyumlu | gözle |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC (Plan — V4 Pro) | Bu doküman |
| 2. SÖZLEŞME + TEST (Build — V4.1 Flash) | Yapısal modül — yeni davranış kodu yok |
| 3. IMPL + MUTASYON (Build — V4.1 Flash) | T-1; mutasyon kapısı değişen üretim `.ts` yoksa atlanır |
| 4. REVIEW (GLM-5.3) | `PACKAGES-KAPANIS.md` |

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A1 | İndeks TOC'unun otomatik üretimi | İleri İş |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. İndeksten otomatik bağlantı/TOC doğrulama tool'u.
2. Paket bağımlılık grafiğinin indekse otomatik eklenmesi (Nx graph çıktısı).

## 12. T Görev Özeti

| T-1 | `PACKAGES-MIMARISI.md` indeksinin yazımı ve modül listesinin kodla eşleştirilmesi |
