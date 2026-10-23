---
status: active
space: architecture
tags: [kapanis, dogrulama, test-kapsami, web-service, hexagonal, katmanlama, tier, fastify]
review_date: 2026-10-23
---

# Web-Service Katmanlama ve Tier Ayrımı — Kapanış (Doğrulama + Test Kapsamı)

> **İş akışı aşaması:** 5/5 — KAPANIŞ (AGENTS.md "Geliştirme İş Akışı").
> **SPEC:** [WEB-SERVICE-KATMANLAMA-MIMARISI.md](./WEB-SERVICE-KATMANLAMA-MIMARISI.md) (✅ Approved + 🟢 Uygulandı 2026-10-23 — K1–K16, UC-1..UC-7, M1–M7, AK/FR/SC kaynağı).

## A. DOĞRULAMA

### A.1 Değişiklik Matrisi

| # | Dosya | Değişiklik | Test ref'i | Geçme | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------|:------|:-----------------|
| 1 | `services/web-service/src/domain/services/IAuditLog.ts#IAuditLog` | YENİ — audit portu + `AuditLogEntry`/`AuditLevel`/`AuditCategory` (K12) | `web-service:test` (login/mfa use-case testleri) | 🟢 | UC-1 / FR-1.3 / T-13 |
| 2 | `services/web-service/src/infrastructure/logging/tamper-logger-adapter.ts#TamperLoggerAdapter` | YENİ — `IAuditLog` somut adaptörü (TamperLogger'ı sarmalar) | `web-service:test` | 🟢 | UC-1 / FR-1.3 / T-13 |
| 3 | `services/web-service/src/application/use-cases/login-use-case.ts#LoginUseCase` | `TamperLogger` → `IAuditLog` portu (somut logger import'u kaldırıldı) | `login-use-case` testleri | 🟢 | UC-1 / FR-1.3 / T-13 |
| 4 | `services/web-service/src/application/use-cases/mfa-login-use-case.ts#MfaLoginUseCase` | `TamperLogger` → `IAuditLog` | `web-service:test` | 🟢 | UC-1 / FR-1.3 / T-13 |
| 5 | `services/web-service/src/application/use-cases/mfa-enroll-use-case.ts#MfaEnrollUseCase` | `TamperLogger` → `IAuditLog` | `web-service:test` | 🟢 | UC-1 / FR-1.3 / T-13 |
| 6 | `services/web-service/src/application/telemetry/telemetry-normalizer.ts` | SİLİNDİ (ölü dosya — B8) | — (grep=0) | 🟢 | UC-1 / T-14 |
| 7 | `services/web-service/src/domain/ports/container-telemetry.ts#IContaTelemetryPort` | YENİ — hub sızıntısız konteyner telemetri portu (latest/query/historical/allHistorical/presence) | `get-field-containers-use-case.test.ts`, `get-container-telemetry-use-case.test.ts` | 🟢 | UC-2 / FR-2.2 / FR-2.3 / T-3 |
| 8 | `services/web-service/src/application/telemetry/get-field-containers-use-case.ts#GetFieldContainersUseCase` | YENİ — field konteyner listesi (`execute`/`executeCached`) | `get-field-containers-use-case.test.ts` | 🟢 | UC-2 / FR-2.2 / T-4 |
| 9 | `services/web-service/src/application/telemetry/get-container-telemetry-use-case.ts#GetContainerTelemetryUseCase` | YENİ — latest/downsampled/historical | `get-container-telemetry-use-case.test.ts` | 🟢 | UC-2 / FR-2.4 / T-4 |
| 10 | `services/web-service/src/tiers/field/infrastructure/container-telemetry/hub-container-view.ts#HubContainerView` | `container-session/` → field tier; `IContaTelemetryPort`+`IContainerProxy` uyumu (presence + TTL cache + relay) | `hub-container-view.test.ts` | 🟢 | UC-2 / FR-2.2 / T-5 / UC-6 |
| 11 | `services/web-service/src/presentation/routes/field-routes.ts#fieldRoutes` | İnceltildi — yalnız `GetFieldContainersUseCase`/`GetContainerTelemetryUseCase` çağırır | `field-routes.test.ts` | 🟢 | UC-2 / FR-2.2 / T-6 |
| 12 | `services/web-service/src/application/commands/execute-command-use-case.ts#ExecuteCommandUseCase` | YENİ — yürütme use-case'i (15 sn timeout, derlenmiş seçenekler) | `execute-command-use-case.test.ts` | 🟢 | UC-3 / FR-3.2 / T-7 |
| 13 | `services/web-service/src/application/commands/list-catalog-use-case.ts#ListCatalogUseCase` | YENİ — katalog listeleme | `web-service:test` | 🟢 | UC-3 / FR-3.2 / T-7 |
| 14 | `services/web-service/src/application/commands/operation-runs-use-case.ts#OperationRunsUseCase` | YENİ — koşu sorgusu | `web-service:test` | 🟢 | UC-3 / FR-3.2 / T-7 |
| 15 | `services/web-service/src/application/commands/operation-definitions-use-case.ts#OperationDefinitionsUseCase` | YENİ — tanım CRUD (strict şema + **audit fail-closed** `IAuditLog` ile) | `operation-definitions-use-case.test.ts` | 🟢 | UC-3 / FR-3.2 / T-7 |
| 16 | `services/web-service/src/presentation/routes/maneuver-routes.ts#maneuverOperationRoutes` | İnceltildi — yalnız use-case'ler (`catalog`/`executor`/`runs`/`definitions`) | `maneuver-routes.test.ts` | 🟢 | UC-3 / FR-3.2 / T-7 |
| 17 | `services/web-service/src/domain/ports/event-feed.ts#IEventFeedPort` + `#INotificationReader` | YENİ — olay feed'i + bildirim okuma portları | `log-event-feed.test.ts`, `field-event-reader.test.ts` | 🟢 | UC-4 / T-8 |
| 18 | `services/web-service/src/application/events/list-field-events-use-case.ts#ListFieldEventsUseCase` | YENİ — field olay feed'i (whitelist + cursor + limit clamp) | `event-routes.test.ts` | 🟢 | UC-4 / FR-4.2 / T-8 |
| 19 | `services/web-service/src/application/events/event-dto.ts#FieldEventDto` | YENİ — olay DTO'su (`eventId = <fieldId>:<corr|seq>`) | `event-routes.test.ts` | 🟢 | UC-4 / T-8 |
| 20 | `services/web-service/src/application/notifications/notifications-use-case.ts#NotificationsUseCase` | YENİ — boss bildirim okuma (`list`/`countSince`) | `notification-routes.test.ts` | 🟢 | UC-4 / FR-4.2 / T-8 |
| 21 | `services/web-service/src/infrastructure/persistence/log-event-feed.ts#LogEventFeed` | YENİ — `IEventFeedPort` Postgres adaptörü | `log-event-feed.test.ts` | 🟢 | UC-4 / T-8 |
| 22 | `services/web-service/src/tiers/boss/infrastructure/field-event-reader.ts#FieldEventReader` | YENİ — `INotificationReader` Postgres adaptörü (JOIN + count) | `field-event-reader.test.ts` | 🟢 | UC-4 / T-8 / UC-6 |
| 23 | `services/web-service/src/presentation/routes/event-routes.ts#eventRoutes` | İnceltildi — yalnız `feed` use-case'i | `event-routes.test.ts` | 🟢 | UC-4 / FR-4.2 |
| 24 | `services/web-service/src/presentation/routes/notification-routes.ts#notificationRoutes` | İnceltildi — yalnız `notifications` use-case'i | `notification-routes.test.ts` | 🟢 | UC-4 / FR-4.2 |
| 25 | `services/web-service/src/presentation/server.ts#registerRoutes` | 18 route grubu doğrudan `app.register(plugin, {prefix, ...deps})`; boş `containerProxy` plugin bloğu SİLİNDİ | `web-service:test` (route testleri) | 🟢 | UC-5 / FR-5.1 / FR-5.3 / T-9 / T-10 |
| 26 | `services/web-service/src/presentation/routes/*.ts` | Tüm route grupları `FastifyPluginAsync` şekilli imzaya geçti (anonim sarmalayıcı yok) | `web-service:test` | 🟢 | UC-5 / FR-5.1 / T-9 |
| 27 | `services/web-service/src/domain/ports/hub-tunnel.ts#IHubTunnelPort` | YENİ — hub tünel portu (`peers`/`access`/`openSession`; endpoint-agnostik) | `hub-consumer-client.test.ts` | 🟢 | UC-7 / FR-7.1 / T-15 |
| 28 | `services/web-service/src/infrastructure/hub-tunnel/hub-consumer-client.ts#HubConsumerClient` | YENİ — fetch tabanlı framework'siz adaptör; `HubConsumerError` | `hub-consumer-client.test.ts` | 🟢 | UC-7 / FR-7.1 / T-15 |
| 29 | `services/web-service/src/infrastructure/hub-tunnel/plugin.ts#hubTunnelPlugin` | YENİ — Fastify ambalajı (`fp`, `fastify.decorate("hubTunnel", client)`); iki config alanı | `plugin.test.ts` | 🟢 | UC-7 / FR-7.2 / T-16 |
| 30 | `services/web-service/src/infrastructure/hub-tunnel/system-headers.ts#SYSTEM_USER_HEADERS` | Taşıma (`hub-consumer/` → `hub-tunnel/`) | — (kod inceleme) | 🟢 | UC-7 / T-17 |
| 31 | `services/web-service/src/domain/ports/session.ts#ISessionAuthenticator` | Taşıma — port `container-session/` → `domain/ports/` (K15) | `stateless-session-authenticator.test.ts` | 🟢 | UC-7 / K15 / T-17 |
| 32 | `services/web-service/src/tiers/container/infrastructure/session/stateless-session-authenticator.ts#StatelessSessionAuthenticator` | Taşıma — `container-session/` → container tier; `ISessionAuthenticator` uygular | `stateless-session-authenticator.test.ts` | 🟢 | UC-7 / T-17 / UC-6 |
| 33 | `services/web-service/src/infrastructure/hub-consumer/` (4 dosya: `hub-consumer-client.ts`, `system-headers.ts`, `index.ts` + test) | SİLİNDİ — eski dağınık hub tüketici (yerine `hub-tunnel/`) | — (grep=0) | 🟢 | UC-7 / FR-7.1 / T-15 |
| 34 | `services/web-service/src/tiers/field/registrations.ts#registerFieldTier` | YENİ — field tier kompozisyonu (containerProxy, telemetri use-case'leri, event feed, uzak kanal, interlock) | `web-service:test` | 🟢 | UC-6 / FR-6.2 / T-11 |
| 35 | `services/web-service/src/tiers/container/registrations.ts#registerContainerTier` | YENİ — container tier (stateless session authenticator) | `web-service:test` | 🟢 | UC-6 / FR-6.2 / T-11 |
| 36 | `services/web-service/src/tiers/boss/registrations.ts#registerBossTier` | YENİ — boss tier (collector, notifications, operation requester) | `web-service:test` | 🟢 | UC-6 / FR-6.2 / T-11 |
| 37 | `services/web-service/src/tiers/lifecycles.ts#buildTierLifecycles` | YENİ — tier yaşam döngüsü listesi (`serviceTier` yalnız burada + config) | — (kod inceleme) | 🟢 | UC-6 / FR-6.1 / T-11 |
| 38 | `services/web-service/src/config/container.ts#buildContainer` | Core kayıtları + `register*Tier` append; `auditLog` DI bağı; use-case kayıtları | `web-service:test` | 🟢 | UC-1 / UC-3 / UC-6 / T-11 / T-13 |
| 39 | `services/web-service/src/index.ts#main` | Lifecycle orkestrasyonu (`buildTierLifecycles` + `start/stop`); `hubTunnelConnection` wiring | — (kod inceleme) | 🟢 | UC-6 / UC-7 / T-11 |
| 40 | `services/web-service/src/tiers/boss/infrastructure/field-event-collector.ts#FieldEventCollector` | `field-uplink/` → boss tier; yalnız writer/poller (use-case/route'la bağsız) | `field-event-collector.test.ts` | 🟢 | UC-4 / UC-6 / T-11 |
| 41 | `services/web-service/src/tiers/boss/infrastructure/operation-requester.ts#OperationRequester` | `field-uplink/` → boss tier; `IHubTunnelPort` tüketir | `operation-requester.test.ts` | 🟢 | UC-4 / UC-6 / T-11 |
| 42 | `services/web-service/src/tiers/field/infrastructure/hub-maneuver-channel.ts#HubManeuverChannel` | `container-session/` → field tier; `IHubTunnelPort` tüketir | `hub-maneuver-channel.test.ts` | 🟢 | UC-3 / UC-6 / T-11 |
| 43 | `services/web-service/package.json` + `bun.lock` | `fastify-plugin@^6` bağımlılığı (M7 decorator kök kapsamı) | — | 🟢 | UC-7 / T-16 |
| 44 | `AGENTS-WEB-SERVICE.md` (YENİ) + `AGENTS.md` (1 satır) | Kural seti + referans tablo satırı | — (doküman) | 🟢 | UC-6 / FR-6.3 / T-12 |

### A.2 Test Kanıtları

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| Web-service proje suite | `bun nx run web-service:test` | 63 dosya / 494 test PASS |
| Tüm repo (unit/component/integration) | `bun run test` | 312 dosya / 2560 test PASS |
| Demo entegrasyon suite | `bun run test:demo-integration` | 10 dosya / 108/108 PASS |
| Purity grep (SC-2) | `domain/` + `application/` framework/I-O import | 0 bulgu |
| Tier sızıntı grep (SC-4) | `serviceTier` presentation/application | 0 bulgu |
| Canlı doğrulama (field) | `GET /health`, `GET /api/fields/:id/containers`, `GET /api/maneuvers` | 200 |
| Canlı doğrulama (boss-only) | `GET /api/notifications` field'da | 404 (beklenen — boss-only) |
| Doküman lint | `bun run spec:check` | 0 hata |

### A.3 Kabul Kriteri Kanıtları

| Kod | Kriter (SPEC özeti) | Kanıt (test/dosya) | Durum |
|:----|:--------------------|:-------------------|:------|
| AK-1.1 | Auth zinciri hedef katman modeline uyar; route'ta iş mantığı yok | `login-use-case.ts#LoginUseCase` port tabanlı; `auth-routes.ts` yalnız use-case çağırır; 494 test yeşil | 🟢 |
| AK-1.2 | Altın örnek dosya→katman haritası dokümante | SPEC §4.1 + §4.2 (auth zinciri referans haritası) | 🟢 |
| AK-1.3 | Auth use-case'leri `TamperLogger` import etmez; `IAuditLog` portu | `login-use-case.ts`, `mfa-login-use-case.ts`, `mfa-enroll-use-case.ts` `import type { IAuditLog }`; `tamper-logger-adapter.ts#TamperLoggerAdapter` | 🟢 |
| AK-2.1 | `/containers` + `/telemetry/*` yanıt şekilleri DEĞİŞMEDİ | `field-routes.test.ts` + `bun run test:demo-integration` (108/108) + canlı `containers` 200 | 🟢 |
| AK-2.2 | Route yalnız use-case import eder (doğrudan hub client yok) | `field-routes.ts#fieldRoutes` yalnız `GetFieldContainersUseCase`/`GetContainerTelemetryUseCase` | 🟢 |
| AK-2.3 | Port yüzeyi hub'a anlamsız WS metotları içermez | `container-telemetry.ts#IContaTelemetryPort` — `sendControl`/`sendBinary`/`registerContainer` YOK | 🟢 |
| AK-2.4 | Trendler (SOC + sıcaklık) `downsampled` yolundan beslenir | `get-container-telemetry-use-case.test.ts` "downsampled portun allHistorical'ine delege eder" + `hub-container-view.test.ts` | 🟢 |
| AK-3.1 | Manevra/operasyon uç şekilleri DEĞİŞMEDİ | `maneuver-routes.test.ts` + `bun run test:demo-integration` (108/108) | 🟢 |
| AK-3.2 | Route'lar yalnız use-case çağırır (DB/mq doğrudan yok) | `maneuver-routes.ts#maneuverOperationRoutes` yalnız `catalog`/`executor`/`runs`/`definitions` | 🟢 |
| AK-3.3 | Core hub/uzak kanal bağımlılığı taşımaz | grep: `application/commands/*` yalnız `platform-commands` domain + `IAuditLog` import eder; hub/ws-tunnel yok | 🟢 |
| AK-4.1 | Olay/bildirim yanıt şekilleri DEĞİŞMEDİ | `event-routes.test.ts` + `notification-routes.test.ts` + `bun run test:demo-integration` | 🟢 |
| AK-4.2 | Route'lar yalnız use-case çağırır | `event-routes.ts#eventRoutes` (`feed`), `notification-routes.ts#notificationRoutes` (`notifications`); collector/postgres doğrudan yok | 🟢 |
| AK-5.1 | 18/18 route grubu plugin | `server.ts#registerRoutes` doğrudan `app.register`; route dosyaları `FastifyPluginAsync` şekilli | 🟢 |
| AK-5.2 | `serviceTier` route/plugin içinde YOK | grep: presentation/application `serviceTier` = 0 | 🟢 |
| AK-5.3 | Boş plugin registration kalıntısı YOK | `server.ts#registerRoutes` — `containerProxy` boş bloğu kaldırıldı | 🟢 |
| AK-6.1 | `serviceTier` yalnız composition root'ta | grep: yalnız `config/container.ts` + `config/default.ts` + `tiers/lifecycles.ts` + `tiers/*/registrations.ts` | 🟢 |
| AK-6.2 | Tier-spesifik kod `tiers/*` altında | `tiers/field/infrastructure/container-telemetry/`, `tiers/container/infrastructure/session/`, `tiers/boss/infrastructure/*` | 🟢 |
| AK-6.3 | `AGENTS-WEB-SERVICE.md` + AGENTS.md referansı | `AGENTS-WEB-SERVICE.md` (YENİ) + `AGENTS.md` tablo satırı (`IHubTunnelPort` tetikleyicisi) | 🟢 |
| AK-7.1 | Hub istemcisi tek modülde; tüketiciler portu kullanır | grep: `HubConsumerClient` import yalnız `hub-tunnel/` + `config/container.ts` + `tiers/*`; eski `hub-consumer/` silindi | 🟢 |
| AK-7.2 | Plugin config'i minimal (`{ baseUrl, token }`) | `plugin.test.ts` "iki config alanıyla takılır ve hubTunnel decorator'ını sunar" | 🟢 |
| AK-7.3 | Session auth mevcut rbac option'ında; ayrı auth plugin'i YOK | `server.ts#registerPlugins` `sessionRbacOptions`; `stateless-session-authenticator.ts#StatelessSessionAuthenticator` | 🟢 |
| AK-7.4 | Hub/tünel kaynaklı dış API şekilleri DEĞİŞMEDİ | `bun run test:demo-integration` (108/108) + canlı `/api/maneuvers` 200 | 🟢 |

### A.4 Sapmalar

| # | Sapma | Açıklama | Etki |
|:--|:------|:---------|:-----|
| S-1 | M3: `platform-commands` domain sınıfları doğrudan tüketildi | `ExecuteCommandUseCase`/`ListCatalogUseCase`/`OperationRunsUseCase`/`OperationDefinitionsUseCase`, `ManeuverRegistry`/`OperationExecutor`/`IOperationRunStore`/`IOperationDefinitionStore` sınıflarını doğrudan enjekte eder — ayrı port arayüzü açılmadı | Kütüphane zaten framework/I-O'suz domain'dir; sarmalayıcı port YAGNI'dir. DI'da somut sınıflar bağlanır (config tek nokta) |
| S-2 | M5: security hook'ları global kaldı | RBAC/request-context/error handler'ları route-grubu kapsüllemesine alınmadı; `app.addHook("onRequest", ...)` ile global kaydedildi | Tüm route'lara uygulanması zorunlu davranış; kapsülleme istenen etkiyi bozardı |
| S-3 | M7: `fastify-plugin` bağımlılığı + imaj rebuild | Plugin kök kapsama (`fp`) taşındığı için `fastify-plugin@^6` eklendi | Yeni prod bağımlılık; dev imajlarının yeniden build'ini gerektirdi |
| S-4 | M7: plugin kendi hafif istemcisini kurar | `hubTunnelPlugin` içeride `new HubConsumerClient(...)` kurar; DI'daki `hubConsumerClient` use-case'lerde ayrıca yaşar | İkisi de durumsuz (paylaşılan state yok); davranış değişmez. İleride paylaşım gerekirse tek instance'a bağlanır |
| S-5 | M6: route dosyaları presentation'da kaldı | Tier'a özgü **route** dosyaları `presentation/routes/` altında kaldı; yalnız tier'a özgü **infrastructure** `tiers/*` altına taşındı | K4'e uygun (presentation giriş adaptörü); tier ayrımı registration'da yapılır |
| S-6 | SPEC UC-6 T-12 checkbox'ı senkron değil | SPEC'te `- [ ] T-12: AGENTS-WEB-SERVICE.md` hâlâ işaretsiz; `AGENTS-WEB-SERVICE.md` yazıldı + AGENTS.md satırı eklendi | Doküman senkronu — kod/davranış etkisi YOK (AK-6.3 yeşil) |

### A.5 Gözle Kontrol Maddeleri

- [x] **SC-1/SC-2:** `domain/` + `application/` katmanlarında framework/I-O import = 0 (grep; izinli: `shared-types`, `result`, yerel domain)
- [x] **SC-3:** Tüm route grupları Fastify plugin (18/18) — `server.ts#registerRoutes` doğrudan `app.register`
- [x] **SC-4:** `serviceTier` yalnız composition root + tier registration/lifecycle'ta — presentation/application grep=0
- [x] **SC-5:** UC envanteri tier'a atanmış (SPEC §4.5); field/boss/container infra `tiers/*` altında
- [x] **SC-6:** `bun nx run web-service:test` 494 PASS + `bun run test` 2560 PASS + `bun run test:demo-integration` 108/108
- [x] **SC-7:** Dış API şekilleri sabit — demo-entegrasyon 108/108 + canlı 200 doğrulamaları
- [x] **SC-8:** `bun run spec:check` temiz (0 hata)
- [x] **K12 (Purity-10):** `application/` içinde somut `TamperLogger` import'u YOK — yalnız `IAuditLog` (grep)
- [x] **K4 (kardeş halka):** presentation ↔ infrastructure doğrudan import YOK (route'lar use-case/port, adapter'lar port üzerinden)
- [x] **K5/K14:** Tier koşulu yalnız `tiers/*/registrations.ts` + `lifecycles.ts` + `config` içinde; route/use-case içinde `if (tier)` yok
- [x] **K15:** `ISessionAuthenticator` `domain/ports/session.ts`'te; adaptör `StatelessSessionAuthenticator` container tier'da; rbac `sessionRbacOptions` üzerinden
- [x] **K16:** Tek transport (hub) — `IHubTunnelPort` sabit; transport-switch makinesi YOK
- [x] **Elegant Object:** yeni sınıflar `readonly` alanlar + tek primary constructor + komut/query ayrımı (`execute`/`log`/`poll`/`start` komut; `list`/`find`/`countSince` query); statik metot YOK
- [x] **Async loops:** `Promise.allSettled` kullanımı (`get-field-containers-use-case.ts#execute`, `hub-container-view.ts#allHistorical`, `field-event-collector.ts#poll`); `for...of await` YOK
- [x] **Kod referansı:** satır-numarası referansı YOK (`#sembol` çapası)

### A.6 Genel Durum Özeti

Web-service'in katman modeli, vaat edilen hexagonal yapıya doğru taşındı: auth altın örneği `IAuditLog` portuyla tamamlandı (M1); hub/konteyner boundary'si `IContaTelemetryPort` + iki use-case + field-tier `HubContainerView` adapter'ıyla kapatıldı (M2); manevra/operasyon (M3), olay/bildirim (M4) alanlarına use-case'ler kazandırıldı ve route'lar inceltildi; 18 route grubu `app.register` ile doğrudan plugin olarak kaydedildi (M5); core + `tiers/{container,field,boss}` kompozisyonu + `lifecycles.ts` ile tier koşulları tek noktaya toplandı (M6); hub/tünel yüzeyi `domain/ports/hub-tunnel.ts#IHubTunnelPort` + framework'siz `HubConsumerClient` + `hubTunnelPlugin` modülünde toplandı (M7). `serviceTier` yalnız config + tier registration/lifecycle'ta yaşıyor; `domain`/`application` framework/I-O'dan arındı. Tüm kapılar yeşil: 494 web-service + 2560 repo + 108 demo-entegrasyon testi; purity grepleri 0 bulgu; canlı field uçları 200, boss-only uç field'da beklenen 404. Belirlenen 6 sapma (S-1..S-5 bilinçli YAGNI/global-hook/bağımlılık tercihleri, S-6 doküman senkronu); kalan açık dallar §B.2'de listelendi.

**review_date:** 2026-10-23

## B. TEST KAPSAMI

### B.1 Kapsam Matrisi (durum → koşul → beklenen → test ref'i)

| Durum | Koşul | Beklenen (THEN) | Test ref'i |
|:------|:------|:----------------|:-----------|
| Auth katman uyumu | auth use-case'i incelenir | `TamperLogger` import yok; `IAuditLog` portu kullanılır | `login-use-case.ts#LoginUseCase` + `mfa-login-use-case.ts#MfaLoginUseCase` + `mfa-enroll-use-case.ts#MfaEnrollUseCase` (kod inceleme) |
| Field konteyner listesi (taze) | `execute()` çağrılır, snapshot dolu | `latestQuery` sonucu kullanılır, `lastSeenAt` ISO döner | `get-field-containers-use-case.test.ts` "taze snapshot doluysa onu kullanır" |
| Field konteyner listesi (cache fallback) | taze snapshot boş | cache'teki son değere düşer | `get-field-containers-use-case.test.ts` "taze snapshot boşsa cache'teki son değere düşer" |
| Kısmi konteyner hatası | bir konteyner sorgusu reddedilir | diğerleri engellenmez (`Promise.allSettled`) | `get-field-containers-use-case.test.ts` "bir konteynerin hatası diğerlerini engellemez" |
| Özet ekranı | `executeCached()` çağrılır | dış sorgu YAPILMAZ | `get-field-containers-use-case.test.ts` "executeCached dış sorgu yapmaz" |
| Latest snapshot | tüm konteynerler | kimlikler anahtar, son değerler döner | `get-container-telemetry-use-case.test.ts` "latestSnapshot tüm konteyner kimliklerini anahtarlar" |
| Downsampled | grafik isteği | `allHistorical`'e delege edilir | `get-container-telemetry-use-case.test.ts` "downsampled portun allHistorical'ine delege eder" |
| Historical (yok) | konteyner yok | boş dizi döner | `get-container-telemetry-use-case.test.ts` "historical yoksa boş dizi döner" |
| Bilinen kimlikler | `knownContainerIds()` | porttan gelir | `get-container-telemetry-use-case.test.ts` "knownContainerIds porttan gelir" |
| Yürütme seçenekleri | `execute()` çağrılır | derlenmiş seçenekler executor'a geçer (`systems` → `remoteSystem`) | `execute-command-use-case.test.ts` "executor'a derlenmiş seçenekleri geçirir" |
| Yürütme timeout | 15 sn terminal sonuç yok | `"timeout"` döner (arka plan sürer) | `execute-command-use-case.test.ts` "15 sn içinde terminal sonuç gelmezse 'timeout' döner" |
| Yürütme hatası | executor reject | hata yutulmadan yayılır | `execute-command-use-case.test.ts` "executor reddederse hata yutulmadan yayılır" |
| Tanım oluşturma | geçerli şema | kayıt + audit yazılır | `operation-definitions-use-case.test.ts` "geçerli tanımı oluşturur + audit yazar" |
| Audit fail-closed | audit log throw | `persist_failed`; store'a YAZILMAZ | `operation-definitions-use-case.test.ts` "audit fail-closed: audit hatası → persist_failed" |
| Mevcut kayıt | aynı ad | `already_exists` | `operation-definitions-use-case.test.ts` "mevcut tanım → already_exists" |
| Şema hatası | geçersiz gövde | `invalid` (yazılmaz) | `operation-definitions-use-case.test.ts` "şema hatası → invalid" |
| Tanım güncelleme | ad eşleşen gövde | kayıt + audit yazılır | `operation-definitions-use-case.test.ts` "güncelleme + audit yazılır" |
| Güncelleme ad uyuşmazlığı | gövde adı ≠ yol adı | `invalid` (yazılmaz) | `operation-definitions-use-case.test.ts` "güncellemede ad uyuşmazlığı → invalid" |
| Güncelleme audit fail-closed | audit throw | `persist_failed`; store'a YAZILMAZ | `operation-definitions-use-case.test.ts` "güncelleme audit fail-closed" |
| Tanım devre dışı | `disable()` | `deleted` + audit + `setEnabled(false)` | `operation-definitions-use-case.test.ts` "devre dışı bırakma → deleted + audit" |
| Devre dışı bulunamadı | store `not_found` | `not_found` | `operation-definitions-use-case.test.ts` "devre dışı bırakmada bulunamayan kayıt → not_found" |
| Devre dışı audit fail-closed | audit throw | `persist_failed`; `setEnabled` çağrılmaz | `operation-definitions-use-case.test.ts` "devre dışı bırakma audit fail-closed" |
| Hub peers | `peers()` çağrılır | tipli liste + auth başlığı | `hub-consumer-client.test.ts` "AK-1.1: peers() tipli liste döner" |
| Oturum açma | `openSession()` | `POST /sessions` çağrılır | `hub-consumer-client.test.ts` "openSession POST /sessions" |
| Programatik erişim | `access()` çağrılır | opak URL kurulur (`/peers/:pid/services/:sid/...`) | `hub-consumer-client.test.ts` "access programatik erişim URL'i kurar" |
| Hub HTTP hatası | yanıt `!ok` | `HubConsumerError` fırlatılır | `hub-consumer-client.test.ts` "ok olmayan yanıt HubConsumerError fırlatır" |
| Plugin takma | `{ baseUrl, token }` | `hubTunnel` decorator sunulur | `plugin.test.ts` "iki config alanıyla takılır" |
| Plugin test enjeksiyonu | `fetchImpl` verilir | decorator enjekte edilen fetch ile çalışır | `plugin.test.ts` "decorator enjekte edilen fetch ile çalışır" |
| Olay feed adapter | `listAfter` | whitelist + after + limit ile sorgular; port tipine eşler | `log-event-feed.test.ts` "whitelist+after+limit ile sorgular" |
| Bildirim reader | `list` | JOIN ile saha adı + ISO dönüşümü | `field-event-reader.test.ts` "JOIN ile saha adını taşır" |
| Bildirim sayacı | `countSince` | sonrasını sayar | `field-event-reader.test.ts` "countSince sonrasını sayar" |
| Presence | hub keşfi | `connectionStatus`/`lastSeenAt`/`containerIds` doğru | `hub-container-view.test.ts` |
| Relay fail-safe | erişim hatası | boş dizi / bayat cache fallback | `hub-container-view.test.ts` |
| Yeniden bağlanma | `idle`→`connected` | cache geçersizleşir | `hub-container-view.test.ts` |
| Uzak manevra kanalı | field tier | `POST /api/maneuvers/:name/execute` opak erişim | `hub-maneuver-channel.test.ts` |
| Olay poller | boss tier | field peer'ları keşfedilir, cursor + dedupe INSERT | `field-event-collector.test.ts` |
| Operasyon tetikleme | boss tier | hub access POST + terminal-only eşleme | `operation-requester.test.ts` |
| Oturum doğrulama | container tier | `container_session` cookie → `User` (geçersiz → `undefined`) | `stateless-session-authenticator.test.ts` |

### B.2 KAPSANMAYAN Boşluklar

| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| — | ~~G1~~ (kapatıldı 2026-10-23) | — | — |
| — | ~~G2~~ (kapatıldı 2026-10-23) | — | — |
| G3 | `ListFieldEventsUseCase` ve `NotificationsUseCase` limit-clamp / `stringifyContext` kenar dalları için **use-case unit testi** yok — yalnız route seviyesi (`event-routes.test.ts`, `notification-routes.test.ts`) kapsıyor | düşük | use-case birim testleri (limit 0/negatif/üst sınır; primitif-olmayan context) ekle |
| G4 | `tiers/*/registrations.ts` (DI wiring) ve `buildTierLifecycles` için ayrılmış unit test yok — yalnız integration + canlı ile dolaylı | orta | registration'ları awilix cradle assertion'ı ile test et |
| G5 | `hubTunnelPlugin` decorator'ının route içi gerçek tüketimi (hub front-door `POST /api/hub/session` uçtan uca) field/boss stack'i hub'a açık olmadığından doğrulanmadı | orta | demo-entegrasyonda field peer'ı hub'a açıp uçtan uca session akışını doğrula |
| G6 | Field `UPLINK_EVENT_WHITELIST` (9 kod) ile boss `COLLECTED_EVENT_CODES` (5 kod) iki elle senkron liste — drift riski | düşük | tek kaynak sabiti (paylaşılan modül) — ayrı SPEC |
| G7 | `hubTunnelPlugin` decorator tip bildirimi (`FastifyInstance["hubTunnel"]`) tip-hatası yalnız typecheck ile yakalanır; çalışma-zamanı eksik takılma durumu açık testi yok | düşük | plugin takılı değilken tünel uçlarının 404 döndüğünü doğrulayan test |

**review_date:** 2026-10-23
