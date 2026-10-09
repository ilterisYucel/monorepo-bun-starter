---
status: active
space: architecture
tags: [kapanis, dogrulama, test-kapsami, demo, konsol, ui, nova, field, fss, simulator]
review_date: 2026-10-08
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
