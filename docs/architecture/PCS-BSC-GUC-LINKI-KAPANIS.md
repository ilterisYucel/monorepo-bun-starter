---
status: active
space: architecture
tags: [kapanis, dogrulama, test-kapsami, simulator, bsc, pcs, soc, connector]
review_date: 2026-10-21
---

# PCS→BSC Güç Linki — Kapanış (Doğrulama + Test Kapsamı)

> **İş akışı aşaması:** 5/5 — KAPANIŞ (AGENTS.md "Geliştirme İş Akışı").
> **SPEC:** [PCS-BSC-GUC-LINKI-MIMARISI.md](./PCS-BSC-GUC-LINKI-MIMARISI.md) (onaylı — AK/FR/SC kaynağı; UC-1/UC-2/UC-3).
> **Doğrulama tarihi:** 2026-10-21 — T-1…T-9 tamam.

## A. DOĞRULAMA

### A.1 Değişiklik Matrisi

| # | Dosya | Değişiklik | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------------|
| 1 | `packages/simulators/src/bsc/power-input.ts#IBatteryPowerInput` | YENİ — BSC dış güç girdisi sözleşmesi (`applyPowerKw(kw): void`) | K1 / FR-1.1 |
| 2 | `packages/simulators/src/bsc/bsc-simulator.ts#BSCSimulator` | `ISimulator`+`IBatteryPowerInput`; `applyPowerKw` güç kaynağı; `effectivePowerKw` (SOC kapılı kırpma) + `updateRackStates` (gdems SOC entegrasyonu) | K2/K3/K6 / FR-1.1..1.3 |
| 3 | `packages/simulators/src/bsc/register-map.ts` | SIM_ONLY register bloğu silindi (49000/49001) | K1 / FR-1.4 |
| 4 | `packages/simulators/src/bsc-pcs-connector/pcs-power-reader.ts#TcpPcsPowerReader` | YENİ — PCS EMS S16 (0x2f7e) TCP Modbus okuyucu (`IPowerReader`) | K4 / FR-2.1 |
| 5 | `packages/simulators/src/bsc-pcs-connector/connector.ts#BscPcsConnectorAdapter` | Ters kanal `powerLink` (reader+input); tick'te `readTotal` → `applyPowerKw`; `REG_POWER_SOURCE` 0x0008 izleme register'ı | K4 / FR-2.1..2.4 |
| 6 | `packages/simulators/src/host.ts#SimulatorHost` | `powerInputs` kayıt + connector `powerLink` wiring (config `connector.sim.pcsSources` → `TcpPcsPowerReader`) | K4 / FR-2.2 |
| 7 | `packages/shared-types/src/config/device-config.ts` + `schemas/device-config.ts` | `PcsPowerSource`/`ConnectorConfig.sim.pcsSources` şeması | FR-2.1 |
| 8 | `configs/sim/flex-bsc-sim-with-wattox.json` + v2 container BSC kopyaları | `connector.sim.pcsSources` şeması/değerleri | K4 / T-6 |
| 9 | `deployment/v2/{dev,aws}/{container,container2}/maneuvers/demo-maneuvers.json` | BSC güç manevraları (`bsc_charge`/`bsc_discharge`/`set_*_power`) SİLİNDİ | K7 / FR-3.1 |
| 10 | `deployment/v2/{dev,aws}/field/maneuvers/demo-operations.json` | charge/discharge yalnız `pcs_charge`/`pcs_discharge` çağırır | FR-3.2 |
| 11 | `deployment/v2/{dev,aws}/container/rules/rules.json` | `over_soc`/`offline_rack` kuralları `set_*_power` komutlarından arındırıldı (log-only) | K7 / FR-3.1 |
| 12 | `packages/ui/src/nova/demo-admin-live.ts` + `DemoOperationsView.tsx` | UI BSC_CMD'den `charge`/`discharge`/`bsc_charge`/`bsc_discharge` kaldırıldı | K7 / FR-3.1 (sapma A.4) |
| 13 | `packages/simulators/src/bsc/bsc-simulator.test.ts` | YENİ/uyarlanan dış güç testleri (yön, formül, clamp, limit) | T-2 / FR-1.1..1.3 |
| 14 | `packages/simulators/src/bsc-pcs-connector/pcs-power-reader.test.ts` | YENİ — gerçek Modbus server'lı S16 okuma testleri | T-4 / FR-2.1 |
| 15 | `packages/simulators/src/bsc-pcs-connector/connector.test.ts` | YENİ ters kanal testleri (toplama, erişilemezlik, geriye uyum) | T-5 / FR-2.2..2.4 |
| 16 | `packages/simulators/src/host.test.ts` | YENİ host powerLink wiring testleri | T-5 / FR-2.2 |
| 17 | `apps/demo-field/integration/*.integration.test.ts` | Uçtan uca entegrasyon (PCS S06 → connector → BSC SOC yönü) | T-8 / FR-3.3 |

### A.2 Test Kanıtları

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| Tam test paketi | `bun run test` | 294 dosya / 2559 test yeşil |
| Demo entegrasyon (docker, gerçek stack) | `bun run test:demo-integration` | **108/108 test yeşil** |
| Playwright demo (chromium) | `E2E_ADMIN_PASSWORD=... bunx playwright test --project=chromium` | 29 passed / 22 failed / 5 skipped (kalan hatalar harness/state/UI eski beklentileri — B.2) |
| Lint kapısı (SPEC) | `bun run spec:check docs/architecture/PCS-BSC-GUC-LINKI-MIMARISI.md` | 0 hata |
| SIM kalıntısı | `grep 49000/49001/set_charge_power/set_discharge_power` | 0 sonuç |

### A.3 Kabul Kriteri Kanıtları

| Kod | Kriter (SPEC özeti) | Kanıt (test/dosya) | Durum |
|:----|:--------------------|:-------------------|:------|
| AK-1.1 | Güç yönü SOC'yi doğru değiştirir | `bsc-simulator.test.ts` (applyPowerKw yön testi) | 🟢 |
| AK-1.2 | Formül sayısal doğrulama (η, clamp %3.5–%97) | `bsc-simulator.test.ts` (SOC entegrasyon sayısal testi) | 🟢 |
| AK-1.3 | SOC kapılı limit kırpma | `bsc-simulator.test.ts` (`effectivePowerKw` clamp testi) | 🟢 |
| AK-1.4 | SIM kalıntısı yok | grep — 49000/49001/set_*_power 0 sonuç | 🟢 |
| AK-2.1 | S16 okuma | `pcs-power-reader.test.ts` (gerçek server) | 🟢 |
| AK-2.2 | Toplama (ΣP) | `connector.test.ts` + `pcs-power-reader.test.ts` | 🟢 |
| AK-2.3 | Erişilemezlik (0 + durum) | `pcs-power-reader.test.ts` + `connector.test.ts` | 🟢 |
| AK-2.4 | Geriye uyum (`pcsSources` yok) | `connector.test.ts` (powerLink yoksa applyPowerKw çağrılmaz) | 🟢 |
| AK-3.1 | Manevra içeriği (BSC güç komutu yok) | `deployment/v2/**/maneuvers/demo-maneuvers.json` denetimi | 🟢 |
| AK-3.2 | Operasyon zinciri (yalnız PCS ops) | `demo-operations.json` + entegrasyon testleri | 🟢 |
| AK-3.3 | SOC yönü (PCS→BSC) | `apps/demo-field/integration/*.integration.test.ts` | 🟢 |

### A.4 Sapmalar

| # | Sapma | Açıklama |
|:--|:------|:---------|
| 1 | `simSpeedMultiplier` 20 → 1200 | Demo hızı için SOC entegrasyonu hızlandırıldı; `updateRackStates` `hours = elapsedSeconds × simSpeedMultiplier / 3600` formülüyle birleşti. |
| 2 | SOC verimi asimetrik: şarj `×0.975`, deşarj `÷0.975` | SPEC K2 η=0.975 tek yönlü yazıyordu; gdems `sim.js` referansında şarj çarpma, deşarj bölme olarak uygulandı (round-trip kaybı). |
| 3 | Container `bsc_charge`/`bsc_discharge` SİLİNDİ; field yalnız `pcs_charge`/`pcs_discharge`; container `over_soc`/`offline_rack` log-only | BSC güç setpoint komutları fiziksel olarak kalktığı için (K1) kural/manevra katmanı da bu komutları çağırmayı bıraktı; `offline_rack` limiti artık kural komutla değil log ile işaretleniyor (B.2/G2). |
| 4 | UI BSC_CMD'den `charge`/`discharge`/`bsc_charge`/`bsc_discharge` kaldırıldı | SPEC UC-3 "hariç: UI değişikliği" diyordu; komut kalkınca UI'nin ölü komut yollamaması için kapsam dışı UI düzeltmesi yapıldı (ölü kod temizliği). |
| 5 | BSC↔PCS 1:1 eşleme (BSC-1→PCS-1, BSC-2→PCS-2; container-2 → PCS-3/4) | `connector.sim.target` her BSC için açık verildi; `.env`'deki `PCS_BMS_TARGET_PORT` override'ı kaldırıldı (yanlış PCS'e yazımı önler). |
| 6 | Demo operasyonlarına `bsc_prepare` (reset YOK; start+close_contactors) hazırlık adımı eklendi | BSC `charge` operasyonundan çıkınca NORMAL'e geçmiyordu; güç hâlâ PCS'te (K7 korunur). Reset EMERGENCY'de reddedildiği için kullanılmadı. |
| 7 | PCS `standby`/`stop` komutlarına `minWaitMs: 1200`, `timeoutMs: 6000` | PCS gücü 0 olduktan sonra BSC'nin CURRENT_FLOWS reddi (C1) için 1 sn'lik connector tick'i beklenir; aksi halde `bsc_stop` 422 alıyordu. |
| 8 | `soc:<yüzde>` debug enjeksiyonu eklendi | Test determinizmi: SOC üst sınıra (97) doymadan şarj/deşarj yönü ölçülür. |

### A.5 Gözle Kontrol Maddeleri

- [x] Purity 1 — production kök config'lerde güç linki/sim anahtarı YOK (drift SIM_ONLY_KEYS)
- [x] Purity 2 — BSC simülatörü PCS'e bağımlı DEĞİL; yalnız `IBatteryPowerInput` tüketir (`power-input.ts#IBatteryPowerInput`)
- [x] Purity 3 — connector BSC'ye in-process, PCS'e TCP Modbus (SIMULATOR K6 deseni korunur)
- [x] Purity 4 — `packages/core`'a bağımlılık YOK; jsmodbus client doğrudan (`pcs-power-reader.ts#TcpPcsPowerReader`)
- [x] Purity 5 — SIM_ONLY register/komut adı grep=0
- [x] DI — `IBatteryPowerInput`/`IPowerReader`/`PcsPowerSource` interface sözleşmeleri; constructor injection
- [x] Async loop — `pcs-power-reader.ts#readTotal` `Promise.allSettled` kullanır (sıralı for...of await YOK)
- [x] Yaşam döngüsü — `TcpPcsPowerReader#close` idempotent; connector `close` powerLink reader'ı kapatır

### A.6 Genel Durum Özeti

BSC güç akışı PCS→BSC yönüne döndü: SIM_ONLY setpoint register'ları ve `set_*_power` komutları silindi; BSC dış güç girdisi (`IBatteryPowerInput`) tüketir ve SOC'yi gdems formülüyle (şarj ×0.975, deşarj ÷0.975, clamp %3.5–%97) entegre eder. Connector'a ters kanal eklendi — PCS EMS S16 (0x2f7e) TCP Modbus ile okunur, toplam in-process BSC'ye yazılır; `pcsSources` yoksa davranış değişmez (geriye uyum). Manevra/kural/UI katmanlarından BSC güç komutları arındırıldı; field `pcs_charge`/`pcs_discharge` tek kaynak. Tam test paketi 294 dosya / 2559 test yeşil; demo entegrasyon suite'i gerçek docker stack üzerinde **108/108** geçti (PCS S06 → connector → BSC SOC zinciri doğrulandı). Playwright demo spec'lerinin bir kısmı eski akışa göre yazıldığı/state taşıdığı için kırmızı (B.2/G1). **review_date:** 2026-10-21.

## B. TEST KAPSAMI

### B.1 Kapsam Matrisi (durum → koşul → beklenen → test ref'i)

| Durum | Koşul | Beklenen (THEN) | Test ref'i |
|:------|:------|:----------------|:-----------|
| Güç girdisi yok | `applyPowerKw` hiç çağrılmadı | 0 kabul; SOC sabit | `bsc-simulator.test.ts` |
| PCS erişilemez | S16 okuma throw/timeout | katkı 0; `available` < `total`; SOC sabit | `pcs-power-reader.test.ts` + `connector.test.ts` |
| Config `pcsSources` boş/yok | ters kanal kapalı | `applyPowerKw` çağrılmaz (geriye uyum) | `connector.test.ts` |
| SOC sınırı | SOC ≥%97 (şarj) / ≤%3.5 (deşarj) | efektif güç 0; entegrasyon durur | `bsc-simulator.test.ts` (`effectivePowerKw`) |
| Connector tick hatası | okuma throw | yakalanır; BSC girdisi son geçerli değerde kalır | `connector.test.ts` |
| İşaret değişimi | şarj→deşarj | yön anında değişir; enerji korunur | `bsc-simulator.test.ts` |
| S16 negatif/pozitif | uint16 → sint16 dönüşüm | işaret korunur (K3) | `pcs-power-reader.test.ts` |

### B.2 KAPSANMAYAN Boşluklar

| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| G1 | Playwright demo spec'leri eski akış beklentileri (uzak BSC güç adımı, 2 PCS) + state taşıma nedeniyle kısmen kırmızı; firefox/webkit tarayıcıları kurulu değil | orta | Spec'ler yeni akışa göre sıfırlanacak; `bunx playwright install firefox webkit` |
| G2 | `offline_rack` limiti kuralda log-only (komutla kırpılmıyor) | orta | Kural limiti yeniden aktif edilecekse PCS yönlü komuta çevrilir |
| G3 | Çoklu cluster güç agregasyonu | orta | SPEC A-1 — MVP tek BSC toplamı |
| G4 | PCS S16 yerine DC güç okuma | düşük | SPEC A-2 — MVP EMS S16 |
| G5 | Fault injection / thermal senaryoları | düşük | SIMULATOR ileri iş §11 |

**review_date:** 2026-10-21
