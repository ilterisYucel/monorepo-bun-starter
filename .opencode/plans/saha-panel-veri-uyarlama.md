# Saha Uygulaması Veri Uyarlama + Ekran Düzenleme Planı

**Durum:** Keşif tamam, kararlar kullanıcı onaylı. Kod geliştirme bekliyor.
**Tarih:** 2026-09-02
**Kapsam:** `apps/field` (Panel + Konteyner Detay + veri türetme), `packages/simulators` (BSC limit register dolgusu — TAMAM), `services/device-service/deployment/config-docker` (PCS sayısı).

---

## 0. Durum / Kök bulgular

- **Panel'deki Ort SoC 80 / SOH 95 dummy DEĞİL** — EMU simülatörünün varsayılanları:
  `packages/simulators/src/emu/simulator.ts:15-16` (`socRaw=800`→%80, `sohRaw=950`→%95).
  Panel bunları `deriveEmuMetrics` ile EMU-1'in `"System SOC"`/`"System SOH"` telemetrilerinden okuyor.
- Gerçek BSC değerleri (doğrulandı, API'den): **BSC SOC = %50, BSC SOH = %99**
  (`BSC SOC` @30055, `BSC SOH` @30056 — canonical `soc`/`soh`, tags `rack_id: "system"`).
- Şarj/deşarj limitleri: `Charge Power Limit` @30063 / `Discharge Power Limit` @30065
  (canonical `charge_power`/`discharge_power`, rack_id system). Konteyner başına **2 BSC** (BSC-1, BSC-2).
- Renkli kart bileşeni: **`SummaryCard`** — `packages/ui/src/components/SummaryCard/` (barrel'dan
  `@gd-monorepo/ui` ile import edilir; field zaten ui'ya bağımlı). Variant'lar: `ok|alarm|fault|info|bsc|cb|dc|hvac`.
- Gauge: `DeviceGauges`/`TelemetryGauge` (circular) field'da zaten kullanılıyor
  (`apps/field/src/features/containers/hooks/containerGaugeBlocks.ts` + `ContainerDetailPage.tsx`).
- PCS: `pcsDerivation.derivePcsSummary` zaten "konteyner başına ilk PCS" sözleşmesi taşıyor
  (`apps/field/src/features/containers/hooks/pcsDerivation.ts:33`).
- Snapshot kaynağı: `RealtimeSnapshotSource` (`services/web-service/src/infrastructure/field-connector/realtime-snapshot-source.ts`)
  — `devices.status='online'` cihazların ring buffer'ından `(deviceId, name)` başına en yeni değer; cihaz tipi filtresi YOK.

## Kararlar (kullanıcı onaylı — 2026-09-02)

1. **PCS sayısı:** `config-docker`'dan `pcs-2.json` + `pcs-3.json` silinir; `emu-1.json` `pcsCount: 3 → 1`.
   (Konteyner tier `config-docker/` dizinini yükler; `config/` kopyaları da tutarlılık için güncellenir.)
2. **Panel üst kartları:** 5 `SummaryCard` — Ort. SoC, Ort. SOH, Şarj Limiti, Deşarj Limiti, İstasyon Durumu (EMU'dan kalır).
   PCS/konteyner sayaç kutuları kalkar.
3. **Konteyner detay üst kartları:** 4 `SummaryCard` — SoC, SOH, Şarj Limiti, Deşarj Limiti
   (mevcut SoC/Durum/Cihaz/Son-Görülme kartlarının yerine).
4. **PCS gauge seti (Panel):** AC Active Power (işaretli), DC Power, DC Voltage, DC Current, IGBT Temperature.
5. **PcsCard %50:** yalnızca Panel'de — solda PcsCard %50, sağda PCS gauge'leri %50.
6. **BSC limit simülasyonu:** geçici **500 kW** dolduruldu (aşağıda — TAMAM).

---

## 1. TAMAM — BSC simülatörü limit dolgusu (500 kW)

`packages/simulators/src/bsc/bsc-simulator.ts`:
- Init: `SYSTEM_SUMMARY.CHARGE_POWER_LIMIT` / `DISCHARGE_POWER_LIMIT` → `500 * 1000` (scale 0.001 → 500 kW).
- `updateSystemRegisters` idle (`else`) dalı: ikisi de `500 * 1000`.
- `updatePerRackRegisters` idle dalı (rack seviyesi `RS.CHARGE_POWER_LIMIT`/`DISCHARGE_POWER_LIMIT`): `500 * 1000`.
- Komut (START/DISCHARGE) geldiğinde mevcut setpoint mantığı bu değerleri ezer — davranış korunur.
- **Doğrulandı:** `simulators:test` 54/54 yeşil; device-service restart sonrası API'den:
  `BSC-1 | Charge Power Limit = 500 kW`, `Discharge Power Limit = 500 kW`, `BSC SOC = 50 %`, `BSC SOH = 99 %`.

## 2. Veri katmanı (TDD — test önce, kırmızı → yeşil)

### 2a. `apps/field/src/features/dashboard/deriveDashboard.ts`
- **YENİ** `deriveSocSohAverages(containers): { avgSoc: number | null; avgSoh: number | null }`
  - Snapshot'ta `tags.canonical === "soc"` / `"soh"` VE `tags.rack_id === "system"` satırları (BSC sistem seviyesi;
    rack seviyesi hariç). Tüm konteyner/BSC değerlerinin ortalaması. Kayıt yoksa `null` → UI `"—"`.
- **YENİ** `derivePowerLimits(containers): { chargeKw: number; dischargeKw: number }`
  - Konteyner başına `canonical charge_power` (system) toplamı; aynısı `discharge_power`; konteynerler arası toplam.
    Eksik → 0. (1 konteyner, 2 BSC → 2×500 = 1000 kW görünür.)
- **KALDIR** `derivePcsRows` (tek tüketici Panel'di; PCS kartı `pcsDerivation.derivePcsSummary` kullanıyor) + testleri.
- **KALDIR** `sparkSeries` + `SparkPoint` + `useContainerSparkline.ts` (Panel sparkline'ı kalkınca ölü kod).
- `deriveEmuMetrics` KALIR — yalnız İstasyon Durumu (`Station State`) için.
- Not: canonical → name fallback'e gerek yok (isimler "BSC SOC"/"BSC SOH" — name eşleşmesi çalışmaz;
  canonical tek yetkili yol, device-service `tags.canonical` taşıyor).

### 2b. `apps/field/src/features/containers/hooks/containerGaugeBlocks.ts`
- **YENİ** `buildPcsGaugeBlocks(pcsId, latestTelemetry, t): DeviceGaugeBlock[]`
  - Tek blok, theme `"info"`; gauge'ler:
    - `AC Active Power` — işaretli, min −500 / max 500, kW, decimals 1
    - `DC Power` — 0..500 kW, decimals 1
    - `DC Voltage` — 0..1000 V, decimals 0
    - `DC Current` — 0..500 A, decimals 1
    - `IGBT Temperature` — 0..120 °C, decimals 1
- `containerGaugeBlocks.test.ts`'e PCS bloğu testleri (label/min/max/değer eşleme; eksik telemetri → 0).

### 2c. `services/device-service/deployment/config-docker/`
- `pcs-2.json`, `pcs-3.json` sil.
- `emu-1.json`: `pcsCount: 3 → 1`.
- `services/device-service/config/` içindeki `pcs-2/3.json` + `emu-1.json` kopyaları da aynı şekilde güncelle (tutarlılık).
- Uygulama sonrası: `docker compose -f deployment/docker-compose.container.dev.yml --env-file deployment/.env.container restart device-service`
  (config dizini read-only mount; rebuild gerekmez).

## 3. Panel — `apps/field/src/pages/FieldDashboardPage.tsx`

- Üst satır (HvacPage `SummaryRow` deseni: grid `repeat(auto-fit, minmax(160px, 1fr))`):
  - **Ort. SoC** — `%50.0` — variant `bsc`, icon `battery`, label `dashboard.avgSoc`
  - **Ort. SOH** — `%99.0` — variant `bsc`, icon `health`, label **yeni** `dashboard.avgSoh`
  - **Şarj Limiti** — `1000.0 kW` — variant `info`, icon `batteryCharge`, label **yeni** `dashboard.chargeLimit`
  - **Deşarj Limiti** — `1000.0 kW` — variant `dc`, icon `batteryDischarge`, label **yeni** `dashboard.dischargeLimit`
  - **İstasyon Durumu** — EMU `Station State`; variant dinamik: 4 (şarj)→`ok`, 5 (deşarj)→`dc`, diğer→`info`; icon `dashboard`
- **KALDIR:** konteyner kart grid'i (sparkline), `statBox`, `ContainerConnectionBadge`, `ContainerSparkline`,
  `useContainerSparkline`, `useNavigate` (kullanılmıyorsa) importları; `STATION_STATE_KEY` kalır (durum kartı için).
- **PCS bölümü** (konteyner kartlarının yerine):
  ```tsx
  {containers.map((c) => {
    const pcs = derivePcsSummary(c.containerId, c.name, c.connected, c.latestTelemetry);
    return (
      <div key={c.containerId} style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
        <div style={{ width: "50%", minWidth: 320 }}>
          {pcs && <PcsCard pcs={pcs} />}
        </div>
        <div style={{ width: "50%", minWidth: 320, display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {pcs && buildPcsGaugeBlocks(pcs.pcsId, pcs.latestTelemetry, t).map((b) => (
            <div key={b.deviceId} style={{ flex: "1 1 140px", minWidth: 140 }}>
              <DeviceGauges deviceId={b.deviceId} gauges={b.gauges} theme={b.theme} variant="circular" width="100%" />
            </div>
          ))}
        </div>
      </div>
    );
  })}
  ```
  (Panel'de `onDetailClick`/`onConfigClick` verilmez — detay/config ContainerDetailPage'de.)
- Veri: `deriveSocSohAverages(containers)`, `derivePowerLimits(containers)`, EMU yalnız Station State.

## 4. Konteyner detay — `apps/field/src/pages/ContainerDetailPage.tsx`

- Üstteki 4 inline kart (SoC/Durum/Cihaz/Son Görülme, satır ~112-156) → 4 `SummaryCard`:
  - SoC (`common.soc`, variant `bsc`, icon `battery`), SOH (yeni `dashboard.avgSoh`? → `common.soh`, variant `bsc`, icon `health`),
    Şarj Limiti (yeni `dashboard.chargeLimit`, variant `info`, icon `batteryCharge`),
    Deşarj Limiti (yeni `dashboard.dischargeLimit`, variant `dc`, icon `batteryDischarge`).
  - Değerler: `deriveSocSohAverages([container])` / `derivePowerLimits([container])` ile (tek konteyner).
    `container` = `useContainerTelemetry` dönüşündeki nesne; mevcut SOC bulma deseni kaldırılır.
- Alt bölüm (PcsCard + modallar + cihaz gauge'ları) **dokunulmaz**.

## 5. i18n — `apps/field/src/i18n/tr.ts` + `en.ts`

- Yeni key'ler: `dashboard.avgSoh` ("Ort. SOH" / "Avg. SOH"),
  `dashboard.chargeLimit` ("Şarj Limiti" / "Charge Limit"),
  `dashboard.dischargeLimit` ("Deşarj Limiti" / "Discharge Limit").
- `dashboard.chargePower`/`dashboard.dischargePower` Panel'de artık kullanılmaz (kaldırılabilir — grep ile tüketici kontrol et).
- PCS gauge label'ları mevcut `pcs.*` key'leri: `pcs.activePower`, `pcs.dcPower`, `pcs.dcVoltage`, `pcs.dcCurrent`, `pcs.igbtTemp`.

## 6. Testler (TDD sırası)

1. `deriveDashboard.test.ts`:
   - KIRMIZI → YEŞİL: `deriveSocSohAverages` (1 konteyner 2 BSC ortalaması; `rack_id != "system"` hariç;
     boş → null) + `derivePowerLimits` (2 BSC toplamı; çok konteyner toplamı; eksik → 0).
   - Sil: `derivePcsRows` + `sparkSeries` testleri.
2. `containerGaugeBlocks.test.ts`: PCS bloğu testleri (yukarıdaki 5 gauge; eksik telemetri → 0; theme `info`).
3. `useContainerSparkline.ts` silinince ilgili importlar/testler kontrol edilir.
4. `nx run field:test` + `nx run field:build` + `nx run ui:test` (SummaryCard ui'da — dokunulmuyor) + `simulators:test`.

## 7. Doğrulama (ekran turu — kullanıcıyla)

- Docker: `docker compose -f deployment/docker-compose.container.dev.yml --env-file deployment/.env.container restart device-service`
  (config değişikliği); field-web Vite hot-reload; gerekirse
  `docker compose -f deployment/docker-compose.field.dev.yml --env-file deployment/.env.field up -d --force-recreate web`
  (Docker Desktop bind-mount tazelik sorunu — `restart` bazen kesik dosya görebiliyor).
- Beklenenler:
  - Panel: Ort. SoC **%50.0**, Ort. SOH **%99.0**, Şarj Limiti **1000.0 kW**, Deşarj Limiti **1000.0 kW**,
    İstasyon Durumu; tek **PCS-1** kartı + 5 gauge; konteyner kartları YOK.
  - Konteyner detay: 4 SummaryCard (SoC 50 / SOH 99 / limitler 1000 kW), alt bölüm aynı.
  - Konteynerler sayfası (nav.containers) değişmedi.
  - EMU `Station State` çalışıyor (EMU hâlâ container config'de).
- API spot-check: admin token ile `/api/unified/telemetry/latest?deviceIds=BSC-1` →
  `Charge Power Limit = 500 kW` (şu an doğru), `pcs-2/pcs-3` snapshot'ta YOK olmalı.

## 8. Notlar / Riskler

- **Limit kartları artık LIMIT gösterir** (register değeri), anlık güç değil — label'lar "Şarj Limiti"/"Deşarj Limiti".
- BSC simülatör limit dolgusu **geçici** — komut setpoint mantığı (`updateSystemRegisters`/`updatePerRackRegisters`)
  komut gelince ezer; gerçek donanım protokolüne geçince simülatör dolgusunu kaldır.
- `SummaryCard` variant→renk eşlemesi değer bazlı DEĞİL (sabit eşleme) — SOC/SOH için `bsc`, şarj `info`, deşarj `dc` yeterli.
- FirePanel/EnergyAnalyzer sayfalarındaki `StatusCard` kopyaları ileride `SummaryCard`'a taşınabilir (bu plan dışı).
- FieldChartsPage `AvgSoc` agregatı sunucu tarafında EMU bazlı olabilir — bu planda DOKUNULMADI; ekran turunda değerlendirilecek.
- Panel'den kalkan konteyner kartları **Konteynerler** sayfasında duruyor (nav.containers) — silinmedi.
- `Sparkline` bileşeni `packages/ui`'da kalır (kütüphane bileşeni; story + test var) — yalnızca field'daki `useContainerSparkline` hook'u silinir.
