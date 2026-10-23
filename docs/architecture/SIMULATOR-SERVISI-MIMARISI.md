---
status: active
space: architecture
tags: [mimari, simulator, sim-lab, device-service, deployment, god-mode, spec]
review_date: 2026-12-01
---

# Simülatör Servisi (Sim-Lab ayrı servis) — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/5 — SPEC (AGENTS.md "Geliştirme İş Akışı").
> **Durum:** ✏️ Specified — ONAY BEKLİYOR (2026-10-23). Test/implementasyon developer onayından sonra başlar.
> **İlişkili:** [SIMULATOR-MIMARISI.md](./SIMULATOR-MIMARISI.md) (self-host simülatörler — bu SPEC UC-2/UC-3'ünün v2 deployment kullanımını emekliye ayırır),
> [DEVICE-SERVICE-MIMARISI.md](./DEVICE-SERVICE-MIMARISI.md) (UC-5 transport — `simulator` dalı zaten yok; bu SPEC config tipindeki son kalıntıyı kaldırır),
> [../simulators/FIZIKSEL-SAHA-SIMULATORU.md](../simulators/FIZIKSEL-SAHA-SIMULATORU.md) (Sim-Lab modeli),
> [../simulators/VENDOR-UYUM-DENETIMI.md](../simulators/VENDOR-UYUM-DENETIMI.md) (bulgular P-5, H-4, C-1).

---

## 1. Amaç ve Bağlam

**Sorun:** v2 demo stack'inde simülatörler device-service sürecinin **içinde** yaşıyor:
`services/device-service/run.ts#main` her açılışta `SimulatorHost`'u config'teki
`transport.kind: "simulator"` girdilerinden kurar, BSC→PCS konnektörünü (`connector.sim`)
çalıştırır ve test enjeksiyonu için `DebugInjector` HTTP ucunu (15590/15591/15592) açar.
Sonuçları:

- device-service'in tek işi (veri al → veri bas, komut yaz) simülasyon yaşam döngüsüyle karışık;
- her konteyner stack'i kendi simülatörlerini ayrı süreçte koşturur — BSC (konteyner) ile PCS
  (field) arasındaki fiziksel bağ, servisler arası TCP ile (`PCS_BMS_TARGET_*`) yamalanır;
- test müdahalesi (arıza/senaryo) EMS servisinin içinden yapılır — sahada olmayan bir kanal.

**Çözüm:** Fiziksel saha simülatörü (Sim-Lab, `apps/sim-lab` + `packages/simulators/src/physical`)
**ayrı bir servis** olarak kalkar. Her cihaz ayrı Modbus TCP sunucusudur; v2 stack'lerinin
device-service'leri ona **gerçek cihaza bağlanır gibi** bağlanır. Komut, kural, alarm ve manevra
akışı v2'deki gibi EMS (web-service → device-service) üzerinden kalır. Simülatörün kendi REST
API'si yalnızca **god mode** (test müdahalesi: register üstyazımı, zaman serisi, arıza,
senaryo, izleme) olarak kullanılır. device-service'ten simülatör kodu tamamen çıkar.

| Katman | Bu SPEC'te | Not |
| :--- | :--- | :--- |
| Sim-Lab servis deployment'ı (v2 topolojisi, ortak docker ağı) | DAHİL | UC-1 |
| v2 device-config'lerinin Sim-Lab'a yönlendirilmesi | DAHİL | UC-2 |
| device-service'ten `SimulatorHost` / `DebugInjector` / sim env'lerinin kaldırılması | DAHİL | UC-3 |
| God mode API sözleşmesi + eski `/inject` uyumluluk ucu | DAHİL | UC-4 |
| demo-field entegrasyon + e2e testlerinin god mode'a geçişi | DAHİL | UC-5 |
| `packages/simulators` eski sınıflarının silinmesi / fiziksel modele adaptör | HARİÇ | §11 İleri iş |
| `physical` modülünün Elegant Object refaktörü | HARİÇ | §11 İleri iş |
| Müşteri (gerçek saha) deployment'ları | HARİÇ | Zaten gerçek cihaz host'ları kullanır; etkilenmez |

---

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, tarihli)

| Kod | Karar | Sonuç |
| :--- | :--- | :--- |
| K1 | (2026-10-23, kullanıcı) Simülatör ayrı servis olur; komut/kural/alarm akışı v2 stack'i (web-service, device-service) üzerinden kalır | Sim-Lab EMS'e yalnızca Modbus TCP ile görünür; EMS Sim-Lab REST'ini çağırmaz |
| K2 | (2026-10-23, kullanıcı) Sim-Lab backend'inin yalnızca god mode kısmı kullanılır | God mode uçları UC-4'te sözleşmeye bağlanır; Sim-Lab'ın EMS işini taklit eden yardımcıları ("EMS yardımcısı", "otomatik devreye alma") bu deployment'ta kapalı başlar |
| K3 | (2026-10-23, kullanıcı) device-service'ten `kind: "simulator"` ve ilgili kod kalkar; device-service yalnız veri alır/basar | `run.ts`'den `SimulatorHost` + `DebugInjector` çıkar; `DeviceTransportConfig.kind` birleşiminden `"simulator"` çıkar |
| K4 | (öneri) Tek Sim-Lab örneği tüm v2 sahasını (container, container2, field) sunar | BSC↔PCS fiziksel bağı süreç içinde kalır (`physical/link/bms-link.ts`); `PCS_BMS_TARGET_*` / `pcsPowerHost` env'leri gereksizleşir |
| K5 | (öneri) Bağlantı ortak, adı sabit bir docker ağı üzerinden: `gd-simnet` (Sim-Lab compose'u yaratır, v2 compose'ları `external` katılır) | device-config host'u = `sim-lab` (servis adı); Modbus portları host'a yayınlanmaz, yalnız 8090 (god mode + arayüz) yayınlanır |
| K6 | (öneri) v2 device-config'lerinde yalnızca `connection.host/port` (+ konnektör `connection`) değişir; deviceId'ler korunur | Sim-Lab port şeması (C1 2000x, C2 2010x, field 300xx) kullanılır — iki konteyner stack'inin bugün aynı portları (15501…) paylaşması tek sunucuda mümkün değil |
| K7 | (öneri) Eski `POST /inject {deviceId, scenario}` sözleşmesi Sim-Lab'da kapsam önekli uyumluluk ucu olarak yaşar: `/compat/<c1\|c2\|field>/inject` | Mevcut test çağrıları yalnız base URL değiştirerek çalışır; senaryo adları UC-4 eşleme tablosuyla Sim-Lab arıza/üstyazım eylemlerine çevrilir |
| K8 | (öneri) Config'te `transport.kind: "simulator"` kalırsa device-service açılışta **fail-fast** eder | Bayat config sessizce yok sayılmaz; hata mesajı dosya + deviceId taşır |

---

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
| :--- | :--- | :--- |
| B1 | device-service her açılışta config'ten self-host simülatörleri başlatıyor | `services/device-service/run.ts#main` (`new SimulatorHost(deviceConfigs, …)`) |
| B2 | Test enjeksiyonu device-service içindeki HTTP ucundan yapılıyor | `services/device-service/src/debug-injector.ts#DebugInjector`; compose'larda `DEBUG_INJECT_ENABLED/PORT` |
| B3 | Config tipi simülatör alanları taşıyor (`kind: "simulator"`, `type`, `bmsPort`) | `packages/shared-types/src/config/device-config.ts#DeviceTransportConfig` |
| B4 | v2'nin 44 device-config'inin tümü `transport.kind: "simulator"`, host `127.0.0.1`; container ve container2 aynı portları kullanıyor | `deployment/v2/dev/{container,container2,field}/device-configs/*.json` |
| B5 | BSC→PCS bağı servisler arası TCP ile kuruluyor (konteyner device-service → field device-service BMS portu) | `deployment/v2/dev/container/docker-compose.yml` `PCS_BMS_TARGET_HOST/PORT`; `packages/simulators/src/host.ts#SimulatorHost` |
| B6 | Testler eski senaryo adlarıyla 3 ayrı inject ucuna bağlı | `apps/demo-field/integration/helpers.ts#inject`; `e2e/demo-faults.spec.ts`; `e2e/demo-protection.spec.ts`; `apps/demo-field/integration/rule-protection.integration.test.ts` |
| B7 | Sim-Lab topolojisi v2 deviceId'leriyle uyumlu (konteyner kapsamında `BSC-1…`, `HVAC-1…8`, `CB-1/2`, `DC-METER-1`, `DC-1/2`, `PM5340-1`, `IMD-1`, `FSS-1`, `CONTROL-PANEL-IO-1`; saha `PCS-1…4`, `DEMO-MV-1/2`) | `packages/simulators/src/physical/site/site-config.ts#expandSite` (2 konteyner + 2 OG istasyonlu site ile doğrulandı) |
| B8 | `physical` modülü SPEC'siz yazıldı ve Elegant Object kurallarına tam uymuyor (getter'lar, açık `cfg`, prosedürel `bscFace`) | `packages/simulators/src/physical/models/pcs-wattox.ts#WattoxPcs`; `packages/simulators/src/physical/faces/bsc-face.ts#bscFace` — bu SPEC kapsamı dışında (§11) |

---

## 4. Mimari

### 4.1 Hedef akış

```text
             god mode (test)                         operatör / kural motoru
  test runner ───────────────┐                     ┌──────────────────────────┐
  (vitest/e2e, insan)        │ REST :8090          │ container-web / field-web │
                             ▼                     └────────────┬─────────────┘
                 ┌───────────────────────┐                      │ REST/WS
                 │  sim-lab (1 servis)    │                      ▼
                 │  Plant + 226/52 Modbus │◄── Modbus TCP ── device-service (container)
                 │  sunucu, bms-link      │◄── Modbus TCP ── device-service (container2)
                 │  god mode REST + SSE   │◄── Modbus TCP ── device-service (field)
                 └───────────────────────┘        (yalnız oku/yaz; simülatör kodu yok)
                    docker ağı: gd-simnet (external)
```

### 4.2 v2 demo için site dosyası

`deployment/v2/dev/simulator-app/sites/demo-v2.site.json` (yeni): 2 konteyner × (2 BSC × 8 raf,
8 HVAC, 2 CB, DC metre, 2 DC çıkış, PM5340, IMD, FSS, kontrol paneli IO), konteyner başına 2 PCS
(toplam 4), 2 OG istasyonu (`DEMO-MV-1`, `DEMO-MV-2`). Port şeması Sim-Lab varsayılanı
(`containerPortBase` 20000, adım 100; `fieldPortBase` 30000).

| Cihaz | container | container2 | field |
| :--- | :--- | :--- | :--- |
| BSC-1 / BSC-2 | 20001 / 20002 | 20101 / 20102 | — |
| BSC-PCS-CONNECTOR-1 / -2 | 20006 / 20007 | 20106 / 20107 | — |
| HVAC-1…8 | 20011…20018 | 20111…20118 | — |
| CB-1 / CB-2 | 20031 / 20032 | 20131 / 20132 | — |
| DC-METER-1, DC-1, DC-2 | 20041, 20042, 20043 | 20141, 20142, 20143 | — |
| PM5340-1, IMD-1, FSS-1, CONTROL-PANEL-IO-1 | 20051…20054 | 20151…20154 | — |
| PCS-1…4 (EMS yüzü) | — | — | 30001…30004 |
| DEMO-MV-1 / DEMO-MV-2 | — | — | 30201 / 30202 |

PCS BMS yüzleri (30101…) Sim-Lab içinde `bms-link` tarafından beslenir; EMS onlara bağlanmaz.

### 4.3 Kontrol kanalları

| Kanal | Kim kullanır | Ne yapar |
| :--- | :--- | :--- |
| Modbus TCP (`sim-lab:<port>`) | device-service | Telemetri okuma, komut yazma — sahadaki gerçek cihazla aynı |
| God mode REST (`:8090/api/*`) | test runner, insan (arayüz) | Register üstyazımı/serbest bırakma, zaman serisi, arıza, haberleşme kopması, senaryo, izleme |
| Uyumluluk (`:8090/compat/<kapsam>/inject`) | mevcut demo-field/e2e testleri | Eski senaryo adlarını god mode eylemlerine çevirir |

---

## 5. Purity Kuralları (ZORUNLU)

1. device-service, `@gd-monorepo/simulators` paketini **import etmez** (runtime ve test bağımlılığı yok).
2. EMS servislerinden (web-service, device-service, management-service) hiçbiri Sim-Lab REST/SSE uçlarını **çağırmaz**; god mode yalnız test kodu ve insan tarafından kullanılır.
3. Sim-Lab, EMS'in sorumluluğundaki yazımları (BSC heartbeat, HVAC sunucu sıcaklığı, devreye alma komutları) bu deployment'ta **kendisi yapmaz** — `assist` ve `autostart` kapalı başlar.
4. v2 device-config'lerinde Sim-Lab'a özgü alan bulunmaz (`transport`, `connector.sim` yok); config gerçek saha config'iyle aynı şekildedir, yalnız host/port farklıdır.
5. Kapsülleme (AGENTS-DEPLOYMENT): v2 app klasörleri `simulator-app` klasörüne dosya referansı vermez; ortaklık yalnız docker ağı adı (`gd-simnet`) üzerindendir.
6. Uyumluluk ucu yalnız eşleme tablosundaki senaryoları kabul eder; tanımsız senaryo 404 `{applied:false}` — yeni test kodu uyumluluk ucunu değil god mode uçlarını kullanır.

---

## 6. Use Case'ler

### 6.1 UC-1 — Sim-Lab'ı v2 topolojisiyle ayrı servis olarak kaldırma

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: `demo-v2.site.json`; `simulator-app` compose'unda `gd-simnet` ağı, `SIM_SITE_FILE` ile site seçimi, `SIM_ASSIST`/`SIM_AUTOSTART` env'leri (varsayılan kapalı); Modbus portlarının host'a yayınlanmasının opsiyonel (compose profile) hale gelmesi
- hariç: GD-1 (9 konteyner) sahasının v2 stack'ine bağlanması (v2'de yalnız 2 konteyner stack'i var); Sim-Lab fizik modeli değişiklikleri

**Akış:**
1. Geliştirici `simulator-app` compose'unu `SIM_SITE_FILE=demo-v2.site.json` ile kaldırır; compose `gd-simnet` ağını yaratır.
2. Sim-Lab 52 sunucuyu (44 cihaz + 4 konnektör + 4 PCS BMS yüzü) açar, `assist`/`autostart` kapalı başlar.
3. `GET /api/meta` sağlıklı döner; v2 stack'leri ağa katılıp bağlanabilir.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
| :--- | :--- | :--- |
| FR-1.1 | System MUST `demo-v2.site.json` genişletmesinde v2 deviceId kümesini konteyner kapsamıyla birebir üretmek (§4.2 tablosu) | AK-1.1 |
| FR-1.2 | System MUST Sim-Lab'ı `gd-simnet` adlı docker ağında `sim-lab` servis adıyla erişilebilir kılmak; Modbus portlarını varsayılan olarak host'a yayınlamamak | AK-1.2 |
| FR-1.3 | System MUST `SIM_ASSIST` ve `SIM_AUTOSTART` verilmediğinde EMS yardımcısını ve otomatik devreye almayı kapalı başlatmak | AK-1.3 |

**Kabul Senaryoları (GWT):**
1. **AK-1.1 — GIVEN** `demo-v2.site.json` **WHEN** `expandSite` çalışır **THEN** cihaz anahtarları `C1.*`, `C2.*` için v2 container/container2 deviceId listesine, saha için `PCS-1…4`, `DEMO-MV-1/2`'ye eşittir ve portlar §4.2 tablosuyla aynıdır
2. **AK-1.2 — GIVEN** compose varsayılan profil ile kalkmış **WHEN** aynı ağa katılan bir konteynerden `sim-lab:20001` ve host'tan `localhost:20001` denenir **THEN** ilki bağlanır, ikincisi bağlanamaz; `localhost:8090/api/meta` 200 döner
3. **AK-1.3 — GIVEN** `SIM_ASSIST`/`SIM_AUTOSTART` env'leri boş **WHEN** servis açılır **THEN** `/api/state` `assist` alanı kapalıdır ve 60 sn içinde hiçbir BSC `Normal` durumuna geçmez (komut gelmediği için)

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
| :--- | :--- | :--- | :--- |
| AK-1.1 | demo-v2 sitesi v2 deviceId/port kümesini üretir | unit | ⬜ |
| AK-1.2 | Modbus yalnız `gd-simnet` içinden, god mode host'tan erişilir | e2e | ⬜ |
| AK-1.3 | Yardımcılar varsayılan kapalı | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-1: `demo-v2.site.json` + `expandSite` üzerinden deviceId/port eşitlik testi (kırmızı → yeşil)
- [ ] T-2: `simulator-app/docker-compose.yml`: `gd-simnet` ağı, Modbus portlarını `ports-host` profiline taşıma, `SIM_ASSIST`/`SIM_AUTOSTART` env'leri; `.env.example` güncellemesi
- [ ] T-3: `apps/sim-lab/src/main.ts`: `--assist` / `--autostart` bayrakları (varsayılan kapalı) + birim testi

**Edge Cases:**
| Durum | Davranış |
| :--- | :--- |
| `gd-simnet` önceden başka bir projece yaratılmış | Compose ağı `name: gd-simnet` ile yeniden kullanır; sürücü uyuşmazlığında açılış hatası (docker) |
| Site dosyası mount edilemedi (ağ/Drive sürücüsü) | İmajdaki kopyaya düşer, uyarı log'u basar (mevcut davranış — `apps/sim-lab/deployment/Dockerfile`) |
| Port çakışması (site dosyası yanlış) | Sim-Lab ilgili sunucuyu `bindError` ile raporlar; `/api/meta` sağlıklı kalır, açılış log'unda ✗ satırı |

**Involved Files:**
| Dosya | Rol / Değişiklik |
| :--- | :--- |
| `deployment/v2/dev/simulator-app/sites/demo-v2.site.json` | YENİ — v2 topolojisi |
| `deployment/v2/dev/simulator-app/docker-compose.yml` | Ağ, port profili, yeni env'ler |
| `deployment/v2/dev/simulator-app/.env.example` | Yeni env'ler |
| `apps/sim-lab/src/main.ts` | `--assist` / `--autostart` bayrakları |
| `packages/simulators/src/physical/site/site-config.ts` | Değişiklik beklenmez — test hedefi |

---

### 6.2 UC-2 — v2 device-config'lerini Sim-Lab'a yönlendirme

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: container, container2, field `device-configs/*.json` — `connection.host` → `sim-lab`, `connection.port` → §4.2; `transport` bloğunun ve `connector.sim`'in silinmesi; konnektör izleme cihazı (`connector.device.connection`) host/port'u; v2 compose'larının `gd-simnet`'e katılması
- hariç: register listeleri, komut/alarm tanımları (kök `configs/` ile aynı kalır — drift kuralı); `mappings/` dosyalarının içeriği (Sim-Lab kendi kopyasını kullanır)

**Akış:**
1. Her config'te yalnız izinli alanlar değiştirilir (K6).
2. `tools/device-config-drift.mjs` çalıştırılır — yeni hata çıkmaz.
3. v2 compose'larında device-service servisleri `gd-simnet` ağına katılır; `PCS_BMS_TARGET_*`, `DEBUG_INJECT_*` env'leri silinir.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
| :--- | :--- | :--- |
| FR-2.1 | System MUST v2 device-config'lerinde `transport` ve `connector.sim` alanı bulundurmamak | AK-2.1 |
| FR-2.2 | System MUST her v2 device-config'inin `connection` hedefini §4.2 tablosundaki `sim-lab:<port>` ile eşleştirmek | AK-2.2 |
| FR-2.3 | System MUST config dönüşümünden sonra drift aracında yeni hata üretmemek (bugünkü 10 hata tabanı) | AK-2.3 |

**Kabul Senaryoları (GWT):**
1. **AK-2.1 — GIVEN** dönüştürülmüş `deployment/v2/dev/*/device-configs` **WHEN** tüm JSON'lar taranır **THEN** hiçbirinde `transport` anahtarı ve `connector.sim` yoktur
2. **AK-2.2 — GIVEN** dönüştürülmüş config'ler ve `demo-v2.site.json` **WHEN** her config'in `(deviceId, kapsam)` çifti Sim-Lab cihaz anahtarına eşlenir **THEN** host `sim-lab`, port Sim-Lab'ın o cihaz için açtığı port ile aynıdır (konnektör izleme cihazı dahil)
3. **AK-2.3 — GIVEN** dönüşüm sonrası repo **WHEN** `bun tools/device-config-drift.mjs` çalışır **THEN** hata sayısı 10'u aşmaz ve yeni hata satırı içermez

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
| :--- | :--- | :--- | :--- |
| AK-2.1 | v2 config'lerinde simülatör alanı yok | unit | ⬜ |
| AK-2.2 | Config hedefleri Sim-Lab portlarıyla birebir | unit | ⬜ |
| AK-2.3 | Drift tabanı korunur | kod inceleme | ⬜ |

**T Görev Listesi:**
- [ ] T-4: Config tutarlılık testi (AK-2.1, AK-2.2) — v2 config'lerini ve `demo-v2` site genişletmesini karşılaştırır (kırmızı)
- [ ] T-5: 44 config'in dönüşümü (Sim-Lab export çıktısı başlangıç noktası olarak kullanılabilir; yalnız izinli alanlar)
- [ ] T-6: v2 compose'ları: `gd-simnet` external ağı, `PCS_BMS_TARGET_*` ve `DEBUG_INJECT_*` env'lerinin silinmesi; `.env.example`'lar
- [ ] T-7: Drift aracı koşusu ve sonucun KAPANIŞ'a işlenmesi

**Edge Cases:**
| Durum | Davranış |
| :--- | :--- |
| Sim-Lab kalkmadan v2 stack'i kalkar | device-service bağlantı hatasını mevcut yeniden bağlanma davranışıyla yönetir; cihazlar offline görünür, Sim-Lab açılınca toparlanır |
| `gd-simnet` yok (Sim-Lab hiç kalkmamış) | `docker compose up` "network not found" ile durur — `start:demo-integration` sırası Sim-Lab'ı önce kaldırır (UC-5) |
| v2 dışı bir deployment aynı config'leri kopyalar | Gerçek sahada host/port yeniden düzenlenir (AGENTS-DEPLOYMENT kural 4) — bu SPEC etkilemez |

**Involved Files:**
| Dosya | Rol / Değişiklik |
| :--- | :--- |
| `deployment/v2/dev/container/device-configs/*.json` | host/port, `transport` ve `connector.sim` silme |
| `deployment/v2/dev/container2/device-configs/*.json` | aynı |
| `deployment/v2/dev/field/device-configs/*.json` | aynı |
| `deployment/v2/dev/{container,container2,field}/docker-compose.yml` | `gd-simnet`, env temizliği |
| `deployment/v2/dev/{container,container2,field}/.env.example` | env temizliği |

---

### 6.3 UC-3 — device-service'i saflaştırma

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: `run.ts#main`'den `SimulatorHost`, `DebugInjector`, `bmsTarget`, `pcsPowerHost` kurulumunun kaldırılması; `debug-injector.ts` ve testinin silinmesi; `@gd-monorepo/simulators` bağımlılığının `package.json`/vitest config'inden çıkması; `DeviceTransportConfig`'ten `"simulator"`, `type`, `bmsPort` alanlarının kalkması; config yükleyicide K8 fail-fast
- hariç: `packages/simulators` içindeki `SimulatorHost` ve eski simülatörlerin silinmesi (Sim-Lab yardımcı cihazlarda eski sınıfları kullanmaya devam eder — §11); device-service'in poll/komut/alarm davranışı (değişmez)

**Akış:**
1. Mevcut davranışı sabitleyen karakterizasyon testleri yazılır (poll/komut yolu TCP — `SimulatorHost` olmadan aynı kalmalı).
2. `run.ts` yalnız MQ, Postgres, logger ve `DeviceService` kurar.
3. Config yükleyici `transport.kind === "simulator"` görürse dosya + deviceId ile hata fırlatır.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
| :--- | :--- | :--- |
| FR-3.1 | System MUST device-service açılışında hiçbir Modbus sunucusu ve inject HTTP ucu açmamak | AK-3.1 |
| FR-3.2 | System MUST `transport.kind: "simulator"` içeren config'i açılışta reddetmek (fail-fast, dosya + deviceId mesajlı) | AK-3.2 |
| FR-3.3 | System MUST `services/device-service` kaynak ve testlerinde `@gd-monorepo/simulators` import'u bulundurmamak | AK-3.3 |
| FR-3.4 | System MUST mevcut poll/komut/alarm testlerini değişiklik sonrası yeşil tutmak | AK-3.4 |

**Kabul Senaryoları (GWT):**
1. **AK-3.1 — GIVEN** geçerli TCP config'leri **WHEN** device-service başlar **THEN** süreç hiçbir porta `listen` yapmaz (yalnız istemci bağlantıları açar)
2. **AK-3.2 — GIVEN** `transport.kind: "simulator"` içeren bir config dosyası **WHEN** config yükleyici çalışır **THEN** `DomainError` fırlatır; mesaj dosya adını ve deviceId'yi içerir; servis açılmaz
3. **AK-3.3 — GIVEN** repo **WHEN** `services/device-service` altında `@gd-monorepo/simulators` aranır **THEN** eşleşme yoktur ve `package.json` bağımlılığı yoktur
4. **AK-3.4 — GIVEN** değişiklik sonrası kod **WHEN** `nx run device-service:test` çalışır **THEN** tüm testler yeşildir (bugünkü taban 96/96; silinen `debug-injector` testleri hariç sayılır)

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
| :--- | :--- | :--- | :--- |
| AK-3.1 | device-service sunucu/inject ucu açmaz | unit | ⬜ |
| AK-3.2 | Simülatör config'i fail-fast | unit | ⬜ |
| AK-3.3 | Simülatör paketi bağımlılığı yok | kod inceleme | ⬜ |
| AK-3.4 | Mevcut davranış testleri yeşil | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-8: Karakterizasyon testleri — `run.ts` bootstrap'ının sunucu açmadığını ve config yükleyicinin simülatör config'ini reddettiğini sabitleyen testler (kırmızı)
- [ ] T-9: `run.ts#main` sadeleştirme; `src/debug-injector.ts` + testinin silinmesi
- [ ] T-10: `packages/shared-types/src/config/device-config.ts#DeviceTransportConfig` daraltma + config yükleyicide fail-fast
- [ ] T-11: `services/device-service/package.json` ve `vitest.config.ts`'ten simülatör paketinin çıkarılması; `device-factory.test.ts` güncellemesi

**Edge Cases:**
| Durum | Davranış |
| :--- | :--- |
| Config'te `transport` bloğu var ama `kind: "tcp"` | Kabul edilir (gerçek saha biçimi) |
| `connector.device` var, `connector.sim` yok | Konnektör izleme cihazı normal Modbus cihazı olarak poll edilir (mevcut `device-factory.ts#createConnector` yolu) |
| `connector.sim` kalmış | Uyarı log'u + alan yok sayılır (veri yolu etkilenmez) — A2 ile kesinleşir |

**Involved Files:**
| Dosya | Rol / Değişiklik |
| :--- | :--- |
| `services/device-service/run.ts` | `SimulatorHost`/`DebugInjector`/sim env kurulumunun silinmesi |
| `services/device-service/src/debug-injector.ts` (+ test) | SİLİNİR |
| `services/device-service/src/device-factory.test.ts` | Simülatör referanslarının temizlenmesi |
| `services/device-service/package.json`, `vitest.config.ts` | Bağımlılık temizliği |
| `packages/shared-types/src/config/device-config.ts` | `DeviceTransportConfig` daraltma |
| Config yükleyici (`DeviceConfigLoader`) | K8 fail-fast |

---

### 6.4 UC-4 — God mode API sözleşmesi ve eski inject uyumluluğu

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: Testlerin dayanacağı Sim-Lab uçlarının sözleşmeye bağlanması (girdi, yanıt, hata kodu); `/compat/<c1|c2|field>/inject` ve `/compat/<kapsam>/health` uçları; eski senaryo adı → Sim-Lab eylemi eşleme tablosu
- hariç: Arayüz (`public/index.html`) değişiklikleri; yeni arıza tipleri; kimlik doğrulama (god mode yalnız dev/test ağında — A3)

**God mode uçları (sözleşme kapsamı):**

| Uç | Girdi | Başarı | Hata |
| :--- | :--- | :--- | :--- |
| `POST /api/point` | `{selector, point, value, mode: hold\|write, durationS?}` | 200 + cihaz başına sonuç listesi | 400 geçersiz gövde; seçici eşleşmezse 200 + boş liste |
| `POST /api/release` | `{selector, point?}` | 200 | 400 |
| `POST /api/series/start` · `/stop` | CSV/satırlar + zaman modu | 200 | 400 ayrıştırma hatası (satır no) |
| `POST /api/fault` | `{defId, selector, params?}` | 200 + uygulanan cihazlar | 404 bilinmeyen `defId` |
| `POST /api/comm` | `{selector, mode, durationS?}` | 200 | 400 |
| `POST /api/scenario/start` · `/stop` | `{id}` | 200 | 404 |
| `GET /api/state` · `/api/device/:key` · `/api/stream` | — | 200 / SSE | 404 bilinmeyen cihaz |

**Eski senaryo eşleme tablosu (uyumluluk ucu):**

| Eski cihaz / senaryo | Sim-Lab eylemi (öneri — T-13'te testle kesinleşir) |
| :--- | :--- |
| BSC `soc:<n>` | `rack.setSoc` tüm raflar, değer n |
| BSC `overheat` / `diff_temp` / `fault` | `rack.hotspot` / `rack.tempSensor` / `bsc.forceDiag` |
| PCS `fault` / `door_open` | `pcs.faultBit` / `pcs.door` |
| HVAC `hot` / `cold` / `humid` | İlgili zon sıcaklık/nem register'ında `hold` (yüksek / düşük / yüksek nem) |
| CONTROL-PANEL-IO `battery_door_open/close`, `panel_door_open/close`, `fire`, `first_stage` | `io.door` (kapı + yön), `io.fss` (yangın / ilk kademe) |
| IMD `fault` / `warning` / `device_error` | `imd.fault` (seviye parametresiyle) |
| DC-METER `overcurrent` / `overvoltage` | `dcmeter.alarm` (tip parametresiyle) |
| PM5340 `aux_loss` | Gerilim register'larında `hold` 0 |
| Herhangi `nominal` / `healthy` / `*_close` | O cihazın aktif arıza ve `hold`'larını serbest bırak |

**Akış:**
1. Test `POST /compat/c1/inject {deviceId:"IMD-1", scenario:"fault"}` gönderir.
2. Sim-Lab kapsamı (`c1` → `C1.`) ve cihazı çözer, tabloya göre eylemi uygular.
3. Uygulandıysa 200 `{applied:true}`, tanımsızsa 404 `{applied:false}` döner (eski `DebugInjector` yanıt şekli).

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
| :--- | :--- | :--- |
| FR-4.1 | System MUST god mode uçlarını yukarıdaki tabloya uygun girdi/yanıt/hata koduyla sunmak | AK-4.1 |
| FR-4.2 | System MUST `/compat/<kapsam>/inject` ucunda eski gövde ve yanıt şeklini (`{deviceId, scenario}` → `{applied}`; 200/404/400) korumak | AK-4.2 |
| FR-4.3 | System MUST eşleme tablosundaki her senaryo için EMS'in okuduğu register'da gözlemlenebilir değişiklik üretmek | AK-4.3 |
| FR-4.4 | System MUST `nominal`/`healthy` senaryosunda cihazın tüm god mode etkilerini geri almak | AK-4.4 |

**Kabul Senaryoları (GWT):**
1. **AK-4.1 — GIVEN** çalışan Sim-Lab **WHEN** her god mode ucuna geçerli ve geçersiz gövde gönderilir **THEN** durum kodları ve yanıt şekli sözleşme tablosuyla aynıdır
2. **AK-4.2 — GIVEN** çalışan Sim-Lab **WHEN** `/compat/c2/inject`'e gövdesiz, bilinmeyen senaryolu ve geçerli istek gönderilir **THEN** sırasıyla 400, 404 `{applied:false}`, 200 `{applied:true}` döner ve geçerli istek yalnız `C2.` kapsamındaki cihazı etkiler
3. **AK-4.3 — GIVEN** EMS okuma sınıfı (`@gd-monorepo/core` `ModbusDevice`) Sim-Lab'a bağlı **WHEN** tablodaki her senaryo uyumluluk ucundan uygulanır **THEN** ilgili telemetri/alarm bitinde beklenen değişiklik bir poll içinde okunur
4. **AK-4.4 — GIVEN** bir cihaza `fault` ve bir `hold` uygulanmış **WHEN** aynı cihaza `nominal` gönderilir **THEN** `/api/overrides` o cihaz için boştur ve aktif arıza listesinde o cihaz yoktur

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
| :--- | :--- | :--- | :--- |
| AK-4.1 | God mode uçları sözleşmeye uyar | unit | ⬜ |
| AK-4.2 | Uyumluluk ucu eski şekli korur ve kapsamlıdır | unit | ⬜ |
| AK-4.3 | Her eski senaryo EMS'in okuduğu register'a yansır | unit | ⬜ |
| AK-4.4 | `nominal` tüm etkileri geri alır | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-12: God mode uç sözleşme testleri (`apps/sim-lab/src/http/api.ts` — HTTP seviyesinde, kırmızı)
- [ ] T-13: Eşleme tablosunun JSDoc sözleşmesi + senaryo başına EMS okuma yolu testi (`physical/conformance` deseniyle)
- [ ] T-14: `/compat/<kapsam>/inject` ve `/health` uçlarının implementasyonu

**Edge Cases:**
| Durum | Davranış |
| :--- | :--- |
| Kapsam öneki bilinmiyor (`/compat/c9/inject` demo-v2'de) | 404 `{error}` |
| Aynı cihaza ardışık iki farklı arıza | Etkiler birikir; `nominal` hepsini kaldırır |
| Süreli `hold` dolarken `nominal` gelir | Serbest bırakma idempotent — hata yok |
| Zaman serisi aynı register'ı yazarken `hold` gelir | `hold` önceliklidir (mevcut overlay davranışı); seri o register için atlanır |

**Involved Files:**
| Dosya | Rol / Değişiklik |
| :--- | :--- |
| `apps/sim-lab/src/http/api.ts` | `/compat/*` uçları; sözleşme testleri |
| `apps/sim-lab/src/http/compat-inject.ts` | YENİ — eşleme tablosu (eski senaryo → eylem) |
| `packages/simulators/src/physical/faults/catalog.ts` | Gerekirse parametre eklemeleri (IMD seviye, DC metre tipi) |
| `apps/sim-lab/README.md`, `docs/simulators/FIZIKSEL-SAHA-SIMULATORU.md` | God mode + uyumluluk dokümantasyonu |

---

### 6.5 UC-5 — demo-field entegrasyon ve e2e testlerinin geçişi

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: `start:demo-integration` / `stop:demo-integration` script'lerine Sim-Lab'ın eklenmesi (ilk kalkan, son inen); `DEMO_*_INJECT_URL` varsayılanlarının `http://localhost:8090/compat/<kapsam>`'a çevrilmesi; e2e spec'lerindeki inject base URL'lerinin aynı şekilde güncellenmesi
- hariç: Test senaryolarının mantığı (aynı kalır); yeni test senaryoları

**Akış:**
1. `start:demo-integration` önce `simulator-app` compose'unu (`demo-v2`) kaldırır, sonra container, container2, field.
2. Testler eski `inject(base, deviceId, scenario)` yardımcılarını yeni base URL'lerle kullanır.
3. `stop:demo-integration` v2 stack'lerini indirir, en son Sim-Lab'ı.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
| :--- | :--- | :--- |
| FR-5.1 | System MUST `start:demo-integration` sırasında Sim-Lab'ı v2 stack'lerinden önce kaldırmak ve `stop` sırasında en son indirmek | AK-5.1 |
| FR-5.2 | System MUST demo-field entegrasyon ve e2e testlerini yalnız inject base URL'leri değişerek geçirmek | AK-5.2 |

**Kabul Senaryoları (GWT):**
1. **AK-5.1 — GIVEN** temiz docker ortamı **WHEN** `bun run start:demo-integration` çalışır **THEN** `gd-simnet` ve `gd-sim-lab` konteyneri v2 servislerinden önce vardır ve üç device-service'in cihazları online görünür; `stop` sonrası hiçbir konteyner ve `gd-simnet` kalmaz
2. **AK-5.2 — GIVEN** çalışan demo stack'i **WHEN** `bun run test:demo-integration` ve `bun run test:e2e` (demo-faults, demo-protection) koşar **THEN** testler bugünkü sonuçlarla aynı yeşil sayıyı verir; test dosyalarındaki diff yalnız URL sabitleridir

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
| :--- | :--- | :--- | :--- |
| AK-5.1 | Başlatma/durdurma sırası doğru | e2e | ⬜ |
| AK-5.2 | Testler yalnız URL değişikliğiyle geçer | e2e | ⬜ |

**T Görev Listesi:**
- [ ] T-15: Kök `package.json` `start:/stop:demo-integration` script'leri
- [ ] T-16: `apps/demo-field/integration/helpers.ts` URL varsayılanları; `e2e/demo-faults.spec.ts`, `e2e/demo-protection.spec.ts` base URL'leri
- [ ] T-17: Tam demo koşusu (entegrasyon + e2e) ve sonuçların KAPANIŞ'a işlenmesi

**Edge Cases:**
| Durum | Davranış |
| :--- | :--- |
| Sim-Lab imajı build edilemiyor | `start:demo-integration` ilk adımda durur; v2 stack'leri kalkmaz |
| Test, Sim-Lab 52 sunucunun tamamını açmadan inject atar | `/compat/*/health` hazır olana kadar 503 döner; yardımcı mevcut bekleme mantığını kullanır |
| e2e ortamı farklı host'ta | `DEMO_*_INJECT_URL` env'leriyle ezilir (mevcut mekanizma) |

**Involved Files:**
| Dosya | Rol / Değişiklik |
| :--- | :--- |
| `package.json` | demo-integration script'leri |
| `apps/demo-field/integration/helpers.ts` | inject URL varsayılanları |
| `e2e/demo-faults.spec.ts`, `e2e/demo-protection.spec.ts` | inject base URL |

---

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
| :--- | :--- |
| Sim-Lab açılıyor | Sunucular sırayla açılır; `/api/meta` 200, `/compat/*/health` tüm sunucular dinlemeye geçene kadar 503 |
| Sim-Lab çalışıyor, EMS bağlı | Cihazlar EMS komutuyla durum değiştirir; god mode etkileri overlay olarak üstte durur |
| Sim-Lab yeniden başladı | Tüm god mode etkileri ve model durumu sıfırlanır; device-service yeniden bağlanır (gerçek cihaz güç kesintisi davranışı) |
| device-service simülatör config'i görür | Beklenen hata → `DomainError` ile açılışı durdurur (K8) |
| God mode geçersiz girdi | Beklenen hata → 400/404 JSON; Sim-Lab durumu değişmez |
| Sim-Lab'da beklenmeyen hata (model istisnası) | Log + ilgili cihazın sunucusu exception 0x04 döner; servis ayakta kalır |
| Limitler | Tek süreç, demo-v2 için 44 + 4 konnektör + 4 BMS yüzü = 52 sunucu; GD-1 için 226 — boşta ~9 ms CPU / simülasyon saniyesi (GD-1 ölçümü) |

---

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
| :--- | :--- | :--- |
| SC-1 | device-service simülatör kodu taşımaz | `services/device-service` içinde `@gd-monorepo/simulators` referansı 0; `run.ts` yalnız MQ/DB/logger/`DeviceService` kurar |
| SC-2 | v2 demo stack'i Sim-Lab ile uçtan uca çalışır | `test:demo-integration` + ilgili e2e spec'leri bugünkü yeşil sayıda |
| SC-3 | Saha config'i ile demo config'i aynı biçimde | v2 config'lerinde `transport`/`connector.sim` 0; drift aracı tabanı (10) korunur |
| SC-4 | Test müdahalesi EMS dışında | EMS servislerinde inject/god mode ucu 0; tüm müdahaleler Sim-Lab `:8090` üzerinden |

---

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
| :--- | :--- |
| 1. SPEC | Bu doküman |
| 2. JSDoc | God mode uç sözleşmeleri (T-12), eşleme tablosu (T-13), config yükleyici fail-fast (T-10), `run.ts` bootstrap sözleşmesi (T-8) |
| 3. TEST | T-1, T-4, T-8, T-12, T-13 (kırmızı) |
| 4. IMPL | T-2, T-3, T-5, T-6, T-9, T-10, T-11, T-14, T-15, T-16 |
| 5. KAPANIŞ | `SIMULATOR-SERVISI-KAPANIS.md` (T-7, T-17 kanıtlarıyla) |

---

## 10. Açık Kararlar

| # | Konu | Durum |
| :--- | :--- | :--- |
| A1 | K4–K8 "öneri" kararlarının developer onayı | Açık — SPEC onayıyla kapanır |
| A2 | `connector.sim` kalan config'te davranış: uyarı + yok say mı, fail-fast mı | Açık — T-10'da kapanır (öneri: uyarı) |
| A3 | God mode ucu için kimlik doğrulama | Açık — dev/test ağı dışında yayın yapılmayacaksa gerekmez; yapılacaksa ayrı SPEC |
| A4 | v2 container ↔ PCS eşleşmesinin (C1 → PCS-1/2, C2 → PCS-3/4) mevcut mapping dosyalarıyla teyidi | Açık — T-1'de kapanır |
| A5 | P-5 (PCS soft start ↔ `start` komutu 3 s timeout) ve H-4 (`force_cool` etkisiz) bulgularının demo-v2'de "gercek" profilde koşulması | Açık — bu SPEC "uyumlu" profille kapanır; "gercek" profil ayrı iş |

---

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. `packages/simulators` eski BSC/PCS/HVAC sınıfları ve `SimulatorHost`'un emekliye ayrılması ya da fiziksel modele ince adaptör olarak taşınması — ayrı SPEC (Sim-Lab yardımcı cihazlarda eski sınıfları kullanmaya devam ettiği için silme bu pakette yapılmaz).
2. `packages/simulators/src/physical` modülünün Elegant Object refaktörü ve kendi SPEC/KAPANIŞ'ı (B8).
3. `packages/core` bayt sırası tutarsızlığı (C-1 + 16-bit `*_SWAP` hatası) — ayrı düzeltme paketi.
4. GD-1 (9 konteyner) sahası için v2 benzeri tam EMS stack'i (9 konteyner device-service).

---

## 12. T Görev Özeti

| T | Görev | UC |
| :--- | :--- | :--- |
| T-1 | demo-v2 site dosyası + deviceId/port eşitlik testi | UC-1 |
| T-2 | simulator-app compose: `gd-simnet`, port profili, yeni env'ler | UC-1 |
| T-3 | Sim-Lab `--assist` / `--autostart` bayrakları | UC-1 |
| T-4 | v2 config tutarlılık testi | UC-2 |
| T-5 | 44 v2 config'inin dönüşümü | UC-2 |
| T-6 | v2 compose ağ/env güncellemesi | UC-2 |
| T-7 | Drift aracı koşusu | UC-2 |
| T-8 | device-service karakterizasyon testleri | UC-3 |
| T-9 | `run.ts` sadeleştirme, `debug-injector` silme | UC-3 |
| T-10 | `DeviceTransportConfig` daraltma + fail-fast | UC-3 |
| T-11 | device-service bağımlılık temizliği | UC-3 |
| T-12 | God mode uç sözleşme testleri | UC-4 |
| T-13 | Eski senaryo eşleme sözleşmesi + EMS okuma yolu testi | UC-4 |
| T-14 | `/compat/*` uçları | UC-4 |
| T-15 | demo-integration script'leri | UC-5 |
| T-16 | Test URL güncellemeleri | UC-5 |
| T-17 | Tam demo koşusu ve KAPANIŞ kanıtları | UC-5 |

İş sırası: UC-1 → UC-4 (Sim-Lab hazır) → UC-2 → UC-3 → UC-5.
