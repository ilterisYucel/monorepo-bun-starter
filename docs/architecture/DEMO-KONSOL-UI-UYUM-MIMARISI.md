---
status: active
space: architecture
tags: [mimari, demo, konsol, ui, nova, field, fss, simulator, spec]
review_date: 2026-10-08
---

# DEMO-KONSOL-UI-UYUM — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/5 — SPEC (AGENTS.md "Geliştirme İş Akışı").
> **Durum:** ✅ APPROVED (2026-10-08) — implementasyon developer onayıyla başladı (T-1…T-36).
> **İlişkili:** [DEMO-FIELD-KONSOL-MIMARISI.md](./DEMO-FIELD-KONSOL-MIMARISI.md), [DEMO-FIELD-MIMARISI.md](./DEMO-FIELD-MIMARISI.md), [SPEC-SABLONU.md](./SPEC-SABLONU.md), `bess-scada-diagram-reference.md`
> **Referans kaynak:** `~/Downloads/gdpms-console/gdems` (framework-free konsol demosu; `demo/app.js`, `demo/app.css`, `demo/index.html`, `demo/devices.js`, `demo/market-view.js`, `demo/bess-scada.js`, `src/charts.js`, `src/icons.js`, `src/topology.js`, `src/maneuvers.js`) — bu SPEC'in görsel/yerleşim sözleşmesi.

## 1. Amaç ve Bağlam

Dün tamamlanan DEMO-FIELD-KONSOL işi (`demo-field` SPA + `packages/ui/src/nova`) backend'e bağlı ve işlevsel; ancak referans konsolun (`gdpms-console/gdems`) görünümünden belirgin biçimde ayrışıyor: trend grafikleri sayfa altında, proje veri şeridi yok, trend/gölge/hover stili farklı, Devices sayfası referanstaki düzeyde değil, Operations/Grid & Market/Faults/Admin sayfa düzenleri farklı, renk paleti ve fontlar farklı, dark tema yok.

**Hedef:** demo-field frontend'ini referans konsolla **birebir** görsel/yerleşimsel uyuma getirmek; veri katmanını referansın gösterdiği tüm cihazları (HVAC/PCS/BSC/MV/AUX enerji analizörü/FSS/DC/IMD) tüketecek şekilde genişletmek; FSS için yeni bir simülatör eklemek. Backend sözleşmeleri eklemeli kalır.

| Katman | Kapsam |
|:-------|:-------|
| **Dahil** | `apps/demo-field` (shell, 6 sekme, tüm sayfalar, i18n→İngilizce, tema), `packages/ui/src/nova` (yeni/güncellenen bileşenler + CSS + token setleri), `packages/simulators/src/fss` (yeni), demo-edge container device config'leri, telemetri mapper + `mimic-types` |
| **Hariç** | Backend servisleri (yalnız gap'ler B-1..B-3 olarak kayıtlı; UI hazır), `packages/ui` diğer alanları, mevcut dark `tokens.ts` (diğer app'ler), `deployment/v1/aws`, `deployment/v1/dev/{container,field}` çekirdek katalogları |

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, tarihli)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K-1 | UI tamamen İngilizce (referans REQUIREMENTS #21) | Sekmeler/etiketler referans birebir: Site layout · Devices · Operations · Grid & Market · Faults · Admin; demo-field sayfaları sabit İngilizce string kullanır (i18n çağrısı bırakılmaz). |
| K-2 | Light **ve** dark tema referans paletinden birebir | Yeni `COLORS_LIGHT` (düzeltilmiş) + `COLORS_DARK`; `--nm-*` değişkenleri tema ile yazılır; header'da sun/moon toggle; `data-theme` + localStorage + `prefers-color-scheme` fallback. Mevcut `packages/ui/src/colors/tokens.ts` (diğer app'ler) DOKUNULMAZ. |
| K-3 | Component-based tasarım, tümü `nova` altında | Her bileşen ayrı dosya + named export + `Demo` prefix; saf hesaplar ayrı `*.ts` (test edilebilir); stiller `nova-console.css` + `nova-mimic.css`, `--nm-*` değişkenleriyle. |
| K-4 | Proje ekranlarında ortak üst blok tüm sekmelerde görünür | Sıra: proje veri şeridi → KPI → Ready/Rest kartı → Trendler → aktif görünüm → tam genişlik Event log. Tek `DemoProjectLayout` + tek veri katmanı (React context). |
| K-5 | Sekme/rota adları İngilizce | Rotalar: `/field/:id` (site), `/devices`, `/operations`, `/market`, `/faults`, `/admin`; `/manevra` eski yol redirect. |
| K-6 | Dummy listesi onaylandı (aşağıda §10 A-1 ve KAPANIŞ'a işlenir) | Zorunlu olarak dummy/türetim olan yüzeyler §7 ve §10'da listelenir; geri kalan her şey canlı backend/simülatör verisidir. |
| K-7 | Yeni `fss` simülatörü (Sigma XT panel) | `packages/simulators/src/fss` — state machine + Modbus TCP + register map + host builder + `fss-1.json` config; telemetri tünelle field'a akar. |
| K-8 | Veri katmanı genişletilir (tek konteyner → 9 ünite fan-out korunur) | `mapFieldToMimicState` container `latestTelemetry`'den HVAC-1..8, PM5340-1, CONTROL-PANEL-IO-1, CB-1/2, DC-METER-1, IMD-1 okur; `NovaUnitState` yeni alanlar (`hvac`, `aux`, `fss`, `dc`, `imd`); ambient = HVAC-1 `Outside Temp`. |
| K-9 | Backend gap'leri UI hazır bırakılır (dummy değil) | B-1 kalibrasyon `scheduleAt`, B-2 ham Modbus trace, B-3 fault injection — UI/akış tam; backend uçları geldiğinde canlıya döner. |
| K-10 | Open-Closed: yalnız ekleme | `demo-field` ve `nova` dışındaki tüketiciler etkilenmez; backend sözleşmeleri (manevra/operasyon/alarm/log/external) değişmez; simülatör mevcut sürücü sözleşmelerini (register-map + adapter) uygular. |
| K-11 | Plant overview kartı referans `plant-view.js#collectorSvg` portu (eklemeli) | 2 BESS MV istasyonu (manuel config: **#1 = BESS#1–5, #2 = BESS#6–9**) + **2 PV MV istasyonu (illüstratif/statik solar üretim; backend inverter verisi yok, tooltip M7 "simulated")** → **collector** tek hat + istasyon kartları; collector tipi gdems kuralıyla (`COLLECTOR_LIMIT_MW=50`): kurulu 31.05 + ~50.4 ≈ 81.4 MW > 50 → **"METAL CLAD · 34.5 kV"**; **Peak shaving disabled** (gerçek controller yok); istasyon kartına **tıklama** site layout'u o istasyona geçirir (`stationTopo`); plant güç trendi downsampled seriden; **günlük enerji** downsampled POI güç entegrasyonu (yaklaşık). |
| K-14 | İstasyon barı (stBar) + istasyon-bazlı KPI (referans `app.js#renderStBar`/`#kpis`) | `activeStation` context'te (plant kartı + stBar + site layout tek kaynak); stBar `DemoProjectStrip` ile `DemoKpiStrip` arasında; KPI'lar (`stationKpis = deriveKpis(stationState, stationTopology)`) seçili istasyona göre (Availability/Avg SOC/SOH/Cell temp/Faults istasyon bazlı); güç tile etiketi "Station power · H03". pinfo site-geneli kalır. |
| K-15 | Konteyner→istasyon etiketi (UC-13) | `field_containers.station` kolonu (inline `ALTER`); register payload opsiyonel `station` (trim ≤64); `GET /:fieldId/containers` `station` döner; konteyner telemetrisi `STATION_ID` env ile `station` tag'i taşır; frontend istasyonları bu etiketten türetir (fallback: mevcut `DEMO_STATIONS`). |
| K-16 | Her konteyner için AYRI docker-compose | `deployment/v2/dev/container/` (container-1) + `deployment/v2/dev/container2/` (container-2; kendi compose + `.env` + config kopyaları; kendi network'ü + `demo-bridge` external). `start/stop:demo-integration` üç compose'u sıralar; register aracı iki konteyneri otomatik kaydeder (bess1/bess2). Yalnızca dev. |
| K-17 | İstasyon bazlı uzak yürütme — station bilgisi backend'e/config'e GİRMEZ | Ön yüz seçili istasyonun **konteyner id'sini** execute isteğinde `systems` ile gönderir; field executor uzak (`system`) adımı O konteynerin ws-tünelinden yürütür (`ExecuteOptions.remoteSystem`). `operations.json`/servisler/config'ler değişmez; station↔konteyner eşlemesi yalnız `field_containers.station` (register) + ön yüzde. |
| K-12 | Register-source (tooltip) modu referans `regsrc.js` portu | Header'a `Source: Values · Tooltip · Inline` segmenti (localStorage persist); `RegisterValue` sarmalayıcı + **tek** global hover kartı; kaynak türleri `reg`/`calc`/`nomap`/`model` renk lejantı; veri mevcut `demo-registers.ts` kataloğundan; **backend sözleşmesi değişmez** (salt görünüm). |
| K-13 | Bu tur kapsamı: yalnız Site layout sayfası + paylaşılan üst blok | Tooltip kablolaması: Site layout (mimic, unit detail, attention, plant overview) + pinfo/KPI. Devices/Operations/Grid & Market/Faults/Admin kablolaması **2. tur** (bkz. A-6). |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B-1 | Kalibrasyon zamanlama backend'de yok | `demo-operations.json` `calibration` yalnız `powerKw` + anlık çalıştırma; `scheduleAt`/gecikmeli çalıştırma sözleşmesi yok |
| B-2 | Ham Modbus trace ucu yok | `services/web-service/src/presentation/routes/command-routes.ts#commandRoutes` komut geçmişi (`GET /:deviceId/commands`) + `GET /logs` sunar; register-seviyesi write trace yok |
| B-3 | Fault injection ucu yok | Alarm'lar yalnız telemetri eşiklerinden üretilir (`device_alarms`); enjeksiyon API'si yok |
| B-4 | `mapFieldToMimicState` yalnız BSC/PCS/MV indeksler | `apps/demo-field/src/features/demo-data/mapFieldToMimicState.ts#mapFieldToMimicState`; container `latestTelemetry` içindeki HVAC/PM5340/CONTROL-PANEL-IO/CB/DC/IMD kullanılmıyor |
| B-5 | Trend grafiği `area`/tooltip/faz gölgeleme uygulamıyor | `packages/ui/src/nova/DemoTrendChart.tsx#DemoTrendChart` — `area` kabul edilir, çizilmez; hover yok |
| B-6 | FSS simülatörü yok | `packages/simulators/src/host.ts#registerDefaults` builder listesinde `fss` yok; container device config'lerinde FSS paneli cihazı yok |
| B-7 | Fontlar referansla uyuşmuyor | `apps/demo-field/src/index.css` `system-ui`; referans `Barlow Semi Condensed` + `IBM Plex Mono` |
| B-8 | `flow-dis`/`flow-chg` token değerleri farklı | `tokensLight.ts#COLORS_LIGHT` `discharge #d0781c` / `charge #0f9a88`; referans `#c46d12` / `#0b8a7a` |

## 4. Mimari

### 4.1 Katmanlar

```
apps/demo-field (ince SPA)
  ├─ app/routes.tsx ──────────── 6 sekme (site/devices/operations/market/faults/admin)
  ├─ layouts/DemoShell.tsx ───── header (logo, crumbs, tabs, Demo data, tema, saat) + footer
  ├─ layouts/DemoProjectLayout.tsx ─ tek veri katmanı + context + ortak üst blok
  ├─ features/demo-data/* ────── mapper/türev saf fonskiyonlar (backend client'ları)
  └─ pages/* ─────────────────── ince sayfalar (nova bileşenlerini yerleştirir)

packages/ui/src/nova (paylaşımlı, framework'ten bağımsız hesap + React sarmalayıcı)
  ├─ colors/tokensLight.ts / tokensDark.ts / apply-nova-vars.ts
  ├─ nova-console.css (light+dark, --nm-*), nova-mimic.css
  ├─ DemoProjectStrip · DemoKpiStrip · DemoReadyCard · DemoTrendChart · DemoLegend
  ├─ DemoDeviceTree · DemoStationCell · DemoAuxPanel · DemoBessScada · DemoRackTable
  │  · DemoRackDetail · DemoPcsPage · DemoHvacPage · DemoFssPage · DemoRmuTrPage
  ├─ DemoManeuverList · DemoOperationForm · DemoActiveProgram · DemoSequences · DemoStationPanel
  ├─ DemoPriceChart · DemoHourTable · DemoPfkChart · DemoPqChart · DemoLvrtChart
  └─ DemoFaultList · DemoFaultDetail · DemoAdminView
  └─ pure: demo-market.ts, demo-readiness.ts, demo-admin.ts, demo-registers.ts, demo-bess-data.ts

packages/simulators/src/fss (yeni)
  ├─ fss-simulator.ts (Sigma XT state machine)
  ├─ register-map.ts + fss-modbus-adapter.ts (SimulatorServer)
  └─ host.ts#registerDefaults → "fss" builder; container-device-configs/fss-1.json
```

### 4.2 Veri akışı

Konteyner tier `RealtimeSnapshotSource` tüm online cihazların latest telemetrisini tünelden field'a iter (`{type:"telemetry", data}`); field `ContainerProxy.latestTelemetry` → `GET /fields/:id/containers` → `demoApi.containers`. Field tier canlı cihazlar (`PCS-1`, `PCS-2`, `DEMO-MV-1`) `unified/telemetry/latest` ile gelir. `mapFieldToMimicState` ikisini birleştirip tek konteyneri 9 üniteye fan-out eder (PCS gücü N'e bölünür).

## 5. Purity Kuralları (ZORUNLU)

1. `features/demo-data/**` ve `nova/**.ts` saf hesaplar IO/zaman (`Date.now`) taşımaz; `now`/telemetri parametre olarak geçer.
2. Renkler yalnız token'lardan (`COLORS_LIGHT`/`COLORS_DARK`/`COLOR_*`); demo/nova dosyalarında hex hardcode YOK (CSS `--nm-*` üzerinden).
3. Named export only; default export YOK; `Demo` prefix; her klasörde `index.ts` barrel güncel.
4. Saf hesap fonksiyonları (arbitraj, rest fazı, saat kovası, pack türetimi, KPI/türev) test edilebilir; bileşenler bu fonksiyonları tüketir.
5. Yeni simülatör mevcut `IModbusSimulatorAdapter` + `register-map` + `SimulatorHost` sözleşmelerini uygular; `host.ts` yalnız eklemeli builder kaydı.
6. Backend sözleşmeleri değişmez; yeni çağrılar yalnız ekleme.
7. Async: `for...of await` YASAK; `Promise.all`/`allSettled` (React Query tercih).

## 6. Use Case'ler

### 6.1 UC-1 — Konsol kabuğu ve tema

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: header (logo+crumbs+6 sekme+"Demo data"+tema seg+saat), footer, light+dark token'lar, fontlar, İngilizce etiketler, rota adları
- hariç: kimlik doğrulama akışı, diğer app'lerin teması, backend değişikliği

**Akış:**
1. Kullanıcı demo-field'ı açar; tema `localStorage` → yoksa `prefers-color-scheme`.
2. Header logo, breadcrumb ve aktif sekmeyi gösterir.
3. Tema seg'ine basınca `data-theme` değişir; tüm `--nm-*` değişkenleri güncellenir.
4. Sekmeye tıklayınca ilgili rota yüklenir.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | Header MUST referans düzenini taşır (logo, crumbs, 6 sekme, "Demo data", tema seg, saat) | AK-1.1 |
| FR-1.2 | Tema MUST light+dark referans paletini birebir uygular, toggle+persist eder | AK-1.2 |
| FR-1.3 | Uygulama MUST Barlow Semi Condensed + IBM Plex Mono fontlarını kullanır | AK-1.3 |
| FR-1.4 | 6 sekme MUST İngilizce etiketli ve doğru rotalara bağlıdır | AK-1.4 |

**Kabul Senaryoları (GWT):**
1. **AK-1.1 — GIVEN** kullanıcı proje ekranında **WHEN** header render edilir **THEN** logo, breadcrumb "Projects / ÜNSAL DGES", 6 sekme, "Demo data" rozeti ve saat görünür
2. **AK-1.2 — GIVEN** tema light **WHEN** toggle'a basılır **THEN** `data-theme="dark"` olur, `--nm-bg` `#0e1215` döner ve seçim localStorage'a yazılır
3. **AK-1.3 — GIVEN** sayfa yüklü **WHEN** bir KPI değeri render edilir **THEN** etiket ailesi Barlow, sayısal aile IBM Plex Mono'dur
4. **AK-1.4 — GIVEN** header **WHEN** "Operations" sekmesine basılır **THEN** `/operations` rotası yüklenir ve sekme aktif olur

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | Header tüm referans öğelerini taşır | kod inceleme+unit | ⬜ |
| AK-1.2 | Dark tema token'ları referans değerlerini döner | unit | ⬜ |
| AK-1.3 | Font aileleri uygulanır | kod inceleme | ⬜ |
| AK-1.4 | Sekme-rota eşlemesi doğrudur | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-1: `tokensDark.ts` + `apply-nova-vars.ts` + testler
- [ ] T-2: `index.css`/`index.html` fontlar + light/dark kök değişkenler
- [ ] T-3: `DemoShell` header/crumbs/tema seg/saat/footer
- [ ] T-4: `routes.tsx` 6 rota + eski `/manevra` redirect

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| localStorage erişilemez | `prefers-color-scheme` fallback, hata sessiz |
| Logo yüklenemez | "GD-PMS" metin fallback |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `packages/ui/src/colors/tokensDark.ts` | Yeni dark token seti |
| `packages/ui/src/nova/apply-nova-vars.ts` | Light+dark → `--nm-*` |
| `apps/demo-field/src/layouts/DemoShell.tsx` | Header/footer yeniden |
| `apps/demo-field/src/app/routes.tsx` | 6 rota |
| `apps/demo-field/src/index.css` | Font + tema kökü |

### 6.2 UC-2 — Proje ortak üst bloğu (veri şeridi, KPI, Ready, Trendler, Log)

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: pinfo proje veri şeridi, 7 KPI tile, tam genişlik Ready/Rest kartı, trendler (üstte, tüm sekmelerde), altta tam genişlik event log, tek veri katmanı
- hariç: site layout'un kendisi (UC-3/UC-4), alarm mantığı backend

**Akış:**
1. `DemoProjectLayout` mount olur; containers + telemetri + runs + alarmlar + log paralel çekilir.
2. Ortak üst blok (pinfo→KPI→ready→trendler) render edilir.
3. Aktif sekme outlet'te render edilir.
4. Alt event log sabit kalır.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-2.1 | Proje veri şeridi MUST referanstaki 10+ etiketi (rated power/energy, battery, PCS, MV, HVAC, available, dischargeable, AUX, ambient) gösterir | AK-2.1 |
| FR-2.2 | 7 KPI tile MUST sitenin mod/güç/SOC/SOH/sıcaklık/kullanılabilirlik/arıza değerlerini gösterir | AK-2.2 |
| FR-2.3 | Ready/Rest kartı MUST rest süresini + grup bazlı termal hazırlığı gösterir | AK-2.3 |
| FR-2.4 | Trendler MUST tüm proje sekmelerinde üstte, event log altta sabittir | AK-2.4 |

**Kabul Senaryoları (GWT):**
1. **AK-2.1 — GIVEN** konteyner+telemetri yüklü **WHEN** proje şeridi render edilir **THEN** en az 10 etiket canlı/türev değerle doludur
2. **AK-2.2 — GIVEN** geçerli durum **WHEN** KPI'lar render edilir **THEN** 7 tile doğru türev değerleri gösterir (örn. ort. SOC)
3. **AK-2.3 — GIVEN** `full_charge` 30 dk önce bitti ve raflar bantta **WHEN** ready kartı render edilir **THEN** "Rest time complete" + grup "READY" görünür
4. **AK-2.4 — GIVEN** kullanıcı Devices sekmesinde **WHEN** sayfa render edilir **THEN** üstte trendler, altta event log vardır

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-2.1 | Proje şeridi etiketleri dolu | unit | ⬜ |
| AK-2.2 | 7 KPI doğru türev | unit | ⬜ |
| AK-2.3 | Rest/hazırlık türevi doğru | unit | ⬜ |
| AK-2.4 | Ortak blok tüm rotalarda | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-5: `DemoProjectStrip`
- [ ] T-6: `DemoKpiStrip` referans tile sınıflarına hizalama
- [ ] T-7: `DemoReadyCard` (rest-big + grup rgc çipleri)
- [ ] T-8: `DemoProjectLayout` + context + log alt konum

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| containers boş | Ünite yok, KPI "—", throw yok |
| runs geçmişi boş | Ready kartı "No rest pending" |
| market/telemetri hatası | Blok kademeli bozulma ile render olur |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `apps/demo-field/src/layouts/DemoProjectLayout.tsx` | Yeni ortak layout + context |
| `packages/ui/src/nova/DemoProjectStrip.tsx` | Yeni |
| `packages/ui/src/nova/DemoReadyCard.tsx` | Yeniden yazım |
| `apps/demo-field/src/features/demo-data/useDemoProject.ts` | Ortak veri hook'u |

### 6.3 UC-3 — Trend grafik motoru

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: SVG trend bileşeni — faz gölgeleme, limitler, band/area/dash seriler, yTicks, hover crosshair+tooltip, uç noktası, resize
- hariç: harici chart kütüphanesi, gerçek zamanlı streaming

**Akış:**
1. Üst blok trend serilerini (SOC/güç/sıcaklık + rest fazları) hesaplar.
2. Bileşen ölçek/eksen ile SVG çizer.
3. Pointer hareketinde en yakın örnek seçilir, crosshair+dots+tooltip gösterilir.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-3.1 | Trend MUST rest/limit fazlarını gölgeli aralık olarak çizer | AK-3.1 |
| FR-3.2 | Trend MUST limit çizgileri (hot/cold), band ve area serilerini çizer | AK-3.2 |
| FR-3.3 | Trend MUST hover crosshair + tooltip + uç noktası gösterir | AK-3.3 |

**Kabul Senaryoları (GWT):**
1. **AK-3.1 — GIVEN** rest fazları verildi **WHEN** trend çizilir **THEN** faz aralıkları gölgeli rect + etiketle görünür
2. **AK-3.2 — GIVEN** `area:true` ve band serisi verildi **WHEN** trend çizilir **THEN** area dolgusu ve min–maks bandı çizilir
3. **AK-3.3 — GIVEN** çizili trend **WHEN** pointer üzerine gelir **THEN** crosshair + her seri için nokta + tooltip değerleri görünür

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-3.1 | Faz gölgeleme çizilir | unit | ⬜ |
| AK-3.2 | Area/band/limit çizilir | unit | ⬜ |
| AK-3.3 | Hover tooltip çalışır | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-9: `DemoTrendChart` yeniden yazım (eksen/ölçek)
- [ ] T-10: faz gölgeleme + limit + band/area
- [ ] T-11: hover crosshair + tooltip + uç noktası

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Seri boş | "No data" mesajı |
| Tek nokta | Nokta çizilir |
| Sıfır genişlik | Varsayılan 260px ile render |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `packages/ui/src/nova/DemoTrendChart.tsx` | Yeniden yazım |
| `packages/ui/src/nova/nova-console.css` | Trend stilleri (tc-*) |

### 6.4 UC-4 — Devices sayfası

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: cihaz ağacı, istasyon hücresi, AUX panel (PM5340), batarya SCADA çizimi, raf/pack detayı, PCS/HVAC/FSS/RMU&TR sayfaları, container thermal chart, mimic→devices derin bağlantı
- hariç: cihaz yapılandırma yazma (Admin), pack verisinin Modbus'tan okunması (türetim)

**Akış:**
1. Mimic'te hücre/grup/cihaz tıklanır → `/devices?tab=&unit=&bank=` derin bağlantı.
2. Ağaç seçimi gövdeyi değiştirir.
3. Batarya sekmesi SCADA çizimini + raf tablosunu render eder; raf seçilince pack detayı açılır.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-4.1 | Devices MUST referans ağaç + derin bağlantı yapısını taşır | AK-4.1 |
| FR-4.2 | İstasyon hücresi MUST CB/ES pozisyonu, CT akımı, metering gösterir; AUX MUST PM5340 ölçümlerini gösterir | AK-4.2 |
| FR-4.3 | Batarya MUST container SCADA çizimini (TR→PCS→DC CB→BUS→raf→HVAC→FSS) çizer | AK-4.3 |
| FR-4.4 | Raf/pack detayı MUST raf register tablosu + türetilmiş pack hücre/sıcaklık verisini gösterir | AK-4.4 |
| FR-4.5 | PCS/HVAC/FSS/RMU&TR sayfaları MUST canlı telemetriyi referans düzeninde gösterir | AK-4.5 |

**Kabul Senaryoları (GWT):**
1. **AK-4.1 — GIVEN** Devices açık **WHEN** ağaç render edilir **THEN** istasyon hücreleri + AUX + BESS#1..9 + alt sekmeler görünür
2. **AK-4.2 — GIVEN** H03 seçili **WHEN** panel render edilir **THEN** P/Q/PF/f + CT faz akımları görünür; AUX'ta PM5340 P/Q/V/I/enerji görünür
3. **AK-4.3 — GIVEN** BESS#n/Battery **WHEN** görünüm açılır **THEN** SVG'de TR, 2 PCS, DC kesici, 2 BUS, raflar, HVAC bölümleri, FSS çizilir
4. **AK-4.4 — GIVEN** bir raf seçili **WHEN** detay açılır **THEN** register tablosu + pack hücre voltajları/türetilmiş sıcaklıklar görünür
5. **AK-4.5 — GIVEN** HVAC sekmesi **WHEN** render edilir **THEN** 8 HVAC kartı canlı durum/sıcaklık/rpm ile görünür

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-4.1 | Ağaç + deep-link çalışır | unit | ⬜ |
| AK-4.2 | İstasyon/AUX ölçümleri doğru | unit | ⬜ |
| AK-4.3 | SCADA çizimi bölümleri | unit | ⬜ |
| AK-4.4 | Raf/pack detayı | unit | ⬜ |
| AK-4.5 | HVAC/PCS/FSS/RMU sayfaları | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-12: `DemoDeviceTree` + `DemoStationCell` + `DemoAuxPanel`
- [ ] T-13: `DemoBessScada` (bess-scada portu) + CSS
- [ ] T-14: `DemoRackTable` + `DemoRackDetail` + `demo-bess-data.ts`
- [ ] T-15: `DemoPcsPage` · `DemoHvacPage` · `DemoFssPage` · `DemoRmuTrPage`
- [ ] T-16: container thermal chart + deep-link wiring

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| HVAC/PM5340 telemetrisi yok | "—" gösterilir, throw yok |
| Seçili grup yok | İlk ünite varsayılan |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `packages/ui/src/nova/DemoDevicePages.tsx` | Sayfa bileşenleri |
| `packages/ui/src/nova/DemoBessScada.tsx` | SCADA çizimi |
| `apps/demo-field/src/pages/DemoDevicesPage.tsx` | Ağaç + gövde |

### 6.5 UC-5 — Operations sayfası (manevralar)

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: FL-01…FL-05 + FL-08/09 (pending) + FL-11 listesi, kind-bazlı formlar, canlı permissives, onay, kalibrasyon zamanlama UI, aktif program, sekanslar, MV station paneli
- hariç: backend manevra mantığı, sekans çalıştırıcı

**Akış:**
1. Kullanıcı FL listesinden manevra seçer.
2. Form kind'a göre (startup/chgdis/standby/calib/estop/maint) render edilir.
3. Permissives canlı telemetriden hesaplanır; onay sonrası execute çağrısı yapılır.
4. Aktif run ve adımları sağ sütunda gösterilir.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-5.1 | Manevra listesi MUST FL-01…FL-05/FL-08/FL-09/FL-11 kayıtlarını ikon+açıklama ile gösterir | AK-5.1 |
| FR-5.2 | Form MUST grup seçimi, yön+güç, hedef SOC ve canlı permissives + onay adımı sunar | AK-5.2 |
| FR-5.3 | Kalibrasyon MUST "Start now / At time" zamanlama UI'si ve grup durum tablosu sunar | AK-5.3 |
| FR-5.4 | Aktif program, sekans adımları ve MV station paneli MUST sağ sütunda canlı gösterilir | AK-5.4 |

**Kabul Senaryoları (GWT):**
1. **AK-5.1 — GIVEN** Operations açık **WHEN** liste render edilir **THEN** FL-01…FL-05 + FL-08/09 (pending) + FL-11 görünür
2. **AK-5.2 — GIVEN** FL-02 seçili **WHEN** form render edilir **THEN** grup çipleri, yön seg, güç alanı, hedef SOC ve permissives listesi görünür; onay çift-adım ister
3. **AK-5.3 — GIVEN** FL-04 seçili **WHEN** form render edilir **THEN** grup checkbox tablosu + "Start now/At time" seg + zaman alanı görünür
4. **AK-5.4 — GIVEN** aktif run var **WHEN** sağ sütun render edilir **THEN** program kartı, adım listesi ve MV station hücre paneli görünür

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-5.1 | FL listesi eksiksiz | unit | ⬜ |
| AK-5.2 | Form alanları + permissives | unit | ⬜ |
| AK-5.3 | Kalibrasyon zamanlama UI | unit | ⬜ |
| AK-5.4 | Aktif program/sekans/station | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-17: `DemoManeuverList` + `DemoOperationForm`
- [ ] T-18: permissives türevi (`demo-permissives.ts`) + onay akışı
- [ ] T-19: kalibrasyon zamanlama UI + `scheduleAt` çağrısı (B-1 hazır)
- [ ] T-20: `DemoActiveProgram` + `DemoSequences` + `DemoStationPanel`

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Grup seçili değil | Submit reddi + mesaj |
| İnterlock aktif | Permissive kırmızı, submit bloklu |
| Backend scheduleAt yok | "At time" denemesi hata mesajı (B-1) |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `packages/ui/src/nova/DemoOperationForm.tsx` | Formlar |
| `apps/demo-field/src/pages/DemoOperationsPage.tsx` | Sayfa |
| `apps/demo-field/src/features/demo-data/demo-permissives.ts` | Saf türev |

### 6.6 UC-6 — Grid & Market sayfası

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: EPİAŞ fiyat grafiği (PTF bar + GİP çizgi + SMF + öneri + now + cap), 6'lı kartlar, saatlik tablo, Today/Tomorrow seg, TEİAŞ PFK/P-Q/LVRT SVG'leri, frekans/komut/telemetri tabloları
- hariç: gerçek EPİAŞ API sözleşmesi (mevcut `external` ucu), backend değişikliği

**Akış:**
1. PTF/GİP/SMF serileri çekilir.
2. Saat kovaları + arbitraj önerisi (en ucuz/en pahalı saatler) hesaplanır.
3. Fiyat grafiği + tablo + TEİAŞ panelleri render edilir.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-6.1 | Fiyat grafiği MUST PTF barlarını, GİP çizgisini, SMF noktalarını, önerilen şarj/deşarj saatlerini ve now/cap çizgilerini gösterir | AK-6.1 |
| FR-6.2 | TEİAŞ MUST PFK P–f karakteristiğini canlı nokta ile, P–Q ve LVRT SVG'lerini gösterir | AK-6.2 |
| FR-6.3 | Frekans aralığı, komut ve telemetri tabloları MUST canlı değerlerle dolar | AK-6.3 |

**Kabul Senaryoları (GWT):**
1. **AK-6.1 — GIVEN** fiyat serisi dolu **WHEN** grafik çizilir **THEN** barlar + GİP çizgisi + SMF noktaları + öneri renkleri + cap çizgisi görünür
2. **AK-6.2 — GIVEN** frekans telemetrisi okunur **WHEN** PFK paneli çizilir **THEN** P–f eğrisi ve canlı çalışma noktası doğru konumda görünür
3. **AK-6.3 — GIVEN** geçerli telemetri **WHEN** TEİAŞ tabloları render edilir **THEN** aktif güç/güç/kV/frekans satırları dolu, ilgisiz satırlar "—"dir

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-6.1 | Fiyat grafiği eksiksiz | unit | ⬜ |
| AK-6.2 | PFK/P-Q/LVRT çizimi | unit | ⬜ |
| AK-6.3 | Tablolar canlı | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-21: `DemoPriceChart` + `DemoHourTable` + arbitraj türevi
- [ ] T-22: `DemoPfkChart` + `DemoPqChart` + `DemoLvrtChart`
- [ ] T-23: telemetri/komut/frekans tabloları + Today/Tomorrow seg

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Seri boş | "No data" + tablo boş |
| Tomorrow verisi yok | Seg disabled (14:00 mantığı) |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `packages/ui/src/nova/DemoMarketView.tsx` | Yeniden yazım |
| `packages/ui/src/nova/demo-market.ts` | arbitraj + saat kovası |

### 6.7 UC-7 — Faults sayfası

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: liste + aktif/çözülmüş/tümü filtresi, detay (izolasyon, temizleme adımları, notlu çözme, recovery), fault injection paneli (dummy — B-3)
- hariç: backend alarm üretimi, gerçek enjeksiyon (B-3 ucu bekler)

**Akış:**
1. Alarm listesi çekilir; filtre uygulanır.
2. Alarm seçilince detay paneli açılır.
3. Not girilir, çözme onaylanır → resolve çağrısı.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-7.1 | Fault listesi MUST aktif/çözülmüş/tümü filtresi ile alarmları gösterir | AK-7.1 |
| FR-7.2 | Detay MUST izolasyon metni, temizleme adımları ve notlu çözme akışını sunar | AK-7.2 |
| FR-7.3 | Fault injection paneli MUST referans düzeninde bulunur (backend ucu gelene dek no-op) | AK-7.3 |

**Kabul Senaryoları (GWT):**
1. **AK-7.1 — GIVEN** karışık alarmlar **WHEN** "Active" filtresi seçilir **THEN** yalnız aktif alarmlar listelenir
2. **AK-7.2 — GIVEN** aktif alarm seçili **WHEN** not girilip onaylanır **THEN** resolve çağrılır ve alarm çözülmüş duruma geçer
3. **AK-7.3 — GIVEN** Faults açık **WHEN** enjeksiyon paneli görünür **THEN** grup/tip seçimi + Inject butonu bulunur; enjeksiyon backend ucu yoksa kullanıcıya mesaj döner

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-7.1 | Filtre çalışır | unit | ⬜ |
| AK-7.2 | Notlu çözme akışı | unit | ⬜ |
| AK-7.3 | Enjeksiyon paneli mevcut | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-24: `DemoFaultList` yeniden (filtre + detay)
- [ ] T-25: `DemoFaultDetail` + notlu çözme
- [ ] T-26: enjeksiyon paneli (dummy)

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Aktif alarm yok | "No active faults" |
| Resolve hatası | Fail-closed mesaj |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `packages/ui/src/nova/DemoFaultList.tsx` | Liste + detay |
| `apps/demo-field/src/pages/DemoFaultsPage.tsx` | Sayfa |

### 6.8 UC-8 — Admin sayfası

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: Data mapping, Site parameters, Devices, Register catalogue (trimmed), Modbus trace (komut geçmişi+log canlı) — hepsi read-only
- hariç: yazma API'si, gerçek register-seviyesi trace (B-2)

**Akış:**
1. Admin sekmesi açılır; 5 alt sekme render edilir.
2. Modbus trace cihaz seçimine göre komut geçmişi + log satırlarını çeker.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-8.1 | Admin MUST 5 alt sekme sunar (mapping/params/devices/catalogue/trace) | AK-8.1 |
| FR-8.2 | Mapping ve site parametreleri MUST read-only tablo/alan olarak referans içeriğini gösterir | AK-8.2 |
| FR-8.3 | Modbus trace MUST `GET /commands/:deviceId/commands` + `GET /logs` verisinden canlı satırlar gösterir | AK-8.3 |
| FR-8.4 | Register kataloğu MUST trimmed BSC/PCS/HVAC kayıt listesini adres+ad olarak gösterir | AK-8.4 |

**Kabul Senaryoları (GWT):**
1. **AK-8.1 — GIVEN** Admin açık **WHEN** render edilir **THEN** 5 alt sekme başlığı görünür
2. **AK-8.2 — GIVEN** mapping sekmesi **WHEN** görüntülenir **THEN** ekran öğesi → register satırları read-only görünür
3. **AK-8.3 — GIVEN** PCS-1 seçili **WHEN** trace yüklenir **THEN** komut geçmişi + log satırları zaman/adres/değer ile listelenir
4. **AK-8.4 — GIVEN** catalogue sekmesi **WHEN** görüntülenir **THEN** adres/ad listesi gruplandırılmış görünür

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-8.1 | 5 alt sekme | unit | ⬜ |
| AK-8.2 | Read-only mapping/params | unit | ⬜ |
| AK-8.3 | Canlı trace satırları | unit | ⬜ |
| AK-8.4 | Katalog listesi | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-27: `DemoAdminView` + 5 alt sekme
- [ ] T-28: `demo-admin.ts` mapping/params/cihaz/katalog statik verisi
- [ ] T-29: `demo-registers.ts` trimmed katalog
- [ ] T-30: canlı Modbus trace (komut geçmişi + log)

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Komut geçmişi boş | "No trace" |
| localStorage mapping yok | Varsayılan statik map |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `packages/ui/src/nova/DemoAdminView.tsx` | Yeni |
| `apps/demo-field/src/pages/DemoAdminPage.tsx` | Yeni sayfa |

### 6.9 UC-9 — Veri katmanı genişletme (mapper + fan-out)

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: container telemetrisinden HVAC/PM5340/CONTROL-PANEL-IO/CB/DC/IMD okuma, 9 üniteye fan-out, ambient türetme, eksik veri varsayılanı
- hariç: yeni backend cihazları, tünel değişikliği

**Akış:**
1. `containers` + field telemetrisi birleşir.
2. Cihazlar isim bazlı indekslenir.
3. Prototip ünite 9'a fan-out edilir; PCS gücü bölünür.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-9.1 | Mapper MUST HVAC-1..8, PM5340-1, CONTROL-PANEL-IO-1, CB-1/2, DC-METER-1, IMD-1 telemetrisini okur | AK-9.1 |
| FR-9.2 | Fan-out MUST yeni cihazları 9 üniteye kopyalar; ambient HVAC-1 outside temp'tir | AK-9.2 |
| FR-9.3 | Eksik cihaz telemetrisi MUST güvenli varsayılana (`—`/nötr) düşer, throw etmez | AK-9.3 |

**Kabul Senaryoları (GWT):**
1. **AK-9.1 — GIVEN** container latest telemetrisi **WHEN** mapper çalışır **THEN** ünite state'i hvac/aux/fss/dc/imd alanları dolu döner
2. **AK-9.2 — GIVEN** tek konteyner **WHEN** fan-out **THEN** 9 ünitenin tümü aynı HVAC/aux değerlerini taşır; ambient outside temp'tir
3. **AK-9.3 — GIVEN** HVAC telemetrisi yok **WHEN** mapper çalışır **THEN** hvac alanı boş/"—" olur, hata fırlatmaz

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-9.1 | Yeni cihazlar okunur | unit | ⬜ |
| AK-9.2 | Fan-out + ambient | unit | ⬜ |
| AK-9.3 | Güvenli varsayılan | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-31: `mimic-types.ts` yeni alanlar
- [ ] T-32: `mapFieldToMimicState` cihaz okuma + ambient
- [ ] T-33: fan-out + eksik veri varsayılanı + testler

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Kısmi telemetri | Eksik alan "—" |
| Çok satırlı latest | En yeni timestamp seçilir |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `packages/ui/src/nova/mimic-types.ts` | Yeni alanlar |
| `apps/demo-field/src/features/demo-data/mapFieldToMimicState.ts` | Cihaz okuma |
| `apps/demo-field/src/features/demo-data/fanOutUnits.ts` | Fan-out |

### 6.10 UC-10 — FSS simülatörü (Sigma XT)

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: Sigma XT panel state machine (status/zone/dedektör/countdown/mode/disablement), Modbus TCP adapter + register map, host builder, container config, telemetri akışı
- hariç: gerçek Sigma XT Modbus map'i (yok — kayıt haritası varsayım/dokümante), gerçek yangın fizik modeli

**Akış:**
1. `SimulatorHost` `fss` builder'ı ile `fss-1.json` config'inden simülatörü başlatır.
2. Simülatör 3 zone + 2 dedektör + panel durumunu register'lardan sunar.
3. device-service poll eder → telemetri tünele düşer.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-10.1 | Simülatör MUST panel durumunu (normal/fire/fault/disabled/test, 1st/2nd stage, released, mode) yönetir | AK-10.1 |
| FR-10.2 | Simülatör MUST Modbus TCP register map'i (zone/dedektör/panel) sunar | AK-10.2 |
| FR-10.3 | `host.ts` MUST yalnız ekleme ile `fss` builder kaydeder; config tünelden telemetri üretir | AK-10.3 |

**Kabul Senaryoları (GWT):**
1. **AK-10.1 — GIVEN** yeni simülatör **WHEN** 2 zone fire + countdown dolar **THEN** status `fire`/`released` olur, released bit register'da görünür
2. **AK-10.2 — GIVEN** Modbus istemci **WHEN** panel register'ları okur **THEN** zone/dedektör/mode değerleri tutarlı döner
3. **AK-10.3 — GIVEN** `fss-1.json` container config **WHEN** host başlar **THEN** simülatör ayakta ve telemetri üretir; mevcut builder'lar etkilenmez

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-10.1 | Panel state machine | unit | ⬜ |
| AK-10.2 | Modbus register map | unit | ⬜ |
| AK-10.3 | Host kaydı + config | unit+gözle | ⬜ |

**T Görev Listesi:**
- [ ] T-34: `fss-simulator.ts` (state machine) + JSDoc
- [ ] T-35: `register-map.ts` + `fss-modbus-adapter.ts`
- [ ] T-36: `host.ts` builder + `fss-1.json` + testler

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Bilinmeyen register | 0 döner, hata yok |
| Countdown iptali | status normale döner |
| Manual mode | Otomatik release YOK |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `packages/simulators/src/fss/fss-simulator.ts` | Yeni |
| `packages/simulators/src/fss/register-map.ts` | Yeni |
| `packages/simulators/src/fss/fss-modbus-adapter.ts` | Yeni |
| `packages/simulators/src/host.ts` | `fss` builder |
| `deployment/{dev,aws}/demo-edge/container-device-configs/fss-1.json` | Yeni config |

### 6.11 UC-11 — Plant overview (Site layout üstü, collector + istasyon kartları)

**Status:** ✏️ Specified (onay bekliyor)
- **Kapsam dahil:** Site layout sekmesinde, trendlerin üstünde **plant overview kartı**: **collector** tek hat (grid → Q01 incomer → Q02 metering → collector bus → istasyon fiderleri → **BESS MV istasyon kartları**) + yan panel (Main source yok + Manual/Peak modu + canlı KPI + günlük enerji) + plant güç trendi. **İstasyon kartına tıklama** alttaki site layout'u (mimic + unit detail + attention) o istasyona geçirir. Kaynak: `plant-view.js#collectorSvg`, `#render`, `#plantSrc`; istasyon bölümü manuel config (ileride backend config'i). 2 istasyon: **#1 = BESS#1–5 (Feeder A)**, **#2 = BESS#6–9 (Feeder B)**; collector **"MV STATION · 34.5 kV"** (31.05 MW ≤ 50).
- **Kapsam hariç:** Main-source (PV/wind) MV station view, peak shaving algoritması (kaynak yok → disabled), source unit table, collector Metal Clad — A-5 ileri iş.

**Akış:**
1. `demo-stations.ts#DEMO_STATIONS` (2 istasyon, ünite listesi) + `#stationTopo(k)` (DEMO_TOPOLOGY'den o istasyonun fider dilimi) saf config.
2. `mapFieldToMimicState` çıktısından `demo-plant.ts#deriveCollectorOverview` istasyon başına türevleri (MW/SOC/Tmax/durum) üretir.
3. `DemoPlantOverview` collector SVG'sini çizer; canlı değerler her state güncellemesinde yazılır (flow yön/sınıf).
4. İstasyon kartına tıklama `onStationSelect(k)` → `DemoFieldPage` seçili istasyonu değiştirir; mimic `stationTopo(k)` + `stateForStation` ile o istasyonun 5/4 ünitesini gösterir.
5. Günlük enerji: downsampled POI güç serisi entegrasyonu (Exported > 0, Imported < 0); seri yoksa "—". Plant güç trendi downsampled seriyi `DemoTrendChart` ile çizer.

**FR-11 Gereksinimler:**
| Kod | Gereksinim | AK |
|:----|:-----------|:---|
| FR-11.1 | Kart MUST collector tek hattını gösterir (grid, Q01 incomer, Q02 metering, collector bus, istasyon fiderleri) | AK-11.1 |
| FR-11.2 | Her istasyon kartı MUST isim, BESS#aralık, n × 3.568 MWh, güç, SOC barı, ünite mini kutucukları ve durum taşır | AK-11.2 |
| FR-11.3 | Collector/POI/istasyon değerleri MUST canlı ve yön sınıflı (dis/chg) olur | AK-11.3 |
| FR-11.4 | Yan panel MUST Manual aktif + Peak shaving disabled + canlı KPI + günlük enerji gösterir | AK-11.4 |
| FR-11.5 | İstasyon kartı tıklaması MUST site layout'u (mimic + unit detail + attention) o istasyona geçirir | AK-11.5 |
| FR-11.6 | İstasyon bölümü MUST manuel config'ten gelir (2 istasyon: BESS#1–5, BESS#6–9) | AK-11.6 |
| FR-11.7 | Günlük enerji MUST POI serisi entegrasyonundan gelir; seri yoksa "—" (uydurma yok) | AK-11.7 |
| FR-11.8 | İstasyon barı MUST seçili istasyonu gösterir/değiştirir; KPI'lar seçili istasyona göre hesaplanır | AK-11.8 |
| FR-11.9 | Kart MUST 2 PV MV istasyonu (illüstratif) içerir; collector tipini kurulu güce göre (Metal Clad / MV station) gösterir | AK-11.9 |
| FR-11.10 | PV istasyon kartına tıklama MUST o istasyonun tek-hat çizimini (srcKpi + birimler) site layout yerine gösterir; BESS seçimi geri döndürür | AK-11.10 |
| FR-11.11 | "Solar production & peak shaving · today" grafiği MUST production/POI + shaved/released bandları + threshold gösterir (illüstratif) | AK-11.11 |

**GWT Kabul Senaryoları:**
1. **AK-11.1 — GIVEN** 2 istasyonlu config **WHEN** kart render edilir **THEN** `svg.po` içinde Q01/Q02 ve 2 istasyon kutusu bulunur
2. **AK-11.2 — GIVEN** istasyon #1 **WHEN** kart yazılır **THEN** "BESS#1–5 · 5 × 3.568 MWh" ve 5 ünite kutucuğu görünür
3. **AK-11.3 — GIVEN** istasyon poiMW>0 **WHEN** satır yazılır **THEN** MW `dis` sınıflıdır; poiMW<0 `chg`
4. **AK-11.4 — GIVEN** ana kaynak yok **WHEN** panel render edilir **THEN** Manual `aria-pressed=true`, Peak `disabled`
5. **AK-11.5 — GIVEN** kart #2 tıklanır **WHEN** `onStationSelect(1)` **THEN** seçili istasyon #2 olur ve mimic BESS#6–9 gösterir
6. **AK-11.6 — GIVEN** `DEMO_STATIONS` **WHEN** okunur **THEN** toplam 9 ünite (5+4) ve 2 istasyon tanımlıdır
7. **AK-11.7 — GIVEN** downsampled seri boş **WHEN** günlük enerji yazılır **THEN** tüm satırlar "—"
8. **AK-11.8 — GIVEN** 2 istasyon **WHEN** stBar'da #2 seçilir **THEN** KPI'lar BESS#6–9 ünitelerine göre hesaplanır
9. **AK-11.9 — GIVEN** illüstratif solar config **WHEN** kart render edilir **THEN** "PV MV STATION #1/#2" kutuları ve collector "METAL CLAD · 34.5 kV" görünür
10. **AK-11.10 — GIVEN** plant kartı **WHEN** PV #1 kutusuna tıklanır **THEN** site layout yerine "PV MV STATION #1" tek-hat çizimi (7 birim + srcKpi) görünür; BESS#1 seçilince mimic geri gelir
11. **AK-11.11 — GIVEN** illüstratif solar **WHEN** kart render edilir **THEN** "Solar production & peak shaving · today" grafiği + peakSum (production/shaved/released/threshold) görünür

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-11.1 | Collector tek hat render | unit | ⬜ |
| AK-11.2 | İstasyon kartı + ünite kutucukları | unit | ⬜ |
| AK-11.3 | Collector/POI yön | unit | ⬜ |
| AK-11.4 | Manual/Peak mod + KPI | unit | ⬜ |
| AK-11.5 | İstasyon kartı tıklaması geçiş | unit | ⬜ |
| AK-11.6 | İstasyon manuel config (5+4) | unit | ⬜ |
| AK-11.7 | Günlük enerji boş durum | unit | ⬜ |
| AK-11.8 | stBar + istasyon-bazlı KPI | unit | ⬜ |
| AK-11.9 | PV kutuları + collector tipi (Metal Clad) | unit | ⬜ |
| AK-11.10 | PV tek-hat çizimi + geri dönüş | unit | ⬜ |
| AK-11.11 | Peak shaving grafiği + peakSum | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-37: `demo-plant.ts#deriveStationView` + `#deriveCollectorOverview` + `#dailyEnergy` (saf) + testler
- [ ] T-38: `DemoPlantOverview.tsx` collector SVG + istasyon kartları + yan panel + CSS
- [ ] T-39: plant güç trendi (downsampled) + kart tıklama (`onStationSelect`)
- [ ] T-40: `DemoFieldPage` istasyon seçici + `stateForStation` + `stationTopo` + filtreli detail/attention + testler
- [ ] T-47: `demo-stations.ts` (2 istasyon 5+4, `stationTopo`, `stationForUnit`) + testler
- [ ] T-48: `DemoStationBar` + context `activeStation`/`stationKpis` + istasyon-bazlı KPI + testler
- [ ] T-49: PV kaynak kutuları + collector tipi (Metal Clad) + testler
- [ ] T-50: `DemoSourceStationView` (PV tek-hat + srcKpi) + `DemoFieldPage` kaynak görünümü geçişi + testler
- [ ] T-51: `buildPeakSeries`/`peakEnergySums` + "Solar production & peak shaving" grafiği + testler

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Telemetri boş | Kutucuklar nötr; KPI "—"; trend "No data" |
| Downsampled seri yok | Günlük enerji "—" (uydurma yok) |
| Tek istasyon | Standalone tek hat (kolektör yok) |
| Seçili istasyon ünite yok | Boş ünite listesi (throw yok) |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `apps/demo-field/src/features/demo-data/demo-stations.ts` | Yeni (saf config + `stationTopo`) |
| `packages/ui/src/nova/demo-plant.ts` | İstasyon/collector türevleri |
| `packages/ui/src/nova/DemoPlantOverview.tsx` | Collector + kartlar |
| `packages/ui/src/nova/nova-console.css` | Plant overview stilleri |
| `packages/ui/src/nova/index.ts` | Export |
| `apps/demo-field/src/pages/DemoFieldPage.tsx` | İstasyon seçici + filtre |

### 6.12 UC-12 — Register-source modu (Values · Tooltip · Inline)

**Status:** ✏️ Specified (onay bekliyor)
- **Kapsam dahil:** Header `Source` segmenti (Values/Tooltip/Inline, localStorage persist); `RegisterValue` sarmalayıcı; tek global hover kaynak kartı; kaynak türü renk lejantı (reg/calc/nomap/model); mimic SVG metinlerinin `data-rsk` annotasyonu; Site layout + pinfo/KPI kablolaması. Kaynak: `regsrc.js`, `demo/app.js#applyRegMode/#annotateSvgs/#srcForId`, `demo/app.css` `.rv`/`#rsTip`/`.regbar`.
- **Kapsam hariç:** Devices/Operations/Grid & Market/Faults/Admin kablolaması (A-6, 2. tur); admin mapping'in canlı düzenlenmesi (mevcut read-only mapping kullanılır).

**Akış:**
1. `RegisterValue` bir değeri sarar; mod `val` ise düz metin, aksi halde `.rv` span'i + registry kaydı üretir.
2. Global hover kartı `pointermove` ile `[data-rsk]` bulur, registry'den kaynağı çözer, `tipHtml` ile kartı basar.
3. Mimic her güncellemede `data-rsk`'leri id→kaynak eşlemesinden (`mimic-source-map.ts`) yazar.
4. `Inline` modu değeri `adres · device · register adı` metnine çevirir (hover yine kart).

**FR-12 Gereksinimler:**
| Kod | Gereksinim | AK |
|:----|:-----------|:---|
| FR-12.1 | Header MUST `Values · Tooltip · Inline` segmentini taşır ve seçimi localStorage'a yazar | AK-12.1 |
| FR-12.2 | Kaynaklı değer MUST hover'da device + register (adres/FC/tip/scale/unit) kartı açar | AK-12.2 |
| FR-12.3 | `calc` kaynak MUST hesaplanan türevi + girdi register listesini gösterir | AK-12.3 |
| FR-12.4 | `nomap`/`model` kaynak MUST "register map not supplied"/"simulation" olarak işaretlenir | AK-12.4 |
| FR-12.5 | Mimic SVG değerleri MUST regmodda `data-rsk` ile işaretlenir (dotted underline) | AK-12.5 |
| FR-12.6 | Inline modda değer MUST `adres · device · ad` metnine döner | AK-12.6 |

**GWT Kabul Senaryoları:**
1. **AK-12.1 — GIVEN** sayfa yüklü **WHEN** "Tooltip" tıklanır **THEN** body `regmode` sınıfı alır ve `gdpm.demo.regmode="tip"` yazılır
2. **AK-12.2 — GIVEN** regmod tip **WHEN** bank SOC değeri hover edilir **THEN** kart BSC aygıtını, `30170 + 150·(rack−1)` adresini ve `bsc.soc` adını gösterir
3. **AK-12.3 — GIVEN** regmod **WHEN** "Site power" KPI hover edilir **THEN** kart "Computed by PMS" + girdi register satırını gösterir
4. **AK-12.4 — GIVEN** regmod **WHEN** bir MV/POI değeri hover edilir **THEN** kart "Register map not supplied" gösterir
5. **AK-12.5 — GIVEN** regmod inline **WHEN** mimic render edilir **THEN** `poiTxt`/`vtTxt`/bank metinlerinde `data-rsk` dolu
6. **AK-12.6 — GIVEN** regmod inline **WHEN** değer görünür **THEN** `.rvv` gizli, `.rvs` görünür (adres·device·ad)

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-12.1 | Mod segmenti + persist | unit | ⬜ |
| AK-12.2 | Register kartı içeriği | unit | ⬜ |
| AK-12.3 | Calc kartı girdileri | unit | ⬜ |
| AK-12.4 | Nomap/model işareti | unit | ⬜ |
| AK-12.5 | SVG annotasyonu | unit | ⬜ |
| AK-12.6 | Inline dönüşümü | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-41: `register-sources.ts` (tipler + builder'lar + `key`/`tipHtml`) + testler
- [ ] T-42: `mimic-source-map.ts` (`srcForId` portu) + testler
- [ ] T-43: `DemoRegMode.tsx` (provider + `RegisterValue` + `RegisterTip` + `RegisterBar`)
- [ ] T-44: `nova-console.css` `.rv`/`#rsTip`/`.regbar` (light+dark token)
- [ ] T-45: `DemoShell` Source segmenti + `DemoMimic` `data-rsk` annotasyonu
- [ ] T-46: Site layout + pinfo/KPI kablolaması + testler

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Kaynak `undefined` | Düz metin (sarma yok) |
| Mod `val` | `.rv` üretilmez; hover kartı gizli |
| Bilinmeyen register id | `nomap`/`model` yerine düz metin |
| Çoklu değer (aynı kaynak) | Registry key ile tekilleşir |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `packages/ui/src/nova/register-sources.ts` | Yeni (saf) |
| `packages/ui/src/nova/mimic-source-map.ts` | Yeni (saf) |
| `packages/ui/src/nova/DemoRegMode.tsx` | Yeni |
| `packages/ui/src/nova/nova-console.css` | `.rv`/`#rsTip`/`.regbar` |
| `packages/ui/src/nova/index.ts` | Export |
| `apps/demo-field/src/layouts/DemoShell.tsx` | Source segmenti + tip/lejant |
| `apps/demo-field/src/layouts/DemoProjectLayout.tsx` | pinfo/KPI kaynakları |
| `packages/ui/src/nova/DemoUnitDetail.tsx` | Kaynaklı hücreler |
| `packages/ui/src/nova/DemoMimic.tsx` | `data-rsk` annotasyonu |

### 6.13 UC-13 — Station-tagged konteynerler (backend + ikinci stack)

**Status:** ✏️ Specified (onay bekliyor)
- **Kapsam dahil:** `field_containers.station` (web-service şema + register payload + GET); konteyner telemetrisinde `station` tag'i (`STATION_ID` + `TelemetryTagger`); demo dev compose'da **container-2** stack'i; register aracının iki konteyneri otomatik kaydı (`register:demo-integration`); frontend istasyon-bazlı fan-out (`stationsForContainers` + `mapFieldToMimicState`); Admin Add-container station alanı + konteyner tablosunda station sütunu.
- **Kapsam hariç:** Prod/AWS'e ikinci konteyner (yalnız dev); konteyner-içi ünite kavramı (backend'de yok — istasyon etiketi konteyner düzeyinde).

**Akış:**
1. Konteyner field'a kayıt olurken `station` verilir → `field_containers.station`; `GET /:fieldId/containers` döner.
2. Konteyner device-service `STATION_ID` env'ini `TelemetryTagger`'a geçirir → telemetri satırları `station` tag'i taşır.
3. Frontend `stationsForContainers` konteyner etiketinden istasyon gruplarını türetir; `mapFieldToMimicState` **her istasyonun prototipini kendi konteynerinin satırlarından** üretip o istasyonun ünite dilimine fan-out eder (etiket yoksa legacy tek-prototip korunur).
4. İki konteyner bağımsız telemetri yayar (kendi redis/timescale/WS uplink); veri ayrımı `container_id`/`station` ile doğrulanır (DebugInjector ile bir konteynere enjeksiyon diğerini etkilemez).

**FR-13 Gereksinimler:**
| Kod | Gereksinim | AK |
|:----|:-----------|:---|
| FR-13.1 | `field_containers` MUST `station` kolonu taşır; register opsiyonel `station` alır; GET döndürür | AK-13.1 |
| FR-13.2 | Konteyner telemetrisi MUST `station` tag'i taşır (STATION_ID verilirse) | AK-13.2 |
| FR-13.3 | Frontend MUST konteyner `station` etiketinden istasyonları türetip istasyon-bazlı fan-out yapar | AK-13.3 |
| FR-13.4 | Dev compose MUST ikinci konteyner stack'i tanımlar; kayıt aracı iki konteyneri otomatik kaydeder | AK-13.4 |
| FR-13.5 | Bir konteynere yapılan enjeksiyon MUST yalnız o istasyonun verisini değiştirir (ayrışma) | AK-13.5 |
| FR-13.6 | Devices sayfasında Battery groups + cihaz panelleri MUST yalnız seçili istasyonun BESS'lerini listeler | AK-13.6 |
| FR-13.7 | Battery'de pack detayında MUST pack şeması (FRONT + 4×CMA S1–S24 + TH1–4 + spec tablosu) gösterilir | AK-13.7 |
| FR-13.8 | Operations MUST seçili istasyona göre çalışır (units/scope/permissives/startup istasyona süzülür) | AK-13.8 |
| FR-13.9 | Manevra/operasyon yürütmede uzak adım MUST istekteki `systems` (konteyner id) hedefine yönelir; verilmezse config varsayılanı. Güç amaçlı tüm yürütme yolları (charge/discharge/standby/stop/hedef-SOC) `systems` taşır | AK-13.9 |
| FR-13.10 | "Operating mode" göstergesi MUST istasyon bazlıdır (konteynerin BSC `ChargeStatus`'una göre; PCS saha-seviyesi paylaşımlı) | AK-13.10 |
| FR-13.11 | Operations koşu listesi (active command sequences) MUST aktif istasyona göre süzülür (koşu uzak hedefi kalıcı) | AK-13.11 |
| FR-13.12 | Uzak (tünel) adım MUST üst sınırla kapatılır (varsayılan 120 sn) — yanıtı kaybolan stream run'ı kilitli bırakmaz | AK-13.12 |
| FR-13.13 | 90 sn'den eski "running" koşu MUST bayat sayılır (Active program'ı kilitlemez; Sequences'te STALE) | AK-13.13 |

**GWT Kabul Senaryoları:**
1. **AK-13.1 — GIVEN** admin **WHEN** `POST .../containers/c-2/register {token, station:"bess2"}` **THEN** 201 ve `GET .../containers` içinde `station:"bess2"` görünür
2. **AK-13.2 — GIVEN** `STATION_ID=bess2` **WHEN** telemetri enrich edilir **THEN** satır tag'inde `station:"bess2"` bulunur
3. **AK-13.3 — GIVEN** iki konteyner `bess1`/`bess2` etiketli **WHEN** mapper çalışır **THEN** BESS#1–5 ve BESS#6–9 kendi konteynerinin değerlerini taşır
4. **AK-13.4 — GIVEN** dev stack **WHEN** `start:demo-integration` + `register:demo-integration` koşulur **THEN** 2 konteyner `connected` + `station` etiketli
5. **AK-13.5 — GIVEN** c2 BSC-1'e `overheat` enjekte edilir **WHEN** `/containers` okunur **THEN** bess2 ~80 °C, bess1 nominal
6. **AK-13.6 — GIVEN** 2 istasyon **WHEN** Devices'ta istasyon seçilir **THEN** Battery groups yalnız o istasyonun ünitelerini listeler
7. **AK-13.7 — GIVEN** Battery rack detayı **WHEN** pack seçilir **THEN** pack şeması (4×CMA S1–S24, 72 hücre, spec tablosu) görünür
8. **AK-13.8 — GIVEN** activeStation #2 **WHEN** Operations açılır **THEN** kapsam/permissives yalnız BESS#6–9 ünitelerini içerir
9. **AK-13.9 — GIVEN** `systems:["container-2"]` **WHEN** `charge` yürütülür **THEN** uzak `bsc_charge` adımı container-2'de yürür (outcome.system=container-2); `systems` yoksa container-1. Ön yüz `demoApi.executeOperation/executeManeuver` `systems`'i POST gövdesine koyar
10. **AK-13.10 — GIVEN** istasyon 2 şarj, istasyon 1 idle **WHEN** KPI şeridi görüntülenir **THEN** istasyon 2 "Charging", istasyon 1 "Idle" (BSC ChargeStatus)
11. **AK-13.11 — GIVEN** istasyon 2'de charge **WHEN** Operations koşu listesi **THEN** yalnız istasyon 2 koşuları görünür
12. **AK-13.12 — GIVEN** uzak adım yanıt vermez **WHEN** üst sınır (120 sn) dolar **THEN** adım `remote_timeout` ile başarısız; run `failed` (kilitlenmez)
13. **AK-13.13 — GIVEN** 90 sn'den eski `running` koşu **WHEN** Operations görüntülenir **THEN** Active program onu atlar; Sequences "STALE" gösterir

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-13.1 | station kolonu + register + GET | unit (`field-routes.test`) | ⬜ |
| AK-13.2 | station telemetri tag'i | unit (`telemetry-tagger.test`) | ⬜ |
| AK-13.3 | istasyon-bazlı fan-out | unit (`mapFieldToMimicState.test`) | ⬜ |
| AK-13.4 | ikinci stack + otomatik kayıt | entegrasyon (canlı) | ⬜ |
| AK-13.5 | enjeksiyon ayrışması | entegrasyon (`station-containers.integration.test`) | ⬜ |
| AK-13.6 | Devices istasyon filtresi | unit (kod inceleme + sayfa) | ⬜ |
| AK-13.7 | Pack şeması | unit (`DemoPackSchematic.test`) | ⬜ |
| AK-13.8 | Operations istasyon bazlı | unit (kod inceleme) | ⬜ |
| AK-13.9 | İstasyon bazlı uzak yürütme (`systems`) | unit (route+executor+demoApi) + entegrasyon (`station-operations`) | ⬜ |
| AK-13.10 | Mod göstergesi istasyon bazlı | unit (`deriveKpis`) | ⬜ |
| AK-13.11 | Koşu listesi istasyon bazlı | unit (executor `steps.remoteSystem`) | ⬜ |
| AK-13.12 | Uzak adım üst sınırı | unit (`operation-executor` fake timer) | ⬜ |
| AK-13.13 | Bayat run koruması | unit (`isStaleRun`) | ⬜ |

**T Görev Listesi:**
- [ ] T-52: `field-routes.ts` station kolonu + register payload + GET + testler
- [ ] T-53: `telemetry-tagger.ts` + `definitions.ts#siteStationId` + `run.ts` + test
- [ ] T-54: `tools/register-container.sh` `--station`/`--token-var` + `package.json#register:demo-integration`
- [ ] T-55: `docker-compose.yml` container-2 bloğu + `.env.example` `CONTAINER2_TOKEN`
- [ ] T-56: frontend `stationsForContainers` + `mapFieldToMimicState` + Admin station alanı + `station-containers.integration.test`
- [ ] T-57: `DemoDevicesPage` istasyon filtresi (Battery groups + paneller `stationState`)
- [ ] T-58: `DEMO_PACK_SPEC` + `DemoPackSchematic` (packSvg portu) + CSS + testler
- [ ] T-59: `DemoManeuverPage` istasyon bazlı (units/scope/permissives/startup)
- [ ] T-60: `systems` execute payload (web-service schema+passthrough, `ExecuteOptions.remoteSystem`, ön yüz `demoApi` POST gövdesi + stop/hedef-SOC) + testler
- [ ] T-61: Mod göstergesi istasyon bazlı (`bank.chargeStatus` + `deriveKpis`) + koşu listesi istasyon süzme (executor `steps.remoteSystem` kalıcı) + testler
- [ ] T-62: Uzak adım üst sınırı (`ExecuteOptions.remoteTimeoutMs` + `runRemoteStep`) + bayat run koruması (`isStaleRun`) + testler

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Station etiketi yok (eski kurulum) | Tüm konteynerler her istasyona düşer (legacy tek-prototip, güç korunumu) |
| Bir istasyonun konteyneri kayıtlı değil | İlk konteynere fallback (boş istasyon çizilmez) |
| `station` boş string | NULL yazılır (etiket yok sayılır) |
| İkinci stack yok | container-2 telemetrisi gelmez; istasyon 1 konteynerine fallback |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `services/web-service/src/presentation/routes/field-routes.ts` | station kolonu + register + GET |
| `services/device-service/src/telemetry-tagger.ts` | station tag'i |
| `packages/shared-utils/src/config/definitions.ts` | `siteStationId` |
| `services/device-service/run.ts` | identity.stationId |
| `tools/register-container.sh` | `--station`/`--token-var` |
| `package.json` | `register:demo-integration` |
| `deployment/v2/dev/container/docker-compose.yml` | container-2 stack |
| `apps/demo-field/.../demo-stations.ts` | `stationsForContainers` |
| `apps/demo-field/.../mapFieldToMimicState.ts` | istasyon-bazlı fan-out |
| `apps/demo-field/integration/station-containers.integration.test.ts` | canlı doğrulama |
| `packages/ui/src/nova/DemoAdminView.tsx` | station alanı + tablo sütunu |

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| Tema seçimi | localStorage → yoksa `prefers-color-scheme`; `data-theme` + `--nm-*` güncellenir |
| Veri yükleniyor | Panel/şerit iskelet/boş durum; throw yok |
| Veri hatası | Kademeli bozulma: ilgili blok boş/"—", sayfa render olur |
| Boş containers | Ünite yok; KPI "—"; grafik "No data" |
| Kısmi telemetri | Eksik alan "—"; fan-out nötr |
| Rest bitmiş | Ready "complete"; termal bant dışıysa "NOT READY" |
| İnterlock reddi | operation-executor `rejected`; formda kırmızı permissive |
| Kalibrasyon scheduleAt yok (B-1) | "At time" denemesi kullanıcıya net hata |
| Trace verisi yok | "No trace" |
| FSS released | status `fire`/released bit; HVAC forced standby metni |
| Sim bilinmeyen register | 0; hata fırlatmaz |

### 7.1 Dummy / Türetim Listesi (K-6 — zorunlu olanlar)

> "Her şey aynı olsun" kapsamında yalnız veri kaynağı bulunmayan yüzeyler. Geri kalan her şey canlı backend/simülatör telemetrisidir.

| # | Yüzey | Neden | Gösterim |
|:--|:------|:------|:---------|
| D-1 | Pack detayı (17 pack × 24 hücre, 4 sensör, TC haritası) | Modbus map'te yok — referans da türetiyor | Rack telemetrisinden deterministik türetim, "simulated" işaretli |
| D-2 | Konteyner içi yük kırılımı + istasyon AUX (H02) | PM5340 yalnız toplam ölçer, H02'de sayaç yok | Toplam canlı, kırılım topolojiden türetme |
| D-3 | HVAC elektriksel kW tahmini | MC90'da güç registerı yok | Kompresör/fan/heater durumundan tahmin (referansla aynı) |
| D-4 | Fault injection paneli | Backend enjeksiyon ucu yok (B-3) | UI birebir; Inject backend ucu gelene dek no-op/mesaj |
| D-5 | Sim hızı seg (1×/15×/60×) | Sim yok | Görsel sabit (1×) |
| D-6 | Admin mapping dropdown'ları + site params input'ları | Settings API'si yok | Read-only statik |
| D-7 | Sekans manuel onay ("Confirm done") | Backend run adımlarında manual-await desteğine bağlı | UI hazır; backend'den "await" gelirse canlı |

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | Referans ekran yapısı birebir: üst blok sırası (şerit→KPI→ready→trend→görünüm→log) tüm sekmelerde | component testleri + gözle |
| SC-2 | Dark+light tema referans token değerlerini döner | `tokensDark.test.ts` |
| SC-3 | Trend grafiği faz/limit/band/area/tooltip davranışları | `DemoTrendChart` testleri |
| SC-4 | Yeni cihaz telemetrisi (HVAC/PM5340/FSS/DC/IMD) mapper'dan state'e akar | mapper testleri |
| SC-5 | FSS simülatörü panel durumlarını üretir ve host'a kaydı mevcut davranışı bozmaz | `fss-simulator.test.ts` + `host.test.ts` |
| SC-6 | Plant overview kartı collector tek hat + istasyon kartları + canlı KPI + günlük enerjiyi gösterir; kart tıklaması site layout'u istasyona geçirir | `DemoPlantOverview` + `demo-plant.test.ts` + `demo-stations.test.ts` |
| SC-7 | Register-source modu Values/Tooltip/Inline çalışır; hover kartı device+register+hesap gösterir | `register-sources.test.ts` + `DemoRegMode.test.tsx` |
| SC-8 | İki konteyner station etiketli kaydedilir; telemetri istasyon-bazlı ayrışır (bir enjeksiyon diğerini etkilemez) | `station-containers.integration.test.ts` |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC | Bu doküman |
| 2. JSDoc | Bileşen/tip sözleşmeleri (props, state, edge-case) + `fss-simulator` JSDoc |
| 3. TEST | Kırmızı testler: chart, tokensDark, mapper, fss-simulator, market/arbitraj, sayfalar |
| 4. IMPL | T-1…T-36 |
| 5. KAPANIŞ | `DEMO-KONSOL-UI-UYUM-KAPANIS.md` (Doğrulama + Test Kapsamı) |

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A-1 | Pack detayı Modbus'ta yok → rack telemetrisinden deterministik türetim | Kapanış §B.2 boşluk (D-1) |
| A-2 | Market "Tomorrow" gerçek seri kapsamına bağlı | T-23'te veri varsa aktif, yoksa disabled |
| A-3 | Ham register trace (B-2) yerine komut geçmişi+log | T-30; B-2 ucu ileri iş |
| A-4 | Sekans manuel onay adımları backend `await` desteğine bağlı | Backend gelirse canlı, aksi statik |
| A-5 | Plant overview collector/hybrid + main-source MV station view + peak shaving | Ana kaynak (PV/wind) verisi yok — bu turda disabled/ertelendi (K-11) |
| A-6 | Tooltip kablolaması Devices/Operations/Grid & Market/Faults/Admin sayfalarına | 2. tur (K-13) — mekanizma hazır, kablolama sonra |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. Backend B-1 (`scheduleAt`), B-2 (ham Modbus trace), B-3 (fault injection) uçları.
2. HVAC/FSS/AUX için ek cihaz zenginleştirme (mevcut simülatörler yeterli).
3. Gerçek EPİAŞ API sözleşmesi (mevcut `external` ucu kapsamı).

## 12. T Görev Özeti

| T | Görev |
|:--|:------|
| T-1 | `tokensDark.ts` + `apply-nova-vars.ts` + testler |
| T-2 | `index.css`/`index.html` fontlar + light/dark kök değişkenler |
| T-3 | `DemoShell` header/crumbs/tema seg/saat/footer |
| T-4 | `routes.tsx` 6 rota + `/manevra` redirect |
| T-5 | `DemoProjectStrip` |
| T-6 | `DemoKpiStrip` referans tile sınıflarına hizalama |
| T-7 | `DemoReadyCard` (rest-big + grup çipleri) |
| T-8 | `DemoProjectLayout` + context + log alt konum |
| T-9 | `DemoTrendChart` yeniden yazım (eksen/ölçek) |
| T-10 | faz gölgeleme + limit + band/area |
| T-11 | hover crosshair + tooltip + uç noktası |
| T-12 | `DemoDeviceTree` + `DemoStationCell` + `DemoAuxPanel` |
| T-13 | `DemoBessScada` + CSS |
| T-14 | `DemoRackTable` + `DemoRackDetail` + `demo-bess-data.ts` |
| T-15 | `DemoPcsPage` · `DemoHvacPage` · `DemoFssPage` · `DemoRmuTrPage` |
| T-16 | container thermal chart + deep-link wiring |
| T-17 | `DemoManeuverList` + `DemoOperationForm` |
| T-18 | permissives türevi + onay akışı |
| T-19 | kalibrasyon zamanlama UI + `scheduleAt` çağrısı |
| T-20 | `DemoActiveProgram` + `DemoSequences` + `DemoStationPanel` |
| T-21 | `DemoPriceChart` + `DemoHourTable` + arbitraj türevi |
| T-22 | `DemoPfkChart` + `DemoPqChart` + `DemoLvrtChart` |
| T-23 | TEİAŞ tabloları + Today/Tomorrow seg |
| T-24 | `DemoFaultList` yeniden |
| T-25 | `DemoFaultDetail` + notlu çözme |
| T-26 | enjeksiyon paneli (dummy) |
| T-27 | `DemoAdminView` + 5 alt sekme |
| T-28 | `demo-admin.ts` statik verisi |
| T-29 | `demo-registers.ts` trimmed katalog |
| T-30 | canlı Modbus trace (komut geçmişi + log) |
| T-31 | `mimic-types.ts` yeni alanlar |
| T-32 | `mapFieldToMimicState` cihaz okuma + ambient |
| T-33 | fan-out + eksik veri varsayılanı + testler |
| T-34 | `fss-simulator.ts` + JSDoc |
| T-35 | `fss/register-map.ts` + `fss-modbus-adapter.ts` |
| T-36 | `host.ts` builder + `fss-1.json` + testler |
| T-37 | `demo-plant.ts` saf türevler (standalone + günlük enerji) + testler |
| T-38 | `DemoPlantOverview.tsx` + CSS |
| T-39 | plant güç trendi entegrasyonu |
| T-40 | `DemoFieldPage` istasyon seçici + `stateForStation` + filtreli detail/attention + testler |
| T-47 | `demo-stations.ts` (2 istasyon 5+4, `stationTopo`, `stationForUnit`) + testler |
| T-48 | `DemoStationBar` + context `activeStation`/`stationKpis` + istasyon-bazlı KPI + testler |
| T-49 | PV kaynak kutuları + collector tipi (Metal Clad) + testler |
| T-50 | `DemoSourceStationView` (PV tek-hat + srcKpi) + `DemoFieldPage` kaynak görünümü geçişi + testler |
| T-51 | `buildPeakSeries`/`peakEnergySums` + "Solar production & peak shaving" grafiği + testler |
| T-52 | `field-routes.ts` station kolonu + register payload + GET + testler |
| T-53 | `telemetry-tagger.ts` + `definitions.ts#siteStationId` + `run.ts` + test |
| T-54 | `register-container.sh` `--station`/`--token-var` + `package.json#register:demo-integration` |
| T-55 | `docker-compose.yml` container-2 bloğu + `.env.example` `CONTAINER2_TOKEN` |
| T-56 | `stationsForContainers` + `mapFieldToMimicState` + Admin station alanı + `station-containers.integration.test` |
| T-57 | `DemoDevicesPage` istasyon filtresi (Battery groups + paneller `stationState`) |
| T-58 | `DEMO_PACK_SPEC` + `DemoPackSchematic` (packSvg portu) + CSS + testler |
| T-59 | `DemoManeuverPage` istasyon bazlı (units/scope/permissives/startup) |
| T-60 | `systems` execute payload (schema+passthrough, `ExecuteOptions.remoteSystem`, ön yüz POST gövdesi + stop/hedef-SOC) + testler |
| T-61 | Mod göstergesi istasyon bazlı (`bank.chargeStatus`+`deriveKpis`) + koşu listesi istasyon süzme (`steps.remoteSystem`) + testler |
| T-62 | Uzak adım üst sınırı (`remoteTimeoutMs`) + bayat run koruması (`isStaleRun`) + testler |
| T-41 | `register-sources.ts` (builder + `key`/`tipHtml`) + testler |
| T-42 | `mimic-source-map.ts` + testler |
| T-43 | `DemoRegMode.tsx` (provider + `RegisterValue` + tip + lejant) |
| T-44 | `nova-console.css` `.rv`/`#rsTip`/`.regbar` |
| T-45 | `DemoShell` Source segmenti + `DemoMimic` annotasyonu |
| T-46 | Site layout + pinfo/KPI kablolaması + testler |

## 13. İlerleme (2026-10-08 — implementasyon durumu)

| UC | Durum | Kanıt / not |
|:---|:------|:------------|
| UC-1 (konsol kabuğu + tema) | 🟢 | `DemoShell` (crumbs, 6 İngilizce sekme, Demo data, light/dark toggle, saat, footer), `demo-theme.ts` + `tokensDark.ts`/`apply-nova-vars.ts` (test yeşil) |
| UC-2 (ortak üst blok) | 🟢 | `DemoProjectLayout` (pinfo→KPI→Ready→Trends→Outlet→log), `DemoProjectStrip`, `DemoKpiStrip`, `DemoReadyCard`, `DemoEventLog`; `DemoFieldPage.test` |
| UC-3 (trend motoru) | 🟢 | `DemoTrendChart` yeniden (faz gölgeleme, limit, band/area, hover tooltip, uç nokta); `DemoTrendChart.test` (5) |
| UC-9 (veri katmanı) | 🟢 | `buildDevices.ts` + mapper (HVAC/PM5340/CONTROL-PANEL-IO/IMD/DC/ambient); `buildDevices.test` + mapper testleri |
| UC-10 (FSS simülatörü) | 🟢 | `packages/simulators/src/fss/*` + host builder + `fss-1.json` (dev+aws); `fss-simulator.test` (7) + `host.test` (6) |
| UC-4 (Devices) | 🟢 | Ağaç + station/AUX + `DemoBessScada` + raf tablosu + PCS/HVAC(live)/FSS(live)/RMU&TR/AUX(live) + container thermal chart + **pack detayı** (D-1 deterministik türetim, `demo-bess-data.ts` + `DemoPackDetail`)
| UC-5 (Operations) | 🟢 | `DemoOperationsView` (FL-01…FL-05/FL-08/09 pending/FL-11 listesi, chgdis/standby/calib/estop/maint formları, permissives, onay, aktif program + sekanslar + MV station); FL-04 zamanlama UI (At time → B-1 mesajı) |
| UC-6 (Grid & Market) | 🟢 | `DemoMarketView` referans (PTF bar + GİP çizgi + SMF + öneri + now + cap, 6'lı kartlar, saatlik tablo; TEİAŞ PFK P–f / P–Q / LVRT + frekans + telemetri) |
| UC-7 (Faults) | 🟢 | `DemoFaultsView` (Active/Resolved/All + detay + adımlar + notlu çözme) + injection paneli (D-4 dummy mesaj) |
| UC-8 (Admin) | 🟢 | `DemoAdminView` 5 sekme (mapping/params/devices/catalogue/trace) + `demo-admin.ts`/`demo-registers.ts`; trace canlı komut/log |

**Doğrulama (bu tur):** `ui` (25 dosya / 163 test), `demo-field` (10/52), `simulators` — tümü yeşil; `ui`/`demo-field`/`simulators` build başarılı; e2e hedef-SOC 1/1 + operasyon/manevra regresyon 13/13 yeşil (demo-edge stack). Kalan: yalnız KAPANIŞ.

**Ek (2026-10-08 — manevra düzenlemesi):** Operations formları referans birebir genişletildi (Monitored/Sequence/Rules + zengin permissives + adım-adım Sequences). Backend hedef SOC desteklemediğinden (B-1) hedef **frontend'de** çözüldü: `TargetSocStore` + `useTargetSocWatcher` (SOC hedefe ulaşınca `standby`), yarış korumalı; e2e `e2e/demo-target-soc.spec.ts` ile uçtan uca doğrulandı. Backend hedef/`scheduleAt` desteği gelince watcher kaldırılır.

**Ek (2026-10-08 — görünürlük düzeltmesi + Market TEİAŞ):** Referans `app.js#render` kuralları uygulandı: **Trends yalnız Site + Operations**, **Ready/Rest kartı yalnız Operations**, **Event log yalnız Site** (pinfo+KPI tüm sekmelerde). Bu, K-4'ün "üst blok tüm sekmelerde" ifadesini daraltır (referans birebir). Market TEİAŞ kartına referans `market-view.js` **İK Ek-1 Tablo 1 (20 satır telemetri)** + **Tablo 2 (8 satır komut)** tabloları + protokol notu eklendi (saf `demo-teias.ts`); reaktif güç artık PCS telemetrisinden gerçek.
