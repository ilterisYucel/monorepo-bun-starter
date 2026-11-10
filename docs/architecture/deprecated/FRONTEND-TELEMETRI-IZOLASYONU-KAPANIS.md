---
status: active
space: architecture
tags: [kapanis, dogrulama, test-kapsami, frontend, telemetry, transport, websocket, hooks, multipleks, component-izolasyonu]
review_date: 2026-12-01
---

# Frontend Telemetri İzolasyonu — Kapanış (Doğrulama + Test Kapsamı)

> **İş akışı aşaması:** 5/5 — KAPANIŞ (AGENTS.md "Geliştirme İş Akışı").
> **SPEC:** Ayrı SPEC yazılmadı — bu iş `AGENTS-FRONTEND.md` "Multipleks + component izolasyonu (MANDATORY)" bölümünün refactor'ü. Kabul kriterleri (AK) aşağıda o sözleşmeden türetilmiştir (kanonik sözleşme `AGENTS-FRONTEND.md`'de yaşar).
> **Doğrulama tarihi:** 2026-12-01.

## A. DOĞRULAMA

### A.1 Değişiklik Matrisi

| # | Dosya | Değişiklik | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------------|
| 1 | `packages/shared-types/src/telemetry/transport.ts#ITelemetryTransport` | Opsiyonel `addDevices?`/`removeDevices?` eklendi (JSDoc sözleşmesiyle) | AK-1 / AK-2 |
| 2 | `packages/ui/src/transports/WebSocketTransport.ts#WebSocketTransport` | Multipleks: tek soket; `subscriptions` referans sayacı; idempotent `connect`; açılış/reconnect'te tüm abonelikler; `disconnect` tam teardown (`_closeSocket` çıkarımı) | AK-1 |
| 3 | `packages/ui/src/hooks/useTelemetryStream.ts#useTelemetryStream` | YENİ — çok-abone WS hook; per-device buffer; multipleks varsa `addDevices`/`removeDevices`, yoksa connect/disconnect fallback | AK-2 / AK-4 |
| 4 | `packages/ui/src/hooks/useRealtimeTelemetry.ts#useRealtimeTelemetry` | Cleanup/reconnect multipleks-uyumu: unmount `removeDevices` (diğer aboneleri kesmez); reconnect idempotent `connect` | AK-2 / AK-3 |
| 5 | `packages/ui/src/hooks/index.ts` | `useTelemetryStream` + `UseTelemetryStreamOptions` barrel export | AK-4 |
| 6 | `apps/container-web/src/features/telemetry/utils/dedupeLatest.ts#dedupeLatest` | YENİ — `(deviceId,name,rack_id)` başına en-yeni-kazanır dedup (+ `telemetryKey`) | AK-5 |
| 7 | `apps/container-web/src/features/telemetry/hooks/useDeviceTelemetry.ts#useDeviceTelemetry` | YENİ — component-kapsamlı: REST (`keepPreviousData`) + WS + `dedupeLatest`; küresel birleştirme YOK | AK-4 / AK-5 |
| 8 | `apps/container-web/src/features/dashboard/hooks/useDashboardData.ts#useDashboardData` | BSC bloğu component-kapsamlı `useDeviceTelemetry` (dedup'lı girdi); `extractSystemLevel` en-yeni-kazanır | AK-4 / AK-5 |
| 9 | `apps/container-web/src/features/hvac/hooks/useHvacData.ts#useHvacData` | Yapı katalogdan (`devices` + `telemetry-config` `tags.room`), değerler `useDeviceTelemetry` overlay | AK-4 / AK-6 |
| 10 | `apps/container-web/src/features/hvac/utils/hvacHelpers.ts#hvacSkeleton` | YENİ — katalog-tabanlı HVAC iskeleti (telemetriden bağımsız `standby` ünite; oda `roomByDevice`) | AK-6 |
| 11 | `apps/container-web/src/features/hvac/index.ts` | `hvacSkeleton` barrel export | AK-6 |
| 12 | `packages/ui/src/transports/WebSocketTransport.test.ts` | 4 multipleks test eklendi (dynamik subscribe/unsubscribe, refcount, idempotent connect, reconnect resubscribe) | AK-1 |
| 13 | `packages/ui/src/hooks/useTelemetryStream.test.ts` | YENİ — mount/unmount yaşam döngüsü + observer verisi | AK-2 / AK-3 |
| 14 | `apps/container-web/src/features/telemetry/utils/dedupeLatest.test.ts` | YENİ — en-yeni-kazanır + rack_id anahtar ayrımı | AK-5 |
| 15 | `apps/container-web/src/features/hvac/utils/hvacHelpers.test.ts` | YENİ — `hvacSkeleton` sözleşmesi (standby iskelet, oda, id çıkarımı) | AK-6 |

### A.2 Test Kanıtları

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| packages/ui — transport + hook | `bun run test packages/ui/src/transports/WebSocketTransport.test.ts packages/ui/src/hooks/useTelemetryStream.test.ts` | 13/13 yeşil (WS 11 + hook 2) |
| apps/container-web — dedup + iskelet | `bun run test apps/container-web/src/features/telemetry/utils/dedupeLatest.test.ts apps/container-web/src/features/hvac/utils/hvacHelpers.test.ts` | 6/6 yeşil (3 + 3) |
| Tam süit (bağımlı paketler) | `nx run-many --target=test --projects=ui,container-web,field` | yeşil (ui 156) |
| lint kapısı | `bun run spec:check docs/architecture/FRONTEND-TELEMETRI-IZOLASYONU-KAPANIS.md` | temiz |

### A.3 Kabul Kriteri Kanıtları

> AK kodları `AGENTS-FRONTEND.md` "Multipleks + component izolasyonu" sözleşmesinden türetilmiştir (ayrı SPEC yok).

| Kod | Kriter (sözleşme özeti) | Kanıt (test/dosya) | Durum |
|:----|:--------------------|:-------------------|:------|
| AK-1 | `WebSocketTransport` multiplekstir: TEK soket; `addDevices`/`removeDevices` referans sayar; `connect()` idempotent; açılış/reconnect'te tüm abonelikler yeniden gönderilir | `WebSocketTransport.test.ts` (multipleks describe) | 🟢 |
| AK-2 | Hook'lar `addDevices`/`removeDevices` kullanır; `disconnect()` yalnız teardown'da (unmount diğer aboneleri kesmez) | `useTelemetryStream.test.ts` + `useTelemetryStream.ts#useTelemetryStream` | 🟢 |
| AK-3 | `useRealtimeTelemetry` cleanup/reconnect multipleks-uyumlu (unmount `removeDevices`, reconnect idempotent `connect`) | `useRealtimeTelemetry.ts#useRealtimeTelemetry` (kod) + `useTelemetryStream.test.ts` (aynı sözleşme) | 🟢 |
| AK-4 | Her bileşen verisini kendi kapsamıyla çeker (`useTelemetryStream` + `useDeviceTelemetry`); sayfa-seviyesi küresel birleştirme YOK | `useDeviceTelemetry.ts#useDeviceTelemetry` + `useDashboardData.ts#useDashboardData` (kod) | 🟢 |
| AK-5 | Dedup: `(deviceId, name, rack_id)` başına en yeni timestamp'li tek satır | `dedupeLatest.test.ts` | 🟢 |
| AK-6 | Yapı vs değer: bileşen iskeleti katalogdan (`hvacSkeleton`); telemetri yalnız değerleri overlay eder (kesintide unmount YOK) | `hvacHelpers.test.ts` (hvacSkeleton) + `useHvacData.ts#useHvacData` | 🟢 |

### A.4 Sapmalar

| # | Sapma | Açıklama |
|:--|:------|:---------|
| 1 | Dashboard breaker/dcOutput hâlâ küresel `RealtimeProvider`/`useRealtimeStream` kullanıyor | Yalnız BSC (`useDashboardData`) ve HVAC (`useHvacData`) blokları component-kapsamlı hook'a geçti; breaker/dcOutput (racks/energy-analyzer/fire-panel, DashBoardPage/BscPage) küresel akışta kaldı. Tam migrasyon İleri İş. |
| 2 | HVAC oda bilgisi `telemetry-config` REST'inden gelir (katalog) | `useHvacData` `devicesApi.getTelemetryConfig` ile `tags.room` çeker; `telemetry-config` yoksa oda `"unknown"` gruplanır (bileşen yine de kaybolmaz — iskelet kalır). |
| 3 | `useDeviceTelemetry` boş yanıtta `keepPreviousData` korur ama "backend gerçekten 0 satır döndü" senaryosu için özel test yok | Kaybolma önlenir; ancak "0 satır = boş cihaz" ayrımı otomatik testle sabitlenmedi (B.2/G2). |

### A.5 Gözle Kontrol Maddeleri

- [x] Purity — `packages/ui` transport/hook katmanı TanStack Query/Zustand/Axios import ETMEZ (yalnız `react` + `@gd-monorepo/shared-types`); app katmanına bırakılır
- [x] Kontrat — `ITelemetryTransport` sözleşmesi genişletildi; opsiyonel `addDevices`/`removeDevices` (desteklemeyen transport fallback — Strategy deseni bozulmadı)
- [x] Multipleks — `connect()` idempotent; `disconnect()` yalnız provider teardown (A.1/2)
- [x] Dedup — `dedupeLatest` anahtar `(deviceId, name, rack_id)`; `Date.parse` karşılaştırma (`>=` eşitlikte son gelen kazanır)
- [x] Yapı vs değer — `hvacSkeleton` telemetriden bağımsız ünite üretir; overlay `telemetriesToHvacUnits` sonucuyla birleşir
- [x] DI — `WebSocketTransport(wsUrl, getToken?)` constructor enjeksiyonu; config obje kuralı (primitive yok)
- [x] Elegant Object — `_send`/`_closeSocket`/`_notifyData` command/query ayrımı; `addDevices`/`removeDevices` command (`void`); no static methods
- [x] Kod referansı — doküman `#sembol` çapası; satır numarası YOK

### A.6 Genel Durum Özeti

Frontend telemetri akışı component-izolasyonuna geçti: `ITelemetryTransport`'a opsiyonel `addDevices`/`removeDevices` eklendi ve `WebSocketTransport` TEK soket üzerinden referans-sayılı çok-abone (multipleks) hale getirildi — `connect()` idempotent, açılış/reconnect'te tüm abonelikler yeniden gönderiliyor, `disconnect()` yalnız tam teardown. Çok-abone `useTelemetryStream` (ui) + component-kapsamlı `useDeviceTelemetry` (REST `keepPreviousData` + WS + `dedupeLatest`) eklendi; `useRealtimeTelemetry` cleanup/reconnect'ı multipleks-uyumlu oldu (unmount diğer aboneleri kesmiyor). App katmanında BSC (`useDashboardData`) ve HVAC (`useHvacData`) blokları kendi kapsamıyla veri çekiyor; HVAC yapısı `hvacSkeleton` ile katalogdan kurulduğu için telemetri kesilse de bileşenler yer tutucuyla kalıyor. 19 yeni/revize test yeşil (WS 11 + hook 2 + dedup 3 + hvacSkeleton 3), tam süit (ui 156) yeşil. Açık: breaker/dcOutput küresel migrasyonu, `useRealtimeTelemetry` otomatik testi ve `useDeviceTelemetry` "0 satır" senaryosu (B.2). **review_date:** 2026-12-01.

## B. TEST KAPSAMI

### B.1 Kapsam Matrisi (durum → koşul → beklenen → test ref'i)

| Durum | Koşul | Beklenen (THEN) | Test ref'i |
|:------|:------|:----------------|:-----------|
| `connect` → open | deviceId'ler verildi | "connected" + her deviceId için `subscribe` | `WebSocketTransport.test.ts` |
| `connect` — token | `getToken()` döner | URL query'ye `token=` eklenir | `WebSocketTransport.test.ts` |
| `onmessage` — initial/telemetry | geçerli batch | `onData` çağrılır | `WebSocketTransport.test.ts` |
| `onmessage` — malform | JSON değil | `onError` (bağlantı kopmaz) | `WebSocketTransport.test.ts` |
| kapanma — açılmadan | `wasEverOpened=false` | "error" + rejected; reconnect YOK | `WebSocketTransport.test.ts` |
| kapanma — açıldıktan sonra | `wasEverOpened=true` | üstel backoff reconnect (tavan 30 sn) | `WebSocketTransport.test.ts` |
| `disconnect` | teardown | `cancelled` + "idle"; kapanma sonrası reconnect YOK | `WebSocketTransport.test.ts` |
| `addDevices` — açık soket | refcount 0→1 | `subscribe` gönderilir, yeni soket AÇILMAZ | `WebSocketTransport.test.ts` (multipleks) |
| `removeDevices` — refcount 2→1 | bir abone çıktı | `unsubscribe` GİTMEZ | `WebSocketTransport.test.ts` (multipleks) |
| `removeDevices` — refcount 1→0 | son abone çıktı | `unsubscribe` gönderilir | `WebSocketTransport.test.ts` (multipleks) |
| `connect` — idempotent | soket açık, ikinci connect | yeni soket açılmaz | `WebSocketTransport.test.ts` (multipleks) |
| reconnect — açılış | önceki kapanma sonrası | tüm abonelikler yeniden `subscribe` | `WebSocketTransport.test.ts` (multipleks) |
| hook mount | multipleks transport | `addDevices` + `connect` çağrılır | `useTelemetryStream.test.ts` |
| hook unmount | multipleks transport | `removeDevices` (disconnect DEĞİL) | `useTelemetryStream.test.ts` |
| hook observer `onData` | batch gelir | hook çıktısına yansır | `useTelemetryStream.test.ts` |
| `dedupeLatest` — aynı anahtar | `(deviceId,name,rack_id)` aynı | yalnız en yeni timestamp'li satır | `dedupeLatest.test.ts` |
| `dedupeLatest` — farklı rack | `rack_id` farklı | ayrı anahtar — iki satır korunur | `dedupeLatest.test.ts` |
| `telemetryKey` | row verildi | `deviceId\|name\|rack_id` üretir | `dedupeLatest.test.ts` |
| `hvacSkeleton` — telemetrisiz | deviceIds verildi | her cihaz için `standby` ünite (room "unknown") | `hvacHelpers.test.ts` |
| `hvacSkeleton` — oda | `roomByDevice` var | oda bilgisi map'ten gelir | `hvacHelpers.test.ts` |
| `hvacSkeleton` — id çıkarımı | `HVAC-X` (sayı yok) | atlanır | `hvacHelpers.test.ts` |

### B.2 KAPSANMAYAN Boşluklar

| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| G1 | `useRealtimeTelemetry` multipleks-uyumlu cleanup/reconnect otomatik testle sabitlenmedi (yalnız kod + `useTelemetryStream.test` ayrı hook sözleşmesi) | orta | `useRealtimeTelemetry.test.ts` — unmount'ta `removeDevices` (disconnect YOK), reconnect idempotent |
| G2 | `useDeviceTelemetry` "backend gerçekten 0 satır döndü" + `keepPreviousData` koruma senaryosu test edilmedi (A.4/3) | orta | `useDeviceTelemetry.test.tsx` — boş `telemetries` yanıtında önceki veri korunur, yeni cihazda boş kalır |
| G3 | Dashboard breaker/dcOutput küresel `RealtimeProvider`/`useRealtimeStream` migrasyonu tamamlanmadı (yalnız BSC/HVAC component-kapsamlı) | orta | İleri İş — racks/energy-analyzer/fire-panel + DashBoardPage/BscPage kendi `useDeviceTelemetry` kapsamına geçer |
| G4 | `telemetriesToHvacUnits` değer overlay eşlemesi (16 metric + 13 alarm adı) otomatik test edilmedi (yalnız `hvacSkeleton` testli) | orta | `hvacHelpers.test.ts` genişlet — telemetri → ünite değer/alarm eşlemesi |
| G5 | Component düzeyi entegrasyon/e2e: WS reconnect/kesintisinde HVAC/BSC bileşenlerinin "kaybolmadığı" (yer tutucu kaldığı) uçtan uca doğrulanmadı | orta | Playwright: WS kes → bileşen iskeleti unmount olmaz, değerler geri gelir |

**review_date:** 2026-12-01
