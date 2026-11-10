---
status: active
space: architecture
tags: [kapanis, dogrulama, test-kapsami, field, saha, scada, demo]
review_date: 2026-10-07
---

# DEMO-FIELD — Kapanış (Doğrulama + Test Kapsamı)

> **İş akışı aşaması:** 5/5 — KAPANIŞ (AGENTS.md "Geliştirme İş Akışı").
> **SPEC:** [DEMO-FIELD-MIMARISI.md](./DEMO-FIELD-MIMARISI.md) (onaylı — AK/FR/SC kaynağı; 11 UC, T-1…T-49).
> **Doğrulama tarihi:** 2026-10-07 — T-1…T-48 tamam; T-49 (AWS smoke) bu ortamda koşulamadı (stack yok).
> **Not:** Değişiklikler working-tree (commit'siz) — kod referansları `#sembol` çapasıyla, satır numarası yok.

## A. DOĞRULAMA

### A.1 Değişiklik Matrisi

| # | Dosya | Değişiklik | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------------|
| 1 | `apps/demo-field/**` (package/project/vite/vitest/tsconfig) | YENİ — Nx app iskeleti (`demo-field`), dev/build/test/test-integration hedefleri | K1 / UC-1 / T-1 |
| 2 | `apps/demo-field/src/lib/*#apiClient` `#apiBase` `#siteField` `#queryClient` `#authNavigation` `#clientLogger` | YENİ — field'dan ince kopya (auth/api/query) | T-2 / UC-1 |
| 3 | `apps/demo-field/src/features/demo-data/demo-topology.ts#demoTopology` | YENİ — statik site config (fider/limit/eşleme) | T-6 / UC-2 |
| 4 | `apps/demo-field/src/features/demo-data/fanOutUnits.ts#fanOutUnits` | YENİ — 1→6 deterministik fan-out | T-7 / UC-2 / FR-2.1 |
| 5 | `apps/demo-field/src/features/demo-data/mapFieldToMimicState.ts#mapFieldToMimicState` | YENİ — telemetri→mimic state (bank/PCS/DC + demo-MV + türetme) | T-8 / UC-2 / FR-2.2..2.6 |
| 6 | `apps/demo-field/src/features/demo-data/deriveKpis.ts#deriveKpis` | YENİ — 7 KPI türevi | T-15 / UC-4 / FR-4.1 |
| 7 | `apps/demo-field/src/features/demo-data/deriveAlerts.ts#deriveAlerts` | YENİ — severity sıralı uyarı türevi | T-15 / UC-4 / FR-4.2 |
| 8 | `apps/demo-field/src/features/demo-data/buildTrendSeries.ts#buildTrendSeries` | YENİ — downsampled telemetriden seri türevi | T-26 / UC-6 / FR-6.1 |
| 9 | `apps/demo-field/src/features/demo-data/useDemoFieldData.ts#useDemoFieldData` | YENİ — containers + latest telemetry polling hook | T-4 / UC-1 / FR-1.1 |
| 10 | `apps/demo-field/src/features/demo-data/demoApi.ts#demoApi` `demoManeuverApi.ts#demoManeuverApi` | YENİ — katalog filtre + execute + runs | T-21 / UC-5 / FR-5.x |
| 11 | `apps/demo-field/src/pages/DemoFieldPage.tsx#DemoFieldPage` `DemoManeuverPage.tsx#DemoManeuverPage` `LoginPage.tsx#LoginPage` | YENİ — saha/manevra/login sayfaları | T-3 / UC-1 / UC-5 |
| 12 | `apps/demo-field/src/features/auth/session-auth.ts#sessionAuth` + `stores/AuthStore.ts` | YENİ — Bearer/tünel session kimliği | T-2 / UC-1 / FR-1.2 |
| 13 | `apps/demo-field/integration/demo-maneuver.integration.test.ts#demoManeuverIntegration` | YENİ — stack'e karşı entegrasyon testleri (default workspace DIŞI) | T-43 / UC-10 / FR-10.4..10.6 |
| 14 | `apps/demo-field/deployment/Dockerfile` | YENİ — demo SPA imajı + `VITE_FIELD_ID` guard | T-46 / UC-11 / FR-11.3 |
| 15 | `packages/ui/src/nova/nova-mimic.ts#createNovaMimic` (+ `#computeEnergization` saf yardımcılar) | YENİ — framework'suz SVG fabrikası (6 ünite) | K5 / UC-3 / T-10/T-11 |
| 16 | `packages/ui/src/nova/DemoMimic.tsx#DemoMimic` `DemoKpiStrip.tsx` `DemoKpiTile.tsx` `DemoAlertList.tsx` `DemoUnitDetail.tsx` `DemoCellDialog.tsx` `DemoTrendChart.tsx` `DemoManeuverCard.tsx` `DemoManeuverWizard.tsx` `DemoActiveManeuver.tsx#DemoStopButton` | YENİ — React sarmalayıcılar (Demo prefix) | K2/K3 / UC-3..UC-6 |
| 17 | `packages/ui/src/nova/nova-mimic.css` + `apply-light-vars.ts#applyDemoLightVars` | YENİ — mimic stilleri + `:root` `--nm-*` enjeksiyonu | T-12 / UC-3 / FR-3.4 |
| 18 | `packages/ui/src/nova/index.ts` | YENİ — nova barrel | T-33 / UC-7 / FR-7.3 |
| 19 | `packages/ui/src/colors/tokensLight.ts#lightTokens` `#COLORS_LIGHT` `#COLOR_LIGHT` `#hexToRgbTriple` | YENİ — light token seti + RGB türevleyici (koyu set dokunulmadı) | K4 / UC-7 / T-29 |
| 20 | `packages/ui/src/icons/demo-icons.tsx#NOVA_ICONS` | YENİ — 19 çizgi ikon | T-31 / UC-7 / FR-7.2 |
| 21 | `packages/ui/src/icons/types.ts#ScadaIconName` + `nav-icons.tsx#SCADA_ICONS` | `nova*` union + mapping genişletmesi (mevcut ikonlar değişmez) | T-31 / UC-7 |
| 22 | `packages/ui/src/colors/index.ts` `icons/index.ts` `src/index.ts` | Barrel export genişletmesi (`COLORS_LIGHT`, `NOVA_ICONS`, `nova/*`) | T-33 / UC-7 |
| 23 | `packages/simulators/src/host.ts#resolveBscPcsTarget` | `applyBmsTarget` → module-level `resolveBscPcsTarget`; `connector.sim.target` env'i EZER (additive — tanımsızken davranış birebir) | K12 / UC-8 / T-36 / FR-8.3 |
| 24 | `packages/simulators/src/host.ts#registerDefaults` | `demo-mv-station` builder kaydı (eklemeli) | UC-9 / T-37 |
| 25 | `packages/simulators/src/demo-mv-station/*` (`simulator.ts#DemoMvStationSimulator` + register-map + adapter) | YENİ — MV simülatörü (H01–H05 + toprak, kV/Hz, interlock) | UC-9 / T-37 |
| 26 | `packages/simulators/src/index.ts` | Barrel export (`DemoMvStationSimulator`/`DemoMvStationAdapter`) | UC-9 |
| 27 | `services/web-service/src/infrastructure/commands/load-maneuver-records.ts#loadTierManeuverRecords` | `MANEUVER_FILES`/`OPERATION_FILES` — `demo-*` dosyaları eklemeli okur (additive — dosya yokken davranış birebir) | K8 / UC-10 / T-41 / FR-10.1 |
| 28 | `deployment/dev/field/device-configs/pcs-2.json` | YENİ — PCS-2 config (unitId 2, bmsPort 15503) | T-34 / UC-8 / FR-8.1 |
| 29 | `deployment/dev/field/docker-compose.yml` | `15503:15503` port yayını | T-34 / UC-8 |
| 30 | `deployment/dev/container/device-configs/bsc-2.json#connector` | BSC-2 connector bloğu + `sim.target.port=15503` | T-35 / UC-8 / FR-8.2 |
| 31 | `deployment/dev/container/device-configs/mappings/bsc-2-pcs-mapping.json` | YENİ — BSC-2→PCS-2 mapping | T-35 / UC-8 |
| 32 | `deployment/dev/field/device-configs/demo-mv-1.json` | YENİ — demo MV config (telemetri + commands) | T-39 / UC-9 / FR-9.3 |
| 33 | `deployment/dev/field/maneuvers/demo-maneuvers.json` + `demo-operations.json` | YENİ — 5 manevra + `demo_calibration` operasyonu | T-40 / UC-10 / FR-10.2 |
| 34 | `deployment/dev/field/rules/rules.json` | EKLEMELİ — `demo_full_charge_rest`/`demo_full_discharge_rest` kuralları (mevcut kurallar değişmez) | K11 / UC-10 / T-42 / FR-10.3 |
| 35 | `deployment/aws/demo-edge/**` (compose + nginx + prod config kopyaları) | YENİ — ayrı ürün dizini; `container-web` servisi YOK; `FIELD_WS_URL` uplink | K14 / UC-11 / T-45/T-47 |
| 36 | `package.json` | `dev:demo-field`, `test:demo-integration`, `start/stop:aws-demo-edge` script'leri | T-44 / UC-10 / UC-11 |
| 37 | `vitest.workspace.ts` | `apps/demo-field` workspace kaydı | T-1 / UC-1 |
| 38 | `bun.lock` | `demo-field` workspace kilitlenmesi (yeni bağımlılık YOK) | T-1 |
| 39 | `deployment/.env.aws-demo-edge.example` | YENİ — AWS demo env şablonu (FIELD_ID/CONTAINER_ID/PCS_BMS_TARGET_*/JWT_SECRET) | T-48 / UC-11 / FR-11.5 |
| 40 | `deployment/dev/demo-edge/docker-compose.yml` + `.env.example` | YENİ — YEREL demo/entegrasyon stack'i (UI'suz konteyner + field + demo-field SPA; tek dosya/network; `field-data-service` dahil) | T-43/T-44 / UC-11 |
| 41 | `deployment/dev/field/device-configs/pcs-2.json` + `deployment/aws/demo-edge/field-device-configs/pcs-2.json` | `connection.port=503` (PCS-1/PCS-2 simülatör port çakışması düzeltmesi) | UC-8 |
| 42 | `apps/demo-field/src/features/demo-data/useDemoFieldTelemetry.ts` + `mapFieldToMimicState.ts#MapFieldOptions` | field-tier telemetri (PCS/MV) unified`dan çekilip mimic state'e birleştirilir | UC-2 |
| 43 | `package.json` | `start:demo-integration`/`stop:demo-integration` script'leri | T-44 |
| 44 | `deployment/dev/field/docker-compose.yml` | (yalnız bilgi) `15503:15503` portu; demo stack bunu kullanmaz (network içi) | UC-8 |

### A.2 Test Kanıtları

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| demo-field (birim) | `npx nx run demo-field:test` | 6 dosya / 23 test yeşil |
| demo-field (build) | `npx nx run demo-field:build` | başarılı (chunk-size uyarısı — kabul) |
| ui nova bileşenleri | `cd packages/ui && npx vitest run src/nova/` | 3 dosya / 14 test yeşil |
| ui token + ikon | `cd packages/ui && npx vitest run src/colors/tokensLight.test.ts src/icons/demo-icons.test.tsx` | 2 dosya / 7 test yeşil |
| simulators (MV + host + connector) | `cd packages/simulators && npx vitest run src/demo-mv-station src/host.test.ts src/host-connector-target.test.ts` | 3 dosya / 13 test yeşil |
| web-service (yükleyici) | `cd services/web-service && npx vitest run src/infrastructure/commands/load-maneuver-records.test.ts` | 1 dosya / 4 test yeşil |
| entegrasyon (gerçek yerel stack) | `bun run test:demo-integration` | 1 dosya / **8 test yeşil** (tüm manevralar + powerKw + timer + interlock) |
| entegrasyon (stack yok) | `DEMO_STACK_URL=http://127.0.0.1:5999 bun run test:demo-integration` | net hata "Demo stack erişilemedi" (FR-10.6 doğrulandı, sessiz skip YOK) |
| demo/entegrasyon dev stack | `bun run start:demo-integration` (UI'suz konteyner + field + demo-field SPA) | tüm konteynerler ayakta; `demo-field-web:8088` 200; PCS/MV unified latest 5610 satır |
| demo-field SPA proxy | `curl :8088/api/...` (login + containers + unified) | login 200, containers 200, unified latest akar |
| AWS demo compose | `docker compose -f deployment/aws/demo-edge/docker-compose.yml config` (env ile) | geçerli; `container-web` servisi yok |
| dev demo compose | `docker compose -f deployment/dev/demo-edge/docker-compose.yml config` (env ile) | geçerli; `container-web` yok, `field-web` (demo SPA) var |
| lint kapısı | `bun run spec:check docs/architecture/DEMO-FIELD-MIMARISI.md` | 0 hata, 0 uyarı |

### A.3 Kabul Kriteri Kanıtları

| Kod | Kriter (SPEC özeti) | Kanıt (test/dosya) | Durum |
|:----|:--------------------|:-------------------|:------|
| AK-1.1 | containers yanıtı hook'tan erişilebilir | `useDemoFieldData.ts#useDemoFieldData` + `DemoFieldPage.test.tsx` / `site-field.test.ts` | 🟢 |
| AK-1.2 | istek başlığında Bearer/session kimliği | `api-client.ts#apiClient` + `session-auth.ts#sessionAuth` | 🟢 |
| AK-1.3 | hata yanıtında boş durum render edilir | `DemoFieldPage.test.tsx` | 🟢 |
| AK-2.1 | determinizm + 6 ünite | `mapFieldToMimicState.test.ts` + `demo-topology.test.ts` | 🟢 |
| AK-2.2 | bank↔BSC eşlemesi | `mapFieldToMimicState.test.ts` | 🟢 |
| AK-2.3 | güç korunumu | `mapFieldToMimicState.test.ts` | 🟢 |
| AK-2.4 | ΔV/raf türetme | `mapFieldToMimicState.test.ts` | 🟢 |
| AK-2.5 | PCS durum eşlemesi | `mapFieldToMimicState.test.ts` | 🟢 |
| AK-2.6 | MV telemetri + fider/CT türetme | `mapFieldToMimicState.test.ts` | 🟢 |
| AK-3.1 | 6 ünite SVG'de çizilir | `nova-mimic.test.ts` | 🟢 |
| AK-3.2 | enerji durumu güncellenir | `nova-mimic.test.ts` | 🟢 |
| AK-3.3 | overlay/seçim/tıklama çalışır | `nova-mimic.test.ts` + `nova-components.test.tsx` | 🟢 |
| AK-3.4 | token tabanlı CSS değişkenleri | `apply-light-vars.ts#applyDemoLightVars` + `nova-mimic.test.ts` | 🟢 |
| AK-4.1 | 7 KPI ve doğru ortalama | `deriveKpis.test.ts` | 🟢 |
| AK-4.2 | severity sıralaması | `deriveKpis.test.ts` (describe `deriveAlerts`) | 🟢 |
| AK-4.3 | ünite detay içeriği | `nova-components.test.tsx` (DemoUnitDetail) | 🟢 |
| AK-4.4 | hücre ölçü + kumanda butonu | `nova-components.test.tsx` (DemoCellDialog) | 🟢 |
| AK-4.5 | interlock reddi gösterimi | `demo-maneuver.integration.test.ts` (gerçek stack interlock ✓) | 🟢 |
| AK-5.1 | `demo_*` filtresi | `demoManeuverApi.ts#demoManeuverApi` + `DemoManeuverWizard.test.tsx` | 🟢 |
| AK-5.2 | deviceIds indirgemesi | `DemoManeuverWizard.test.tsx` | 🟢 |
| AK-5.3 | şema-driven parametre + onay | `DemoManeuverWizard.test.tsx` | 🟢 |
| AK-5.4 | execute gövdesi | `DemoManeuverWizard.test.tsx` | 🟢 |
| AK-5.5 | aktif run adımları | `DemoActiveManeuver.tsx` + `DemoManeuverWizard.test.tsx` | 🟢 |
| AK-5.6 | stop manevrası, iptal yok | `demoManeuverApi.ts#demoManeuverApi` (kod inceleme) | 🟢 |
| AK-6.1 | seri türetimi | `buildTrendSeries.test.ts` | 🟢 |
| AK-6.2 | SVG grafik çizimi | `nova-components.test.tsx` (DemoTrendChart) | 🟢 |
| AK-6.3 | boş durum | `buildTrendSeries.test.ts` + `nova-components.test.tsx` | 🟢 |
| AK-7.1 | light token + sayısal karşılık | `tokensLight.test.ts` | 🟢 |
| AK-7.2 | 19 ikon kaydı | `demo-icons.test.tsx` | 🟢 |
| AK-7.3 | nova barrel export | `nova/index.ts` (kod inceleme) | 🟢 |
| AK-7.4 | hex hardcode yok | kod inceleme (grep hex) | 🟢 |
| AK-8.1 | PCS-2 config + port | `pcs-2.json` + `docker-compose.yml` (kod inceleme) | 🟢 |
| AK-8.2 | BSC-2→PCS-2 connector | `bsc-2.json#connector` + `bsc-2-pcs-mapping.json`; dev stack'te PCS-2 online + telemetri | 🟢 |
| AK-8.3 | connector.sim.target uygulanır | `host-connector-target.test.ts` (3 test) | 🟢 |
| AK-8.4 | mevcut davranış korunur | `host.test.ts` (5 test) + `host-connector-target.test.ts` | 🟢 |
| AK-9.1 | MV telemetrisi üretilir | `demo-mv-simulator.test.ts` | 🟢 |
| AK-9.2 | interlock reddi | `demo-mv-simulator.test.ts` | 🟢 |
| AK-9.3 | komut config eşlemesi | `demo-mv-1.json` + `demo-maneuver.integration.test.ts` (komut+readback, gerçek stack) | 🟢 |
| AK-9.4 | mevcut simülatörler değişmez | `host.test.ts` (mevcut builder regresyonu) | 🟢 |
| AK-10.1 | demo dosyaları yüklenir + mevcut katalog korunur | `demo-maneuver.integration.test.ts` (gerçek stack ✓) | 🟢 |
| AK-10.2 | altı nova kaydı mevcut | `demo-maneuver.integration.test.ts` (manevra+operasyon kataloğu, gerçek stack) | 🟢 |
| AK-10.3 | eklemeli kural + mevcut korunur | `rules.json` + `demo-field-management-service` sağlıklı yüklendi | 🟢 |
| AK-10.4 | uçtan uca manevra tamamlanır | `demo-maneuver.integration.test.ts` (charge → PCS gücü negatif + **BSC SOC artar**, gerçek stack) | 🟢 |
| AK-10.5 | interlock reddi | `demo-maneuver.integration.test.ts` (toprak kapalı kalır, gerçek stack) | 🟢 |
| AK-10.6 | stack yokluğunda net hata | `bun run test:demo-integration` → net hata (exit 1), skip YOK | 🟢 |
| AK-10.7 | dosya yokken davranış korunur | `load-maneuver-records.test.ts` (4 test) | 🟢 |
| AK-11.1 | ayrı ürün dizini, edge değişmez | `deployment/aws/demo-edge/` + `deployment/aws/edge` diff yok (kod inceleme) | 🟢 |
| AK-11.2 | container-web yok + uplink | `docker-compose.yml` (compose config: `container-web` yok; `FIELD_WS_URL` mevcut) | 🟢 |
| AK-11.3 | VITE_FIELD_ID guard | `apps/demo-field/deployment/Dockerfile` (RUN test guard) — imaj build'i koşulmadı | 🟢 |
| AK-11.4 | prod demo config'leri mevcut | `deployment/aws/demo-edge/` config dizinleri (kod inceleme) | 🟢 |
| AK-11.5 | env örneği tam | `deployment/.env.aws-demo-edge.example` (FIELD_ID/CONTAINER_ID/PCS_BMS_TARGET_*/JWT_SECRET zorunlu listesi) | 🟢 |

### A.4 Sapmalar

| # | Sapma | Açıklama |
|:--|:------|:---------|
| 1 | `DemoStopButton` ayrı dosya değil | SPEC T-24 `DemoStopButton.tsx` öngörüyordu; gerçekte `DemoActiveManeuver.tsx#DemoStopButton` içinde export edildi (dosya başına tek sorumluluk korunur, barrel'da `DemoActiveManeuver, DemoStopButton` birlikte). Davranış aynı. |
| 2 | `apps/demo-field/deployment/Dockerfile` COPY kaynağı (DÜZELTİLDİ) | İlk üretimde `COPY --from=builder /app/apps/field/dist` idi (copy-paste kalıntısı, imaj build'ini engellerdi). `/app/apps/demo-field/dist` olarak düzeltildi. |
| 3 | `apps/demo-field/deployment/Dockerfile` baked nginx upstream (DÜZELTİLDİ) | Baked conf `proxy_pass http://web-service:5002` kullanıyordu; field bağlamına uygun `http://field-web-service:5002` olarak düzeltildi (AWS'de mount conf zaten ezerdi). |
| 4 | `.env.example` yeri (KONVANSİYON) | SPEC Involved Files `deployment/aws/demo-edge/.env.example` öngörüyordu; AGENTS konvansiyonu kök şablonu (`deployment/.env.<tier>.example`) zorunlu kılar. `deployment/.env.aws-demo-edge.example` kökte üretildi (tüm zorunlu değişkenler belgeli). |
| 5 | Entegrasyon testleri koşuldu | `deployment/dev/demo-edge` yerel demo/entegrasyon stack'i kaldırıldı; `bun run test:demo-integration` gerçek stack'te 4/4 yeşil → AK-4.5/AK-8.2/AK-9.3/AK-10.1..10.5 🟢. |
| 6 | AWS demo compose `container-web` servisi yok | K14 gereği container ön yüzü yok; `docker compose config` ile doğrulandı (yalnızca `container-web-service` var, `container-web` nginx yok). Bu bir sapma değil — SPEC kararı. |
| 7 | Yerel demo stack'e `field-data-service` eklendi | Field-tier telemetri (PCS/MV) `queue_write_telemetry` üretiyor; mevcut dev/AWS field stack'lerinde TÜKETİCİ yok → `unified/telemetry/latest` boş kalıyordu. `field-data-service` hem dev demo stack'ine hem `deployment/aws/demo-edge`'e eklendi (field-redis + field-timescaledb). |
| 8 | PCS-2 Modbus portu 503 | `pcs-2.json` pcs-1 kopyasıydı (port 502) → `SimulatorHost` port çakışması fail-fast verdi. `connection.port=503` yapıldı (dev + aws kopya). |
| 9 | Konteyner kaydı manuel | Merged stack'te konteyner field'a OTOMATİK register olmaz; `POST /api/fields/:id/containers/:cid/register` (CONTAINER_TOKEN) ile kaydedilip WS uplink kuruldu. Otomasyon için B.2/G8. |

### A.5 Gözle Kontrol Maddeleri

- [x] Purity 1 — `features/demo-data/**` saf: `Date.now()`/rastgele/IO yok; zaman+telemetri girdi olarak geçer (grep — `useDemoFieldData` dışında yan etki yok)
- [x] Purity 2 — renkler `COLORS_LIGHT`/`COLOR_LIGHT` token'larından; nova dosyalarında hex hardcode yok (grep)
- [x] Purity 3 — named export only; `Demo` prefix'li bileşenler; `nova/index.ts` barrel güncel; default export yok
- [x] Purity 4 — `createNovaMimic` yalnız verilen `svg`'e yazar; global state yok; `destroy()` temizler
- [x] Purity 5 — Open-Closed: `services/*` mevcut uçları değişmedi; yalnız `load-maneuver-records.ts` eklemeli demo dosya desteği (dosya yokken birebir), `host.ts` `connector.sim.target` additive (tanımsızken birebir)
- [x] Purity 6 — manevra/model değişiklikleri mevcut API sözleşmesini tüketir; endpoint sözleşmeleri değişmedi
- [x] Purity 7 — entegrasyon testleri default vitest workspace DIŞI (`vitest.integration.config.ts`); stack yoksa net hata (skip yok)
- [x] Koyu token seti (`tokens.ts`) dokunulmadı — yalnızca `tokensLight.ts` eklendi (K4)
- [x] `deployment/aws/edge` diff'siz (K14) — `git diff deployment/aws/edge` boş
- [x] Yeni bağımlılık YOK — `package.json`/`bun.lock`'ta yalnızca workspace/script eklemeleri
- [x] DI — yeni sınıflar birincil constructor + config obje; `DemoMvStationSimulator` `network` config alır
- [x] Async loop — `useDemoFieldData` polling'de `for...of await` yok (React Query)
- [x] Yaşam döngüsü — `demo-mv-station` simülatörü mevcut `IModbusSimulatorAdapter` sözleşmesini uygular

### A.6 Genel Durum Özeti

DEMO-FIELD uygulaması SPEC'in tüm 11 UC'sini kapsayacak şekilde uygulandı: `apps/demo-field` ince tüketici, `packages/ui/src/nova` paylaşımlı bileşenler, `packages/ui/src/colors/tokensLight.ts` light token'lar + 19 demo ikonu, `packages/simulators/src/demo-mv-station` yeni MV simülatörü, `host.ts#resolveBscPcsTarget` connector hedef çözümü ve `load-maneuver-records.ts#loadTierManeuverRecords` eklemeli demo katalog desteği. Birim testlerinin tamamı yeşil (demo-field 23, ui 21, simulators 13, web-service 4); build başarılı; `spec:check` temiz. Open-Closed korundu (koyu token seti, mevcut simülatör/servis uçları, `deployment/aws/edge` diff'siz). Reviewer'ın tespit ettiği iki üretim hatası düzeltildi: `apps/demo-field/deployment/Dockerfile` COPY kaynağı `apps/demo-field/dist`'e çevrildi ve baked nginx upstream `field-web-service`'e hizalandı; `deployment/.env.aws-demo-edge.example` üretildi (AK-11.5 🟢). Yerel demo/entegrasyon stack'i (`deployment/dev/demo-edge`, UI'suz konteyner + field + demo-field SPA) kaldırıldı; `bun run test:demo-integration` gerçek stack'te **4/4 yeşil** (AK-4.5/AK-8.2/AK-9.3/AK-10.1..10.5 🟢). Bu koşum sırasında üç entegrasyon açığı düzeltildi: field-tier telemetri için `field-data-service` eklendi, PCS-2 Modbus portu 503'e çekildi ve konteyner field'a register edildi. **Kalan eksik:** AWS smoke (T-49) ve konteyner otomatik register (G8); kural tetikleme e2e (G9); `field-data-service`'in AWS demo-edge'e taşınması (G10). **review_date:** 2026-10-07.

### A.7 Takip Düzeltmeleri (gözle kontrol sonrası)
- **Sunumsal offset kaldırıldı** (SPEC K6 revize): 6 sanal ünite artık gerçek değeri BİREBİR yansıtır (gerçek %50 → hepsi %50); yalnızca PCS gücü 6'ya bölünür. `fanOutUnits.ts` + testler güncellendi.
- **Trend grafikleri düzeltildi:** konteyner tünel `downsampled` bu kurulumda boş dönüyordu (telemetry-query kanal uyuşmazlığı). Kaynak `unified/telemetry/downsampled?deviceIds=PCS-1,PCS-2,DEMO-MV-1` oldu; `buildTrendSeries` canonical `soc`/`power_kw`/`max_cell_temp` ile beslenir (canlı doğrulama: 11452 satır, her seri 56 örnek).
- **Işık tema:** header yalnız `GD-PMS`, DemoShell/Login/body `COLORS_LIGHT` (koyu token'lar demo shell'de kullanılmıyor).
- Doğrulama: demo-field 23/23, entegrasyon 4/4, build ✓; `field-web` yeniden build edildi.
### A.8 Şarj/Deşarj Fiziksel Etki Düzeltmesi
- **Bulgu:** `charge` komutu PCS'e ulaşıyordu ama SOC artmıyordu — SOC'yi üreten BSC simülatörü kendi şarj modu+setpointiyle hareket eder; demo manevrası BSC'ye dokunmuyordu (BSC→PCS connector tek yönlü). Entegrasyon testi yalnız run 'completed'ı doğruluyordu (boşluk).
- **Kök neden 1:** merged compose'da konteyner `TUNNEL_API_UPSTREAM` eksikti → uzak komut/stream kanalı kırık (`tunnel_stream_failed`). Eklendi.
- **Kök neden 2:** oturum staleness — konteyner restart edilince field eski oturumu cache'liyor (401). Geçici: restart sırası (sonra field). Kalıcı çözüm G11.
- **Düzeltme:** `charge`/`discharge` artık çapraz katman operasyonu (uzak `bsc_charge`/`bsc_discharge` + yerel `pcs_charge`/`pcs_discharge`) — gerçek `field_charge` deseni; BSC config'e EKLEMELİ şarj/deşarj setpoint komutları + konteyner `demo-maneuvers.json`.
- **İsimlendirme:** `demo_*` → `charge`/`discharge`/`full_charge`/`full_discharge`/`calibration`/`standby` (sihirbaz allowlist); Durdur=`standby`; kurallar `standby` operasyonunu tetikler.
- **Kanıt:** entegrasyon 3/3 — `charge` → PCS gücü negatif + BSC SOC 50,12→50,8+; `standby` → güç ~0. SPEC K15/FR-10.2/AK-10.4 güncellendi.
- Doğrulama: demo-field 23/23, entegrasyon 3/3, build ✓; `field-web` yeniden build edildi.

- **A.9 Tüm Manevralar + powerKw + Zamanlı Durdurma**
- **powerKw yayılımı:** demo operasyonlarındaki literal params kaldırıldı; `powerKw` hem PCS (`pcs_charge` divideTotal) hem BSC (`bsc_charge` setpoint divideTotal) katmanına yayılır. Entegrasyon: powerKw=20 → BSC setpoint 10 kW (2 BSC).
- **SOC limitleri (97 / 3,5):** `bsc-math` MAX/MIN + simülatör clamp doğrulandı; `bsc-simulator.test.ts`'e iki clamp testi eklendi (7/7).
- **Zamanlı durdurma:** birim **saniye** yapıldı; `options.timer` additif olarak uzak adıma iletildi (`IRemoteCommandChannel`/`runRemoteStep`/`TunnelManeuverChannel` gövdesi). Entegrasyon: charge+timer 5 sn → BSC `CommandRequest=3` (stop) + PCS gücü 0 + SOC sabit.
- **Tüm manevra e2e:** charge (SOC↑, güç<0), discharge (SOC↓, güç>0), full_charge/full_discharge (tamamlanır), calibration, standby (güç~0), timer, interlock — **8/8**.
- Dokümantasyon: SPEC K15/K16/FR-5.7/AK-5.7/FR-10.2/AK-10.8 eklendi; `spec:check` temiz.

## B. TEST KAPSAMI

### B.1 Kapsam Matrisi (durum → koşul → beklenen → test ref'i)

| Durum | Koşul | Beklenen (THEN) | Test ref'i |
|:------|:------|:----------------|:-----------|
| Veri tam | containers + latest telemetri var | 6 ünite + bank/PCS/MV gerçek değerlerle dolu | `mapFieldToMimicState.test.ts` |
| Telemetri boş | `containers=[]` | `units=[]`, KPI'lar `—`, throw yok | `mapFieldToMimicState.test.ts` + `DemoFieldPage.test.tsx` |
| PCS-2 telemetrisi yok | banka B PCS eksik | PCS `'off'`, UI çalışır | `mapFieldToMimicState.test.ts` |
| demo-MV telemetrisi yok | station verisi yok | statik topoloji varsayılanı, hücre salt-okunur | `mapFieldToMimicState.test.ts` |
| Fan-out determinizm | aynı girdi iki çağrı | birebir aynı 6 ünite | `mapFieldToMimicState.test.ts` (golden fixture) |
| PCS durum eşlemesi | `PCS Operation Status` 0/1/2/3/6 | off/stby/chg/dis/fault | `mapFieldToMimicState.test.ts` |
| ΔV türetme | `Rack Max/Min Cell Voltage Rn` | `dvmV = max−min` | `mapFieldToMimicState.test.ts` |
| KPI türetme | geçerli state | 7 KPI kutusu + ortalama SOC | `deriveKpis.test.ts` |
| Uyarı sıralaması | alarm + warn birlikte | alarm satırları önce | `deriveKpis.test.ts` (deriveAlerts) |
| Uyarı yok | temiz state | boş liste / "durum yok" satırı | `deriveKpis.test.ts` |
| Trend serisi | N downsampled örnek | zaman sıralı SOC/MW/°C noktaları | `buildTrendSeries.test.ts` |
| Trend boş | seri yok | "veri yok" mesajı | `buildTrendSeries.test.ts` + `nova-components.test.tsx` |
| Mimic kurulumu | geçerli topoloji | 6 `.demo-unit` düğümü SVG'de | `nova-mimic.test.ts` |
| Mimic enerji güncelleme | H01 kapalı + fider kapalı | hattın `live` sınıfı doğru | `nova-mimic.test.ts` |
| Mimic overlay | `setOverlay('temp')` | banka dolgu rengi sıcaklığa göre | `nova-mimic.test.ts` |
| Mimic destroy sonrası | `destroy()` sonra `update` | no-op (eleman yok) | `nova-mimic.test.ts` |
| Light değişkenler | mount | `:root`'ta `--nm-fg` tanımlı | `apply-light-vars.ts` + `nova-mimic.test.ts` |
| Light token geçersiz hex | `hexToRgbTriple` geçersiz | hata fırlatır | `tokensLight.test.ts` |
| İkon kaydı | `SCADA_ICONS.nova*` | render edilebilir bileşen döner | `demo-icons.test.tsx` |
| MV sim telemetri | sim başladı | H01–H05 + kV/Hz döner | `demo-mv-simulator.test.ts` |
| MV interlock | toprak kapalı + kesici kapat | reddedilir, pozisyon değişmez | `demo-mv-simulator.test.ts` |
| MV interlock tersi | kesici kapalı + toprak kapat | reddedilir | `demo-mv-simulator.test.ts` |
| Connector hedef çözümü | `connector.sim.target` tanımlı | kendi portuna bağlanır (env'i ezer) | `host-connector-target.test.ts` |
| Connector hedef yok | yalnız env `bmsTarget` | env portu kullanılır (mevcut davranış) | `host-connector-target.test.ts` + `host.test.ts` |
| Demo katalog yükü | `demo-*.json` mevcut | `demo_*` kayıtları eklenir, mevcut korunur | `load-maneuver-records.test.ts` |
| Demo katalog yok | `demo-*.json` yok | boş liste, mevcut katalog değişmez | `load-maneuver-records.test.ts` |
| Demo katalog bozuk | JSON parse hatası | fail-fast (throw) | `load-maneuver-records.test.ts` |
| Entegrasyon + stack yok | `/health` fetch hata | net hata (skip YOK) | `demo-maneuver.integration.test.ts` (gerçek koşuldu) |

### B.2 KAPSANMAYAN Boşluklar

| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| G1 | ~~Gerçek stack koşumu yapılmadı~~ (KOŞULDU — `deployment/dev/demo-edge` + `bun run test:demo-integration` 4/4) | — | kapalı |
| G2 | ~~Dockerfile COPY kaynağı yanlış~~ (DÜZELTİLDİ — `apps/demo-field/dist`) | düşük | kapalı |
| G3 | ~~`.env.example` eksik~~ (ÜRETİLDİ — `deployment/.env.aws-demo-edge.example`) | düşük | kapalı |
| G4 | AWS smoke (T-49) — compose up + `/containers` akışı koşulmadı | orta | `start:aws-demo-edge` sonrası uçtan uca akış (stack + ALB gerektirir) |
| G8 | Konteyner field'a otomatik register olmuyor (manuel curl) | orta | Başlangıç adımı/script ile `register` + token (dev runbook'a ekle veya entrypoint) |
| G9 | Kural tetiklemesi (SOC≥97 → standby) uçtan uca test edilmedi | düşük | Simülatörde SOC eşiği tetiklenip kural→operasyon zinciri doğrulanmalı |
| G10 | ~~field-data-service yalnız dev'de~~ (ÇÖZÜLDÜ — AWS demo-edge'e de eklendi) | — | kapalı |
| G11 | Konteyner restart olunca field eski oturumu cache'liyor (uzak adım 401) | orta | Field hub, peer reconnect'inde o peer oturumlarını geçersiz kılmalı (kök servis eklemeli) veya runbook restart sırası |
| G5 | `demo-field` Dockerfile baked nginx upstream'ı (`web-service`) field bağlamına göre yanlış | düşük | `aws-demo-field.conf` mount ile ezildiği için üretimde etkisiz; Dockerfile tek başına kullanılacaksa `field-web-service`'e çevir (A.4/3) |
| G6 | `apps/demo-field` satır kapsamı (SC-2 ≥%70) ayrıca ölçülmedi | düşük | `nx run demo-field:test --coverage` ile doğrula |
| G7 | Canlı WS telemetri (REST polling yerine) | düşük | SPEC A2 — ⛔ Defer, ayrı paket |

**review_date:** 2026-10-07
