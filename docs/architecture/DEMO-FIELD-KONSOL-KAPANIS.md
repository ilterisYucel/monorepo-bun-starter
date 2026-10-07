---
status: active
space: architecture
tags: [kapanis, dogrulama, test-kapsami, field, saha, konsol, gdems, demo]
review_date: 2026-10-07
---

# DEMO-FIELD-KONSOL — Kapanış (Doğrulama + Test Kapsamı)

> **İş akışı aşaması:** 5/5 — KAPANIŞ (AGENTS.md "Geliştirme İş Akışı").
> **SPEC:** [DEMO-FIELD-KONSOL-MIMARISI.md](./DEMO-FIELD-KONSOL-MIMARISI.md) (onaylı — AK/FR/SC kaynağı).
> **Kapsam:** demo-field app + `packages/ui/src/nova/*` + `packages/platform/commands` (executor preconditions hook) +
> `services/web-service` (external series ucu, alarm resolve note, interlock wiring, demo-maneuver-integration.spec) +
> demo-edge compose (integration-service) + e2e.

## A. DOĞRULAMA

### A.1 Değişiklik Matrisi

| # | Dosya | Değişiklik | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------------|
| 1 | `apps/demo-field/src/features/demo-data/demo-topology.ts#DEMO_TOPOLOGY` | 9 ünite, fider A→H04/B→H05, hücre `motor`/`esMotor`/`auxTr`, RMU `es`, `bus`/`sections`/`rack`/`auxLoads`/`fss`, `pcsMaxMW 1.725`, `tripC`/`zeroPowerMW` limitleri | UC-1/T-1, K1 |
| 2 | `apps/demo-field/src/features/demo-data/demo-topology.test.ts` | topoloji + fider + motor/auxTr + RMU ES + künye + limit testleri | UC-1/T-2, AK-1.1..1.2 |
| 3 | `apps/demo-field/src/features/demo-data/fanOutUnits.ts#fanOutUnits` | rack SOC/V/I fan-out + PCS gücü N'e bölme | UC-2/UC-5, K1, FR-2.1 |
| 4 | `apps/demo-field/src/features/demo-data/mapFieldToMimicState.ts#mapFieldToMimicState` | 9 ünite fan-out, raf SOC/V/I türetimi, MV telemetri okuma | UC-2, FR-5.2, T-1 |
| 5 | `apps/demo-field/src/features/demo-data/mapFieldToMimicState.test.ts` | fan-out + PCS bölme + POI korunumu + raf SOC/V/I testleri | T-2, AK-1.3, FR-5.2 |
| 6 | `apps/demo-field/src/features/demo-data/demoManeuverApi.ts#DEMO_CATALOG_NAMES` | FL-01…FL-05 kataloğa eklendi (allowlist) | UC-7/T-16, FR-7.1 |
| 7 | `apps/demo-field/src/features/demo-data/demoManeuverApi.test.ts` | FL kataloğu + kapsam indirgeme testi (yeni) | T-19, AK-7.1 |
| 8 | `apps/demo-field/src/features/demo-data/demoAlarmApi.ts#demoAlarmApi` | alarm uçları (`GET /unified/alarms` + notlu `POST /alarms/resolve`) — yeni | UC-6/T-14, K6 |
| 9 | `apps/demo-field/src/features/demo-data/demoLogApi.ts#demoLogApi` | `GET /logs` istemcisi — yeni | UC-8/T-20, K8 |
| 10 | `apps/demo-field/src/features/demo-data/demoMarketApi.ts#demoMarketApi` | `GET /unified/timeseries/external` istemcisi — yeni | UC-9/T-24, K9 |
| 11 | `apps/demo-field/src/layouts/DemoShell.tsx#DemoShell` | header/footer logo + sekmeler (cihazlar/faults/market/manevra), GD-PMS fallback | UC-3/T-6, K3 |
| 12 | `apps/demo-field/src/pages/DemoFieldPage.tsx#DemoFieldPage` | `DemoContainerScada` + `DemoEventLog` entegrasyonu + mimic→Devices atlama (`#openDevices`) | T-8/T-11, UC-4/UC-5/UC-8 |
| 13 | `apps/demo-field/src/pages/DemoFieldPage.test.tsx` | boş/hata durumları (FR-1.3/AK-1.3) | T-2 |
| 14 | `apps/demo-field/src/pages/DemoDevicesPage.tsx#DemoDevicesPage` | Devices sayfası + `?tab=`/`?unit=` deep-link — yeni | UC-5/T-10, FR-5.3 |
| 15 | `apps/demo-field/src/pages/DemoFaultsPage.tsx#DemoFaultsPage` | Faults sayfası (aktif/çözülmüş + notlu resolve) — yeni | UC-6/T-13/T-14, K6 |
| 16 | `apps/demo-field/src/pages/DemoMarketPage.tsx#DemoMarketPage` | Grid & Market sayfası — yeni | UC-9/T-24, K9 |
| 17 | `apps/demo-field/src/pages/DemoManeuverPage.tsx#DemoManeuverPage` | `DemoReadyCard` + run polling entegrasyonu | UC-7/T-18, K7 |
| 18 | `apps/demo-field/src/app/routes.tsx#routes` | cihazlar/faults/market rotaları (iki eş: standalone + tünel) | UC-5/UC-6/UC-9, T-8/T-10/T-13/T-24 |
| 19 | `apps/demo-field/src/assets/logo-light.png` | GDEMS logo asset'i — yeni | UC-3/T-6, K3 |
| 20 | `packages/ui/src/nova/mimic-types.ts` | `motor`/`esMotor`/`auxTr`, `bus`/`sections`/`rack`/`auxLoads`/`fss`, `rackSoc`/`rackV`/`rackI`, `tripC`/`zeroPowerMW`/`calibrationIntervalDays` alanları | UC-1/T-1, UC-4/UC-5, K1 |
| 21 | `packages/ui/src/nova/nova-mimic.ts#createNovaMimic` | POI'ye kadar yönlü akış animasyonu + motor "M" + RMU ES çizimi | UC-2/T-3, K2 |
| 22 | `packages/ui/src/nova/nova-mimic.css` | flow-discharge/flow-charge + motor işaret stilleri | UC-2/T-4, K2 |
| 23 | `packages/ui/src/nova/nova-mimic.test.ts` | akış/motor/ES + saf yardımcı + apply-light-vars testleri | UC-2/T-5, AK-2.1..2.3 |
| 24 | `packages/ui/src/nova/apply-light-vars.ts#novaVarMap` | flow deşarj/şarj CSS değişkenleri | K2 |
| 25 | `packages/ui/src/colors/tokensLight.ts` | `discharge`/`charge` renk tokenları | K2 |
| 26 | `packages/ui/src/nova/DemoContainerScada.tsx#DemoContainerScada` | 3-sargılı TR → 2 PCS → DC CB → BUS#1/#2 → 16 raf → 4 HVAC → FSS — yeni | UC-4/T-7, K4 |
| 27 | `packages/ui/src/nova/DemoDevicePanels.tsx#DemoBatteryPanel` | MV/Battery/PCS/HVAC/RMU-TR/AUX panelleri + `DEMO_DEVICE_TABS` — yeni | UC-5/T-10, K5 |
| 28 | `packages/ui/src/nova/DemoFaultList.tsx#DemoFaultList` | `DemoFaultList` + `DemoFaultResolve` (notlu) — yeni | UC-6/T-13, K6 |
| 29 | `packages/ui/src/nova/DemoEventLog.tsx#DemoEventLog` | severity filtreli event log paneli — yeni | UC-8/T-20, K8 |
| 30 | `packages/ui/src/nova/DemoMarketView.tsx#DemoMarketView` | market grafiği + TEİAŞ kartları — yeni | UC-9/T-24, K9 |
| 31 | `packages/ui/src/nova/demo-market.ts` | TEİAŞ P–f/P–Q/enerji/frekans saf hesaplar — yeni | UC-9/T-24, FR-9.4 |
| 32 | `packages/ui/src/nova/demo-market.test.tsx` | market hesapları + boş/seri view testleri — yeni | UC-9/T-25, AK-9.3..9.4 |
| 33 | `packages/ui/src/nova/DemoReadyCard.tsx#DemoReadyCard` | Ready/Rest kartı — yeni | UC-7/T-18, K7 |
| 34 | `packages/ui/src/nova/DemoSequence.tsx#DemoSequence` | sequence adım görünümü — yeni | UC-7/T-17, FR-7.2 |
| 35 | `packages/ui/src/nova/demo-readiness.ts` | rest/readiness saf türevler (`DEMO_REST_MINUTES=30`) — yeni | UC-7/T-18, FR-7.3, K7/A5 |
| 36 | `packages/ui/src/nova/demo-readiness.test.tsx` | rest/readiness/sequence testleri — yeni | UC-7/T-19, AK-7.2..7.3 |
| 37 | `packages/ui/src/nova/DemoActiveManeuver.tsx` | `DemoSequence` kullanımına geçiş | UC-7/T-17 |
| 38 | `packages/ui/src/nova/index.ts` | barrel export'ları (yeni bileşenler + saf fonksiyonlar) | T-7..T-25, K12 |
| 39 | `packages/ui/src/nova/nova-components.test.tsx` | SCADA/Devices/Faults/EventLog component testleri | T-9/T-12/T-15/T-21, AK-4.x/5.x/6.x/8.1 |
| 40 | `packages/platform/commands/src/operation-executor.ts#OperationPrecondition` | eklemeli `preconditions` hook + red `rejected` + audit | UC-10/T-26, K10 |
| 41 | `packages/platform/commands/src/operation-executor.test.ts` | hook yokken birebir/izin/red/throw/adı-params testleri | UC-10/T-28, AK-10.1 |
| 42 | `packages/platform/commands/src/index.ts` | `OperationPrecondition`/`OperationPreconditionVerdict` export | T-26 |
| 43 | `services/web-service/src/config/container.ts#buildContainer` | field tier'da `DemoEarthingInterlock` hook wiring; diğer tier'da tanımsız | UC-10/T-27, K10/K11 |
| 44 | `services/web-service/src/infrastructure/interlock/demo-earthing-interlock.ts#DemoEarthingInterlock` | I-1 toprak interlock (şarj/deşarj red; telemetri yoksa nötr) — yeni | UC-10/T-27, FR-10.2..10.3 |
| 45 | `services/web-service/src/infrastructure/interlock/demo-earthing-interlock.spec.ts` | interlock + executor entegrasyonu — yeni | UC-10/T-29, AK-10.2..10.3 |
| 46 | `services/web-service/src/presentation/routes/unified-routes.ts#unifiedRoutes` | eklemeli `GET /timeseries/external` ucu (whitelist + parametreli, boş fallback) | UC-9/T-23, K9/K11 |
| 47 | `services/web-service/src/presentation/routes/unified-routes.test.ts` | external uç 200/400/boş testleri | UC-9/T-23, AK-9.2 |
| 48 | `services/web-service/src/presentation/routes/alarm-routes.ts` | resolve'a `note` alanı (trim + 500 cap, audit context) | UC-6, K6 |
| 49 | `services/web-service/src/presentation/routes/alarm-routes.test.ts` | resolve not audit context testi | UC-6, AK-6.2 |
| 50 | `services/web-service/src/presentation/routes/demo-maneuver-integration.spec.ts` | FL-01…FL-05 zincir entegrasyonu (Z) — yeni | UC-7/T-30, FR-7.4, AK-7.4 |
| 51 | `deployment/dev/demo-edge/docker-compose.yml` | `field-integration-service` + volume + plugins mount | UC-9/T-22, K9 |
| 52 | `deployment/aws/demo-edge/docker-compose.yml` | `field-integration-service` + volume + plugins mount | UC-9/T-22, K9 |
| 53 | `deployment/dev/demo-edge/plugins/epias-market-prices.example.json` | EPİAŞ plugin örneği (kimlik şablonu) — yeni | UC-9/T-22, K9 |
| 54 | `deployment/aws/demo-edge/plugins/epias-market-prices.example.json` | EPİAŞ plugin örneği (kimlik şablonu) — yeni | UC-9/T-22, K9 |
| 55 | `e2e/demo-maneuver-data.spec.ts` | demo-field manevra veri kontrolü (API execute + `/api/data/PCS-1/latest`) — yeni; `e2e/field-maneuver.spec.ts`'e eklenen yanlış hedefli deneme geri alındı | UC-7/T-31, AK-7.5 |
| 56 | `docs/architecture/DEMO-FIELD-KONSOL-MIMARISI.md` | SPEC revizyonu (K7/A5 eşiği 30 dk, AK-7.3 GWT hizası) | A5 kapandı |
| 57 | `e2e/demo-operations-data.spec.ts` | operasyon veri kontrolü: charge/discharge (uzak BSC + yerel PCS + SOC yönü), **farklı güç matrisi** (60/130/1000 → floor(total/2)), **timer** (süre dolunca otomatik stop), **Faults ucu** (200+dizi), standby/calibration — yeni; `full_charge`/`full_discharge` kapsam dışı (karar) | UC-7/T-31, FR-7.5 |
| 58 | `services/management-service/src/field-rules.test.ts` | bayat test düzeltmesi: commit'lenen `rules.json`'daki `demo_full_charge_rest`/`demo_full_discharge_rest` kurallarını doğrular (önceden kırık — A.4#6) | tam-suite yeşil |
| 59 | `packages/ui/src/nova/DemoContainerScada.tsx` | SCADA kartına light-tema full-width **dummy** buton ("Konteyner ekranını aç", `onOpen?`) — konteyner uygulamasına geçiş için yer | UC-4 eklemesi (kapanış sonrası) |
| 60 | `services/device-service/src/device-service.ts` + `device-service.test.ts` | worker kapsam düzeltmesi: yalnız `READ_DEVICE`/`COMMAND_DEVICE` kaydı (çoklu-tüketici bugfix) + karakterizasyon testi | K9'u bloke eden bug (A.4#8) |
| 61 | `packages/ui/src/nova/nova-components.test.tsx` | dummy buton testi (render + `onOpen`) | UC-4 eklemesi |
| 62 | `deployment/{dev,aws}/demo-edge/docker-compose.yml` | redis `--maxmemory` 64mb → **256mb** (BullMQ retention sınırlı ama 64mb demo yükünde doluyordu) | A.4#9 |
| 63 | `packages/ui/src/nova/DemoTrendChart.tsx` | Opsiyonel `padLeft`/`maxWidth` prop'ları (varsayılan birebir → diğer grafikler etkilenmez); Market `padLeft 46` + `yMax maxPrice×1.06` ile yazı taşması düzeltildi | UC-9 görsel düzeltme |
| 64 | `DemoMarketView.tsx` + `DemoMarketPage.tsx` | Market'e **3 grafik** (PTF·GÖP / GİP AOF / SMF·DGP, trendler gibi 3 sütun); prop `points` → `series: DemoMarketSeries[]`; sayfa 3 seriyi paralel çeker | UC-9/FR-9.3 |
| 65 | `deployment/{dev,aws}/demo-edge/docker-compose.yml` | `container-management-service` eklendi (konteyner tier `queue_management` tüketicisi — demo'da **kural çalıştırmaz**) | A.4#10 |
| 66 | `deployment/{dev,aws}/demo-edge/container-rules/rules.json` | Boş yerine tek **disabled no-op** kural (şema min 1 ister) → kural ateşlenmez, yalnız tüketim + log | A.4#10 |
| 67 | `e2e/demo-operations-data.spec.ts` + `e2e/demo-maneuver-data.spec.ts` | `latestByName` helper: çok satırlı `latest` telemetride **en yeni timestamp** seçilir (bayat değer bug'ı) | A.4#11 |
| 68 | `apps/demo-field/index.html` + `deployment/{dev/field/maneuvers,aws/demo-edge/field-maneuvers}/demo-operations.json` + `deployment/{dev/container/maneuvers,aws/demo-edge/container-maneuvers}/demo-maneuvers.json` | Kullanıcıya görünen **"DEMO" kelimesi kaldırıldı**: HTML title (`GD-PMS — ÜNSAL DGES`) + manevra/operasyon açıklamalarındaki `DEMO — ` öneki | UC-9/UX düzeltmesi |
| 69 | `deployment/{dev/field/device-configs,aws/demo-edge/field-device-configs}/demo-mv-1.json` | **Kritik config bug fix:** H01/H04/H05 toprak **Close/Open coil adresleri ters**ti (config Close↔sim Open) → toprak komutları ters çalışıyordu; adresler simülatör `register-map` ile hizalandı | A.4#12 |
| 70 | `e2e/demo-operations-data.spec.ts` | **I-1 canlı e2e**: kesiciyi aç → toprak kapat → charge `503 interlock_earthed` → toprak aç + kesici kapat → charge `completed` | UC-10/FR-10.2..10.3, AK-10.2/10.3 |
| 71 | `deployment/aws/demo-edge/docker-compose.yml` | **m6i.large canlı hazırlık**: `FIELD_CONNECT_ENABLED` varsayılanı `true` (konteyner→field linki; aksi halde charge rollback), `MFA_ENABLED` varsayılanı `false`, field-web-service `mem_limit 512m` | A.4#13 |
| 72 | `deployment/.env.aws-edge.example` + `deployment/aws/demo-edge/plugins/epias-market-prices.json` + `docs/process/AWS-DEPLOYMENT.md` | demo-edge standalone runbook (§8): env şablon yolu düzeltildi (demo-edge), `FIELD_UPLINK_ENABLED=false`, EPİAŞ json notu + `intervalMs=300000` | A.4#13 |
| 73 | `deployment/aws/demo-edge/field-device-configs/service.json` | **Kritik merged-network fix:** `postgresql.host` `timescaledb`→`field-timescaledb`. AWS tek edge-network'te `timescaledb` alias yalnız konteyner DB'sinde → field-device-service yanlış DB'ye yazıyordu (`devices`/`device_alarms` field DB'de oluşmuyordu) | A.4#14 |
| 74 | `tools/register-container.sh` | Konteyner service-token kaydı + bağlantı doğrulaması için tek-komut, renkli çıktılı script (elle curl yerine) | A.4#14 |

### A.2 Test Kanıtları

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| platform-commands | `bunx nx run-many -t test -p ui demo-field web-service platform-commands --skip-nx-cache` | 67/67 yeşil |
| ui | aynı komut | 139/139 yeşil |
| web-service | aynı komut | 604/604 yeşil |
| demo-field | aynı komut | 32/32 yeşil |
| build | `bunx nx run demo-field:build` | başarılı |
| build | `bunx nx run web-service:build` | başarılı |
| SPEC lint | `bun run spec:check docs/architecture/DEMO-FIELD-KONSOL-MIMARISI.md` | 0 hata / 0 uyarı |
| e2e (T-31) | `… bunx playwright test e2e/demo-maneuver-data.spec.ts e2e/demo-operations-data.spec.ts --project=chromium --workers=1` (demo-edge stack) | **13/13 yeşil** — manevra 4/4 + operasyon 9/9 (charge/discharge+güç matrisi+timer+faults+standby+calibration+**I-1 canlı toprak interlock**+temizlik) |
| tüm suite | `bunx nx run-many -t test --all --skip-nx-cache` | **29/29 proje yeşil** (kök/platform tüketicileri: management-service, container-web, field, editor, superadmin, container-desktop dahil) |
| tüm build | `bun run build` | **27/27 proje başarılı** (typecheck zinciri) |
| envanter | `bun run test:inventory` | 256 dosya / 2168 test → `docs/roadmap/test-envanteri.otomatik.md` |
| EPİAŞ canlı (K9/SC-4) | demo-edge integration-service + gerçek kimlik; `GET /api/unified/timeseries/external?source=epias&series=ptf` | ✅ `external_series`: ptf 48 · gip_wap 48 · smf 35 nokta; uç gerçek değerler (ör. `2999 TRY/MWh`) döner |

### A.3 Kabul Kriteri Kanıtları

| Kod | Kriter (SPEC özeti) | Kanıt (test/dosya) | Durum |
|:----|:--------------------|:-------------------|:------|
| AK-1.1 | fider yönü A→H04/B→H05 | `demo-topology.test.ts` "fider yönü gdems ile aynı: A→H04, B→H05" | 🟢 |
| AK-1.2 | motor/esMotor/auxTr + RMU motor/es | `demo-topology.test.ts` "hücre motor/esMotor/auxTr bayraklarını taşır" + "RMU toprak ayırıcısını (ES)…" | 🟢 |
| AK-1.3 | 9 ünite + güç korunumu | `mapFieldToMimicState.test.ts` "tek konteyneri 9 üniteye fan-out eder" + "saha toplam gücünü korur" | 🟢 |
| AK-2.1 | akış yönü sınıfı | `nova-mimic.test.ts` "AK-2.1: deşarjda…flow-discharge, şarjda…flow-charge" | 🟢 |
| AK-2.2 | motor "M" | `nova-mimic.test.ts` "AK-2.2: motorlu hücrede M işareti" | 🟢 |
| AK-2.3 | RMU ES | `nova-mimic.test.ts` "AK-2.3: RMU toprak ayırıcısı kapalıyken görünür" | 🟢 |
| AK-3.1 | logo render | `DemoShell.tsx#DemoShell` + `assets/logo-light.png` (kod inceleme; GD-PMS fallback) | 🟢 |
| AK-4.1 | baralar + raflar | `nova-components.test.tsx` "AK-4.1: 2 DC bara × 8 raf" | 🟢 |
| AK-4.2 | PCS + DC CB | `nova-components.test.tsx` "AK-4.2: 2 PCS ve DC kesici" | 🟢 |
| AK-4.3 | HVAC bölümleri + FSS | `nova-components.test.tsx` "AK-4.3: 4 HVAC bölümü ve FSS" | 🟢 |
| AK-5.1 | bölüm sekmeleri | `nova-components.test.tsx` "AK-5.1: 6 bölüm sekmesi" | 🟢 |
| AK-5.2 | raf haritası | `nova-components.test.tsx` "AK-5.2: batarya bölümü raf SOC/V/I…" + `mapFieldToMimicState.test.ts` "raf başına SOC/V/I türetir" | 🟢 |
| AK-5.3 | mimic→devices atlama | `DemoFieldPage.tsx#openDevices` + `DemoDevicesPage.tsx` deep-link (kod inceleme) | 🟢 |
| AK-6.1 | alarm listesi + filtre | `nova-components.test.tsx` "AK-6.1: aktif filtre yalnızca aktif alarmları gösterir" | 🟢 |
| AK-6.2 | resolve akışı | `alarm-routes.test.ts` "POST /alarms/resolve — not audit context'ine yazılır" + `nova-components.test.tsx` "AK-6.2: notu onConfirm'e iletir" | 🟢 |
| AK-6.3 | r06 recovery | `DemoFaultsPage.tsx#DemoFaultsPage` JSDoc + K6 (kod inceleme; `r06_recovery` kuralı mevcut) | 🟢 |
| AK-7.1 | FL listesi | `demoManeuverApi.test.ts` "FL-01…FL-05 kayıtları demo kataloğunda listelenir" | 🟢 |
| AK-7.2 | sequence adımları | `demo-readiness.test.tsx` "AK-7.2: DemoSequence adımları durumlarıyla listeler" | 🟢 |
| AK-7.3 | rest/readiness türevi | `demo-readiness.test.tsx` "AK-7.3: 30 dk önce biten full_charge…" + "kart 'dinlenme tamam' + 'hazır' gösterir" | 🟢 |
| AK-7.4 | FL-01…FL-05 uçtan uca yürütme | `demo-maneuver-integration.spec.ts` FL_CASES (5 kayıt, terminal `completed`) | 🟢 |
| AK-7.5 | telemetri veri kontrolü (PCS setpoint/durum) | `e2e/demo-maneuver-data.spec.ts` FL-05 (şarj `-50`→stop `0`); `e2e/demo-operations-data.spec.ts` charge/discharge (güç işareti + BSC `Charge/Discharge Status` 1/2 + SOC yönü), farklı güç matrisi (floor(total/2)), timer otomatik stop | 🟢 |
| AK-8.1 | log listesi + filtre | `nova-components.test.tsx` "severity filtresi yalnızca ilgili kayıtları gösterir" | 🟢 |
| AK-9.1 | servisler ayakta | `deployment/*/demo-edge/docker-compose.yml` integration-service (kod inceleme) | 🟢 |
| AK-9.2 | external okuma ucu | `unified-routes.test.ts` "GET /timeseries/external → 200 {points} (AK-9.2)" + 400/boş testleri | 🟢 |
| AK-9.3 | market grafiği | `demo-market.test.tsx` "seri varsa grafik + TEİAŞ kartları" + "seri boşsa 'veri yok'" | 🟢 |
| AK-9.4 | TEİAŞ hesapları | `demo-market.test.tsx` "AK-9.4: R=10 MW → Δf/ΔP eğimi 50 MW/Hz + 1,25 h enerji kontrolü" | 🟢 |
| AK-10.1 | hook yokken birebir | `operation-executor.test.ts` "hook yokken davranış birebir (yürütür)" | 🟢 |
| AK-10.2 | topraklı red | `demo-earthing-interlock.spec.ts` "AK-10.2…"; **canlı e2e** `demo-operations-data.spec.ts` "I-1 toprak interlock…" (H05 kesici aç → toprak kapat → charge 503 `interlock_earthed`) | 🟢 |
| AK-10.3 | toprak açık çalışır | `demo-earthing-interlock.spec.ts` "AK-10.3…"; **canlı e2e** "I-1 toprak interlock…" (toprak aç + kesici kapat → charge `completed`) | 🟢 |

### A.4 Sapmalar

| # | Sapma | Açıklama |
|:--|:------|:---------|
| 1 | K7/A5 rest eşiği 2 sa → **30 dk** (demo) | Geliştirici kararı (2026-10-07): demo dinlenme eşiği `DEMO_REST_MINUTES=30` (`demo-readiness.ts#DEMO_REST_MINUTES`). SPEC §10 A5 "✅ Kapandı" olarak güncellendi; AK-7.3 GWT buna göre revize edildi (30 dk → "dinlenme tamam"). |
| 2 | UC-6 alarm resolve'a `note` alanı eklendi | K6 "notlu resolve" gereğinin somutlaşması — additive (opsiyonel alan, trim + 500 cap, audit context). **K11'e resmen işlendi** (2026-10-07 geliştirici onayı): K11 kök-değişiklik listesine "alarm resolve `note` (additive)" eklendi. |
| 3 | UC-7 FR-7.3 "hazır" yalnız termal hazırlığı ifade eder | Readiness = termal bant (19–25 °C) türevi; rest = `full_charge`/`full_discharge` bitişinden 30 dk. e2e veri kontrolü (T-31) FL-05 için şarj→stop PCS verisiyle yapıldı; FL-04 kalibrasyon veri kontrolü takvim (S14) nedeniyle Z katmanında (`demo-maneuver-integration.spec.ts`) bırakıldı. |
| 4 | UC-9 EPİAŞ kimliği yoksa Market boş | A2 açık kaldı — uydurma veri yok. Uç/plugin kimliksiz "veri yok" döner (`unified-routes.ts` boş fallback, `DemoMarketView` "veri yok"). |
| 5 | T-31 e2e hedefi düzeltildi | İlk ekleme `e2e/field-maneuver.spec.ts` içinde `data-card-name` ile apps/field Control sayfasını (5174) hedefliyordu; demo-field `DemoManeuverWizard`'ında `data-card-name` yok. Doğru hedef demo-field (:8088) → yeni `e2e/demo-maneuver-data.spec.ts` (API execute + `/api/data/:id/latest` veri kontrolü; UI seçicisi yok). İlk deneme geri alındı. |
| 6 | management-service bayat test düzeltildi (önceden kırık) | Tam-suite koşumunda `field-rules.test.ts` kırmızı çıktı: `rules.json` (commit `7d8a2c5`) `demo_full_charge_rest`/`demo_full_discharge_rest` kurallarını içeriyor ama test (commit `ceff9f1`) yalnız 2 kural bekliyordu. Bizim değişikliğimiz değil (rules.json temiz); test commit'lenen gerçeğe güncellendi (+ demo kuralları doğrulaması). |
| 7 | `ws-tunnel` gerçek-WS backoff testi flaky | `tunnel-connector.spec.ts` "WS kopunca backoff → yeniden bağlanır" tam-suite'te bir kez kırmızı, tekrar/izole koşumda 219/219 yeşil. Bizim değişikliklerimizden bağımsız (paket dokunulmadı) — zamanlama hassasiyeti (G9). |
| 8 | device-service worker kapsam düzeltmesi (kök bugfix) | `device-service` tüm job tiplerine worker kaydettiğinden (`registerWorker`) kendi tipi olmayan `FETCH_EXTERNAL` job'larını no-op "completed" işaretliyordu → integration-service EPİAŞ verisini hiç işlemiyordu (K9 bloke). Fix: yalnız `READ_DEVICE`/`COMMAND_DEVICE` (`registerWorkerFor`). Davranış kendi tipleri için birebir; çoklu-tüketici (`WRITE_TELEMETRY` dahil) ortadan kalktı. K11'e işlendi. Karakterizasyon testi eklendi. |
| 9 | container-redis OOM (ortam/altyapı) | Uzun süre çalışan demo stack'te `container-redis` `maxmemory 64mb` + `noeviction` doldu → BullMQ job'ları işlenemedi (`OOM ... maxmemory`) → uzak BSC adımları `remote_execution_failed`, 6 operasyon e2e kırmızı. Bizim kodumuzdan bağımsız. Fix: demo-edge compose redis `256mb` (dev+aws) + çalışan stack'te runtime `CONFIG SET`. BullMQ retention zaten sınırlı (`removeOnComplete:100`); 64mb demo yüküne dardı. |
| 10 | **Kök neden (A.4#9'u geçersiz kılar):** demo konteyner tier'ında management-service yoktu | `device-scheduler.publishTelemetry` her okumada `MANAGEMENT` job'u üretiyor; gerçek konteyner stack'inde `management-service` tüketiyor, ama demo'da tüketici YOK → job'lar `queue_management:prioritized`'da sınırsız birikiyordu (6005 job) → redis OOM → `charge` operasyonu `rolled_back`. 256mb artırımı yalnızca geciktirdi. Fix: demo-edge'e `container-management-service` eklendi; **kuralları çalıştırmaz** (disabled no-op kural — gerçek kural seti test edilmedi), yalnızca kuyruğu tüketip loglar. |
| 11 | e2e helper bug'ı (uygulama sağlam) | `/api/data/:id/latest` aynı isimden çok satır döndürüyor (`Grid Active Power: [-50, 0]`); helper `Object.fromEntries` ile **sonuncu** (bayat) değeri alıyordu → charge/discharge testleri yanlış "0" görüp düşüyordu. Fix: `latestByName` (en yeni timestamp). Uygulamada sorun yoktu. |
| 12 | demo-MV toprak coil adres bug'ı (config) | `demo-mv-1.json`'da H01/H04/H05 toprak **Close/Open coil adresleri simülatörle ters**ti (config `Earth Close` → sim `ES_OPEN`): "toprağı kapat" aslında açıyordu. `register-map` (`H05_ES_OPEN=12/H05_ES_CLOSE=13` vb.) ile hizalandı (dev+aws). Aksi halde canlı I-1 testi kurulamıyordu. |
| 13 | AWS demo-edge (m6i.large) canlı hazırlık | `FIELD_CONNECT_ENABLED` default `false→true` (kritik: aksi halde AWS'te charge rollback), `MFA_ENABLED` default `true→false`, field-web-service `mem_limit 256→512m`; env şablonu demo-edge yoluna düzeltildi; EPİAŞ AWS `intervalMs=300000`; `AWS-DEPLOYMENT.md` §8 standalone runbook + API smoke. TLS/backup/MFA-geçişi §7 FLAG (demo kabulü). |
| 14 | AWS merged-network `timescaledb` alias çakışması | `device-service`, SQL bağlantısını `service.json`'dan kurar; field kopyasında `postgresql.host="timescaledb"` tek edge-network'te container DB'sine çözülüyordu → field `devices`/`device_alarms` oluşmuyor, Field `DeviceRegistry` "relation does not exist" basıyordu. Fix: `field-device-configs/service.json` → `field-timescaledb` (container kopyası `timescaledb` alias'ıyla doğru kalır). Ayrıca tek-komut kayıt/doğrulama script'i `tools/register-container.sh` eklendi. |

### A.5 Gözle Kontrol Maddeleri

- [x] Renkler `COLORS_LIGHT` token'larından (`discharge`/`charge` token eklendi; hex hardcode yok).
- [x] Bileşenler `Demo` prefix + `ui/nova` + named export (K12).
- [x] Türev/hesap fonksiyonları saf: `demo-readiness.ts`, `demo-market.ts` IO/hook taşımaz (deterministik `now`/parametre).
- [x] Kök servis/platform değişiklikleri eklemeli — hook/uc tanımsızken davranış birebir (testle kanıtlı: AK-10.1, AK-9.2 boş fallback).
- [x] `external_series` ucu parametreleri sanitize (whitelist + parametreli sorgu + limit cap).
- [x] gdems sim mantığı (dispatcher/sequencer/termal/POI) demo'ya kopyalanmadı — canlı telemetri kullanılır (A1).
- [x] Logo yüklenemezse "GD-PMS" fallback (`DemoShell.tsx`).
- [x] Kod referansları sembol çapasıyla yazıldı — satır numarası referansı yok.
- [x] `bun run spec:check` SPEC üzerinde temiz (0/0).

### A.6 Genel Durum Özeti

T-1..T-29 (topoloji hizası, mimic akış/motor/ES, logo, Container SCADA, Devices, Faults, Operations/Ready-Rest,
Event log, Market, I-1 interlock) implementasyon + testleri tamamlandı ve yeşil; T-30 (`demo-maneuver-integration.spec.ts` Z zinciri)
koştu (web-service 604 test içinde). T-31 e2e gerçek demo-edge stack'te koşuldu — **13/13 yeşil**: manevra spec'i
(`demo-maneuver-data.spec.ts`, 4/4: FL-05 şarj `-50`→stop `0`, FL-03 terminal, external uç) + operasyon spec'i
(`demo-operations-data.spec.ts`, 8/8: charge=güç `<0`/BSC şarj `1`/SOC↑, discharge=güç `>0`/BSC deşarj `2`/SOC↓,
farklı güç matrisi 60/130/1000 → `floor(total/2)`, timer otomatik stop, faults ucu 200+dizi, standby, 8 adımlı calibration)
+ kapanış temizliği (FL-01 start + standby → saha hazır). `full_charge`/`full_discharge` kapsam dışıdır (G7). SC-1 (9 ünite + fider yönü),
SC-3 (eklemeli, mevcut testler yeşil), SC-5 (toprak interlock entegrasyonu) birim/entegrasyon testlerle doğrulandı; SC-4
(Market EPİAŞ) **canlı kimlikle uçtan uca doğrulandı** (`external_series`: ptf/gip_wap/smf; uç gerçek değer döner; A2 kapandı);
SC-2 (coverage ≥ %70) bu kapanışta ayrıca ölçülmedi. Kapanış sonrası ekleme: Container SCADA kartına light-tema full-width
**dummy** buton ("Konteyner ekranını aç" — konteyner uygulamasına geçiş için yer).

**Ayrıca kök bugfix (K9'u bloke ediyordu):** `device-service` tüm job tiplerine worker kaydettiğinden `FETCH_EXTERNAL`
job'larını no-op "completed" işaretliyordu; yalnız kendi tiplerine (`READ_DEVICE`/`COMMAND_DEVICE`) kaydolacak şekilde
düzeltildi (çoklu-tüketici ortadan kalktı; karakterizasyon testi eklendi). EPİAŞ verisi bu fix sonrası aktı.

**Open-Closed denetimi (K11):** Kök servis/platform değişiklikleri yalnız ekleme — `external_series` okuma ucu (yeni GET),
`preconditions` hook (opsiyonel), alarm resolve `note` (additive), integration-service config; hook/uc yokken davranış
birebir (testle kanıtlı). Diğer tüketiciler etkilenmedi: **tam suite 29/29 proje yeşil** + **build 27/27 başarılı**
(management-service, container-web, field, editor, superadmin, container-desktop dahil). NOVA sembolleri/`COLORS_LIGHT`
yalnız demo-field tarafından tüketiliyor. `preconditions` hook tüm field tier'larda aktiftir (DEMO-MV yoksa fail-open
nötr; env bayrağı YOK — geliştirici kararı). Kök servis ayrıca bir **bugfix** içerir: device-service worker kapsamı
(yalnız kendi job tipleri — A.4#8). Kalan riskler §B.2'de listelenmiştir.

## B. TEST KAPSAMI

### B.1 Kapsam Matrisi (durum → koşul → beklenen → test ref'i)

| Durum | Koşul | Beklenen (THEN) | Test ref'i |
|:------|:------|:----------------|:-----------|
| Telemetri tam | Gerçek BSC/PCS/MV telemetrisi | Paneller canlı değerlerle dolu; 9 ünite fan-out | `mapFieldToMimicState.test.ts` "tek konteyneri 9 üniteye fan-out eder" |
| Telemetri kısmi | MV telemetrisi yok | Station varsayılan "closed" + nominal kV | `mapFieldToMimicState.test.ts` "MV telemetrisi yokken varsayılan kapalı + nominal kV" |
| Telemetri boş | Boş konteyner listesi | Boş ünite listesi (throw yok) | `mapFieldToMimicState.test.ts` "boş konteynerde boş ünite listesi döner" |
| EPİAŞ serisi boş | `external_series` tablosu yok / seri yok | Uç boş `points:[]`, Market "veri yok" | `unified-routes.test.ts` "tablo yoksa boş döner"; `demo-market.test.tsx` "seri boşsa 'veri yok'" |
| EPİAŞ serisi dolu | Canlı kimlik + integration-service (demo-edge) | `external_series` dolar; uç gerçek değer döner | demo-edge canlı doğrulama (A.2) |
| Çoklu-tüketici | device-service `start()` worker kaydı | Yalnız `READ_DEVICE`/`COMMAND_DEVICE` (başka kuyrukları tüketmez) | `device-service.test.ts` "start(): yalnız READ_DEVICE/COMMAND_DEVICE worker kaydeder" |
| Geçersiz/eksik parametre | `source`/`series` eksik veya injection denemesi | 400 (whitelist reddi) | `unified-routes.test.ts` "eksik/geçersiz param 400 (whitelist)" |
| Hook reddi | Toprak kapalı → şarj/deşarj | `rejected` + `interlock_earthed`; begin/kanal çalışmaz | `demo-earthing-interlock.spec.ts` "AK-10.2"; `operation-executor.test.ts` "hook reddederse rejected + reason" |
| I-1 canlı | H05 kesici aç + toprak kapat → charge | HTTP `503`, `interlock_earthed`; toprak aç + kesici kapat → `completed` | `e2e/demo-operations-data.spec.ts` "I-1 toprak interlock…" |
| Hook yok | `preconditions` tanımsız | Davranış birebir (yürütür) | `operation-executor.test.ts` "hook yokken davranış birebir" |
| Hook hatası | Telemetri okunamaz / throw | `precondition_error` (executor) / nötr izin (interlock) | `operation-executor.test.ts` "hook throw ederse precondition_error"; `demo-earthing-interlock.spec.ts` "MV telemetrisi okunamazsa nötr" |
| Dinlenme yok | Hiç `full_charge`/`full_discharge` yok | Dinlenme "—" (complete=false) | `demo-readiness.test.tsx` "lastFullRunFinishedAt … [] → undefined" |
| Eşik doldu | `full_charge` 30 dk önce bitti + raflar 19–25 °C | "dinlenme tamam" + "hazır" | `demo-readiness.test.tsx` "AK-7.3" |
| Alarm resolve audit hatası | Audit kaydı yazılamaz | Fail-closed (çözme reddedilir) | `alarm-routes.test.ts` (mevcut fail-closed + not testi) |
| Manevra yürütme | FL-01…FL-05 kaydı execute | Beklenen komut zinciri + terminal `completed` | `demo-maneuver-integration.spec.ts` FL_CASES |
| FL-05 fiziksel etki | Şarj (`pcs_charge`) → E-stop | Şarj `Grid Active Power=-50` → stop sonrası `≈0`, şarj/deşarj durumda değil | `e2e/demo-maneuver-data.spec.ts` "FL-05 emergency stop önce şarjı başlatıp PCS verisini durdurur" |
| Kapanış temizliği | E2E sonrası saha | FL-01 start + standby → `PCS Operation Status=1 (stby)`, güç 0 | `e2e/demo-maneuver-data.spec.ts` / `e2e/demo-operations-data.spec.ts` "temizlik…" |
| Operasyon charge | `charge` (uzak BSC + yerel PCS) | Run `completed`; PCS güç `< 0`; BSC `Charge/Discharge Status=1`; `Rack SOC R1` artar | `e2e/demo-operations-data.spec.ts` "charge: uzak BSC + yerel PCS yürür…" |
| Operasyon discharge | `discharge` | Run `completed`; PCS güç `> 0`; BSC `Charge/Discharge Status=2`; SOC düşer | `e2e/demo-operations-data.spec.ts` "discharge: güç pozitif…" |
| Operasyon standby | `standby` | PCS gücü ≈0 | `e2e/demo-operations-data.spec.ts` "standby: PCS gücü sıfıra döner" |
| Operasyon calibration | 8 adım zincir (4 uzak + 4 yerel) | Run `completed`, 8/8 outcome başarılı, saha durur | `e2e/demo-operations-data.spec.ts` "calibration: 8 adım…" |
| Farklı güç | `charge`/`discharge` 60/130/1000 kW | Her PCS `floor(total/2)` (±1) — ör. 60→−30, 130→+65, 1000→−500 | `e2e/demo-operations-data.spec.ts` "charge/discharge farklı güç: PCS başına floor(total/2)…" |
| Timer | `charge` + `timer{durationSeconds:6}` | Güç negatife iner, süre dolunca otomatik `stop` → güç ≈0 | `e2e/demo-operations-data.spec.ts` "charge + timer: süre dolunca PCS otomatik durur" |
| Faults bağlantısı | `GET /api/unified/alarms` | 200 + dizi (boş: aktif alarm yok — fault-inject kapsam dışı) | `e2e/demo-operations-data.spec.ts` "faults gerçek uca bağlı…" |

### B.2 KAPSANMAYAN Boşluklar

| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| G1 | e2e/T-31 yerel demo-edge stack'te elle koşuldu (13/13); CI otomasyonuna bağlanmadı | düşük | CI'da demo-edge stack ile `bun run test:e2e` (hedefli spec) koş |
| G2 | EPİAŞ canlı kimlikle uçtan uca **doğrulandı** (2026-10-07): integration-service plugin aktive → `external_series` dolu (ptf/gip_wap/smf) → uç gerçek değer döner. ~~A2 açık~~ | kapandı | AWS'te host'ta `.json` oluştur (imaja pişmez) |
| G3 | gdems termal iki-düğüm/FSS/POI-loop simülatörü kapsam dışı (A1 Defer) | düşük | İleri iş §11 — sim motorunun backend'e taşınması |
| G4 | FL-04 kalibrasyon veri kontrolü takvim (S14) nedeniyle Z katmanında bırakıldı | düşük | S14 kapanınca e2e veri kontrolü ekle |
| G5 | AK-5.3 / AK-6.3 / AK-9.1 kod inceleme ile kanıtlandı (otomatik component/e2e test yok) | düşük | İhtiyaçta mimic→devices atlama ve servis-kompozisyon testi |
| G6 | SC-2 (satır kapsamı ≥ %70) bu kapanışta ayrıca ölçülmedi | düşük | `bun run test:coverage` ile SonarCloud kapısı doğrula |
| G7 | `full_charge` / `full_discharge` e2e veri kontrolü kapsam dışı (karar: uzun koşu; SOC eşiği kuralına bağlı) | düşük | İhtiyaçta kısa pencere + SOC eşiği kuralı gözlemiyla ekle |
| G8 | Faults **doluluk** senaryosu doğrulanamıyor (alarm koşulu aktif edilemiyor; fault-inject SPEC §1 kapsam dışı) — uç/bağlantı 200+dizi ile kanıtlı | düşük | Simülatör alarm enjeksiyon yolu veya gerçek saha alarmı |
| G9 | `ws-tunnel` gerçek-WS backoff testi aralıklı flaky (paket dışı, bizden bağımsız) | düşük | CI'da retry veya zamanlama izolasyonu |
| G10 | `graphify update .` koşulamadı — bu ortamda `graphify` CLI PATH'te kurulu değil (yalnız opencode plugin hatırlatıcısı) | düşük | graphify CLI kurulu ortamda `graphify update .` koş |
| G11 | redis bellek kapasitesi izlenmiyor (BullMQ retention sınırlı ama 256mb da uzun koşuda dolabilir) | düşük | `used_memory` alarmı + gerekirse retention/kapasite ayarı (A.4#9) |
| G12 | Platform: tüketicisiz kuyruk sınırsız büyür (MANAGEMENT `prioritized` 6005 job) — `removeOnComplete` yalnız tamamlananları budar, bekleyenleri budamaz | orta | Ürün: tier'da ilgili tüketici zorunlu (deploy kontrolü) veya bekleyen kuyruk üst sınırı (A.4#10) |

**review_date:** 2026-10-07
