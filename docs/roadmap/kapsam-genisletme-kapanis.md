# V2/Dev Kapsam Genişletme — Kapanış (Integration/E2E)

**review_date:** 2026-10-13 · **Kapsam:** demo-field (v2/dev stack)

## A. DOĞRULAMA

### A.1 Yeni test dosyaları
| Dosya | Kapsam |
| :--- | :--- |
| `apps/demo-field/integration/commands-operations-edge.integration.test.ts` | B1 komut edge (404/400/raw/benign-ack/pulse/execute-multi), B2 operasyon edge (404/divideTotal floor/timer/rollback/MV kilit), B3 manevra edge (`bsc_recovery`, `bsc_stop` idempotent) |
| `apps/demo-field/integration/data-pipeline.integration.test.ts` | C1 dedup · C2 TTL üretimi · C3 latest pencere · C4 downsampled · C5 fire-and-forget P95 · C6 satır bütünlüğü (gerçek Timescale, psql) |
| `e2e/demo-faults.spec.ts` | E1 gerçek arıza (PCS fault enjeksiyonu) → Faults UI listesi → notlu çözme |
| `e2e/demo-operations-edge.spec.ts` | E3 power input sınırları + gizli manevra render edilmemesi |
| `e2e/demo-support.ts` | Paylaşımlı: FIELD_ID `.env` fallback + operasyon terminal-status polling |

### A.2 Test fix'leri (stabilite / dokümana uyum)
- **`helpers.ts`**: `normalizeContainer` / `normalizeField` / `normalizeStack` / `waitForContainerSession` — paylaşımlı stack normalizasyonu + field→container oturum hazırlık kapısı (web-service restart sonrası flakiness giderildi).
- **`device-telemetry` / `bsc-pcs-connector`**: snapshot okumaları → taze-çek+poll (`pcsValue`); PCS limitleri **BSC limitinden eşleme** olarak değer-bağımsız doğrulanır.
- **`demo-operations-data.spec.ts`** (2 fix):
  1. Yanlış register: rack seviyesi **ters kodlamalı** `Charge/Discharge Status` (30221) yerine BSC seviyesi `ChargeStatus` (30037 b4-5, 1=şarj/2=deşarj).
  2. Async operasyon: 202 `running` dönerse run terminal duruma poll edilir; outcome assertion'ları koşullu.
  3. FIELD_ID `.env` fallback (env'siz tek başına çalışır).
- **`demo-target-soc.spec.ts`**: FIELD_ID `.env` fallback.

### A.3 Simülatör ekleri
- `WattoxPcsSimulator.inject`: `fault` / `door_open` / `nominal` — field alarm (`PCS Fault Status`, `Cabinet Door Open`) E2E tetikleyicisi.

### A.4 Kapı sonuçları
| Paket | Sonuç |
| :--- | :--- |
| demo-field entegrasyon (8 dosya) | ✅ yeşil |
| demo e2e (23 test) | ✅ 23/23 |
| `test:demo-integration` (nx) | ✅ |
| simülatör 195 · core 121 · device-service 96 · data-service 13 · management 129 · shared-types 127 | ✅ |
| `test:inventory` | 282 dosya / 2459 test |
| `spec:check` | 0 hata |

## B. TEST KAPSAMI

### B.1 Yeni senaryolar
| Alan | Senaryo |
| :--- | :--- |
| Komut | bilinmeyen cihaz/komut, eksik param, raw telemetries, benign ack (0x06 success), pulse coil=0, execute-multi onFailure=stop |
| Operasyon | bilinmeyen op, divideTotal floor (25→12), timer, rollback (container-2 yok), H01 kalıcı toprak kilidi |
| Manevra | bsc_recovery (Stop→Start→EventClear→Close), bsc_stop idempotent |
| Veri hattı | dedup (≤2/30s), TTL üretimi (≥2/70s), latest pencere, downsampled bucket, fire-and-forget P95<500ms, satır bütünlüğü |
| E2E | PCS fault→Faults UI→resolve; operations power sınırları; gizli manevra |

### B.2 KAPSANMAYAN boşluklar
- **E2 (site status/permissives UI)**: kararlı seçici yok — ön-yüz güncellemesine bırakıldı.
- **E4 (Take control / HVAC setpoint UI)**: ön-yüz güncellemesi sonrası.
- **validate-timeout / occurrence edge'leri**: ack'ı asla eşleşmeyen bir komut simülasyonu yok (sim davranışı gerektirir).
- **CONTAINER/field eşzamanlı yük altında P95**: C5 tek-tier ölçüm; çok-tier yük testi kapsam dışı.
