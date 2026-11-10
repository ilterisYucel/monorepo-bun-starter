---
status: active
space: architecture
tags: [mimari, device-config, simulator, source-of-truth, spec]
review_date: 2026-10-21
---

# Device Config Kaynak Ayrımı — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/5 — SPEC (AGENTS.md "Geliştirme İş Akışı").
> **Durum:** 🟡 Geliştirmede (2026-10-21) — SPEC onaylı; T-1…T-7 tamam, KAPANIŞ bekliyor.
> **İlişkili:** [SIMULATOR-MIMARISI.md](./SIMULATOR-MIMARISI.md) (simülatör sözleşmesi — REV.03), [AGENTS-DEVICE-CONFIG.md](../../AGENTS-DEVICE-CONFIG.md) (config politikası), [device-config-rehberi.md](../device-config-rehberi.md) (saha rehberi).

## 1. Amaç ve Bağlam

**Sorun:** Kök `configs/` (source of truth) dosyaları simülatöre özgü alanlar taşıyor: `transport.kind: "simulator"`, `details` (rackCount, simSpeedMultiplier), `connector` (BSC→PCS sim bloğu). Bu config'ler production ortamında kullanılacağı için simülatör kararları cihaz tanımına sızmamalıdır. Ayrıca v2 deployment kopyaları kökten türetilmek yerine doğrudan düzenlenmiş (drift).

**Çözüm:** Kök `configs/` **production-only** olur. Simülatöre özgü ek yük gerektiren cihazlar için **tam kapsamlı sim türevi** dosya üretilir (`<cihaz>-sim[-<eşleşme>].json`); türev, production içeriğin üstüne sim alanlarını ekler. Deployment kopyaları ilgili dosyadan türetilir: gerçek cihaz tier'ı production dosyasından, sim tier'ı sim türevinden. Yalnız proje değişkenleri (deviceId/name/connection/pollInterval/instance portları) kopyada değişir.

**Kapsam tablosu:**

| Katman | Dahil | Hariç |
|:-------|:------|:------|
| `configs/` | Sim alanlarının temizlenmesi; BSC ve Wattox PCS sim türevleri | Diğer 10 cihaz için türev (sim ek yükü yok — deployment `transport` taşır) |
| `deployment/v2/**` | BSC device-config kopyalarının türevden yeniden üretimi | PCS kopyaları (yalnız `transport` — değişiklik yok) |
| `tools/device-config-drift.mjs` | `*-sim*.json` dosyalarının kaynak sayılmaması | Drift motoru (`compareDeviceConfig`) davranışı |
| `deployment/v1/**` | — | Tamamen kapsam dışı (v1 kaldırılacak — ayrı iş, A-1) |
| device-service / `packages/simulators` | — | Runtime kod değişikliği YOK (config biçimi aynı) |

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, 2026-10-21)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K1 | Kök `configs/*.json` **production-only**: `transport`, `details`, `connector` bulunmaz | UC-1 |
| K2 | Sim ek yükü gereken cihaz için **tam kapsamlı türev** dosya: production içerik + sim alanları (overlay değil superset) | UC-1 |
| K3 | Türev adı `<cihaz>-sim[-<eşleşme>].json`; BSC için `flex-bsc-sim-with-wattox.json`, PCS için `wattox-pcs-sim.json` | UC-1 |
| K4 | Deployment kopyası türetimi: sim tier → türev, gerçek tier → production dosyası; fark yalnız proje değişkenleri | UC-1 |
| K5 | Drift aracı `*-sim*.json` dosyalarını kaynak olarak YÜKLEMEZ; karşılaştırma production kök ↔ deployment kopyası (telemetry/bitfield) | UC-1 |
| K6 | v1 deployment değişiklikleri dikkate alınmaz (v1 kaldırılacak) | UC-1 |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | 12 kök config'in tamamı `transport.kind: "simulator"` taşıyor | `configs/*.json` |
| B2 | `flex-bsc.json` simülatöre özgü `details` + `connector` bloğu içeriyor; BSC-2 connector hedefi/portu ancak kopyada değişiyor | `configs/flex-bsc.json` |
| B3 | v2 BSC kopyaları kökte olmayan 91 telemetri taşıyor (Rev AF ayrıntıları kopyaya doğrudan yazılmış) | `deployment/v2/dev/container/device-configs/bsc-1.json` |
| B4 | Kökte `charge`/`discharge` komutu ve 40030/40031 setpoint telemetrisi yok; kopyalarda var (drift allowlist'te) | `tools/device-config-drift.allow.json` |
| B5 | Drift aracı kökteki tüm `deviceId`'li JSON'ları kaynak sayıyor; türev dosyalar çoğaltma üretir | `tools/device-config-drift.mjs#loadDeviceConfigs` |

## 4. Mimari

### 4.1 Dosya akışı

```
configs/                                  deployment/<site>/<tier>/device-configs/
├── flex-bsc.json            (prod) ────► gerçek cihaz tier'ı (transport: gerçek)
├── flex-bsc-sim-with-wattox.json (sim) ─► container tier (transport: simulator)
├── wattox-pcs.json          (prod) ────► gerçek cihaz tier'ı
├── wattox-pcs-sim.json      (sim) ─────► field tier (transport: simulator + bmsPort)
└── <diğer 10 cihaz>.json    (prod) ────► her iki tier (transport kopyada)
```

Kural: türev = production dosyasının **tam içeriği** + sim alanları. Türevde cihaz tanımı (telemetry/bitfieldConfigs/commands/alarms) production ile aynıdır; yalnız sim alanları eklenir.

### 4.2 BSC örneği

- `configs/flex-bsc.json`: Rev AF telemetri/bitfield/alarm/komut seti; `charge`/`discharge`/`set_*_power` YOK; `transport`/`details`/`connector` YOK
- `configs/sim/flex-bsc-sim-with-wattox.json`: aynı içerik + `transport {kind:"simulator",type:"bsc"}`, `details {rackCount}`, `connector` (BSC→PCS sim; `sim.registerMap: "mappings/bsc-pcs-mapping.json"`)
- `deployment/v2/{dev,aws}/{container,container2}/device-configs/bsc-{1,2}.json`: türevden türetilir; farklar: `deviceId`, `name`, `connection` (15501/15510), `pollIntervalMs`, `details.initialSocPercent` (container2), `connector.device.connection` (15505/15506), `connector.sim.registerMap` (bsc-2) / `target.port` (15503)

### 4.3 Drift denetimi

- Kaynak: production kök config'ler (`*-sim*.json` hariç)
- Denetlenen: telemetry + bitfieldConfigs (mevcut `compareDeviceConfig`)
- İzinli proje farkları: `deviceId`/`name`/`connection`/`transport` (+ allowlist)
- v1 kapsam dışı: doğrulama `--deploy deployment/v2` ile koşulur

## 5. Purity Kuralları (ZORUNLU)

1. Kök `configs/*.json` içinde simülatör kararı (transport/details/connector/simOnly) BULUNMAZ — yalnız production cihaz tanımı.
2. `packages/simulators` ve `services/device-service` bu SPEC'te DEĞİŞMEZ (config biçimi aynı kalır).
3. Deployment kopyasında register/bitfield/alarm/canonical DEĞİŞMEZ (mevcut kural); yalnız proje değişkenleri.
4. Türev dosya production içeriğiyle senkron kalmalıdır — cihaz tanımı türevde yeniden yazılmaz, kopyalanır.
5. `deployment/v1/**` bu SPEC'te dokunulmaz.

## 6. Use Case'ler

### 6.1 UC-1 — Production-only kök + sim türevi ayrımı

**Status:** 🟡 Geliştirmede (T-1…T-7 tamam)

**Kapsam:**
- dahil: kök config temizliği, BSC/PCS sim türevleri, v2 BSC kopyalarının türetimi, drift aracı filtresi, doküman güncellemesi
- hariç: v1, runtime kod, diğer 10 cihaz için türev

**Akış:**
1. 12 kök config'ten `transport`; BSC'den ayrıca `details`/`connector` çıkarılır.
2. `flex-bsc.json` Rev AF tam telemetri setine hizalanır (v2 kopyasındaki 91 kayıt köke taşınır); `charge`/`discharge`/`set_*_power` komutları ve 40030/40031 telemetrileri kökte YOKtur.
3. `flex-bsc-sim-with-wattox.json` ve `wattox-pcs-sim.json` türevleri üretilir.
4. v2 BSC kopyaları türevden yeniden üretilir (proje değişkenleriyle).
5. Drift aracı `*-sim*.json` dosyalarını atlar.
6. Rehber + AGENTS-DEVICE-CONFIG akışı güncellenir.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | Kök config'ler `transport`/`details`/`connector` içermemelidir | AK-1.1 |
| FR-1.2 | Sim türevi, production içeriğin tamamını + sim alanlarını içermelidir | AK-1.2 |
| FR-1.3 | v2 sim-tier kopyaları türevden türetilmeli; fark yalnız proje değişkenleri olmalıdır | AK-1.3 |
| FR-1.4 | BSC kök/kopya config'lerinde `charge`/`discharge` komutu ve 40030/40031 telemetrisi bulunmamalıdır | AK-1.4 |
| FR-1.5 | Drift aracı `*-sim*.json` dosyalarını kaynak olarak yüklememelidir | AK-1.5 |
| FR-1.6 | Rehber ve AGENTS-DEVICE-CONFIG yeni akışı (production kök → sim türevi → kopya) belgelemelidir | AK-1.6 |

**Kabul Senaryoları (GWT):**

1. **AK-1.1 — GIVEN** `configs/` dizini **WHEN** production config'ler taranır **THEN** hiçbirinde `transport`, `details`, `connector` anahtarı yoktur
2. **AK-1.2 — GIVEN** `flex-bsc.json` ve `flex-bsc-sim-with-wattox.json` **WHEN** telemetri/bitfield/komut kümeleri karşılaştırılır **THEN** türev küme production kümesini kapsar; türevde yalnız `transport`/`details`/`connector` fazladır
3. **AK-1.3 — GIVEN** `flex-bsc-sim-with-wattox.json` **WHEN** v2 sim-tier BSC kopyası türetilir **THEN** cihaz tanımı birebir aynıdır; yalnız deviceId/name/connection/pollInterval/initialSocPercent/connector portları farklıdır
4. **AK-1.4 — GIVEN** yeni v2 BSC kopyası **WHEN** komut ve telemetri listesi denetlenir **THEN** `charge`, `discharge`, `set_charge_power`, `set_discharge_power`, 40030, 40031 YOKtur
5. **AK-1.5 — GIVEN** kökte `flex-bsc-sim-with-wattox.json` **WHEN** drift aracı çalışır **THEN** bu dosya kaynak listesine girmez; BSC tipi production dosyasından çözülür
6. **AK-1.6 — GIVEN** güncellenmiş dokümanlar **WHEN** gözden geçirilir **THEN** akış (kök → türev → kopya) ve türev adlandırması açıkça yazılıdır

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | Kök config'lerde sim anahtarı yok | script kontrolü | ⬜ |
| AK-1.2 | Türev superset | script kontrolü | ⬜ |
| AK-1.3 | Kopya farkı yalnız proje değişkenleri | drift aracı | ⬜ |
| AK-1.4 | BSC'de charge/discharge yok | script kontrolü | ⬜ |
| AK-1.5 | Drift kaynak filtresi | `bun tools/device-config-drift.mjs --deploy deployment/v2` | ⬜ |
| AK-1.6 | Doküman güncel | gözle kontrol | ⬜ |

**T Görev Listesi:**
- [x] T-1: 12 kök config'ten sim alanlarını çıkar; `flex-bsc.json` Rev AF tam sete hizala
- [x] T-2: `configs/sim/flex-bsc-sim-with-wattox.json` üret
- [x] T-3: `configs/sim/wattox-pcs-sim.json` üret
- [x] T-4: v2 BSC kopyalarını (4 tier × 2 instance) türevden yeniden üret
- [x] T-5: Drift aracına `*-sim*.json` filtresi ekle
- [x] T-6: `docs/device-config-rehberi.md` + `AGENTS-DEVICE-CONFIG.md` akış güncellemesi
- [x] T-7: Doğrulama — BSC drift temiz (`--deploy deployment/v2`), `bun run test` ilgili projeler

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Sim türevi production içerikten sapmış (elle düzenleme) | Drift aracı kopyayı production kökle karşılaştırdığı için `extra`/`missing` hatası verir |
| Cihazın sim ek yükü yok | Türev üretilmez; deployment `transport` taşımaya devam eder |
| v1 kopyaları eski içerikte | Kapsam dışı; v1 silinene kadar drift `--deploy deployment/v2` ile koşulur |
| BSC-2 connector hedefi | Türevde yok; kopyada `connector.sim.target.port` olarak instance değişkeni |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `configs/*.json` | Sim alanları çıkarılır |
| `configs/sim/flex-bsc-sim-with-wattox.json` | YENİ — BSC sim türevi |
| `configs/sim/wattox-pcs-sim.json` | YENİ — PCS sim türevi |
| `deployment/v2/*/container*/device-configs/bsc-*.json` | Türevden yeniden üretim |
| `tools/device-config-drift.mjs` | `*-sim*.json` filtresi |
| `docs/device-config-rehberi.md` | Akış dokümantasyonu |
| `AGENTS-DEVICE-CONFIG.md` | Politika güncellemesi |

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| Config düzeltmesi | Önce kök production dosyası; türev senkron güncellenir |
| Yeni sim alanı ihtiyacı | Yalnız sim türevine eklenir; production köke girmez |
| Yeni site/tier | Kopya ilgili kök dosyadan türetilir; yalnız proje değişkenleri |
| Türev eksik anahtar | Kopya üretimi hata verir (fail-fast, config hatası) |
| Drift sapması | `extra`/`missing` raporu; allowlist yalnız belgelenmiş demo istisnası |

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | Kök config'lerde sim anahtarı grep=0 | script kontrolü |
| SC-2 | v2 BSC drift hatası=0 | `bun tools/device-config-drift.mjs --deploy deployment/v2` |
| SC-3 | `flex-bsc-sim-with-wattox.json` production tanımını birebir kapsar | script kontrolü |
| SC-4 | `bun run spec:check` temiz | `bun run spec:check` |
| SC-5 | İlgili proje testleri yeşil | `nx run simulators:test`, `nx run device-service:test` |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC | Bu doküman |
| 2. JSDoc | Config türev/alan sözleşmesi (doküman + drift aracı JSDoc) |
| 3. TEST | Kök sim-anahtar taraması, türev superset kontrolü, drift filtresi testi |
| 4. IMPL | T-1…T-6 |
| 5. KAPANIŞ | `DEVICE-CONFIG-KAYNAK-AYRIMI-KAPANIS.md` (Doğrulama + Test Kapsamı) |

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A-1 | `deployment/v1/**` silinmesi | Ayrı iş (kullanıcı kararı 2026-10-21) |
| A-2 | Diğer 10 cihaz için sim türevi | Sim ek yükü doğarsa aynı kalıpla üretilir; şimdi YOK |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. v1 stack'in tamamen kaldırılması.
2. Fault injection / thermal-HVAC / kalibrasyon senaryoları (SIMULATOR-MIMARISI ileri iş).

## 12. T Görev Özeti

| # | Görev | UC |
|:--|:------|:---|
| T-1 | 12 kök config sim alanı temizliği + BSC Rev AF hizası | UC-1 |
| T-2 | `flex-bsc-sim-with-wattox.json` | UC-1 |
| T-3 | `wattox-pcs-sim.json` | UC-1 |
| T-4 | v2 BSC kopyalarının türetimi | UC-1 |
| T-5 | Drift `*-sim*` filtresi | UC-1 |
| T-6 | Rehber + AGENTS güncellemesi | UC-1 |
| T-7 | Doğrulama (drift + testler) | UC-1 |
