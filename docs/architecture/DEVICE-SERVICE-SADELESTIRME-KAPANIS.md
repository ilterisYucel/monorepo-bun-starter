---
status: active
space: architecture
tags: [kapanis, dogrulama, test-kapsami, device-service, sim-lab, periodic-writes]
review_date: 2026-11-12
---

# Device-Service Sadeleştirme — Kapanış (Doğrulama + Test Kapsamı)

> **İş akışı aşaması:** 4/4 — KAPANIŞ (reviewer, mode: all).
> **SPEC:** [DEVICE-SERVICE-SADELESTIRME-MIMARISI.md](./DEVICE-SERVICE-SADELESTIRME-MIMARISI.md) — ✅ Approved (2026-11-12), AK/FR kaynağı.
> Review onayıyla SPEC `~/.opencode/plan/`'dan bu dizine **taşındı** (2026-11-12). R-1..R-4 developer onayı sonrası SPEC revizyonu **uygulandı** (2026-11-12, build): T-18/T-19 eklendi, T-12/T-14/T-15 yeniden açıldı, §10 A3 SECURITY kararı + §11 İleri İş maddesi işlendi.
> **Kapsam:** UC-1 saflaştırma · UC-2 `periodicWrites` · UC-3 v2→Sim-Lab · UC-4 god mode uyumluluk ucu.
> **Tur sınırı:** çalışma ağacında bir önceki turun (SIMULATOR-PIPE) değişen dosyaları da duruyor; bu KAPANIŞ yalnız device-service sadeleştirme yüzeyini doğrular (pipe kanıtları: [SIMULATOR-PIPE-KAPANIS.md](./SIMULATOR-PIPE-KAPANIS.md)).

## A. DOĞRULAMA

### A.1 Değişiklik Matrisi

| # | Dosya#sembol | Değişiklik | Neden (SPEC ref) |
|:--|:-------------|:-----------|:-----------------|
| 1 | `services/device-service/run.ts#main` | (değişiklik) `SimulatorHost`, `DebugInjector`, `bmsTarget`/`pcsPowerHost` kurulumları ve shutdown bağlantıları çıkarıldı — yalnız MQ/Postgres/logger/`DeviceService` | K1/FR-1.1 |
| 2 | `services/device-service/src/debug-injector.ts` (+ test) | **SİLİNDİ** — test müdahalesi Sim-Lab god mode'a taşındı | K1/K7/FR-1.1 |
| 3 | `services/device-service/src/config-loader.ts#DeviceConfigLoader.assertNoSimulatorSurface` | (yeni) ham config'te `transport.kind:"simulator"`, `connector.sim`, `heartbeat` → dosya+deviceId mesajlı fail-fast | K2/FR-1.2 |
| 4 | `packages/shared-types/src/config/device-config.ts#DeviceTransportConfig` | (daraltma) `kind: "tcp" \| "rtu"`; `type`/`registerMap`/`pcsCount`/`bmsPort` ile `SimulatorConfig`/`ConnectorSimSubset`/`PcsPowerSource` tipleri kaldırıldı; `ConnectorConfig.sim` yok | K1/K3 |
| 5 | `packages/shared-types/src/config/device-config.ts#PeriodicWriteConfig` | (yeni) `point`/`intervalMs`/`mode`/`value?`/`extraPoints?`; `DeviceConfigFile.heartbeat` → `periodicWrites[]` | K3/K5/FR-2.1 |
| 6 | `packages/shared-types/src/schemas/device-config.ts#periodicWriteSchema` | (yeni) şema + `fixed` için `value` zorunlu refine; transport enum daraltması | FR-1.2/FR-2.1 |
| 7 | `packages/shared-utils/src/config/definitions.ts` | (silme) `device.bmsTargetHost`/`bmsTargetPort`/`pcsPowerHost` tanımları ve `ALL_CONFIG_DEFINITIONS` kayıtları | K1 |
| 8 | `services/device-service/src/heartbeat-writer.ts` (+ test) | **SİLİNDİ** → vendor-bağımsız genel zamanlayıcıya devredildi | K3 |
| 9 | `services/device-service/src/periodic-write-scheduler.ts#PeriodicWriteScheduler` | (yeni) `counter` (0–255 döngü) / `fixed`, `extraPoints`, idempotent `start`/`stop`, hata `onError`'da (servis ayakta) | K3/K4/FR-2.1..2.3 |
| 10 | `services/device-service/src/device-service.ts#DeviceService` | (değişiklik) `heartbeat` alanı → `periodicWrites`; yazar listesi `periodicWriters`; `stop()` hepsini kapatır | FR-2.x/K4 |
| 11 | `services/device-service/src/index.ts` | (değişiklik) `HeartbeatWriter` çıkışı → `PeriodicWriteScheduler` | K3 |
| 12 | `configs/flex-bsc.json`, `configs/sim/flex-bsc-sim-with-wattox.json`, v2 `bsc-{1,2}.json`, `simulator-app/device-configs/*` | (veri) `heartbeat` → `periodicWrites` dönüşümü (8 dosya); non-ASCII kaçışları korundu | K5/FR-2.3 |
| 13 | `deployment/v2/dev/{container,container2}/device-configs/*` (20+20), `deployment/v2/dev/site/device-configs/*` (6) | (veri) `connection.host` → `sim-lab`, port → Sim-Lab şeması (200xx/201xx/300xx/302xx); `transport` ve `connector.sim` silindi | K6/FR-3.2 |
| 14 | `deployment/v2/dev/simulator-app/sites/demo-v2.site.json` | (yeni) v2 topolojisi: 2 konteyner × 20 cihaz + 4 PCS + 2 OG istasyonu (H04→C1, H05→C2) | K7/FR-3.1 |
| 15 | `deployment/v2/dev/simulator-app/docker-compose.yml` | (değişiklik) `gd-simnet` ağını yaratır; `SIM_SITE_FILE`/`SIM_EMS_HOST` demo-v2 default; kök `configs` mount; Modbus port yayınları kaldırıldı | K6/FR-3.3 |
| 16 | `deployment/v2/dev/simulator-app/docker-compose.host-ports.yml` | (yeni) host port yayını yalnız hata ayıklama override'ı | FR-3.3 |
| 17 | `deployment/v2/dev/{container,container2,site}/docker-compose.yml` | (değişiklik) `gd-simnet` external ağı; device-service'ın simülatör port yayınları, `packages/simulators` mount'u ve `PCS_BMS_TARGET_*`/`DEBUG_INJECT_*`/`SIMULATOR_BIND_HOST` env'leri kaldırıldı | K1/K6/FR-1.1 |
| 18 | `package.json#scripts` | (değişiklik) `start:/stop:demo-integration` eklendi; `dev:stack:up/down` Sim-Lab'ı ilk kaldırır / son indirir | K8/FR-4.4 |
| 19 | `apps/sim-lab/src/http/compat-inject.ts#compatInject` | (yeni) eski `{deviceId, scenario}` sözleşmesi → god mode eylemleri (kapsam öneki `c1|c2|field`; `nominal`/`healthy`/`*_close`, `soc:n`, tip arızaları, kapı/yangın, HVAC hold, `aux_loss`) | K7/FR-4.1..4.3 |
| 20 | `apps/sim-lab/src/http/api.ts#startHttp` | (yeni uçlar) `POST /compat/<kapsam>/inject` (200/400/404) · `GET /compat/<kapsam>/health` (hazır değilse 503) | FR-4.1 |
| 21 | `apps/site/integration/helpers.ts`, `e2e/demo-faults.spec.ts`, `e2e/demo-protection.spec.ts` | (değişiklik) inject base URL'leri `http://localhost:8090/compat/<kapsam>` — test mantığı aynı | FR-4.1/SC-2 |
| 22 | `services/device-service/package.json`, `vitest.config.ts`, `tsconfig.json` | (değişiklik) `@gd-monorepo/simulators` bağımlılığı / alias / project-reference yok | FR-1.3 |
| 23 | `services/device-service/src/device-factory.test.ts#FakeModbusServer` | (yeniden yazım) simülatör paketi yerine test-içi minimal Modbus TCP sunucusu; `kind:"simulator"` testi kaldırıldı | FR-1.3/FR-1.4 |
| 24 | `services/device-service/src/no-simulator-surface.test.ts` | (yeni) statik bekçi: `run.ts` sunucu/inject ucu açmaz; kaynak ve `package.json`'da simülatör paketi izi yok | FR-1.1/FR-1.3 |
| 25 | `services/device-service/src/periodic-write-scheduler.test.ts` | (yeni) 6 test — sayaç sarmalanması, hata dayanıklılığı, `extraPoints`, `fixed`, idempotent start/stop, config fail-fast | AK-2.1/AK-2.2/AK-2.3 |
| 26 | `packages/simulators/src/physical/site/demo-v2.test.ts` | (yeni) 3 test — demo-v2 cihaz kümesi, port şeması, PCS↔BSC/fider eşleşmesi | AK-3.1/AK-3.2 |
| 27 | `apps/sim-lab/src/http/compat-inject.test.ts` | (yeni) 14 test — kapsam öneki, eşleme tabloları, temizleme, hata yolları | AK-4.1/AK-4.2/AK-4.3 |
| 28 | `apps/sim-lab/vitest.config.ts`, `vitest.workspace.ts` | (altyapı) sim-lab test paketi workspace'e eklendi (compat uçları artık koşuyor) | UC-4 kanıt kapasitesi |
| 29 | `services/device-service/vitest.config.ts#findWorkspaceRoot`, `services/device-service/src/config-loader.test.ts#findRepoRoot`, `packages/simulators/vitest.config.ts`, `packages/simulators/src/physical/conformance/ems-read-path.test.ts`, `tools/mutation-changed.mjs#isSource` | (altyapı) Stryker sandbox kök/alias çözümü; `*.config.ts` mutasyon dışı | Mutasyon kapısının koşabilmesi (SC-4 izleme) |
| 30 | `packages/simulators/src/host.ts#SimulatorTransport` | (tip) `SimulatorHost` standalone config'i kendi yerel tipini taşır (device-service şeması daraldı); davranış aynı | K1 (host yalnız paket/test kullanımında) |
| 31 | `docs/architecture/DEVICE-SERVICE-MIMARISI.md` §6.5 + K8 + §4 + §7 | (revizyon) UC-5 heartbeat → `periodicWrites`; sembol tablosu ve yaşam döngüsü satırı güncellendi | T-8 (SPEC revizyon kapısı) |
| 32 | `.opencode/agents/reviewer.md` | (araç) reviewer'a tam shell — taze kanıtın kendisi tarafından koşulması | İş akışı altyapısı |
| 33 | `apps/sim-lab/src/http/compat-inject.ts#typeFault` | (düzeltme, G6) Sim-Lab PCS tipi `wattox-pcs` → `pcs.faultBit` eşlemesi; field kapsamındaki `PCS-n/fault` artık 404 değil | FR-4.1 |
| 34 | `deployment/v2/dev/simulator-app/docker-compose.host-ports.yml`, `package.json#scripts` | (değişiklik, G6) testlerin kullandığı eski port alias'ları (`1502/15501/15504/15511/15536/15540/5030` → yeni aralıklar); `dev:stack:up` ve `start:demo-integration` override'ı içerir — varsayılan compose kapalı kalır | FR-3.3 |
| 35 | `deployment/v2/dev/simulator-app/README.md` | (doküman, G6) host portlarının varsayılan kapalı olduğu, override + alias kullanımı, yeni EMS bağlama akışı | K6/FR-3.3 |
| 36 | `apps/site/integration/{helpers,bsc-handshake,protocol-conformance,station-operations,station-containers,rule-protection,demo-maneuver}*`, `apps/site/vitest.integration.config.ts`, `tools/stack-ready.mjs`, `package.json#scripts` | (G6/T-20) deterministik normalizasyon (`reset→start→close_contactors`, PCS `fault_reset`, container-2 uzaktan normalize), `waitForContainerSession` erişilebilirlik ölçütü (422 kabul), hook/test timeout 300/180 s, `stack-ready` beklemesi, 202 kabulü, PCS15 guard, BSC ack testi sırası | T-20 |
| 37 | BSC config'leri (`configs/**`, v2 + simulator-app kopyaları), `deployment/v2/dev/site/maneuvers/maneuvers.json` | (T-21/A) `stop` komutuna `accept:[2,5]` (zaten durmuş → idempotent); `close_contactors` timeoutMs 8200→15000 (model kapanma süresi); `pcs_charge/pcs_discharge/pcs_standby` başına `fault_reset` adımı; M5 testi ≥8200; station-c2 testi `diff_temp` | T-21 |
| 38 | `deployment/v2/dev/site/maneuvers/{maneuvers,demo-operations}.json`, PCS config'leri (`configs/wattox-pcs.json` + 6 kopya) | (T-21) Manevra tasarımı: `pcs_charge`/`pcs_discharge` → **`start` (0x0E14)** adımı setpoint öncesi zorunlu (Rev Wattox: S06 yalnız çalışırken uygulanır; eski simülatör setpoint ile otomatik başlıyordu); `pcs_standby` fault-latch notu; PCS `standby` timeout 6→30 s (0→1 soft-start); `station_stop` operasyonu (yalnız uzak `bsc_stop`, idempotent). Gerekçeler JSON `description` alanlarında (enerji takımı tartışması için) | T-21 |
| 39 | `packages/simulators/src/physical/{faces/bsc-face.ts, site/plant.ts, faults/catalog.ts}`, `apps/sim-lab/src/http/{compat-inject,compat-inject.test}.ts`, `services/web-service/src/presentation/routes/{unified-routes,unified-routes.test}.ts`, `apps/site/integration/{helpers,rule-protection,device-telemetry,data-pipeline}*` | (G11) Nameplate 210 A / 24 sensör (Rev AF sheet9 "e.g." örnekleri donanım değeri değil); DC metre plant yazımı arıza aktifken atlanır; `dcmeter.overcurrent` / `io.fire` / `imd.prewarning` senaryoları + `Voltage L-N Avg` hold; `typeFault(bsc)` → `SOCPF` (fault1); `unified/latest` sessiz-sinyal birleşimi (`getLatestPerName`); testlerde `containerId` seçimi + BSC Normal ön koşulu | G11 |

**Diff özeti (bu turun yüzeyi):** 45 izlenen dosya değişti/silindi + 7 yeni dosya; 4 dosya silindi (`debug-injector.ts` + test, `heartbeat-writer.ts` + test). Çalışma ağacı ayrıca SIMULATOR-PIPE turunun 12 dosyasını taşıyor — bu KAPANIŞ'ın kapsamı dışı.

### A.2 Test Kanıtları

> **Taze koşular bu reviewer oturumunda yapıldı (2026-11-12).** Mutasyon satırları aynı oturumdaki koşuların raporlarıdır (kod o zamandan değişmedi); etiketler satırda.

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| device-service | `npx vitest run` (services/device-service) | **105/105 yeşil**, 13 dosya — build turu (T-18/T-19 testleri dahil) |
| simulators | `npx vitest run` (packages/simulators) | **291/291 yeşil** — reviewer koşusu |
| shared-types | `npx vitest run` | **130/130 yeşil** — reviewer koşusu |
| sim-lab (compat) | `npx vitest run` (apps/sim-lab) | **21/21 yeşil** — build turu (compat 14 + HTTP 5 + EMS yolu 2) |
| shared-utils | `npx vitest run` | 25/25 — build turu çıktısı (15:29) |
| Şema redleri | `device-config.test.ts` | "rejects simulator transport" + `periodicWrites` (counter/fixed/mode) testleri yeşil |
| Fail-fast (AK-1.2) | `npx vitest run src/config-loader.test.ts` | 3 red testi (kind / connector.sim / heartbeat, dosya+deviceId mesajı) — build turu |
| Runtime bekçi (AK-1.1) | `npx vitest run src/runtime.test.ts` | `net.Server.listen` **0 çağrı** — build turu |
| v2 config şeması (AK-3.2) | `npx vitest run src/v2-configs.test.ts` | 46 config şemadan geçti; sim-only alan 0; hedef `sim-lab`; `.env.example` temiz — build turu |
| HTTP sözleşmesi (AK-4.1) | `npx vitest run src/http/compat-http.test.ts` | 5 test: health 503→200, inject 200/400/404, kapsam 404 — build turu |
| EMS okuma yolu (AK-4.2) | `npx vitest run src/http/compat-ems-path.test.ts` | 2 test: `soc:42` → BSC SOC ≈42, `diff_temp` → Max Pack Temp >100 °C (gerçek Modbus TCP) — build turu |
| Drift tabanı (AK-3.4) | `bun tools/device-config-drift.mjs` | **10 hata** — taban korundu, yeni hata yok — reviewer koşusu |
| Config saflığı (AK-3.2) | grep (`transport` / `connector.sim` / `heartbeat`) v2 config dizinlerinde | 0 eşleşme (40 dosya) — reviewer koşusu |
| Purity 2 (AK-1.3 / SC-4) | grep (`@gd-monorepo/simulators`, `8090`, `/api/point`) | device-service kaynak+`package.json`: 0 · EMS servislerinde Sim-Lab REST çağrısı: 0 |
| Tip | `bunx nx run device-service:typecheck` | Yeni dosyalarda hata yok; hedef **kırmızı** — hatalar dokunulmamış test dosyalarında ve `packages/logger` project-reference yapısında önceden var (G9) |
| Mutasyon — yeni dosyalar | `stryker run --mutate` (build turu 15:44–15:46) | `periodic-write-scheduler.ts` **%89.36** · `compat-inject.ts` **%89.47** — eşik %80 ✅ |
| Mutasyon — tam kapı | `bun run test:mutation` (build turu) | ❌ eşik altı: `config-loader.ts` %47.19 · `device-service.ts` %39.25 · `run.ts` %0 · `host.ts` %42.60 · `schemas/device-config.ts` %63.23 |
| Docker demo (G6) | `bun run start:demo-integration` (build+up) | **exit 0** — sim-lab önce build edilip başladı, ardından v2 stack'leri; `gd-sim-lab` + 3 device-service ayakta |
| Sim-Lab sağlık (G6) | `GET /api/meta`, `/compat/{c1,c2,field}/health` | **200** (48 Modbus sunucusu dinliyor) — build turu |
| Host port izolasyonu (AK-3.3) | `127.0.0.1:{20001,20101,30001,30201}` | **kapalı** (varsayılan compose); host yalnız `:8090` |
| Entegrasyon (G6) | `bunx nx run site:test-integration` → **10 suite (tam set)** | **107 pass / 1 skip / 0 fail**: `bsc-handshake` 10, `demo-maneuver` 10, `commands-operations-edge` 14, `station-operations` 4, `station-containers` 2, `rule-protection` 7, `device-telemetry` 38, `data-pipeline` 6, `bsc-pcs-connector` 7, `protocol-conformance` 9 (+1 profil skip). Canlı kanıt: `charge` **completed** (PCS-1 run −25 kW; BSC `ChargeStatus=1`, 68 A), `station_stop` uzak `bsc_stop` container-1/2 **completed** |
| E2E chromium (G6) | `playwright test demo-faults demo-protection --project=chromium` | demo-faults bir koşuda **geçti**; FL-07 e2e'de dalgalı, manuel repro **4 sn'de geçiyor** (S12); firefox/webkit tarayıcıları kurulu değil (ortam) |

### A.3 Kabul Kriteri Kanıtları

| Kod | Kriter (SPEC özeti) | Kanıt (test/dosya) | Durum |
|:----|:--------------------|:-------------------|:------|
| AK-1.1 | Sunucu / inject ucu açılmaz | `runtime.test.ts` (`net.Server.listen` 0 çağrı) + `no-simulator-surface.test.ts` (statik) | 🟢 |
| AK-1.2 | Simülatör config'i fail-fast reddeder | `config-loader.test.ts` 3 dal (kind / connector.sim / heartbeat) + şema reddi | 🟢 |
| AK-1.3 | Simülatör paketi bağımlılığı yok | `no-simulator-surface.test.ts` + `package.json`/`vitest.config.ts`/`tsconfig.json` inceleme | 🟢 |
| AK-1.4 | Regresyon yok | device-service 97/97 (simülatörsüz `FakeModbusServer` ile) | 🟢 |
| AK-2.1 | Sayaç döngüsü (0–255) | `periodic-write-scheduler.test.ts#AK-2.1` | 🟢 |
| AK-2.2 | Dayanıklılık (hata → `onError`, servis ayakta) | `periodic-write-scheduler.test.ts#AK-2.2` | 🟢 |
| AK-2.3 | Eski `heartbeat` davranışı birebir | `periodic-write-scheduler.test.ts#AK-2.3` (`extraPoints` + 1000 ms) + config dönüşümü; BSC LOC zinciri gerçek modelde test edilmedi (G7) | 🟡 |
| AK-3.1 | demo-v2 site = v2 kümesi | `demo-v2.test.ts#AK-3.1` (anahtarlar + portlar + eşleşme) | 🟢 |
| AK-3.2 | Config saflığı + port eşlemesi | `v2-configs.test.ts` (46 config şemadan geçti, sim-only alan 0, hedef `sim-lab`, `.env.example` temiz) + `demo-v2.test.ts` | 🟢 |
| AK-3.3 | `gd-simnet` + host yayın izolasyonu | Varsayılan compose: host'tan 20001/20101/30001/30201 **kapalı**; dev override alias'larıyla test erişimi açık | 🟢 |
| AK-3.4 | Drift tabanı korunur | `bun tools/device-config-drift.mjs` → 10 hata | 🟢 |
| AK-4.1 | Uyumluluk ucu sözleşmesi (gövde/yanıt + kapsam) | `compat-http.test.ts` (5 test: 200/400/404 + health 503→200) + `compat-inject.test.ts` (14) | 🟢 |
| AK-4.2 | Senaryo → register gözlemlenebilirliği | `compat-ems-path.test.ts` (gerçek `ModbusDevice` ile `soc:42` → SOC ≈42; `diff_temp` → 127 °C) | 🟢 |
| AK-4.3 | `nominal` tüm etkileri geri alır | `compat-inject.test.ts` (`clear` + aktif arıza temizliği) | 🟢 |
| AK-4.4 | Başlatma/durdurma sırası | `start:demo-integration` çalıştırıldı: sim-lab imajı build edilip başladı, sonra v2 stack'leri; `stop` script'i ters sıra (kod inceleme) | 🟢 |

**SC durumu:** SC-1 🟢 (runtime bekçi: hiçbir port açılmaz + simülatör kodu yok) · SC-2 🟡 (stack uçtan uca çalışıyor; entegrasyon/e2e beklentileri T-20) · SC-3 🟢 (`v2-configs.test.ts` + drift tabanı) · SC-4 🟢 (EMS servislerinde god mode/inject ucu 0).

### A.4 Sapmalar

| # | Sapma | Açıklama | Etki |
|:--|:------|:---------|:-----|
| S1 | AK-1.1 kanıtı statik | Bootstrap'ın `listen` yapmadığı kaynak taramasıyla kanıtlanıyordu. | **R-1 (T-18) uygulandı:** `runtime.test.ts` `net.Server.listen` 0 çağrı doğruluyor. |
| S2 | AK-3.2 kanıtı grep + kısmi test | "40 config şemadan geçer" bütünlük testi yoktu. | **R-3 (T-19) uygulandı:** `v2-configs.test.ts` 46 config'i şema + sim-only alan + hedef host açısından doğruluyor. |
| S3 | T-14 eksik: HTTP seviyesi uç testi | `/compat/*/inject` durum kodları ve `/compat/*/health` 503→200 geçişi test edilmemişti. | **R-2 (T-14) uygulandı:** `compat-http.test.ts` 5 testle kapatıyor. |
| S4 | T-15 eksik: senaryo→EMS okuma yolu | FR-4.2 fake Plant ile kanıtlıydı. | **T-15 uygulandı:** `compat-ems-path.test.ts` gerçek `ModbusDevice` ile SOC ve sensör senaryolarını doğruluyor. |
| S5 | T-10 kısmi: `--assist`/`--autostart` bayrakları yok | `plant.assist` default kapalı; SPEC'in istediği CLI bayrağı ve `SIM_ASSIST`/`SIM_AUTOSTART` env'leri eklenmedi. | Düşük — davranış doğru, açık kontrol eksik (G4). |
| S6 | T-12 kısmi: `.env.example` temizliği | `deployment/v2/dev/{container,container2}/.env.example` içinde `PCS_BMS_TARGET_*`/`PCS_EMS_TARGET_HOST` satırları duruyordu. | **T-19 kapsamında temizlendi** + `v2-configs.test.ts` bekçisi eklendi. |
| S7 | `run.ts` mutasyon %0 | Bootstrap dosyası hiç test edilmiyor (yapısal). | Düşük (bilinen) — S1 ile ortak kök. |
| S8 | Tam mutasyon kapısı kırmızı | Değişen mevcut dosyalar (`config-loader.ts`, `device-service.ts`, `host.ts`, `schemas/device-config.ts`) önceden var olan kapsam borcunu taşıyor; turun yeni dosyaları eşiği geçti. | AGENTS kapısı teknik olarak kırmızı (G5). |
| S9 | Bayat yorum/artıklar | `apps/site/integration/helpers.ts` başlığında "DebugInjector :15590" ifadeleri; `apps/site/.stryker-tmp/` eski sandbox kopyaları. | Kozmetik (G8). |
| S10 | Plan SPEC'inde T kutuları işaretlendi | İş durumu KAPANIŞ'ta yaşamalı; plan dosyasındaki kutular build turunda kapatıldı. | Süreç notu — temizlenebilir. |
| S11 | Entegrasyon testleri eski model beklentilerini kodluyor | Tam suite 24/108 fail: BSC ack tablosu (canlı prob: `ack=5 Invalid Request`), PCS komut-kaynağı (S01) ve enerji ölçeği, manevra sıralaması. | **Kısmen kapatıldı (T-20):** normalize + ack determinizmi + 202/422 kabulü + PCS15 guard → hedefli 4 suite 19/26. Kalan 5: T-21 (EMS operasyon uyumu). |
| S12 | E2E soğuk başlangıç dalgalanması | `start:demo-integration` sonrası ilk dakikada hub/telemetri oturumu oturmadan testler başlıyordu. | **Kapatıldı (T-20):** `tools/stack-ready.mjs` script'lere eklendi (6 uç 200 olana kadar bekler). |
| S13 | Dev/test için host alias portları gerekti | Entegrasyon testleri doğrudan Modbus okur (`1502/15501/15504/15511/15536/15540/5030`); host yayını varsayılan kapalı. | **Kapatıldı:** dev override'a alias eklendi; varsayılan compose kapalı (FR-3.3). |
| S14 | EMS operasyonları katı cihaz semantiğiyle uyumsuz | `standby` zaten durmuş BSC'ye stop → 422; PCS `standby` durmuş PCS'te soft-start (DC ön şarj) yapıp `dcV < 1000 V` → W1.b2 latch; `charge` setpoint'i (S06) PCS çalışmıyorken yok sayılıyor; `overheat` anlık 80 °C beklemesi. | **Kapatıldı (T-21):** `stop` `accept:[2,5]` (Rev AF 0x0005), `close_contactors` 15 s, PCS `standby` 30 s, `pcs_charge/discharge` → `start` (0x0E14) + `fault_reset`, `pcs_standby` → `fault_reset`, `station_stop` (yalnız uzak `bsc_stop`), `overheat` → `diff_temp`. Gerekçeler manevra/config `description` alanlarında. |

### A.4.1 Manevra tasarım notları (T-21 — enerji takımı incelemesi)

> Her satır, ilgili JSON dosyasındaki `description` alanına da yazıldı. Bu tablo tartışma
> gündemidir: onaylanmayan satır geri alınır (davranış değişikliği → SPEC revizyonu).

| Manevra / config | Değişiklik | Gerekçe (kaynak) | Tartışma sorusu |
|:---|:---|:---|:---|
| BSC `stop` | `validate.accept: [2, 5]` | Rev AF sheet4 Request Ack: `0x0005 BMS Not Connected — "The BSC isn't communicating with the racks yet"`; zaten durmuş BSC'de stop 0x05 döner, 0x0002 Done 3 s sonra None olur | Gerçek sahada 0x05 "komut başarılı" sayılmalı mı, yoksa operatöre "zaten duruyor" bilgisi mi verilmeli? |
| BSC `close_contactors` | `timeoutMs: 8200 → 15000` | Rev AF kapanma süresi **vermiyor** (yalnız "In Progress"); pencere = raf kapanma süresi (N×400 ms + 5 s emniyet) + poll payı | 8 raflı BSC'de gerçek kapanma süresi kaç s? (M5 testi alt sınırı ≥8200 korunuyor) |
| `pcs_charge` / `pcs_discharge` | Başa `fault_reset`, `set_command_source`'tan sonra **`start` (0x0E14)** | Rev Wattox: S06 setpoint yalnız PCS çalışırken uygulanır (eski simülatör setpoint ile otomatik başlıyordu); latched fault varken komut yok sayılır | EMS, PCS'yi kendiliğinden start etmeli mi (operatör onayı olmadan)? |
| `pcs_standby` + PCS `standby` | Başa `fault_reset`; `timeoutMs: 6000 → 30000` | 0→1 geçişi soft-start (self-check + DC ön şarj) içeriyor; `dcV < 1000 V` ise W1.b2 latch → **batarya (BSC) online olmalı** | BSC kapalıyken "standby" anlamlı mı (PCS enerjili kalır ama DC yok)? Ön koşul operasyon `description`'ına yazıldı |
| `station_stop` (yeni operasyon) | Yalnız uzak `bsc_stop` (PCS'e dokunmaz) | `standby`'ın yerel `pcs_standby` adımı PCS soft-start fiziğine bağlı → istasyon kapsamlı durdurma ayrıldı; UC-13 uzak adım kanıtı deterministik | UI'da görünmeli mi (şu an `ui.hidden: true`)? |

### A.5 Gözle Kontrol Maddeleri


- [x] **Purity 1:** device-service `@gd-monorepo/simulators` import etmez (runtime + test) — `no-simulator-surface.test.ts` bekçi olarak bağlı.
- [x] **Purity 2:** EMS servisleri (web/device/management) Sim-Lab REST/SSE uçlarını çağırmıyor — `services/*/src` taramasında `8090`/`/api/point`/`/api/scenario` 0 eşleşme.
- [x] **Purity 3:** Sim-Lab EMS yazımlarını kendisi yapmıyor — `plant.ts#Plant.assist` default `{ heartbeat: false, hvacServerTemps: false }` (S5: açık bayrak yok).
- [x] **Purity 4:** v2 device-config'lerinde Sim-Lab'a özgü alan yok — `transport`/`connector.sim`/`heartbeat` 0 eşleşme (40 dosya).
- [x] **Purity 5:** v2 app klasörleri `simulator-app` klasörüne dosya referansı vermiyor; ortaklık yalnız `gd-simnet` ağ adı.
- [x] **Purity 6:** uyumluluk ucu yalnız eşleme tablosundaki senaryoları kabul eder; tanımsız → `404 {applied:false}` (kod + `compat-inject.test.ts`).
- [x] **K3/K4:** heartbeat kavramı device-service'ten çıktı; zamanlayıcı bağlantı sahibi süreçte (kuyruk kopukluğunda da yazar), hata `onError`'da.
- [x] **Elegant Object / konvansiyonlar:** `PeriodicWriteScheduler` tek primary constructor + girdi doğrulama, komut/sorgu ayrımı (`start`/`stop`/`write` → void/Promise<void>), named export, kebab-case, Türkçe JSDoc, barrel güncel.
- [x] **Async loop kuralı:** yeni kodda `for...of` + `await` yok.
- [x] **Satır numarası referansı:** yok — tüm kod işaretleri `#sembol` çapaslı.
- [x] **`.env.example` güncelliği** (S6 — T-19) ve **HTTP seviyesi uç testi** (S3 — T-14).

### A.6 Genel Durum Özeti

**MODÜL UYGUN (koşullu) — davranış hatası yok; kapanış T-20 (test beklentileri) ve mutasyon borcu kararına bağlı.** 15 AK: **14 🟢 / 1 🟡 / 0 ⬜**. Kalan 🟡 AK-2.3 (BSC LOC zinciri gerçek modelde test edilmedi — G7). Regresyon yok (device-service 105/105, simulators 291/291, shared-types 130/130, sim-lab 21/21; drift tabanı 10'da sabit). Docker turunda sistem uçtan uca çalıştı: sim-lab + 3 device-service, `link=1`, `bmsOk=true`, BSC SOC/telemetri akışı, compat sağlık 200, host Modbus portları varsayılan kapalı; entegrasyon/e2e'nin kalan kırmızıları daha katı Sim-Lab semantiği ile test beklentilerinin uyuşmazlığı (S11/S12, T-20).

**NIS-2 / güvenlik değerlendirmesi:** Bu tur güvenlik yüzeyini **küçültüyor** — device-service'teki loopback `DebugInjector` HTTP ucu (prod'da guard'lı olsa da imajda taşınıyordu) tamamen silindi; test müdahalesi ayrı servise taşındı. SPEC'te tehdit modeli / güvenlik kabul kriteri tanımlı değil; üretim yüzeyi olan bir servis için bu **kayıt değer bir boşluktur**: (i) god mode `:8090` kimlik doğrulamasız (SPEC A3 "dev/test ağı" varsayımıyla ertelemiş) — yanlışlıkla yayınlanırsa register üstyazımı/arıza enjeksiyonu yetkisi açık kalır; (ii) `docker-compose.host-ports.yml` ve `gd-simnet` bridge yapılandırması hatalı kullanımda 48 Modbus sunucusunu host'a açabilir. **Öneri (karar developer'ın): (a)** R-4 ile A3'ü güvenlik kabul kriterine bağlamak, **(b)** `@nis2-security` etiketli bir testle "device-service hiçbir port açmıyor"u çalışma zamanında doğrulamak (S1/G9'un da kapatılması).

**Kapanış koşulları:** (1) ~~**T-21** — EMS operasyonlarının katı cihaz semantiğiyle uyumu~~ → **kapandı (2026-11-13)**: `stop` idempotent (ack 0x0005), `charge/discharge` → `start` adımı, `fault_reset` ön adımı, `close_contactors` 15 s, PCS `standby` 30 s, `station_stop` operasyonu, `overheat` → `diff_temp`; (2) G5 mutasyon borcu kararı; (3) G4 (`--assist`/`--autostart` bayrağı) ve G7 (LOC zinciri). S12/S13, T-20, G10 ve **G11** tamamlandı (tam entegrasyon seti **107 pass / 1 skip / 0 fail**).

### SPEC Revizyon Önerileri

> SPEC sözleşmedir; aşağıdakiler **öneri**dir — uygulanırsa plan modunda revizyon + onay kapısı işler.

| # | Öneri | Gerekçe |
|:--|:------|:--------|
| R-1 | UC-1'e bootstrap'ın saf bir `buildRuntime()` fonksiyonuna çıkarılması ve "port açmaz" iddiasının çalışma zamanı testiyle kanıtlanması (ya da AK-1.1 kanıt türünün "kod inceleme + statik test" olarak netleştirilmesi) | S1/S7 — `run.ts` mutasyonu %0 |
| R-2 | UC-4'e HTTP seviyesi uç sözleşme testi görevi eklenmesi (200/400/404 + `health` 503→200) | S3 — FR-4.1 durum kodları kanıtsız |
| R-3 | UC-3'e "dönüştürülmüş v2 config'lerin `deviceConfigFileSchema`'dan geçtiği" test ve `.env.example` dönüşümünün açık kanıtı | S2/S6 |
| R-4 | God mode (`:8090`) kimlik doğrulama kararının güvenlik kabul kriterine dönüştürülmesi veya ayrı SECURITY SPEC'e çıkarılması | A.6 NIS-2 notu |

## B. TEST KAPSAMI

### B.1 Kapsam Matrisi

| Durum | Koşul | Beklenen (THEN) | Test ref'i |
|:------|:------|:----------------|:-----------|
| Config `kind:"simulator"` | şema doğrulaması | red (`deviceConfigFileSchema`) | `shared-types/device-config.test.ts` |
| Config `heartbeat` / `connector.sim` | loader fail-fast | dosya+deviceId mesajlı hata, servis açılmaz | `config-loader.test.ts` (AK-1.2) |
| device-service açılışı | kaynak taraması | `SimulatorHost`/`DebugInjector`/`listen` izi yok | `no-simulator-surface.test.ts` |
| TCP cihaz üretimi | `FakeModbusServer` FC03/FC04 | okuma + `tags.canonical` iletimi | `device-factory.test.ts` |
| `mode: counter` | 256 yazım | 1→255→0 sarmalanması | `periodic-write-scheduler.test.ts` (AK-2.1) |
| `mode: fixed` | `value` config'te | her periyot sabit değer | `periodic-write-scheduler.test.ts` |
| `extraPoints` | tek periyot | aynı değer N noktaya yazılır | `periodic-write-scheduler.test.ts` (AK-2.3) |
| Yazım hatası | `device.write` rejects | `onError`, servis ayakta, sonraki periyot denenir | `periodic-write-scheduler.test.ts` (AK-2.2) |
| `start()`/`stop()` iki kez | zamanlayıcı yönetimi | tek zamanlayıcı, temiz kapanma | `periodic-write-scheduler.test.ts` |
| Geçersiz periyodik config | `intervalMs ≤ 0`, `fixed` + `value` yok | constructor `Error` | `periodic-write-scheduler.test.ts` |
| `periodicWrites` şeması | counter / fixed / bilinmeyen mod / 0 interval | kabul / `value` refine / red | `device-config.test.ts` |
| demo-v2 sitesi | `expandSite` | 20+20 konteyner cihazı, 4 PCS, 2 MV; portlar 200xx/201xx/300xx/302xx | `demo-v2.test.ts` (AK-3.1) |
| PCS↔BSC ve fider | site şeması | `PCS-1↔C1.BSC-1`, `PCS-4 → DEMO-MV-2/H05` | `demo-v2.test.ts` (AK-3.1) |
| Config saflığı | repo taraması | `transport`/`connector.sim`/`heartbeat` 0 eşleşme; hedef `sim-lab`; şema geçişi | `v2-configs.test.ts` (AK-3.2) |
| Drift | araç koşusu | taban 10 hata, yeni hata yok | komut kanıtı (A.2) |
| Compat kapsam öneki | `c1`/`c2`/`field` | yalnız o kapsamın cihazı etkilenir | `compat-inject.test.ts` (AK-4.1) |
| Compat temizleme | `nominal`/`healthy`/`*_close` | üstyazımlar `clear` + aktif arızalar silinir | `compat-inject.test.ts` (AK-4.3) |
| Compat SOC | `soc:42` | `rack.setSoc` params `{soc:42}` | `compat-inject.test.ts` |
| Compat arıza | tip → arıza tanımı (bsc/pcs/imd/dc-meter/hvac/io/fss/cb) | doğru `defId`; bilinmeyen tip reddedilir | `compat-inject.test.ts` (AK-4.2) |
| Compat HVAC / analizör | `hot/cold/humid`, `aux_loss` | ilgili noktada `hold` (45/5/90/0) | `compat-inject.test.ts` |
| Compat hata yolları | boş girdi, tanımsız kapsam/cihaz/senaryo, `ok:false` | `applied:false` + mesaj | `compat-inject.test.ts` (AK-4.1) |
| Compat HTTP sözleşmesi | gerçek HTTP istekleri | 200/400/404 dönüşleri, `health` 503→200 | `compat-http.test.ts` (AK-4.1) |
| Compat EMS yolu | gerçek `ModbusDevice` | `soc:42` → SOC ≈42; `diff_temp` → 127 °C | `compat-ems-path.test.ts` (AK-4.2) |
| Regresyon | OG fider kesimi, connector, poll | eski yeşil sayılar korundu | `simulators` 291/291 + device-service 97/97 |
| Ağ izolasyonu | `gd-simnet` içi / host | host bağlantısı reddedilir, `:8090` erişilir | **KAPSANMAYAN** (G6) |
| Demo sırası | `start:/stop:demo-integration` | Sim-Lab ilk kalkar, son iner | **KAPSANMAYAN** (G6) |
| E2e/entegrasyon geçişi | inject URL'leri compat'ta | aynı yeşil sayı, yalnız URL diff'i | **KAPSANMAYAN** (G6) |

### B.2 KAPSANMAYAN Boşluklar

| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| G1 | **KAPANDI (2026-11-12)** — loader fail-fast 3 dalı (`kind` / `connector.sim` / `heartbeat`) `config-loader.test.ts` ile kanıtlandı | — | — |
| G2 | **KAPANDI (2026-11-12)** — `/compat/*/inject` 200/400/404 ve `health` 503→200 `compat-http.test.ts` ile kanıtlandı | — | — |
| G3 | **KAPANDI (2026-11-12)** — senaryo→EMS register yolu gerçek `ModbusDevice` ile `compat-ems-path.test.ts`'te doğrulandı | — | — |
| G4 | `--assist`/`--autostart` CLI bayrağı + `SIM_ASSIST`/`SIM_AUTOSTART` env'i yok (default kapalı) | Düşük | main.ts bayrağı + birim test (T-10 kapanışı) |
| G5 | Mutasyon borcu: `config-loader.ts` %47.19, `device-service.ts` %39.25, `run.ts` %0, `host.ts` %42.60, `schemas/device-config.ts` %63.23 → kapı kırmızı | Orta | Test derinleştirme turu **veya** kapının diff-bazlı satır filtresine geçirilmesi (SIMULATOR-PIPE §B.2 G1 ile ortak karar) |
| G6 | **KAPANDI (2026-11-13)** — stack uçtan uca çalışıyor; T-20 normalize/hazır-olma/ack determinizmi + T-21 manevra tasarımı (start adımı, idempotent stop, station_stop, timeout'lar). Hedefli 10 suite (tam entegrasyon seti): **107 pass / 1 skip / 0 fail** | — | — |
| G10 | **KAPANDI (2026-11-13, test varsayımı)** — field `/containers` dizisi **sırasız** döner (`[container-2, container-1]`); `demo-maneuver` `[0]`'ı alıp container-2'nin *durmuş* BSC'sini okuyordu (SOC 55.06 / ChargeStatus 3). Aynı yanıtta container-1 `ChargeStatus=1`, `SOC=62.16`, `DC I=68.26` — telemetri tazeydi. Test `containerId` ile seçime çevrildi | — | — |
| G11 | **KAPANDI (2026-11-13)** — kök nedenler: (a) `helpers.containerRows` iki konteyneri düzleştiriyordu; aynı `deviceId`'ler (CB-1, CONTROL-PANEL-IO-1) → **yanlış konteynerin** satırı okunuyordu (kural motoru doğru çalışıyordu: `auto_rule_action_ok … battery_light_on`); `containerId` kapsamlı seçim yapıldı. (b) F2.5: fiziksel BSC face, Rev AF sheet9'daki **"e.g." örneklerini** (200 A / 14 sensör) donanım değeri sanmıştı; donanım sözleşmesi 210 A / 24 hücre (3P24S, BPU 210 A) → face düzeltildi. (c) M2: `typeFault("bsc")` varsayılanı `SOCPW` = **uyarı** → `BSC Fault` (30037 b2) hiç tetiklenmiyordu; `SOCPF` (fault1) yapıldı. (d) A1: DC metre plant'a bağlı (gerçek barayı ölçer) — test 750/100/75 standalone varsayılanını bekliyordu → bara aralığı + P = V·I doğrulanır. (e) C3: `unified/latest` yalnız yeni-N satır döndürüyordu (BSC'de ~44 s) → sessiz sinyaller (SOH, TTL 60 s) düşüyordu; `getLatestPerName(5 dk)` ile eksik isimler eklenir (birim testi eklendi). (f) C5: durmuş PCS'de `charge` doğrulanamaz (S06 yalnız çalışırken) → latency testi `set_command_source`. (g) FL-08/FL-02/fire/IMD enjeksiyonları compat katmanında eksikti: `dcmeter.overcurrent` (plant yazımı arıza aktifken atlanır), `Voltage L-N Avg` hold, `io.fire`, `imd.prewarning` eklendi | — | — |
| G7 | `periodicWrites` kesintisinin BSC LOC davranışına etkisi (20 sn heartbeat yok → kontaktör açar) gerçek modelde test edilmedi | Düşük | fiziksel senaryoya "heartbeat kes → LOC" akışı (AK-2.3'ü güçlendirir) |
| G8 | `apps/site` helper yorumlarında "DebugInjector :15590"; `.stryker-tmp` artıkları (env dosyaları T-19 ile temizlendi) | Düşük (kozmetik) | S9 temizliği |
| G9 | `device-service:typecheck` hedefi kırmızı (dokunulmamış test dosyaları + `packages/logger` reference eksiği) | Düşük-orta (kapı güvenilirliği) | Ayrı tip-hijyeni turu; yeni kod bu turda temiz |

### Mutasyon öldürme oranı

**Bu turun yeni dosyaları (eşik %80 ✅):**
- `services/device-service/src/periodic-write-scheduler.ts` — **%89.36** (47 mutant: 42 öldürülen, 5 hayatta kalan, 0 no-coverage)
- `apps/sim-lab/src/http/compat-inject.ts` — **%89.47** (247 mutant: 221 öldürülen, 25 hayatta kalan, 1 no-coverage)

**Değişen mevcut dosyalar (eşik altı — önceden var olan borç):** `config-loader.ts` %47.19 (89 mutant: 42 öldürülen, 24 hayatta, 23 no-cov) · `device-service.ts` %39.25 (456: 178+1 öldürülen, 165 hayatta, 112 no-cov) · `run.ts` %0 (94 no-cov) · `packages/simulators/src/host.ts` %42.60 (338: 144 öldürülen, 94 hayatta, 100 no-cov) · `packages/shared-types/src/schemas/device-config.ts` %63.23 (155: 98 öldürülen, 47 hayatta, 10 no-cov; yeni `periodicWrites` testleriyle 51.6→63.2).

**Kapı durumu:** `bun run test:mutation` ❌ (exit 1). Değişen dosyanın tamamı mutasyona sokulduğundan, bu turun yeni kodu eşiği aşsa da eski düşük-kapsamlı dosyalar kapıyı kırmızı bırakıyor — gerekçe ve yol G5/S8 (SIMULATOR-PIPE KAPANIŞ'ındaki G1 ile aynı kök).

## Revizyon Geçmişi

| Tarih | Neden | Dokunulan SPEC maddesi |
|:------|:------|:-----------------------|
| 2026-11-12 | İlk kapanış: UC-1..UC-4 taze kanıtla doğrulandı (97+291+130+14 test, drift tabanı, config saflığı grep'leri); 15 AK = 7 🟢 / 5 🟡 / 3 ⬜; S1–S10 sapmaları, G1–G9 boşlukları, R-1–R-4 önerileri; docker demo turu ve HTTP/senaryo sözleşme testleri açık | (SPEC değişmedi — öneriler bekliyor; DEVICE-SERVICE-MIMARISI UC-5/K8 revizyonu T-8 kapsamında build'de yapıldı) |
| 2026-11-12 | Developer onayı: SPEC `docs/architecture/`'a taşındı; R-1..R-4 kabul edildi ve **build'de uygulandı** (T-18/T-19 eklendi, T-12/T-14/T-15 yeniden açık, A3 SECURITY kararı + İleri İş maddesi) | UC-1 (AK-1.1 kanıt, T-18) · UC-2 (AK-2.3 kanıt notu) · UC-3 (T-12 yeniden açık, AK-3.2, T-19) · UC-4 (T-14/T-15 yeniden açık, AK-4.1) · §10 A3 · §11 İleri İş · §12 |
| 2026-11-12 | T-18/T-19/T-14/T-15 uygulandı: `runtime.test.ts` (listen 0), `config-loader` fail-fast 3 dal, `v2-configs.test.ts` (46 config), `compat-http.test.ts` (5) ve `compat-ems-path.test.ts` (2, gerçek Modbus) eklendi; `startHttp` `Server` döndürür + SSE timer `unref`; `.env.example` temizlendi. Sonuç: **12 🟢 / 1 🟡 / 2 ⬜**; device-service 105/105, sim-lab 21/21 | AK-1.1 · AK-1.2 · AK-3.2 · AK-4.1 · AK-4.2 · T-12 · T-14 · T-15 · T-18 · T-19 |
| 2026-11-12 | **G6 docker turu**: `start:demo-integration` exit 0 (sim-lab ilk), compat health 200 (c1/c2/field), host Modbus portları varsayılan kapalı, alarm/telemetri akışı canlı doğrulandı. Compat `wattox-pcs` eşleme düzeltildi; dev host alias'ları eklendi; README güncellendi. Entegrasyon 33/24/51, e2e demo-faults geçti/FL-07 manuel geçiyor (soğuk başlangıç). Sonuç: **14 🟢 / 1 🟡 / 0 ⬜**; yeni **T-20** (test beklentileri) | AK-3.3 · AK-4.4 · S11 · S12 · S13 · G6 · T-20 |
| 2026-11-13 | **T-21/A uygulandı**: `stop` `accept:[2,5]` (standby idempotent — manuel `standby container-2` artık `completed`), `close_contactors` timeout 15 s, `pcs_charge/discharge/standby` → `fault_reset` ön adımı, `overheat` → `diff_temp`. Hedefli 4 suite **20 pass / 5 fail / 1 skip**, `bsc-handshake` **9/10**. Kalan: charge rollback (fault_reset ↔ kontaktör kapanışı yarışı), PCS15 BMS bloğu, c2 telemetri yarışı | S14 · T-21 · AK-3.3 · AK-4.4 |
| 2026-11-13 | **T-21 kapandı (manevra tasarımı):** üretici dokümanı (Rev AF sheet4 ack tablosu) ile gerekçelendirilmiş config değişiklikleri kök `configs/`'ten 7 kopyaya aktarıldı; `pcs_charge/pcs_discharge` → **`start` (0x0E14)** adımı (Rev Wattox: S06 yalnız çalışırken uygulanır — kök neden), PCS `standby` 30 s, `station_stop` operasyonu (uzak `bsc_stop` yalıtımı), `normalizeField` 202/arka plan koşusu bekliyor (geç `bsc_stop` yarışı), PCS15 beklenen enerji 8×223.074 kWh, station-c2 Raf1 satırı. Hedefli 6 suite **49 pass / 1 skip / 0 fail** | S14 · T-21 · AK-3.3 · AK-4.4 · T-20 |
| 2026-11-13 | **G11 kapandı:** `containerRows` konteyner seçimi (yanlış konteyner okuması — FL-*), BSC face nameplate 210 A/24 sensör (Rev AF "e.g." örnekleri donanım değeri değil), `typeFault(bsc)` → `SOCPF` (fault1; `SOCPW` uyarıydı → `BSC Fault` alarmı hiç çıkmıyordu), DC metre plant yazımı arıza aktifken atlanır + `dcmeter.overcurrent`/`io.fire`/`imd.prewarning` senaryoları, `unified/latest` sessiz-sinyal birleşimi (`getLatestPerName`), A1/C5 test beklentileri. Tam entegrasyon seti (**10 suite**): **107 pass / 1 skip / 0 fail**; simulators 291/291, sim-lab 21/21, web-service 495/495 | S14 · G10 · G11 · AK-4.2 · AK-4.3 · T-20 |
