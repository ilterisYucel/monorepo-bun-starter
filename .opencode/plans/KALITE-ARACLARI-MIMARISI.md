---
status: active
space: architecture
tags: [mimari, kalite, reviewer, araclar, spec]
review_date: 2026-11-11
---

# Kalite Araçları — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/5 — SPEC (AGENTS.md "Geliştirme İş Akışı").
> **Durum:** ONAY BEKLİYOR — implementasyon developer onayından sonra başlar.
> **İlişkili:** `docs/standards/owasp-asvs-level2.md`, `docs/standards/teias-uyumluluk-degerlendirmesi.md`, `docs/standards/nis-2.md`, `docs/architecture/WEB-SERVICE-MIMARISI.md`, `docs/architecture/UI-MIMARISI.md`.

## 1. Amaç ve Bağlam

Reviewer modelinin (GLM/Qwen tabanlı inceleme ajanı) KAPANIŞ üretirken **kanıta dayalı** kalite kapıları koşabilmesi için araç seti. Bugünkü durum: yalnız `arch:check`, `spec:check`, `test:inventory`, `test:mutation` var; OOM/leak, servis performansı, veri yazma başarısı, TEİAŞ uyumu, UI kontrat uyumu ve güvenlik başlıkları script'siz. Ayrıca reviewer, değişen dosyaya göre hangi kontrolü koşacağını bilmiyor.

| Katman | Kapsam |
|:-------|:-------|
| dahil | Statik mimari/DI/kontrat/güvenlik taramaları, runtime servis sağlık/performans/veri ölçümleri, TEİAŞ kanıt matrisi, reviewer'a değişiklik→kontrol yönlendirmesi |
| hariç | Kodu düzelten otomatik fix'ler, CI altyapı kurulumu (workflow adımı dışında), k6 yük testlerinin yeniden yazımı, mutation motoru değişikliği |

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, tarihli)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K1 | Araçlar `tools/*.mjs` altında; mevcut demo script'leri (`alarm-demo`, `tunnel-demo`, `peer-service-demo`, `field-connector-demo`, `revpi-viewer`) **yerinde kalır** | Tek tool dizini; demo/ürün ayrımı için alt klasör açılmaz (2026-11-11 developer kararı) |
| K2 | Tüm yeni araçlar `--json` çıktısı verir; insan özeti stderr/stdout'ta ayrı | Reviewer/KAPANIŞ kanıtı makine-okunur olur |
| K3 | Statik set (`quality`) ve runtime set (`quality:runtime`) ayrı script; runtime docker stack gerektirir | Stack yoksa runtime `exit 2` + "stack down" raporu (sessiz skip yok) |
| K4 | Reviewer entegrasyonu `quality:for-diff` dispatcher'ı + `.opencode/agents/reviewer.md` yetki/görev güncellemesiyle yapılır | Değişen dosya → koşulacak kontrol eşlemesi tek kaynakta |
| K5 | Runtime script'ler docker stack ayaktayken koşar (developer onayı 2026-11-11) | Container adları/env'leri varsayılan; `--container`/`--url` ile override |
| K6 | Yeni npm bağımlılığı **eklenmez**; `bun` stdlib + `docker exec` + `fetch` | Tedarik zinciri yüzeyi büyümez |
| K7 | `arch:check` ratchet olarak kalır; mevcut 2 ihlal **refactor** edilir (A1 developer kararı 2026-11-11 — allowlist/baseline YOK) | Script CI'da yeşil olana kadar kapı kırmızı; refactor T-22 |
| K8 | Güvenlik taraması "tespit" eder, düzeltmez; bulgu şiddeti `info/warn/error` | Reviewer raporlar, developer karar verir |
| K9 | TEİAŞ aracı yalnız 🟢 maddeler için kanıt matrisi üretir; 🟡/🔴 maddeler "kapsam dışı" işaretlenir | Uyumluluk iddiası kanıtla sınırlı |
| K10 | Çıktı dili Türkçe, ID/kod adları İngilizce (repo konvansiyonu) | Tutarlılık |
| K11 | `heartbeat-writer` C2B **üretim davranışıdır** (BSC 40000 Controller Heartbeat) — saflık kapsamı DIŞI; simulator servisi bölünmesinde yeniden değerlendirilir (A5) | Saflık check'i yanlış pozitif üretmez |
| K12 | Logger kuralı: beş temel servis `@gd-monorepo/logger` üzerinden ops-log üretir; `console.*` yalnız bootstrap/fallback'te (migration bitene kadar `warn`, sonra `error`) | data-service dahil konsol logları kalite kapısına takılır |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | `arch:check` hexagonal denetimi var ama 2 ihlalle kırmızı: mfa use-case'leri `infrastructure/auth/service-token` import ediyor — **A1: refactor kararı** (baseline yok) | `tools/arch-checks.mjs#RULES`, `services/web-service/src/application/use-cases/mfa-login-use-case.ts#MfaLoginUseCase` |
| B2 | Servisler arası import yasağını denetleyen script yok (bugün temiz, ratchet değil) | `services/*/package.json` — çapraz import yok |
| B3 | OOM eşiği / memory leak ölçümü yok; compose'da `mem_limit` var ama denetlenmiyor | `deployment/v2/dev/site/docker-compose.yml#services` |
| B4 | device-service paralellik/komut gecikmesi ve data-service yazma başarı oranı ölçülmüyor | `services/device-service/src/device-scheduler.ts#DeviceScheduler`, `services/data-service/src` |
| B5 | Güvenlik header'ları web-service ve nginx'te tanımlı değil; rate-limit yalnız log rotasında | `services/web-service/src/presentation/server.ts#buildServer`, `tools/../../deployment/v2/dev/site/nginx/site.conf` |
| B6 | TEİAŞ uyumluluk değerlendirmesi dokümanda; kod/config kanıtını toplayan script yok | `docs/standards/teias-uyumluluk-degerlendirmesi.md#2` |
| B7 | Reviewer agent yalnız `git diff`, `spec:check` koşabiliyor; kalite script'leri yetkide yok | `.opencode/agents/reviewer.md#permissions` |
| B8 | Öksüz araçlar: `device-config-drift`, `sbom-scan`, `rtu-loopback-check` script'siz (paket hedefi yok) | `package.json#scripts` |
| B9 | OpsLogger kullanımı tutarsız: data-service/management/integration `@gd-monorepo/logger` importu YOK; console sayıları — data 3, management 4, integration 11, web-service 28, device-service 7 | `services/*/src` grep (2026-11-11) |
| B10 | Simülasyon-only izler device-service içinde: `debug-injector` HTTP ucu + `DEBUG_INJECT_ENABLED` wiring'i (bölünme sonraki planda) | `services/device-service/src/debug-injector.ts#DebugInjector` |

## 4. Mimari

```text
Değişiklik (git diff)
        │
        ▼
quality:for-diff ──► değişen yol → kontrol eşlemesi (§4.1)
        │
        ├──► STATİK (her zaman, <10sn)
        │      arch-check · service-independence-check · di-check
        │      ui-contract-check · security-scan · teias-check
        │
        └──► RUNTIME (stack ayaktaysa / ilgili servis değiştiyse)
               oom-memory-check · device-perf-check
               data-write-check · http-security-check
        │
        ▼
 JSON rapor (v1) ──► Reviewer → KAPANIŞ §A.2 (kanıt) + §A.4 (sapma)
```

### 4.1 Değişiklik → Kontrol eşlemesi

| Değişen yol deseni | Koşulacak kontrol |
|:---|:---|
| `services/web-service/src/{domain,application,presentation,infrastructure,tiers}/**` | `arch-check` |
| `services/*/src/**`, `services/*/package.json` | `service-independence-check` |
| `services/**`, `packages/**` içinde `new */@Injectable/default export` değişimi | `di-check` |
| `packages/ui/**`, `apps/site/**` | `ui-contract-check` |
| `services/*/src/presentation/**`, `services/*/src/infrastructure/auth/**`, `deployment/**/nginx/**` | `security-scan` + (stack varsa) `http-security-check` |
| `services/device-service/**`, `packages/simulators/**` | `device-perf-check` + `teias-check` |
| `services/data-service/**`, `packages/core/src/timescale/**` | `data-write-check` + `teias-check` |
| `deployment/**`, compose `mem_limit` | `oom-memory-check` |
| `bun.lock`, `package.json` | `di-check` + `sbom-scan` (canlandırılır) |
| `docs/architecture/*-KAPANIS.md`, `docs/architecture/*-MIMARISI.md` | `spec:check` (mevcut) |
| `services/device-service/**` | `device-purity-check` + `device-timing-check` (statik) + `device-alignment-check` (runtime) |
| `services/*/src/**`, `services/*/run.ts` | `logger-check` |
| `tsconfig*.json`, `package.json`, `bun.lock` | `knip` + `jscpd` (UC-11) |

### 4.2 Araç sözleşmesi (ortak)

Her araç: `#!/usr/bin/env bun`, `--help`, `--json`, `--quiet`, çıkış kodları `0` temiz / `1` ihlal / `2` altyapı yok. JSON zarfı: `{ tool, version, generatedAt, ok, findings: [{ severity, code, file?, symbol?, message }] }`. Dosya referansı `#sembol` çapasıyla (satır numarası yasak).

## 5. Purity Kuralları (ZORUNLU)

1. Araçlar **salt-okunur**: kaynak kodu/doküman değiştirmez; yalnız stdout/JSON üretir.
2. Runtime araçlar `docker exec`/HTTP dışında sisteme yazmaz; DB'ye yalnız `SELECT`/sayaç sorgusu atar.
3. Hiçbir araç iş sonucunu "yeşil" varsaymaz — ölçemediğini `unknown`/`exit 2` bildirir.
4. Yeni bağımlılık yok (K6); `fetch`, `node:fs`, `node:child_process` yeterli.
5. Çıktı deterministik sıralı (dosya, sembol, kod) — reviewer diff'i stabil kalır.
6. Sır/credential loglanmaz; env değerleri maskelenir.

## 6. Use Case'ler

### 6.1 UC-1 — Hexagonal ve Servis Bağımsızlığı Denetimi

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: `arch-checks.mjs` genişletme (`--json`, tier katmanları, ratchet), yeni `service-independence-check.mjs` + mevcut 2 ihlalin refactor'ü (T-22)
- hariç: araçların otomatik kod düzeltmesi (refactor elle yapılır)

**Akış:**
1. `bun run check:arch` → katman import kurallarını tarar, ihlalleri JSON'lar.
2. `bun run check:services` → her servis `src/**` dosyasında diğer servislerin paket adı/`services/<ad>` yolunu arar.
3. İhlal varsa çıkış 1; reviewer KAPANIŞ §A.4'e sapma olarak yazar.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | `arch-check` her ihlal için dosya+sembol+katman+kural alanlarını JSON'lar; tier alt ağaçları aynı kurallara tabidir | AK-1.1 |
| FR-1.2 | `service-independence-check` beş servis arasında değer/rel-path importunu ihlal sayar; shared packages serbesttir | AK-1.2 |
| FR-1.3 | İhlal yoksa 0, varsa 1 döner; `--json` şeması §4.2'ye uyar | AK-1.3 |
| FR-1.4 | MFA use-case'leri token doğrulamasını domain port'u üzerinden yapar; `application → infrastructure` değer importu kalmaz (allowlist YOK) | AK-1.4 |

**Kabul Senaryoları (GWT):**

1. **AK-1.1 — GIVEN** `domain/**` altında `fastify` importu olan dosya **WHEN** `check:arch` koşar **THEN** JSON'da `{layer:"domain", rule:"package", code:"ARCH_LAYER"}` bulgusu döner ve çıkış 1'dir
2. **AK-1.2 — GIVEN** `device-service` içinde `@gd-monorepo/web-service` importu **WHEN** `check:services` koşar **THEN** `SERVICE_COUPLING` bulgusu döner; shared-types importu bulgu üretmez
3. **AK-1.3 — GIVEN** temiz çalışma ağacı **WHEN** iki araç da koşar **THEN** çıkış 0 ve `findings: []` olur
4. **AK-1.4 — GIVEN** mfa use-case'leri domain port'u üzerinden token doğruluyor **WHEN** `check:arch` koşar **THEN** `application → infrastructure` ihlali bulunmaz ve çıkış 0 olur

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | Katman ihlali JSON'da kaynaklı raporlanır | unit | ⬜ |
| AK-1.2 | Servis çapraz importu yakalanır | unit | ⬜ |
| AK-1.3 | Temiz ağaçta gürültüsüz geçer | unit | ⬜ |
| AK-1.4 | MFA use-case katman sınırı temiz | unit + kod inceleme | ⬜ |

**T Görev Listesi:**
- [ ] T-1: `arch-checks.mjs`'e `--json` + tier farkındalığı + finding şeması ekle
- [ ] T-2: `tools/service-independence-check.mjs` yaz + unit test (fixture)
- [ ] T-3: `package.json` → `check:arch`, `check:services`
- [ ] T-22: MFA use-case'lerini domain port'u üzerinden refactor et (`application → infrastructure` importunu kaldır) + `check:arch` yeşil

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| `import type` ile servis tipi anma | İhlal (çalışma-zamanı bağı olmasa da sözleşme yasağı) — `--allow-type-only` bayrağı ile gevşetilebilir |
| Test/spec dosyaları | Taranmaz (üretim sınırı) |
| Servis dizini yok | `exit 2` + "servis bulunamadı" |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `tools/arch-checks.mjs` | Genişletme |
| `tools/service-independence-check.mjs` | Yeni araç |

### 6.2 UC-2 — DI ve Bağımlılık Yönetimi Denetimi

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: constructor injection, decorator yasağı, default export yasağı, `awilix` composition-root ratchet, `*Config` nesne kuralı sezgisi
- hariç: runtime DI grafiği çözümleme (container boot etme)

**Akış:**
1. `bun run check:di` servis+paket ağacını tarar.
2. Yasak desenleri (decorator, `serviceLocator`, default export, awilix'in yanlış konumu) bulguya çevirir.
3. Yapılandırma arg heuristiği `warn` seviyesinde raporlanır (yanlış pozitif toleransı).

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-2.1 | `@Injectable`/TS decorator ve `export default` üretim kodunda ihlaldir | AK-2.1 |
| FR-2.2 | `awilix` yalnız composition-root dosyalarında görünebilir | AK-2.2 |
| FR-2.3 | Constructor'da 2'den fazla primitive parametre `warn` üretir; `*Config` nesnesi önerilir | AK-2.3 |

**Kabul Senaryoları (GWT):**

1. **AK-2.1 — GIVEN** bir servis dosyasında `export default class` **WHEN** `check:di` koşar **THEN** `DI_DEFAULT_EXPORT` bulgusu döner
2. **AK-2.2 — GIVEN** `application/**` altında `import { asFunction } from "awilix"` **WHEN** `check:di` koşar **THEN** `DI_AWILIX_SCOPE` bulgusu döner
3. **AK-2.3 — GIVEN** `constructor(a: string, b: number, c: boolean)` **WHEN** `check:di` koşar **THEN** `DI_PRIMITIVE_CONFIG` warn bulgusu döner

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-2.1 | Decorator/default export yakalanır | unit | ⬜ |
| AK-2.2 | awilix kapsamı denetlenir | unit | ⬜ |
| AK-2.3 | Primitive config sezgisi warn üretir | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-4: `tools/di-check.mjs` yaz + fixture testleri
- [ ] T-5: `package.json` → `check:di`

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Test dosyaları | Taranmaz |
| `asClass`/`asValue` kullanımı | Aynı awilix kapsam kuralına tabi |
| Yanlış pozitif primitive | `--strict` olmadan yalnız warn |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `tools/di-check.mjs` | Yeni araç |

### 6.3 UC-3 — Runtime Servis Sağlığı (OOM / Paralellik / Veri Yazma)

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: `oom-memory-check`, `device-perf-check`, `data-write-check` (stack ayaktayken)
- hariç: otomatik restart/ölçekleme, uzun süreli soak testi (k6'da kalır)

**Akış:**
1. `bun run quality:runtime` üç aracı sırayla koşar; her biri JSON üretir.
2. `oom-memory-check`: `docker stats` örneklerini `--window` boyunca toplar; `mem_limit` oranı eşiği ve monoton artış (leak) arar.
3. `device-perf-check`: Redis/BullMQ sayaçlarından paralel `READ_DEVICE` derinliği, `COMMAND_DEVICE` enqueue→finished süresi ve komut tepki p95'i üretir.
4. `data-write-check`: `WRITE_TELEMETRY` completed/failed oranı + TimescaleDB pencere satır sayısı ile yazma başarısını hesaplar.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-3.1 | OOM aracı mem_limit oranı `--threshold` (varsayılan %80) aşımını ve pencerede monoton artışı `leak_suspect` olarak raporlar | AK-3.1 |
| FR-3.2 | device aracı paralel okuma derinliği, job oluşturma hızı ve komut tepki p95'ini raporlar | AK-3.2 |
| FR-3.3 | data aracı yazma başarı oranını (%) ve son penceredeki hata sayısını raporlar; `--min-success` altı ihlaldir | AK-3.3 |

**Kabul Senaryoları (GWT):**

1. **AK-3.1 — GIVEN** konteyner mem_limit'in %90'ında ve 5 dakikada artıyor **WHEN** `oom-memory-check --window 300` koşar **THEN** `MEM_THRESHOLD` + `MEM_LEAK_SUSPECT` bulguları döner
2. **AK-3.2 — GIVEN** device-service 4 paralel okuma yapıyor ve 10 komut işledi **WHEN** `device-perf-check` koşar **THEN** JSON'da `parallelActive`, `jobsPerSecond`, `commandP95Ms` alanları dolu gelir
3. **AK-3.3 — GIVEN** 1000 telemetri üretildi, 998 yazıldı **WHEN** `data-write-check` koşar **THEN** `successRate: 99.8` ve 2 hata raporlanır

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-3.1 | Eşik ve leak sezgisi doğru | unit (fixture stats) | ⬜ |
| AK-3.2 | Paralellik/gecikme metrikleri dolu | unit + runtime | ⬜ |
| AK-3.3 | Başarı oranı hesabı doğru | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-6: `tools/oom-memory-check.mjs`
- [ ] T-7: `tools/device-perf-check.mjs`
- [ ] T-8: `tools/data-write-check.mjs`
- [ ] T-9: `package.json` → `quality:runtime`

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Stack kapalı / konteyner yok | `exit 2`, `"reason": "stack_down"` |
| Redis erişilemez | `exit 2`; metrik `unknown` |
| Ölçüm penceresi çok kısa | `warn`, sonuç `low_confidence` |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `tools/oom-memory-check.mjs` | Yeni araç |
| `tools/device-perf-check.mjs` | Yeni araç |
| `tools/data-write-check.mjs` | Yeni araç |

### 6.4 UC-4 — TEİAŞ Uyumluluk Kanıt Matrisi

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: `teias-check` — dokümandaki 🟢 maddeler için kod/config kanıtı toplar (device + data servisleri)
- hariç: 🟡/🔴 maddelerin uygulanması, saha testi

**Akış:**
1. `bun run check:teias` madde listesini (doküman + sabit eşleme) dolaşır.
2. Her madde için beklenen sembol/konfig anahtarı arar (read-back, reconnect, sürekli kayıt, hata logu, cihaz konfigürasyonu, alarm 3 katmanı).
3. Madde↔kanıt matrisi + eksikler JSON'a yazılır.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-4.1 | Araç TEİAŞ 🟢 maddelerini sabit eşlemeyle kanıta bağlar ve eksikleri listeler | AK-4.1 |
| FR-4.2 | Kritik madde seti (`#22` read-back, `#26` reconnect, `#27` sürekli kayıt, `#28` hata logu, `#29` cihaz konfig, alarm 3-katman) eksikse `error` üretir | AK-4.2 |

**Kabul Senaryoları (GWT):**

1. **AK-4.1 — GIVEN** tüm kanıt sembolleri mevcut **WHEN** `check:teias` koşar **THEN** matriste her madde `covered` olur ve çıkış 0'dır
2. **AK-4.2 — GIVEN** alarm çözümleme (`resolved/resolved_by`) alanları koddan kaldırılmış **WHEN** `check:teias` koşar **THEN** `TEIAS_ALARM_PERSISTENCE` error döner

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-4.1 | Madde↔kanıt matrisi üretilir | unit | ⬜ |
| AK-4.2 | Kritik eksik error üretir | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-10: `tools/teias-check.mjs` (madde eşleme tablosu + tarama)
- [ ] T-11: `package.json` → `check:teias`

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Doküman başlıkları değişmiş | `exit 2` + "eşleme güncel değil" |
| Kanıt birden fazla dosyada | İlk sembol kanıt sayılır, diğerleri `info` |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `tools/teias-check.mjs` | Yeni araç |
| `docs/standards/teias-uyumluluk-degerlendirmesi.md` | Eşleme kaynağı (okunur, değişmez) |

### 6.5 UC-5 — UI Kontrat ve Kaynak-Agnostik Denetimi

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: `ui-contract-check` — `packages/ui` yasak importları, `apps/site` veri erişim yolu, transport sözleşmesi uyumu
- hariç: görsel/regresyon testleri

**Akış:**
1. `bun run check:ui` üç kural setini tarar.
2. `packages/ui` içinde `useQuery/useMutation`, Zustand, Axios, doğrudan `fetch`, `localStorage` yasak.
3. `apps/site` içinde ham `fetch`/`axios` yalnız `lib/api-client` üzerinden olmalı.
4. `ITelemetryTransport` implementasyonları (WS/HTTP/Mock) aynı arayüzü uygulamalı; UI bileşenlerinde taşıyıcıya özel dal olmamalı.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-5.1 | `packages/ui` içinde veri-kaynağı kütüphaneleri (query/store/axios/fetch/localStorage) ihlaldir | AK-5.1 |
| FR-5.2 | `apps/site` veri erişimi yalnız `lib/api-client` (ve transport kontratları) üzerinden yapılır | AK-5.2 |
| FR-5.3 | Tüm transport implementasyonları `ITelemetryTransport` sözleşmesini uygular; UI'da `WebSocket`/`fetch` özel dalı bulunmaz | AK-5.3 |

**Kabul Senaryoları (GWT):**

1. **AK-5.1 — GIVEN** `packages/ui/src/components` altında `useQuery` importu **WHEN** `check:ui` koşar **THEN** `UI_FORBIDDEN_DEP` bulgusu döner
2. **AK-5.2 — GIVEN** `apps/site/src/features/**` içinde ham `fetch(` **WHEN** `check:ui` koşar **THEN** `APP_RAW_FETCH` bulgusu döner
3. **AK-5.3 — GIVEN** yeni bir `SseTransport` `ITelemetryTransport` uygulamıyor **WHEN** `check:ui` koşar **THEN** `TRANSPORT_CONTRACT` bulgusu döner

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-5.1 | UI yasak bağımlılıkları yakalanır | unit | ⬜ |
| AK-5.2 | Uygulama ham veri erişimi yakalanır | unit | ⬜ |
| AK-5.3 | Transport sözleşmesi denetlenir | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-12: `tools/ui-contract-check.mjs` + fixture testleri
- [ ] T-13: `package.json` → `check:ui`

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| `lib/api-client` ve `lib/client-logger` | İzinli istisna |
| Story/test dosyaları | Taranmaz (üretim sınırı) |
| `nova` demo bileşenleri | `packages/ui` kuralına tabi; `fetch` yalnız uygulama katmanında |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `tools/ui-contract-check.mjs` | Yeni araç |

### 6.6 UC-6 — Güvenlik Taraması (Statik + Runtime)

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: `security-scan` (statik OWASP Top 10 desenleri), `http-security-check` (header + rate-limit)
- hariç: DAST/zafiyet istismarı, sızma testi

**Akış:**
1. `bun run check:security` statik desenleri tarar (dangerous HTML, eval, zayıf rastgelelik, string SQL, hardcoded secret, prod `http://`, JWT localStorage).
2. `http-security-check` 5001/5002/8088'e istek atar; eksik güvenlik header'larını ve rate-limit 429 davranışını raporlar.
3. Bulgular `info/warn/error` olarak JSON'lanır; stack yoksa runtime kısmı `exit 2`.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-6.1 | Statik tarama OWASP desenlerini dosya+sembol ile raporlar; test dosyaları hariç | AK-6.1 |
| FR-6.2 | Runtime kontrol CSP/HSTS/X-Frame-Options/X-Content-Type-Options/Referrer-Policy eksiklerini raporlar | AK-6.2 |
| FR-6.3 | Rate-limit kontrolü yapılandırılmış rota için 429 üretimini doğrular; limit yoksa `warn` | AK-6.3 |

**Kabul Senaryoları (GWT):**

1. **AK-6.1 — GIVEN** bir React bileşeninde `dangerouslySetInnerHTML` **WHEN** `check:security` koşar **THEN** `SEC_XSS_SINK` bulgusu döner
2. **AK-6.2 — GIVEN** yanıt `X-Content-Type-Options` içermiyor **WHEN** `http-security-check` koşar **THEN** `SEC_HEADER_MISSING` bulgusu döner
3. **AK-6.3 — GIVEN** `/api/logs` limiti 10/dk **WHEN** 11 istek atılır **THEN** son yanıt 429 olarak raporlanır

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-6.1 | Statik desenler yakalanır | unit | ⬜ |
| AK-6.2 | Header eksikleri raporlanır | unit + runtime | ⬜ |
| AK-6.3 | Rate-limit davranışı doğrulanır | unit + runtime | ⬜ |

**T Görev Listesi:**
- [ ] T-14: `tools/security-scan.mjs`
- [ ] T-15: `tools/http-security-check.mjs`
- [ ] T-16: `package.json` → `check:security`

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Stack kapalı | Statik kısım koşar; runtime `exit 2` ve `"skipped": "stack_down"` |
| Üçüncü taraf küçültülmüş JS | Taranmaz (`dist/`, `node_modules/`) |
| Dev-only `http://localhost` | `info` (prod URL'ler `error`) |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `tools/security-scan.mjs` | Yeni araç |
| `tools/http-security-check.mjs` | Yeni araç |

### 6.7 UC-7 — Reviewer Entegrasyonu ve Değişiklik Yönlendirmesi

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: `quality-for-diff` dispatcher, reviewer agent yetki/görev güncellemesi, CI statik adımı, KAPANIŞ kanıt akışı
- hariç: reviewer modelinin kendisinin değiştirilmesi (model seçimi), otomatik düzeltme

**Akış:**
1. Reviewer, inceleme başında `bun run quality:for-diff --base <ref>` koşar.
2. Dispatcher `git diff --name-only` çıktısını §4.1 tablosuyla eşler; yalnız ilgili statik kontrolleri koşar.
3. İlgili servis değiştiyse ve stack ayaktaysa runtime kontrolleri de çağırır (değilse `skipped` raporlar).
4. Sonuç JSON'u reviewer'ın KAPANIŞ §A.2 (test kanıtı) ve §A.4 (sapma) bölümlerine işlenir.
5. CI'da `bun run quality` (statik set) zorunlu adım; runtime set nightly/manual.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-7.1 | `quality:for-diff` değişen yolları §4.1 eşlemesine göre kontrol setine çevirir | AK-7.1 |
| FR-7.2 | Dispatcher her kontrolün `ok/skipped/failed` durumunu ve süresini tek JSON'da toplar | AK-7.2 |
| FR-7.3 | `reviewer.md` yetkileri `bun run quality*` ve `check:*` script'lerini kapsar; reviewer kaynak yazamaz | AK-7.3 |
| FR-7.4 | CI statik seti kırmızıysa PR kapısı düşer; runtime set CI'da opsiyonel | AK-7.4 |

**Kabul Senaryoları (GWT):**

1. **AK-7.1 — GIVEN** diff yalnız `services/web-service/src/domain/**` içeriyor **WHEN** `quality:for-diff` koşar **THEN** yalnız `arch-check` (+ilgili statikler) planlanır, `device-perf-check` `skipped` olur
2. **AK-7.2 — GIVEN** 3 kontrol planlandı, biri stack yokluğundan koşmadı **WHEN** dispatcher biter **THEN** JSON'da `status:"skipped"` ve `reason:"stack_down"` bulunur
3. **AK-7.3 — GIVEN** reviewer KAPANIŞ üretirken `bun run quality:for-diff` çağırır **WHEN** yetki kontrolü yapılır **THEN** shell izni verilir, `edit` yalnız KAPANIŞ dosyasında kalır
4. **AK-7.4 — GIVEN** statik sette 1 error bulgu **WHEN** CI `quality` adımı koşar **THEN** iş akışı kırmızı olur

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-7.1 | Diff→kontrol eşlemesi doğru | unit (path fixture) | ⬜ |
| AK-7.2 | Toplu JSON durum/süre içerir | unit | ⬜ |
| AK-7.3 | Reviewer yetkileri güncel | kod inceleme | ⬜ |
| AK-7.4 | CI kapısı çalışır | CI log | ⬜ |

**T Görev Listesi:**
- [ ] T-17: `tools/quality-for-diff.mjs` (eşleme tablosu + dispatcher)
- [ ] T-18: `.opencode/agents/reviewer.md` yetki + görev güncellemesi
- [ ] T-19: `package.json` → `quality`, `quality:for-diff`
- [ ] T-20: `.github/workflows/test.yml` statik kalite adımı
- [ ] T-21: `bun run sbom-scan`'i script'e bağla (B8)

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Diff boş | `no_changes`, çıkış 0 |
| Eşleşmeyen dosya türü | `info` "kontrol yok" |
| Runtime istenen ama stack yok | `skipped` + exit 0 (statik başarılıysa) |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `tools/quality-for-diff.mjs` | Yeni dispatcher |
| `.opencode/agents/reviewer.md` | Yetki/görev |
| `package.json` | Script hedefleri |
| `.github/workflows/test.yml` | CI adımı |



### 6.8 UC-8 — Device-Service Saflık Denetimi (Simülasyon Ayrımı)

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: `device-purity-check.mjs` — device-service içinde simülasyon/debug-only izlerin izlenmesi
- hariç: simulator servisinin bölünmesi (bir sonraki iş planı), heartbeat-writer (K11 — üretim davranışı), kodu düzeltme

**Akış:**
1. `bun run check:device-purity` yasak desen listesini tarar: `debug-injector`, `DEBUG_INJECT_ENABLED` wiring'i, `transport.kind === "simulator"` dalları, `@gd-monorepo/simulators` importu.
2. Bölünme tamamlanana kadar bulgular `info` (ilerleme izleme); `--enforce` ile `error` ratchet'ine çevrilir.
3. Reviewer, simulator-only kodun servise geri sızmasını bu listeden görür.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-8.1 | Yasak liste taraması her bulguyu dosya+sembolle raporlar; heartbeat-writer muaf | AK-8.1 |
| FR-8.2 | `--enforce` olmadan bulgular `info` olur ve çıkış 0'dır; `--enforce` ile `error`+çıkış 1 | AK-8.2 |

**Kabul Senaryoları (GWT):**

1. **AK-8.1 — GIVEN** `debug-injector.ts` importu device-service içinde **WHEN** `check:device-purity` koşar **THEN** `DEVICE_SIM_LEAK` info bulgusu döner; `heartbeat-writer` importu bulgu üretmez
2. **AK-8.2 — GIVEN** aynı bulgu `--enforce` ile **WHEN** koşar **THEN** `error` şiddeti ve çıkış 1 üretir

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-8.1 | Yasak liste + muafiyet doğru | unit | ⬜ |
| AK-8.2 | enforce modu geçişi doğru | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-23: `tools/device-purity-check.mjs`
- [ ] T-24: `package.json` → `check:device-purity`

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Bölünme tamamlandı | CI/CI-dışı `--enforce` açılır (A8) |
| Simulator package'ı import eden adaptör | Yalnız device-service kapsamında bulgu |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `tools/device-purity-check.mjs` | Yeni araç |

### 6.9 UC-9 — Device Timestamp ve Hizalama Denetimi

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: `device-timing-check.mjs` (statik) + `device-alignment-check.mjs` (runtime); timestamp sahipliği ve 1 sn ızgara faz kontrolü
- hariç: simulator damgaları, saat senkronizasyonu (NTP) altyapısı

**Akış:**
1. Statik: `packages/core/src/modbus/device.ts#read` okuma başına TEK damga kullanır; `device-factory.ts` placeholder damgası read'e sızmaz; `publishTelemetry` job damgası telemetri değerine yazılmaz.
2. Runtime: BullMQ repeat `next` fazları 1000 ms ızgarasında; TimescaleDB son N satırda monotonik damga, komşu delta ≤ `interval×1.5`, gelecek damga yok.
3. Skew kuralı: `|job.timestamp − max(telemetry.timestamp)| ≤ interval×1.5` — "x:10 okuma → x:15 damga" ihlaldir.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-9.1 | Statik kontrol cihaz-sınıfı tek damga kuralını ve job→telemetri damga sızıntısını denetler | AK-9.1 |
| FR-9.2 | Runtime kontrol ızgara fazı (`ms%1000==0`) ve cihazlar arası faz tutarlılığını doğrular | AK-9.2 |
| FR-9.3 | Runtime kontrol monotoniklik/delta/gelecek-damga ihlallerini `DEVICE_TIMESTAMP_SKEW` olarak raporlar | AK-9.3 |

**Kabul Senaryoları (GWT):**

1. **AK-9.1 — GIVEN** `read()` içinde ikinci bir `new Date()` damgası **WHEN** `check:device-timing` koşar **THEN** `DEVICE_MULTI_STAMP` bulgusu döner
2. **AK-9.2 — GIVEN** iki cihazın repeat `next` değerleri 12:00:01.000 ve 12:00:06.000 **WHEN** `check:device-alignment` koşar **THEN** faz tutarlı (`ms%1000==0`) doğrulanır
3. **AK-9.3 — GIVEN** 5 sn'lik cihazın son satırında 8 sn geriye damga **WHEN** `check:device-alignment` koşar **THEN** `DEVICE_TIMESTAMP_SKEW` bulgusu döner

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-9.1 | Statik damga kuralları | unit | ⬜ |
| AK-9.2 | Izgara fazı doğrulaması | unit + runtime | ⬜ |
| AK-9.3 | Skew tespiti | unit + runtime | ⬜ |

**T Görev Listesi:**
- [ ] T-25: `tools/device-timing-check.mjs`
- [ ] T-26: `tools/device-alignment-check.mjs`
- [ ] T-27: `package.json` → `check:device-timing`

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Stack kapalı | Runtime `exit 2` + `stack_down` |
| RTU okuması uzun sürüyor | Tolerans `interval×1.5` içinde kalırsa temiz; aşarsa `warn` + `low_confidence` |
| Cihaz saat geriliği | Gelecek damga yalnız servis/DB saatiyle kıyaslanır |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `tools/device-timing-check.mjs` | Yeni araç (statik) |
| `tools/device-alignment-check.mjs` | Yeni araç (runtime) |

### 6.10 UC-10 — Logger Kontrolü (Servis Ops-Log Denetimi)

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: `logger-check.mjs` — beş temel serviste OpsLogger varlığı + `console.*` envanteri
- hariç: `console.*` migration'ının kendisi (A6), packages/platform içi loglama

**Akış:**
1. `bun run check:logger` her servisi tarar: `@gd-monorepo/logger` importu/`createOpsLog`/`ILogger` enjeksiyonu var mı?
2. `console.*` (test hariç) dosya+sembol ile listelenir; bootstrap (`run.ts`/`index.ts`) ve logger'ın ulaşamadığı fallback'ler allowlist'tedir.
3. Şiddet: OpsLogger yoksa `error`; `console.*` `warn` (migration bitene kadar — K12).

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-10.1 | Servis OpsLogger/`ILogger` oluşturmuyorsa `error` bulgusu üretilir | AK-10.1 |
| FR-10.2 | `console.*` kullanımı allowlist dışında `warn` olarak raporlanır | AK-10.2 |

**Kabul Senaryoları (GWT):**

1. **AK-10.1 — GIVEN** data-service'te logger importu yok **WHEN** `check:logger` koşar **THEN** `SERVICE_NO_OPSLOG` error bulgusu döner
2. **AK-10.2 — GIVEN** `data-service.ts` içinde `console.log` **WHEN** `check:logger` koşar **THEN** `SERVICE_CONSOLE_LOG` warn bulgusu döner; `run.ts` istisnadır

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-10.1 | OpsLogger yokluğu error üretir | unit | ⬜ |
| AK-10.2 | Console envanteri allowlist'li üretilir | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-28: `tools/logger-check.mjs`
- [ ] T-29: `package.json` → `check:logger`

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Üçüncü taraf adapter console'u | Allowlist (dosya bazlı) |
| Test dosyaları | Taranmaz |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `tools/logger-check.mjs` | Yeni araç |

### 6.11 UC-11 — TypeScript Kalite Yükseltmesi (Tooling)

**Status:** ✏️ Specified (onay bekliyor)

**Kapsam:**
- dahil: `knip` (ölü export/dependency), `jscpd` (kopya kod), tsconfig strict bayrakları + `typecheck` hedefi
- hariç: kopya kodların birleştirilmesi (bulgular raporlanır, düzeltme ayrı iş), build konfigürasyon değişikliği

**Akış:**
1. `bun run quality:types` → `knip` + `jscpd` + `nx run-many typecheck`.
2. `knip`: kullanılmayan dosya/export/dependency listesi (silinen uygulamalar sonrası ölü kod yakalama).
3. `jscpd`: `apps/**`, `packages/**`, `services/**` üzerinde kopya blok eşiği (`--threshold`).
4. tsconfig: `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noImplicitOverride` kademeli açılır; ihlaller `warn`→`error` yol haritasıyla.

**Gereksinimler (FR-x):**

| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-11.1 | `knip` çıktısı `quality:types` içinde raporlanır; kullanılmayan workspace dependency error | AK-11.1 |
| FR-11.2 | `jscpd` eşik üstü kopyaları dosya çifti + oran ile raporlar | AK-11.2 |
| FR-11.3 | Strict bayraklar repo genelinde açılır; mevcut ihlaller `warn` listesiyle izlenir | AK-11.3 |

**Kabul Senaryoları (GWT):**

1. **AK-11.1 — GIVEN** bir pakette kullanılmayan dependency **WHEN** `knip` koşar **THEN** `KNIP_UNUSED_DEP` bulgusu döner
2. **AK-11.2 — GIVEN** iki dosyada %80 benzer blok **WHEN** `jscpd --threshold 60` koşar **THEN** kopya çifti raporlanır
3. **AK-11.3 — GIVEN** `noImplicitOverride` açık **WHEN** `typecheck` koşar **THEN** eksik `override` bildirimleri derleme hatası listelenir (warn listesi)

**Kabul Kriterleri:**

| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-11.1 | Ölü dependency yakalanır | unit | ⬜ |
| AK-11.2 | Kopya kod eşiği çalışır | unit | ⬜ |
| AK-11.3 | Strict bayraklar açılır | komut | ⬜ |

**T Görev Listesi:**
- [ ] T-30: `knip` devDependency + `quality:types` bağlantısı
- [ ] T-31: `jscpd` devDependency + eşik konfigürasyonu
- [ ] T-32: tsconfig strict bayrakları + `nx run-many typecheck` hedefi

**Edge Cases:**

| Durum | Davranış |
|:------|:---------|
| Dev/demo script dosyaları | `knip` ignore listesi |
| Bilinen kopyalar (eski api-base çifti) | `jscpd` ignore veya A6 ile bağlantılı |

**Involved Files:**

| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `package.json` | devDeps + script |
| `tsconfig.base.json` | Strict bayraklar |
| `tools/` (knip/jscpd konfigürasyonu) | Eşik/ignore |
## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| Temiz çalışma ağacı | Tüm statikler `ok`, çıkış 0 |
| İhlal | Çıkış 1, `findings[]` dolu, reviewer `error` olarak KAPANIŞ'a yazar |
| Altyapı yok (stack/DB/redis) | Çıkış 2, `reason` alanı; sessiz skip yok |
| Ölçüm belirsizliği | `warn` + `low_confidence`; ihlal sayılmaz |
| Beklenmeyen araç hatası | Çıkış 2 + stack trace özeti (sır maskeli) |

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | Statik set temiz ağaçta 0 error, toplam süre <10 sn | `bun run quality` süresi |
| SC-2 | Tüm araçlar §4.2 JSON zarfını üretir | şema testi |
| SC-3 | `quality:for-diff` doğru kontrol setini seçer | path fixture testi |
| SC-4 | Reviewer KAPANIŞ'ında en az bir kalite kanıtı satırı bulunur | KAPANIŞ §A.2 |
| SC-5 | Runtime set stack yokken yanıltıcı yeşil üretmez | `exit 2` testi |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC | Bu doküman |
| 2. JSDoc | Araç başına sözleşme + JSON şeması |
| 3. TEST | Fixture tabanlı unit testler (KIRMIZI) |
| 4. IMPL | 10 araç + dispatcher + reviewer/CI bağlantısı |
| 5. KAPANIŞ | `KALITE-ARACLARI-KAPANIS.md` (Doğrulama + Test Kapsamı) |

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A1 | `arch:check`'in 2 mevcut ihlali: **refactor** (developer kararı 2026-11-11). Baseline/allowlist kullanılmaz; iş T-22'de kapanır | ✅ Kapandı (refactor) |
| A2 | Runtime set CI'da nightly mi, manuel mi? | Öneri: nightly (K6) |
| A3 | JSON şema sürümü (`schemaVersion: 1`) | T-2'de sabitlenir |
| A4 | `sbom-scan` aracının güncellenmesi (mevcut script bayat olabilir) | T-21 |
| A5 | Heartbeat-writer'ın simulator bölünmesindeki yeri (C2B üretim kontratı; şimdilik yerinde — not düşüldü, tekrar incelenecek) | Simulator servisi planı |
| A6 | data-service (öncelikli) + management/integration `console.*` → OpsLogger migration'ı | K12 `warn`→`error` geçişinde kapanır |
| A7 | Timestamp sahipliği: device sınıfı, okuma başına TEK damga (öneri — developer onayı bekliyor); job timestamp'i yalnız sıralama | Onay sonrası K maddesine taşınır |
| A8 | `device-purity-check` `--enforce` açılışı: simulator bölünmesi tamamlanınca | Simulator servisi planı |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. DAST/zafiyet istismarı ve sızma testi otomasyonu (güvenlik ekibi).
2. Uzun süreli soak/leak testleri (k6 senaryoları).
3. Grafik/SCADA regresyon testleri (kaldırılan `graphics` katmanı sonrası kapsam dışı).

## 12. T Görev Özeti

| T-x | Görev |
|:--|:---|
| T-1 | `arch-checks.mjs` JSON + tier + ratchet genişletmesi |
| T-2 | `service-independence-check.mjs` + fixture testleri |
| T-3 | `check:arch`, `check:services` script hedefleri |
| T-4 | `di-check.mjs` + fixture testleri |
| T-5 | `check:di` script hedefi |
| T-6 | `oom-memory-check.mjs` |
| T-7 | `device-perf-check.mjs` |
| T-8 | `data-write-check.mjs` |
| T-9 | `quality:runtime` script hedefi |
| T-10 | `teias-check.mjs` |
| T-11 | `check:teias` script hedefi |
| T-12 | `ui-contract-check.mjs` + fixture testleri |
| T-13 | `check:ui` script hedefi |
| T-14 | `security-scan.mjs` |
| T-15 | `http-security-check.mjs` |
| T-16 | `check:security` script hedefi |
| T-17 | `quality-for-diff.mjs` dispatcher |
| T-18 | Reviewer agent yetki/görev güncellemesi |
| T-19 | `quality`, `quality:for-diff` script hedefleri |
| T-20 | CI statik kalite adımı |
| T-21 | `sbom-scan` script bağlantısı |
| T-22 | MFA use-case'leri domain port refactor'ü + `check:arch` yeşil |
| T-23 | `device-purity-check.mjs` |
| T-24 | `check:device-purity` script hedefi |
| T-25 | `device-timing-check.mjs` |
| T-26 | `device-alignment-check.mjs` |
| T-27 | `check:device-timing` script hedefi |
| T-28 | `logger-check.mjs` |
| T-29 | `check:logger` script hedefi |
| T-30 | `knip` + `quality:types` bağlantısı |
| T-31 | `jscpd` + eşik konfigürasyonu |
| T-32 | tsconfig strict bayrakları + typecheck hedefi |
