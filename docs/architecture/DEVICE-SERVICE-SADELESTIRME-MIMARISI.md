---
status: active
space: architecture
tags: [mimari, device-service, sadeleştirme, sim-lab, periodic-writes, spec]
review_date: 2026-11-12
---

# Device-Service Sadeleştirme — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/5 — SPEC (AGENTS.md "Geliştirme İş Akışı").
> **Durum:** ✅ Approved (2026-11-12 — developer onayı). Test/implementasyon build modunda başlar.
> **Revizyon:** 2026-11-12 (KAPANIŞ sonrası) — R-1..R-4 uygulandı: T-18 (bootstrap runtime bekçi) ve T-19 (config-şema + `.env.example` kanıtı) eklendi; T-12/T-14/T-15 yeniden açıldı; §10 A3 güvenlik kararı ve §11'e SECURITY işi eklendi.
> **İlişkili:** [DEVICE-SERVICE-MIMARISI.md](./DEVICE-SERVICE-MIMARISI.md) (mevcut sözleşme — UC-5 heartbeat bu SPEC ile revize edilir),
> [SIMULATORS-MIMARISI.md](./SIMULATORS-MIMARISI.md) (simülatör paketi sözleşmesi),
> [deprecated/SIMULATOR-SERVISI-MIMARISI.md](./deprecated/SIMULATOR-SERVISI-MIMARISI.md) (2026-10-23 geçiş SPEC'i — bu SPEC onun UC-1..5'ini device-service odağıyla yeniden kurar + `periodicWrites` ekler),
> [SIMULATOR-PIPE-MIMARISI.md](./SIMULATOR-PIPE-MIMARISI.md) (pipe/solver katmanı — bu SPEC'ten bağımsız, birlikte okunur).

## 1. Amaç ve Bağlam

**Sorun:** device-service bugün üç iş birden yapıyor: (1) asıl görevi — cihaza bağlan,
veri oku, job aç, komut yaz; (2) self-host simülatör yaşam döngüsü (`SimulatorHost` —
sahada olmayan kod); (3) test enjeksiyon HTTP ucu (`DebugInjector` — sahada olmayan
kanal). Ayrıca heartbeat, **vendor'a özel** (`HeartbeatWriter` — "LGES BSC 40000" yorumlu
sınıf) bir kavram olarak çekirdekte yaşıyor; aynı ihtiyaç başka cihazlarda (PCS C61,
HVAC keepalive) çıkınca yeni özel sınıf yazılması gerekiyor.

**Kullanıcı kararı (2026-11-12):** device-service'in tek görevi **cihaza bağlan, veri oku,
job aç** — normal iş akışında olmayan hiçbir şey kalmaz. Heartbeat dahil; heartbeat
genelleştirilebilir bir yapıya dönüşür. Simülatörler ayrı serviste (Sim-Lab) yaşar;
v2 demo stack'i Sim-Lab'a gerçek cihaz gibi bağlanır.

| Katman | Kapsam |
| :--- | :--- |
| dahil | `run.ts` saflaştırma (SimulatorHost/DebugInjector/sim env'leri), `debug-injector.ts` silme, `kind:"simulator"`/`connector.sim` fail-fast, `@gd-monorepo/simulators` bağımlılığının kalkması, `periodicWrites` genellemesi (heartbeat dahil), v2 config+compose'un Sim-Lab'a geçişi, god mode uyumluluk ucu + test geçişi |
| hariç | `packages/simulators` eski sınıflarının silinmesi (Sim-Lab yardımcı cihazlarda kullanılıyor — İleri İş), pipe/solver katmanı (ayrı SPEC), GD-1 (9 konteyner) tam stack, poll/komut/alarm davranışı değişiklikleri |

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, tarihli)

| Kod | Karar | Sonuç |
| :--- | :--- | :--- |
| K1 | (2026-11-12, kullanıcı) device-service yalnız istemcidir — süreç hiçbir Modbus sunucusu ve inject HTTP ucu açmaz; `run.ts` yalnız MQ/Postgres/logger/`DeviceService` kurar | Simülatör kavramı device-service'ten tamamen çıkar |
| K2 | `transport.kind: "simulator"` ve `connector.sim` taşıyan config açılışta **fail-fast** eder (dosya + deviceId mesajlı) | Bayat config sessizce geçmez (A1'de kesinleşir) |
| K3 | (2026-11-12, kullanıcı) Heartbeat vendor-spesifik sınıf değil, **genel periyodik yazım job'ı** olur: config'te `periodicWrites: [{ point, intervalMs, mode, extraPoints? }]`; `mode: "counter"` (0–255 döngü) ve `mode: "fixed"` bugün yeterli | BSC 40000, PCS C61, HVAC keepalive aynı mekanizma |
| K4 | Periyodik yazım timer'ı device-service sürecinde koşar (bağlantı sahibi yazar) — kuyruk kopukluğunda bile; yazım hatası `onError`'a gider, servis düşmez | Mevcut HeartbeatWriter davranışı birebir korunur |
| K5 | Config'teki `heartbeat` bloğu v2 geçişinde `periodicWrites`'e dönüşür; `heartbeat` alanı config'ten kalkar | Tek periyodik yazım biçimi |
| K6 | (deprecated SPEC K5/K6 — 2026-10-23, aynen) Sim-Lab tek örnek, `gd-simnet` ağı, `sim-lab` servis adı; v2 config'lerinde yalnız `connection.host/port` değişir, `deviceId` korunur | Sahayla aynı config biçimi |
| K7 | (deprecated SPEC K1/K2/K7 — 2026-10-23, aynen) Test müdahalesi yalnız Sim-Lab god mode (`:8090`) üzerinden; `/compat/<kapsam>/inject` eski `{deviceId, scenario}` sözleşmesini korur; EMS servisleri god mode çağırmaz; `assist`/`autostart` kapalı başlar | Üretim kodunda test ucu yok |
| K8 | (deprecated SPEC K8 — 2026-10-23, aynen) `start/stop:demo-integration`'da Sim-Lab ilk kalkar, son iner | Açılış sırası garantisi |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
| :--- | :--- | :--- |
| B1 | `run.ts` her açılışta `SimulatorHost` kurar ve debug bayrağında `DebugInjector` HTTP ucunu açar | `services/device-service/run.ts#main` |
| B2 | v2 demo'nun 40 device-config'inin tümü `transport.kind: "simulator"`; BSC config'lerinde `heartbeat` bloğu ve `connector.sim` var | `deployment/v2/dev/{container,container2}/device-configs/*.json` (20 + 20) |
| B3 | Heartbeat, vendor yorumlu özel sınıf olarak device-service çekirdeğinde | `services/device-service/src/heartbeat-writer.ts#HeartbeatWriter` |
| B4 | Testler üç ayrı inject ucuna bağlı (15590/15591/15592) | `apps/site/integration/helpers.ts#CONTAINER_INJECT_URL` · `e2e/demo-faults.spec.ts` · `e2e/demo-protection.spec.ts` |
| B5 | 2026-10-23 geçiş SPEC'i onay beklerken deprecated'a taşındı — iş uygulanmadı | `docs/architecture/deprecated/SIMULATOR-SERVISI-MIMARISI.md` |
| B6 | `simulator-app` compose'u var ama `gd-simnet` ağı ve `demo-v2.site.json` yok; v2 stack'leri hâlâ kendi simülatörlerini taşıyor | `deployment/v2/dev/simulator-app/docker-compose.yml` |

## 4. Mimari

### 4.1 Hedef akış

```text
               test runner (vitest/e2e)          EMS (web-service → device-service)
                       │ REST :8090                      │ REST/WS
                       ▼                                 ▼
             ┌──────────────────────────┐        ┌───────────────────┐
             │  sim-lab (tek servis)     │◄─TCP───│ device-service     │
             │  Plant + N Modbus sunucu  │◄─TCP───│ (yalnız istemci:   │
             │  god mode REST/SSE +      │◄─TCP───│  bağlan/oku/yaz/   │
             │  /compat/<kapsam>/inject  │        │  job + periodicWrites)│
             └──────────────────────────┘        └───────────────────┘
                  docker ağı: gd-simnet
```

### 4.2 PeriodicWrites (K3/K4)

```text
device config: periodicWrites: [{ point: "Controller Heartbeat", intervalMs: 1000,
                                  mode: "counter", extraPoints: ["Controller Heartbeat 2", …] }]
                     │
                     ▼
DeviceService ── PeriodicWriteScheduler (timer; hata → onError; servis düşmez)
                     │ periyodik write(points) — normal komut yoluyla
                     ▼
                 cihaz (BSC 40000 / PCS C61 / …)
```

## 5. Purity Kuralları (ZORUNLU)

1. device-service `@gd-monorepo/simulators`'ı import etmez (runtime + test bağımlılığı yok).
2. EMS servislerinden hiçbiri Sim-Lab REST/SSE uçlarını çağırmaz — god mode yalnız test kodu ve insan.
3. v2 device-config'lerinde Sim-Lab'a özgü alan yok (`transport`, `connector.sim`, `heartbeat` yok); config gerçek saha biçiminde, yalnız host/port farklı.
4. Kapsülleme (AGENTS-DEPLOYMENT): v2 app klasörleri `simulator-app` klasörüne dosya referansı vermez; ortaklık yalnız `gd-simnet` ağ adı.
5. Uyumluluk ucu yalnız eşleme tablosundaki senaryoları kabul eder; tanımsız → 404 `{applied:false}`.
6. Kod referansı `#sembol`; satır numarası YASAKTIR.

## 6. Use Case'ler

### 6.1 UC-1 — device-service'i saflaştırma

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: `run.ts#main`'den `SimulatorHost`/`DebugInjector`/`bmsTarget`/`pcsPowerHost` kurulumunun kaldırılması; `debug-injector.ts` + testinin silinmesi; `@gd-monorepo/simulators` bağımlılığının `package.json`/`vitest.config.ts`'ten çıkması; `DeviceTransportConfig`'ten `"simulator"`/`type`/`bmsPort` kalkması; config yükleyicide K2 fail-fast
- hariç: `packages/simulators` içindeki eski sınıfların silinmesi; poll/komut/alarm davranışı

**Akış:**
1. Mevcut davranışı sabitleyen karakterizasyon testleri yazılır (TCP poll/komut yolu — `SimulatorHost` olmadan aynı kalmalı).
2. `run.ts` yalnız MQ, Postgres, logger ve `DeviceService` kurar.
3. Config yükleyici `kind:"simulator"` veya `connector.sim` görürse dosya + deviceId ile hata fırlatır.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
| :--- | :--- | :--- |
| FR-1.1 | System MUST açılışta hiçbir Modbus sunucusu ve inject HTTP ucu açmamak | AK-1.1 |
| FR-1.2 | System MUST `transport.kind:"simulator"` veya `connector.sim` içeren config'i fail-fast reddetmek (dosya + deviceId) | AK-1.2 |
| FR-1.3 | System MUST `services/device-service` altında `@gd-monorepo/simulators` referansı bulundurmamak | AK-1.3 |
| FR-1.4 | System MUST mevcut poll/komut/alarm testlerini yeşil tutmak | AK-1.4 |

**Kabul Senaryoları (GWT):**

1. **AK-1.1 — GIVEN** geçerli TCP config'leri **WHEN** device-service başlar **THEN** süreç hiçbir porta `listen` yapmaz
2. **AK-1.2 — GIVEN** `kind:"simulator"` içeren config **WHEN** yükleyici çalışır **THEN** `DomainError`; mesaj dosya + deviceId içerir; servis açılmaz
3. **AK-1.3 — GIVEN** repo **WHEN** `services/device-service` içinde simülatör paketi aranır **THEN** eşleşme yok; `package.json`'da bağımlılık yok
4. **AK-1.4 — GIVEN** değişiklik sonrası **WHEN** `nx run device-service:test` koşar **THEN** tüm testler yeşil (silinen debug-injector testleri hariç)

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
| :--- | :--- | :--- | :--- |
| AK-1.1 | Sunucu/inject ucu açılmaz | unit (çalışma zamanı bekçi — T-18) + kod inceleme | ⬜ |
| AK-1.2 | Fail-fast | unit | ⬜ |
| AK-1.3 | Bağımlılık yok | kod inceleme | ⬜ |
| AK-1.4 | Regresyon yok | unit (`nx run device-service:test`) | ⬜ |

**T Görev Listesi:**
- [x] T-1: Karakterizasyon testleri — bootstrap'ın sunucu açmadığını + yükleyicinin simülatör config'ini reddettiğini sabitleme (kırmızı)
- [x] T-2: `run.ts#main` sadeleştirme; `debug-injector.ts` + testi silme
- [x] T-3: `DeviceTransportConfig` daraltma + config yükleyici fail-fast
- [x] T-4: Bağımlılık temizliği (`package.json`, `vitest.config.ts`, `device-factory.test.ts`)
- [x] T-18: (R-1) `run.ts#main` bootstrap'ının test edilebilir bir yükleme fonksiyonuna çıkarılması ve "hiçbir porta `listen` yapılmıyor" iddiasının **çalışma zamanında** doğrulanması (mevcut kanıt yalnız statik tarama — KAPANIŞ S1/S7)

**Edge Cases:**

| Durum | Davranış |
| :--- | :--- |
| `transport` bloğu var ama `kind:"tcp"` | Kabul edilir (gerçek saha biçimi) |
| `connector.device` var, `connector.sim` yok | Konnektör izleme cihazı normal Modbus cihazı olarak poll edilir (mevcut `device-factory.ts#createConnector` yolu) |
| `connector.sim` kalmış | Fail-fast (K2/A1) |

**Involved Files:**

| Dosya | Rol / Değişiklik |
| :--- | :--- |
| `services/device-service/run.ts` | Sim kurulumunun silinmesi |
| `services/device-service/src/debug-injector.ts` (+ test) | SİLİNİR |
| `services/device-service/src/device-factory.test.ts` | Simülatör referans temizliği |
| `services/device-service/package.json`, `vitest.config.ts` | Bağımlılık temizliği |
| `packages/shared-types/src/config/device-config.ts` | `DeviceTransportConfig` daraltma |
| `services/device-service/src/config-loader.ts` | Fail-fast |

### 6.2 UC-2 — PeriodicWrites (heartbeat genellemesi)

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: `PeriodicWriteScheduler` (per-timer, `mode: "counter"|"fixed"`, `extraPoints`), config'ten çözüm, hata `onError`, `heartbeat-writer.ts` silinmesi, v2 BSC config'lerinde `heartbeat`→`periodicWrites` dönüşümü, DEVICE-SERVICE-MIMARISI UC-5 revizyonu
- hariç: kuyruk tabanlı zamanlama (timer süreç içi — K4), koşullu/pulse modları (A2)

**Akış:**
1. Config `periodicWrites` listesi `DeviceService` kurulumunda çözülür.
2. Cihaz bağlanınca scheduler başlar (idempotent), kapanışta durur.
3. Her periyotta `counter` (0–255) veya `fixed` değer, `point` + `extraPoints` için `device.write` ile yazılır; hata `onError`'a gider.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
| :--- | :--- | :--- |
| FR-2.1 | System MUST `periodicWrites` girdilerini config'ten çözmek; `counter` modunda değer her yazımda artıp 0–255 dönmek | AK-2.1 |
| FR-2.2 | System MUST yazım hatasında servisi ayakta tutmak ve hatayı `onError`'a iletmek | AK-2.2 |
| FR-2.3 | System MUST eski `heartbeat` bloğu davranışını birebir korumak (interval, extra telemetriler, sayaç) | AK-2.3 |

**Kabul Senaryoları (GWT):**

1. **AK-2.1 — GIVEN** `mode:"counter"` config'i **WHEN** iki periyot geçer **THEN** yazılan değerler ardışık ve 255'ten sonra 0'a döner
2. **AK-2.2 — GIVEN** cihaz yazımı hata fırlatır **WHEN** periyot tetiklenir **THEN** servis ayakta kalır, hata `onError`'a ulaşır, sonraki periyot yeniden dener
3. **AK-2.3 — GIVEN** dönüştürülmüş BSC config'i **WHEN** scheduler koşar **THEN** eski `HeartbeatWriter`'ın yazdığı nokta kümesi ve aralık aynıdır

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
| :--- | :--- | :--- | :--- |
| AK-2.1 | Sayaç döngüsü | unit (`periodic-write-scheduler.test.ts`) | ⬜ |
| AK-2.2 | Dayanıklılık | unit | ⬜ |
| AK-2.3 | Davranış eşdeğerliği | unit (nokta kümesi + aralık + `extraPoints`) — BSC LOC zinciri İleri İş (KAPANIŞ G7) | ⬜ |

**T Görev Listesi:**
- [x] T-5: `PeriodicWriteScheduler` JSDoc sözleşmesi + kırmızı testler (sayaç, hata, idempotent start/stop)
- [x] T-6: Implementasyon + `heartbeat-writer.ts`/testinin silinmesi + `DeviceService` bağlantısı
- [x] T-7: v2 BSC config dönüşümü (`heartbeat` → `periodicWrites`) + eşdeğerlik testi
- [x] T-8: DEVICE-SERVICE-MIMARISI.md UC-5 revizyonu (davranış değişimi — SPEC revizyon kapısı)

**Edge Cases:**

| Durum | Davranış |
| :--- | :--- |
| `point` config telemetrisinde yok | Açılış uyarısı + o girdi atlanır |
| Cihaz offline | Yazım hatası → `onError`; cihaz dönünce devam eder |
| `mode` bilinmiyor | Fail-fast (config hatası) |

**Involved Files:**

| Dosya | Rol / Değişiklik |
| :--- | :--- |
| `services/device-service/src/periodic-write-scheduler.ts` | YENİ — genel zamanlayıcı |
| `services/device-service/src/heartbeat-writer.ts` (+ test) | SİLİNİR |
| `services/device-service/src/device-service.ts` | Scheduler bağlantısı |
| `services/device-service/src/config-loader.ts` | `periodicWrites` çözümü |
| `packages/shared-types/src/config/device-config.ts` | `PeriodicWriteConfig` tipi |
| `docs/architecture/DEVICE-SERVICE-MIMARISI.md` | UC-5 revizyonu |

### 6.3 UC-3 — v2 demo'nun Sim-Lab'a geçişi

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: `demo-v2.site.json` (2 konteyner × 20 cihaz + 4 PCS + 2 OG istasyonu — v2 deviceId kümesi birebir); `simulator-app` compose'unda `gd-simnet` + Modbus portlarının host profiline taşınması + `SIM_ASSIST`/`SIM_AUTOSTART` (varsayılan kapalı); 40 v2 config'inin dönüşümü (host `sim-lab`, port şeması, `transport`/`connector.sim`/`heartbeat` silme, `periodicWrites` ekleme); v2 compose'larının `gd-simnet`'e katılması + `PCS_BMS_TARGET_*`/`DEBUG_INJECT_*` env silme; drift aracı tabanı
- hariç: register listeleri/komut/alarm tanımları (kök `configs/` ile aynı kalır); GD-1 tam stack

**Akış:**
1. `demo-v2.site.json` v2 deviceId kümesiyle yazılır; eşitlik testi yeşil olur.
2. Sim-Lab compose'u `gd-simnet` ağını yaratır; `assist`/`autostart` kapalı başlar.
3. 40 config yalnız izinli alanlarda dönüşür; drift aracı koşar — taban korunur.
4. v2 stack'leri `sim-lab:<port>`'a bağlanır.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
| :--- | :--- | :--- |
| FR-3.1 | System MUST `demo-v2.site.json` genişletmesinde v2 deviceId kümesini birebir üretmek | AK-3.1 |
| FR-3.2 | System MUST dönüştürülmüş config'lerde `transport`/`connector.sim`/`heartbeat` bulundurmamak ve `connection`'ı doğru `sim-lab` portuyla eşleştirmek | AK-3.2 |
| FR-3.3 | System MUST Sim-Lab'ı `gd-simnet` üzerinde `sim-lab` adıyla sunmak; Modbus portlarını varsayılan host'a yayınlamamak | AK-3.3 |
| FR-3.4 | System MUST drift aracında bugünkü tabana (10) yeni hata eklememek | AK-3.4 |

**Kabul Senaryoları (GWT):**

1. **AK-3.1 — GIVEN** `demo-v2.site.json` **WHEN** site genişletilir **THEN** cihaz anahtarları v2 container/container2 deviceId listesiyle birebir aynıdır (konnektör + PCS + MV dahil)
2. **AK-3.2 — GIVEN** dönüştürülmüş 40 config **WHEN** taranır **THEN** `transport`/`connector.sim`/`heartbeat` anahtarı yoktur; her config'in portu Sim-Lab'ın o cihaz için açtığı portla aynıdır; BSC'lerde `periodicWrites` vardır
3. **AK-3.3 — GIVEN** compose varsayılan profille kalkmış **WHEN** ağ içinden `sim-lab:<port>` ve host'tan `localhost:<port>` denenir **THEN** ilki bağlanır, ikincisi bağlanmaz; `localhost:8090/api/meta` 200 döner
4. **AK-3.4 — GIVEN** dönüşüm sonrası **WHEN** `bun tools/device-config-drift.mjs` koşar **THEN** hata sayısı tabanı (10) aşmaz, yeni hata satırı yoktur

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
| :--- | :--- | :--- | :--- |
| AK-3.1 | demo-v2 site = v2 kümesi | unit | ⬜ |
| AK-3.2 | Config saflığı + port eşlemesi | unit (port + config-şema geçişi — T-19) | ⬜ |
| AK-3.3 | Ağ izolasyonu | e2e | ⬜ |
| AK-3.4 | Drift tabanı | kod inceleme | ⬜ |

**T Görev Listesi:**
- [x] T-9: `demo-v2.site.json` + deviceId/port eşitlik testi (kırmızı → yeşil)
- [x] T-10: `simulator-app/docker-compose.yml`: `gd-simnet`, host port profili, `SIM_ASSIST`/`SIM_AUTOSTART`; `--assist`/`--autostart` bayrakları (`apps/sim-lab/src/main.ts`)
- [x] T-11: 40 config'in dönüşümü (Sim-Lab export çıktısı başlangıç noktası)
- [x] T-12: v2 compose'ları (`gd-simnet` external, env temizliği) + `.env.example`'lar
- [x] T-19: (R-3) Dönüştürülmüş 40 config'in `deviceConfigFileSchema`'dan geçtiği bekçi testi + v2 `.env.example` dönüşümü (`PCS_BMS_TARGET_*`/`PCS_EMS_TARGET_HOST` sil, `gd-simnet` notu)
- [x] T-13: Drift aracı koşusu + sonuç KAPANIŞ'a

**Edge Cases:**

| Durum | Davranış |
| :--- | :--- |
| Sim-Lab kalkmadan v2 stack kalkar | device-service mevcut yeniden bağlanma davranışıyla toparlanır |
| `gd-simnet` yok | `docker compose up` "network not found" — script sırası Sim-Lab'ı önce kaldırır (K8) |
| Site dosyası mount edilemedi | İmajdaki kopyaya düşer + uyarı (mevcut Dockerfile davranışı) |

**Involved Files:**

| Dosya | Rol / Değişiklik |
| :--- | :--- |
| `deployment/v2/dev/simulator-app/sites/demo-v2.site.json` | YENİ |
| `deployment/v2/dev/simulator-app/docker-compose.yml` (+ `.env.example`) | Ağ/profil/env |
| `deployment/v2/dev/{container,container2}/device-configs/*.json` | Dönüşüm |
| `deployment/v2/dev/{container,container2,site}/docker-compose.yml` (+ `.env.example`) | Ağ + env temizliği |
| `apps/sim-lab/src/main.ts` | Bayraklar |

### 6.4 UC-4 — Testlerin god mode'a geçişi

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: `/compat/<c1|c2|field>/inject` + `/compat/<kapsam>/health` uçları; eski senaryo adı → Sim-Lab eylemi eşleme tablosu; `start:/stop:demo-integration` script'lerinde Sim-Lab sıralaması; `apps/site/integration/helpers.ts` + `e2e/demo-faults.spec.ts` + `e2e/demo-protection.spec.ts` URL güncellemeleri
- hariç: test senaryo mantığı değişikliği; yeni test senaryoları

**Akış:**
1. Test `POST /compat/c1/inject {deviceId, scenario}` gönderir.
2. Sim-Lab kapsamı (`c1` → `C1.`) çözer, eşleme tablosuyla eylemi uygular.
3. `200 {applied:true}` / `404 {applied:false}` / `400` — eski `DebugInjector` yanıt şekli.

**Eşleme tablosu (özet — T-15'te testle kesinleşir):**

| Eski senaryo | Sim-Lab eylemi |
| :--- | :--- |
| BSC `soc:<n>` | Tüm raflar `rack.setSoc` n |
| BSC `overheat`/`diff_temp`/`fault` | `rack.hotspot`/`rack.tempSensor`/`bsc.forceDiag` |
| PCS `fault`/`door_open` | `pcs.faultBit`/`pcs.door` |
| HVAC `hot`/`cold`/`humid` | İlgili zon register'ında `hold` |
| CONTROL-PANEL-IO kapı/yangın | `io.door`/`io.fss` |
| IMD `fault`/`warning`/`device_error` | `imd.fault` (seviyeli) |
| DC-METER `overcurrent`/`overvoltage` | `dcmeter.alarm` (tipli) |
| PM5340 `aux_loss` | Gerilim register'larında `hold` 0 |
| Herhangi `nominal`/`healthy` | O cihazın arıza + `hold`'larını serbest bırak |

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
| :--- | :--- | :--- |
| FR-4.1 | System MUST `/compat/<kapsam>/inject` ucunda eski gövde/yanıt şeklini korumak ve kapsamı (yalnız o kapsamın cihazları) uygulamak | AK-4.1 |
| FR-4.2 | System MUST eşleme tablosundaki her senaryo için EMS'in okuduğu register'da gözlemlenebilir değişiklik üretmek | AK-4.2 |
| FR-4.3 | System MUST `nominal`'de cihazın tüm god mode etkilerini geri almak | AK-4.3 |
| FR-4.4 | System MUST `start:demo-integration`'da Sim-Lab'ı ilk kaldırmak, `stop`'ta son indirmek | AK-4.4 |

**Kabul Senaryoları (GWT):**

1. **AK-4.1 — GIVEN** çalışan Sim-Lab **WHEN** `/compat/c2/inject`'e gövdesiz, bilinmeyen senaryolu ve geçerli istek gönderilir **THEN** 400, 404 `{applied:false}`, 200 `{applied:true}` döner ve geçerli istek yalnız `C2.` cihazını etkiler
2. **AK-4.2 — GIVEN** `@gd-monorepo/core` `ModbusDevice` Sim-Lab'a bağlı **WHEN** tablodaki senaryolar uygulanır **THEN** ilgili telemetri/alarm biti bir poll içinde değişir
3. **AK-4.3 — GIVEN** cihaza `fault` + `hold` uygulanmış **WHEN** `nominal` gönderilir **THEN** `/api/overrides` o cihaz için boştur
4. **AK-4.4 — GIVEN** temiz docker **WHEN** `bun run start:demo-integration` koşar **THEN** Sim-Lab v2 servislerinden önce ayağa kalkar; `stop` sonrası `gd-simnet` dahil hiçbir kalıntı kalmaz

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
| :--- | :--- | :--- | :--- |
| AK-4.1 | Uyumluluk ucu sözleşmesi | unit (HTTP uç sözleşmesi — T-14) | ⬜ |
| AK-4.2 | Senaryo → register gözlemlenebilirliği | unit (conformance deseni) | ⬜ |
| AK-4.3 | `nominal` geri alma | unit | ⬜ |
| AK-4.4 | Başlatma/durdurma sırası | e2e | ⬜ |

**T Görev Listesi:**
- [x] T-14: God mode uç sözleşme testleri (`apps/sim-lab/src/http/api.ts` — HTTP seviyesinde, kırmızı)
- [x] T-15: Eşleme tablosu JSDoc sözleşmesi + senaryo başına EMS okuma yolu testi
- [x] T-16: `/compat/*` uçları implementasyonu (`compat-inject.ts`)
- [ ] T-17: Script'ler + URL güncellemeleri + tam demo koşusu (entegrasyon + e2e) → KAPANIŞ kanıtı
- [x] T-20: (G6 bulgusu) Entegrasyon/e2e beklentilerinin Sim-Lab semantiğine güncellenmesi: BSC ack tablosu/protokol sırası, PCS komut-kaynağı + enerji register ölçeği, soğuk başlangıç ısınma beklemesi
- [x] T-21: (G6 bulgusu) EMS operasyonlarının katı cihaz semantiğiyle uyumu: `stop` `accept:[2,5]` (idempotent), `close_contactors` 15 s, PCS `standby` 30 s, `pcs_charge/discharge` → `start` (0x0E14) + `fault_reset`, `pcs_standby` → `fault_reset`, `station_stop` (uzak `bsc_stop`), `overheat` → `diff_temp`. Hedefli 5 suite 39 pass / 1 skip / 0 fail (`<MODUL>-KAPANIS.md` §A.4.1)

**Edge Cases:**

| Durum | Davranış |
| :--- | :--- |
| Bilinmeyen kapsam (`/compat/c9/…`) | 404 `{error}` |
| Sim-Lab sunucuları tam açılmadan inject | `/compat/*/health` 503; yardımcı mevcut bekleme mantığını kullanır |
| Ardışık farklı arızalar | Etkiler birikir; `nominal` hepsini kaldırır |

**Involved Files:**

| Dosya | Rol / Değişiklik |
| :--- | :--- |
| `apps/sim-lab/src/http/api.ts` | `/compat/*` uçları |
| `apps/sim-lab/src/http/compat-inject.ts` | YENİ — eşleme tablosu |
| `package.json` | demo-integration script'leri |
| `apps/site/integration/helpers.ts` | URL varsayılanları |
| `e2e/demo-faults.spec.ts`, `e2e/demo-protection.spec.ts` | inject base URL'leri |

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
| :--- | :--- |
| device-service simülatör config'i görür | Beklenen hata → `DomainError`, açılış durur (K2) |
| `periodicWrites` yazım hatası | Servis ayakta; `onError`; sonraki periyot retry (K4) |
| Bilinmeyen `periodicWrites.mode` | Fail-fast (config hatası) |
| Sim-Lab açılıyor | Sunucular sırayla; `/api/meta` 200; `/compat/*/health` hazır olana kadar 503 |
| Sim-Lab yeniden başladı | God mode etkileri sıfırlanır; device-service yeniden bağlanır |
| God mode geçersiz girdi | 400/404 JSON; Sim-Lab durumu değişmez |
| Limitler | demo-v2: 40 + 4 konnektör + 4 PCS BMS yüzü = 48 sunucu tek süreç |

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
| :--- | :--- | :--- |
| SC-1 | device-service simülatör kodu ve vendor-spesifik heartbeat sınıfı taşımaz | `services/device-service` içinde simülatör/heartbeat referansı 0; `run.ts` yalnız MQ/DB/logger/`DeviceService` |
| SC-2 | v2 demo stack'i Sim-Lab ile uçtan uca çalışır | `test:demo-integration` + `demo-faults`/`demo-protection` e2e yeşil |
| SC-3 | Demo config'i saha config'iyle aynı biçimde | `transport`/`connector.sim`/`heartbeat` 0; drift tabanı korunur |
| SC-4 | Test müdahalesi EMS dışında | EMS servislerinde inject/god mode ucu 0 |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
| :--- | :--- |
| 1. SPEC (Plan — V4 Pro) | Bu doküman |
| 2. SÖZLEŞME + TEST (Build — V4.1 Flash) | JSDoc: `PeriodicWriteScheduler`, config yükleyici fail-fast, god mode/compat uçları; kırmızı testler (T-1, T-5, T-9, T-14, T-15) |
| 3. IMPL + MUTASYON (Build — V4.1 Flash) | T-1..T-17; değişen dosyalarda mutasyon ≥%80 |
| 4. REVIEW (GLM-5.3) | `DEVICE-SERVICE-SADELESTIRME-KAPANIS.md` |

## 10. Açık Kararlar

| # | Konu | Durum |
| :--- | :--- | :--- |
| A1 | `connector.sim` kalan config'te davranış: fail-fast (K2) vs uyarı + yok say | **KAPANDI (2026-11-12 — kullanıcı: fail-fast)** — K2 geçerli; T-3'te uygulanır |
| A2 | `periodicWrites` mod çeşitleri: `counter`/`fixed` yeterli mi; koşullu/pulse modları | **KAPANDI (2026-11-12 — kullanıcı: counter/fixed)** — pulse/conditional İlk somut ihtiyaçta eklenir (İleri İş) |
| A3 | God mode ucu için kimlik doğrulama (R-4) | **Kabul (2026-11-12)**: ayrı SECURITY SPEC — `:8090` kimlik doğrulama + `host-ports` yayın politikası; bu SPEC kapsamı dışı |
| A4 | `assist`/`autostart` kapalı başlangıç — `gercek` profilde P-5/H-4 bulgularının demo-v2'de koşulması | Bu SPEC `uyumlu` profille kapanır; `gercek` ayrı iş |
| A5 | `heartbeat`→`periodicWrites` geçişiyle DEVICE-SERVICE-MIMARISI.md UC-5 revizyonu | T-8'de kapanır (SPEC revizyon kapısı) |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. `packages/simulators` eski sınıfları ve `SimulatorHost`'un emekliye ayrılması — Sim-Lab yardımcı cihazlar eski sınıfları kullandığı için ayrı SPEC.
2. `packages/simulators/src/physical` Elegant Object refaktörü + kendi SPEC/KAPANIŞ'ı.
3. GD-1 (9 konteyner) için v2 benzeri tam EMS stack'i.
4. `packages/core` bayt sırası tutarsızlığı düzeltmesi (ayrı paket).
5. God mode `:8090` kimlik doğrulama + `docker-compose.host-ports.yml` yayın politikası — **ayrı SECURITY SPEC** (R-4).

## 12. T Görev Özeti

| T-1 | Karakterizasyon testleri (bootstrap/fail-fast) — UC-1 |
| T-2 | `run.ts` sadeleştirme + `debug-injector` silme — UC-1 |
| T-3 | `DeviceTransportConfig` daraltma + fail-fast — UC-1 |
| T-4 | Bağımlılık temizliği — UC-1 |
| T-5 | `PeriodicWriteScheduler` JSDoc + kırmızı testler — UC-2 |
| T-6 | Scheduler implementasyonu + `heartbeat-writer` silme — UC-2 |
| T-7 | BSC config dönüşümü + eşdeğerlik testi — UC-2 |
| T-8 | DEVICE-SERVICE-MIMARISI UC-5 revizyonu — UC-2 |
| T-9 | `demo-v2.site.json` + eşitlik testi — UC-3 |
| T-10 | simulator-app compose + bayraklar — UC-3 |
| T-11 | 40 config dönüşümü — UC-3 |
| T-12 | v2 compose/env temizliği — UC-3 |
| T-13 | Drift aracı koşusu — UC-3 |
| T-14 | God mode uç sözleşme testleri — UC-4 |
| T-15 | Eşleme tablosu + EMS okuma yolu testi — UC-4 |
| T-16 | `/compat/*` implementasyonu — UC-4 |
| T-17 | Script'ler + URL'ler + tam koşu — UC-4 |
| T-18 | (R-1) Bootstrap runtime bekçi testi — UC-1 |
| T-19 | (R-3) Config-şema bekçi testi + `.env.example` dönüşümü — UC-3 |
| T-20 | (G6) Entegrasyon/e2e beklentilerinin Sim-Lab semantiğine güncellenmesi — UC-4 |
| T-21 | (G6) EMS operasyonlarının katı cihaz semantiğiyle uyumu (`stop` idempotent, PCS `start`/`fault_reset` dizisi, `station_stop`, overheat beklentisi) — UC-4 |

İş sırası: UC-1 → UC-2 → UC-3 → UC-4 (UC-3'ün Sim-Lab tarafı UC-4'ten önce hazır olmalı).
