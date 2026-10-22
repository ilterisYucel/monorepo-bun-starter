---
status: active
space: architecture
tags: [kapanis, dogrulama, test-kapsami, device-config, simulator, source-of-truth]
review_date: 2026-10-21
---

# Device Config Kaynak Ayrımı — Kapanış (Doğrulama + Test Kapsamı)

> **İş akışı aşaması:** 5/5 — KAPANIŞ (AGENTS.md "Geliştirme İş Akışı").
> **SPEC:** [DEVICE-CONFIG-KAYNAK-AYRIMI-MIMARISI.md](./DEVICE-CONFIG-KAYNAK-AYRIMI-MIMARISI.md) (onaylı — AK/FR/SC kaynağı; UC-1).
> **Doğrulama tarihi:** 2026-10-21 — T-1…T-7 tamam.

## A. DOĞRULAMA

### A.1 Değişiklik Matrisi

| # | Dosya | Değişiklik | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------------|
| 1 | `configs/*.json` (12 kök) | Sim alanları (`transport`/`details`/`connector`) çıkarıldı — production-only | K1 / FR-1.1 |
| 2 | `configs/flex-bsc.json` | Rev AF tam telemetri/bitfield/alarm/komut setine hizalandı; `charge`/`discharge`/`set_*_power` ve 40030/40031 YOK | K1 / FR-1.4 |
| 3 | `configs/sim/flex-bsc-sim-with-wattox.json` | YENİ — BSC sim türevi (production içerik + `transport`/`details`/`connector`) | K2 / K3 / FR-1.2 |
| 4 | `configs/sim/wattox-pcs-sim.json` | YENİ — PCS sim türevi | K2 / K3 |
| 5 | `deployment/v2/{dev,aws}/{container,container2}/device-configs/bsc-{1,2}.json` | Türevden yeniden üretildi; fark yalnız proje değişkenleri (deviceId/name/connection/pollInterval/initialSocPercent/connector portları) | K4 / FR-1.3 |
| 6 | `configs/mappings/bsc-2-pcs-mapping.json` | YENİ — BSC-2 connector registerMap kopya değişkeni (SPEC §4.3 edge: BSC-2 hedefi) | K4 |
| 7 | `tools/device-config-drift.mjs#loadDeviceConfigs` | Kök production-only denetimi (`SIM_ONLY_KEYS`), sim türev kapsama kontrolü (`compareDeviceConfig` missing→HATA) ve `--deploy` argümanı eklendi | K5 / FR-1.1 / FR-1.2 / FR-1.5 |
| 8 | `docs/device-config-rehberi.md` | Akış (production kök → sim türevi → kopya) + türev adlandırması dokümante edildi | FR-1.6 |
| 9 | `AGENTS-DEVICE-CONFIG.md` | Config politikası güncellendi (kök production-only, türev kuralı) | FR-1.6 |

### A.2 Test Kanıtları

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| Config drift (BSC) | `bun tools/device-config-drift.mjs --deploy deployment/v2` | BSC 0 hata; 1628 hata diğer cihazlarda pre-existing (B.2/G1) |
| Tam test paketi | `bun run test` | 294 dosya / 2558 test yeşil |
| Lint kapısı (SPEC) | `bun run spec:check docs/architecture/DEVICE-CONFIG-KAYNAK-AYRIMI-MIMARISI.md` | 0 hata |

### A.3 Kabul Kriteri Kanıtları

| Kod | Kriter (SPEC özeti) | Kanıt (test/dosya) | Durum |
|:----|:--------------------|:-------------------|:------|
| AK-1.1 | Kök config'lerde sim anahtarı yok | `tools/device-config-drift.mjs` SIM_ONLY_KEYS denetimi (BSC kök temiz) | 🟢 |
| AK-1.2 | Türev production içeriğini kapsar | drift sim türev kapsama kontrolü (`compareDeviceConfig` missing→HATA; BSC 0 hata) | 🟢 |
| AK-1.3 | Kopya farkı yalnız proje değişkenleri | drift `--deploy deployment/v2` BSC kopyaları temiz | 🟢 |
| AK-1.4 | BSC'de charge/discharge yok | drift + config denetimi — `flex-bsc.json` komut seti temiz | 🟢 |
| AK-1.5 | Drift kaynak filtresi | `configs/sim/` alt dizin + non-recursive `loadDeviceConfigs` — türev kaynak sayılmaz | 🟢 |
| AK-1.6 | Doküman güncel | `docs/device-config-rehberi.md` + `AGENTS-DEVICE-CONFIG.md` gözle kontrol | 🟢 |

### A.4 Sapmalar

| # | Sapma | Açıklama |
|:--|:------|:---------|
| 1 | Sim türevleri kökte değil `configs/sim/` alt dizininde | SPEC K3 adı `<cihaz>-sim[-<eşleşme>].json` kökte öngörüyordu; kök production-only kuralı (K1) gereği türevler ayrı `sim/` dizinine taşındı. Ayrıca `loadDeviceConfigs` non-recursive olduğundan `*-sim*.json` filtresi yerine dizin ayrımı kullanıldı — kökte türev olsaydı çift `deviceId` (BSC-1/BSC-2 vs türev) tarama sorunu doğardı. |
| 2 | BSC kökü v2 Rev AF setine hizalandı; icat edilen `(Global)` diff-temp alias'ları kaldırıldı | `flex-bsc.json` v2 kopyasındaki 91 telemetriyi kapsayacak şekilde Rev AF'e hizalandı. `(Global)` alias'ları (30264/30265) denetim düzeltmesi M4 gereği SİLİNDİ; platform-commands testi `Rack Max Diff Temp R1` kontratına güncellendi. |
| 3 | `bsc-2-pcs-mapping.json` ayrı mapping dosyası | SPEC §4.2 yalnız `mappings/bsc-pcs-mapping.json` öngörüyordu; BSC-2 connector hedefi kopya değişkeni olduğundan ikinci mapping dosyası eklendi. |

### A.5 Gözle Kontrol Maddeleri

- [x] Purity 1 — kök `configs/*.json` içinde sim kararı yok (drift SIM_ONLY_KEYS grep=0)
- [x] Purity 2 — `packages/simulators` ve `services/device-service` bu SPEC'te DEĞİŞMEDİ (config biçimi aynı)
- [x] Purity 3 — deployment kopyasında register/bitfield/alarm/canonical değişmedi (yalnız proje değişkenleri)
- [x] Purity 4 — türev production içeriğinin kopyasıdır (yeniden yazım YOK; drift kapsama kontrolüyle sabit)
- [x] Purity 5 — `deployment/v1/**` dokunulmadı (K6)
- [x] v1 kapsam dışı — drift `--deploy deployment/v2` ile koşuldu (A-1)

### A.6 Genel Durum Özeti

Kök `configs/` production-only oldu: 12 config'ten `transport`/`details`/`connector` çıkarıldı; `flex-bsc.json` Rev AF tam setine hizalandı. BSC ve Wattox PCS için `configs/sim/` altında tam kapsamlı sim türevleri üretildi; v2 BSC kopyaları türevden yeniden türetildi. Drift aracı production-only denetimi, türev kapsama kontrolü ve `--deploy` kapsamı kazandı. BSC drift 0 hata; tam test paketi 294 dosya / 2558 test yeşil. Diğer cihazlardaki 1628 pre-existing drift hatası ve docker e2e doğrulaması açık kalıyor (B.2). **review_date:** 2026-10-21.

## B. TEST KAPSAMI

### B.1 Kapsam Matrisi (durum → koşul → beklenen → test ref'i)

| Durum | Koşul | Beklenen (THEN) | Test ref'i |
|:------|:------|:----------------|:-----------|
| Config düzeltmesi | kök production dosyası değişir | türev senkron kalır (production kümesini kapsar) | drift sim türev kapsama kontrolü (`tools/device-config-drift.mjs`) |
| Yeni sim alanı ihtiyacı | yalnız sim türevine eklenir | production kökte sim anahtarı grep=0 | drift SIM_ONLY_KEYS denetimi |
| Yeni site/tier | kopya kökten türetilir | cihaz tanımı birebir; yalnız proje değişkeni farklı | drift `compareDeviceConfig` (BSC 0 hata) |
| Türev eksik anahtar | sim türevi production'dan eksik | HATA (fail-fast) | drift "sim eksik" raporu |
| Drift sapması | kopya extra/missing | rapor + allowlist | drift `--deploy deployment/v2` |

### B.2 KAPSANMAYAN Boşluklar

| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| G1 | Diğer cihazlarda pre-existing drift (1628 hata) | orta | Ayrı iş — bu SPEC BSC/Wattox kapsamındaydı; diğer cihazlar ayrı temizlik |
| G2 | Docker e2e doğrulaması çalıştırılmadı (integration testleri güncellendi) | düşük | docker stack ayağa kaldırılınca `bun run test:e2e` |
| G3 | v1 stack kaldırma | düşük | SPEC A-1 — ayrı iş |

**review_date:** 2026-10-21
