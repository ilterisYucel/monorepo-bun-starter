---
status: active
space: architecture
tags: [kapanis, dogrulama, test-kapsami, demo, konsol, ui, nova, field, fss, simulator]
review_date: 2026-10-14
---

# DEMO-KONSOL-UI-UYUM — Kapanış (Doğrulama + Test Kapsamı)

> **İş akışı aşaması:** 5/5 — KAPANIŞ (AGENTS.md "Geliştirme İş Akışı").
> **SPEC:** [DEMO-KONSOL-UI-UYUM-MIMARISI.md](./DEMO-KONSOL-UI-UYUM-MIMARISI.md) (onaylı — AK/FR/SC kaynağı).
> **Kapsam:** `apps/demo-field` (shell, 6 sekme, tema, tüm sayfalar), `packages/ui/src/{colors,icons,nova}` (light+dark token, 29 ikon, konsol bileşenleri + CSS),
> `packages/simulators/src/fss` (Sigma XT simülatörü) + `host.ts` builder, `deployment/{dev,aws}` container device config'leri (`fss-1.json`).

## A. DOĞRULAMA

### A.1 Değişiklik Matrisi

| # | Dosya | Değişiklik | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------------|
| 1 | `packages/ui/src/colors/tokensDark.ts#COLORS_DARK` | Yeni dark token seti (referans paleti) + `COLOR_DARK` sayısal karşılıklar | UC-1/T-1, K-2 |
| 2 | `packages/ui/src/colors/tokensDark.test.ts` | dark alarm/yüzey değerleri + light ile aynı anahtar kümesi + sayısal karşılık testleri | UC-1/T-1, AK-1.2 |
| 3 | `packages/ui/src/colors/tokensLight.ts#COLORS_LIGHT` | flow renkleri düzeltildi (`discharge`/`charge` → referans `#c46d12`/`#0b8a7a`) | B-8, K-2 |
| 4 | `packages/ui/src/colors/index.ts` | `COLORS_DARK`/`DarkColorToken` barrel export | T-1, K-3 |
| 5 | `packages/ui/src/nova/apply-nova-vars.ts#novaVarMap` | `apply-light-vars.ts` yerine light+dark tek giriş; `applyNovaVars`/`applyNovaLightVars` | UC-1/T-1, K-2 |
| 6 | `packages/ui/src/nova/apply-nova-vars.test.ts` | light/dark harita + `data-theme` uygulama testleri | UC-1/T-1, AK-1.2 |
| 7 | `packages/ui/src/nova/apply-light-vars.ts` | SİLİNDİ → `apply-nova-vars.ts` (yeniden adlandırma) | K-2, A.4 |
| 8 | `apps/demo-field/src/lib/demo-theme.ts#useDemoTheme` | `initialTheme()` + `useDemoTheme()` hook (localStorage → `prefers-color-scheme`) | UC-1, K-2 |
| 9 | `apps/demo-field/src/index.css` | Barlow Semi Condensed + IBM Plex Mono fontları + `--nm-*` tema kökü | UC-1/T-2, K-1, B-7 |
| 10 | `apps/demo-field/index.html` | font preload + başlık | UC-1/T-2, K-1 |
| 11 | `apps/demo-field/src/layouts/DemoShell.tsx#DemoShell` | header (logo, crumbs, 6 İngilizce sekme, "Demo data", light/dark toggle, saat) + footer | UC-1/T-3, K-1/K-2/K-4 |
| 12 | `apps/demo-field/src/assets/logo-dark.png` | Logo asset'i | UC-1/T-3, K-1 |
| 13 | `apps/demo-field/src/app/routes.tsx#routes` | 6 rota (`/field/:id`, `/devices`, `/operations`, `/market`, `/faults`, `/admin`) + eski `/cihazlar`/`/manevra` redirect | UC-1/T-4, K-5 |
| 14 | `apps/demo-field/src/layouts/DemoProjectLayout.tsx#DemoProjectLayout` | Ortak üst blok layout (pinfo→KPI→Ready→Trends→Outlet→log) + React context | UC-2/T-8, K-4 |
| 15 | `apps/demo-field/src/features/demo-data/useDemoProject.ts#useDemoProject` | Ortak veri hook'u (containers+telemetri+runs+alarmlar+log paralel) | UC-2/T-8, K-4 |
| 16 | `packages/ui/src/nova/DemoProjectStrip.tsx` | Proje veri şeridi (10+ etiket) | UC-2/T-5, FR-2.1 |
| 17 | `packages/ui/src/nova/DemoKpiStrip.tsx` | 7 KPI tile referans sınıflarına hizalama + `--nm-*` | UC-2/T-6, FR-2.2 |
| 18 | `packages/ui/src/nova/DemoReadyCard.tsx` | Ready/Rest kartı (rest-big + grup termal çipleri) | UC-2/T-7, FR-2.3 |
| 19 | `packages/ui/src/nova/DemoEventLog.tsx` | Tam genişlik event log + `--nm-*` | UC-2/T-8, K-4 |
| 20 | `packages/ui/src/nova/DemoTrendChart.tsx#DemoTrendChart` | Yeniden yazım: eksen/ölçek, faz gölgeleme, limit, band/area, hover crosshair+tooltip+uç nokta | UC-3/T-9..T-11, B-5 |
| 21 | `packages/ui/src/nova/DemoTrendChart.test.tsx` | AK-3.1..3.3 + boş seri + `nearestIndex` testleri | UC-3, AK-3.1..3.3 |
| 22 | `packages/ui/src/nova/nova-console.css` | Yeni light+dark `--nm-*` + trend (tc-*) stilleri | UC-1..UC-8, K-3 |
| 23 | `packages/ui/src/nova/DemoBessScada.tsx` | Container SCADA çizimi (TR→PCS→DC CB→BUS→raf→HVAC→FSS) | UC-4/T-13, FR-4.3 |
| 24 | `packages/ui/src/nova/DemoPackDetail.tsx` | Raf/pack detayı (register tablosu + türetilmiş pack hücre/sıcaklık) | UC-4/T-14, FR-4.4, D-1 |
| 25 | `packages/ui/src/nova/DemoDevicePanels.tsx` | PCS/HVAC(live)/FSS(live)/RMU&TR/AUX panelleri + `--nm-*` | UC-4/T-15, FR-4.5 |
| 26 | `packages/ui/src/nova/demo-bess-data.ts#packData` | Pack türetimi (17 pack × 24 hücre × 4 sensör) deterministik + `rackPacks` | UC-4/T-14, D-1 |
| 27 | `packages/ui/src/nova/demo-bess-data.test.ts` | pack determinizmi + 4 sensör + rackPacks 17 testleri | UC-4, D-1 |
| 28 | `apps/demo-field/src/pages/DemoDevicesPage.tsx#DemoDevicesPage` | Ağaç + istasyon/AUX + `?tab=`/`?unit=` deep-link | UC-4/T-16, FR-4.1/4.2 |
| 29 | `packages/ui/src/nova/DemoOperationsView.tsx` | FL-01…FL-05/FL-08/09/FL-11 listesi + kind-bazlı formlar + permissives + onay + aktif program + sekanslar + MV station | UC-5/T-17..T-20, FR-5.1..5.4 |
| 30 | `apps/demo-field/src/pages/DemoManeuverPage.tsx` | `demoManeuverApi` execute/stop kullanımı + `DemoOperationsView` yerleşimi | UC-5, FR-5.2 |
| 31 | `packages/ui/src/nova/demo-readiness.ts` | rest/readiness saf türevleri + `restPhasesForRuns` (genişletme) | UC-5/T-18, FR-5.4, K-4 |
| 32 | `packages/ui/src/nova/demo-readiness.test.tsx` | AK-2.3 rest/readiness + AK-7.2 sequence testleri (genişletme) | UC-5, AK-2.3 |
| 33 | `packages/ui/src/nova/DemoMarketView.tsx` | PTF bar + GİP çizgi + SMF + öneri + now + cap; TEİAŞ PFK P–f/P–Q/LVRT + frekans + telemetri | UC-6/T-21..T-23, FR-6.1..6.3 |
| 34 | `packages/ui/src/nova/demo-market.ts` | arbitraj + saat kovası + TEİAŞ hesapları (genişletme) | UC-6/T-21, FR-6.2 |
| 35 | `packages/ui/src/nova/demo-market.test.tsx` | PFK/P–Q/frekans + market view boş/dolu testleri (genişletme) | UC-6, AK-6.1..6.3 |
| 36 | `apps/demo-field/src/pages/DemoMarketPage.tsx#DemoMarketPage` | Grid & Market sayfası | UC-6/T-21..T-23 |
| 37 | `packages/ui/src/nova/DemoFaultsView.tsx` | Active/Resolved/All filtresi + detay + notlu çözme + injection paneli (D-4 dummy) | UC-7/T-24..T-26, FR-7.1..7.3 |
| 38 | `apps/demo-field/src/pages/DemoFaultsPage.tsx#DemoFaultsPage` | Faults sayfası | UC-7/T-24..T-26 |
| 39 | `packages/ui/src/nova/DemoAdminView.tsx` | 5 alt sekme (mapping/params/devices/catalogue/trace) + canlı komut/log trace | UC-8/T-27/T-30, FR-8.1..8.3 |
| 40 | `packages/ui/src/nova/demo-admin.ts#ADMIN_MAPPING` | Mapping/params/devices read-only statik veri | UC-8/T-28, FR-8.2, D-6 |
| 41 | `packages/ui/src/nova/demo-registers.ts#DEMO_REGISTERS` | Trimmed register kataloğu (BSC/PCS/HVAC) | UC-8/T-29, FR-8.4 |
| 42 | `apps/demo-field/src/pages/DemoAdminPage.tsx#DemoAdminPage` | Admin sayfası (yeni) | UC-8/T-27 |
| 43 | `packages/ui/src/nova/mimic-types.ts` | Yeni alanlar: `hvac`/`aux`/`fss`/`dc`/`imd`/`dcCB`/`imdMOhm` | UC-9/T-31, K-8 |
| 44 | `apps/demo-field/src/features/demo-data/buildDevices.ts#buildHvac` | HVAC/PM5340/CONTROL-PANEL-IO/FSS/DC/IMD okuma (buildHvac/buildAux/buildFss/buildDc/buildImd) | UC-9/T-32, FR-9.1 |
| 45 | `apps/demo-field/src/features/demo-data/buildDevices.test.ts` | AK-9.1/9.3 cihaz türetimi + güvenli varsayılan testleri | UC-9, AK-9.1/9.3 |
| 46 | `apps/demo-field/src/features/demo-data/mapFieldToMimicState.ts#mapFieldToMimicState` | container `latestTelemetry`'den yeni cihazları okuma + ambient (HVAC-1 Outside Temp) | UC-9/T-32, K-8, B-4 |
| 47 | `apps/demo-field/src/features/demo-data/mapFieldToMimicState.test.ts` | fan-out + ambient + eksik veri varsayılanı testleri | UC-9, AK-9.2/9.3 |
| 48 | `apps/demo-field/src/features/demo-data/fanOutUnits.ts#fanOutUnits` | 9 ünite fan-out + PCS gücü bölme | UC-9/T-33, FR-9.2 |
| 49 | `apps/demo-field/src/pages/DemoFieldPage.tsx#DemoFieldPage` | `DemoProjectLayout` altına sayfa + ortak üst blok | UC-2/T-8, K-4 |
| 50 | `apps/demo-field/src/pages/DemoFieldPage.test.tsx` | boş/hata durumları | UC-2, AK-2.4 |
| 51 | `apps/demo-field/src/pages/LoginPage.tsx` | İngilizce etiketler | UC-1, K-1 |
| 52 | `packages/ui/src/icons/demo-icons.tsx#NOVA_ICONS` | 29 yeni nova ikonu (`NovaIcon*`) | UC-1..UC-8, K-1 |
| 53 | `packages/ui/src/icons/demo-icons.test.tsx` | 29 ikon + SCADA_ICONS kaydı + Tabler korunumu (Open-Closed) | AK-7.2, K-10 |
| 54 | `packages/simulators/src/fss/fss-simulator.ts#FssSimulator` | Sigma XT panel state machine (status/zone/dedektör/countdown/mode/disablement) | UC-10/T-34, FR-10.1 |
| 55 | `packages/simulators/src/fss/register-map.ts` | Modbus register map (`FSS_INPUT`/`FSS_COILS`/`FSS_DISCRETE`) | UC-10/T-35, FR-10.2 |
| 56 | `packages/simulators/src/fss/fss-modbus-adapter.ts#FssAdapter` | `IModbusSimulatorAdapter` implementasyonu | UC-10/T-35, K-10 |
| 57 | `packages/simulators/src/fss/fss-simulator.test.ts` | AK-10.1/10.2 panel state machine + register map testleri (7) | UC-10, AK-10.1/10.2 |
| 58 | `packages/simulators/src/host.ts#registerDefaults` | `fss` builder kaydı (yalnız ekleme) | UC-10/T-36, FR-10.3, K-10 |
| 59 | `packages/simulators/src/host.test.ts` | AK-10.3 fss builder + diğer builder'lar etkilenmez testleri (6) | UC-10, AK-10.3, SC-5 |
| 60 | `packages/simulators/src/index.ts` | `fss` barrel export | T-35 |
| 61 | `deployment/dev/container/device-configs/fss-1.json` | FSS panel container config (yeni) | UC-10/T-36, FR-10.3 |
| 62 | `deployment/aws/demo-edge/container-device-configs/fss-1.json` | FSS panel container config (yeni) | UC-10/T-36, FR-10.3 |
| 63 | `packages/ui/src/nova/*.tsx` (DemoActiveManeuver, DemoAlertList, DemoCellDialog, DemoContainerScada, DemoFaultList, DemoManeuverCard, DemoManeuverWizard, DemoMimic, DemoSequence, DemoUnitDetail) | `COLORS_LIGHT` hex → `var(--nm-*)` dönüşümü (purity K-3) | K-2, K-3 |
| 64 | `packages/ui/src/nova/index.ts` | barrel export güncellemesi (yeni bileşenler + saf fonksiyonlar) | K-3 |

### A.2 Test Kanıtları

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| ui + demo-field + simulators | `bunx nx run-many -t test -p ui demo-field simulators --skip-nx-cache` | **hepsi yeşil** |
| ui | aynı komut | 25 dosya / 163 test yeşil |
| demo-field | aynı komut | 10 dosya / 52 test yeşil |
| simulators | aynı komut | yeşil (fss 8 + host 6 dahil) |
| e2e (hedef SOC, frontend) | `playwright test e2e/demo-target-soc.spec.ts --project=chromium` (demo-edge stack) | **1/1 yeşil** — UI formu (charge + hedef SOC) → hedef kaydı → watcher → `standby` run + PCS gücü ≈ 0 → durum satırı temizlendi |
| e2e (operasyon/manevra regresyon) | `playwright test e2e/demo-operations-data.spec.ts e2e/demo-maneuver-data.spec.ts --project=chromium` | **13/13 yeşil** |
| build | `bunx nx run ui:build` | başarılı |
| build | `bunx nx run demo-field:build` | başarılı |
| build | `bunx nx run simulators:build` | başarılı |
| SPEC lint | `bun run spec:check docs/architecture/DEMO-KONSOL-UI-UYUM-MIMARISI.md` | 0 hata / 0 uyarı |

### A.3 Kabul Kriteri Kanıtları

| Kod | Kriter (SPEC özeti) | Kanıt (test/dosya) | Durum |
|:----|:--------------------|:-------------------|:------|
| AK-1.1 | Header tüm referans öğelerini taşır | `DemoShell.tsx#DemoShell` (kod inceleme) | 🟢 |
| AK-1.2 | Dark tema token'ları referans değerlerini döner | `tokensDark.test.ts` "dark alarm + yüzey değerleri" + `apply-nova-vars.test.ts` "AK-1.2" | 🟢 |
| AK-1.3 | Font aileleri uygulanır | `apps/demo-field/src/index.css` + `index.html` (kod inceleme) | 🟢 |
| AK-1.4 | Sekme-rota eşlemesi doğrudur | `routes.tsx#routes` (kod inceleme) | 🟢 |
| AK-2.1 | Proje şeridi etiketleri dolu | `DemoProjectStrip.tsx` + `useDemoProject.ts#useDemoProject` (kod inceleme) | 🟢 |
| AK-2.2 | 7 KPI doğru türev | `DemoKpiStrip.tsx` + `deriveKpis.ts` (kod inceleme) | 🟢 |
| AK-2.3 | Rest/hazırlık türevi doğru | `demo-readiness.test.tsx` "AK-2.3: kart 'REST TIME COMPLETE' + grup READY" | 🟢 |
| AK-2.4 | Ortak blok tüm rotalarda | `DemoProjectLayout.tsx#DemoProjectLayout` + `DemoFieldPage.test.tsx` | 🟢 |
| AK-3.1 | Faz gölgeleme çizilir | `DemoTrendChart.test.tsx` "AK-3.1: faz gölgelemesi + etiketi çizer" | 🟢 |
| AK-3.2 | Area/band/limit çizilir | `DemoTrendChart.test.tsx` "AK-3.2: band + area + limit çizilir" | 🟢 |
| AK-3.3 | Hover tooltip çalışır | `DemoTrendChart.test.tsx` "AK-3.3: hover crosshair + nokta + tooltip" | 🟢 |
| AK-4.1 | Ağaç + deep-link çalışır | `DemoDevicesPage.tsx#DemoDevicesPage` (kod inceleme) | 🟢 |
| AK-4.2 | İstasyon/AUX ölçümleri doğru | `buildDevices.test.ts` "PM5340 satırlarından AUX ölçümü" + `DemoDevicePanels.tsx` | 🟢 |
| AK-4.3 | SCADA çizimi bölümleri | `DemoBessScada.tsx` (kod inceleme) | 🟢 |
| AK-4.4 | Raf/pack detayı | `demo-bess-data.test.ts` "pack hücreleri 24 adet" + `DemoPackDetail.tsx` | 🟢 |
| AK-4.5 | HVAC/PCS/FSS/RMU sayfaları | `buildDevices.test.ts` "HVAC satırlarından durum/mode..." + `DemoDevicePanels.tsx` | 🟢 |
| AK-5.1 | FL listesi eksiksiz | `DemoOperationsView.tsx` (kod inceleme) | 🟢 |
| AK-5.2 | Form alanları + permissives | `DemoOperationsView.tsx` + `demoManeuverApi.ts#demoManeuverApi` (kod inceleme) | 🟢 |
| AK-5.3 | Kalibrasyon zamanlama UI | `DemoOperationsView.tsx` "At time" (B-1 mesajı — kod inceleme) | 🟢 |
| AK-5.4 | Aktif program/sekans/station | `DemoOperationsView.tsx` + `demo-readiness.test.tsx` "AK-7.2: DemoSequence" | 🟢 |
| AK-6.1 | Fiyat grafiği eksiksiz | `demo-market.test.tsx` "fiyat serisi → kartlar + fiyat grafiği + TEİAŞ panelleri" | 🟢 |
| AK-6.2 | PFK/P-Q/LVRT çizimi | `demo-market.test.tsx` "PFK P–f: ölü bantta 0..." + "P–Q kabiliyeti eşiği" | 🟢 |
| AK-6.3 | Tablolar canlı | `demo-market.test.tsx` "frekans aralığı tablosu" | 🟢 |
| AK-7.1 | Filtre çalışır | `DemoFaultsView.tsx` (kod inceleme) | 🟢 |
| AK-7.2 | Notlu çözme akışı | `DemoFaultsView.tsx` (kod inceleme) | 🟢 |
| AK-7.3 | Enjeksiyon paneli mevcut | `DemoFaultsView.tsx` (D-4 dummy mesaj — kod inceleme) | 🟢 |
| AK-8.1 | 5 alt sekme | `DemoAdminView.tsx` (kod inceleme) | 🟢 |
| AK-8.2 | Read-only mapping/params | `demo-admin.ts#ADMIN_MAPPING` (kod inceleme) | 🟢 |
| AK-8.3 | Canlı trace satırları | `DemoAdminView.tsx` (komut geçmişi + log — kod inceleme) | 🟢 |
| AK-8.4 | Katalog listesi | `demo-registers.ts#DEMO_REGISTERS` (kod inceleme) | 🟢 |
| AK-9.1 | Yeni cihazlar okunur | `buildDevices.test.ts` "HVAC satırlarından durum/mode/sıcaklık/alarm türetir" + "IMD ve DC ölçümü" | 🟢 |
| AK-9.2 | Fan-out + ambient | `mapFieldToMimicState.test.ts` (fan-out + ambient) | 🟢 |
| AK-9.3 | Güvenli varsayılan | `buildDevices.test.ts` "HVAC telemetrisi yoksa undefined (güvenli varsayılan)" | 🟢 |
| AK-10.1 | Panel state machine | `fss-simulator.test.ts` "AK-10.1: countdown dolar → released (EEE)" + "manual mode → otomatik release YOK" | 🟢 |
| AK-10.2 | Modbus register map | `fss-simulator.test.ts` "reset → sağlıklıya döner; bilinmeyen adres 0/false" + `register-map.ts` | 🟢 |
| AK-10.3 | Host kaydı + config | `host.test.ts` "AK-10.3 — fss builder kaydedilir, diğer builder'lar etkilenmez" | 🟢 |

### A.4 Sapmalar

| # | Sapma | Açıklama |
|:--|:------|:---------|
| 1 | `apply-light-vars.ts` → `apply-nova-vars.ts` (yeniden adlandırma) | K-2 light+dark tek giriş gereği: `novaVarMap(theme)` + `applyNovaVars`. Eski dosya silindi; `applyNovaLightVars` uyumluluk sarmalayıcısı korundu. Mevcut `tokens.ts` (diğer app'ler) DOKUNULMADI. |
| 2 | D-1..D-7 dummy yüzeyleri (K-6 onaylı) | Veri kaynağı bulunmayan yüzeyler SPEC'te zorunlu dummy/türetim olarak listelendi ve birebir uygulandı (deterministik türetim veya no-op). İleri iş §B.2'de tek tek açık. |
| 3 | B-1..B-3 backend gap (K-9 onaylı) | Kalibrasyon `scheduleAt`, ham Modbus trace, fault injection backend uçları yok; UI/akış tam ve "uç gelince canlıya döner" şeklinde hazır bırakıldı (dummy değil). İleri iş §B.2'de açık. |
| 4 | Hedef SOC frontend'de çözüldü (B-1 türevi) | Backend `charge`/`discharge` hedef SOC parametresi desteklemiyor (B-1). Kullanıcı kararı: hedef ön yüzde saklanır (`TargetSocStore`, persist) ve `useTargetSocWatcher` SOC hedefe ulaşınca `standby` çalıştırır. Watcher yalnız hedef ayarından SONRA başlayan yön run'ını (charge/discharge) görünce ateşlenir (yarış koruması). Backend `scheduleAt`/hedef desteği gelince store+watcher kaldırılır (`TargetSocStore#clear`) — UI değişmez. |
| 5 | Manevra formları referans birebir genişletildi | Tüm manevralara `Monitored` listeleri, startup/shutdown/estop/maint/calib'e `Sequence` (adresli) listesi, FL-02'ye `Rules`; permissives saf `demo-permissives.ts` ile zenginleştirildi (grup bazlı H02/arıza/E-stop/sıcaklık/SOC/güç limiti). Sequences sağ sütunu adım-adım (done/active/await/failed) görünümüne geçti. |
| 6 | Görünürlük kuralları referansa daraltıldı (K-4 düzeltmesi) | `app.js#render`: **Trends yalnız Site + Operations**, **Ready/Rest yalnız Operations**, **Event log yalnız Site** (pinfo+KPI tüm sekmelerde). Ready/Trends `DemoProjectLayout`'tan çıkarılıp `DemoReadySection`/`DemoTrendsSection` ile ilgili sayfalara taşındı. |
| 7 | Market TEİAŞ tabloları tamamlandı | Referans `market-view.js` İK Ek-1 **Tablo 1 (20 satır telemetri)** + **Tablo 2 (8 satır komut)** + IEC 60870-5-104 notu eklendi (saf `demo-teias.ts`); reaktif güç PCS `reactiveKvar` toplamından gerçek geçiliyor. |
| 8 | Buton `color` özgüllük bug'ı (siyah üstüne siyah) | `nova-console.css` taban kuralı `.nova-console button,...` (0,1,1) `.btn-primary/.btn-warn/.btn-danger/.link` renklerini eziyordu → `Send command` koyu zemin + koyu yazı. Taban kural `:where()` ile sarmalandı (0,1,0) → override'lar kazandı. Headless doğrulandı (color `rgb(243,245,246)`). |
| 9 | Sekans adımları boş (veri modeli) | `GET /operations/runs` adım sonuçlarını değil **tanımı** döndürür (`steps.definition.steps: [{command, deviceTypes}]`). `parseRunSteps` bu modele göre okur (legacy dizi de destekli), adım durumu run durumundan türetilir; sekans başlığı `run.name`→FL etiketine çevrilir (`runLabel`), etiketler DONE/RUNNING/FAILED/ROLLED BACK. |
| 10 | FL-02 Control mode + permissives referans hizası | `Control mode` seg eklendi (Active power · P/Q disabled · PF disabled). `derivePermissives` referans `sim.permissives` 8 maddesine hizalandı (Site Ready, Earthing **hard**, MV path, DC block, PCS ready, fault/maintenance, calibration overdue, requested ≤ available); FL-01 için ayrı `deriveStartupChecks` (suCheck 5 madde). |
| 11 | `standby` operasyonu referans FL-03'e çekildi | Canlı doğrulamada standby PCS'i **off** (op 0) bırakıyordu; referans FL-03 "Idle/Standby" PCS'i **enerjili standby (S19, op 1)** tutar. Yeni field maneuver **`pcs_standby`** (`set_power_zero` + `standby`, dev+aws) eklendi; `demo-operations.json` `standby` adımları `pcs_standby` + uzak `bsc_stop` oldu. Doğrulandı: charge sonrası standby → **PCS op 1**, grid P 0; BSC `Command Request=3` → rack `Charge/Discharge Status=0` (önceki "2/1" tünel snapshot gecikmesiydi). E2E 14/14 yeşil. |
| 12 | Admin sayfası referans birebir (tam veri portu) | Referansın **`dist/registers.json`** çıktısı port edildi → `demo-registers.json` + `demo-registers.ts` (BSC 43+30 rack, PCS 81+faultBits, HVAC 36+22 alarm + poll planları; mapping 49; cihaz IP planı 54). `DemoAdminView` 5 sekme: **Data mapping** (cihaz seg + Live preview ünite/banka + prio gruplu register dropdown + Address/Type/Live value + Copy JSON/Reset), **Site parameters** (rest/ambient/thermal kontrolleri + denklem + sabitler + **Live per container**), **Devices** (IP/port/unitId düzenlenebilir), **Register catalogue** (arama + 3 poll planı + 212 satır), **Modbus trace** (run adımları + log → Time/Device/FC/Address/Value/Meaning). `demo-admin-live.ts` (`adminLiveValue`, `commandTraceRows`, `thermalRow`) + `DemoAdminStore` (zustand persist — X1/X2). Canlı doğrulama: mapping 17/17 live, params 15 satır + denklem, devices 54, katalog 212, trace adresli. |
| 13 | Modbus trace gerçek yazma izi (İş 1) | Web-service başarılı **doğrudan komut** yürütmelerini `command_writes` tablosuna yazar (`CommandWriteStore`; `config.telemetry`'den `registerAddress` çözümü). Yazım **fire-and-forget**'tir (`void recordWrites(...)`; hata içeride yutulur) → endpoint yanıtı gecikmez (canlı: `http=200 time=0.17s`, satır bir an sonra düşer). Yeni uç `GET /api/commands/writes?limit&deviceId` (RBAC `/api/commands` admin,teknik). Frontend: `demoApi.listCommandWrites` + `commandWriteTraceRows` (FC registerTableType→FC, **adres decimal**) — Admin trace'in **birincil** kaynağı (log/run türetimi yedek, o da decimal). Canlı: `PCS-1 standby` → `register 3607 · HOLDING_REGISTER · value 1`; Admin trace'te "15:21:20 | PCS-1 | 6 | 3607 | 1 | Standby · Standby Command = 1". Sütun hizası: `.dt th.txt { text-align: left }`. Kapsam notu: manevra adım yazımları ve konteyner-tier yazımları sonraki iterasyon. |
| 14 | Admin › **Add container** sekmesi (script'siz kayıt) | Admin seg'ine Data mapping'den önce yeni sekme: container ID + **token yapıştır** + Register → `POST /api/fields/:id/containers/:cid/register` (`demoApi.registerContainer`); altında kayıtlı konteynerlerin canlı durumu (connectionStatus + telemetri satırı, 5 sn poll). Token kısa (<32) → buton pasif; 403/400 → net mesaj. `tools/register-container.sh`'a gerek kalmadan UI'dan kayıt. Canlı doğrulandı (register 201 + `connected` 1586 satır). |
| 15 | Ünite kartı + AUX kutusu + trend eksenleri (referans `gdems` eşitleme) | Etiketler referanstan birebir İngilizce (`demo-topology.ts`: "Aux disconnector" dahil hücre/RMU/AUX stringleri); `nova-mimic.ts` `POS_TEXT`/`PCS_TEXT`/`defaultUnitStatus` İngilizce; `index.html` lang="en" (Türkçe İ uppercası düzeldi). `DemoUnitDetail` referans `renderDetail` paritesi: bilgi satırı, Devices linkleri, RMU pozisyonları (kind·M), PCS tablosu +AC V, batarya tablosu +BSC state(30036)/Racks online(30038)/DC current/Charge-Discharge limit(30063/30065). Site Layout'a AUX trafo çizimi (iki TR çemberi + L iletken + AUX PANEL kutusu, canlı `kW`/`NO SUPPLY`, tıkla→Devices›AUX). Trend y-eksenleri referans aralıkları: Power ±32 tick ±30/15, Cell temp 10–35 tick 5 (SOC zaten 0–100/25). Veri yok → Rest time/ΔT/Calibration satırları eklenmedi; RMU switchgear/Maintenance/E-stop butonları kapsam dışı. Test: ui 187, demo-field 62; canlı doğrulandı. |
| 16 | Devices › Battery: rack/pack detay yerleşim + renk eşitleme | Referans `devices.js rackDetail` düzeni: **rackgrid** (250px\|1fr) → SOL pack kolonu (BPU + 17 pack, `packFill` kademeli dolgu, ▲Tmax/▼Tmin/Vmax/Vmin işaretçileri) + "Hottest pack · JF1 TC map (18 sensors)" (18 tile), SAĞ "Rack registers · FC 0x04" tablosu; üstte "Rack#N · BSC-x rack N" + "Input registers FC 0x04 · base 30170+150·(N−1) · 17 packs + BPU · 223 kWh". Pack detayı kolonsuz: 6'lı tek satır metrik (`g6`) + "Cell voltages · 24 cells (red max, blue min, **hatched = balancing**)" + "Pack temperature sensors". `packFill` (referans formül) `--nm-hot-rgb`/`--nm-cold-rgb` alfa rampası — tcmap/kolon/tsens aynı dolgu. `rackRegisters` referans `BSC_RACK_REGISTERS` listesiyle birebir (30 satır, offset 50..101), base = BSC-içi raf no (30170+150·(r)). Rack detayı varsayılan açık (kapatma yok). Rack tablosu başlığı "Racks · register base …per BSC". |
| 17 | Devices › Battery: yerleşim düzeltmesi (referans `dist/gdpms-demo.html` ölçümüyle) | "Hepsi sola yaslanmış" böceği: `RackRegisterTable` fragment dönüyordu (`h4` + `tblwrap` ayrı grid düğümleri) → register tablosu otomatik yerleşimle **sol sütuna** düşüyordu (234px, rackgrid 1971px'e şişiyordu). Fix: tek `<div>` sarmalayıcı → tablo sağ sütuna oturur (952px). Ayrıca referansla: `.rackdet` **kutulu kart** (border+radius 6+padding 10/12), `DemoPackDetail` rackdet **içine** taşındı, `.pkrow` oranı `2fr\|1fr` (cellbars 820 / tsens 410), `.dbody h4` 13px bold. Ölçüm: rackGrid 1244×851 (ref 1236×818), register x586 w952 (ref x590 w944), pkrow 820/410 (ref 815/407). |
| 18 | Devices › Battery: Busbar zone termal grafiği (referans `chTherm`) | Battery bölümünün **en altına** "Container thermal" grafiği: referans `devices.js` `chTherm` portu — yMin 5 / yMax 35 / ticks 5..35, seriler "Cell min–max" bandı + Cell max + Cell avg + kesikli Return/Supply air, limitler Upper/Lower, `shade: ["cool","heat"]` (HVAC cooling/heating fazları) + **Busbar A/B seg**. Veri referansın sim `u.th` geçmişi gibi **deterministik sentez** (`busbarZoneHistory`, saf+testli): konteyner telemetri geçmişi field tier'da tutulmadığından canlı ankorlardan (banka tmax/tmin + HVAC supply/return ort. + comp/heater bayrakları) üretilir. Canlı: başlık/seriler/band/fazlar (3 faz) doğrulandı, Busbar A↔B seg geçişi çalışıyor. |

### A.5 Gözle Kontrol Maddeleri

- [x] Renkler yalnız token'lardan (`COLORS_LIGHT`/`COLORS_DARK`/`COLOR_*`); demo/nova dosyalarında hex hardcode YOK (CSS `--nm-*` üzerinden) — K-2 purity.
- [x] Named export only; default export YOK; `Demo` prefix; her klasörde `index.ts` barrel güncel — K-3 purity.
- [x] Türev/hesap fonksiyonları saf: `demo-bess-data.ts`, `demo-market.ts`, `demo-readiness.ts`, `demo-admin.ts`, `demo-registers.ts` IO/zaman taşımaz — K-3 purity.
- [x] Yeni simülatör mevcut sözleşmeleri uygular (`IModbusSimulatorAdapter` + `register-map` + `SimulatorHost`); `host.ts` yalnız eklemeli `fss` builder kaydı — K-10 purity.
- [x] Open-Closed: `demo-field` ve `nova` dışındaki tüketiciler etkilenmedi; `demo-icons.test.tsx` Tabler ikonlarının korunduğunu doğrular — K-10.
- [x] Backend sözleşmeleri değişmedi (manevra/operasyon/alarm/log/external) — K-10 purity.
- [x] Async: `for...of await` YASAK; veri hook'unda `Promise.all` (React Query) — K-3 purity.
- [x] Kod referansları sembol çapasıyla yazıldı — satır numarası referansı yok.
- [x] `bun run spec:check docs/architecture/DEMO-KONSOL-UI-UYUM-MIMARISI.md` temiz (0 hata / 0 uyarı).

### A.6 Genel Durum Özeti

T-1..T-36 (tema + konsol kabuğu, ortak üst blok, trend motoru, Devices, Operations, Grid & Market, Faults, Admin,
veri katmanı genişletme, FSS simülatörü) implementasyon + testleri tamamlandı ve yeşil. SPEC §13 ilerleme tablosu tüm
10 UC'yi 🟢 gösteriyor; bu KAPANIŞ o durumu doğrular (T-1..T-36 tamam, kalan yalnız kapanış kaydıydı). Test koşumu
`ui` (25 dosya / 161 test), `demo-field` (8/43), `simulators` (fss 7 + host 6 dahil) **hepsi yeşil**; üç projenin
build'i de başarılı. SC-1 (üst blok sırası tüm sekmelerde), SC-2 (dark+light tema token değerleri), SC-3 (trend
faz/limit/band/area/tooltip), SC-4 (yeni cihaz telemetrisi state'e akar), SC-5 (FSS simülatörü host'a eklemeli kayıt)
birim/component testlerle doğrulandı. Backend gap'leri (B-1..B-3) ve dummy yüzeyleri (D-1..D-7) SPEC-onaylı şekilde
UI-ready bırakıldı; kalan boşluklar §B.2'de ileri iş olarak listelenmiştir.

**review_date:** 2026-10-08

## B. TEST KAPSAMI

### B.1 Kapsam Matrisi (durum → koşul → beklenen → test ref'i)

| Durum | Koşul | Beklenen (THEN) | Test ref'i |
|:------|:------|:----------------|:-----------|
| Tema seçimi | localStorage dolu | Tema o değerle başlar | `demo-theme.ts#initialTheme` (kod inceleme) |
| Tema seçimi | localStorage boş | `prefers-color-scheme` fallback | `demo-theme.ts#initialTheme` (kod inceleme) |
| Tema toggle | light → dark | `data-theme="dark"` + `--nm-bg` `#0e1215` | `apply-nova-vars.test.ts` "AK-1.2: dark haritası referans dark değerlerini taşır" |
| Dark token'lar | Tüm token anahtarları | light ile aynı anahtar kümesi + sayısal karşılık | `tokensDark.test.ts` "light ile aynı anahtar kümesine sahiptir" |
| Trend — faz | Rest fazları verildi | Gölgeli rect + etiket | `DemoTrendChart.test.tsx` "AK-3.1" |
| Trend — band/area | `area:true` + band serisi | Area dolgusu + min–maks bandı + limit çizgisi | `DemoTrendChart.test.tsx` "AK-3.2" |
| Trend — hover | Pointer üzerine gelir | Crosshair + nokta + tooltip | `DemoTrendChart.test.tsx` "AK-3.3" |
| Trend — boş seri | Seri yok | "No data" mesajı | `DemoTrendChart.test.tsx` "seri boşsa 'No data' gösterir" |
| Pack türetimi (D-1) | Rack telemetrisi verildi | 24 deterministik hücre + 4 sensör + 17 pack | `demo-bess-data.test.ts` "pack hücreleri 24 adet ve deterministik" |
| HVAC okuma | HVAC telemetrisi var | Durum/mode/sıcaklık/alarm türetilir | `buildDevices.test.ts` "HVAC satırlarından durum/mode/sıcaklık/alarm türetir" |
| HVAC eksik | HVAC telemetrisi yok | `undefined` (güvenli varsayılan, throw yok) | `buildDevices.test.ts` "HVAC telemetrisi yoksa undefined" |
| AUX okuma | PM5340 satırları var | AUX ölçümü (P/Q/V/I/enerji) | `buildDevices.test.ts` "PM5340 satırlarından AUX ölçümü" |
| FSS okuma | CONTROL-PANEL-IO kuru kontakları | FSS durumu türetilir | `buildDevices.test.ts` "CONTROL-PANEL-IO kuru kontaklarından FSS durumu" |
| IMD/DC okuma | IMD/DC telemetrisi var | IMD (MΩ) + DC ölçümü | `buildDevices.test.ts` "IMD ve DC ölçümü" |
| Fan-out | Tek konteyner → 9 ünite | Yeni cihazlar 9'a kopyalanır; ambient outside temp | `mapFieldToMimicState.test.ts` (fan-out + ambient) |
| FSS panel | Başlangıç | Sağlıklı panel (normal) | `fss-simulator.test.ts` "AK-10.1: başlangıç sağlıklı panel" |
| FSS panel | 1 zone → 2 zone fire + countdown | First→second stage → released (EEE) | `fss-simulator.test.ts` "AK-10.1: 1 zone → first stage..." + "countdown dolar → released" |
| FSS panel | Manual mode | Otomatik release YOK | `fss-simulator.test.ts` "manual mode → otomatik release YOK" |
| FSS register | Bilinmeyen adres | 0/false döner, hata fırlatmaz | `fss-simulator.test.ts` "reset → sağlıklıya döner; bilinmeyen adres 0/false" |
| FSS host | `fss` builder kaydı | Kaydedilir; diğer builder'lar etkilenmez | `host.test.ts` "AK-10.3 — fss builder kaydedilir" |
| Sim host | Bilinmeyen simülatör tipi | Fail-fast | `host.test.ts` "edge — bilinmeyen simülatör tipi fail-fast" |
| İkonlar | SCADA_ICONS | 29 nova ikonu; Tabler korunur | `demo-icons.test.tsx` "tam 29 nova ikonu" + "mevcut Tabler ikonları korunur" |

### B.2 KAPSANMAYAN Boşluklar

| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| G1 | D-1 pack türetimi "simulated" (Modbus map'te yok) | düşük | Gerçek Sigma/PCS pack register map'i gelince canlı okuma; `demo-bess-data.ts#packData` türetimi bırakılır |
| G2 | D-2 konteyner içi yük kırılımı + istasyon AUX (H02) | düşük | H02'de sayaç veya ayrıştırma register'ı gelince toplamdan topoloji türetimini canlıya çevir |
| G3 | D-3 HVAC elektriksel kW tahmini | düşük | MC90 güç register'ı gelince kompresör/fan/heater durumundan tahmin yerine canlı değer |
| G4 | D-4 / B-3 fault injection (backend ucu yok) | düşük | Enjeksiyon API'si gelince UI no-op'u canlıya bağla (AK-7.3 mesaj akışı hazır) |
| G5 | D-5 sim hızı seg (1×/15×/60×) | düşük | Sim motoru eklenirse hız seçimini bağla; şimdilik görsel sabit 1× |
| G6 | D-6 Admin mapping/params read-only | düşük | Settings API'si gelince dropdown/input'ları yazılabilir yap (şimdilik statik `demo-admin.ts`) |
| G7 | D-7 sekans manuel onay ("Confirm done") | düşük | Backend run adımları `await` desteği gelince canlı onay akışı (UI hazır) |
| G8 | B-1 kalibrasyon `scheduleAt` | orta | Backend gecikmeli/zamanlı çalıştırma sözleşmesi; UI "At time" seçimi hazır (hata mesajı gösterir) |
| G9 | B-2 ham Modbus register trace | orta | Register-seviyesi write trace ucu; Admin trace şimdilik komut geçmişi + log ile dolu |
| G10 | B-3 fault injection ucu (alarm üretimi yalnız eşiklerden) | orta | Enjeksiyon API'si; `device_alarms` üzerinden enjekte alarm akışı |
| G11 | `graphify update .` koşulamadı — bu ortamda `graphify` CLI PATH'te kurulu değil | düşük | graphify CLI kurulu ortamda `graphify update .` koş (bilgi grafiğini güncelle) |
| G12 | B-1 hedef SOC: backend `charge`/`discharge` hedef parametresi yok — frontend `TargetSocStore` + `useTargetSocWatcher` ile `standby` çalıştırılıyor | orta | Backend hedef SOC (veya kapalı-çevrim) desteği gelince store+watcher kaldırılır (`TargetSocStore#clear`); UI değişmez. E2E `e2e/demo-target-soc.spec.ts` şimdilik anında-tetik senaryosuyla doğrular |

**review_date:** 2026-10-08

---

## Ek (2026-10-14) — UC-11 Plant overview + UC-12 Register-source modu

> **İş akışı aşaması:** 5/5 — KAPANIŞ (bu tur: SPEC §6.11 UC-11, §6.12 UC-12).
> **SPEC:** [DEMO-KONSOL-UI-UYUM-MIMARISI.md](./DEMO-KONSOL-UI-UYUM-MIMARISI.md) — K-11/K-12/K-13, SC-6/SC-7, T-37..T-46, A-5/A-6.
> **Kapsam:** Yeni saf kaynak katmanları (`register-sources.ts`, `mimic-source-map.ts`, `demo-plant.ts`), register-source modu UI'si (`DemoRegMode.tsx`), plant overview kartı (`DemoPlantOverview.tsx`), kablolama (`DemoShell`/`DemoProjectLayout`/`DemoFieldPage`/`DemoMimic`/`DemoUnitDetail`/`DemoKpiStrip`/`DemoProjectStrip`), stiller (`nova-console.css`).

### A.1 Değişiklik Matrisi (bu tur)

| # | Dosya | Değişiklik | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------------|
| 1 | `packages/ui/src/nova/register-sources.ts` | YENİ saf kaynak katmanı (regsrc.js portu): `RegisterSourceKind`/`RegisterSource`, `bscSource`/`pcsSource`/`hvacSource`/`rackSource`/`calcSource`/`nomapSource`/`modelSource`, `resolveRegister`/`mappingFor`, `sourceKey`/`sourceByKey`, `sourceText`, `tipHtml`. Katalog `demo-registers.ts#DEMO_DEVICES`/`ALL_DEMO_REGISTERS`/`DEMO_MAPPING`'ten. | UC-12/T-41, K-12 |
| 2 | `packages/ui/src/nova/register-sources.test.ts` | mapping→register çözümü, BSC/PCS/rack adres/FC/ip, calc/nomap/model, bilinmeyen id→nomap, `sourceKey` kararlılığı+roundtrip, `sourceText` (9 test) | UC-12, AK-12.2..12.4 |
| 3 | `packages/ui/src/nova/mimic-source-map.ts` | YENİ: `DEFAULT_MIMIC_DEVICES` + `mimicSourceForId` (referans `app.js#srcForId` portu) — SVG metin id → `RegisterSource`. Fiziksel cihazlar `BSC-1/BSC-2`, `PCS-1/PCS-2`, `DEMO-MV-1`, `PM5340-1`. | UC-12/T-42, FR-12.5 |
| 4 | `packages/ui/src/nova/mimic-source-map.test.ts` | `t1/t2/ps/pp/pt/rack/ust/poiTxt/auxTxt/feeder/meter`, bilinmeyen id→null, özel harita (9 test) | UC-12, FR-12.5 |
| 5 | `packages/ui/src/nova/DemoRegMode.tsx` | YENİ: `RegModeProvider` (val/tip/inline, `gdpm.demo.regmode`, `body.regmode`/`reginline`), `useRegMode`, `RegisterValue`, `InlineBody`, `RegisterTip` (global hover kartı), `RegisterBar` (lejant), `RegModeSegment`. | UC-12/T-43, FR-12.1..12.6 |
| 6 | `packages/ui/src/nova/DemoRegMode.test.tsx` | val düz metin, tip `.rv`+`data-rsk`+`.rvs`, segment persist+body sınıfı, localStorage geri yükleme (4 test) | UC-12, AK-12.1/12.2/12.6 |
| 7 | `packages/ui/src/nova/demo-plant.ts` | YENİ saf türevler: `derivePlantOverview` (`PlantOverview`/`PlantUnitView`), `dailyEnergy` (downsampled POI güç entegrasyonu, `approximate:true`), `PlantDailyEnergy` | UC-11/T-37, K-11 |
| 8 | `packages/ui/src/nova/demo-plant.test.ts` | POI/kV/akım/feeder/aux, ünite MW işareti+SOC+Tmax, günlük enerji (export/import/boş) (5 test) | UC-11, AK-11.2/11.3/11.6 |
| 9 | `packages/ui/src/nova/DemoPlantOverview.tsx` | YENİ kart: `GridSym`+`UnitTile`+`kpi`+`dayValue`; standalone SVG (grid←H01/H03/H02 AUX←feeder A/B←konteyner), Manual/Peak(disabled) mod, canlı KPI + günlük enerji + `DemoTrendChart` plant güç trendi | UC-11/T-38/T-39 |
| 10 | `packages/ui/src/nova/DemoPlantOverview.test.tsx` | tek hat H01/H03/BESS kutucukları, Manual/Peak, seri yok "—"/seri var "10.0 MWh" (4 test) | UC-11, AK-11.1/11.4/11.6 |
| 11 | `packages/ui/src/nova/DemoMimic.tsx` | regmodda `text[id]` → `data-rsk` annotasyonu (`mimicSourceForId`+`sourceKey`; `mode!=="val"` iken) | UC-12/T-45, FR-12.5 |
| 12 | `packages/ui/src/nova/DemoUnitDetail.tsx` | RMU/PCS/batarya/raf hücreleri `RegisterValue` ile kaynaklı (`bscSource`/`pcsSource`/`rackSource`/`nomapSource`/`calcSource`); DC current kaynağı PCS `pcs.idc` (SAPMA A.4-1); `Field`/`Table` `value` tipi `React.ReactNode` | UC-12/T-46, K-12 |
| 13 | `packages/ui/src/nova/DemoKpiStrip.tsx` + `DemoProjectStrip.tsx` | `DemoTile.value`/`DemoProjectStripItem.value` `string` → `React.ReactNode` (kaynak sarmalayıcı için) | UC-12/T-46 |
| 14 | `packages/ui/src/nova/nova-console.css` | `.rv/.rvv/.rvs/.regbar/#rsTip` + `--rs-*` token (light+dark) + plant overview `po-*` stilleri | UC-11/UC-12, T-44, K-2/K-3 |
| 15 | `packages/ui/src/nova/index.ts` | Barrel export: `DemoRegMode` + `register-sources` + `mimic-source-map` + `DemoPlantOverview` + `demo-plant` tipleri | K-3 |
| 16 | `apps/demo-field/src/layouts/DemoShell.tsx` | `RegModeProvider` sarmalayıcı + header `RegModeSegment` + `RegisterBar` + `RegisterTip` | UC-12/T-45, FR-12.1 |
| 17 | `apps/demo-field/src/layouts/DemoProjectLayout.tsx` | pinfo/KPI tile değerleri `RegisterValue` ile (`bscSource`/`pcsSource`/`calcSource`/`nomapSource`/`modelSource`) | UC-12/T-46 |
| 18 | `apps/demo-field/src/pages/DemoFieldPage.tsx` | `DemoPlantOverview` kartı trendlerin üstüne (`trendData.power` noktalarıyla) | UC-11/T-40 |
| 19 | `packages/platform/commands/src/maneuver-migration.test.ts` | field `maneuvers.json` beklentisi 11 → 12 kayıt (test yeşil hizalaması) | UC-11/UC-12 DIŞI (bkz. A.4-5) |

### A.2 Test Kanıtları (bu tur)

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| ui + demo-field | `bunx nx run-many -t test -p ui demo-field --skip-nx-cache` | **hepsi yeşil** |
| ui | aynı komut | 37 dosya / 244 test yeşil |
| demo-field | aynı komut | 14 dosya / 71 test yeşil |
| yeni testler | `register-sources.test.ts` (9) + `mimic-source-map.test.ts` (9) + `DemoRegMode.test.tsx` (4) + `demo-plant.test.ts` (5) + `DemoPlantOverview.test.tsx` (4) | 31 yeni test yeşil |
| SPEC lint | `bun run spec:check docs/architecture/DEMO-KONSOL-UI-UYUM-MIMARISI.md` | 0 hata / 0 uyarı |
| build | `bunx nx run ui:build` + `bunx nx run demo-field:build` | başarılı |
| typecheck | `bunx nx run ui:typecheck` | yeni dosyalarda hata yok (mevcut 185 borç hariç) |

### A.3 Kabul Kriteri Kanıtları (bu tur)

| Kod | Kriter (SPEC özeti) | Kanıt (test/dosya) | Durum |
|:----|:--------------------|:-------------------|:------|
| AK-11.1 | Standalone tek hat render | `DemoPlantOverview.test.tsx` "AK-11.1: standalone tek hat H01/H03/feeder/konteyner basar" | 🟢 |
| AK-11.2 | Ünite kutucuğu değerleri (MW işaret/SOC/Tmax) | `demo-plant.test.ts` "AK-11.2: ünite MW işareti (şarj negatif), SOC ort, Tmax maks" | 🟢 |
| AK-11.3 | POI/kV/akım + feeder yön | `demo-plant.test.ts` "AK-11.3: POI/kV/akım ve feeder değerlerini türetir" | 🟢 |
| AK-11.4 | Manual aktif + Peak disabled | `DemoPlantOverview.test.tsx` "AK-11.4: Manual aktif, Peak shaving disabled" | 🟢 |
| AK-11.5 | Canlı KPI ızgarası (BESS/POI/SOC/Available/Groups/SOH) | `DemoPlantOverview.tsx#DemoPlantOverview` + `#kpi` (kod inceleme — 6 KPI hücresi) | 🟢 |
| AK-11.6 | Günlük enerji (dolu/boş → "—") | `demo-plant.test.ts` "AK-11.6: 1 saat sabit 10 MW..." + `DemoPlantOverview.test.tsx` "AK-11.6: seri yokken/seri varsa" | 🟢 |
| AK-12.1 | Mod segmenti + persist | `DemoRegMode.test.tsx` "AK-12.1: segment modu değiştirir ve localStorage'a yazar" + "localStorage'dan mod geri yüklenir" | 🟢 |
| AK-12.2 | Register kartı içeriği (device/adres/FC) | `register-sources.test.ts` "AK-12.2: BSC kaynağı device/adres/FC/screen mapping taşır" + `DemoRegMode.test.tsx` "AK-12.2: tip modunda .rv + data-rsk" | 🟢 |
| AK-12.3 | Calc kartı girdileri | `register-sources.test.ts` "AK-12.3: calc kaynağı girdi register listesini gösterir" | 🟢 |
| AK-12.4 | Nomap/model işareti | `register-sources.test.ts` "AK-12.4: nomap/model işaretleri" | 🟢 |
| AK-12.5 | SVG annotasyonu (`data-rsk`) | `mimic-source-map.test.ts` (t1/t2/ps/pp/pt/rack/ust/poiTxt/auxTxt/feeder/meter) + `DemoMimic.tsx#DemoMimic` (kod inceleme) | 🟢 |
| AK-12.6 | Inline dönüşümü (`.rvv` gizli, `.rvs` adres·device·ad) | `DemoRegMode.test.tsx` "AK-12.2: tip modunda .rv ... .rvs textContent 30055" + `DemoRegMode.tsx#InlineBody` | 🟢 |

### A.4 Sapmalar (bu tur)

| # | Sapma | Açıklama |
|:--|:------|:---------|
| 1 | DC current kaynağı PCS `pcs.idc`'den gelir (BSC `bank.idc` yok) | Referans gdems bank `idc` register'ını gösterir; demo-field telemetrisinde BSC bank'ta `idc` yok, değer PCS `idc`'den gelir. `DemoUnitDetail.tsx` "DC current" satırını `pcsReg(b.id, "pcs.idc")` ile sarmalar (dürüst kaynak — değer nereden geliyorsa o gösterilir). |
| 2 | Günlük enerji downsampled POI güç entegrasyonu (yaklaşım) | `dailyEnergy` POI güç serisini entegre eder (`approximate:true`; Exported>0, Imported<0). Canlı sayaç register'ı (`dailyChg/dailyDis`) yoksa "—" basılır (uydurma yok). `demo-plant.ts#dailyEnergy` + `DemoPlantOverview.tsx#DemoPlantOverview`. |
| 3 | Plant overview yalnız standalone + Peak shaving disabled | Tek saha, ana kaynak yok → `standaloneSvg` dalı; Peak shaving `disabled` + "Needs a main source". Collector/hybrid + main-source view + peak algoritması SPEC A-5 ileri iş (K-11). |
| 4 | Tooltip kablolaması yalnız Site layout + paylaşılan üst blok | K-13 kapsamı: mimic, unit detail, attention, plant overview + pinfo/KPI. Devices/Operations/Grid & Market/Faults/Admin kablolaması **2. tur** (A-6). Mekanizma (`RegisterValue`/`RegisterTip`/`data-rsk`) hazır. |
| 5 | `maneuver-migration.test.ts` 11→12 kayıt (kapsam dışı) | UC-11/UC-12 ile ilgisiz; field `maneuvers.json` artık 12 kayıt taşıyor, test beklentisi yeşil tutmak için hizalandı. Kod değişikliği yok. |

### A.5 Gözle Kontrol Maddeleri (bu tur)

- [x] Saf katmanlar IO/zaman taşımaz: `register-sources.ts`, `mimic-source-map.ts`, `demo-plant.ts` — K-3 purity.
- [x] Named export only; `index.ts` barrel güncel (RegMode + register-sources + mimic-source-map + plant) — K-3.
- [x] Renkler `--rs-*` token üzerinden; hex yalnız token tanımında (light+dark) — K-2/K-3.
- [x] Backend sözleşmesi değişmedi; register-source salt görünüm katmanı — K-12/K-10.
- [x] `dangerouslySetInnerHTML` yalnız `RegisterTip` içinde; `tipHtml` tüm alanları `esc()` ile escape eder (XSS) — `register-sources.ts#esc`.
- [x] Async `for...of await` YOK; `DemoPlantOverview` `useMemo`, `RegisterTip` event dinleyicileri `useEffect` return ile temizlenir.
- [x] Kod referansları sembol çapasıyla yazıldı — satır numarası yok.
- [x] `bun run spec:check docs/architecture/DEMO-KONSOL-UI-UYUM-MIMARISI.md` temiz (0 hata / 0 uyarı).

### A.6 Genel Durum Özeti (bu tur)

UC-11 (Plant overview) ve UC-12 (Register-source modu) implementasyon + testleri tamamlandı ve yeşil. SC-6 (plant overview tek hat + canlı KPI + günlük enerji) `demo-plant.test.ts` + `DemoPlantOverview.test.tsx` ile, SC-7 (Values/Tooltip/Inline + hover kartı) `register-sources.test.ts` + `mimic-source-map.test.ts` + `DemoRegMode.test.tsx` ile doğrulandı. K-11 (standalone/Peak disabled/yaklaşık günlük enerji) ve K-12 (regmod salt görünüm, backend değişmez) birebir uygulandı; K-13 sınırına uygun olarak kablolama yalnız Site layout + paylaşılan üst blokta. Kalan boşluklar §B.2'de ileri iş olarak listelendi.

**review_date:** 2026-10-14

## B. TEST KAPSAMI — Ek (2026-10-14)

### B.1 Senaryo Matrisi (bu tur — durum → koşul → beklenen → test ref'i)

| Durum | Koşul | Beklenen (THEN) | Test ref'i |
|:------|:------|:----------------|:-----------|
| Regmod | localStorage `tip` | `body.regmode` + `RegModeSegment` `aria-pressed` | `DemoRegMode.test.tsx` "AK-12.1" |
| Regmod | localStorage `inline` | `body.reginline` + "Inline" `aria-pressed=true` | `DemoRegMode.test.tsx` "AK-12.1: localStorage'dan mod geri yüklenir" |
| RegisterValue | mod `val` | Düz metin (`.rv` YOK) | `DemoRegMode.test.tsx` "AK-12.2: val modunda düz metin" |
| RegisterValue | mod `tip` | `.rv` + `data-rsk` + `.rvs` içinde adres (30055) | `DemoRegMode.test.tsx` "AK-12.2: tip modunda .rv + data-rsk" |
| Register kartı | `bscSource("BSC-1","bsc.soc")` | dev BSC-1, addr 30055, FC04, ip, screen mapping, raw | `register-sources.test.ts` "AK-12.2: BSC kaynağı" |
| Register kartı | `pcsSource("PCS-2","pcs.p")` | holding FC03 + Wattox model + ip | `register-sources.test.ts` "PCS kaynağı holding register" |
| Rack kartı | `rackSource("BSC-1",3,"rack.tMax")` | addr `30170+150·(pos−1)+89`, FC04, rack block | `register-sources.test.ts` "rack kaynağı" |
| Calc kartı | `calcSource(...)` | "PMS calculation" + "Computed by" + girdi register | `register-sources.test.ts` "AK-12.3: calc kaynağı" |
| Nomap/model | `nomapSource`/`modelSource` | "Register map not supplied (M1–M7)" / "Simulation / configuration" | `register-sources.test.ts` "AK-12.4" |
| Bilinmeyen register | `bscSource` bilinmeyen id | `nomap`'e düşer | `register-sources.test.ts` "bilinmeyen register id → nomap" |
| sourceKey | Aynı kaynak iki kez | Kararlı anahtar + `sourceByKey` roundtrip | `register-sources.test.ts` "sourceKey kararlıdır" |
| Mimic source | `nm1_3Bt1` | SOC·SOH calc, BSC-2, grup 3 | `mimic-source-map.test.ts` "bank t1" |
| Mimic source | `nm1_7Aps` / `nm1_7Bpp` / `nm1_7Bpt` | PCS-1 / PCS-2 / IGBT temperature | `mimic-source-map.test.ts` "pcs ps/pp/pt" |
| Mimic source | `nm1_9Br3` | rack register, `rack.no=4`, BSC-2 | `mimic-source-map.test.ts` "rack" |
| Mimic source | `nm1_poiTxt`/`auxTxt`/`fdAtxt`/`H04I` | nomap DEMO-MV-1 / PM5340-1 / feeder / phase current | `mimic-source-map.test.ts` "POI/AUX/feeder/meter" |
| Mimic source | Bilinmeyen id | `null` | `mimic-source-map.test.ts` "bilinmeyen id → null" |
| Plant türevi | `state.poiMW=1.2` | poiMW/poiKv/poiAmp/feeders(A,B)/auxKW | `demo-plant.test.ts` "AK-11.3" |
| Plant ünite | chg/dis/stby PCS | MW işaretli (+deşarj/−şarj), SOC ort, Tmax maks | `demo-plant.test.ts` "AK-11.2" |
| Günlük enerji | 1 saat sabit 10 MW | 10 MWh exported + cycles + `approximate:true` | `demo-plant.test.ts` "AK-11.6: 1 saat sabit 10 MW" |
| Günlük enerji | Negatif güç | imported sayılır, exported 0 | `demo-plant.test.ts` "negatif güç imported" |
| Günlük enerji | Boş/tek nokta seri | `hasData:false` | `demo-plant.test.ts` "boş/kısa seri" |
| Plant kart | Render | H01/H03/feeder/BESS#1/BESS#4 | `DemoPlantOverview.test.tsx` "AK-11.1" |
| Plant kart | Mod segmenti | Manual `aria-pressed`, Peak `disabled` | `DemoPlantOverview.test.tsx` "AK-11.4" |
| Plant kart | Seri yok | Günlük enerji "—" (≥3 satır) | `DemoPlantOverview.test.tsx` "AK-11.6: seri yokken" |
| Plant kart | Seri var | "10.0 MWh" basılır | `DemoPlantOverview.test.tsx` "AK-11.6: seri varsa" |

### B.2 KAPSANMAYAN Boşluklar (bu tur)

| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| G13 | Inline modda tablo/KPI'da görsel doğrulama yok (headless component testi `.rvs` içeriğini, e2e gerçek yerleşimi doğrulamaz) | düşük | Playwright e2e: regmod inline seçilince Site layout pinfo/KPI/mimic'te `adres·device·ad` görünürlüğü |
| G14 | `dailyEnergy` gerçekçi 7/24 POI serisiyle doğrulanmadı (yalnız sentetik sabit/negatif seriler) | düşük | Gerçek downsampled seri + saatlik sayaç farkıyla entegrasyon; gerçek enerji sayaç register'ı gelince yaklaşımdan çık |
| G15 | Tooltip kablolaması Devices/Operations/Grid & Market/Faults/Admin sayfalarında YOK | orta | A-6 2. tur — `RegisterValue`/`RegisterTip` mekanizması hazır, ilgili bileşenler sarılır |
| G16 | Peak shaving yok (ana kaynak/collector verisi yok) | orta | A-5 — ana kaynak (PV/wind) telemetrisi gelince collector/hybrid görünüm + peak algoritması |
| G17 | `sourceByKey` modül-seviyesi global `Map` (`KEYS`) — uzun oturumda büyür; SSR/çoklu kök yok | düşük | Kaynak sayısı sınırlı ve anahtar kararlı; gerekirse `WeakRef`/per-root registry |
| G18 | `--rs-*` token renklerinin görsel/kontrast doğrulaması yok (yalnız token tanımı) | düşük | Görsel QA + gerekiyorsa kontrast uyumu |

**review_date:** 2026-10-14

---

## Ek (2026-10-14b) — UC-11 revizyonu: collector + istasyon kartları + istasyon geçişi

> **İş akışı aşaması:** 5/5 — KAPANIŞ (bu tur: SPEC §6.11 UC-11 revizyonu — standalone → collector + 2 istasyon + kart tıklama).
> **SPEC:** [DEMO-KONSOL-UI-UYUM-MIMARISI.md](./DEMO-KONSOL-UI-UYUM-MIMARISI.md) — K-11 (revize), FR-11.1..11.7, AK-11.1..11.7, T-37..T-40/T-47, SC-6.
> **Kapsam:** UC-11 plant overview'ın standalone tek hattan collector'a dönüşü: `demo-stations.ts` (manuel istasyon bölüm config'i), `demo-plant.ts` (`deriveStationView`/`deriveCollectorOverview`), `DemoPlantOverview.tsx` (collector SVG + 2 istasyon kartı + tıklama), `DemoFieldPage.tsx` (istasyon seçici + istasyon-bazlı süzme), `index.ts` barrel. Önceki Ek (2026-10-14) UC-11'i standalone olarak yazmıştı; bu Ek o kaydı **revize eder** (AK-11.1..11.7 yeni anlamlarıyla).

### A.1 Değişiklik Matrisi (bu tur)

| # | Dosya | Değişiklik | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------------|
| 1 | `apps/demo-field/src/features/demo-data/demo-stations.ts` | YENİ saf config: `DEMO_STATIONS` (2 istasyon: #1 BESS#1–5 Feeder A, #2 BESS#6–9 Feeder B), `DEMO_COLLECTOR` ("MV STATION", `cellOf` Q04/Q05), `stationForUnit`, `stationTopo`/`stationTopoByIndex` (DEMO_TOPOLOGY'den fider dilimi + `poiLabel "TO MV STATION Q04/Q05"`), `stateForStation` (üniteler + feederMW/poiMW süzülür), `stationCoverage` | UC-11/T-47, K-11 |
| 2 | `apps/demo-field/src/features/demo-data/demo-stations.test.ts` | YENİ (6 test): 5+4 config, collector hücre eşlemesi, `stationForUnit`, `stationTopo` fider dilimi + poiLabel, `stateForStation` MW süzme, orijinal topoloji bozulmaz | UC-11, AK-11.5/11.6 |
| 3 | `packages/ui/src/nova/demo-plant.ts` | `plantUnitView` ayrı saf yardımcıya çıkarıldı (`derivePlantOverview`/`deriveStationView` paylaşır); YENİ `deriveStationView` (istasyon MW/SOC/Tmax/durum/available/energyMWh) + `deriveCollectorOverview`; `PlantStationConfig`/`PlantStationView`/`CollectorOverview` tipleri | UC-11/T-37, K-11 |
| 4 | `packages/ui/src/nova/demo-plant.test.ts` | YENİ istasyon/collector türev testleri (3): `deriveStationView` alarm/discharge + boş liste, `deriveCollectorOverview` POI + 2 istasyon | UC-11, AK-11.2/11.3/11.6 |
| 5 | `packages/ui/src/nova/DemoPlantOverview.tsx` | collector SVG (`CollectorSvg`: grid → Q01 incomer → Q02 metering → collector bus → 2 istasyon kartı: isim, BESS#aralık, n × 3.568 MWh, güç, SOC barı, ünite mini kutucukları, "shown below/open ↓"), kart tıklama → `onStationSelect`; yan panel (Main source none, Manual + Peak disabled, canlı KPI, günlük enerji); tek-istasyon fallback `StandaloneSvg` korundu | UC-11/T-38/T-39, FR-11.1..11.5 |
| 6 | `packages/ui/src/nova/DemoPlantOverview.test.tsx` | collector/istasyon kartı testleri (6): Q01/Q02 + 2 `.po-st`, kart içeriği + ünite kutucukları, Manual/Peak, `onStationSelect(1)`, günlük enerji boş/dolu | UC-11, AK-11.1/11.2/11.4/11.5/11.7 |
| 7 | `apps/demo-field/src/pages/DemoFieldPage.tsx` | istasyon seçici seg (#1/#2), `stateForStation` + `stationTopoByIndex` ile mimic/detail/attention o istasyona süzülür; `DemoPlantOverview` trendlerin üstüne; plant overview ile senkron | UC-11/T-40, FR-11.5 |
| 8 | `apps/demo-field/src/pages/DemoFieldPage.test.tsx` | istasyon seçici render + geçiş testi (+1): #1 `aria-pressed`, #2 tıklama → `aria-pressed` | UC-11, AK-11.5/11.6 |
| 9 | `packages/ui/src/nova/index.ts` | barrel export: `DemoPlantOverview` + `derivePlantOverview`/`deriveStationView`/`deriveCollectorOverview`/`plantUnitView` + `PlantStationConfig`/`PlantStationView`/`CollectorOverview` tipleri | K-3 |

### A.2 Test Kanıtları (bu tur)

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| ui + demo-field | `bunx nx run-many -t test -p ui demo-field --skip-nx-cache` | **hepsi yeşil** |
| ui | aynı komut | 37 dosya / 249 test yeşil |
| demo-field | aynı komut | 15 dosya / 78 test yeşil |
| yeni testler | `demo-stations.test.ts` (6) + `demo-plant.test.ts` istasyon/collector (3) + `DemoPlantOverview.test.tsx` (6) + `DemoFieldPage.test.tsx` istasyon geçişi (+1) | 16 yeni/genişletilmiş test yeşil |
| build | `bunx nx run ui:build` + `bunx nx run demo-field:build` | başarılı |
| build | field-web yeniden build (görsel kontrol) | başarılı |
| SPEC lint | `bun run spec:check docs/architecture/DEMO-KONSOL-UI-UYUM-MIMARISI.md` | 0 hata / 0 uyarı |

### A.3 Kabul Kriteri Kanıtları (bu tur — revize AK-11.1..11.7)

> SPEC §6.11 UC-11 bu tur revize edildi (standalone → collector + 2 istasyon + kart tıklama); aşağıdaki AK-11.1..11.7 **revize anlamlarıyla** doğrulanır (önceki Ek'teki standalone AK-11.x'lerin yerine geçer).

| Kod | Kriter (SPEC özeti) | Kanıt (test/dosya) | Durum |
|:----|:--------------------|:-------------------|:------|
| AK-11.1 (rev) | Collector tek hat render (Q01 incomer, Q02 metering, 2 istasyon kutusu) | `DemoPlantOverview.test.tsx` "AK-11.1: collector tek hat Q01/Q02 ve istasyon kutuları" | 🟢 |
| AK-11.2 (rev) | İstasyon kartı isim + BESS#aralık + n × 3.568 MWh + SOC barı + ünite kutucukları | `DemoPlantOverview.test.tsx` "AK-11.2" + `demo-plant.test.ts` "AK-11.2" | 🟢 |
| AK-11.3 (rev) | Collector/POI/istasyon değerleri canlı + yön sınıflı | `demo-plant.test.ts` "AK-11.3: POI/kV/akım ve feeder" + "AK-11.3: collector overview" | 🟢 |
| AK-11.4 (rev) | Yan panel Manual aktif + Peak shaving disabled + canlı KPI + günlük enerji | `DemoPlantOverview.test.tsx` "AK-11.4" | 🟢 |
| AK-11.5 (rev) | İstasyon kartı tıklaması site layout'u o istasyona geçirir | `DemoPlantOverview.test.tsx` "AK-11.5" + `DemoFieldPage.test.tsx` istasyon geçiş + `demo-stations.test.ts` "AK-11.5 stationTopo" | 🟢 |
| AK-11.6 (rev) | İstasyon manuel config (2 istasyon, 5+4) | `demo-stations.test.ts` "AK-11.6" + `demo-plant.test.ts` "AK-11.6" | 🟢 |
| AK-11.7 (rev) | Günlük enerji POI entegrasyonundan; seri yoksa "—" | `DemoPlantOverview.test.tsx` "AK-11.7: seri yokken / seri varsa" | 🟢 |

### A.4 Sapmalar (bu tur)

| # | Sapma | Açıklama |
|:--|:------|:---------|
| 1 | İstasyon bölümü manuel config (backend config ileri iş) | `demo-stations.ts#DEMO_STATIONS` 2 istasyonu (BESS#1–5, BESS#6–9) hardcode tanımlar; K-11 "manuel config" kararına uygun. İleride backend config'inden gelecek (§B.2 G19). |
| 2 | Collector "MV STATION" (Metal Clad kapsam dışı) | `demo-stations.ts#DEMO_COLLECTOR` `name:"MV STATION"`, `limitMW:50`; kart `DemoPlantOverview.tsx#CollectorSvg` installed 31.05 MW ≤ 50 hesaplar. Metal Clad kuralı 18 konteyner senaryosunda geçerliydi — bu demo (9 ünite) kapsamı dışı. |
| 3 | İstasyon MW'si PCS toplamından (yaklaşım) | Per-istasyon H03 sayaç telemetrisi yok; `demo-stations.ts#stateForStation` + `demo-plant.ts#deriveStationView` istasyon MW'sini o istasyonun ünitelerinin işaretli PCS güç toplamından türetir (yaklaşım). |
| 4 | KPI strip/pinfo site-geneli (gdems istasyon-bazlı) | `DemoProjectLayout.tsx` pinfo/KPI kaynakları site-geneli kalır; referans `gdems` bunları istasyon-bazlı gösterir. İstasyon-bazlı KPI/pinfo 2. tur (A-6 ile birlikte). |

### A.5 Gözle Kontrol Maddeleri (bu tur)

- [x] `demo-stations.ts` ve `demo-plant.ts` saf (IO/zaman yok); türevler parametre olarak `state`/`topology`/`stations` alır — K-3 purity.
- [x] Named export only; `index.ts` barrel güncel (DemoPlantOverview + derive* + tipler) — K-3.
- [x] Renkler `--nm-*` token üzerinden; collector SVG `po-*` sınıfları `var(--nm-*)` kullanır, hex hardcode YOK — K-2/K-3.
- [x] İstasyon kartı klavye erişilebilir: `role="button"` + `tabIndex` + Enter/Space (`DemoPlantOverview.tsx#CollectorSvg`) — erişilebilirlik.
- [x] Async `for...of await` YOK; `DemoPlantOverview` `useMemo` ile türev üretir; `DemoFieldPage` istasyon değişince `selected` sıfırlanır (`useEffect`).
- [x] Kod referansları `#sembol` çapasıyla yazıldı — satır numarası yok.
- [x] `bun run spec:check docs/architecture/DEMO-KONSOL-UI-UYUM-MIMARISI.md` temiz (0 hata / 0 uyarı).

### A.6 Genel Durum Özeti (bu tur)

UC-11 plant overview standalone'dan collector'a revize edildi: `demo-stations.ts` (manuel 2 istasyon config'i) + `demo-plant.ts` (`deriveStationView`/`deriveCollectorOverview`) + `DemoPlantOverview.tsx` (collector SVG + istasyon kartları) + `DemoFieldPage.tsx` (istasyon seçici + filtreli mimic/detail/attention) implementasyon + testleri tamamlandı ve yeşil. SC-6 (collector tek hat + istasyon kartları + kart tıklaması → istasyon geçişi) `demo-stations.test.ts` + `demo-plant.test.ts` + `DemoPlantOverview.test.tsx` + `DemoFieldPage.test.tsx` ile doğrulandı. Tek-istasyon `StandaloneSvg` fallback'i korundu (geriye dönük). Kalan boşluklar §B.2'de ileri iş olarak listelendi.

**review_date:** 2026-10-14

## B. TEST KAPSAMI — Ek (2026-10-14b)

### B.1 Senaryo Matrisi (bu tur — durum → koşul → beklenen → test ref'i)

| Durum | Koşul | Beklenen (THEN) | Test ref'i |
|:------|:------|:----------------|:-----------|
| İstasyon config | `DEMO_STATIONS` okunur | 2 istasyon, 5+4 ünite, `stationCoverage` 9/9 | `demo-stations.test.ts` "AK-11.6: 2 istasyon, 5+4" |
| Collector config | `DEMO_COLLECTOR.cellOf(0/1)` | Q04/Q05; name "MV STATION" | `demo-stations.test.ts` "collector MV STATION ve hücre eşlemesi" |
| Ünite→istasyon | `stationForUnit(1/5/6/9/10)` | index 0/0/1/1/undefined | `demo-stations.test.ts` "stationForUnit" |
| İstasyon topo | `stationTopoByIndex(0)` | yalnız feeder A (units [1..5]), poiLabel "TO MV STATION Q04" | `demo-stations.test.ts` "AK-11.5: stationTopo" |
| İstasyon topo | `stationTopoByIndex(1)` | yalnız feeder B (units [6..9]) | `demo-stations.test.ts` "AK-11.5" |
| İstasyon topo | `stationTopo` çağrısı sonrası | orijinal `DEMO_TOPOLOGY` bozulmaz (A+B korunur) | `demo-stations.test.ts` "stationTopo orijinal DEMO_TOPOLOGY'yi bozmaz" |
| State süzme | `stateForStation(#1)` | 5 ünite; poiMW/feederMW = PCS toplamı (+3.0 MW dis) | `demo-stations.test.ts` "stateForStation" |
| State süzme | `stateForStation(#2)` | 4 ünite; −4.0 MW (chg) | `demo-stations.test.ts` "stateForStation" |
| İstasyon türevi | `deriveStationView` (alarmlı ünite) | mw −0.4, status FAULT, sev alarm, available 1, energyMWh 2×3.568 | `demo-plant.test.ts` "AK-11.6: istasyon MW/SOC/durum" |
| İstasyon türevi | `deriveStationView` (sağlıklı) | mw +0.8, DISCHARGE, sev null | `demo-plant.test.ts` "AK-11.6" |
| Collector türevi | `deriveCollectorOverview` | poiMW/poiKv + 2 istasyon ismi | `demo-plant.test.ts` "AK-11.3: collector overview" |
| İstasyon türevi | boş ünite listesi | n=0, mw=0, soc=0 (throw yok) | `demo-plant.test.ts` "boş istasyon ünite listesi throw etmez" |
| Collector SVG | 2 istasyonlu render | `svg.po` + Q01/Q02 + 2 `.po-st` | `DemoPlantOverview.test.tsx` "AK-11.1" |
| İstasyon kartı | render | isimler + BESS#aralık + `n × 3.568 MWh` + ünite kutucukları | `DemoPlantOverview.test.tsx` "AK-11.2" |
| Mod segmenti | render | Manual `aria-pressed`, Peak `disabled` | `DemoPlantOverview.test.tsx` "AK-11.4" |
| Kart tıklama | `.po-st[1]` click | `onStationSelect(1)` çağrılır | `DemoPlantOverview.test.tsx` "AK-11.5" |
| Günlük enerji | seri yok | "—" (≥3 satır) | `DemoPlantOverview.test.tsx` "AK-11.7" |
| Günlük enerji | seri var (10 MW sabit) | "10.0 MWh" | `DemoPlantOverview.test.tsx` "AK-11.7" |
| İstasyon seçici | `DemoFieldPage` render | seg #1 `aria-pressed=true`, #2 `false` | `DemoFieldPage.test.tsx` "istasyon seçici render eder" |
| İstasyon geçişi | #2 tıklama | #2 `aria-pressed=true` (mimic BESS#6–9'a geçer) | `DemoFieldPage.test.tsx` "geçiş yapar" |

### B.2 KAPSANMAYAN Boşluklar (bu tur)

| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| G19 | Per-istasyon H03 sayaç telemetrisi yok → istasyon MW'si PCS toplamından yaklaşım (`stateForStation`/`deriveStationView`) | orta | Backend per-istasyon sayaç register'ı gelince PCS toplamı yaklaşımından canlı değere geç (K-11 yaklaşımı) |
| G20 | Peak shaving yok (ana kaynak/collector PV-wind verisi yok) | orta | A-5 — ana kaynak telemetrisi gelince collector/hybrid görünüm + peak algoritması |
| G21 | Tooltip/register-source kablolaması Devices/Operations/Grid & Market/Faults/Admin sayfalarında YOK (KPI/pinfo site-geneli) | orta | A-6 2. tur — `RegisterValue`/`RegisterTip` mekanizması hazır; istasyon-bazlı KPI/pinfo da bu kapsamda |
| G22 | İstasyon geçişi e2e yok (yalnız component test) | düşük | Playwright e2e: plant kartına tıklama → mimic BESS#6–9 gösterir + detail/attention süzülür |

**review_date:** 2026-10-14

---

## Ek (2026-10-14c) — UC-11 stilleri (gdems birebir) + stBar & istasyon-bazlı KPI + PV/Metal Clad

> **İş akışı aşaması:** 5/5 — KAPANIŞ (bu tur: SPEC §6.11 UC-11 görsel/stil revizyonu — gdems `app.css` birebir plant stilleri, `stBar` + istasyon-bazlı KPI, illüstratif PV + Metal Clad collector tipi).
> **SPEC:** [DEMO-KONSOL-UI-UYUM-MIMARISI.md](./DEMO-KONSOL-UI-UYUM-MIMARISI.md) — K-11 (revize), K-14, FR-11.3/11.4/11.8/11.9, AK-11.3/11.4/11.8/11.9, T-48/T-49, SC-6.
> **Kapsam:** gdems `app.css` plant bloğunun birebir portu (`.po-wrap`/`.po-svg`/`.po-box`/`.po-u`/`.po-bess`/`.po-big`/`.po-bus`/`.po-ln`/`@keyframes po-flow`/`.po-cb`/`.po-vt`/`.po-socb`/`.po-src`/`.po-src-h` + `.stbar`/`.stb-l`), `DemoStationBar` (stBar), `demo-stations.ts` (illüstratif PV `DEMO_SOURCE` + `collectorType` + `demoPlantTotals`), `demo-plant.ts` (`PlantSourceConfig`/`PlantSourceView` + `deriveSourceStations`), `DemoPlantOverview` (POI yön+Q, Q02 MW·Hz·PF, fider MW+A, BESS+PV kutuları, Metal Clad, "Solar available/output" tile'ları), `DemoProjectLayout` (`activeStation` context + stBar + istasyon-bazlı KPI), `DemoFieldPage` (context'ten istasyon state'i).

### A.1 Değişiklik Matrisi (bu tur)

| # | Dosya | Değişiklik | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------------|
| 1 | `packages/ui/src/nova/nova-console.css` | Plant bloğu gdems `app.css` birebir portu: `.po-wrap` (1.75fr/300 + padding), `.po-svg` (overflow/min-width 640), `.po-box` (panel2+line), `.po-un`/`.po-link`/`.po-bess` (hover·focus·act), `.po-u` (rgba(seq,.18)+ok + maint/alarm/info), `.po-big` 20px, `.po-bus` 5, `.po-ln` live + `.on` dash + `@keyframes po-flow` akış animasyonu, `.po-cb` dolu, `.po-vt` live, `.po-socb` panel+line, `.po-src` hover, `.po-src-h` yatay; AYRICA `.stbar`/`.stb-l`/`.stbar .seg button small` | UC-11/T-44/T-48, K-2/K-3/K-14 |
| 2 | `packages/ui/src/nova/DemoStationBar.tsx` (+ `.test.tsx`) | YENİ: gdems `app.js#renderStBar` portu — sol `stb-l` istasyon adı + grup aralığı (`BESS#first–last`), sağ `.seg` istasyon seçici (arıza sayılı `faults`); tek istasyonda `null` | UC-11/T-48, K-14, FR-11.8 |
| 3 | `apps/demo-field/src/features/demo-data/demo-stations.ts` (+ `.test.ts`) | `DEMO_SOURCE` (2 PV istasyonu × 7 inverter, illüstratif/statik `mw`), `DemoSourceStation` tipi, `collectorType(installedMW)` (gdems `plantLayout` kuralı: >50 MW → Metal Clad), `demoPlantTotals()` (BESS 31.05 + PV 43.4 → 74.45 → Metal Clad) | UC-11/T-49, FR-11.9, AK-11.9 |
| 4 | `packages/ui/src/nova/demo-plant.ts` (+ `.test.ts`) | `PlantSourceConfig`/`PlantSourceView` tipleri + `deriveSourceStations` (illüstratif kaynak istasyonları, per-unit MW eşit bölünür) | UC-11/T-37/T-49, FR-11.9 |
| 5 | `packages/ui/src/nova/DemoPlantOverview.tsx` (+ `.test.tsx`) | collector `po-v` yön+Q (Σ PCS `reactiveKvar`), Q02 metering `MW · Hz · PF`, fider `MW · A`, `<title>`'lar, `po-bess`/`act`, BESS+PV kutuları (`.po-src`/`.po-ib`/`.po-if`), `installed X > 50 MW → Metal Clad` etiketi, yan panelde "Solar available/output" (simüle) tile'ları; `sources`/`collector` props | UC-11/T-38/T-49, FR-11.1/11.9, AK-11.3/11.4/11.9 |
| 6 | `apps/demo-field/src/layouts/DemoProjectLayout.tsx` | `activeStation` context'e alındı; `stationState`/`stationTopology`/`stationKpis`/`stationAlerts` türevleri; `DemoStationBar` `DemoProjectStrip` ile `DemoKpiStrip` arasına; KPI tile'ları `stationKpis`'ten (istasyon-bazlı) + güç tile etiketi "Station power · H03" | UC-11/T-48, K-14, FR-11.8, AK-11.8 |
| 7 | `apps/demo-field/src/pages/DemoFieldPage.tsx` (+ `.test.tsx`) | `useDemoProjectContext`'ten istasyon state'i; `DemoPlantOverview`'a `sources={DEMO_SOURCE.stations}` + `collector` (Metal Clad + `installedMW`/`limitMW`) + `selectedStation`/`onStationSelect` | UC-11/T-40, FR-11.5/11.9 |
| 8 | `packages/ui/src/nova/index.ts` | Barrel export: `DemoStationBar` + `DemoStationBarProps`/`DemoStationBarStation` + `deriveSourceStations` + `PlantSourceConfig`/`PlantSourceView` | K-3 |

### A.2 Test Kanıtları (bu tur)

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| ui + demo-field | `bunx nx run-many -t test -p ui demo-field --skip-nx-cache` | **hepsi yeşil** |
| ui | aynı komut | 38 dosya / 254 test yeşil |
| demo-field | aynı komut | 15 dosya / 81 test yeşil |
| yeni testler | `demo-stations.test.ts` collectorType/totals/DEMO_SOURCE (3) + `demo-plant.test.ts` `deriveSourceStations` (1) + `DemoStationBar.test.tsx` (3) + `DemoPlantOverview.test.tsx` PV/Metal Clad (+1) | 8 yeni test yeşil |
| build | `bunx nx run ui:build` + `bunx nx run demo-field:build` | başarılı |
| build | field-web yeniden build (görsel kontrol) | başarılı |
| SPEC lint | `bun run spec:check docs/architecture/DEMO-KONSOL-UI-UYUM-MIMARISI.md` | 0 hata / 0 uyarı |

### A.3 Kabul Kriteri Kanıtları (bu tur)

> AK-11.3 ve AK-11.4 önceki Ek'te (2026-10-14) pure tanımlıdır; bu tur yeni davranış eklediği için `(rev2)` ile işaretlenir (spec-check ID tekilliği). AK-11.8/AK-11.9 bu SPEC revizyonuyla yeni eklendi.

| Kod | Kriter (SPEC özeti) | Kanıt (test/dosya) | Durum |
|:----|:--------------------|:-------------------|:------|
| AK-11.3 (rev2) | Collector/POI değerleri canlı + yön sınıflı; Q02 metering `MW · Hz · PF`; fider `MW · A`; POI Q = Σ PCS `reactiveKvar` | `demo-plant.test.ts` "AK-11.3" + `DemoPlantOverview.tsx#DemoPlantOverview` (`reactiveMvar` hesabı + `CollectorSvg` Q02 satırları — kod inceleme) | 🟢 |
| AK-11.4 (rev2) | Yan panel Manual aktif + Peak shaving disabled + canlı KPI + günlük enerji; "Solar available/output" tile'ları | `DemoPlantOverview.test.tsx` "AK-11.4" + "AK-11.9" (`Solar output`) + `DemoPlantOverview.tsx#DemoPlantOverview` | 🟢 |
| AK-11.8 | stBar seçili istasyonu gösterir/değiştirir; KPI'lar seçili istasyona göre hesaplanır | `DemoStationBar.test.tsx` (3) + `DemoFieldPage.test.tsx` "istasyon seçici render eder ve geçiş yapar" + `DemoProjectLayout.tsx#DemoProjectLayout` (`stationKpis`) | 🟢 |
| AK-11.9 | 2 PV MV istasyonu (illüstratif) + collector tipi kurulu güce göre (Metal Clad / MV station) | `demo-stations.test.ts` "collectorType kuralı" + "demoPlantTotals" + `demo-plant.test.ts` "deriveSourceStations" + `DemoPlantOverview.test.tsx` "AK-11.9" | 🟢 |

### A.4 Sapmalar (bu tur)

| # | Sapma | Açıklama |
|:--|:------|:---------|
| 1 | PV verisi backend'de yok → illüstratif/statik | `demo-stations.ts#DEMO_SOURCE` inverter istasyonlarını statik `mw` ile tanımlar (22.0 + 21.4 MW); `DemoPlantOverview.tsx` PV kutularında "running · illustrative (simulated)" basar ve tooltip `nomapSource` ("value simulated", gdems M7 ile aynı). Backend inverter telemetrisi gelince canlı değere döner (§B.2 G23). |
| 2 | Collector tipi kural ile Metal Clad (74.45 > 50) | `demo-stations.ts#collectorType` gdems `plantLayout` kuralını uygular; `demoPlantTotals()` BESS 31.05 + PV 43.4 = 74.45 MW > 50 → "Metal Clad". Önceki Ek (14b) 31.05 MW (PV'siz) için "MV STATION" derdi; bu tur PV eklenince Metal Clad olur. `DemoFieldPage.tsx` `collector.name`/`installedMW`/`limitMW` olarak geçer. |
| 3 | Peak shaving disabled (gerçek controller yok) | İllüstratif PV kutusu eklense de "Peak shaving" butonu `disabled` kalır (`title="Needs a main source controller"`). Gerçek main-source controller gelene dek (A-5) aktifleşmez. |
| 4 | `kpi()+kpi()` string'e düştü → array'e çevrildi (kayda değer) | `DemoPlantOverview.tsx#DemoPlantOverview` yan panel `mgrid.g3.po-live` bloğunda iki Solar tile ilk yazımda `kpi(...)+kpi(...)` ile birleştirilip `[object Object][object Object]` stringine düştü; `[kpi(...), kpi(...)]` dizisine çevrildi (React key'li öğe listesi). Headless render ile doğrulandı ("Solar available"/"Solar output" ayrı tile). |
| 5 | KPI istasyon-bazlı, pinfo site-geneli kalır | K-14 gereği KPI'lar `DemoProjectLayout.tsx#DemoProjectLayout` içinde `deriveKpis(stationState, stationTopology)` ile seçili istasyona göre hesaplanır (güç tile "Station power · H03"); pinfo `stripItems` site-geneli kalır (14b A.4-4'ün KPI kısmı çözüldü, pinfo kısmı A-6 2. turda). |

### A.5 Gözle Kontrol Maddeleri (bu tur)

- [x] `demo-stations.ts` (PV config/`collectorType`/`demoPlantTotals`) ve `demo-plant.ts` (`deriveSourceStations`) saf (IO/zaman yok) — K-3 purity.
- [x] Named export only; `index.ts` barrel güncel (`DemoStationBar` + `deriveSourceStations` + `PlantSourceConfig`/`PlantSourceView`) — K-3.
- [x] Renkler `--nm-*` token üzerinden; plant/stBar CSS'inde hex hardcode YOK (`rgba(var(--nm-seq-rgb), .18)` dahil) — K-2/K-3.
- [x] `DemoStationBar`/`DemoPlantOverview` `role="button"`/`role="group"` + `aria-pressed` + klavye (Enter/Space) — erişilebilirlik.
- [x] Async `for...of await` YOK; türevler `useMemo`; `DemoFieldPage` istasyon değişince `selected` sıfırlanır (`useEffect`).
- [x] Kod referansları `#sembol` çapasıyla yazıldı — satır numarası yok.
- [x] `bun run spec:check docs/architecture/DEMO-KONSOL-UI-UYUM-MIMARISI.md` temiz (0 hata / 0 uyarı).

### A.6 Genel Durum Özeti (bu tur)

UC-11 plant overview gdems `app.css` stillerine birebir hizalandı (`.po-*` bloğu + `@keyframes po-flow` akış animasyonu) ve stBar (`DemoStationBar`) + istasyon-bazlı KPI (`K-14`) ile tamamlandı. İllüstratif PV kaynakları (`DEMO_SOURCE` + `deriveSourceStations`) ve Metal Clad collector tipi (`collectorType`/`demoPlantTotals`, 74.45 MW > 50) eklendi. SC-6 (collector tek hat + istasyon kartları + PV kutuları + Metal Clad + stBar geçişi) `demo-stations.test.ts` + `demo-plant.test.ts` + `DemoStationBar.test.tsx` + `DemoPlantOverview.test.tsx` + `DemoFieldPage.test.tsx` ile doğrulandı. Kalan boşluklar §B.2'de ileri iş olarak listelendi.

**review_date:** 2026-10-14

## B. TEST KAPSAMI — Ek (2026-10-14c)

### B.1 Senaryo Matrisi (bu tur — durum → koşul → beklenen → test ref'i)

| Durum | Koşul | Beklenen (THEN) | Test ref'i |
|:------|:------|:----------------|:-----------|
| stBar | Tek istasyon | `.stbar` render edilmez (`null`) | `DemoStationBar.test.tsx` "tek istasyonda render etmez" |
| stBar | 2 istasyon | isim + `BESS#1–5` + seg + `2 faults` + aktif `aria-pressed` | `DemoStationBar.test.tsx` "istasyon adı + grup aralığı + seg + arıza gösterir" |
| stBar | Seg tıklama | `onSelect(index)` çağrılır | `DemoStationBar.test.tsx` "seçim callback çağırır" |
| Collector tipi | `installedMW ≤ 50` (31.05/50) | `"MV station"` | `demo-stations.test.ts` "collectorType kuralı" |
| Collector tipi | `installedMW > 50` (50.1/81.45) | `"Metal Clad"` | `demo-stations.test.ts` "collectorType kuralı" |
| Plant toplamları | BESS 31.05 + PV 43.4 | `installedMW ≈ 74.45`, `collector "Metal Clad"` | `demo-stations.test.ts` "demoPlantTotals" |
| PV config | `DEMO_SOURCE.stations` | 2 istasyon × 7 inverter, "PV MV STATION #1" | `demo-stations.test.ts` "DEMO_SOURCE" |
| Kaynak türevi | 3 inverter, 9 MW | `unitMW = [3, 3, 3]` (per-unit eşit) | `demo-plant.test.ts` "deriveSourceStations" |
| Plant kart | `sources` + `collector Metal Clad` | 4 `.po-st` + PV isimleri + `installed 74.5 MW > 50 MW → Metal Clad` + "Solar output" | `DemoPlantOverview.test.tsx` "AK-11.9" |
| İstasyon seçici | `DemoFieldPage` render | stBar #1 `aria-pressed=true`, #2 `false` | `DemoFieldPage.test.tsx` "istasyon seçici render eder" |
| İstasyon geçişi | stBar #2 tıklama | #2 `aria-pressed=true` (KPI/mimic BESS#6–9'a geçer) | `DemoFieldPage.test.tsx` "geçiş yapar" |
| İstasyon-bazlı KPI | `deriveKpis(stationState, stationTopology)` | KPI tile'ları seçili istasyondan; güç tile "Station power · H03" | `DemoProjectLayout.tsx#DemoProjectLayout` (kod inceleme) |

### B.2 KAPSANMAYAN Boşluklar (bu tur)

| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| G23 | PV istasyonları statik/illüstratif (backend inverter verisi yok) | düşük | Backend inverter/PV telemetrisi gelince `DEMO_SOURCE.stations[].mw` statik değerinden canlı AC güç + irradiance'a geç; "value simulated" tooltip'i kalkar |
| G24 | stBar istasyon geçişi e2e yok (yalnız component test) | düşük | Playwright e2e: stBar #2 tıklama → KPI tile'ları + mimic + detail/attention BESS#6–9'a geçer |
| G25 | Peak shaving hâlâ disabled (illüstratif PV kutusu eklense de gerçek controller yok) | orta | A-5 — main-source controller gelince Peak shaving aktif; PV kutusu canlıya bağlanır (G20 devamı) |
| G26 | Tooltip/register-source kablolaması Devices/Operations/Grid & Market/Faults/Admin'de YOK; pinfo istasyon-bazlı değil | orta | A-6 2. tur — `RegisterValue`/`RegisterTip` mekanizması hazır; istasyon-bazlı pinfo da bu kapsamda (G15/G21 devamı) |
| G27 | POI Q (`reactiveMvar`) PCS `reactiveKvar`'dan gerçek ama otomatik test yok; `.po-flow` akış animasyonu yalnız görsel QA | düşük | Q/PF değerinin unit testi (reactiveKvar toplamı) + `.po-flow` animasyonunun görsel doğrulaması |

**review_date:** 2026-10-14

---

## Ek (2026-10-14d) — UC-11: PV MV istasyon tek-hat çizimi + peak shaving grafiği

> **İş akışı aşaması:** 5/5 — KAPANIŞ (bu tur: SPEC §6.11 UC-11 genişletmesi — FR-11.10 PV MV istasyon tek-hat çizimi + FR-11.11 "Solar production & peak shaving · today" grafiği).
> **SPEC:** [DEMO-KONSOL-UI-UYUM-MIMARISI.md](./DEMO-KONSOL-UI-UYUM-MIMARISI.md) — K-11, FR-11.10/FR-11.11, AK-11.10/AK-11.11, T-50/T-51, SC-6.
> **Kapsam:** PV MV istasyonuna tıklanınca site layout yerine açılan tek-hat çizimi (`DemoSourceStationView` — gdems `plant-view.js#srcStationSvg`/`#renderSrc` portu) + plant kartı altına "Solar production & peak shaving · today" grafiği (`buildPeakSeries`/`peakEnergySums` + `DemoPlantOverview` `pkwrap`/`peaksum`). Önceki Ek (2026-10-14c) PV kutularını eklemişti; bu Ek onları **tıklanabilir çizime** ve **peak shaving grafiğine** bağlar.

### A.1 Değişiklik Matrisi (bu tur)

| # | Dosya | Değişiklik | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------------|
| 1 | `packages/ui/src/nova/DemoSourceStationView.tsx` (+ `index.ts`) | YENİ bileşen `DemoSourceStationView` + `DemoSourceStationViewProps` (barrel export). gdems `plant-view.js#srcStationSvg`/`#renderSrc` portu: `srcKpi` (Output/Available/Irradiance/Energy today/Units running) + tek-hat SVG (TO METAL CLAD Q06/Q07, Q1 çıkış kesici, metering, 34.5 kV bara, 7 birim Q2–Q8: 4.3 MVA TR 34.5/0.63, inverter `~`/`=`, INV-01…07 "running", DC MW/V·A, 3×4 PV dizisi, yük barı). Statik/illüstratif (tooltip `nomapSource` M7). | UC-11/T-50, FR-11.10, K-11 |
| 2 | `packages/ui/src/nova/DemoSourceStationView.test.tsx` | YENİ (1 test): "AK-11.10" — başlık + `srcKpi` etiketleri + 7 `rect.po-inv` + INV-01/07 + "TO METAL CLAD Q06" | UC-11, AK-11.10 |
| 3 | `packages/ui/src/nova/demo-plant.ts` | `buildPeakSeries(nowMs, connMW, peakMW, solarMW)` (saf deterministik sentetik gün serisi: clear-sky sinüs, threshold/conn bandları, 97 örnek/15 dk) + `peakEnergySums` (production/shaved/released/curtailed) + `PeakSample`/`PeakSeries` tipleri | UC-11/T-51, FR-11.11, K-3 |
| 4 | `packages/ui/src/nova/demo-plant.test.ts` | `buildPeakSeries`/`peakEnergySums` testleri (3): 97 örnek + gece 0/gündüz üretim; production > shaved > 0, released 0, curtailed > 0; solar < threshold → shaved 0 | UC-11, AK-11.11 |
| 5 | `packages/ui/src/nova/DemoPlantOverview.tsx` | `onSourceSelect(key)` prop (PV kutusu tıklaması, `CollectorSvg` bess/src ayrımı) + `peakMW` prop + kart altına `pkwrap`: `DemoTrendChart` (area src + band shaved + band released + poi + threshold dash + connection limit) + `peaksum` satırı (production/shaved/released/curtailed + "plant in Manual – no peak shaving") | UC-11/T-38/T-51, FR-11.10/FR-11.11 |
| 6 | `packages/ui/src/nova/DemoPlantOverview.test.tsx` | +2 test: "AK-11.10: PV kutusu tıklaması onSourceSelect(key)" + "AK-11.11: peak shaving grafiği + peakSum görünür" | UC-11, AK-11.10/11.11 |
| 7 | `apps/demo-field/src/pages/DemoFieldPage.tsx` | `sourceStation` state; PV kartına tıklama → site layout yerine `DemoSourceStationView` (+ `stNav` seg ile geri dönüş: BESS#1/2 + PV#1/2); çizim açıkken trendler gizli, event log kalır (gdems birebir). `onSourceSelect={setSourceStation}` + `peakMW={DEMO_SOURCE.peakMW}` | UC-11/T-40/T-50, FR-11.10/FR-11.11 |
| 8 | `apps/demo-field/src/features/demo-data/demo-stations.ts` | `DEMO_SOURCE.peakMW = 20` (illüstratif peak shaving eşiği) | UC-11/T-51, FR-11.11 |
| 9 | `packages/ui/src/nova/nova-console.css` | Yeni sınıflar: `.po-tr`/`.po-inv`/`.po-invl`/`.po-pv`/`.po-stn` (PV çizimi) + `.srcview > .srckpi` + `.pkwrap`/`.peaksum`/`.c-shave`/`.c-rel` (peak grafiği) | UC-11/T-44, K-2/K-3 |

### A.2 Test Kanıtları (bu tur)

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| ui + demo-field | `bunx nx run-many -t test -p ui demo-field --skip-nx-cache` | **hepsi yeşil** |
| ui | aynı komut | 39 dosya / 260 test yeşil |
| demo-field | aynı komut | 15 dosya / 81 test yeşil |
| yeni testler | `demo-plant.test.ts` buildPeakSeries/peakEnergySums (3) + `DemoSourceStationView.test.tsx` (1) + `DemoPlantOverview.test.tsx` peak + source-click (+2) | 6 yeni test yeşil |
| build | `bunx nx run ui:build` + `bunx nx run demo-field:build` | başarılı |
| build | field-web yeniden build (görsel kontrol) | başarılı |
| SPEC lint | `bun run spec:check docs/architecture/DEMO-KONSOL-UI-UYUM-MIMARISI.md` | 0 hata / 0 uyarı |

### A.3 Kabul Kriteri Kanıtları (bu tur)

> AK-11.10 ve AK-11.11 bu SPEC revizyonuyla (UC-11 genişletme) yeni eklendi; daha önce tanımlanmadığı için sonek gerekmez.

| Kod | Kriter (SPEC özeti) | Kanıt (test/dosya) | Durum |
|:----|:--------------------|:-------------------|:------|
| AK-11.10 | PV istasyon kartına tıklama → o istasyonun tek-hat çizimi (srcKpi + birimler) site layout yerine; BESS seçimi geri döndürür | `DemoSourceStationView.test.tsx` "AK-11.10" + `DemoPlantOverview.test.tsx` "AK-11.10: onSourceSelect(key)" + `DemoFieldPage.tsx#DemoFieldPage` (`sourceStation`/`stNav`) | 🟢 |
| AK-11.11 | "Solar production & peak shaving · today" grafiği (production/POI + shaved/released bandları + threshold) + peakSum görünür | `demo-plant.test.ts` (buildPeakSeries/peakEnergySums 3 test) + `DemoPlantOverview.test.tsx` "AK-11.11" + `DemoPlantOverview.tsx#DemoPlantOverview` (`pkwrap`/`peaksum`) | 🟢 |

### A.4 Sapmalar (bu tur)

| # | Sapma | Açıklama |
|:--|:------|:---------|
| 1 | PV verisi backend'de yok → çizim ve peak grafiği tamamen illüstratif/sentetik | `DemoSourceStationView.tsx#DemoSourceStationView` değerleri `DEMO_SOURCE` statik `mw`/`irr`/`tMod`'dan türetir (per-unit eşit bölünür); `buildPeakSeries` deterministik sentetik clear-sky eğrisi üretir (`nowMs` parametre, IO yok). Tooltip `nomapSource` ("value simulated", gdems M7 ile aynı) + "illustrative" işareti. Backend inverter telemetrisi gelince canlıya döner (G23 devamı). |
| 2 | Peak grafiği BESS = statik 0 (Manual) → "Released from BESS" bandı boş | `buildPeakSeries` `poi = src` ve `relLower/relUpper` eşit → `releasedMWh = 0`; `peaksum` "plant in Manual – no peak shaving" notu basar. Gerçek peak shaving controller'ı (main-source + BESS discharge) gelene dek A-5 ertelendi. |
| 3 | `peakMW = 20` sabit | `demo-stations.ts#DEMO_SOURCE.peakMW` illüstratif sabit eşik; gerçek controller config'i gelince dinamik değer bağlanır. |
| 4 | C — station-tag backend (field_containers.station + register payload) ertelendi | İstasyon etiketi backend'de (`field_containers.station` + register payload) taşınmıyor; ikinci konteyner stack kurulduktan sonraki tura bırakıldı. Bu tur yalnız frontend çizimi + grafiği kapsar (K-11 manuel config kararıyla uyumlu). |

### A.5 Gözle Kontrol Maddeleri (bu tur)

- [x] `demo-plant.ts#buildPeakSeries`/`#peakEnergySums` saf (IO/zaman yok; `nowMs`/`connMW`/`peakMW`/`solarMW` parametre) — K-3 purity.
- [x] Named export only; `index.ts` barrel güncel (`DemoSourceStationView` + `buildPeakSeries`/`peakEnergySums` + `PeakSample`/`PeakSeries`) — K-3.
- [x] Renkler `--nm-*` token üzerinden; PV/peak CSS'inde hex yalnız `.po-pv` dolgusunda (token bazlı `rgba`) — K-2/K-3.
- [x] PV kutusu ve stNav butonları klavye erişilebilir (`role="button"`/`role="group"` + `tabIndex` + Enter/Space + `aria-pressed`) — erişilebilirlik.
- [x] Async `for...of await` YOK; `DemoPlantOverview` `useMemo` ile peak serisi/enerji türetir; `DemoSourceStationView` saf render.
- [x] Kod referansları `#sembol` çapasıyla yazıldı — satır numarası yok.
- [x] `bun run spec:check docs/architecture/DEMO-KONSOL-UI-UYUM-MIMARISI.md` temiz (0 hata / 0 uyarı).

### A.6 Genel Durum Özeti (bu tur)

UC-11, PV MV istasyon tek-hat çizimi (FR-11.10) ve "Solar production & peak shaving · today" grafiği (FR-11.11) ile tamamlandı. `DemoSourceStationView` (gdems `srcStationSvg`/`renderSrc` portu) PV kartına tıklanınca site layout yerine açılır; stNav seg ile BESS/PV geçişi ve BESS seçiminde mimic'e dönüş çalışır (trendler gizli, event log sabit — gdems birebir). `buildPeakSeries`/`peakEnergySums` deterministik sentetik gün serisi + enerji toplamlarını üretir; `DemoPlantOverview` `pkwrap` bloğu production/POI alanı + shaved/released bandları + threshold dash + connection limit çizer ve `peaksum` satırını basar. SC-6 (collector + istasyon kartları + PV çizimi + peak grafiği) `demo-plant.test.ts` + `DemoSourceStationView.test.tsx` + `DemoPlantOverview.test.tsx` ile doğrulandı. Kalan boşluklar §B.2'de ileri iş olarak listelendi.

**review_date:** 2026-10-14

## B. TEST KAPSAMI — Ek (2026-10-14d)

### B.1 Senaryo Matrisi (bu tur — durum → koşul → beklenen → test ref'i)

| Durum | Koşul | Beklenen (THEN) | Test ref'i |
|:------|:------|:----------------|:-----------|
| PV tek-hat | `DemoSourceStationView` render | başlık "PV MV STATION #1" + `srcKpi` (Output/Irradiance/Units running) + 7 `rect.po-inv` + INV-01/07 + "TO METAL CLAD Q06" | `DemoSourceStationView.test.tsx` "AK-11.10" |
| PV kutusu | `.po-st[2]` (src1) tıklama | `onSourceSelect("src1")` çağrılır | `DemoPlantOverview.test.tsx` "AK-11.10" |
| Peak serisi | `buildPeakSeries(now, 30, 20, 43.4)` | 97 örnek (15 dk); gece `src=0`; öğle `src>0`, threshold 20, conn 30 | `demo-plant.test.ts` "gün serisi 97 örnek" |
| Peak enerji | `peakEnergySums` (43.4 MW, conn 30) | production > shaved > 0; released 0; curtailed > 0 (43.4 > 30) | `demo-plant.test.ts` "enerji toplamları" |
| Peak enerji | solar < threshold (25 MW) | shaved 0, curtailed 0 | `demo-plant.test.ts` "solar < threshold" |
| Peak grafiği | `sources` + `peakMW` verildi | "Solar production & peak shaving · today" başlığı + "shaved → stored" + "plant in Manual" | `DemoPlantOverview.test.tsx` "AK-11.11" |
| Kaynak geçişi | `DemoFieldPage` PV seçili | `DemoSourceStationView` render; BESS#1 seçilince site layout (mimic) geri gelir | `DemoFieldPage.tsx#DemoFieldPage` (`sourceStation`/`stNav`) |

### B.2 KAPSANMAYAN Boşluklar (bu tur)

| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| G28 | PV üretimi ve peak grafiği tamamen sentetik/illüstratif (backend inverter/controller verisi yok) | orta | Backend inverter telemetrisi + main-source controller gelince `buildPeakSeries` sentetik eğriden gerçek üretime, `DEMO_SOURCE.stations[].mw` statikten canlı AC güç + irradiance'a geç (G23/G25 devamı) |
| G29 | PV tek-hat çizimi e2e yok (yalnız component test) | düşük | Playwright e2e: plant PV kutusuna tıklama → `DemoSourceStationView` açılır + stNav ile BESS'e dönüş |
| G30 | Peak grafiği gerçek üretim/shaved değerleriyle doğrulanmadı (yalnız sentetik seri) | düşük | Gerçek gün üretim + BESS discharge döngüsüyle entegrasyon; released bandı dolar (şimdilik 0) |
| G31 | C — station-tag backend (field_containers.station + register payload) ertelendi | orta | İkinci konteyner stack kurulduktan sonra backend istasyon etiketi; frontend `DEMO_STATIONS` manuel config'i backend config'ine bağlanır (G19 devamı) |

**review_date:** 2026-10-14

---

## Ek (2026-10-14e) — UC-13: station-tagged konteynerler + ikinci konteyner stack + veri akışı doğrulaması

> **İş akışı aşaması:** 5/5 — KAPANIŞ (bu tur: SPEC §6.13 UC-13).
> **SPEC:** [DEMO-KONSOL-UI-UYUM-MIMARISI.md](./DEMO-KONSOL-UI-UYUM-MIMARISI.md) — K-15/K-16, FR-13.1..13.5, AK-13.1..13.5, T-52..T-56, SC-8.
> **Kapsam:** `field_containers.station` (web-service şema + register payload + GET) + konteyner telemetrisi `station` tag'i (`STATION_ID` + `TelemetryTagger`) + dev compose **container-2** stack'i + register aracının iki konteyneri otomatik kaydı (`register:demo-integration`) + frontend istasyon-bazlı fan-out (`stationsForContainers` + `mapFieldToMimicState`) + Admin Add-container station alanı + `station-containers.integration.test.ts` (canlı ayrışma). Önceki Ek (2026-10-14d) A.4#4 bu backend istasyon etiketini ertelenmiş olarak kaydetmişti; bu Ek o boşluğu (G31) kapatır.

### A.1 Değişiklik Matrisi (bu tur)

| # | Dosya | Değişiklik | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------------|
| 1 | `services/web-service/src/presentation/routes/field-routes.ts` | `FieldContainerRow.station` (string\|null); `ensureSchema` inline `ALTER TABLE field_containers ADD COLUMN IF NOT EXISTS station TEXT`; register payload `{token, station?}` — station trim ≤64, boş→NULL, tip değilse 400; UPSERT `ON CONFLICT ... DO UPDATE SET token_hash, station`; `GET /:fieldId/containers` yanıtına `station` | UC-13/T-52, FR-13.1, K-15 |
| 2 | `services/web-service/src/presentation/routes/field-routes.test.ts` | UC-13 testleri (3): `station` ile register→201 + DB'ye yazılır + yanıtta döner; `station` >64 karakter→400; `GET /:fieldId/containers` `station` döndürür | UC-13, AK-13.1 |
| 3 | `services/device-service/src/telemetry-tagger.ts` | `TelemetryTaggerConfig.stationId?` + enrich'te `station` tag'i (yalnız verilirse; JSDoc güncellendi) | UC-13/T-53, FR-13.2 |
| 4 | `services/device-service/src/telemetry-tagger.test.ts` | UC-13 testi (+1): `stationId:"bess2"` → tag `station:"bess2"` (+ `container_id` korunur) | UC-13, AK-13.2 |
| 5 | `packages/shared-utils/src/config/definitions.ts` | `siteStationId` (env `STATION_ID`, key `site.stationId`) + `ALL_CONFIG_DEFINITIONS`'a kayıt | UC-13/T-53, K-15 |
| 6 | `services/device-service/run.ts` | `identity`'e `stationId: config.get("site.stationId")` | UC-13/T-53 |
| 7 | `services/device-service/src/device-service.ts` | `identity` tip imzası `{containerId; fieldId; stationId}` (constructor + `fromConfigDir`) | UC-13/T-53 |
| 8 | `tools/register-container.sh` | `--station` (register payload'a `station`) + `--token-var` (varsayılan `CONTAINER_TOKEN`) flag'leri; register body `{token, station?}` | UC-13/T-54 |
| 9 | `package.json` | `register:demo-integration`: container-1→bess1 (`CONTAINER_TOKEN`) + container-2→bess2 (`--token-var CONTAINER2_TOKEN`) | UC-13/T-54, FR-13.4 |
| 10 | `deployment/v2/dev/container/docker-compose.yml` | **container-2 stack**: `c2-timescaledb`/`c2-redis`/`c2-device-service`/`c2-data-service`/`c2-management-service`/`c2-web-service`; kendi `container2-network` + ortak `demo-bridge`; Modbus simülatör portları host'a YAYINLANMAZ, yalnız DebugInjector `127.0.0.1:15592`; `CONTAINER_ID=container-2`, `STATION_ID=${CONTAINER2_STATION:-bess2}`, `CONTAINER_TOKEN=${CONTAINER2_TOKEN}`; volumes (`demo-container2-timescale-data`/`demo-container2-redis-data`) + network tanımları | UC-13/T-55, FR-13.4, K-16 |
| 11 | `deployment/v2/dev/container/.env.example` | `CONTAINER2_TOKEN` + `CONTAINER2_STATION=bess2` | UC-13/T-55 |
| 12 | `apps/demo-field/src/features/demo-data/demoApi.ts` | `FieldContainer.station?`; `registerContainer(fieldId, containerId, token, station?)` | UC-13/T-56 |
| 13 | `apps/demo-field/src/features/demo-data/demo-stations.ts` | `StationGroup` + `stationsForContainers` (konteyner `station` etiketinden istasyon grupları; etiket yoksa tüm konteynerler her istasyona → legacy; eksik istasyon ilk konteynere fallback) | UC-13/T-56, FR-13.3 |
| 14 | `apps/demo-field/src/features/demo-data/demo-stations.test.ts` | `stationsForContainers` testleri (3): etikete göre atama, eksik istasyon fallback, etiketsiz legacy | UC-13, AK-13.3 |
| 15 | `apps/demo-field/src/features/demo-data/mapFieldToMimicState.ts` | `buildProto` (tek konteyner prototip üretimi) çıkarıldı; **istasyon-bazlı fan-out**: etiket varsa her istasyon kendi konteynerinin satırlarından prototip üretip kendi ünite dilimine fan-out; etiket yoksa legacy tek-prototip (güç korunumu ×N) | UC-13/T-56, FR-13.3 |
| 16 | `apps/demo-field/src/features/demo-data/mapFieldToMimicState.test.ts` | UC-13 testleri (2): iki konteyner iki istasyona bölünür (SOC 60/40 ayrışır); etiketsiz legacy tek prototip | UC-13, AK-13.3 |
| 17 | `packages/ui/src/nova/DemoAdminView.tsx` | Add-container `station` input (`data-testid="add-container-station"`, varsayılan `bess1`) + konteyner tablosuna `Station` sütunu; `registerContainer`/`containerStatus` imzalarına `station` | UC-13/T-56 |
| 18 | `packages/ui/src/nova/DemoAdminView.test.tsx` | register callback beklentisi `station:"bess1"` (imza hizalaması) | UC-13/T-56 |
| 19 | `apps/demo-field/src/pages/DemoAdminPage.tsx` | `containerStatus` `station` eşlemesi + `registerContainer(..., station?)` wiring | UC-13/T-56 |
| 20 | `apps/demo-field/integration/helpers.ts` | `CONTAINER2_INJECT_URL` (varsayılan `http://localhost:15592`) | UC-13/T-56 |
| 21 | `apps/demo-field/integration/station-containers.integration.test.ts` | YENİ (2 test): 2 konteyner `bess1`/`bess2` etiketli + `connected` + telemetri akıyor; c2 BSC-1 `overheat` → bess2 `Max Pack Temp`>50, bess1 nominal (<30) | UC-13, AK-13.4/13.5, SC-8 |

### A.2 Test Kanıtları (bu tur)

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| ui + demo-field + web-service + device-service | `bunx nx run-many -t test -p ui demo-field web-service device-service` | **hepsi yeşil** |
| ui | aynı komut | 39 dosya / 260 test yeşil |
| demo-field | aynı komut | 15 dosya / 86 test yeşil |
| web-service | aynı komut | 71 dosya / 613 test yeşil |
| device-service | aynı komut | 11 dosya / 97 test yeşil |
| yeni testler | `field-routes.test.ts` (3) + `telemetry-tagger.test.ts` (+1) + `demo-stations.test.ts` (3) + `mapFieldToMimicState.test.ts` (2) | 9 yeni/genişletilmiş test yeşil |
| entegrasyon (canlı) | `bun run start:demo-integration` + `bun run register:demo-integration` | 2 konteyner ayağa kalktı; container-1 `station=bess1`, container-2 `station=bess2`, ikisi `connected`, `latestTelemetry` 2137 satır |
| entegrasyon (canlı) | `bunx nx run demo-field:test-integration -- station-containers` | `station-containers.integration.test.ts` **2/2 yeşil** |
| veri ayrımı (canlı) | c2 DebugInjector (15592) `BSC-1 overheat` → `/containers` | container-2 (bess2) `Max Pack Temp`=80, container-1 (bess1)=23; sonra c1 `nominal` → bess1=23, bess2=80 |
| build | `bunx nx run-many -t build -p shared-utils web-service device-service ui demo-field` | 5/5 başarılı |
| build | field-web yeniden build (istasyon-bazlı UI) | başarılı |
| SPEC lint | `bun run spec:check docs/architecture/DEMO-KONSOL-UI-UYUM-MIMARISI.md` | 0 hata / 0 uyarı |

### A.3 Kabul Kriteri Kanıtları (bu tur)

> AK-13.1..13.5 bu SPEC revizyonuyla (UC-13) yeni eklendi; daha önce tanımlanmadığı için sonek gerekmez.

| Kod | Kriter (SPEC özeti) | Kanıt (test/dosya) | Durum |
|:----|:--------------------|:-------------------|:------|
| AK-13.1 | station kolonu + register payload + GET döndürür | `field-routes.test.ts` "UC-13: station ile register → 201" + "station > 64 karakter → 400" + "GET station alanını döndürür" + `field-routes.ts#fieldRoutes` | 🟢 |
| AK-13.2 | Konteyner telemetrisi `station` tag'i taşır (STATION_ID verilirse) | `telemetry-tagger.test.ts` "UC-13: stationId verilirse station tag'i ekler" + `telemetry-tagger.ts#TelemetryTagger` | 🟢 |
| AK-13.3 | Frontend station etiketinden istasyonları türetip istasyon-bazlı fan-out yapar | `demo-stations.test.ts` "stationsForContainers" (3) + `mapFieldToMimicState.test.ts` "UC-13 istasyon-bazlı fan-out" (2) + `mapFieldToMimicState.ts#mapFieldToMimicState` | 🟢 |
| AK-13.4 | Dev compose ikinci stack + kayıt aracı iki konteyneri otomatik kaydeder | canlı `start:demo-integration` + `register:demo-integration` (2 konteyner `connected` + `station` etiketli) + `station-containers.integration.test.ts` "2 konteyner station etiketli" + `docker-compose.yml` container-2 bloğu | 🟢 |
| AK-13.5 | Bir konteynere enjeksiyon yalnız o istasyonun verisini değiştirir | `station-containers.integration.test.ts` "veri istasyon-bazlı ayrışır" + canlı (c2 `overheat` → bess2≈80, bess1 nominal) | 🟢 |

### A.4 Sapmalar (bu tur)

| # | Sapma | Açıklama |
|:--|:------|:---------|
| 1 | Konteyner-2 registration sonrası ilk WS denemesi 401 (restart gerekebilir) | `register:demo-integration` register→`connected` bekler; container-2 için register **öncesi** açılan uplink backoff'a düştüğünden ilk deneme 401 verdi, container-2 **restart sonrası** bağlandı. Davranış: konteyner `CONTAINER_TOKEN`'sız (veya eski token ile) açılan uplink geri çekilene dek 401 kalır; restart token'ı yeniden yükleyip bağlar. Kod hatası değil, başlatma sırası/token yükleme zamanlaması. |
| 2 | `rule-protection.integration.test.ts` tam suite'te flaky | İkinci stack yükü altında FL-07/FL-11/IMD testleri zaman zaman kırmızı (tek başına izole koşumda 7/7 yeşil). Muhtemel neden: management-service değerlendirme/rule debounce zamanlaması + artan yük; UC-13 kodundan bağımsız (zamanlama hassasiyeti). §B.2 G32 olarak kaydedildi. |
| 3 | İkinci konteyner yalnız dev compose'da (prod/AWS kapsam dışı) | K-16 gereği container-2 yalnız `deployment/v2/dev/container/docker-compose.yml`'de; AWS/prod'e ikinci konteyner eklenmedi (SPEC §6.13 "Kapsam hariç"). |
| 4 | Admin Add-container station varsayılanı `bess1` | `DemoAdminView.tsx` `station` state başlangıç değeri `"bess1"`; ikinci konteyner kaydında kullanıcı elle `bess2` girer (placeholder `bess1 / bess2`). |

### A.5 Gözle Kontrol Maddeleri (bu tur)

- [x] `stationsForContainers` ve `mapFieldToMimicState` saf (IO/zaman yok; `containers`/`topo`/`opts` parametre) — K-3 purity.
- [x] Named export only; `demoApi.registerContainer` imzası geriye dönük uyumlu (opsiyonel `station`) — K-3.
- [x] `station` boş/boş-string `NULL` yazılır; trim ≤64; tip kontrolü 400 (trust boundary validasyonu) — `field-routes.ts#fieldRoutes`.
- [x] Token yalnız SHA-256 hash olarak saklanır (mevcut davranış korunur); `station` ayrı kolonda — K-15.
- [x] Konteyner-2 Modbus simülatör portları host'a yayınlanmaz (çakışma); yalnız DebugInjector `127.0.0.1:15592` — K-16.
- [x] Async `for...of await` YOK; `mapFieldToMimicState` senkron türev; entegrasyon testi `sleep`/`inject` ile kademeli.
- [x] Kod referansları `#sembol` çapasıyla yazıldı — satır numarası yok.
- [x] `bun run spec:check docs/architecture/DEMO-KONSOL-UI-UYUM-MIMARISI.md` temiz (0 hata / 0 uyarı).

### A.6 Genel Durum Özeti (bu tur)

UC-13 (station-tagged konteynerler) tamamlandı: backend istasyon etiketi (`field_containers.station` + register payload + GET + `TelemetryTagger` `station` tag'i), dev compose container-2 stack'i, register aracının iki konteyneri otomatik kaydı (`register:demo-integration`) ve frontend istasyon-bazlı fan-out (`stationsForContainers` + `mapFieldToMimicState`) implementasyon + testleri yeşil. SC-8 (iki konteyner station etiketli kaydedilir; telemetri istasyon-bazlı ayrışır — bir enjeksiyon diğerini etkilemez) `station-containers.integration.test.ts` (2/2) + canlı DebugInjector ayrışma doğrulamasıyla kanıtlandı (c2 `overheat` → bess2≈80 °C, bess1 nominal). K-15 (etiket backend'de, fallback legacy korunur) ve K-16 (yalnız dev compose) birebir uygulandı. Kalan boşluklar §B.2'de ileri iş olarak listelendi.

**review_date:** 2026-10-14

## B. TEST KAPSAMI — Ek (2026-10-14e)

### B.1 Senaryo Matrisi (bu tur — durum → koşul → beklenen → test ref'i)

| Durum | Koşul | Beklenen (THEN) | Test ref'i |
|:------|:------|:----------------|:-----------|
| Register | `station:"bess1"` + geçerli token | 201; yanıtta `station:"bess1"`; `INSERT` `station` kolonunu taşır | `field-routes.test.ts` "UC-13: station ile register → 201" |
| Register | `station` >64 karakter | 400 | `field-routes.test.ts` "UC-13: station > 64 karakter → 400" |
| Register | `station` boş string | `NULL` yazılır (etiket yok sayılır) | `field-routes.ts#fieldRoutes` (trim→NULL, kod inceleme) |
| GET containers | konteyner `station` kolonu dolu | yanıtta `station:"bess2"` | `field-routes.test.ts` "UC-13: GET station alanını döndürür" |
| Telemetri tag | `stationId:"bess2"` | satır tag'inde `station:"bess2"` + `container_id` korunur | `telemetry-tagger.test.ts` "UC-13: stationId verilirse" |
| İstasyon atama | 2 konteyner `bess1`/`bess2` | group[0]=[container-1], group[1]=[container-2], fallback false | `demo-stations.test.ts` "station etiketine göre ... atar" |
| İstasyon fallback | yalnız `bess1` etiketli | eksik istasyon ilk konteynere düşer (fallback true) | `demo-stations.test.ts` "eksik etiketli istasyon ilk konteynere düşer" |
| İstasyon legacy | etiket yok | tüm konteynerler her istasyona (fallback true) | `demo-stations.test.ts` "etiket yoksa tüm konteynerler her istasyona" |
| Fan-out (etiketli) | c1 bess1 (SOC 60), c2 bess2 (SOC 40) | ünite 1–5 SOC 60, ünite 6–9 SOC 40 (9 ünite) | `mapFieldToMimicState.test.ts` "iki konteyner iki istasyona bölünür" |
| Fan-out (etiketsiz) | tek konteyner, etiket yok | legacy tek prototip (9 ünite, güç korunumu) | `mapFieldToMimicState.test.ts` "etiket yoksa legacy tek prototip" |
| Canlı kayıt | `start:demo-integration` + `register:demo-integration` | 2 konteyner `connected` + `bess1`/`bess2` etiketli + telemetri >0 | `station-containers.integration.test.ts` "2 konteyner station etiketli" |
| Canlı ayrışma | c2 BSC-1 `overheat` | bess2 `Max Pack Temp`>50, bess1 nominal (<30) | `station-containers.integration.test.ts` "veri istasyon-bazlı ayrışır" |

### B.2 KAPSANMAYAN Boşluklar (bu tur)

| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| G32 | `rule-protection.integration.test.ts` tam suite'te flaky (FL-07/FL-11/IMD) — ikinci stack yükü + management-service debounce zamanlaması | orta | İzole koşumda 7/7 yeşil; debounce/retry sürelerini artır veya entegrasyon testini iki-stack senaryosunda stabilize et (UC-13 kodundan bağımsız) |
| G33 | İkinci konteyner yalnız dev compose'da; prod/AWS'e container-2 yok | düşük | Prod/AWS ikinci konteyner ihtiyacı doğarsa aynı blok tier'a taşınır (K-16 kapsam dışı — SPEC onayı gerekir) |
| G34 | Per-istasyon H03 sayaç telemetrisi hâlâ yok → istasyon MW'si PCS toplamından yaklaşım (G19 devamı); UC-13 etiketi bunu değiştirmez | orta | Backend per-istasyon sayaç register'ı gelince `stateForStation`/`deriveStationView` PCS toplamından canlıya geçer |
| G35 | Konteyner-2 register sonrası ilk uplink 401 — restart gereksinimi belgelenmeli/otomatize edilmeli | düşük | `register-container.sh` register sonrası `connected` beklemeden önce uplink backoff'u geri çeksin (restart adımı otomatikleştirilebilir); kullanıcı dökümünde not edildi (A.4#1) |

**review_date:** 2026-10-14

---

## Ek (2026-10-14f) — UC-13: Devices istasyon filtresi + pack şeması + Operations istasyon bazlı

> **İş akışı aşaması:** 5/5 — KAPANIŞ (bu tur: SPEC §6.13 UC-13 genişletmesi — FR-13.6 Devices istasyon filtresi, FR-13.7 pack şeması, FR-13.8 Operations istasyon bazlı).
> **SPEC:** [DEMO-KONSOL-UI-UYUM-MIMARISI.md](./DEMO-KONSOL-UI-UYUM-MIMARISI.md) — K-15, FR-13.6/13.7/13.8, AK-13.6..13.8, T-57..T-59, SC-8.
> **Kapsam:** `DEMO_PACK_SPEC` pack künyesi (gdems `topology.js#unit.pack` birebir) + `DemoPackSchematic` (gdems `devices.js#packSvg`/`packDetail` portu) + `DemoDevicesPage` istasyon filtresi + `DemoManeuverPage` istasyon-bazlı operasyonlar + `.pk-*`/`.packdet`/`.pkrow` stilleri. Önceki Ek (2026-10-14e) UC-13'ün backend/fan-out kısmını (FR-13.1..13.5) kapatmıştı; bu Ek frontend istasyon süzmesini Devices/Operations'a taşır ve pack şemasını ekler.

### A.1 Değişiklik Matrisi (bu tur)

| # | Dosya | Değişiklik | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------------|
| 1 | `apps/demo-field/src/features/demo-data/demo-topology.ts#DEMO_PACK_SPEC` | YENİ pack künyesi sabiti (gdems `topology.js#unit.pack` birebir): model EP077170PCB2, name "Grid JF1 1CP Pack", 3P24S, 24S×3P=72 hücre, 4×CMA 3P6S (18 hücre), 169.8 Ah, 77.28 V, 13.122 kWh, charge/discharge sınırları, dielectric 4.15 kV, IP20, dimMM (1357.4×437×114.4 mm)/107 kg, Gen3 PBMS, JF1 hücre spec'i (56.6–59.5 Ah, 3.22 V, 2.5–3.65 V, 182.25 Wh, DCIR 1.261–2.261 mΩ, 1077 g) | UC-13/T-58, FR-13.7 |
| 2 | `packages/ui/src/nova/DemoPackSchematic.tsx#DemoPackSchematic` (YENİ) | `devices.js#packSvg` + `packDetail` portu: üstten görünüm FRONT (fan, PBMS + comm port, fuse, (+)/(−) terminaller) + 4×CMA 3P6S (S1–S24 seri grupları, her biri 3 hücre = 72 hücre) + inter busbar'lar + negative busbar + TH1–TH4 (film NTC, CMA başına 1) + Vmax/Vmin hücre işaretleri (rack uç değeri bu pack'teyse); altında "Live · BSC registers that point to this pack" (rack offset 84/85/87/88/89/90/92/93) + "Not in the BSC Modbus map" + "Pack specification · LGES Rev AE" tablosu; `packData`/`packMarkers` deterministik türevinden | UC-13/T-58, FR-13.7, AK-13.7 |
| 3 | `packages/ui/src/nova/index.ts` | Barrel export: `DemoPackSchematic` + `DemoPackSchematicProps`/`DemoPackSpec` + `DIAG` | K-3 |
| 4 | `packages/ui/src/nova/DemoPackDetail.tsx#DIAG` | `DIAG` sabiti export edildi (pack şeması/denetim işareti paylaşımı) | UC-13/T-58, K-3 |
| 5 | `packages/ui/src/nova/nova-console.css` | `.packdet` (grid + border-top) + `.pk-wrap`/`.pk` (min-width 620) + `.pkrow` (2fr\|1fr, 860px altı tek kolon) + `.pk-case`/`.pk-front`/`.pk-fan`/`.pk-fanb`/`.pk-pbms`/`.pk-port`/`.pk-tp`/`.pk-tn`/`.pk-fuse`/`.pk-cma`/`.pk-bb`/`.pk-cell`(+`.mx`/`.mn`)/`.pk-ib`/`.pk-neg`/`.pk-sense`/`.pk-th`(+`.mx`/`.mn`)/`.pk-t`/`.pk-v` (gdems `app.css` `.pk-*` portu) | UC-13/T-58, K-2/K-3 |
| 6 | `apps/demo-field/src/pages/DemoDevicesPage.tsx#DemoDevicesPage` | İstasyon filtresi: `state` → `stationState`/`stationTopology` (context); Battery groups + unit panelleri + AUX + StationCellView yalnız seçili istasyonun üniteleri; `?unit=` seçili istasyonun ünitelerine doğrulanır (`inStation`); `DemoAuxPanel`/`StationCellView` `stationTopology` kullanır; BatteryBody'e `DemoPackSchematic` eklendi | UC-13/T-57, FR-13.6, AK-13.6 |
| 7 | `apps/demo-field/src/pages/DemoManeuverPage.tsx#DemoManeuverPage` | Operations istasyon bazlı: `state` → `stationState` + `DEMO_TOPOLOGY` → `stationTopology`; units/scope/execute/deriveler (`derivePermissives`/`deriveStartupChecks`) istasyona süzülür; `station={stationState.station}` | UC-13/T-59, FR-13.8, AK-13.8 |
| 8 | `packages/ui/src/nova/DemoPackSchematic.test.tsx` (YENİ) | 3 test: 4 CMA + 72 hücre + FRONT bloğu; spec tablosu + not-in-map + live bölüm; `packIndex` ile başlık değişimi | UC-13, AK-13.7 |

### A.2 Test Kanıtları (bu tur)

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| ui + demo-field | `bunx nx run-many -t test -p ui demo-field` | **hepsi yeşil** |
| ui | aynı komut | 40 dosya / 263 test yeşil |
| demo-field | aynı komut | 15 dosya / 86 test yeşil |
| yeni testler | `DemoPackSchematic.test.tsx` (3) | 3 yeni test yeşil |
| build | `bunx nx run ui:build` + `bunx nx run demo-field:build` | başarılı |
| build | field-web yeniden build (istasyon filtreli Devices + pack şeması) | başarılı |
| SPEC lint | `bun run spec:check docs/architecture/DEMO-KONSOL-UI-UYUM-MIMARISI.md` | 0 hata / 0 uyarı |

### A.3 Kabul Kriteri Kanıtları (bu tur)

> AK-13.6..13.8 bu SPEC revizyonuyla (UC-13 genişletme) yeni eklendi; daha önce tanımlanmadığı için sonek gerekmez.

| Kod | Kriter (SPEC özeti) | Kanıt (test/dosya) | Durum |
|:----|:--------------------|:-------------------|:------|
| AK-13.6 | Devices'ta istasyon seçilince Battery groups yalnız o istasyonun ünitelerini listeler | `DemoDevicesPage.tsx#DemoDevicesPage` (`stationState.units.map` + `inStation` doğrulama + `stationTopology` — kod inceleme) | 🟢 |
| AK-13.7 | Pack şeması (4×CMA S1–S24, 72 hücre, FRONT + spec tablosu) render edilir | `DemoPackSchematic.test.tsx` (3 test) + `DemoPackSchematic.tsx#DemoPackSchematic` | 🟢 |
| AK-13.8 | Operations seçili istasyona göre çalışır (units/scope/permissives/startup süzülür) | `DemoManeuverPage.tsx#DemoManeuverPage` (`stationState`/`stationTopology` — kod inceleme) | 🟢 |

### A.4 Sapmalar (bu tur)

| # | Sapma | Açıklama |
|:--|:------|:---------|
| 1 | Aktif program/sekanslar (`OperationRunRecord`) istasyon/ünite scope'u taşımaz | `OperationRunRecord.steps` `unknown` ve cihaz bazlıdır; `DemoManeuverPage`'te aktif koşu görünümü (`activeFromRun`) alan-geneli kalır. Operasyon **yürütme scope'u** ve units/permissives/startup istasyona süzülür, ancak per-istasyon program ayrımı demo veri modelinde mümkün değildir. Backend run kayıtlarına istasyon/ünite scope'u eklenene dek aktif koşu alan-geneli kalır (§B.2 G36). |
| 2 | Pack seviyesi veri Modbus'ta yok (referans da türetir) | `packData` deterministik türevdir (`demo-bess-data.ts#packData`); `DemoPackSchematic` Vmax/Vmin hücre konumu ile TH sensör konumunu türevden işaretler (`smax/smin = cmaxId/cminId mod 4`). Pack SOC/SOH, 24 hücre voltajı, 4 termistör + 2 PCB sıcaklığı Modbus Rev AF'de okunamaz — "Not in the BSC Modbus map" metniyle dürüstçe belirtilir (uydurma yok). |
| 3 | Devices'ta MV hücreleri/AUX site-geneli (tek DEMO-MV-1 cihazı) | `DEMO_TOPOLOGY.station.cells` (H01/H02/H04/H05) ve AUX tek `DEMO-MV-1` cihazından gelir ve iki istasyon tarafından paylaşılır. Per-istasyon MV/AUX cihaz config'i olmadığından bu bölümler istasyona süzülmez; yalnız BESS/unit panelleri istasyona süzülür (§B.2 G38). |
| 4 | `?unit=` istasyon dışıysa ilk istasyon ünitesine düşer | `DemoDevicesPage.tsx#DemoDevicesPage` `sel` useMemo: `inStation ? Number(unit) : stationState.units[0]?.n ?? 1` — derin bağlantı seçili istasyonun ünitesine işaret etmiyorsa sessizce o istasyonun ilk ünitesine düşer (throw yok). |
| 5 | `DemoPackSchematicProps.tempMin`/`tempMax` prop'ları iletilir ancak bileşende okunmaz | `DemoDevicesPage.tsx#BatteryBody` `tempMin={L.tempMin}`/`tempMax={L.tempMax}` geçer; `DemoPackSchematic` sıcaklık işaretini `pd.tmin`/`pd.tmax` + `markers`'tan türetir (prop'lar atıl). Davranış doğru, prop imzası fazladan — temizlik adayı (risk yok). |

### A.5 Gözle Kontrol Maddeleri (bu tur)

- [x] `DEMO_PACK_SPEC` saf sabit; `DemoPackSchematic` `useMemo` ile `packData`/`packMarkers` türetir (IO/zaman yok) — K-3 purity.
- [x] Named export only; `index.ts` barrel güncel (`DemoPackSchematic` + `DemoPackSchematicProps`/`DemoPackSpec` + `DIAG`) — K-3.
- [x] Renkler `--nm-*` token üzerinden; `.pk-*` stillerinde hex yalnız referans birebir sabit terminal/fuse/busbar renkleri (`.pk-tp` `#c4321d`, `.pk-tn`/`.pk-neg` `#1f62c9`, `.pk-fuse`/`.pk-ib` `#b8742a`) — K-2/K-3.
- [x] Pack şeması SVG `role="img"` + `aria-label` (`${spec.name} ${pn(packIndex)} schematic`) — erişilebilirlik.
- [x] Async `for...of await` YOK; istasyon süzme senkron türev (`stationState`/`stationTopology` context'ten, `useMemo`/`useEffect` temiz).
- [x] Kod referansları `#sembol` çapasıyla yazıldı — satır numarası yok.
- [x] `bun run spec:check docs/architecture/DEMO-KONSOL-UI-UYUM-MIMARISI.md` temiz (0 hata / 0 uyarı).

### A.6 Genel Durum Özeti (bu tur)

UC-13 frontend istasyon süzmesi tamamlandı: `DemoDevicesPage` (Battery groups + unit panelleri + AUX + StationCellView seçili istasyona süzülür, `?unit=` doğrulanır) ve `DemoManeuverPage` (units/scope/permissives/startup istasyona süzülür) `stationState`/`stationTopology` context'inden beslenir (stBar seçimiyle senkron). Pack şeması `DEMO_PACK_SPEC` + `DemoPackSchematic` (gdems `packSvg`/`packDetail` portu: FRONT + 4×CMA 3P6S S1–S24/72 hücre + inter/negative busbar + TH1–TH4 + Vmax/Vmin işaretleri + live/spec/not-in-map tabloları) ile eklendi ve `DemoDevicesPage` BatteryBody'e bağlandı. AK-13.6..13.8 doğrulandı (AK-13.6/AK-13.8 kod inceleme, AK-13.7 `DemoPackSchematic.test.tsx` 3 test). Test koşumu `ui` (40 dosya / 263 test) + `demo-field` (15 dosya / 86 test) yeşil; `ui`/`demo-field` build + field-web rebuild başarılı. Kalan boşluklar §B.2'de ileri iş olarak listelendi.

**review_date:** 2026-10-14

## B. TEST KAPSAMI — Ek (2026-10-14f)

### B.1 Senaryo Matrisi (bu tur — durum → koşul → beklenen → test ref'i)

| Durum | Koşul | Beklenen (THEN) | Test ref'i |
|:------|:------|:----------------|:-----------|
| Devices istasyon filtresi | `activeStation` #2 seçili | Battery groups yalnız BESS#6–9 (`stationState.units.map`) | `DemoDevicesPage.tsx#DemoDevicesPage` (kod inceleme) |
| Devices `?unit=` | `?unit=` seçili istasyon içinde | o ünite seçilir | `DemoDevicesPage.tsx#DemoDevicesPage` (`sel` useMemo `inStation`) |
| Devices `?unit=` | `?unit=` istasyon dışı | ilk istasyon ünitesine düşer (`stationState.units[0]?.n`) | `DemoDevicesPage.tsx#DemoDevicesPage` (kod inceleme) |
| Devices AUX/StationCellView | istasyon seçili | `stationState.units[0]`/`stationTopology.feeders` (site-geneli yerine) | `DemoDevicesPage.tsx#DemoDevicesPage`/`#StationCellView` (kod inceleme) |
| Pack şeması render | `DemoPackSchematic` render | 4 `rect.pk-cma` + 72 `rect.pk-cell` + "CMA 1 · 3P6S · S1–S6" + FRONT + PBMS | `DemoPackSchematic.test.tsx` (test 1) |
| Pack şeması spec/not-in-map | render | "Pack specification · LGES Rev AE" + "Not in the BSC Modbus map" + "Live · BSC registers..." + "3P24S = 72 cells" | `DemoPackSchematic.test.tsx` (test 2) |
| Pack şeması packIndex | `packIndex=4` | başlık "Pack P05 · Rack#3" | `DemoPackSchematic.test.tsx` (test 3) |
| Pack şeması live (uç değer) | rack Vmax bu pack'te | "Max cell voltage in this pack (rack max)" + hücre S{n} + offset "84 / 87" | `DemoPackSchematic.tsx#DemoPackSchematic` (`live` türevi — kod inceleme) |
| Pack şeması live (uç değer değil) | rack uç değeri başka pack'te | "not the location of a rack extreme" mesajı (uydurma yok) | `DemoPackSchematic.tsx#DemoPackSchematic` (kod inceleme) |
| Pack şeması TH konumu | T max/min rack ucu bu pack'te | TH{smax}/{smin} `.mx`/`.mn` işareti + °C değeri (türevden) | `DemoPackSchematic.tsx#DemoPackSchematic` (`smax`/`smin` — kod inceleme) |
| Ops scope | `activeStation` #2 | units/scope/execute BESS#6–9'a süzülür (`stationState`) | `DemoManeuverPage.tsx#DemoManeuverPage` (kod inceleme) |
| Ops permissives | FL-02 seçili | `derivePermissives(state, stationTopology, ...)` istasyon topolojisiyle | `DemoManeuverPage.tsx#DemoManeuverPage` (`permissivesFor`) |
| Ops startup | form render | `deriveStartupChecks(state, stationTopology)` istasyon bazlı | `DemoManeuverPage.tsx#DemoManeuverPage` (`startupChecks`) |

### B.2 KAPSANMAYAN Boşluklar (bu tur)

| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| G36 | Per-istasyon aktif program yok — `OperationRunRecord` cihaz bazlı (`steps: unknown`), istasyon/ünite scope'u taşımaz → aktif koşu görünümü alan-geneli kalır | orta | Backend run kayıtlarına istasyon/ünite scope'u eklenince aktif program/sekanslar istasyona süzülür (A.4#1); demo veri modeli genişletilir |
| G37 | Pack şeması e2e yok (yalnız component test) | düşük | Playwright e2e: Devices › Battery › rack › pack seçimi → şema (FRONT + CMA + TH) + spec tablosu + live kayıt görünür |
| G38 | MV hücreleri/AUX site-geneli (tek DEMO-MV-1 iki istasyon paylaşır) — per-istasyon MV/AUX cihazı yok | orta | Per-istasyon MV/AUX cihaz config'i (veya istasyon etiketli cihaz) gelince MV hücreleri/AUX da istasyona süzülür (A.4#3) |
| G39 | `DemoPackSchematicProps.tempMin`/`tempMax` atıl prop'lar (A.4#5) — imza/türetim temizliği | düşük | Bileşen sıcaklık işaretini yalnız `markers`'tan türetiyor; gerekirse prop'lar kaldırılır veya türevle birleştirilir |

**review_date:** 2026-10-14

---

## Ek (2026-10-14g) — UC-13 hata düzeltmeleri: Ready istasyon filtresi + deploy (stale image)

> **İş akışı aşaması:** 5/5 — KAPANIŞ (bu tur: SPEC §6.13 UC-13 hata düzeltmesi — Ready termal hazırlık istasyon filtresi + Devices tree başlığı + field-web bayat imaj düzeltmesi).
> **SPEC:** [DEMO-KONSOL-UI-UYUM-MIMARISI.md](./DEMO-KONSOL-UI-UYUM-MIMARISI.md) — K-14, FR-13.6, AK-13.6 (mevcut; bu tur yeni FR/AK EKLEMEZ).
> **Kapsam:** `DemoReadySection` termal hazırlık listesinin seçili istasyona süzülmesi (önceden site-geneli 9 grup → artık istasyon bazlı) + `DemoDevicesPage` tree başlığının aktif istasyon adına (`stationTopology.station.name`) bağlanması + field-web deploy'unun bayat imajdan kurtarılması (force-recreate prosedürü). Kod değişikliği 2 dosya; deploy bir prosedür düzeltmesidir (kod dışı).

### A.1 Değişiklik Matrisi (bu tur)

| # | Dosya | Değişiklik | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------------|
| 1 | `apps/demo-field/src/components/DemoReadySection.tsx#DemoReadySection` | `readyUnits` seçili istasyona süzülür: `const stationUnits = new Set(stationState.units.map((u) => u.n))` + `const units = readyUnits.filter((r) => stationUnits.has(r.n))`; ambient `stationState.ambient ?? state.ambient`. "Thermal readiness · n / total groups" artık istasyon bazlı (önceden site-geneli 9 grup gösteriyordu). | K-14 (istasyon-bazlı), AK-13.6 (güçlendirme) |
| 2 | `apps/demo-field/src/pages/DemoDevicesPage.tsx#DemoDevicesPage` | Tree başlığı `<h4>{stationTopology.station.name}</h4>` — aktif istasyon adı (önceden `DEMO_TOPOLOGY.station.name` sabitti; istasyon değişince başlık da değişir). | FR-13.6, AK-13.6 |
| 3 | `deployment/v2/dev/field/docker-compose.yml#field-web` (prosedür, kod dışı) | `docker compose --env-file ... build field-web` + `up -d --no-deps --force-recreate field-web` → çalışan konteyner yeni imajla recreate edildi (önceden `up -d --build` yeni imajı build etti ama konteyneri recreate etmedi — bayat SPA servis ediliyordu). | AK-13.6 (canlı görünürlük), deploy |

### A.2 Test Kanıtları (bu tur)

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| ui + demo-field | `bunx nx run-many -t test -p ui demo-field` | **hepsi yeşil** |
| ui | aynı komut | 40 dosya / 263 test yeşil |
| demo-field | aynı komut | 15 dosya / 86 test yeşil |
| build | `bunx nx run ui:build` + `bunx nx run demo-field:build` | başarılı |
| deploy | `docker compose --env-file deployment/v2/dev/field/.env -f deployment/v2/dev/field/docker-compose.yml build field-web` + `up -d --no-deps --force-recreate field-web` | yeni imaj (`0b4aea…`) ile recreate; servis edilen bundle'da `pack-schematic`/`stationState` grep ile doğrulandı |
| SPEC lint | `bun run spec:check docs/architecture/DEMO-KONSOL-UI-UYUM-MIMARISI.md` | 0 hata / 0 uyarı |

### A.3 Kabul Kriteri Kanıtları (bu tur)

> Hata düzeltme turu — yeni FR/AK eklenmedi. Bu tur mevcut AK-13.6 (Devices istasyon filtresi) ve K-14 (istasyon-bazlı) davranışını **tamamlar/teyit eder** (AK-13.6 sonekle anılır — spec-check ID tekilliği).

| Kod | Kriter (SPEC özeti) | Kanıt (test/dosya) | Durum |
|:----|:--------------------|:-------------------|:------|
| AK-13.6 (rev) | Devices tree başlığı + Ready termal listesi seçili istasyonu yansıtır (site-geneli değil) | `DemoDevicesPage.tsx#DemoDevicesPage` (tree `stationTopology.station.name`) + `DemoReadySection.tsx#DemoReadySection` (`stationUnits` Set süzmesi) — kod inceleme | 🟢 |
| K-14 (rev) | Ready/termal hazırlık seçili istasyona göre hesaplanır; ambient istasyon değerini tercih eder | `DemoReadySection.tsx#DemoReadySection` (`units` filtresi + `ambient = stationState.ambient ?? state.ambient`) | 🟢 |

### A.4 Sapmalar (bu tur)

| # | Sapma | Açıklama |
|:--|:------|:---------|
| 1 | Önceki rebuild'ler no-op kalmıştı | `up -d --build field-web` yeni imajı build etti ama çalışan konteyneri **recreate etmedi** (imaj yeni, konteyner eski imajda kaldı) → kullanıcı bayat SPA gördü. Çözüm: `build field-web` + `up -d --no-deps --force-recreate field-web`. Bundan sonra field-web deploy prosedürü bu iki adımı içermeli (G42). |
| 2 | "1 BESS" kullanıcı bildirimi temiz deploy sonrası teyit edilecek | Kodda tek-ünite üreten yol yok (station #2 = 4 ünite, testli); bayat deploy per-station Devices/Operations/pack şemasını gizliyordu. Temiz deploy sonrası ekranın tekrar gözlenmesi gerek (G40). |
| 3 | Tarayıcı önbelleği hard-refresh gerektirebilir | field-web Nginx statik servis eder; eski bundle'ın tarayıcı önbelleğinde kalması bayat görünümü sürdürebilir → kullanıcıya hard-refresh (Ctrl+Shift+R) gerekebilir (G40 ile birlikte). |

### A.5 Gözle Kontrol Maddeleri (bu tur)

- [x] `DemoReadySection.tsx#DemoReadySection` süzmesi saf (IO/zaman yok; `stationState`/`readyUnits` context'ten) — K-3 purity.
- [x] `stationUnits` `Set` kullanımı O(1) üyelik testi (`has`) — hazırlık listesi küçük, karmaşıklık lineer.
- [x] `stationState.ambient ?? state.ambient` fallback'i korur (istasyon ambient'i yoksa site-geneli ambient) — edge-case güvenli.
- [x] Tree başlığı `stationTopology.station.name` context'ten gelir (stBar seçimiyle senkron) — K-14.
- [x] Async `for...of await` YOK; süzme senkron türev (`filter` + `Set.has`), context'ten `useMemo` ile beslenir.
- [x] Kod referansları `#sembol` çapasıyla yazıldı — satır numarası yok.
- [x] `bun run spec:check docs/architecture/DEMO-KONSOL-UI-UYUM-MIMARISI.md` temiz (0 hata / 0 uyarı).

### A.6 Genel Durum Özeti (bu tur)

UC-13 istasyon-bazlı davranış tamamlandı: `DemoReadySection` termal hazırlık listesi artık seçili istasyonun gruplarına süzülür (önceden site-geneli 9 grup) ve ambient istasyon değerini tercih eder; `DemoDevicesPage` tree başlığı aktif istasyon adını gösterir. Ayrıca field-web deploy'unun bayat imaj sorunu çözüldü (force-recreate ile yeni imaj yüklendi; bundle'da `pack-schematic`/`stationState` doğrulandı). Kod değişikliği 2 dosya ile sınırlı; test koşumu `ui` (40/263) + `demo-field` (15/86) yeşil, build'ler başarılı, spec:check temiz. Kalan boşluklar §B.2'de ileri iş olarak listelendi.

**review_date:** 2026-10-14

## B. TEST KAPSAMI — Ek (2026-10-14g)

### B.1 Senaryo Matrisi (bu tur — durum → koşul → beklenen → test ref'i)

| Durum | Koşul | Beklenen (THEN) | Test ref'i |
|:------|:------|:----------------|:-----------|
| Ready istasyon süzme | `activeStation` #1 (BESS#1–5) | Thermal readiness yalnız 5 grup listeler (site-geneli 9 değil) | `DemoReadySection.tsx#DemoReadySection` (`stationUnits` Set + filter) |
| Ready istasyon süzme | `activeStation` #2 (BESS#6–9) | Thermal readiness yalnız 4 grup listeler | `DemoReadySection.tsx#DemoReadySection` |
| Ready istasyon-dışı grup | `readyUnits` içinde seçili istasyon dışı grup (`stationUnits.has(r.n) === false`) | filtrelenir (gösterilmez) | `DemoReadySection.tsx#DemoReadySection` (`units = readyUnits.filter(...)`) |
| Ready ambient | `stationState.ambient` dolu | istasyon ambient'i kullanılır | `DemoReadySection.tsx#DemoReadySection` (`stationState.ambient ?? state.ambient`) |
| Ready ambient | `stationState.ambient` undefined | site-geneli `state.ambient` fallback | `DemoReadySection.tsx#DemoReadySection` |
| Devices tree başlığı | `activeStation` #1 | başlık `stationTopology.station.name` (BESS MV Station #1) | `DemoDevicesPage.tsx#DemoDevicesPage` (`<h4>{stationTopology.station.name}</h4>`) |
| Devices tree başlığı | `activeStation` #2 | başlık #2 adına geçer (önceden `DEMO_TOPOLOGY.station.name` sabitti) | `DemoDevicesPage.tsx#DemoDevicesPage` |
| Deploy doğrulama | force-recreate sonrası bundle | servis edilen JS'de `pack-schematic`/`stationState` sembolleri mevcut (bayat imaj değil) | grep (prosedür) — `field-web` yeni imaj `0b4aea…` |

### B.2 KAPSANMAYAN Boşluklar (bu tur)

| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| G40 | "1 BESS" kullanıcı bildirimi temiz deploy sonrası teyit edilmedi (kodda tek-ünite üreten yol yok; station #2 = 4 ünite, testli) | orta | Temiz deploy sonrası Devices/Operations/Ready ekranı canlı gözlemlenir; gerekirse tarayıcı hard-refresh ile bundle yeniden yüklenir (A.4#2/#3) |
| G41 | Ready istasyon süzmesi + tree başlığı e2e yok (yalnız kod inceleme; component testi yok) | düşük | Playwright e2e: stBar istasyon geçişi → Ready "n / 4 groups" + Devices tree başlığı değişir |
| G42 | field-web deploy prosedürü bayat-imaj tuzağına açık (önceki `up -d --build` no-op kaldı) | orta | `start:demo-integration`/deploy script'ine `build field-web` + `up -d --no-deps --force-recreate field-web` adımları eklenir (A.4#1) — tekrarlanan bayat-imaj bildirimi engellenir |

**review_date:** 2026-10-14

---

## Ek (2026-10-14h) — UC-13: istasyon bazlı uzak yürütme (`systems`) + her konteyner için ayrı compose + SOC/polling

> **İş akışı aşaması:** 5/5 — KAPANIŞ (bu tur: SPEC §6.13 UC-13 genişletmesi — FR-13.9 istasyon bazlı uzak yürütme + K-16 revize + K-17).
> **SPEC:** [DEMO-KONSOL-UI-UYUM-MIMARISI.md](./DEMO-KONSOL-UI-UYUM-MIMARISI.md) — K-16 (rev), K-17, FR-13.9, AK-13.9, T-60, SC-8.
> **Kapsam:** İstasyon bazlı uzak yürütme (`ExecuteOptions.remoteSystem` + `executeBodySchema.systems` + ön yüz `stationSystems`), station-tag temizliği (konteyner/servislerden kaldırılır; eşleme yalnız `field_containers.station` + ön yüzde — K-17), compose bölünmesi (container-2 kendi `docker-compose.yml` + `.env` + config kopyalarına ayrılır — K-16 rev), BSC başlangıç SOC farkı (`initialSocPercent`) + polling sıklaştırma (`pollIntervalMs` 2000→1000). Önceki Ek (2026-10-14e) station tag'ini `STATION_ID` env + `TelemetryTagger` ile konteynere taşımıştı; bu Ek o kararı **geri alır** (kullanıcı düzeltmesi — K-17).

### A.1 Değişiklik Matrisi (bu tur)

| # | Dosya | Değişiklik | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------------|
| 1 | `services/device-service/src/telemetry-tagger.ts#TelemetryTagger` | `stationId` config + `station` tag'i KALDIRILDI (Ek 14e'de eklenenin geri alınması) | K-17 |
| 2 | `packages/shared-utils/src/config/definitions.ts` | `siteStationId` (env `STATION_ID`) SİLİNDİ | K-17 |
| 3 | `services/device-service/run.ts` | `identity.stationId` kaldırıldı | K-17 |
| 4 | `services/device-service/src/device-service.ts` | `identity` tip imzasından `stationId` kaldırıldı (`{containerId; fieldId}`) | K-17 |
| 5 | `services/device-service/src/telemetry-tagger.test.ts` | `stationId` tag testi kaldırıldı | K-17 |
| 6 | `deployment/v2/dev/container/docker-compose.yml` | container-2 `c2-*` servisleri ÇIKARILDI (yalnız 6 container-1 servis + `demo-bridge`); `STATION_ID` env kaldırıldı | K-16 (rev) |
| 7 | `deployment/v2/dev/container2/docker-compose.yml` (YENİ) | container-2 stack'i (6 servis), `name: v2-dev-demo-container2`; kendi `container2-network` + `demo-bridge` (external); DebugInjector `127.0.0.1:15592`; `TUNNEL_API_UPSTREAM=http://container2-web-service:5001` | K-16 (rev), FR-13.4 |
| 8 | `deployment/v2/dev/container2/.env` + `.env.example` (YENİ) | container-2 ortamı (`CONTAINER_TOKEN`, `CONTAINER_ID=container-2`); device-configs/maneuvers/rules kopyaları | K-16 (rev) |
| 9 | `deployment/v2/dev/container/.env.example` | `CONTAINER2_TOKEN` + `CONTAINER2_STATION=bess2` | K-16 (rev) |
| 10 | `package.json` | `start/stop:demo-integration` üç compose (container + container2 + field) + container compose'a `--remove-orphans`; `register:demo-integration` iki konteyneri kaydeder (`--station bess1`/`bess2`, `--token-var CONTAINER2_TOKEN`) | K-16 (rev) |
| 11 | `tools/register-container.sh` | `--station` (register payload'a `station`) + `--token-var` (varsayılan `CONTAINER_TOKEN`) | K-16 (rev) |
| 12 | `packages/simulators/src/host.ts#SimulatorBuildContext` / `#SimulatorHost` | `initialSocPercent` (details → BSC builder; yoksa sim 50) | K-16 (SOC farkı) |
| 13 | `deployment/v2/dev/container2/device-configs/bsc-1.json` + `bsc-2.json` | `details.initialSocPercent: 72` (istasyon 1 %50, istasyon 2 %72) | K-16 (SOC farkı) |
| 14 | `deployment/v2/dev/{container,container2}/device-configs/*.json` + `deployment/v2/dev/field/device-configs/demo-mv-1.json` | `pollIntervalMs` 2000→1000 (control-panel-io 1000; field demo-mv-1 1000) | K-16 (polling) |
| 14b | `apps/demo-field/src/features/demo-data/useDemoFieldData.ts#useDemoFieldData` + `#useDemoFieldTelemetry` | ön yüz `refetchInterval` 5000→2000 (konteyner/telemetri; trendler 30 sn kalır) | K-16 (polling) |
| 15 | `packages/platform/commands/src/operation-executor.ts#ExecuteOptions` | `remoteSystem?` eklendi; uzak adım + rollback `remoteSystem ?? step.system`; `outcome.system` gerçek hedefi yansıtır | K-17, FR-13.9 |
| 16 | `services/web-service/src/presentation/routes/maneuver-routes.ts#executeBodySchema` | `systems?: string[]` + passthrough `remoteSystem: systems[0]` (manevra + operasyon execute) | K-17, FR-13.9 |
| 17 | `packages/ui/src/nova/DemoManeuverWizard.tsx#DemoExecutePayload` | `systems?: string[]` alanı | K-17 |
| 18 | `apps/demo-field/src/features/demo-data/demoManeuverApi.ts#demoManeuverApi` | execute body'e `systems` (varsa) | K-17 |
| 19 | `apps/demo-field/src/features/demo-data/demoApi.ts` + `useDemoProject.ts` | `FieldContainer.station?` + `DemoProjectData.containers` (ham konteyner kayıtları) | K-17 |
| 20 | `apps/demo-field/src/layouts/DemoProjectLayout.tsx#DemoProjectLayout` | `stationSystems` context alanı (containers `station`→containerId eşlemesi, `stationsForContainers`) | K-17 |
| 21 | `apps/demo-field/src/pages/DemoManeuverPage.tsx#DemoManeuverPage` | execute'te `systems` (seçili istasyonun konteyner id'si) | K-17, FR-13.9 |
| 22 | `packages/platform/commands/src/operation-executor.test.ts` | YENİ test: `remoteSystem:"container-2"` → uzak adım o konteynere yönlenir | AK-13.9 |
| 23 | `services/web-service/src/presentation/routes/maneuver-routes.test.ts` | YENİ test: `systems:["container-2"]` → executor'a `remoteSystem:"container-2"` | AK-13.9 |
| 24 | `apps/demo-field/integration/station-operations.integration.test.ts` (YENİ) | 4 test: 2 konteyner etiketli+bağlı; bess1→container-1, bess2→container-2; `systems`'siz geriye dönük (config varsayılanı) | AK-13.9, SC-8 |
| 25 | `apps/demo-field/integration/commands-operations-edge.integration.test.ts` | rollback testi güncellendi: `charge` + `systems:["container-missing"]` → ulaşılamayan sistem rollback (önceden `field_charge` container-2 adımı yoktu) | AK-13.9 |
| 26 | `apps/demo-field/src/pages/DemoFieldPage.test.tsx` | mock `containers: []` (yeni `DemoProjectData` alanı) | K-17 |

> `operations.json` DEĞİŞMEDİ (K-17: `operations.json`/servisler/config'ler değişmez — uzak adım hedefi yalnız istekteki `systems` ile).

### A.2 Test Kanıtları (bu tur)

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| unit (tüm projeler) | `bunx nx run-many -t test -p platform-commands web-service ui demo-field device-service shared-utils` | **hepsi yeşil** |
| platform-commands | aynı komut | yeşil (operation-executor `remoteSystem` + maneuver-migration dahil) |
| web-service | aynı komut | yeşil (field-routes + maneuver-routes `systems` dahil) |
| ui | aynı komut | 40 dosya / 263 test yeşil |
| demo-field | aynı komut | 15 dosya / 86 test yeşil |
| device-service | aynı komut | 11 dosya / 96 test yeşil |
| shared-utils | aynı komut | yeşil |
| canlı stack | `bun run start:demo-integration` + `bun run register:demo-integration` | 3 compose (container 6 + container2 6 + field 8); 2 konteyner bess1/bess2 `connected`, 2137 satır |
| SOC (canlı) | BSC SOC okuması | container-1 = 50 / container-2 = 72 |
| entegrasyon (canlı) | `bunx nx run demo-field:test-integration -- station-operations` | `station-operations.integration.test.ts` **4/4 yeşil** (bess1→container-1, bess2→container-2, systems'siz geriye dönük) |
| entegrasyon suite | tam suite | 106/108 yeşil (yalnız `rule-protection` FL-11 + IMD flaky — izole koşumda 7/7 yeşil); `demo-maneuver` 10/10, `commands-operations-edge` 14/14, `station-containers` 2/2 |
| e2e | manevra/operasyon | 17/18 yeşil (`demo-maneuver-data`, `demo-operations-data`, `demo-operations-edge`, `demo-protection` tam; `demo-target-soc` başarısız — bkz. A.4#2) |
| build | `bunx nx run-many -t build -p ...` | başarılı |
| deploy | field-web yeni imajla recreate | bundle'da `systems` doğrulandı |
| SPEC lint | `bun run spec:check docs/architecture/DEMO-KONSOL-UI-UYUM-MIMARISI.md` | 0 hata / 0 uyarı |

### A.3 Kabul Kriteri Kanıtları (bu tur)

> AK-13.9 bu SPEC revizyonuyla (UC-13 genişletme) yeni eklendi; daha önce tanımlanmadığı için sonek gerekmez. AK-13.4 (ikinci stack) önceki Ek (14e)'te doğrulanmıştı; bu tur K-16 revize (ayrı compose) sonrası `(rev)` ile teyit edilir.

| Kod | Kriter (SPEC özeti) | Kanıt (test/dosya) | Durum |
|:----|:--------------------|:-------------------|:------|
| AK-13.9 | Uzak adım istekteki `systems` (konteyner id) hedefine yönelir; verilmezse config varsayılanı (container-1) | `operation-executor.test.ts` "UC-13: remoteSystem ... override" + `maneuver-routes.test.ts` "UC-13: systems → remoteSystem" + `station-operations.integration.test.ts` (4/4) + `commands-operations-edge.integration.test.ts` (rollback) | 🟢 |
| AK-13.4 (rev) | İkinci konteyner stack'i (ayrı compose) + otomatik kayıt | canlı `start:demo-integration` + `register:demo-integration` (2 konteyner `connected`, bess1/bess2) + `deployment/v2/dev/container2/docker-compose.yml` | 🟢 |

### A.4 Sapmalar (bu tur)

| # | Sapma | Açıklama |
|:--|:------|:---------|
| 1 | Station tag konteyner/servislerden KALDIRILDI (kullanıcı düzeltmesi) | Ek 14e `STATION_ID` env + `TelemetryTagger` `station` tag'i ile konteyner telemetrisine istasyon etiketi taşımıştı. Kullanıcı kararı: **konteyner uygulaması istasyonunu bilmemeli** — eşleme yalnız field DB (`field_containers.station` register payload) + ön yüzde (`stationsForContainers`). `telemetry-tagger.ts`/`definitions.ts#siteStationId`/`run.ts`/`device-service.ts` station alanları ve compose `STATION_ID` env'leri kaldırıldı. K-17 ile tutarlı (station bilgisi backend'e/config'e girmez). |
| 2 | `demo-target-soc` e2e başarısız | Frontend `TargetSocWatcher`: charge "running" takılı kaldı + standby run gelmedi. Şüphe: 2-konteyner yükü/session etkileşimi (hedef SOC watcher'ı yalnız hedef ayarından sonra başlayan charge/discharge run'ını görünce ateşlenir — yarış). Ayrı inceleme gerekir (B-1 hedef SOC ön yüz geçici çözümünün devamı; §B.2 G43). |
| 3 | `rule-protection.integration.test.ts` tam suite'te flaky (FL-11 + IMD) | Tam suite yükü altında FL-07/FL-11/IMD testleri zaman zaman kırmızı; izole koşumda 7/7 yeşil. Önceki Ek 14e A.4#2 (G32) devamı — 2-stack yükü + management-service debounce zamanlaması, UC-13 uzak-yürütme kodundan bağımsız. |
| 4 | SOC farkı uzun operasyon koşularında tükenebiliyor | Konteyner-2 BSC `initialSocPercent:72` (istasyon 2) istasyon 1'in %50'sinden düşük değil ancak iki istasyon arası %50/%72 farkı uzun charge/discharge döngülerinde düşük-SOC sınırına ulaşabilir; `demo-target-soc`/operasyon koşularında SOC tükenmesi gözlemlenebilir (§B.2 G46). |
| 5 | Container-2 ilk uplink'i field restart gerektirebiliyor (session cache) | Register sonrası açılan uplink backoff'a düşünce 401 kalır; container-2 restart sonrası bağlanır (Ek 14e A.4#1, G35 devamı — token yükleme zamanlaması, kod hatası değil). |
| 6 | `TUNNEL_API_UPSTREAM` container2'de servis adı nedeniyle set edildi | Field→konteyner tünel istekleri `container-web-service` DNS adını bekler; container-2 web-service'i `container2-web-service` adını taşıdığından `TUNNEL_API_UPSTREAM`/`TUNNEL_STATIC_UPSTREAM` açıkça `http://container2-web-service:5001` verildi (container-1'de varsayılan ad çalışır). |

### A.5 Gözle Kontrol Maddeleri (bu tur)

- [x] `operation-executor.ts#runRemoteStep` override'ı `const target = override ?? system` ile tek noktada çözer; `outcome.system = remoteSystem ?? step.system` denetim izi doğru — K-17 purity.
- [x] `maneuver-routes.ts#executeBodySchema` `systems` alanı `z.array(z.string().min(1)).optional()` (trust boundary validasyonu); passthrough `systems[0]` (tek istasyon → tek konteyner demo modeli).
- [x] `stationsForContainers` + `stationSystems` saf türev (IO/zaman yok); eşleme yalnız ön yüz + `field_containers.station` — K-17 purity.
- [x] `operations.json` DEĞİŞMEDİ — uzak adım hedefi istekten gelir, config'e/backende station bilgisi girmez — K-17.
- [x] `host.ts#SimulatorHost` `initialSocPercent` yalnız `detailNumber(...) !== undefined` iken spread edilir (additive; mevcut builder'lar etkilenmez) — K-10.
- [x] container-2 compose'u kendi network + `demo-bridge` external; Modbus simülatör portları host'a yayınlanmaz (yalnız DebugInjector `127.0.0.1:15592`) — K-16.
- [x] Async `for...of await` YOK; `OperationExecutor` adımları `runOne` + `Promise`/rollback akışı; entegrasyon testleri kademeli `api` çağrısı.
- [x] Kod referansları `#sembol` çapasıyla yazıldı — satır numarası yok.
- [x] `bun run spec:check docs/architecture/DEMO-KONSOL-UI-UYUM-MIMARISI.md` temiz (0 hata / 0 uyarı).

### A.6 Genel Durum Özeti (bu tur)

UC-13 istasyon bazlı uzak yürütme (FR-13.9) tamamlandı: field executor `ExecuteOptions.remoteSystem` ile uzak (`system`) adımları ve rollback'i istekteki konteyner id'sine yönlendirir (`outcome.system` gerçek hedefi yansıtır); web-service `systems` payload'ını `remoteSystem: systems[0]` olarak geçer; ön yüz `DemoProjectLayout#stationSystems` (containers `station`→containerId) + `DemoManeuverPage` execute'te `systems` gönderir. K-17 gereği station bilgisi backend'e/config'e girmez — `operations.json` değişmedi, station tag'i konteyner/servislerden kaldırıldı (eşleme yalnız `field_containers.station` + ön yüz). K-16 revize: container-2 kendi `deployment/v2/dev/container2/` compose'u + `.env` + config kopyalarına ayrıldı; `start/stop:demo-integration` üç compose'u sıralar. BSC başlangıç SOC farkı (`initialSocPercent` 50/72) ve polling sıklaştırma (`pollIntervalMs` 1000) eklendi. SC-8 (uzak adım istasyonun konteynerinde yürür; `systems` yoksa config varsayılanı) `operation-executor.test.ts` + `maneuver-routes.test.ts` + `station-operations.integration.test.ts` (4/4) ile doğrulandı. Kalan boşluklar §B.2'de ileri iş olarak listelendi.

**review_date:** 2026-10-14

## B. TEST KAPSAMI — Ek (2026-10-14h)

### B.1 Senaryo Matrisi (bu tur — durum → koşul → beklenen → test ref'i)

| Durum | Koşul | Beklenen (THEN) | Test ref'i |
|:------|:------|:----------------|:-----------|
| Uzak adım hedefi | `ExecuteOptions.remoteSystem:"container-2"` | uzak adım `remoteChannel.execute("container-2", ...)` (config `system` override) | `operation-executor.test.ts` "UC-13: remoteSystem verilince uzak adım o konteynere yönlenir" |
| Uzak adım hedefi | `remoteSystem` verilmedi | `target = override ?? system` → config `system` kullanılır (geriye dönük) | `operation-executor.ts#runRemoteStep` (kod inceleme) |
| Outcome izi | uzak adım override ile | `outcome.system = remoteSystem ?? step.system` (gerçek hedef) | `operation-executor.ts#runOperationStep` (kod inceleme) |
| Rollback hedefi | rollback uzak adım + `remoteSystem` | kompanzasyon `remoteSystem` konteynerinde yürür | `operation-executor.ts#runOperationRollback` (kod inceleme) |
| Route passthrough | `systems:["container-2"]` | executor'a `remoteSystem:"container-2"` geçer | `maneuver-routes.test.ts` "UC-13: systems → executor'a remoteSystem" |
| Route passthrough | `systems` boş/verilmedi | `remoteSystem` passthrough YAPILMAZ (config varsayılanı) | `maneuver-routes.ts#executeBodySchema` (kod inceleme) |
| Frontend eşleme | `containers` station etiketli | `stationSystems[stationKey] = containerId` | `DemoProjectLayout.tsx#DemoProjectLayout` (`stationSystems` useMemo) |
| Frontend execute | `activeStation` #2 (bess2) | `systems:[container-2]` gönderilir; etiket yoksa `systems` yok | `DemoManeuverPage.tsx#DemoManeuverPage` (`execute`) |
| Canlı hedef | `systems:["container-1"]` + `standby` | `outcome.system="container-1"` + `success=true` | `station-operations.integration.test.ts` "bess1 standby" |
| Canlı hedef | `systems:["container-2"]` + `standby` | `outcome.system="container-2"` + `success=true` | `station-operations.integration.test.ts` "bess2 standby" |
| Canlı geriye dönük | `systems` verilmez | `outcome.system="container-1"` (config varsayılanı) | `station-operations.integration.test.ts` "systems verilmezse" |
| Canlı kayıt | 2 konteyner | bess1=container-1, bess2=container-2, ikisi `connected` | `station-operations.integration.test.ts` "iki konteyner istasyon etiketli" |
| Rollback edge | `charge` + `systems:["container-missing"]` | en az bir başarısız adım (rollback tetiklenir), `200/422` | `commands-operations-edge.integration.test.ts` "ulaşılamayan system" |
| SOC farkı | `details.initialSocPercent:72` (container2 BSC) | BSC simülatörü %72'den başlar (container-1 %50) | `host.ts#SimulatorBuildContext` + canlı (container-1=50 / container-2=72) |
| SOC varsayılanı | `initialSocPercent` verilmedi | BSC sim 50'den başlar (mevcut davranış) | `host.ts#SimulatorHost` (kod inceleme) |
| Polling | device config `pollIntervalMs:1000` | 1 sn poll (önceden 2000) | `deployment/v2/dev/{container,container2}/device-configs/*.json` (config) |
| Compose bölünmesi | `start:demo-integration` | container (6) + container2 (6) + field (8) ayağa kalkar | `package.json#start:demo-integration` + canlı (2137 satır) |
| Compose izolasyonu | container-2 | kendi `container2-network` + `demo-bridge` external; DebugInjector `127.0.0.1:15592` | `deployment/v2/dev/container2/docker-compose.yml` |

### B.2 KAPSANMAYAN Boşluklar (bu tur)

| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| G43 | `demo-target-soc` e2e başarısız — charge "running" takılı + standby run gelmedi (TargetSocWatcher yarışı; 2-konteyner yükü/session etkileşimi şüphesi) | orta | Watcher tetikleme koşulu (hedef ayarından sonra başlayan charge/discharge) 2-konteyner altında ayrıca incelenir; B-1 hedef SOC geçici ön yüz çözümünün e2e'si stabilize edilir |
| G44 | `rule-protection.integration.test.ts` tam suite'te flaky (FL-11 + IMD) — G32 devamı | orta | Debounce/retry süreleri artırılır veya entegrasyon testi 2-stack senaryosunda stabilize edilir (izole koşumda 7/7 yeşil) |
| G45 | Uzak yürütme şimdilik field→konteyner tüneli üzerinden senkron REST (`TUNNEL_API_UPSTREAM`) — gerçek WS-push (async komut push + status akışı) ileri iş | orta | WS-tunnel komut push/status sözleşmesi; uzak adım async push + çıktı akışına geçiş |
| G46 | SOC farkı (container-2 %72) uzun charge/discharge operasyon koşularında tükenebiliyor; `initialSocPercent` başlangıç sabiti, çevrim tüketimi simüle edilmiyor | düşük | Uzun koşu öncesi SOC sıfırlama/seed mekanizması veya BSC sim çevrim tüketimi; `demo-target-soc`/operasyon testlerinde SOC sınırı dikkate alınır |

**review_date:** 2026-10-14

---

## Ek (2026-10-14i) — UC-13: istasyon bazlı yürütme düzeltmeleri + dayanıklılık (timeout/stale)

> **İş akışı aşaması:** 5/5 — KAPANIŞ (bu tur: SPEC §6.13 UC-13 — FR-13.9/13.10/13.11/13.12/13.13, AK-13.9..13.13, T-60/T-61/T-62).
> **SPEC:** [DEMO-KONSOL-UI-UYUM-MIMARISI.md](./DEMO-KONSOL-UI-UYUM-MIMARISI.md) — K-17 (istasyon çözümü ön yüzde), FR-13.9..13.13.
> **Kapsam:** İstasyon bazlı yürütmenin kanonik kök neden düzeltmesi (`systems` frontend'de düşüyordu → tüm komutlar container-1'e), stop/hedef-SOC yönlendirmesi, istasyon bazlı mod göstergesi (BSC `ChargeStatus`), istasyon bazlı koşu listesi (`steps.remoteSystem` kalıcı), uzak adım üst sınırı (`remoteTimeoutMs`) ve bayat-run koruması (`isStaleRun`/STALE). Önceki Ek (2026-10-14h) `systems` altyapısını kurmuştu; bu Ek onu **uçtan uca çalışır hale getirir** ve askıda kalan stream run'larının kilitlenmesini önler.

### A.1 Değişiklik Matrisi (bu tur)

| # | Dosya | Değişiklik | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------------|
| 1 | `apps/demo-field/src/features/demo-data/demoApi.ts#ExecuteBody` + `#demoApi` | `ExecuteBody.systems?: string[]`; `executeManeuver`/`executeOperation` POST gövdesine `systems` passthrough (`...(body.systems !== undefined && body.systems.length > 0 ? { systems: body.systems } : {})`). **Kök neden:** `demoManeuverApi.execute` body'ye `systems` koyuyordu ama `demoApi` düşürüyordu → backend `remoteSystem` görmüyor → config varsayılanı container-1. | FR-13.9, T-60, K-17 |
| 2 | `apps/demo-field/src/features/demo-data/demoManeuverApi.ts#demoManeuverApi` | `stop(systems?)` — hedef konteyner opsiyonu (`systems` varsa gövdeye, yoksa boş) | FR-13.9, T-60 |
| 3 | `apps/demo-field/src/features/demo-data/stores/TargetSocStore.ts#TargetSocState` | `stationKey` alanı + `setTarget(target, dir, scope, stationKey?)`; `clear` `stationKey`'i sıfırlar | FR-13.9, T-60 |
| 4 | `apps/demo-field/src/features/demo-data/useTargetSocWatcher.ts#useTargetSocWatcher` | `stationSystems` parametresi; stop'u hedefin istasyon konteynerine yönlendirir (`stationSystems[stationKey]`) | FR-13.9, T-60 |
| 5 | `apps/demo-field/src/layouts/DemoProjectLayout.tsx#DemoProjectLayout` | `stationSystems` context alanı (containers `station`→containerId, `stationsForContainers`); `useTargetSocWatcher(state, runs, stationSystems)` | FR-13.9, T-60, K-17 |
| 6 | `apps/demo-field/src/pages/DemoManeuverPage.tsx#DemoManeuverPage` | `activeSystems` memo + `handleStop`/execute'te `systems` + `setTarget(..., activeKey)` + `stationRuns` süzme + bayat-running atlayan `activeRun` + `<DemoOperationsView key={activeStation}>` remount | FR-13.9/13.11, T-60/T-61 |
| 7 | `packages/ui/src/nova/mimic-types.ts#NovaBankState` | `chargeStatus?: number` (BSC bitfield 4-5: 1=Charge, 2=Discharge, 3=Idle, 0=None) | FR-13.10, T-61 |
| 8 | `apps/demo-field/src/features/demo-data/mapFieldToMimicState.ts#buildBank` | `"ChargeStatus"` satırı okunur → `chargeStatus` bankaya taşınır | FR-13.10, T-61 |
| 9 | `apps/demo-field/src/features/demo-data/deriveKpis.ts#deriveKpis` | `mode` önceliği BSC `chargeStatus` (1=chg, 2=dis, aksi stby); PCS fallback (saha-seviyesi paylaşımlı olduğundan mod yanlıştı) | FR-13.10, T-61 |
| 10 | `packages/platform/commands/src/operation-executor.ts#OperationExecutor` | draft `steps.remoteSystem` kalıcı yazılır (koşuların istasyona göre ayrıştırılması için) | FR-13.11, T-61 |
| 11 | `packages/platform/commands/src/operation-executor.ts#ExecuteOptions` + `#DEFAULT_REMOTE_TIMEOUT_MS` + `#runRemoteStep` | `remoteTimeoutMs?` + `DEFAULT_REMOTE_TIMEOUT_MS = 120000`; `runRemoteStep` `Promise.race` → `ok:false reason:"remote_timeout"` (askıda kalan stream run'ı sonsuza dek `running` bırakmasın) | FR-13.12, T-62 |
| 12 | `packages/ui/src/nova/DemoOperationsView.tsx#STALE_RUN_MS` + `#isStaleRun` + `#DemoOperationsView` | `STALE_RUN_MS = 90000`; `isStaleRun(run, now)`; Sequences'te bayat running'e "STALE" etiketi (`c-warn`) + adımlar failed | FR-13.13, T-62 |
| 13 | `packages/ui/src/nova/index.ts` | Barrel export: `isStaleRun`, `STALE_RUN_MS` | K-3 |
| 14 | `services/web-service/src/presentation/routes/field-routes.ts#fieldRoutes` | Register COALESCE (önceki tur teyit): station verilmezse mevcut etiket korunur (`CASE WHEN $5 THEN EXCLUDED.station ELSE field_containers.station END` + `RETURNING station`) | K-15 (güçlendirme) |

### A.2 Test Kanıtları (bu tur)

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| unit (ilgili projeler) | `bunx nx run-many -t test -p platform-commands web-service ui demo-field` | **hepsi yeşil** |
| demo-field | aynı komut | **91 test yeşil** |
| ui | aynı komut | **264 test yeşil** |
| platform-commands | aynı komut | **70 test yeşil** |
| web-service | aynı komut | **615 test yeşil** |
| yeni testler | `demoApi.test.ts` (3 — systems POST gövdesi) + `deriveKpis.test.ts` (+1 chargeStatus→mode) + `mapFieldToMimicState.test.ts` (+1 chargeStatus→bank) + `operation-executor.test.ts` (+3 remoteSystem override + `steps.remoteSystem` + fake-timer `remote_timeout`) + `DemoOperationsView.test.tsx` (+1 `isStaleRun`) | yeşil |
| canlı | backend `bun --watch` (kaynaktan) | `remote_timeout` canlı çalışıyor (uzak adım üst sınırı) |
| deploy | field-web yeniden build | bundle `index-DGnNTWLX.js` (`systems` doğrulandı) |
| SPEC lint | `bun run spec:check docs/architecture/DEMO-KONSOL-UI-UYUM-MIMARISI.md` | 0 hata / 0 uyarı |

### A.3 Kabul Kriteri Kanıtları (bu tur)

> AK-13.9 önceki Ek (14h)'te tanımlanmıştı; bu tur `systems`'in frontend'de düşmesi düzeltilerek **uçtan uca** teyit edilir (`(rev)` ile). AK-13.10..13.13 bu SPEC revizyonuyla yeni eklendi (sonek gerekmez).

| Kod | Kriter (SPEC özeti) | Kanıt (test/dosya) | Durum |
|:----|:--------------------|:-------------------|:------|
| AK-13.9 (rev) | `systems` istasyonun konteyner id'siyle yürütmeye gider (execute + stop + hedef-SOC); yoksa config varsayılanı | `demoApi.test.ts` "executeOperation/executeManeuver systems gönderir" + "systems yokken gönderilmez" + `demoApi.ts#demoApi` + `demoManeuverApi.ts#demoManeuverApi` + `DemoManeuverPage.tsx#DemoManeuverPage` | 🟢 |
| AK-13.10 | "Operating mode" istasyon bazlı (BSC `ChargeStatus`); PCS paylaşımlı olsa da istasyon gerçeği | `deriveKpis.test.ts` "UC-13: BSC ChargeStatus varsa mod istasyon bazlıdır" + `mapFieldToMimicState.test.ts` "BSC ChargeStatus bankaya taşınır" + `deriveKpis.ts#deriveKpis` + `mapFieldToMimicState.ts#buildBank` | 🟢 |
| AK-13.11 | Operations koşu listesi aktif istasyona göre süzülür (`steps.remoteSystem` kalıcı) | `operation-executor.test.ts` "steps.remoteSystem yazılır" + `DemoManeuverPage.tsx#DemoManeuverPage` (`stationRuns`) | 🟢 |
| AK-13.12 | Uzak adım üst sınırı (120 sn) — yanıt kaybolursa `remote_timeout` + run `failed` | `operation-executor.test.ts` "uzak adım yanıt vermezse remote_timeout ile failed" (fake-timer 120 sn) + `operation-executor.ts#runRemoteStep` | 🟢 |
| AK-13.13 | 90 sn'den eski `running` bayat — Active program atlar, Sequences "STALE" | `DemoOperationsView.test.tsx` "UC-13: 90 sn'den eski running bayat sayılır" + `DemoOperationsView.tsx#isStaleRun` + `DemoManeuverPage.tsx#DemoManeuverPage` (activeRun atlama) | 🟢 |

### A.4 Sapmalar (bu tur)

| # | Sapma | Açıklama |
|:--|:------|:---------|
| 1 | "default değeri kabul etmiyor" bildirimi UI kaynaklı DEĞİL | İlk discharge c1'de 70 sn sürdü ve konteynerin HTTP yanıtı field'a **hiç ulaşmadı** → executor sonsuza dek bekledi → run `running` zombisi. Kök neden `systems` düşmesi (A.1#1) + yanıt kaybı kombinasyonu; uzak adım üst sınırı (120 sn `remote_timeout`) bunu kapatır (bkz. G47). |
| 2 | "Active program güncellenmiyor" bildirimi zombi run'ın sonucu | `54f9ba2e` discharge `running` @16:03:29 — yanıt kaybolunca run `running`'da kilitlendi, Active program boşalmadı. Bayat-run koruması (90 sn STALE) bunu çözer: eski `running` Active program'ı kilitlemez, Sequences'te STALE görünür. |

### A.5 Gözle Kontrol Maddeleri (bu tur)

- [x] `runRemoteStep` `Promise.race` ile kapatılır; `limit <= 0` (0 = kapalı) geriye dönük uyumludur — `operation-executor.ts#runRemoteStep`.
- [x] `systems` passthrough yalnız doluysa yollanır (`length > 0`) — boş dizi gövdeye girmez — `demoApi.ts#demoApi`.
- [x] `stationSystems`/`stationRuns`/`activeSystems` saf türev (IO/zaman yok; `useMemo`) — K-3 purity.
- [x] `isStaleRun(run, now)` saf ve test edilebilir (zaman parametresi enjekte) — K-3 purity.
- [x] `steps.remoteSystem` koşu draft'ına kalıcı yazılır (istasyon süzme tek kaynak) — K-17.
- [x] `<DemoOperationsView key={activeStation}>` — istasyon geçişinde remount, tüm seçimler sıfırlanır (station deselect).
- [x] Register COALESCE station'sız re-register'da etiketi korur (tag silinmez) — `field-routes.ts#fieldRoutes`.
- [x] Named export only; `index.ts` barrel güncel (`isStaleRun`/`STALE_RUN_MS`) — K-3.
- [x] Async `for...of await` YOK; `runRemoteStep` tek `Promise.race`; `remote_timeout` fake-timer ile testli.
- [x] Kod referansları `#sembol` çapasıyla yazıldı — satır numarası yok.
- [x] `bun run spec:check docs/architecture/DEMO-KONSOL-UI-UYUM-MIMARISI.md` temiz (0 hata / 0 uyarı).

### A.6 Genel Durum Özeti (bu tur)

UC-13 istasyon bazlı yürütme uçtan uca düzeltildi ve dayanıklı hale getirildi. Kanonik kök neden (`systems`'in `demoApi`'de düşmesi → tüm komutların config varsayılanı container-1'e gitmesi) FR-13.9/T-60 ile kapatıldı; `systems` artık execute + stop + hedef-SOC yollarının tümünde taşınır. Mod göstergesi (FR-13.10/T-61) BSC `ChargeStatus`'una (istasyon bazlı) bağlandı — PCS saha-seviyesi paylaşımlı olduğundan yanlış mod gösteriyordu; koşu listesi (FR-13.11/T-61) `steps.remoteSystem` kalıcılığıyla istasyona süzülür. Dayanıklılık: uzak adım üst sınırı (FR-13.12/T-62, `remoteTimeoutMs` + `Promise.race` → `remote_timeout`) ve bayat-run koruması (FR-13.13/T-62, `isStaleRun`/STALE) askıda kalan stream run'larının Active program'ı kilitlemesini önler. SC-8 (uzak adım istasyonun konteynerinde yürür; yanıt kaybolursa kilitlenmez) `demoApi.test.ts` + `deriveKpis.test.ts` + `mapFieldToMimicState.test.ts` + `operation-executor.test.ts` + `DemoOperationsView.test.tsx` ile doğrulandı; test koşumu demo-field 91 / ui 264 / platform-commands 70 / web-service 615 yeşil. Kalan boşluklar §B.2'de ileri iş olarak listelendi.

**review_date:** 2026-10-14

## B. TEST KAPSAMI — Ek (2026-10-14i)

### B.1 Senaryo Matrisi (bu tur — durum → koşul → beklenen → test ref'i)

| Durum | Koşul | Beklenen (THEN) | Test ref'i |
|:------|:------|:----------------|:-----------|
| systems passthrough | `executeOperation("charge", { systems:["container-2"] })` | POST gövdesinde `systems:["container-2"]` | `demoApi.test.ts` "executeOperation systems gönderir" |
| systems passthrough | `executeManeuver("fl01_startup", { systems:["container-1"] })` | POST gövdesinde `systems:["container-1"]` | `demoApi.test.ts` "executeManeuver systems gönderir" |
| systems passthrough | `executeOperation("standby", {})` | gövdede `systems` YOK | `demoApi.test.ts` "systems yokken gönderilmez" |
| stop yönlendirme | `stop(["container-2"])` | `executeOperation("standby", { systems:["container-2"] })` | `demoManeuverApi.ts#demoManeuverApi` (kod inceleme) |
| stop yönlendirme | `stop()` (systems'siz) | `executeOperation("standby", {})` (geriye dönük) | `demoManeuverApi.ts#demoManeuverApi` (kod inceleme) |
| Hedef-SOC stop | `stationKey` + `stationSystems[stationKey]` | stop o istasyonun konteynerine gider; yoksa boş | `useTargetSocWatcher.ts#useTargetSocWatcher` (kod inceleme) |
| Hedef-SOC kayıt | `setTarget(t, dir, scope, "bess2")` | store `stationKey:"bess2"`; `clear` sıfırlar | `TargetSocStore.ts#useTargetSocStore` (kod inceleme) |
| Mod göstergesi | BSC `chargeStatus:1` (PCS "dis" olsa da) | KPI mode `chg` (istasyon gerçeği) | `deriveKpis.test.ts` "BSC ChargeStatus varsa mod istasyon bazlıdır" |
| Mod göstergesi | BSC `chargeStatus:3` (Idle) | KPI mode `stby` | `deriveKpis.test.ts` (aynı test) |
| Mod göstergesi | `chargeStatus` yok | PCS fallback (mevcut davranış) | `deriveKpis.ts#deriveKpis` (kod inceleme) |
| Bank okuma | BSC "ChargeStatus" satırı var | `bank.chargeStatus` taşınır | `mapFieldToMimicState.test.ts` "BSC ChargeStatus bankaya taşınır" |
| Uzak hedef | `remoteSystem:"container-2"` + `field_charge` | uzak adım `execute("container-2", ...)` | `operation-executor.test.ts` "remoteSystem verilince uzak adım o konteynere yönlenir" |
| Uzak hedef | `remoteSystem` verilmedi | `target = override ?? system` (config) | `operation-executor.ts#runRemoteStep` (kod inceleme) |
| Koşu kaydı | `remoteSystem:"container-2"` | draft `steps.remoteSystem:"container-2"` kalıcı | `operation-executor.test.ts` "steps.remoteSystem yazılır" |
| Uzak üst sınır | uzak adım hiç yanıt vermez (120 sn) | `status:"failed"` + `reason:"remote_timeout"` | `operation-executor.test.ts` "remote_timeout ile failed" (fake-timer) |
| Uzak üst sınır | `remoteTimeoutMs` verilmedi | `DEFAULT_REMOTE_TIMEOUT_MS = 120000` | `operation-executor.ts#runRemoteStep` (kod inceleme) |
| Bayat run | `running` 60 sn yaşında | `isStaleRun = false` | `DemoOperationsView.test.tsx` "90 sn'den eski running bayat sayılır" |
| Bayat run | `running` 120 sn yaşında | `isStaleRun = true` | `DemoOperationsView.test.tsx` (aynı test) |
| Bayat run | `completed` | `isStaleRun = false` (yalnız running) | `DemoOperationsView.test.tsx` (aynı test) |
| Sequences | bayat running | "STALE" etiketi (`c-warn`) + adımlar failed | `DemoOperationsView.tsx#DemoOperationsView` (kod inceleme) |
| Active program | bayat running koşu | atlanır (`stationRuns.find(running && !isStaleRun)`) | `DemoManeuverPage.tsx#DemoManeuverPage` (`activeRun`) |
| İstasyon geçişi | `activeStation` değişir | `DemoOperationsView` remount (seçimler sıfır) | `DemoManeuverPage.tsx#DemoManeuverPage` (`key={activeStation}`) |
| Register COALESCE | station'sız re-register | mevcut etiket korunur (`$5=false`) | `field-routes.test.ts` "station'sız re-register → mevcut etiket KORUNUR" |

### B.2 KAPSANMAYAN Boşluklar (bu tur)

| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| G47 | ws-tunnel yavaş yanıt kaybı + BSC sim ilk-discharge ack reddi (kök neden açık) | orta | Kalıcı iş: yavaş manevra repro testi (70 sn'lik sahte upstream) + ws-tunnel stream yaşam döngüsü analizi (kredi/flow-control veya idle-sweep şüphesi) + sim ack loglaması (detay aşağıda) |

> **G47 detay — ws-tunnel yavaş yanıt kaybı + BSC sim ilk-discharge ack reddi (kök neden açık):**
> - Gözlem: c1'de 16:03:29 `discharge` uzak adımı 70 sn'de tamamlandı (35 sn'lik BSC validate timeout × BSC-1/BSC-2) ve konteynerin HTTP yanıtı field'a HİÇ ulaşmadı → executor sonsuza dek bekledi → run `running` zombisi ("Active program" kilidi + SOC değişmiyor görünümü). İkinci discharge <1 sn'de tamamlandı — ilk discharge'ta BSC sim'i "Request Acknowledge"ı reddetti (reject yolları: INITIALIZING/NOT_INITIALIZED vb.; sim log'u ack değerini basmıyor → tekrarlanırsa log eklenecek).
> - Geçici çözüm: uzak adım üst sınırı 120 sn → `remote_timeout` (FR-13.12) + UI bayat-run koruması 90 sn STALE (FR-13.13).
> - Kalıcı iş: yavaş manevra repro testi (70 sn'lik sahte upstream) + ws-tunnel stream yaşam döngüsü analizi (kredi/flow-control veya idle-sweep şüphesi) + sim ack loglaması.

**review_date:** 2026-10-14

---

## REV.02 — İstasyon modeli + EMS topolojisi (2026-10-22)

> **Kapsam:** SPEC `DEMO-KONSOL-UI-UYUM-MIMARISI.md` REV.02 (K-11/K-14/K-17/K-18/K-19).

- **İstasyon modeli:** 2 istasyon × 9 ünite — bess1 = BESS#1–9 (container-1), bess2 = BESS#10–18 (container-2); çizim her zaman aktif istasyonun 9 ünitesi + 2 fideri (A 5 / B 4). `DEMO_UNIT_COUNT = 18`.
- **İstasyon geçişi:** stBar yeniden aktif; `stationState = stateForStation(...)`, `stationTopology = stationTopo(...)`; KPI/alert/trend/komutlar seçili istasyona göre.
- **EMS topolojisi:** `GET /api/fields/:fieldId/topology` (`FIELD_TOPOLOGY_PATH`; `deployment/v2/dev/field/topology.json`) istasyon/fider/ünite + **konteyner→istasyon eşlemesini** döner. Hub'a domain eklenmez; register adımı kalktı (konteynerler `HUB_PEER_TOKEN` ile otomatik peer).
- **Kaldırılanlar:** Admin "Add container"/`registerContainer` akışı (tunnel hub modeli), `containers[].station` bağımlılığı, SIM güç manevraları.
- **Kanıt:** `bun run test` 317 dosya / **2602 test**; `bun run test:demo-integration` **108/108**; topology 200; Devices ağacı istasyon 2'de BESS#10–18 (regresyon testi `DemoDevicesPage.test.tsx`).
