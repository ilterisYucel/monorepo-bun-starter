---
status: active
space: architecture
tags: [mimari, logger, log, sink, spec]
review_date: 2026-09-24
---

# Logger — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/5 — SPEC (AGENTS.md "Geliştirme İş Akışı").
> **Durum:** ONAY BEKLİYOR — implementasyon developer onayından sonra başlar.
> **İlişkili:** [DEVICE-SERVICE-MIMARISI.md](./DEVICE-SERVICE-MIMARISI.md) (ilk tüketici — UC-6 bilgi logları), [KONTEYNER-UZAKTAN-ERISIM-MIMARISI.md](./KONTEYNER-UZAKTAN-ERISIM-MIMARISI.md) (§522 log kategorileri — TamperLogger'da kalır).
> **TamperLogger ile ilişki:** Bu paket `@gd-monorepo/tamper-logger`'ın YERİNE GEÇMEZ — imzasız, hafif, sink-pluggable genel logger'dır. Önemli/denetlenebilir loglar (alarm, audit, security, hata geçişleri) TamperLogger'da kalır; operasyonel/bilgi logları bu pakete taşınır.

---

## 1. Amaç ve Bağlam

**Sorun:**
1. **TamperLogger'a her şey basılıyor** — operasyonel bilgi logları (bağlantı özeti, "X cihaz başlatıldı", config yüklendi vb.) imzalı zinciri gürültüyle şişiriyor; zincir denetimi (verify-log) anlamsız satırlarla dolar.
2. **console.log/warn salatası** — servislerde koşulsuz `console.*` kullanımı yaygın (örn. `services/device-service/src/device-service.ts#start`); yapı yok, sink değiştirilemiyor, seviye filtresi yok.
3. **Component etiketi elle** — her yer kendi `[ModuleName]` prefix'ini string'e elle gömüyor.

**Çözüm:** `packages/logger` — imzasız, pino TABANLI (Fastify'ın logger'ı — sonic-boom hızlı yazım), sink ekle/çıkar destekli jenerik log kütüphanesi (tamper-logger deseni: ayrı, yeniden kullanılabilir paket).

**Kapsam tablosu:**

| Katman | Dahil | Hariç |
|:-------|:------|:------|
| packages/logger | `Logger` sınıfı, `ILogSink` sözleşmesi, `ConsoleSink`, `FileSink`, seviye filtresi, child logger, JSON format | İmza/zincir, eventCode sözlüğü, batching/ring, redaction |
| Tüketiciler | Servis bootstrap'lerinde wiring (run.ts) | TamperLogger'daki önemli logların taşınması (kategori sınırı tüketicide) |

---

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, 2026-09-24)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K1 | **pino TABAN** — `pino` bağımlılığı eklenir (Fastify'ın logger'ı; sonic-boom hızlı yazım + child binding + yerleşik seviye filtresi). Bizim `Logger` sınıfımız pino instance'ını İNCE sarmalar: yalnızca `ILogSink` soyutlaması (add/remove) + `LogRecord` sözleşmesi — kendi stringify/level makinesi YAZILMAZ | §4 |
| K2 | **İmza/zincir/eventCode validator YOK** — bunlar TamperLogger'ın alanı; paket tamper-logger'a referans bile vermez (bağımsız, ayrı ürün) | §5 |
| K3 | Sink sözleşmesi `ILogSink.write(events)` — çalışma zamanında `addSink`/`removeSink`; default `ConsoleSink` (logger yokluğu fallback'i diye ayrı mekanizma YOK — console zaten bir sink) | UC-2 |
| K4 | JSON satır formatı (structured): `ts/level/service/component/message/context` | UC-1 |
| K5 | Fail-open: sink hatası loglamayı KESMEZ (imza yok — best-effort; fail-closed TamperLogger'ın işi) | §7 |
| K6 | Jenerik paket — GD-PMS kavramı/eventCode/tier girmez (`packages/core` deseni) | §5 |
| K7 | **Performans VARSAYILAN hedeftir:** seviye filtresi + serialization pino'nun kendi sıcak yolu (sonic-boom); bizim katmanımız yalnız kayıt dağıtımı — level-altı kayıt bizim katmanımızda allokasyon/serialization ÜRETMEZ | UC-1 FR-1.4 → AK-1.4 |

---

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | Operasyonel bilgi logları TamperLogger'a (app kategorisi) basılıyor — zincir gürültüsü | `services/device-service/src/device-service.ts#logOrWarn`, `services/web-service/src/presentation/middleware/error-handler.ts` |
| B2 | Koşulsuz `console.*` yaygın — sink/seviye kontrolü yok | `services/device-service/src/device-service.ts#start`, `services/device-service/src/config-loader.ts#load`, `services/web-service/src/infrastructure/persistence/device-registry.ts#refresh` |
| B3 | Component etiketi elle string gömülü (`[ModuleName]` prefix konvansiyonu) | AGENTS.md "Logging: [ModuleName] prefix" |

---

## 4. Mimari

### 4.1 Akış

```
servis (run.ts)
   │  new Logger({ service, level })            ← ConfigLoader'dan level
   │  logger.child("DeviceService")             ← component etiketi
   ▼
Logger (pino sarmalayıcı) — level/child/serialization pino'da (sonic-boom)
   └── multistream — her sink bir pino.destination stream'i
         ├── ConsoleSink   (default — insan-okur tek satır)
         ├── FileSink      (opsiyonel — JSON satırlar)
         └── (yeni sink'ler addSink ile — örn. test/özel toplayıcı)
```

TamperLogger AYRI hat: önemli loglar kendi sink zincirinde (console/file/timescale + imza) — bu paket ondan bağımsız.

### 4.2 Sözleşmeler (JSDoc aşaması girdisi)

```ts
type LogLevel = "debug" | "info" | "warn" | "error";

interface LoggerConfig { service: string; level?: LogLevel }   // level yoksa "info"

interface LogRecord {                                           // sink'e giden kayıt
  ts: string; level: LogLevel; service: string;
  component?: string; message: string; context?: Record<string, unknown>;
}

interface ILogSink { write(record: LogRecord): void | Promise<void>; close?(): void | Promise<void> }

class Logger {
  constructor(config: LoggerConfig)                       // birincil constructor
  child(component: string): Logger                        // aynı service/level, component'li
  debug/info/warn/error(message, context?): void          // komutlar — void (CQS)
  addSink(sink) / removeSink(sink): void                  // ELEGANT-EXCEPTION: sink listesi mutable by design
  close(): Promise<void>                                  // tüm sink'lerin close'u (varsa)
}
```

- `child` parent'ın config'ini kopyalar (immutable config); sink'ler PAYLAŞILIR (tek liste — servis bir kez kurar).
- Seviye altı kayıtlar no-op'tur (sink'e ulaşmaz).
- `Logger` pino instance'ını içerir; `LogRecord` pino çıktısının sözleşme görünümüdür (`service`/`component` pino base binding'ine yazılır).

### 4.3 Format

`ConsoleSink` insan-okur tek satır: `2026-09-24T10:00:00.000Z [info] [service/component] mesaj {"key":1}`. `FileSink` ham JSON satır (yapısal analiz için).

---

## 5. Purity Kuralları (ZORUNLU)

1. `@gd-monorepo/tamper-logger` import YOK — iki paket birbirini tanımaz (K2).
2. GD-PMS'ye özgü kavram (eventCode, tier, service adları) pakete GİRMEZ — `service`/`component` serbest string (K6).
3. Fail-open: loglama asla throw ETMEZ — sink hataları yutulur, diğer sink'ler sürer (K5).
4. `packages/core`/`@gd-monorepo/*` paketlerine bağımlılık YOK — izinli dış bağımlılıklar yalnızca `pino` + `pino-multi-stream`; file/console stream'leri Bun stdlib ile sağlanır.
5. ELEGANT-EXCEPTION: sink listesi mutable by design (add/remove özelliğin kendisidir); diğer tüm alanlar `readonly`.

---

## 6. Use Case'ler

### 6.1 UC-1 — Temel Loglama ve Format

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: seviye filtresi, JSON kayıt yapısı, default ConsoleSink, komut metodları (debug/info/warn/error)
- hariç: sink yönetimi (UC-2), child (UC-3), imza/zincir (TamperLogger)

**Akış:**
1. `new Logger({ service, level })` — level yoksa `info`
2. `logger.info("mesaj", { context })` → kayıt üretilir
3. Kayıt seviyesi ≥ logger level ise tüm sink'lere yazılır; değilse no-op
4. Sink yoksa (removeSink ile hepsi kaldırıldıysa) kayıt düşer (hata YOK)

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | Kayıt; ts (ISO), level, service, message; opsiyonel component/context taşır | AK-1.1 |
| FR-1.2 | Level filtresi: `debug < info < warn < error`; eşiğin altı sink'e ULAŞMAZ | AK-1.2 |
| FR-1.3 | `new Logger({service})` (level verilmezse) default `info` ile çalışır | AK-1.3 |
| FR-1.4 | Level-altı kayıt bizim katmanımızda kayıt objesi/serialization ÜRETMEZ — en erken no-op dönüş (pino seviye kontrolü) | AK-1.4 |

**Kabul Senaryoları (GWT):**
1. **AK-1.1 — GIVEN** logger kurulu **WHEN** `info("m", {a:1})` çağrılır **THEN** sink'e ts/level/service/message/context'li tek kayıt gider
2. **AK-1.2 — GIVEN** logger level `warn` **WHEN** `info` çağrılır **THEN** sink'e kayıt YAZILMAZ
3. **AK-1.3 — GIVEN** config'te level yok **WHEN** logger kurulur **THEN** `info` seviyesi aktif olur
4. **AK-1.4 — GIVEN** logger level `error` **WHEN** `info("m", fn())` çağrılır **THEN** sink'e erişilmez ve kayıt objesi üretilmez (mesaj argümanı değerlendirilmez — spy kanıtı)

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | Kayıt yapısı + yazım | unit | ⬜ |
| AK-1.2 | Seviye filtresi (tüm seviye kombinasyonları) | unit | ⬜ |
| AK-1.3 | Default level | unit | ⬜ |
| AK-1.4 | Level-altı sıfır maliyet (spy) | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-1: JSDoc + tipler (`LogLevel`, `LoggerConfig`, `LogRecord`, `ILogSink`) — `packages/logger/src/`
- [ ] T-2: Kırmızı testler — format, seviye filtresi, default level, level-altı sıfır maliyet (`logger.test.ts`)
- [ ] T-3: `Logger` implementasyonu + `ConsoleSink` (insan-okur tek satır)

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| `context` içinde fonksiyon/sembol | JSON-safe değil → göz ardı edilir (stringify öncesi temizlik) |
| Döngüsel context objesi | Throw YOK — güvenli stringify |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `packages/logger/src/types.ts` | Sözleşme tipleri |
| `packages/logger/src/logger.ts` | Logger sınıfı |
| `packages/logger/src/sinks/console-sink.ts` | ConsoleSink |
| `packages/logger/src/logger.test.ts` | UC-1 testleri |

### 6.2 UC-2 — Sink Yönetimi

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: `addSink`/`removeSink` (pino-multi-stream üzerinden dinamik hedefler), çoklu sink, sink hata izolasyonu (fail-open), `close()` yayılımı, `FileSink`
- hariç: batching/ring (TamperLogger deseni — A1), redaction (A2)

**Akış:**
1. Kurulumda `console` default sink; `addSink(fileSink)` ile genişletilir
2. Her kayıt TÜM sink'lere yazılır (Promise.allSettled ruhu — birinin hatası diğerini kesmez)
3. `removeSink` sonrası o sink kayıt almaz
4. `close()` → `close?()` olan sink'ler kapatılır

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-2.1 | `addSink`/`removeSink` çalışma zamanında sink listesini yönetir | AK-2.1 |
| FR-2.2 | Bir sink'in hatası diğer sink'leri ve çağıranı ETKİLEMEZ | AK-2.2 |
| FR-2.3 | `FileSink` JSON satırları dosyaya ekler (append) | AK-2.3 |

**Kabul Senaryoları (GWT):**
1. **AK-2.1 — GIVEN** logger'a iki sink ekli **WHEN** `removeSink(ilk)` çağrılır **THEN** sonraki kayıtlar yalnız ikinci sink'e gider
2. **AK-2.2 — GIVEN** bir sink throw eder **WHEN** loglama yapılır **THEN** diğer sink yazmaya devam eder, logger throw ETMEZ
3. **AK-2.3 — GIVEN** `FileSink({path})` ekli **WHEN** kayıt yazılır **THEN** dosyaya JSON satırı append edilir; `close()` stream'i kapatır

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-2.1 | add/remove davranışı | unit | ⬜ |
| AK-2.2 | Hata izolasyonu | unit | ⬜ |
| AK-2.3 | FileSink append + close | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-4: `FileSink` + sink yönetimi testleri (`sinks.test.ts`)

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Aynı sink iki kez eklenir | Tek kez sayılır (dedup — referans eşitliği) |
| `removeSink` listede yok | No-op |
| FileSink dizini yok | `close`/write hata üretmez (fail-open — servis açılışında dizin garanti) |
| pino worker transport | KULLANILMAZ — `pino.destination` in-process (Bun uyumu, A5) |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `packages/logger/src/sinks/file-sink.ts` | FileSink |
| `packages/logger/src/logger.ts` | add/remove/close |
| `packages/logger/src/sinks.test.ts` | UC-2 testleri |

### 6.3 UC-3 — Child Logger (Component Etiketi)

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: `child(component)` — devralınan service/level, eklenen component; sink paylaşımı
- hariç: hiyerarşik seviye overridé (child kendi level'ini DEĞİŞTİREMEZ — YAGNI)

**Akış:**
1. `const l = logger.child("DeviceService")`
2. `l.info("cihaz başlatıldı")` → kayıtta `component: "DeviceService"` + parent'ın service/level'i
3. Sink'ler parent ile paylaşılır (tek liste)

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-3.1 | `child` parent'ın service/level/sink listesini devralır | AK-3.1 |
| FR-3.2 | Child kayıtları `component` etiketini taşır | AK-3.2 |

**Kabul Senaryoları (GWT):**
1. **AK-3.1 — GIVEN** `logger.child("X")` oluşturulur **WHEN** parent'a yeni sink eklenir **THEN** child kayıtları o sink'e de gider
2. **AK-3.2 — GIVEN** child ile loglama yapılır **WHEN** kayıt sink'e ulaşır **THEN** `component: "X"` taşır, `service` parent'ınkidir

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-3.1 | Sink paylaşımı + config devri | unit | ⬜ |
| AK-3.2 | Component etiketi | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-5: `child` implementasyonu + testler

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Boş component string | Kayıt component'siz üretilir |
| child üzerinden addSink | Parent listesini değiştirir (paylaşımlı — belgeli) |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `packages/logger/src/logger.ts` | child |

---

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| Sink hatası (write throw/reject) | Yutulur — diğer sink'ler sürer (fail-open, K5) |
| Seviye altı kayıt | No-op — sink'e ulaşmaz |
| `close()` — sink close hatası | Yutulur; kalan sink'ler denenir |
| Logger kurulamaz durum | Yok — constructor doğrulaması yalnız `service` boş olamaz (throw) |

---

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | Bağımlılıklar yalnız `pino` + `pino-multi-stream`; `nx run logger:test` Bun'da yeşil | package.json + test |
| SC-2 | `@gd-monorepo/tamper-logger` referansı YOK (grep 0) | kod inceleme |
| SC-3 | Test süiti yeşil + coverage ≥%90 (küçük paket — tam kapsam makul) | `nx run logger:test` + coverage |
| SC-4 | `spec:check` temiz | `bun run spec:check` |
| SC-5 | Workspace'e bağlı ve import edilebilir (`@gd-monorepo/logger`) | `bun run build` |
| SC-6 | Sıcak yol: 1M level-altı `info` çağrısı tek haneli ms (Bun, no-op) | ölçüm (bench scripti) |

---

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC | Bu doküman |
| 2. JSDoc | T-1 sözleşmeleri |
| 3. TEST | T-2/T-4 (kırmızı) |
| 4. IMPL | T-3/T-5 + barrel + package.json |
| 5. KAPANIŞ | `LOGGER-KAPANIS.md` |

---

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A1 | Batching/ring buffer — TamperLogger'da var; genel logger için ihtiyaç doğarsa eklenir | Kapalı değil — §11 |
| A2 | Redaction (sır temizliği) — paket SUNMAZ; tüketici context'e sır koymaz (TamperLogger redaction'ı ayrı) | Tüketici sorumluluğu |
| A3 | Child seviye override'ı — ihtiyaç yok (YAGNI) | Kapalı (override olursa UC-3 revize) |
| A4 | pino-uçlu format (sonic/serializers) — K1/K7 ile DEFAULT implementasyona alındı (2026-09-24): pino taban + erken filtre | Kapalı |
| A5 | pino Bun uyumluluğu — worker transport KULLANILMAZ (`pino.destination` in-process); test aşamasında doğrulanır; sorun çıkarsa kendi writer sarmalayıcımıza dönüş | Test kapısı (T-2/T-3) |

---

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. Tüm servislerde operasyonel logların TamperLogger'dan bu pakete taşınması (servis başına ayrı iş; ilk tüketici device-service — DEVICE-SERVICE-MIMARISI UC-6)
2. web-service Fastify entegrasyonu — fastify zaten pino kullanır; bizim pino instance'ımızı fastify logger option'ına enjekte etme (doğal geçiş)
3. Batch/async sink desteği (yüksek hacim) — A1
4. İnsan-okur file formatı (JSON değil) — ihtiyaçta

---

## 12. T Görev Özeti

| T | Görev | UC |
|:--|:------|:---|
| T-1 | JSDoc + tipler (LogLevel, LoggerConfig, LogRecord, ILogSink) | UC-1 |
| T-2 | Kırmızı testler — format/seviye/default level | UC-1 |
| T-3 | Logger + ConsoleSink implementasyonu | UC-1 |
| T-4 | FileSink + sink yönetimi testleri | UC-2 |
| T-5 | child implementasyonu + testler | UC-3 |
