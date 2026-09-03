# Faz 5.1 Kapanış Planı — E2E + DOGRULAMA

**Durum:** B1–B5 kod + birim testleri tamam (web-service 469, field 20 test yeşil).
Kalan: temizlik, canonical normalizasyonu, E2E yumuşatılmış assert, tüm testler/build'ler, DOGRULAMA girişi.

## Kararlar (kullanıcı onaylı)
- **MV/CA ve backend sorgu perf'ine DOKUNULMAZ** — ham downsampled perf DOGRULAMA'ya S-notu olarak yazılır (Faz 5.2'ye bırakılır).
- Grafik E2E assert'i yumuşatılır: **endpoint 200 + chart render** (veri noktası sayısı değil).
- Grafik adları canonical konvansiyonuna geçirilir (canonical = UI alan adı): `name ← tags.canonical`, chart adları `soc, soh, voltage, current, charge_power, discharge_power`. Cihaz config adları değişmez.

## Adımlar

### 1. Temizlik (bu oturumun geçici izleri)
- `services/web-service/src/infrastructure/container-proxy/container-proxy.ts`: `// B2-DEBUG` console.log satırını kaldır.
- `services/web-service/src/infrastructure/field-connector/telemetry-query-responder.ts`: 2 adet `// B2-DEBUG` console.log satırını kaldır.
- `apps/container-web/vite.config.ts`: B5 `/ws` proxy'si kalır (asıl iş).
- `deployment/.env` (gitignore'lu, yerel): `TUNNEL_STATIC_UPSTREAM=http://host.docker.internal:4173` kalır — dev tünel iframe'i built SPA + `vite preview` (4173) ile çalışır; DOGRULAMA'ya not düşülür. `vite preview` süreci kullanıcı makinesinde çalışıyor (geçici; bilgi notu DOGRULAMA'da).

### 2. Canonical normalizasyonu (field app, TDD)
- `apps/field/src/features/field-charts/hooks/useFieldTelemetryProvider.ts`:
  - Yeni saf fonksiyon `normalizeCanonical(rows: TelemetryData[]): TelemetryData[]` — `tags.canonical` varsa `name = canonical` olan yeni satır üretir (immutable; eksik canonical → satır aynen kalır? HAYIR: grafik adları canonical olduğu için canonical'sız satırlar chart'ta görünmez ama zararsız — karar: koru, yalnızca canonical'lıları eşle).
  - `seriesQuery` sonucu `normalizeCanonical`'dan geçer.
- `apps/field/src/pages/FieldChartsPage.tsx`: `telemetryNames` → `["soc","soh","voltage","current","charge_power","discharge_power"]`.
- `apps/field/src/features/dashboard/deriveDashboard.ts` (`sparkSeries`): zaten `canonical === "soc" || name === "SOC"` — doğru; dokunulmaz.
- Test: `useFieldTelemetryProvider.test.ts` (yeni) — `normalizeCanonical` sözleşmesi:
  - canonical'lı satır name←canonical olur; değer/timestamp/deviceId/tags korunur; orijinal nesne mutate edilmez.
  - canonical'sız satır aynen kalır.
  - boş dizi → boş dizi.

### 3. E2E
- `e2e/field-flow.spec.ts` grafik adımı: `seriesStatus.count > 0` assert'i KALDIRILIR; `status === 200` + `.recharts-wrapper` görünürlüğü kalır. Açıklama yorumu: ham downsampled perf (S11 notu).
- Cihaz adımı (19 cihaz) aynen kalır — snapshot'tan, canlı çalışıyor.
- `e2e/container-realtime.spec.ts` aynen (B5 canlı doğrulandı).
- Canlı koşu: `bunx playwright test e2e/field-flow.spec.ts --project=chromium` (stack ayakta; frame artık built SPA + preview ile çalışıyor).
- `smoke.test.ts` import düzeltmesi zaten yapıldı (test → test/expect).

### 4. Tüm testler + build'ler
- `nx run core:test`, `nx run shared-types:test`, `nx run web-service:test`, `nx run field:test`
- `nx run field:build`, `nx run container-web:build`, `nx run web-service:build`
- Playwright `--list` (e2e keşfi hatasız).

### 5. DOGRULAMA.md Faz 5.1 girişi (zorunlu — AGENTS.md)
`docs/architecture/KONTEYNER-UZAKTAN-ERISIM-DOGRULAMA.md`:
- Faz 5.1 başlığı: amaç (Faz 5 sonrası "veri yok" onarımı), B1–B5 satır referansları:
  - B1: `realtime-manager.ts` `writeBatchToRingBuffer` lTrim genişletmesi (satır no) + test
  - B2: `field-connector.ts` (shared-types) telemetry-query/result şemaları; `telemetry-query-responder.ts`; `container-proxy.ts` `historical()` pending-map + 10s timeout; `field-routes.ts` `/telemetry/:containerId`; `useFieldTelemetryProvider.ts`
  - B3: `device-routes.ts` 500→200 `{devices:[]}` + karakterizasyon testi; `useFieldDevices.ts` snapshot türetimi; `FieldDevicesPage.tsx`
  - B4: `deriveDashboard.ts` (EMU/PCS/sparkline) + `FieldDashboardPage.tsx` mock kaldırma + `mockDataGenerator.ts` temizlik
  - B5: `apps/container-web/vite.config.ts` `/ws` proxy
- Test kanıtları: web-service 469, field 20, B5 canlı WS (941 kayıtlı batch), E2E field-flow + container-realtime sonuçları.
- Altyapı/çevre notları: `.env` `TUNNEL_STATIC_UPSTREAM` 5199→4173 (bayat port), dev tünel iframe'i = built SPA + `vite preview` (Vite dev mutlak modül URL'leri subpath'te çalışmaz), `smoke.test.ts` import düzeltmesi.
- **S-notu (yeni, S11):** ham downsampled sorgu perf'i — BSC tabloları 24s'te ~59M satır; `DISTINCT name,unit` ilk çağrı ~80 sn, filtresiz bucket sorgusu ~10-12 sn/cihaz → field'ın 10 sn `DEFAULT_QUERY_TIMEOUT_MS`'i boş dizi döndürür; grafik E2E'si bu yüzden 200+render ile sınırlandı. Çözüm adayları (Faz 5.2): CA view yolu (`MaterializedViewManager.selectView` — altyapı hazır), `(name,unit)` index'i, canonical bazlı `names` filtresi. Kanıt: psql timing'leri (80s DISTINCT, 2.4s count, 267ms filtrelenmiş).
- Genel durum özeti + `review_date` güncellemesi.

## Doğrulama kapısı
- `nx run web-service:test` (469) + `nx run field:test` (yeni test dahil) yeşil
- field-flow E2E canlı (1/1), container-realtime E2E (1/1)
- build'ler yeşil
- DOGRULAMA girişi satır referanslı + `review_date` güncel
