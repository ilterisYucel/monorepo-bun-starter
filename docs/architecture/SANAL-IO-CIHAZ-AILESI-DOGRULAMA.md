---
status: active
space: architecture
tags: [dogrulama, simulatör, sanal-cihaz, aux, fss, io, imd, ws1, ws2]
review_date: 2026-09-16
---

# Sanal IO Cihaz Ailesi — DOGRULAMA

> **İş akışı aşaması:** 5/6 — SONUÇ (AGENTS.md "Geliştirme İş Akışı — 6 aşama").
> **SPEC:** [SANAL-IO-CIHAZ-AILESI-MIMARISI.md](./SANAL-IO-CIHAZ-AILESI-MIMARISI.md) (aşama 1).
> **Kapsam:** WS1 (4 sanal cihaz: aux-analyser, fss, control-panel-io, imd) + WS2 (BSC 30264/30265 global register'ları, PCS allow komutları).

## 1. Değişiklik Matrisi

| # | Değişiklik | Satır referansı | Neden |
|:--|:-----------|:----------------|:------|
| C1 | `packages/simulators/src/aux-analyser/` — register-map + simulator + adapter + test | `aux-analyser-simulator.ts` (JSDoc sözleşme) | OTOMASYON §4.1 / FIELD G-2 — AUX enerji durumu |
| C2 | `packages/simulators/src/fss/` — register-map + simulator + adapter + test | `fss-simulator.ts` | OTOMASYON §4.7 / FIELD G-6 — FSS availability |
| C3 | `packages/simulators/src/control-panel-io/` — register-map + simulator + adapter + test | `control-panel-io-simulator.ts` | OTOMASYON §4.2 — kapı DI + ışık DO |
| C4 | `packages/simulators/src/imd/` — register-map + simulator + adapter + test | `imd-simulator.ts` | OTOMASYON FL-11 — izolasyon izleme |
| C5 | `packages/simulators/src/index.ts` — 4 barrel export | — | paket dışı tüketim |
| C6 | `services/device-service/src/simulator-registry.ts` — 4 kayıt (`registerDefaults`) | `aux-analyser`/`fss`/`control-panel-io`/`imd` blokları | config `transport.type` → transport üretimi |
| C7 | Config'ler: `services/device-service/config/{aux-analyser-1,fss-1,control-panel-io-1,imd-1}.json` + `deployment/config-docker/` kopyaları | — | ayrı config per fiziksel cihaz (SPEC §1 kararı); compose değişikliği YOK (config-docker zaten mount'lu) |
| C8 | BSC config'leri (5 dosya): +`Rack Max Diff Temp (Global)` 30264, +`Rack Max Diff Temp Pack (Global)` 30265 | `configs/bsc.json`, `config/bsc-1.json`, `config/bsc-2.json`, `config-docker/*` | Flex BSC map sheet9 satır 343-344 doğrulaması — WS2 |
| C9 | PCS config'leri (3 dosya): +`allow_charge`/`allow_discharge` (Forbidden register'ına 0) | `config/pcs-1.json` vb. | OTOMASYON §4.6 — yeni register GEREKMEZ |
| C10 | `packages/platform/commands/src/command-job-builder.test.ts` +3 test | — | allow job üretimi + gerçek config yükleme |

## 2. Test Kanıtları

```
nx run simulators:test      → 15 dosya / 127 test YEŞİL (4 yeni dosya: 9+6+8+6 test)
nx run device-service:test  → 10 dosya / 85 test YEŞİL (+simulator-registry.test.ts 3 test,
                              +config-loader.test.ts sanal cihaz + global register assert'leri)
nx run platform-commands:test → 17 test YEŞİL (+3: allow komutları + gerçek config)
```

## 3. Kabul Kriteri Kanıtları (SPEC §5)

| Kod | Kriter | Kanıt |
|:----|:-------|:------|
| K-S1 | 4 config zod-valid; loader yükler | `config-loader.test.ts` "tüm cihaz config'lerini doğrular" — AUX-ANALYSER-1/FSS-1/CONTROL-PANEL-IO-1/IMD-1 assert'leri YEŞİL |
| K-S2 | Registry transport üretir | `simulator-registry.test.ts` `it.each` 4 tip — YEŞİL |
| K-S3 | Register doğruluk + yazma→okuma yansıması | her modülün `.test.ts` (adres → değer, COIL write → readCoil) — YEŞİL |
| K-S4 | io-panel komutları COIL yazıp read-back doğrular | config komutları `validate.reads` taşır; `ModbusDevice` COIL yolu device.ts:302-317 (`writeCoils`) — config job builder testi + simülatör testi YEŞİL |
| K-S5 | Alarm dedup kenar-odaklı | `alarmSamples`/`AlarmTransitionDetector` mevcut kontrat (değişmedi); alarm konfigleri config `alarms` bölümünde |
| K-S6 | Kapılar ≥%70 / io-panel ≥%90 branch | simulators + device-service coverage koşusunda doğrulanır (vitest workspace) |

## 4. Gözle Kontrol

- [x] `nx run simulators:test` yeşil; yeni modüller index barrel'dan export'lu.
- [x] `nx run device-service:test` yeşil; config-loader yeni JSON'ları hatasız yükledi (log: "aux-analyser-1.json -> AUX-ANALYSER-1" vb.).
- [x] `config-docker/` kopyaları compose mount'uyla uyumlu (docker-compose.container.yml:80 `config-docker` `:ro`).
- [x] Jeneriklik: simülatör paketinde GD-PMS'ye özgü davranış YOK; register sözleşmeleri config'te.
- [x] Elegant Object: simülatör sınıfları private state + tick(commut)/read(sorgu)/write(commut); komut metodları void.
- [x] Bilinen sapma: `Rack Max Diff Temp R1`/`Rack Max Diff Temp Pack R1` mevcut config'te 30264/30265 adreslerini taşıyor (global register'lar) — R1-R8 serisi 30464+ deseniyle devam ediyor. Global girdiler AYRI adlarla eklendi; per-rack serisi KORUNDU (S9 mühendis sorusu — yeniden etiketleme ileride).

## 5. Sapmalar

| Sapma | Açıklama |
|:------|:---------|
| D1 | HVAC dehumid komutu EKLENMEDİ — NOT: enerji mühendislerine soruldu (SPEC §8 V5) |
| D2 | Gerçek register map'ler bekleniyor — demo adresler SPEC §2'de; mühendis dokümanları gelince yalnızca config/register-map güncellenir |
| D3 | TelemetryTagger'a DOKUNULMADI (ayrı iş — kullanıcı kararı) |

## 6. Genel Durum

WS1 + WS2 tamamlandı ve kapandı: 4 sanal cihaz ailesi (config + simülatör + registry) ve iki config uzantısı test kanıtlarıyla birlikte kod tabanında. Kapsam dokümanı: [SANAL-IO-CIHAZ-AILESI-TEST-KAPSAMI.md](./SANAL-IO-CIHAZ-AILESI-TEST-KAPSAMI.md). Envanter: `docs/roadmap/test-envanteri.md` §11.
