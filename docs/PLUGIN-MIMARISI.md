# Plugin Mimarisi — Entegrasyon Servisi ve Plugin SDK

> **Hedef Kitle:** Yazılım ekibi  
> **Amaç:** Plugin SDK'nın tasarım kararlarını, kontratlarını, entegrasyon servisinin çalışma modelini ve müşteri plugin geliştirme sürecini tek kaynaktan anlatmak.  
> **Durum:** Uygulanmış (Faz 1–4). EPIAŞ doküman incelemesi ve web-service bağlantısı sıradadır.

---

## İçindekiler

1. [Karar Özeti: Neden Plugin Mimarisi](#1-karar-özeti-neden-plugin-mimarisi)
2. [Mimari Şema ve Paket Dizilimi](#2-mimari-şema-ve-paket-dizilimi)
3. [Plugin SDK Sözleşmesi](#3-plugin-sdk-sözleşmesi)
4. [Entegrasyon Kontratı](#4-entegrasyon-kontratı)
5. [Entegrasyon Servisi Çalışma Modeli](#5-entegrasyon-servisi-çalışma-modeli)
6. [EPIAŞ Plugin](#6-epiaş-plugin)
7. [Müşteri Plugin Geliştirme Rehberi](#7-müşteri-plugin-geliştirme-rehberi)
8. [Deployment](#8-deployment)
9. [Test Durumu](#9-test-durumu)
10. [Bilinen Durumlar ve Sıradaki İşler](#10-bilinen-durumlar-ve-sıradaki-işler)

---

## 1. Karar Özeti: Neden Plugin Mimarisi

### 1.1 İhtiyaç

- **Entegrasyon servisi:** EPIAŞ API üzerinden enerji fiyatları vb. verilerin düzenli aralıklarla çekilmesi. Veriler boss ve field app'de grafik olarak gösterilecek, ileride ML ile de bağlanılacak.
- **Management servisi (henüz geliştirilmedi):** Otomatik manevraları tetikleyecek, plugin based olacak.
- İki servisin de aynı "eklenti" ihtiyacı var: domain mantığını izole etmek, müşteriye özel varyantları bağımsız test/deploy edebilmek.

### 1.2 Literatür Değerlendirmesi

| Model | Örnek | Değerlendirme |
|---|---|---|
| Tam plugin platformu (hot-load, sandbox, version negotiation, marketplace) | OSGi, VS Code, Backstage | **Uygun değil.** Marketplace yok, pluginleri hep biz geliştiriyoruz. Maliyetin büyük kısmı (sandbox, keşif/mağaza, versiyon müzakere) gereksiz. |
| Operator/collector modeli (scheduling loop platformda, iş birimi eklentide) | Airflow operators, Prefect tasks | **Çok uygun.** "Düzenli aralıkla çek" problemi; BullMQ repeatable job altyapısı zaten mevcut. |
| Hafif in-process extension framework (contract + registry + manifest) | Backstage (basitleştirilmiş), Vite plugin API | **Seçilen model.** İki servis aynı loader'ı kullanır. |

**Sonuç:** Tam teşekküllü plugin sistemi değil, **hafif bir Plugin SDK + registry + manifest** kuruldu.

### 1.3 Verilen Kararlar

1. **Yükleme modeli — Hybrid:**
   - Kendi pluginlerimiz Nx workspace paketi (`packages/plugins/*`) → type-safe, Nx build düzeniyle derlenir.
   - Loader ayrıca `INTEGRATION_PLUGIN_DIR` dizinini tarar → müşteriye özel pluginler Docker volume ile servis imajını yeniden build etmeden deploy edilir.
2. **Zamanlama — BullMQ repeatable jobs:** Plugin zamanlamayı **sahiplenmez**, `schedule()` ile **declare eder**. Loop, retry, concurrency servis core'unda (BullMQ) çalışır. Redis'te persistence, restart sonrası devam — data/device-service ile tutarlı pattern.
3. **Plugin granülaritesi — veri domaini başına plugin:** `epias-market-prices`, ileride `epias-forecast`, `epias-outages` vb. Her biri bağımsız schedule, bağımsız hata izolasyonu. Ortak `epias-client` paylaşılır (doküman incelemesi sonrası).

---

## 2. Mimari Şema ve Paket Dizilimi

```
packages/plugin-sdk/                    # @gd-monorepo/plugin-sdk — domain-agnostic framework
  src/manifest.ts       # PluginManifest { name, version, kind, sdkVersion, description }
  src/plugin.ts         # IPlugin { manifest(), activate(), deactivate(), health() }
  src/context.ts        # PluginContext, PluginLogger, IPluginStateStore, PluginConfigSource,
                        #   PluginContextFactory, ConsolePluginLogger, FilePluginStateStore,
                        #   JsonFilePluginConfigSource
  src/registry.ts       # PluginRegistry — isim cakismasi + SDK semver uyum kontrolu
  src/sources.ts        # PluginSource: StaticPluginSource + DirectoryPluginSource
  src/loader.ts         # PluginLoader — kaynaklari tarar, registry'ye kaydeder
  src/sdk-version.ts    # SemVerRange (">=" ve "<" operatorleri)
  src/sdk.ts            # SDK_VERSION = "1.0.0"

packages/shared-types/src/
  integration-plugin.ts # ScheduleSpec, FetchWindow, MarketDataPoint, IIntegrationPlugin
  job.ts                # JobType'a "FETCH_EXTERNAL" + FetchExternalJob eklendi

packages/core/src/messaging/bullmq-adapter.ts
                        # QUEUE_NAMES + jobTypes listesine FETCH_EXTERNAL eklendi

services/integration-service/
  run.ts                # ConfigLoader → Redis/BullMQ, Postgres → loader → IntegrationService
  src/integration-service.ts   # activate → zamanlama → worker (FETCH_EXTERNAL)
  src/external-series-writer.ts # TimescaleDB "external_series" hypertable yazici/sorgulayici
  config/plugins/epias-market-prices.example.json
  deployment/Dockerfile.dev

packages/plugins/epias-market-prices/   # ornek plugin (workspace paketi)
  src/http-gateway.ts   # HttpGateway (testlerde mock) + FetchHttpGateway
  src/plugin.ts         # EpiasMarketPricesPlugin
  src/index.ts          # named export "plugin" ornegi (StaticPluginSource icin)

deployment/customer-plugins/            # musteri pluginleri icin mount edilen dizin (.gitkeep)
```

### 2.1 Veri Akışı

```
EPIAŞ API
   │  (plugin.fetch — HTTP, X-IBM-Client-Id)
   ▼
EpiasMarketPricesPlugin  ──►  normalize MarketDataPoint[]  ──►  ExternalSeriesWriter
   ▲                                                                   │
   │  FETCH_EXTERNAL repeatable job                                    ▼
IntegrationService (BullMQ worker)                          TimescaleDB "external_series"
                                                                       │
                                                                       ▼
                                    (SIRADA) web-service REST: GET /api/integrations/series
                                                                       │
                                                                       ▼
                                            boss web chart bileşenleri (TelemetryChart)
```

---

## 3. Plugin SDK Sözleşmesi

### 3.1 `IPlugin` — Yaşam Döngüsü

```ts
export interface IPlugin<C extends PluginContext = PluginContext> {
  manifest(): PluginManifest;                 // sorgu
  activate(context: C): Promise<void>;        // komut
  deactivate(): Promise<void>;                // komut
  health(): PluginHealth;                     // sorgu
}
```

**CQS uyumu:** `activate`/`deactivate` komuttur (yan etki), `manifest`/`health` sorgudur. `PluginHealth` → `{ status: "healthy" | "degraded" | "unhealthy", lastRunAt?, lastSuccessAt?, message? }`.

### 3.2 `PluginManifest`

```ts
interface PluginManifest {
  name: string;          // benzersiz slug: "epias-market-prices"
  version: string;       // semver "1.0.0"
  kind: PluginKind;      // "integration" | "management" | "custom"
  sdkVersion: string;    // ">=1.0.0 <2.0.0" — SDK ile uyum araligi
  description: string;
}
```

`kind` yalnızca metadata'dır; servisler manifest verisine bakarak ilgilenmedikleri kind'ı atlar (çalışma zamanında tip denetimi/instanceof yoktur).

### 3.3 `PluginContext` — Enjekte Edilen Servisler

```ts
interface PluginContext {
  logger: PluginLogger;                    // [Plugin:<ad>] prefix'li
  config: Record<string, unknown>;         // <configDir>/<plugin-adi>.json ham degerleri
  pluginDir: string;                       // runtime pluginleri icin anlamli
  state: IPluginStateStore;                // kalici durum (cursor vb.)
}
```

- **Config:** `<configDir>/<plugin-adi>.json` — dosya yoksa `{}`. Doğrulama plugin'in kendisinde (`activate` sırasında throw → aktivasyon başarısız, servis devam eder).
- **State:** JSON dosyası (`<stateDir>/<plugin-adi>.json`) — Redis/DB bağımlılığı yok. `read`/`write`/`remove`, atomik yazım (tmp + rename).
- `PluginContextFactory.create(pluginName, pluginDir)` — hem integration hem management servislerinde kullanılacak ortak parça.

### 3.4 `PluginRegistry` — Tek Kayıt Otoritesi

- Aynı isimde ikinci kayıt → throw (loader yakalar, warn loglar, diğer pluginler yüklenmeye devam eder).
- `sdkVersion` aralığı `SDK_VERSION`'ı kapsamıyorsa → throw.
- `registrations()`, `find(name)`, `names()`, `deactivateAll()`, `health()`.

### 3.5 `PluginLoader` + Kaynaklar

```ts
const loader = new PluginLoader(registry, [
  new StaticPluginSource([epiasMarketPrices]),          // workspace paketleri
  new DirectoryPluginSource(config.get("integration.pluginDir")),  // runtime dizin
]);
await loader.load();
```

- **StaticPluginSource:** plugin instance'ları doğrudan kodda enjekte edilir (constructor injection). Type-safe.
- **DirectoryPluginSource:** `<dizin>/<plugin-adi>/plugin.json` + entry modülü (`"entry": "./index.js"`, varsayılan `./index.js`). Entry modülü **named export `plugin`** içermelidir. Dinamik import tek tip sınır noktasıdır — `ELEGANT-EXCEPTION` yorumuyla belgelenmiştir; `instanceof`/reflection kullanılmaz.

### 3.6 Elegant Object Kurallarıyla İlişki

| Kural | Uygulama |
|---|---|
| Statik metot yasağı | Loader/registry hep instance; tek istisna yok |
| NULL yasağı | `find()` → `T \| undefined`; state `read()` → `undefined`; DTO'lar dışında null yok |
| Immutability | Registry Map'i private; state store dışarıdan enjekte edilen dosya yoluna yazar |
| instanceof yasağı | Hiçbir yerde tip denetimi yok; kind kontrolü manifest verisiyle yapılır |
| Getter/setter yasağı | `manifest()`/`health()`/`names()` sorgu olarak isimlendirildi; `getX()` yok |
| CQS | Komutlar `Promise<void>`, sorgular değer döndürür (tek istisna: `fetch()` cursor yazımı — belgeli ELEGANT-EXCEPTION) |
| `*Manager`/`*Processor` isim yasağı | `PluginLoader`, `PluginRegistry`, `ExternalSeriesWriter` isimleri domain odaklı |

---

## 4. Entegrasyon Kontratı

`packages/shared-types/src/integration-plugin.ts`:

```ts
interface ScheduleSpec {
  mode: "cron" | "interval" | "manual";
  cron?: string;        // mode: "cron"
  everyMs?: number;     // mode: "interval"
  startDate?: string;   // ilk calisma zamani (ISO, opsiyonel)
}

interface FetchWindow { from?: string; to?: string; }   // backfill / manuel tetik

interface MarketDataPoint {
  source: string;       // "epias"
  series: string;       // "MCP", "SMF"
  timestamp: string;    // verinin ait oldugu zaman (ISO)
  value: number;
  unit: string;         // "TRY/MWh"
  tags?: Record<string, string>;
}

interface IIntegrationPlugin<C extends PluginContext = PluginContext> extends IPlugin<C> {
  schedule(): ScheduleSpec;                          // sorgu — declare
  fetch(context: C, window?: FetchWindow): Promise<MarketDataPoint[]>;  // sorgu
}
```

**Temel ilkeler:**

- **Plugin zamanlamayı sahiplenmez.** `schedule()` declare eder; repeatable BullMQ job'u servis core'u oluşturur.
- **Plugin storage'ı sahiplenmez.** `fetch()` normalize veri döner; TimescaleDB yazımı servis core'unda (`ExternalSeriesWriter`).
- **`MarketDataPoint` cihaz telemetrisinden ayrıdır** — `deviceId` yerine `source`/`series` taşır. Cihaz telemetrisi tablosuna karışmaz.
- `window` verilmezse plugin kendi cursor'una (state store) göre karar verir.

### 4.1 `FETCH_EXTERNAL` Job

```ts
interface FetchExternalJob extends BaseJob {
  type: "FETCH_EXTERNAL";
  pluginName: string;   // manifest.name
  window?: { from?: string; to?: string };
}
```

`BaseJob.deviceId` zorunlu alanı pluginName olarak kullanılır (queue'da `jobId` üretimi için). BullMQ queue adı: `queue_fetch_external`.

---

## 5. Entegrasyon Servisi Çalışma Modeli

### 5.1 `IntegrationService.start()` Akışı

1. **Activate:** `registry.registrations()` üzerinde `Promise.allSettled` — her plugin için `kind` kontrolü (integration olmayanlar atlanır + warn), per-plugin context üretimi (`PluginContextFactory`), `activate(context)`.
   - Tek plugin'in aktivasyon hatası diğerlerini etkilemez.
2. **Zamanlama:** Aktive edilen her plugin için `schedule()`:
   - `interval` → `mq.addRepeatableJobEvery("integration-fetch:<name>", job, everyMs, startDate?)`
   - `cron` → `mq.addRepeatableJob("integration-fetch:<name>", job, cron)`
   - `manual` → zamanlama kaydedilmez (sadece `runPlugin()` ile tetiklenir)
3. **Worker:** `mq.registerWorkerFor("FETCH_EXTERNAL", handler, { concurrency: 2 })` — handler: plugin bul → `fetch(ctx, job.window)` → `writer.write(points)` → log.

### 5.2 Hata ve İzolasyon Davranışı

- Fetch hataları BullMQ retry/backoff'unda (adapter varsayılanı: 3 attempt, exponential).
- Bir plugin'in hatası diğer pluginlerin job'larını etkilemez (her plugin ayrı repeatable job).
- `runPlugin(name, window?)` — manuel/backfill tetik; yazılan nokta sayısını döndürür.
- `stop()` — tüm pluginleri deactivate → `mq.close()` → DB bağlantısı kapat.

### 5.3 `ExternalSeriesWriter`

TimescaleDB tablosu:

```sql
CREATE TABLE IF NOT EXISTS external_series (
  source    VARCHAR(50)  NOT NULL,
  series    VARCHAR(100) NOT NULL,
  timestamp TIMESTAMPTZ  NOT NULL,
  value     DOUBLE PRECISION NOT NULL,
  unit      VARCHAR(20)  NOT NULL DEFAULT '',
  tags      JSONB DEFAULT '{}',
  PRIMARY KEY (source, series, timestamp)
);
```

- `create_hypertable('external_series', 'timestamp', if_not_exists => TRUE)` — TimescaleDB uzantısı yoksa try/catch + warn (test ortamları için toleranslı).
- Yazım **upsert** (`ON CONFLICT (source, series, timestamp) DO UPDATE`) — aynı pencerenin tekrar çekilmesi duplicate üretmez.
- `query(source, series, from, to)` — web-service endpoint'i bu sorguyu kullanacak.

---

## 6. EPIAŞ Plugin

`packages/plugins/epias-market-prices`

### 6.1 Config (`<configDir>/epias-market-prices.json`)

```json
{
  "clientId": "EPIAS-CLIENT-ID-BURAYA",
  "baseUrl": "https://seffaflik.epias.com.tr/electricity-service/v1",
  "intervalMs": 3600000,
  "series": [
    { "name": "MCP", "path": "/markets/dam/data/mcp", "unit": "TRY/MWh",
      "dateField": "date", "valueField": "price" },
    { "name": "SMF", "path": "/markets/smp/data/smp", "unit": "TRY/MWh",
      "dateField": "date", "valueField": "price" }
  ]
}
```

### 6.2 Davranış

- **Auth:** `X-IBM-Client-Id` header'ı (v1 gateway). v2/OAuth2 ihtiyacı doküman incelemesinde netleşecek — `HttpGateway` soyutlaması bunun için ayrıldı.
- **Seri eşleme config'den:** endpoint yolları, tarih/değer alan adları config'de — EPIAŞ dokümanı teyit edilene kadar varsayılan kod sabiti yok.
- **Cursor:** `state["lastFetchTo"]` — pencere verilmezse cursor'dan devam; ilk çalışmada son 24 saat; bozuk satırlar (geçersiz tarih/değer) sessizce atlanır.
- **Config doğrulama:** `activate` sırasında manuel — `clientId`/`baseUrl`/`series` eksikse throw → plugin atlanır, servis çalışmaya devam eder.
- **Testler mock `HttpGateway` ile** — gerçek API'ye bağımlılık yok.

---

## 7. Müşteri Plugin Geliştirme Rehberi

### 7.1 Runtime Dizin Yapısı

```
<INTEGRATION_PLUGIN_DIR>/
  musteri-x-hava-durumu/
    plugin.json        # { "entry": "./index.js" }  (entry opsiyonel)
    index.js           # export const plugin = { ... }
    config.json        # (opsiyonel — konfigürasyon servis config dizininden de gelir)
```

### 7.2 Minimal Plugin (ESM JavaScript)

```js
// plugin.json: { "entry": "./index.js" }
export const plugin = {
  manifest: () => ({
    name: "musteri-x-hava-durumu",
    version: "1.0.0",
    kind: "integration",
    sdkVersion: ">=1.0.0 <2.0.0",
    description: "Hava durumu verisi",
  }),
  activate: async (context) => {
    // context.config, context.logger, context.state kullanilabilir
    context.logger.info("aktive edildi");
  },
  deactivate: async () => {},
  health: () => ({ status: "healthy" }),
  schedule: () => ({ mode: "interval", everyMs: 15 * 60 * 1000 }),
  fetch: async (context, window) => {
    // dis API'den veri cek, MarketDataPoint[] dondur
    return [
      { source: "hava-durumu", series: "Sicaklik",
        timestamp: new Date().toISOString(), value: 23.5, unit: "°C" },
    ];
  },
};
```

### 7.3 Kurallar

- **Named export `plugin` zorunlu** (default export yok — repo konvansiyonu).
- `manifest().name` benzersiz olmalı — çakışma durumunda statik (workspace) plugin kazanır, dizin plugin'i atlanır (warn).
- `sdkVersion` aralığı SDK'ya uygun olmalı; uyumsuzsa kayıt reddedilir.
- Kalıcılık: veriler `fetch()`'ten `MarketDataPoint[]` olarak döner — **DB yazımı müşteri plugininde yapılmaz**, servis core'u yapar.
- Türkçe docstring/log ön eki konvansiyonu geçerlidir.

### 7.4 Workspace Plugin'i (kendi geliştirdiklerimiz)

1. `packages/plugins/<yeni-plugin>/` altında paket aç (package.json, tsconfig, project.json, vitest.config.ts — `epias-market-prices`'ı kopyala).
2. `src/index.ts` içinde named export `plugin` örneği.
3. `integration-service/run.ts`'de `StaticPluginSource` listesine ekle.
4. `integration-service/package.json`'a bağımlılık ekle, `bun install`.

---

## 8. Deployment

### 8.1 Docker Compose (boss dev stack)

`deployment/docker-compose.boss.dev.yml` içinde `integration-service` servisi:

- **Env:** `INTEGRATION_PLUGIN_DIR=/app/customer-plugins`, `INTEGRATION_CONFIG_DIR=/app/config/plugins`, `INTEGRATION_STATE_DIR=/app/data/plugins` + Redis/Postgres bağlantıları.
- **Volume'lar:** service src, plugin-sdk src, epias plugin src (HMR benzeri dev deneyimi), `services/integration-service/config` → `/app/config`, `deployment/customer-plugins` → `/app/customer-plugins`, state için named volume.
- Redis + TimescaleDB healthcheck'e bağımlı.
- `Dockerfile.dev` web-service pattern'iyle aynı (oven/bun + `bun --watch run.ts`).

### 8.2 Çalıştırma

```bash
bun run dev:boss-stack          # tum boss stack (integration-service dahil)
nx run integration-service:dev  # sadece servis (yerel Redis/Postgres gerekir)
```

EPIAŞ plugin'ini aktif etmek için: `config/plugins/epias-market-prices.example.json` → `epias-market-prices.json` yapıp `clientId` gir. Config olmadan servis açılır, plugin aktivasyonu atlanır (warn log).

---

## 9. Test Durumu

| Paket | Test | Kapsam |
|---|---|---|
| `plugin-sdk` | 18 | SemVerRange, registry (çakışma/SDK uyumu/deactivate/health), loader (statik + dizin kaynağı, dinamik import, eksik manifest, çift kayıt), context factory + state store |
| `epias-market-prices` | 6 | manifest/schedule, satır→MarketDataPoint eşleme, cursor devamı, geçersiz config, bozuk satır atlama, activate öncesi fetch hatası |
| `integration-service` | 13 | start (interval/cron/manual, kind atlama), worker fetch+yazım, `runPlugin`, stop/health, ExternalSeriesWriter (init SQL, upsert parametreleri, query eşleme) |

**Mock stratejisi:** `IMessageQueue`, `ISqlDatabase`, `HttpGateway`, `PluginConfigSource` fake implementasyonlarıyla; harici bağımlılık (Redis, DB, EPIAŞ) testlerde yok. Runtime dinamik import gerçek temp dizin + `.js` modülüyle test edilir (Bun'da doğrulandı).

**Doğrulama komutları:**

```bash
bunx nx run plugin-sdk:test
bunx nx run epias-market-prices:test
bunx nx run integration-service:test
```

Regresyon: mevcut servis testleri (device-service 8, data-service 11, web-service 24, core 40, shared-types 58) değişikliklerden sonra yeşil.

---

## 10. Bilinen Durumlar ve Sıradaki İşler

### 10.1 Sıradaki İşler (plan fazları)

| Faz | Durum | Not |
|---|---|---|
| Faz 1 — Plugin SDK | ✅ Tamamlandı | |
| Faz 2 — Entegrasyon kontratı | ✅ Tamamlandı | `shared-types` + `FETCH_EXTERNAL` |
| Faz 3 — Integration service | ✅ Tamamlandı | Docker dev stack'e bağlı |
| Faz 4 — EPIAŞ doküman incelemesi | ⏳ Sırada | `seffaflik.epias.com.tr` geliştirme ortamından erişilemedi (timeout/geo-block) — endpoint yolları ve auth (v1 `X-IBM-Client-Id` vs yeni OAuth2 gateway) teyit edilecek; muhtemel `epias-client` ortak katmanı |
| Faz 5 — web-service + UI | ⏳ | `GET /api/integrations/series` endpoint'i (`ExternalSeriesWriter.query`'i kullanacak), boss web'de `TelemetryProvider` benzeri provider + mevcut chart bileşenleri |
| Faz 6 — Management servisi | ⏳ | Aynı `PluginLoader` + `kind: "management"` kontratı (trigger plugin → event bus → manevra emit; interlock servis core'unda) |

### 10.2 Önceden Var Olan, Bu Çalışmada Dokunulan Sorunlar

- **shared-utils typecheck** HEAD'de 216 hatayla kırıktı — düzeltildi: `ALL_CONFIG_DEFINITIONS: ConfigDefinition<any>[]` (heterojen liste, ELEGANT-EXCEPTION yorumuyla) + `units.ts`/`sources.ts` null kontrolleri. Şu an 0 hata.
- **core typecheck** HEAD'de ~11 hata — kısmen devam ediyor (ws tipleri, bullmq internals, modbus testleri). Bu çalışma kapsamında hata eklenmedi; ayrı bir iş olarak ele alınmalı.

### 10.3 Açık Riskler

- **Dinamik import + Bun + Docker:** lokalde doğrulandı (vitest + temp dizin); container içinde `customer-plugins` volume'üyle uçtan uca denenmedi.
- **EPIAŞ erişimi:** geliştirme ortamından API'ye ulaşılamıyor — doküman incelemesi ve gerçek uç nokta testleri için erişim/iş birliği gerekli.
- **Zaman dilimi:** EPIAŞ tarih alanları TR saatiyle gelebilir; `toPoint` şu an `new Date()` parse'ı kullanır, offset'siz tarih string'lerinde UTC varsayımı riski doküman incelemesinde netleştirilecek.
