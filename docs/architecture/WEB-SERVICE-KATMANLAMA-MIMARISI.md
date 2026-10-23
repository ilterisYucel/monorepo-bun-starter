---
status: active
space: architecture
tags: [mimari, web-service, hexagonal, katmanlama, tier, fastify, spec]
review_date: 2026-10-23
---

# Web-Service Katmanlama ve Tier Ayrımı — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/5 — SPEC (AGENTS.md "Geliştirme İş Akışı").
> **Durum:** ✅ Approved + 🟢 Uygulandı (2026-10-23) — M1–M7 tamamlandı; doğrulama KAPANIŞ'ta.
> **Kapsam:** Bu tur **yalnızca tasarım dokümanıdır** — kod değişikliği YOKTUR.
> Göç adımları (M1–M7) ayrı turlarda, her adım kendi test kapısıyla uygulanır.
> **İlişkili:** [AGENTS.md](../../AGENTS.md), [AGENTS-INFRA.md](../../AGENTS-INFRA.md),
> [AGENTS-WS-TUNNEL.md](../../AGENTS-WS-TUNNEL.md),
> [KONTEYNER-AGENT-KAYIT-MIMARISI.md](./KONTEYNER-AGENT-KAYIT-MIMARISI.md),
> [BOSS-FIELD-UPLINK-ARINDIRMA-MIMARISI.md](./BOSS-FIELD-UPLINK-ARINDIRMA-MIMARISI.md),
> [WEB-SERVICE-HUB-ENVANTERI.md](../analysis/WEB-SERVICE-HUB-ENVANTERI.md).

## 1. Amaç ve Bağlam

**Semptom:** web-service'te tekrar eden komplikasyonlar — uzayan kod, eksik soyutlama,
tier koşullarının her yere sızması, aynı davranışın farklı katmanlarda kopyalanması.

**Kök neden:** Repo, **hexagonal mimariyi vaat ediyor** (klasörler açılmış) ancak bu model
yalnız **auth alanında** gerçekten uygulanmış. Domain katmanı 7 dosyadan oluşuyor
(5 servis portu + `IUserRepository` + doğrulama şemaları); `application/use-cases` yalnız
auth'ta (10 use-case). Telemetri, konteyner, komut, manevra/operasyon, olay/bildirim
alanlarının **domain katmanı yok**; iş mantığı doğrudan `infrastructure/` ve
`presentation/routes/` içinde.

**Amaç:** (1) web-service'in **komple use-case envanterini** çıkarmak ve her UC'yi
**core / container-only / field-only / boss-only** olarak sınıflamak; (2) hedef katman
modelini (saf domain + portlar + adaptörler + ince Fastify plugin'leri) ve **core + tier
append** kompozisyonunu tanımlamak; (3) parça parça göç haritasını (M1–M7) ve kabul
kapılarını belirlemek. Sadeleştirme fırsatları bu envanter üzerinden sonra görülecek.

**Kapsam tablosu:**

| Katman | Dahil | Hariç |
|:-------|:------|:------|
| Doküman | UC envanteri, katman/port/tier/plugin modeli, göç haritası | Kod, test, DI değişikliği |
| `packages/shared-types` | — (şimdilik yerinde) | Taşıma/konsolidasyon (ayrı karar) |
| `AGENTS-WEB-SERVICE.md` | — | Göç sonunda yazılır (K9) |

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, 2026-10-23)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K1 | Komple UC envanteri **bu SPEC'in §4.5'inde** yaşar | Ayrı envanter dosyası yok (ihtiyaç doğarsa taşınır) |
| K2 | `@gd-monorepo/shared-types` **şimdilik yerinde** | Domain VO'ları orada kalır; taşıma ayrı karar (A-1) |
| K3 | Bu tur **yalnız tasarım**; göç M1–M7 ayrı turlarda | Kod/test değişikliği yok; her adım kendi test kapısıyla |
| K4 | Hedef model **hexagonal**: çekirdek = **domain + application**; **presentation ve infrastructure KARDEŞ** adaptör halkalarıdır (birbirini bilmez); bağımlılık her zaman **içe doğru** | §4.1 |
| K10 | **Portlar `domain/` (çekirdek) içinde yaşar** (auth precedenti: `IUserRepository`, `ITokenService`); application giden portları tüketir, gelen tarafı kendi use-case imzalarıdır | §4.2 |
| K11 | Infrastructure **iki tür adaptör** barındırır: driven (DB/hub/mq port uygulamaları; kendi zamanlayıcısı olan poller'lar dahil) + **driving** (BullMQ worker, device-registry refresh — application'ı çağırır); driving adaptörler yalnız application'ı çağırır | §4.5 H7–H8, E7, F4 |
| K12 | **Framework/I-O'lu dış bağımlılıklar** (TamperLogger vb.) application/domain'e **girmez**; yalnız **port (arayüz)** üzerinden alınır. Somut implementasyon infrastructure'da; bağlama DI'da | UC-1 (T-13) |
| K13 | **Saf TS kütüphaneleri** (`@gd-monorepo/result` gibi) dış bağımlılık **sayılmaz**; `shared-types` statüsünde domain/application'da izinlidir | §4.1 tablosu, SC-2 |
| K14 | Hub/tünel yüzeyi **tek modülde** toplanır (`infrastructure/hub-tunnel/` + presentation route); core tünel bilmez; bağlantı **config + Fastify plugin** ile (field/boss'ta registration) | UC-7 |
| K15 | Modül üç parçadan oluşur: `IHubTunnelPort` (domain) + framework'siz istemci (driven adapter) + Fastify ambalajı; **session auth mevcut rbac option'ıyla** kalır — ayrı auth plugin'i YOK | UC-7 |
| K16 | **Tek transport (hub) bugün**; port sabit kalır, farklı bağlantı yolu gerekirse yeni adapter yazılır (transport-switch makinesi kurulmaz) | UC-7 |
| K5 | Tier modeli: **ortak core + `tiers/{container,field,boss}` append** (flag ile) | Tier koşulları yalnız kompozisyonda |
| K6 | **Fastify plugin tabanı zorunlu**: her route grubu bir plugin; tier koşulu registration'da | §4.4 |
| K7 | **Auth altın örnektir**; yeni kod bu deseni izler | §4.1'de referans harita |
| K8 | Göç sırası **M1→M7**, **M2 (hub/konteyner boundary) öncelikli** | §6 UC listesi |
| K9 | `AGENTS-WEB-SERVICE.md` kural seti **göç sonunda** (M6) yazılır | Bu SPEC'te yalnız hedef kurallar |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | Hexagonal yalnız auth'ta: domain 7 dosya, application/use-cases 10 dosya; diğer alanlarda domain/use-case yok | `src/domain/`, `src/application/use-cases/` |
| B2 | Port/adaptör yalnız auth'ta; telemetri/komut/manevra/olay doğrudan `postgres`/`timescale`/`mq`/hub client import ediyor | `presentation/routes/*.ts`, `infrastructure/*` |
| B3 | Fastify plugin tabanı kullanılmıyor: 18 route grubu `server.ts#registerRoutes` içinde elle prefix'leniyor; tier koşulları route bloklarında `if`; boş plugin registration kalıntısı var | `presentation/server.ts#registerRoutes` |
| B4 | Core+tier ayrımı yok: DI'da 40+ `asFunction`, 7 `serviceTier` switch'i; lifecycle `index.ts`'te `if` zincirleri | `config/container.ts`, `src/index.ts` |
| B5 | Hub tüketici boundary'si zayıf: `HubContainerView` tek sınıfta presence + HTTP + cache; domain portu yok; `IContainerProxy` hub'a anlamsız WS metotları taşıyor | `container-session/hub-container-view.ts`, `platform/container-access/.../interface.ts` |
| B6 | UC envanteri yok: bir davranışın hangi tier'a ait olduğu route `if`'leri + DI switch'lerinden okunuyor | `server.ts`, `container.ts` |
| B7 | Katman bazlı test sınırı yalnız auth'ta; route/infra testleri hâlâ altyapıya bağlı | `application/use-cases/*.test.ts` vs `presentation/routes/*.test.ts` |
| B8 | Application use-case'leri somut **`TamperLogger`** (framework/I-O'lu infrastructure sınıfı) import ediyor — port yok; ayrıca ölü `application/telemetry/telemetry-normalizer.ts` | `application/use-cases/login-use-case.ts`, `mfa-login-use-case.ts`, `mfa-enroll-use-case.ts` |
| B9 | Hub/tünel yüzeyi dağınık: istemci, system-headers, front-door route ve cookie doğrulama ayrı dosyalarda; port yok, plugin yok — core tünel bilgisi taşıyor | `infrastructure/hub-consumer/*`, `container-session/stateless-session-authenticator.ts`, `presentation/routes/hub-session-routes.ts` |

## 4. Mimari

### 4.1 Hedef katman modeli (hexagonal)

```
        presentation (giriş adaptörü)        infrastructure (çıkış + driving adaptörler)
                  │                                        │
                  ▼                                        ▼
        ┌──────────────────────────────────────────────────────────┐
        │  application                                             │
        │    use-case'ler; GİDEN portları tüketir,                 │
        │    GELEN tarafı kendi use-case imzalarıyla sunar         │
        │                        │                                 │
        │                        ▼  (bağımlılık: içe doğru)        │
        │  domain                                                  │
        │    saf TS: entity/VO + port arayüzleri                   │
        └──────────────────────────────────────────────────────────┘
        config = composition root (her şeyi bilir; tier append burada)
```

**Kurallar:**

1. **Bağımlılık yönü her zaman içe doğrudur** (Dependency Rule): adaptörler çekirdeğe bağlıdır;
   çekirdek adaptörleri bilmez.
2. **Presentation ve infrastructure kardeştir** — birbirini import etmez; ikisi de yalnız
   application portları/use-case'leri üzerinden konuşur.
3. **Domain** saf TS'tir: entity/value object + **port arayüzleri** (K10).
4. **Application** use-case'lerin evi; giden (driven) portları tüketir, gelen (driving) tarafı
   kendi use-case imzalarıdır. Framework bilmez.
5. **Presentation** bir giriş adaptörüdür; Fastify plugin yalnız ambalajdır — handler yalnız
   use-case çağırır, DB/hub client'a dokunmaz.
6. **Infrastructure** iki tür adaptör barındırır (K11): driven (DB/hub/mq port uygulamaları) ve
   driving (BullMQ worker, poller'lar — application'ı çağırır).

| Katman | İzinli import | Yasak |
|:-------|:--------------|:------|
| `domain` | `@gd-monorepo/shared-types` (yalnız `import type`), **saf TS kütüphaneleri** (`result`), standart TS | fastify, awilix, bullmq, pg, jose, tamper-logger, hub/ws-tunnel, env |
| `application` | `domain` (giden portlar), `@gd-monorepo/shared-types`, **saf TS kütüphaneleri** (`result`) | fastify, awilix, bullmq, pg, jose, tamper-logger, HTTP istemcileri |
| `infrastructure` | `domain` portlarını uygular; driving adaptörler `application` use-case'lerini çağırır; 3rd-party serbest | `presentation` (kardeş halka) |
| `presentation` | `application` use-case'leri, DTO tipleri | `infrastructure`, doğrudan `postgres`/`timescale`/hub client |
| `config` | hepsi (composition root) | iş mantığı |

**Altın örnek (auth):** `domain/repositories/IUserRepository.ts#IUserRepository`,
`domain/services/ITokenService.ts#ITokenService`, `application/use-cases/login-use-case.ts#LoginUseCase`,
`infrastructure/persistence/user-repository.ts#UserRepository`,
`presentation/routes/auth-routes.ts#makeAuthRoutes` — bu zincir hedef desenin referansıdır.

### 4.2 Port kataloğu

Tüm port arayüzleri **`domain/`** içinde yaşar (K10). **Gelen (driving) portlar ayrı arayüz
değildir** — use-case'lerin public metotlarıdır; presentation yalnız bunları çağırır.

**Mevcut (korunur, driven):** `ITokenService`, `IUserRepository`, `IPasswordHasher`,
`ILoginThrottle`, `ITotpService`, `ITotpThrottle`, `ISessionAuthenticator`.

> **K12:** `TamperLogger` gibi framework/I-O'lu sınıflar use-case'e doğrudan girmez; audit/log
> ihtiyacı `IAuditLog` portu ile karşılanır (adaptör: `TamperLoggerAdapter`, infrastructure).

**Önerilen (göç adımlarında yazılır):**

| Port | Yön | Sorumluluk | Adapter |
|:-----|:----|:-----------|:--------|
| `ITelemetryQueryPort` | driven | latest / latest-per-name / range / downsampled / aggregate (cihaz bazlı) | TimescaleDBAdapter |
| `IContaTelemetryPort` | driven | konteyner bazlı latest / historical / allHistorical (hub sızıntısız) | HubContainerView |
| `IDeviceCatalogPort` | driven | cihaz listesi/kaydı | DeviceRegistry/Postgres |
| `ICommandDispatchPort` | driven | komut işi kuyruğa alma + yazma izi | BullMQ/CommandWriteStore |
| `IManeuverCatalogPort` | driven | manevra/operasyon tanımları (hibrit registry) | ManeuverRegistry/OperationDefStore |
| `IOperationRunRepository` | driven | koşu kaydı + sorgu | OperationRunStore |
| `IAlarmRepository` | driven | alarm listesi/çözümü | Postgres |
| `ILogEventReader` | driven | log listesi + olay deltası | Postgres |
| `IFieldTopologyPort` | driven | saha topolojisi | topology loader |
| `IEventFeedPort` | driven | field olay feed'i (HTTP pull hedefi) | event-routes altyapısı |
| `INotificationReader` | driven | boss bildirim okuma | FieldEventCollector |
| `IAuditLog` | driven | denetim/olay log'u yazma (use-case → logger) | `TamperLoggerAdapter` (infrastructure) |
| `IHubTunnelPort` | driven | hub tünel erişimi: `peers()` / `access()` / `openSession()` (endpoint-agnostik, opak path) | `HubConsumerClient` (framework'siz istemci) |

> **K15:** `ISessionAuthenticator` portu da `domain/ports/`'a taşınır; adaptör
> `StatelessSessionAuthenticator` infrastructure'da kalır, kullanımı presentation (rbac hook).

### 4.3 Tier modeli

```
src/core/{domain,application,infrastructure,presentation}      # tüm tier'larda ortak
src/core/infrastructure/hub-tunnel/                             # hub istemcisi + plugin (K14) — GENERIC taşıma
src/tiers/container/{application,infrastructure,presentation}   # container-only
src/tiers/field/{application,infrastructure,presentation}       # field-only
src/tiers/boss/{application,infrastructure,presentation}        # boss-only
src/config/{composition-root, container-defaults}
```

**Modül sınırı (önemli):**

- `core/infrastructure/hub-tunnel/` **yalnız generic taşımadır** (`IHubTunnelPort` + fetch istemcisi +
  Fastify ambalajı). İş semantiği taşımaz.
- **Konteyner telemetri adapter'ı** (`HubContainerView`: presence + TTL cache + fail-safe + observer)
  ve `ContainerConnectionTelemetryPublisher` **field tier'a aittir**:
  `tiers/field/infrastructure/container-telemetry/`. Hub-tunnel istemcisini (`IHubTunnelPort`)
  enjekte ederek kullanır; hub-plugin'in içinde YAŞAMAZ.

- Composition root: `buildCoreContainer(config)` → core kayıtları; `appendTier(container, tier)`
  → yalnız o tier'ın modülünü ekler. `serviceTier` switch'i **yalnız burada** bulunur.
- Lifecycle: ortak `startCore()` + tier modülünün `start()/stop()`'u; `index.ts` yalnız orkestre eder.
- Route kaydı: core plugin listesi + tier plugin listesi; koşul registration'da.

### 4.4 Fastify plugin modeli

- Kural: her route grubu `FastifyPluginAsync<XxxOpts>` — bağımlılıklar **plugin opts** ile gelir.
- Prefix ve tier seçimi registration'da; plugin içinde `serviceTier` **yasak**.
- Auth/RBAC/session/error/rate-limit kancaları da plugin'dir (encapsulation; global sızıntı yok).
- Boş plugin registration kalıntısı (`server.ts` `containerProxy` bloğu) kaldırılır.

### 4.5 Komple use-case envanteri (K1)

> Tier: **core** = tüm tier'larda; **container** = yalnız container; **field** = yalnız field;
> **boss** = yalnız boss. "Bugün" = mevcut dosya; "Hedef" = katman modelindeki yeri.

**A. Kimlik ve erişim — core**

| # | Use-case | Endpoint / davranış | Bugün | Hedef |
|:--|:---------|:--------------------|:------|:------|
| A1 | Giriş (parola) | `POST /api/auth/login` | `application/#LoginUseCase` | ✓ altın örnek |
| A2 | MFA'lı giriş | `POST /api/auth/login/mfa` | `#MfaLoginUseCase` | ✓ |
| A3 | Token yenileme | `POST /api/auth/refresh` | `#RefreshTokenUseCase` | ✓ |
| A4 | Çıkış | `POST /api/auth/logout` | `#LogoutUseCase` | ✓ |
| A5 | Oturum bilgisi | `GET /api/auth/session` | `auth-routes.ts` | application use-case |
| A6 | MFA kayıt/onay/sıfırlama | `/api/auth/mfa/*` | `#MfaEnrollUseCase`, route | application use-case |
| A7 | Kullanıcı CRUD/liste | `/api/auth/users*` | `#CreateUser…` vb. | ✓ |
| A8 | Parola değişimi | `POST /api/auth/change-password` | `#ChangePasswordUseCase` | ✓ |

**B. Telemetri ve veri — core**

| # | Use-case | Endpoint | Bugün | Hedef |
|:--|:---------|:---------|:------|:------|
| B1 | Cihaz listesi | `GET /api/data/devices`, `GET /api/unified/devices` | route → postgres | use-case + `IDeviceCatalogPort` |
| B2 | Cihaz latest/range/downsampled/aggregate | `GET /api/data/:deviceId/*` | route → timescale | use-case + `ITelemetryQueryPort` |
| B3 | Unified latest / latest-per-name / downsampled | `/api/unified/telemetry/*` | route → timescale | use-case + `ITelemetryQueryPort` |
| B4 | Telemetri config | `GET /api/unified/devices/:id/telemetry-config` | route | use-case |
| B5 | Timeseries yönetimi (external/hypertable/MV) | `/api/unified/timeseries/*` | route → timescale | use-case + port |
| B6 | Proje CRUD | `/api/unified/projects*` | route → postgres | use-case + repository portu |
| B7 | Log listeleme/yazma | `/api/logs` | route → LogRepository | use-case + `ILogEventReader` |
| B8 | Alarm listesi/çözümü | `/api/unified/alarms*` | route → postgres | use-case + `IAlarmRepository` |

**C. Cihaz komutları — core** — uçlar tüm tier'larda kayıtlıdır (field UI + konteynerlerde
uzak yürütmenin hedefi); yalnız komut kuyruğu/adaptörü tier'a göre DI'da değişir.

| # | Use-case | Endpoint | Bugün | Hedef |
|:--|:---------|:---------|:------|:------|
| C1 | Tek komut | `POST /api/commands/execute` | route → mq | use-case + `ICommandDispatchPort` |
| C2 | Çoklu komut | `POST /api/commands/execute-multi` | route → mq | ✓ |
| C3 | Yazma izi | `GET /api/commands/writes` | route → store | use-case |
| C4 | Cihaz komut kataloğu | `GET /api/commands/:deviceId/commands` | route → config | use-case + `IDeviceCatalogPort` |

**D. Manevra ve operasyon — core (+ field-only uzak kanal)** — katalog/yürütme/koşu uçları
her iki tier'da da aynı API'dir; field'da executor'a `IRemoteCommandChannel` bağlanır, konteynerde
aynı uçlar uzak yürütmenin hedefidir (D5 field-only adaptör).

| # | Use-case | Endpoint / davranış | Tier | Bugün | Hedef |
|:--|:---------|:--------------------|:-----|:------|:------|
| D1 | Katalog listeleme | `GET /api/maneuvers`, `GET /api/operations` | core | route → registry | use-case |
| D2 | Yürütme | `POST /api/maneuvers/:name/execute`, `POST /api/operations/:name/execute` | core | route → executor | use-case |
| D3 | Koşu sorgusu | `GET /api/operations/runs`, `/runs/:id` | core | route → store | use-case + `IOperationRunRepository` |
| D4 | Tanım CRUD (admin) | `maneuver-routes.ts#registerDefinitionCrud` | core | route → defs | use-case |
| D5 | Uzak adım kanalı | `IRemoteCommandChannel` (hub access) | field | `hub-maneuver-channel.ts` | adapter (port: `IRemoteCommandChannel` korunur) |

**E. Field / hub — field-only**

| # | Use-case | Endpoint / davranış | Bugün | Hedef |
|:--|:---------|:--------------------|:------|:------|
| E1 | Saha özeti | `GET /api/fields/:id/summary` | route | use-case |
| E2 | Konteyner listesi | `GET /api/fields/:id/containers` | route → containerProxy | use-case + `IContaTelemetryPort` |
| E3 | Konteyner telemetrisi | `GET /api/fields/:id/telemetry/*` | route → containerProxy | use-case + port |
| E4 | Topoloji | `GET /api/fields/:id/topology` | route → dosya | use-case + `IFieldTopologyPort` |
| E5 | Field→konteyner komut | `field-container-commands.ts` | route → hub client | use-case + port |
| E6 | Olay feed'i | `GET /api/events` | route → postgres | use-case + `IEventFeedPort` |
| E7 | Konteyner presence takibi | `HubContainerView.refresh` (15 sn) | adaptör içi | driven adaptör içi zamanlayıcı (presentation'a sızmaz) |

**F. Boss — boss-only**

| # | Use-case | Endpoint / davranış | Bugün | Hedef |
|:--|:---------|:--------------------|:------|:------|
| F1 | Bildirim listesi/okunmamış | `GET /api/notifications*` | route → collector | use-case + `INotificationReader` |
| F2 | Field'da operasyon tetikleme | `POST /api/fields/:id/operations/:name/execute` | route → requester | use-case + hub port |
| F3 | Hub cookie front-door | `/api/hub/session` (field+boss) | route → hub client | adapter (port: `ISessionFrontDoor`) |
| F4 | Boss olay poller'ı | `FieldEventCollector.poll` (10 sn) | adaptör içi | driven adaptör içi zamanlayıcı → application use-case |

**G. Container — container-only**

| # | Use-case | Endpoint / davranış | Bugün | Hedef |
|:--|:---------|:--------------------|:------|:------|
| G1 | Statü | `GET /api/status` | route (sabit offline) | use-case |
| G2 | Oturum doğrulama | rbac hook (`container_session`) | middleware | adapter (`ISessionAuthenticator` var) |

**H. Altyapı — core**

| # | Use-case | Davranış | Bugün | Hedef |
|:--|:---------|:---------|:------|:------|
| H1 | Sağlık | `GET /health` | route | plugin |
| H2 | RBAC | yön/method/rol matrisi | middleware | plugin |
| H3 | Log rate limit | `LogRateLimiter` | middleware | plugin |
| H4 | Hata sınırı | `createErrorHandler` | middleware | plugin |
| H5 | İstek bağlamı | `RequestContext` | middleware | plugin |
| H6 | API dokümantasyonu | swagger/ui | plugin | plugin |
| H7 | Telemetri broadcast worker'ı | BullMQ `WS_BROADCAST` → ring buffer + realtime | `index.ts` (infrastructure) | **driving adaptör** → application use-case |
| H8 | Cihaz kayıt tazeleme | `DeviceRegistry.refresh` (10 sn) | `index.ts` (infrastructure) | **driving adaptör** → application use-case |

## 5. Purity Kuralları (ZORUNLU)

1. `domain` ve `application` katmanları framework/infra import edemez (SC-1/SC-2 ile ölçülür).
2. Yeni her use-case bir port üzerinden konuşur; route'lar doğrudan DB/hub client çağırmaz.
3. `serviceTier` yalnız composition root'ta (config) kullanılır; route/plugin/use-case içinde YASAK.
4. Her route grubu Fastify plugin'idir; tier seçimi registration'da.
5. `packages/shared-types` yerinde kalır; domain VO'ları oradan `import type` ile tüketilir.
6. Dış API şekilleri göç boyunca DEĞİŞMEZ; frontend sözleşmesi sabittir.
7. `packages/ws-tunnel*` içine dokunulmaz (önceki K0 kararları geçerli).
8. **Presentation infrastructure'ı import edemez; infrastructure presentation'ı import edemez**
   (kardeş halkalar — K4).
9. **Driving adaptörler** (BullMQ worker, device-registry refresh) yalnız application use-case'lerini
   çağırır; iş mantığı adaptörde yaşamaz (K11). Zamanlayıcılı driven adaptörler (presence/olay poller'ı)
   kendi tick'lerinde port üzerinden dışa gider (E7/F4).
10. Framework/I-O'lu dış bağımlılıklar (TamperLogger vb.) use-case'e **doğrudan girmez**; port
    üzerinden alınır (K12). Saf TS kütüphaneleri (`result`) izinlidir (K13).

## 6. Use Case'ler

### 6.1 UC-1 — Auth altın örneğinin belgelenmesi ve desen sabitleme

**Status:** 🟢 Doğrulanmış (M1 — 2026-10-23)

**Kapsam:**
- dahil: auth zincirinin (domain portu → use-case → adapter → plugin) haritalanması;
  mevcut koddan sapmaların (varsa) listelenmesi; yeni kod için referans kurallar
- hariç: davranış değişikliği, yeni uç

**Akış:**
1. Auth dosyaları hedef katman tablosuna yerleştirilir.
2. Eksik desenler (ör. `auth-routes` içindeki doğrudan mantık) işaretlenir.
3. Referans harita SPEC §4.1 + KAPANIŞ'a işlenir.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | Auth zinciri hedef katman modeline birebir uymalı; route'ta iş mantığı kalmamalı | AK-1.1 |
| FR-1.2 | Altın örnek haritası (dosya → katman) dokümante edilmeli | AK-1.2 |
| FR-1.3 | Auth use-case'leri somut `TamperLogger` yerine `IAuditLog` portunu kullanmalı | AK-1.3 |

**Kabul Senaryoları (GWT):**
1. **AK-1.1 — GIVEN** auth route'ları **WHEN** incelenir **THEN** doğrulama dışında iş mantığı yoktur; use-case'ler portları kullanır
2. **AK-1.2 — GIVEN** SPEC **WHEN** okunur **THEN** auth zinciri için dosya→katman haritası vardır
3. **AK-1.3 — GIVEN** auth use-case'leri **WHEN** incelenir **THEN** `TamperLogger` import edilmez; audit `IAuditLog` portu üzerinden yapılır

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | Auth katman uyumu | kod inceleme + test | ⬜ |
| AK-1.2 | Harita mevcut | doküman | ⬜ |
| AK-1.3 | Audit portu | unit (use-case testleri) | ⬜ |

**T Görev Listesi:**
- [x] T-1: Auth katman haritası + sapma listesi
- [x] T-2: Referans kuralların SPEC/KAPANIŞ'a işlenmesi
- [x] T-13: `IAuditLog` portu + `TamperLoggerAdapter`; auth use-case'lerinin port'a geçirilmesi
- [x] T-14: Ölü `application/telemetry/telemetry-normalizer.ts` silinmesi

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Auth'ta eksik desen bulunursa | Düzeltme M1 kapsamında değil; ayrı küçük iş olarak işaretlenir |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `src/domain/**`, `src/application/use-cases/**`, `src/infrastructure/auth/**`, `src/infrastructure/persistence/user-repository.ts`, `src/presentation/routes/auth-routes.ts` | Referans (okuma) |
| `src/domain/services/IAuditLog.ts` | YENİ (port) |
| `src/infrastructure/logging/tamper-logger-adapter.ts` | YENİ (adapter) |
| `src/application/telemetry/telemetry-normalizer.ts` | SİLİNİR (ölü) |

### 6.2 UC-2 — Hub/konteyner telemetry boundary'si (öncelikli)

**Status:** 🟡 Geliştirmede (M2 — çekirdek tamam; tier yerleşimi M6'da)

**Kapsam:**
- dahil: `IContaTelemetryPort` domain portu; latest/latest-per-name/downsampled use-case'leri;
  `HubContainerView`'un adapter'a indirgenmesi; `IContainerProxy`'nin hub'a anlamsız
  metotlarından ayrılması; `field-routes` inceltilmesi
- hariç: yeni uç/şekil değişikliği; ws-tunnel değişikliği

**Akış:**
1. Port: `latest`, `latestPerName`, `downsampled(containerIds, params)` sözleşmeleri (saf tipler).
2. Use-case'ler: `GetContainersUseCase`, `GetContainerTelemetryUseCase`.
3. Adapter: mevcut `HubContainerView` (presence/cache/HTTP) portu uygular.
4. Presentation: `field-routes` yalnız use-case çağırır.
5. Hub'a anlamsız WS metotları port yüzeyinden çıkarılır (davranış aynı).

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-2.1 | `/api/fields/:id/containers` ve `/telemetry/*` yanıt şekilleri DEĞİŞMEMELİ | AK-2.1 |
| FR-2.2 | Konteyner verisi yalnız port üzerinden okunmalı; route doğrudan hub client görmemeli | AK-2.2 |
| FR-2.3 | Port yüzeyi hub'a anlamsız WS metotlarını içermemeli | AK-2.3 |
| FR-2.4 | Trendler (SOC + sıcaklık) `downsampled` yolundan beslenmeli | AK-2.4 |

**Kabul Senaryoları (GWT):**
1. **AK-2.1 — GIVEN** field API **WHEN** containers/telemetry çağrılır **THEN** alanlar/şekiller aynıdır
2. **AK-2.2 — GIVEN** `field-routes` **WHEN** incelenir **THEN** yalnız use-case import eder
3. **AK-2.3 — GIVEN** port arayüzü **WHEN** incelenir **THEN** `sendControl/sendBinary/registerContainer` yoktur
4. **AK-2.4 — GIVEN** iki istasyon **WHEN** trendler çizilir **THEN** SOC + sıcaklık serileri dolar

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-2.1 | Şekil sabit | integration | ⬜ |
| AK-2.2 | Route inceltildi | kod inceleme | ⬜ |
| AK-2.3 | Port temiz | unit/kod inceleme | ⬜ |
| AK-2.4 | Trend verisi | canlı + unit | ⬜ |

**T Görev Listesi:**
- [x] T-3: `IContaTelemetryPort` + saf tipler
- [x] T-4: Konteyner telemetri use-case'leri (kırmızı test → impl)
- [x] T-5: `HubContainerView` adapter + port uyumu
- [x] T-6: `field-routes` inceltme + regresyon

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Hub erişilemez | Mevcut fail-safe (boş + disconnected) korunur |
| Kısmi konteyner hatası | `allHistorical` kısmi başarı semantiği korunur |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `src/domain/ports/container-telemetry.ts` | YENİ (port) |
| `src/application/telemetry/*` | YENİ use-case'ler |
| `src/infrastructure/container-session/hub-container-view.ts` | Adapter — hedef: `src/tiers/field/infrastructure/container-telemetry/` (field-only) |
| `src/presentation/routes/field-routes.ts` | İnceltme |

### 6.3 UC-3 — Manevra/operasyon domain'i

**Status:** 🟢 Doğrulanmış (M3 — 2026-10-23)

> **Uygulama notu (sapma S-1):** Use-case'ler `platform-commands` **domain sınıflarını**
> doğrudan tüketiyor (`ManeuverRegistry`, `OperationExecutor`, `IOperationRunStore`,
> `IOperationDefinitionStore`); ayrı port arayüzleri YAGNI gereği açılmadı (kütüphane zaten
> framework/I-O'suz domain; adaptör sarmalayıcı katma değer üretmiyordu).

**Kapsam:**
- dahil: katalog/yürütme/koşu + tanım CRUD use-case'leri; route inceltme
  katalog/yürütme/koşu use-case'leri; D1–D5 envanter satırları
- hariç: executor motorunun kendisi (`packages/platform/commands` yerinde kalır)

**Akış:**
1. Portlar: katalog, koşu deposu, komut kuyruğu.
2. Use-case'ler: list/execute/runs/defs.
3. `maneuver-routes` ince plugin'e dönüşür.
4. Field-only uzak kanal `IRemoteCommandChannel` adapter olarak kalır.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-3.1 | Manevra/operasyon uçlarının şekilleri DEĞİŞMEMELİ | AK-3.1 |
| FR-3.2 | Route'lar yalnız use-case çağırmalı | AK-3.2 |
| FR-3.3 | Uzak kanal field adapter'ında kalmalı (core'a sızmamalı) | AK-3.3 |

**Kabul Senaryoları (GWT):**
1. **AK-3.1 — GIVEN** execute/runs **WHEN** çağrılır **THEN** yanıtlar aynıdır
2. **AK-3.2 — GIVEN** `maneuver-routes` **WHEN** incelenir **THEN** DB/mq doğrudan import edilmez
3. **AK-3.3 — GIVEN** core **WHEN** incelenir **THEN** hub/uzak kanal bağımlılığı yoktur

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-3.1 | Şekil sabit | integration | ⬜ |
| AK-3.2 | Route inceltildi | kod inceleme | ⬜ |
| AK-3.3 | Core temiz | grep | ⬜ |

**T Görev Listesi:**
- [x] T-7: Use-case'ler (katalog/yürütme/koşu/tanım CRUD) + route inceltme

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Executor rollback/timeout | Mevcut semantik korunur |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `src/domain/ports/*` | YENİ |
| `src/application/commands/*` | YENİ |
| `src/presentation/routes/maneuver-routes.ts` | İnceltme |

### 6.4 UC-4 — Olay/bildirim domain'i

**Status:** 🟢 Doğrulanmış (M4 — 2026-10-23)

**Kapsam:**
- dahil: `IEventFeedPort`, `INotificationReader`; field `events` ve boss `notifications` use-case'leri
- hariç: hub relay ve poller zamanlaması (adapter)

**Akış:**
1. Field: `GET /api/events` use-case'i `ILogEventReader` üzerinden.
2. Boss: `FieldEventCollector` adapter; `notifications` use-case'i reader portu üzerinden.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-4.1 | Olay/bildirim yanıt şekilleri DEĞİŞMEMELİ | AK-4.1 |
| FR-4.2 | Route'lar yalnız use-case çağırmalı | AK-4.2 |

**Kabul Senaryoları (GWT):**
1. **AK-4.1 — GIVEN** events/notifications **WHEN** çağrılır **THEN** şekil aynıdır
2. **AK-4.2 — GIVEN** ilgili route'lar **WHEN** incelenir **THEN** collector/postgres doğrudan import edilmez

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-4.1 | Şekil sabit | unit/integration | ⬜ |
| AK-4.2 | Katman uyumu | kod inceleme | ⬜ |

**T Görev Listesi:**
- [x] T-8: Portlar + use-case'ler (event feed + notifications)

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Whitelist/cursor | Mevcut davranış korunur |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `src/domain/ports/*` | YENİ |
| `src/application/events/*` | YENİ |
| `src/presentation/routes/event-routes.ts`, `notification-routes.ts` | İnceltme |

### 6.5 UC-5 — Fastify plugin dönüşümü

**Status:** 🟢 Doğrulanmış (M5 — 2026-10-23)

> **Uygulama notu (sapma S-2):** Route grupları `FastifyPluginAsync` şekilli fonksiyonlar
> olarak **doğrudan `app.register(...)`** ile kaydedildi (anonim sarmalayıcılar kaldırıldı).
> Security hook'ları (rbac/request-context/error) **global** kaldı — kapsüllenmeleri
> istenen davranışı değiştirirdi (tüm route'lara uygulanmalı).

**Kapsam:**
- dahil: 18 route grubunun plugin'e çevrilmesi; prefix/tier seçiminin registration'a taşınması;
  boş plugin bloğunun silinmesi; hook'ların plugin kapsüllemesi
- hariç: iş mantığı değişikliği

**Akış:**
1. Her route dosyası `FastifyPluginAsync<Opts>` imzasına geçer (deps opts).
2. `server.ts` yalnız plugin listesi + prefix + tier seçimi yapar.
3. RBAC/rate-limit/error/context hook'ları plugin olur (kapsam sınırları net).

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-5.1 | Tüm route grupları plugin olmalı (18/18) | AK-5.1 |
| FR-5.2 | `serviceTier` route/plugin içinde KALMAMALI | AK-5.2 |
| FR-5.3 | Boş plugin registration kalıntısı KALMAMALI | AK-5.3 |

**Kabul Senaryoları (GWT):**
1. **AK-5.1 — GIVEN** route dosyaları **WHEN** incelenir **THEN** hepsi plugin imzasındadır
2. **AK-5.2 — GIVEN** plugin/route kodları **WHEN** grep'lenir **THEN** `serviceTier` yoktur
3. **AK-5.3 — GIVEN** `server.ts#registerRoutes` **WHEN** incelenir **THEN** boş plugin bloğu yoktur

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-5.1 | 18/18 plugin | grep/kod inceleme | ⬜ |
| AK-5.2 | Tier sızıntısı yok | grep | ⬜ |
| AK-5.3 | Ölü blok yok | kod inceleme | ⬜ |

**T Görev Listesi:**
- [x] T-9: Route gruplarını plugin'e çevir (doğrudan register)
- [x] T-10: Registration sadeleştirme + boş plugin bloğu silme

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Prefix/URL değişikliği | Dış URL'ler birebir korunur (regresyon testleri) |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `src/presentation/routes/*.ts` | Plugin imzası |
| `src/presentation/server.ts` | Registration listesi |

### 6.6 UC-6 — Core + tier kompozisyonu ve kural seti

**Status:** 🟢 Doğrulanmış (M6 — 2026-10-23)

> **Uygulama notları:** (S-5) Route dosyaları `presentation/routes/` altında kaldı
> (K4: presentation giriş adaptörüdür; tier'a özgü route hangi tier'da register edileceğiyle
> ayrılır). Tier'a özgü **infrastructure** bileşenleri `tiers/*` altına taşındı
> (container-telemetry, container session, boss collector/requester/reader). Composition:
> `buildContainer()` core + `registerContainerTier/registerFieldTier/registerBossTier`;
> lifecycle `tiers/lifecycles.ts`. `AGENTS-WEB-SERVICE.md` yazıldı + AGENTS.md satırı eklendi.

**Kapsam:**
- dahil: `tiers/*` göçü + tier registrations; lifecycle orkestrasyonu; `AGENTS-WEB-SERVICE.md`
- hariç: yeni özellik

**Akış:**
1. Modüller core/tier olarak taşınır (davranış aynı).
2. DI: core kayıtları + tier append; `serviceTier` yalnız burada.
3. `index.ts` yalnız `startCore/stopCore` + tier lifecycle çağırır.
4. `AGENTS-WEB-SERVICE.md` kuralları (purity, port, plugin, tier) yazılır; AGENTS.md tablosuna eklenir.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-6.1 | `serviceTier` yalnız composition root'ta kullanılmalı | AK-6.1 |
| FR-6.2 | Tier-spesifik kod `tiers/*` altında olmalı | AK-6.2 |
| FR-6.3 | `AGENTS-WEB-SERVICE.md` + AGENTS.md referansı mevcut olmalı | AK-6.3 |

**Kabul Senaryoları (GWT):**
1. **AK-6.1 — GIVEN** kod tabanı **WHEN** `serviceTier` grep'lenir **THEN** yalnız config'de bulunur
2. **AK-6.2 — GIVEN** field-only UC'ler **WHEN** incelenir **THEN** `tiers/field` altındadır
3. **AK-6.3 — GIVEN** dokümanlar **WHEN** incelenir **THEN** AGENTS-WEB-SERVICE + referans vardır

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-6.1 | Tier switch tek nokta | grep | ⬜ |
| AK-6.2 | Tier yerleşimi | kod inceleme | ⬜ |
| AK-6.3 | Kural seti | doküman | ⬜ |

**T Görev Listesi:**
- [x] T-11: core/tier göçü + DI kompozisyonu
- [ ] T-12: AGENTS-WEB-SERVICE.md + AGENTS.md satırı

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Tier modülü yok | Kayıt yapılmaz; uçlar 404 (mevcut davranışla aynı) |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `src/core/**`, `src/tiers/**`, `src/config/**` | Taşıma/kompozisyon |
| `AGENTS-WEB-SERVICE.md`, `AGENTS.md` | YENİ/güncelleme |

### 6.7 UC-7 — Hub/tünel yüzeyinin modül + plugin'e toplanması

**Status:** 🟢 Doğrulanmış (M7 — 2026-10-23)

> **Uygulama notları:** (S-3) Plugin `fastify-plugin` ile kök kapsama taşınır (standart
> bağımlılık; dev imajlarının yeniden build'ini gerektirdi). (S-4) Plugin kendi hafif
> istemcisini kurar; mevcut DI `hubConsumerClient` use-case'ler için aynen kalır — ikisi de
> durumsuz (paylaşılan state yok). `ISessionAuthenticator` portu `domain/ports/session.ts`'e
> taşındı.

**Kapsam:**
- dahil: `IHubTunnelPort` (domain) + framework'siz istemci (infrastructure) + Fastify plugin ambalajı;
  `system-headers`, front-door route ve stateless doğrulayıcının modüle taşınması; config ile takma
- hariç: farklı transport adapter'ı (K16), ws-tunnel değişikliği, dış API şekli

**Akış:**
1. `domain/ports/IHubTunnelPort.ts`: `peers()` / `access()` / `openSession()` (opak path, endpoint-agnostik).
2. `infrastructure/hub-tunnel/hub-consumer-client.ts`: mevcut istemci portu uygular (fetch; framework'siz).
3. `infrastructure/hub-tunnel/plugin.ts`: `FastifyPluginAsync<{ baseUrl; token }>` → `fastify.decorate("hubTunnel", client)`.
4. `presentation/routes/hub-session-routes.ts`: front-door use-case'i çağırır (taşınır).
5. Session auth: mevcut rbac `sessionAuthenticator` option'ı; yeni auth plugin'i yok (K15).
6. `field-routes`, `operation-requester`, `field-event-collector` port üzerinden beslenir.
7. Field/boss registration'ı config'de: plugin yalnız o tier'da takılır.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-7.1 | Hub istemcisi tek modülde olmalı; tüketiciler portu kullanmalı (doğrudan istemci importu YOK) | AK-7.1 |
| FR-7.2 | Plugin config'i minimal ve app-agnostik olmalı (`{ baseUrl, token }`) | AK-7.2 |
| FR-7.3 | Session auth mevcut rbac option'ıyla kalmalı; ayrı auth plugin'i EKLENMEMELİ | AK-7.3 |
| FR-7.4 | Hub/tünel kaynaklı dış API şekilleri DEĞİŞMEMELİ | AK-7.4 |

**Kabul Senaryoları (GWT):**
1. **AK-7.1 — GIVEN** kod tabanı **WHEN** `HubConsumerClient` import'ları aranır **THEN** yalnız modül içi + config vardır
2. **AK-7.2 — GIVEN** plugin **WHEN** takılır **THEN** iki config alanı yeter; decorator enjekte edilir
3. **AK-7.3 — GIVEN** rbac **WHEN** incelenir **THEN** tünel cookie doğrulaması `sessionAuthenticator` option'ındadır
4. **AK-7.4 — GIVEN** field/boss API'leri **WHEN** çağrılır **THEN** yanıt şekilleri aynıdır

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-7.1 | Tek modül | grep/kod inceleme | ⬜ |
| AK-7.2 | Minimal plugin config | unit | ⬜ |
| AK-7.3 | Auth tek yerde | kod inceleme | ⬜ |
| AK-7.4 | Şekil sabit | integration | ⬜ |

**T Görev Listesi:**
- [x] T-15: `IHubTunnelPort` + istemcinin portu uygulaması
- [x] T-16: Fastify plugin (decorator) + config ile registration
- [x] T-17: front-door route + `system-headers`/doğrulayıcı taşıma (port/adapter ayrımı)
- [x] T-18: Tüketicileri modül port'una geçir + regresyon

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Plugin takılmamış (tünel yok) | Tünel uçları 404; core çalışır (kılçıksız senaryo) |
| Hub erişilemez | Mevcut fail-safe (boş + disconnected) korunur |
| İkinci transport gerekirse | Port sabit; yeni adapter (K16) |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `src/domain/ports/IHubTunnelPort.ts` | YENİ (port) |
| `src/infrastructure/hub-tunnel/hub-consumer-client.ts` | Adapter (taşıma) |
| `src/infrastructure/hub-tunnel/plugin.ts` | YENİ (Fastify ambalajı) |
| `src/infrastructure/hub-tunnel/system-headers.ts` | Taşıma |
| `src/container-session/stateless-session-authenticator.ts` | Port/adapter ayrımı |
| `src/presentation/routes/hub-session-routes.ts` | Use-case bağlama |
| `src/config/container.ts` | Tier registration |

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| Göç adımı yarım kalırsa | Önceki adım yeşil kalır; adımlar bağımsız teslim edilir |
| Tier modülü eksik | İlgili uçlar kaydedilmez (404) — mevcut davranış |
| Port adapter'ı hazır değil | Use-case devreye alınmaz; eski yol korunur (kademeli göç) |
| Test kapısı kırmızı | Adım tamamlanmış sayılmaz (PR/commit yok) |

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | `domain/` içinde framework/infra import = 0 | grep |
| SC-2 | `domain/`+`application/` içinde framework/I-O paket import = 0 (izinli: `shared-types`, `result`, yerel domain) | grep |
| SC-3 | Tüm route grupları Fastify plugin (18/18) | grep + kod inceleme |
| SC-4 | `serviceTier` yalnız composition root'ta | grep |
| SC-5 | UC envanterindeki her satır bir tier'a atanmış | doküman matrisi |
| SC-6 | Unit + integration kapıları yeşil (108/108) | komut |
| SC-7 | Dış API şekilleri sabit | integration |
| SC-8 | `bun run spec:check` temiz | komut |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC | Bu doküman (tasarım + envanter + göç haritası) |
| 2. JSDoc | Her göç adımında port/use-case sözleşmeleri |
| 3. TEST | Adım bazlı kırmızı testler (M2 önce) |
| 4. IMPL | UC-1..UC-7 (M1–M7) |
| 5. KAPANIŞ | `WEB-SERVICE-KATMANLAMA-KAPANIS.md` (M6 sonunda, tek doküman) |

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A-1 | `shared-types`'tan web-service/domain'e VO taşıma (hangi tipler) | Ayrı karar — şimdilik yerinde (K2) |
| A-2 | Port arayüzlerinin yeri: `web-service/domain` mi `shared-types` mı | Domain içinde başla; cross-package ihtiyaç doğarsa taşınır |
| A-3 | `IContainerProxy`'nin hub'a anlamsız WS metotları | M2'de port ayrımıyla çözülür |
| A-4 | Plugin granularity (route grubu başına 1 plugin) | M5'te netleşir |
| A-5 | Coverage hedefleri | Mevcut AGENTS kapıları (≥%70 satır; güvenlik-kritik ≥%90 branch) |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. `shared-types` konsolidasyonu (A-1).
2. Boss uygulaması kapsam tanımı.
3. Agent'ta çoklu servis desteği (paket değişikliği).

## 12. T Görev Özeti

| # | Görev | UC |
|:--|:------|:---|
| T-1 | Auth katman haritası + sapma listesi | UC-1 |
| T-2 | Referans kuralların dokümana işlenmesi | UC-1 |
| T-3 | `IContaTelemetryPort` + saf tipler | UC-2 |
| T-4 | Konteyner telemetri use-case'leri | UC-2 |
| T-5 | `HubContainerView` adapter + port uyumu | UC-2 |
| T-6 | `field-routes` inceltme | UC-2 |
| T-7 | Manevra/operasyon portları + use-case'ler | UC-3 |
| T-8 | Olay/bildirim portları + use-case'ler | UC-4 |
| T-9 | Route gruplarını plugin'e çevirme | UC-5 |
| T-10 | Hook plugin'leri + registration sadeleştirme | UC-5 |
| T-11 | core/tier göçü + DI kompozisyonu | UC-6 |
| T-12 | `AGENTS-WEB-SERVICE.md` + AGENTS.md referansı | UC-6 |
| T-13 | `IAuditLog` portu + adapter; auth use-case'leri port'a | UC-1 |
| T-14 | Ölü `telemetry-normalizer.ts` silinmesi | UC-1 |
| T-15 | `IHubTunnelPort` + istemci port uyumu | UC-7 |
| T-16 | Fastify plugin (decorator) + config registration | UC-7 |
| T-17 | Front-door route + system-headers/doğrulayıcı taşıma | UC-7 |
| T-18 | Tüketicileri port'a geçirme + regresyon | UC-7 |
