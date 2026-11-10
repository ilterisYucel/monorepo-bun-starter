---
status: active
space: architecture
tags: [kapanis, dogrulama, test-kapsami, ws-tunnel, arindirma, bagimsiz-paket]
review_date: 2026-10-19
---

# ws-tunnel Domain Arındırma ve Bağımsız Paket — Kapanış (Doğrulama + Test Kapsamı)

> **İş akışı aşaması:** 5/5 — KAPANIŞ (AGENTS.md "Geliştirme İş Akışı").
> **SPEC:** [WS-TUNNEL-DOMAIN-KALINTI-ARINDIRMA-MIMARISI.md](./WS-TUNNEL-DOMAIN-KALINTI-ARINDIRMA-MIMARISI.md) (✅ Approved 2026-10-16 — AK/FR/SC kaynağı).
> **Kapsam:** UC-1..UC-4 — telemetri/operation/event'in paketten çıkarılması, yerel `Result` gömme, isim/varsayılan arındırması, bağımsız paket arayüzü (d.ts + exports).

## A. DOĞRULAMA

### A.1 Değişiklik Matrisi

| # | Dosya | Değişiklik | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------------|
| 1 | `packages/ws-tunnel/src/protocol/messages.ts#TunnelOperationalConfig` @fbfdb8b | Telemetri/operation/event tipleri + şemaları + `TUNNEL_MESSAGE_TYPES` domain girdileri çıkarıldı; config yalnız `heartbeatIntervalMs` | K1, K10, FR-1.1, FR-1.3 |
| 2 | `packages/ws-tunnel/src/types.ts#TunnelTelemetryPoint` @fbfdb8b | `TunnelTelemetryPoint` çıkarıldı; JSDoc domain sözcükleri (field/container) temizlendi | K1, FR-1.1, FR-3.6 |
| 3 | `packages/ws-tunnel/src/snapshot/` @fbfdb8b | `ISnapshotSource` modülü (index+interface) silindi | K1, FR-1.1 |
| 4 | `packages/ws-tunnel/src/connector/tunnel-connector.ts#TunnelConnector` @fbfdb8b | `snapshotSource` parametresi + `telemetryTimer`/`pushSnapshot`/`scheduleTelemetry` kaldırıldı; `eventCodes` injectable + `DEFAULT_TUNNEL_EVENT_CODES` nötr | K7, FR-1.2, FR-3.4 |
| 5 | `packages/ws-tunnel/src/client/tunnel-client.ts#routeUpstream` @fbfdb8b | `routeUpstream?` injection eklendi; varsayılan `upstreamUrl` kuralı korundu | K4, FR-3.1 |
| 6 | `packages/ws-tunnel/src/proxy/tunnel-proxy.ts#DEFAULT_COOKIE_NAME` @fbfdb8b | Cookie varsayılanı `tunnel_session`; `DEFAULT_BLOCKED_PREFIXES` boş (`[]`) | K5, K6, FR-3.2, FR-3.3 |
| 7 | `packages/ws-tunnel/src/proxy/session-gateway.ts#SessionOpenInput` @fbfdb8b | `fieldId` → `hubId` | K3, FR-3.5 |
| 8 | `packages/ws-tunnel/src/audit/interface.ts#SessionAuditOpenRecord` @fbfdb8b | `fieldId` → `hubId` | K3, FR-3.5 |
| 9 | `packages/ws-tunnel/src/result/` @fbfdb8b | YENİ — yerel `Result` + `DomainError` taksonomisi (7 hata sınıfı) + test | K2, FR-2.1 |
| 10 | `packages/ws-tunnel/src/{codec,connector,proxy,hub}/` @fbfdb8b | `@gd-monorepo/result` importları yerel `../result`'e göçtü | K2, FR-2.1 |
| 11 | `packages/ws-tunnel/package.json` @fbfdb8b | `@gd-monorepo/result` dependency çıkarıldı (yalnız `ws`+`zod`); `main`/`types`/`exports` → `dist/`; build = bun build + `tsc --emitDeclarationOnly` | K2, K12, FR-2.2, FR-4.1 |
| 12 | `packages/ws-tunnel/tsconfig.json` @fbfdb8b | `../result` reference kaldırıldı | K2, FR-2.2 |
| 13 | `packages/ws-tunnel/src/demo/hub-harness.ts#HubHarness` @fbfdb8b | `FieldHarness` → `HubHarness` (rename) | K8, FR-3.6 |
| 14 | `packages/ws-tunnel/src/index.ts` @fbfdb8b | `./snapshot` export çıkarıldı; `./result` export eklendi | K1, K2 |
| 15 | `services/web-service/src/infrastructure/tunnel-extensions/messages.ts` @fbfdb8b | YENİ — `TunnelTelemetryPoint`, `ISnapshotSource`, telemetri/operation/event tipleri + `telemetryQuerySchema`/`operationExecuteSchema` (paketten birebir taşıma) | K1, FR-1.4 |
| 16 | `services/web-service/src/infrastructure/tunnel-extensions/telemetry-push.ts#TelemetrySnapshotPusher` @fbfdb8b | YENİ — domain snapshot push timer'ı (`sendControl({type:"telemetry"})`) | K9, FR-1.4, AK-1.4 |
| 17 | `services/web-service/src/config/default.ts#GD_PMS_TUNNEL_EVENT_CODES` @fbfdb8b | Domain event kodları + `FIELD_TUNNEL_BLOCKED_PREFIXES`; `fieldTunnelPathAllowlist` artık her zaman allowlist döner; `resolveTelemetryIntervalMs` sabit 15000 | K7, K6, K9 |
| 18 | `services/web-service/src/config/container.ts` @fbfdb8b | `eventCodes`/`cookieName:"container_session"` enjeksiyonu; connector snapshot argümanları kaldırıldı; `TelemetrySnapshotPusher` singleton | K5, K7, K9, FR-1.5 |
| 19 | `services/web-service/src/index.ts` @fbfdb8b | `telemetrySnapshotPusher.start()/stop()` lifecycle | K9, FR-1.4 |
| 20 | `services/web-service/src/presentation/routes/session-routes.ts#CONTAINER_TUNNEL_ALLOWLIST` @fbfdb8b | `container_session` cookie + `hubId` + domain blocklist enjeksiyonu | K5, K6, K3 |
| 21 | `services/web-service/src/infrastructure/**` (responder/requester/collector/proxy/snapshot sources) @fbfdb8b | Tip importları `@gd-monorepo/ws-tunnel` → `../tunnel-extensions`; `fieldId` → `hubId` çağrı siteleri | K1, K3, FR-1.5 |
| 22 | `AGENTS-WS-TUNNEL.md` @fbfdb8b | "Paket sınırı sözleşmesi" bölümü + domain/`hubId`/enjeksiyon maddeleri güncellendi | K10, T-17 |
| 23 | `docs/architecture/WS-TUNNEL-OPAK-SERVIS-ERISIMI-MIMARISI.md` @fbfdb8b | Bağımlılık satırı İP-1: `ws`+`zod`; yerel `Result` | K2, T-17 |

### A.2 Test Kanıtları

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| ws-tunnel birim/component | `npx vitest run --root packages/ws-tunnel` | ✅ 14 dosya, 233 test yeşil |
| ws-tunnel tip | `nx run ws-tunnel:typecheck` | ✅ yeşil |
| web-service birim/component | `nx run web-service:test --skip-nx-cache` | ✅ 72 dosya, 631 test yeşil |
| Etkilenen grafik | `nx affected -t test build --base=HEAD` | ✅ 4 proje + 10 bağımlılık başarılı |
| ws-tunnel coverage | `npx vitest run --coverage --root packages/ws-tunnel` | ✅ %96.98 stmts / %93.01 branch / %100 funcs (≥%90 kapısı) |
| Demo (gözle) | `tools/peer-service-demo.mjs`, `tools/tunnel-demo.mjs`, `tools/field-connector-demo.mjs`, `packages/ws-tunnel/examples/loopback-demo.mjs` | ✅ hepsi "TÜM KONTROLLER GEÇTİ" |
| Taze proje import (T-16) | `/tmp/opencode/ws-tunnel-import-test` → `bun run index.ts` + `tsc -p` | ✅ import-ok + exit 0 (runtime+tip, monorepo atfı yok) |
| SPEC lint | `bun tools/spec-check.mjs docs/architecture/WS-TUNNEL-DOMAIN-KALINTI-ARINDIRMA-MIMARISI.md` | ✅ 0 hata |

### A.3 Kabul Kriteri Kanıtları

| Kod | Kriter (SPEC özeti) | Kanıt (test/dosya) | Durum |
|:----|:--------------------|:-------------------|:------|
| AK-1.1 | Telemetri/operation/event tipleri paketten çıktı | `packages/ws-tunnel/src/protocol/messages.ts` (sembol yok); `src/index.ts` `./snapshot` yok | 🟢 |
| AK-1.2 | Connector telemetri timer/snapshot enjeksiyonu yok | `tunnel-connector.test.ts` (snapshot testleri silindi); `tunnel-connector.ts#TunnelConnector` | 🟢 |
| AK-1.3 | `TunnelOperationalConfig` yalnız `heartbeatIntervalMs` | `messages.test.ts` "yalnızca heartbeat" | 🟢 |
| AK-1.4 | Tüketici snapshot push timer'ı | `tunnel-extensions/telemetry-push.ts#TelemetrySnapshotPusher` | 🟢 |
| AK-1.5 | Tüketici importları taşındı, davranış aynı | web-service 72/631 test + responder/requester/collector yeşil | 🟢 |
| AK-1.6 | Wire JSON şekli sabit | `tunnel-extensions/messages.ts` (birebir taşıma); operation-flow.spec + demolar | 🟢 |
| AK-2.1 | Yerel `Result` API eşdeğeri | `result/result.test.ts` | 🟢 |
| AK-2.2 | Bağımlılık yalnız `ws`+`zod` | `packages/ws-tunnel/package.json` | 🟢 |
| AK-2.3 | `decode` throw etmez + `kind` korunur | `frame-codec.ts` (yerel `ValidationError`); ws-tunnel test seti | 🟢 |
| AK-3.1 | `routeUpstream` injectable | `tunnel-client.ts#routeUpstream`; tunnel-client testleri | 🟢 |
| AK-3.2 | Cookie nötr (`tunnel_session`) + injection | `tunnel-proxy.test.ts` (`sessionCookieValue`); `container.ts` `container_session` | 🟢 |
| AK-3.3 | Allowlist blocked varsayılanı boş + injection | `tunnel-proxy.ts#DEFAULT_BLOCKED_PREFIXES`; `default.test.ts` (`fieldTunnelPathAllowlist`) | 🟢 |
| AK-3.4 | `eventCodes` injectable + nötr varsayılan | `tunnel-connector.test.ts` ("nötr varsayılan") | 🟢 |
| AK-3.5 | `hubId` rename (paket + tüketici) | `session-gateway.ts#SessionOpenInput`, `audit/interface.ts`; çağrı siteleri | 🟢 |
| AK-3.6 | `HubHarness` + JSDoc/README temiz | `demo/hub-harness.ts#HubHarness`; `types.ts`/`messages.ts` JSDoc | 🟢 |
| AK-4.1 | d.ts + exports | `package.json` (build = `tsc --emitDeclarationOnly` + exports → dist) | 🟢 |
| AK-4.2 | Taze proje import yürüyüşü | T-16 `/tmp/opencode/ws-tunnel-import-test` (bun + tsc) | 🟢 |

### A.4 Sapmalar

| # | Sapma | Açıklama |
|:--|:------|:---------|
| S-1 | `web-service:typecheck` baseline kırmızı | Workspace `dist` .d.ts + `@fastify/websocket` augmentation kaynaklı; bu işten bağımsız. Gerçek kapılar: `ws-tunnel:typecheck` + build + testler (hepsi yeşil). |
| S-2 | Telemetri push aralığının canlı değişimi (config-update) kaldırıldı | Aralık artık açılışta `TUNNEL_TELEMETRY_INTERVAL_MS` ile belirlenir; `resolveTelemetryIntervalMs` sabit 15000 (K9). |
| S-3 | `tools/tunnel-demo.mjs` `sendWsToContainer` → `sendWsToPeer` | Pre-existing düzeltme (demo kapısı için); paket method adı zaten `sendWsToPeer`. |
| S-4 | `result.ts` kopyası monorepo result paketiyle birebir API | Yalnızca kullanılan hatalar değil, tam taksonomi (7 sınıf) taşındı — tüketici API pariteleri için (K2). |

### A.5 Gözle Kontrol Maddeleri

- [x] Paket public yüzeyinde telemetri/operation/event sembolü YOK (`messages.ts`, `types.ts`, `index.ts`).
- [x] `packages/ws-tunnel/package.json` dependencies yalnız `ws` + `zod` (`@gd-monorepo/*` YOK).
- [x] Core dosyalarda domain sözcüğü (container/field/boss/bess/revpi) YOK — JSDoc'lar nötr.
- [x] `fieldId` kalıntısı yok (grep `fieldId` → yalnızca tüketici çağrı sitelerinde `fieldId` → `hubId` eşlemesi).
- [x] `FieldHarness` kalıntısı yok (`HubHarness` + README/demo güncel).
- [x] Wire JSON şekilleri değişmedi (`type:"telemetry"`, `operation-*`, `event` — tüketici modülünde birebir).
- [x] `routeUpstream`, cookie adı, blocklist, `eventCodes` tüketicide enjekte ediliyor.
- [x] `TelemetrySnapshotPusher` start/stop lifecycle `index.ts`'te bağlı.

### A.6 Genel Durum Özeti

UC-1..UC-4'ün tüm görevleri (T-1..T-18) tamamlandı; tüm kabul kriterleri (AK-1.1..1.6, AK-2.1..2.3, AK-3.1..3.6, AK-4.1..4.2) yeşil. Paket `ws`+`zod` dışında bağımlılığı olmayan saf transport + oturum + stream kütüphanesine indirgendi; domain (telemetri/operasyon/olay, event code, cookie/blocklist, upstream) `tunnel-extensions` tüketici modülüne taşındı. Coverage %96.98 stmts / %93.01 branch ile ≥%90 kapısı aşıldı; bağımsız import taze projede doğrulandı. Dört sapma (S-1..S-4) kayıt altında — hiçbiri kabul kriterlerini ihlal etmiyor. Modül kapanabilir.

**review_date:** 2026-10-19

## B. TEST KAPSAMI

### B.1 Kapsam Matrisi (durum → koşul → beklenen → test ref'i)

| Durum | Koşul | Beklenen (THEN) | Test ref'i |
|:------|:------|:----------------|:-----------|
| Register | `register` → `register-ack ok` | İlk heartbeat + `connected`; telemetri push YOK (pakette) | `tunnel-connector.test.ts` "ack ok → ilk heartbeat + connected" |
| Register (event kodları) | `eventCodes` verilmez | Nötr `tunnel_connected` loglanır | `tunnel-connector.test.ts` "nötr varsayılan" |
| Operational config | `config-update { heartbeatIntervalMs }` | Heartbeat aralığı restart'sız değişir; geçersiz → `configRejected` | `tunnel-connector.spec.ts` "T2.5"; `tunnel-connector.test.ts` |
| Heartbeat | Bağlı, her `heartbeatIntervalMs` | `heartbeat` frame gönderilir | `tunnel-connector.test.ts` "heartbeat her 15 sn'de" |
| Liveness | Pong gelmez `livenessTimeoutMs` aşımı | `connectionLost` log + backoff | `tunnel-connector.test.ts` (liveness) |
| decode | Bozuk binary frame | Throw etmez; `err(FrameDecodeError)` döner | `frame-codec` test seti (ws-tunnel) |
| Oturum | `openSession({hubId,…})` | Oturum açılır; audit `hubId` taşır | `session-gateway.test.ts`; `loopback.spec.ts` |
| Cookie çözümleme | Varsayılan cookie adı | `tunnel_session` çözülür; tüketici `container_session` enjekte eder | `tunnel-proxy.test.ts` "sessionCookieValue" |
| Path allowlist | Blocklist enjeksiyonsuz | Varsayılan blocked boş; tüketici blocklist uygular | `tunnel-proxy.test.ts` "isPathAllowed"; `default.test.ts` |
| Upstream yönlendirme | `routeUpstream` verilmez | Varsayılan `/api|/ws` → API, diğer → statik | `tunnel-client.ts#upstreamUrl` testleri |
| Telemetri push | Connector bağlı + snapshot dolu | `sendControl({type:"telemetry"})` gönderilir | `tunnel-extensions/telemetry-push.ts#TelemetrySnapshotPusher` |
| Operation/event (tüketici) | operation/event mesajı alınır | Tipler `tunnel-extensions`'tan çözülür; akış aynı | `operation-flow.spec.ts`; `field-event-collector` testleri |
| Bağımsız import | Taze proje `import { TunnelConnector }` | Tip + kod çözülür, monorepo atfı YOK | T-16 `/tmp/opencode/ws-tunnel-import-test` |

### B.2 KAPSANMAYAN Boşluklar

| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| G1 | Telemetri push aralığının canlı değişimi (config-update ile) | Düşük | Kaldırıldı (K9/S-2); ihtiyaç belirirse tüketici subscriber'ı (SPEC §10 A2) |
| G2 | `hub-servis` (hub tier domain modülü) | Orta | Ayrı SPEC — bu paket kapsamı dışı (P2) |
| G3 | Host-based erişim / subdomain yönlendirme | Orta | Ayrı SPEC (`WS-TUNNEL-SUBDOMAIN-YONLENDIRME-MIMARISI.md`) — SPEC §11 İP-3 |
| G4 | Gerçek RevPi / cihaz peer uçta doğrulama | Orta | P4; simülatör/demo + `peer-service-demo` yeterli bu turda |
| G5 | Paket ismi/marka, LICENSE, npm registry | Düşük | İP-4 (KUTUPHANE-CIKARMA-PLANI §8) — SPEC §11 |

**review_date:** 2026-10-19
