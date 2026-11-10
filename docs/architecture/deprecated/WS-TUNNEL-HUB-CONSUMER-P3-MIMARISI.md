---
status: active
space: architecture
tags: [mimari, ws-tunnel, hub-servis, consumer, monorepo, gecis, compose, spec]
review_date: 2026-10-16
---

# ws-tunnel Hub-Servis Tüketici Entegrasyonu (Monorepo P3) — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/5 — SPEC (AGENTS.md "Geliştirme İş Akışı").
> **Durum:** 🟡 GELİŞTİRMEDE — KAPANIŞ yazıldı; parity e2e (AK-5.3) P4 ile tamamlanacak.
> **KAPANIŞ:** [WS-TUNNEL-HUB-CONSUMER-P3-KAPANIS.md](./WS-TUNNEL-HUB-CONSUMER-P3-KAPANIS.md)
> **İlişkili:** [WS-TUNNEL-HUB-SERVIS-MIMARISI.md](./WS-TUNNEL-HUB-SERVIS-MIMARISI.md), [WS-TUNNEL-OPAK-SERVIS-ERISIMI-MIMARISI.md](./WS-TUNNEL-OPAK-SERVIS-ERISIMI-MIMARISI.md), [WS-TUNNEL-BOOTSTRAP-KIMLIK-MIMARISI.md](./WS-TUNNEL-BOOTSTRAP-KIMLIK-MIMARISI.md), [AGENTS-DEPLOYMENT.md](../../AGENTS-DEPLOYMENT.md)

## 1. Amaç ve Bağlam

Hub-servis (P2) ayrı bir imaj olarak hazır. P3'te monorepo `web-service` **hub olmaktan çıkıp tüketici olur**: field/boss tier'daki hub sorumlulukları (peer WS kabulü, oturum/proxy, keşif) hub-servis imajına taşınır; web-service **domain** katmanını (telemetri/operation/event, RBAC/audit, komut yürütme) korur ve hub-servis'e consumer olarak bağlanır.

**Kritik kısıt:** v1/v2 tagli uygulamalar ve mevcut SPA akışları çalışmaya devam etmelidir. Bu yüzden geçiş **kademeli** ve **geri alınabilir**dir: `HUB_MODE=legacy|hub` feature flag'i; legacy hub kodu P3'te **silinmez**.

### Kapsam

| Katman | Bu SPEC'te |
|:-------|:-----------|
| Hub consumer client (REST + consumer WS relay) | ✅ dahil |
| Boss: field uplink'in consumer'a dönüşmesi (operation/telemetry/event) | ✅ dahil |
| Field: container komut/manevra programatik erişiminin consumer'a dönüşmesi | ✅ dahil |
| Tarayıcı oturum front-door'u (hub `/sessions` + cookie) | ✅ dahil |
| Compose: hub-servis imajı (field+boss) + cutover/rollback | ✅ dahil |
| Legacy hub kodunun silinmesi | ❌ hariç — P3 kapanışı sonrası ayrı temizlik |
| Host-based erişim (A4) | ❌ hariç (tetikte) |
| Gerçek RevPi/container-field imaj testleri | ❌ hariç — P4 |

## 2. Kararlar (kullanıcı onaylı, tarihli)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K1 | **Kademeli geçiş + feature flag** | `HUB_MODE=legacy|hub`; legacy kod korunur, rollback tek env |
| K2 | Compose'a **hub-servis imajı** | Boss stack: field hub'ı; field stack: container hub'ı; web-service consumer |
| K3 | **HubConsumerClient** (web-service) | REST (`/peers`, `/control`, `/sessions`, programatik erişim) + `/ws/consumer`; consumer token env |
| K4 | Tarayıcı front-door hub-servis'te | Hub `POST /sessions` (consumer token + user) → session token; web-service cookie set eder; cookie `tunnel_session`, Path `/peers/` |
| K5 | **Geriye uyumlu yollar** | nginx alias: `/fields/:fid/ui/*` ve `/containers/:cid/ui/*` → hub `/peers/.../services/<default>/*`; SPA base DEĞİŞMEZ |
| K6 | Domain extensions web-service'te kalır | Telemetri/operation/event tipleri + yürütücüler; consumer relay'den beslenir |
| K7 | Wire/paket değişmez | v1/v2 peer frame'leri aynı; yalnız uç nokta hub-servis'e işaret eder |
| K8 | Legacy silme ertelenir | P3'te iki yol yan yana test edilir; silme ayrı iş |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | Boss/field hub sorumlulukları web-service içinde (WS kabul + registry + proxy + session) | `services/web-service/src/infrastructure/field-uplink/field-registry.ts#FieldRegistry`; `services/web-service/src/presentation/routes/field-uplink-ws-routes.ts#fieldUplinkWsRoutes`; `services/web-service/src/presentation/routes/field-session-routes.ts#fieldTunnelRoutes` |
| B2 | Container tier'da aynı desen (`ContainerProxy` + session/tunnel route'ları) | `services/web-service/src/presentation/routes/session-routes.ts#sessionRoutes`; `services/web-service/src/infrastructure/container-proxy/container-proxy.ts#ContainerProxy` |
| B3 | Domain extension'lar web-service'te hazır ama kanal web-service hub'ına bağlı | `services/web-service/src/infrastructure/field-uplink/operation-responder.ts#OperationResponder`; `.../telemetry-query-responder.ts`; `.../field-event-collector.ts` |
| B4 | Compose'larda hub-servis imajı yok | `deployment/**/docker-compose.yml` |
| B5 | Hub-servis'te tarayıcı oturum açma ucu yok | `packages/ws-tunnel-hub/src/infrastructure/inbound/fastify-server.ts#buildHubServer` |

## 4. Mimari

### 4.1 Hedef topoloji (hub modu)

```
Tarayıcı ── nginx (aynı origin: /peers/*, /fields/:fid/ui/* alias) ──► HUB-SERVIS (imaj)
                                                                        │ peer WS /ws/peer
                                                                        ▼
                                                                     PEER (container/field)
Web-service (boss/field) ── consumer token ──► HUB-SERVIS /control + /ws/consumer
        │                                    └─ /sessions (browser için)
        └─ domain: telemetri/operation/event, RBAC, audit, komut yürütme
```

### 4.2 HubConsumerClient (web-service)

- **REST:** `GET /peers`, `GET /peers/:id/services`, `POST /control/:peerId`, `POST /sessions`, programatik `POST /peers/:pid/services/:sid/*` (komut/manevra).
- **WS:** `/ws/consumer` — peer'dan gelen opak mesajlar `{peerId, message}`; domain extension'lara dağıtılır.
- **Dayanıklılık:** reconnect + backoff; kopuklukta komutlar fail-fast (retry yok — mevcut felsefe).

### 4.3 Geçiş modu

| Mod | Davranış |
|:----|:---------|
| `HUB_MODE=legacy` | Mevcut web-service hub yolu aynen; hub-servis compose'da pasif |
| `HUB_MODE=hub` | Peer'lar hub-servis'e bağlanır; web-service consumer; legacy kod uykuda |
| Rollback | Env `legacy` + peer uç noktasını geri al (compose env); veri kaybı yok |

## 5. Purity Kuralları

1. Hub-servis domain bilmez; domain mesajları web-service'te kalır (K6).
2. Web-service consumer client'ı framework-agnostik sınıf; HTTP/WS adapter'ı ayrı.
3. Consumer token'ı peer token'ından ayrıdır; sırlar loglanmaz.
4. Geçiş boyunca v1/v2 wire şekilleri ve SPA base sözleşmesi değişmez (K5/K7).
5. Legacy ve hub modu aynı domain extension'ları paylaşır (tek iş mantığı).
6. Hub-servis'e eklenen oturum uçları hexagonal kurallara tabidir (use-case + port).

## 6. Use Case'ler

### 6.1 UC-1 — HubConsumerClient (REST + WS relay)

**Status:** 🟡 Geliştirmede (2026-10-16)

**Kapsam:**
- dahil: REST istemcisi, consumer WS relay, reconnect/backoff, mesaj dağıtımı.
- hariç: domain yorumu (adapter sadece taşır).

**Akış:**
1. Web-service consumer token'ı ile hub'a bağlanır.
2. `/ws/consumer`'dan `{peerId, message}` alır → dağıtıcıya verir.
3. REST çağrılarıyla keşif/komut/oturum yapar.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | Consumer client, hub REST uçlarını tipli metotlarla sarmalı | AK-1.1 |
| FR-1.2 | `/ws/consumer` bağlantısı kopunca backoff ile yeniden bağlanmalı; mesaj kaybı sessiz olmamalı (log) | AK-1.2 |
| FR-1.3 | Gelen her mesaj `{peerId, message}` dağıtıcıya opak iletilmeli | AK-1.3 |

**Kabul Senaryoları (GWT):**
1. **AK-1.1 — GIVEN** hub ayakta **WHEN** `getPeers()` **THEN** tipli liste döner.
2. **AK-1.2 — GIVEN** consumer WS koptu **WHEN** backoff dolar **THEN** yeniden bağlanır.
3. **AK-1.3 — GIVEN** peer `event` gönderdi **WHEN** consumer alır **THEN** dağıtıcı `(peerId, message)` alır.

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | Tipli REST sarmalayıcı | unit | ⬜ |
| AK-1.2 | Reconnect/backoff | unit | ⬜ |
| AK-1.3 | Opak dağıtım | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-1: `HubConsumerClient` + transport adapter + testler
- [ ] T-2: Consumer WS relay + reconnect + testler
- [ ] T-3: Mesaj dağıtıcı (`IConsumerMessageSink`) + wiring

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Hub kapalı | komutlar fail-fast; reconnect sürer |
| Consumer token yanlış | 401; açılışta fail-fast |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `services/web-service/src/infrastructure/hub-consumer/hub-consumer-client.ts` | YENİ — REST client |
| `services/web-service/src/infrastructure/hub-consumer/consumer-relay.ts` | YENİ — WS relay |
| `services/web-service/src/infrastructure/hub-consumer/index.ts` | YENİ — barrel |

### 6.2 UC-2 — Boss uplink consumer (domain extensions)

**Status:** 🟡 Geliştirmede (2026-10-16)

**Kapsam:**
- dahil: operation-execute/result, telemetry-query/result, event akışının consumer relay üzerinden sürmesi.
- hariç: domain mesaj şemaları (mevcut `tunnel-extensions`).

**Akış:**
1. `OperationRequester`/`TelemetryQueryResponder`/`FieldEventCollector` consumer client'a bağlanır.
2. Gönderim `POST /control/:peerId`, alım `/ws/consumer`.
3. Domain yürütme/DB aynı kalır.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-2.1 | Operation istekleri consumer `/control` üzerinden gönderilmeli | AK-2.1 |
| FR-2.2 | Telemetri/operation/event yanıtları relay'den domain extension'lara ulaşmalı | AK-2.2 |
| FR-2.3 | Boss field listesi/keşfi hub `/peers` ile beslenmeli | AK-2.3 |

**Kabul Senaryoları (GWT):**
1. **AK-2.1 — GIVEN** boss operation ister **WHEN** `/control` **THEN** peer'a `operation-execute` gider.
2. **AK-2.2 — GIVEN** peer `operation-result` **WHEN** relay alır **THEN** requester korelasyonla eşler.
3. **AK-2.3 — GIVEN** iki field bağlı **WHEN** boss listesi **THEN** hub `/peers` içeriği görünür.

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-2.1 | Operation gönderimi | unit | ⬜ |
| AK-2.2 | Sonuç korelasyonu | integration | ⬜ |
| AK-2.3 | Keşif entegrasyonu | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-4: `OperationRequester`'ı consumer'a bağla
- [ ] T-5: `TelemetryQueryResponder`/`FieldEventCollector`'ı relay'e bağla
- [ ] T-6: Boss field listesini hub keşfine bağla

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Peer kopuk | requester timeout/503 (mevcut) |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `services/web-service/src/infrastructure/field-uplink/operation-requester.ts` | Consumer kanalı |
| `services/web-service/src/infrastructure/field-uplink/telemetry-query-responder.ts` | Relay dağıtımı |
| `services/web-service/src/infrastructure/field-uplink/field-event-collector.ts` | Relay dağıtımı |

### 6.3 UC-3 — Field programatik erişim (komut/manevra)

**Status:** 🟡 Geliştirmede (2026-10-16)

**Kapsam:**
- dahil: `TunnelManeuverChannel` ve `field-container-commands`'ın hub REST programatik erişimine geçmesi.
- hariç: tarayıcı UI (UC-4).

**Akış:**
1. Field, container'a komut gönderir → consumer `POST /peers/:pid/services/:sid/*` (consumer token + system user).
2. Hub oturum açar/proxy eder; yanıt aynen döner.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-3.1 | `TunnelManeuverChannel` hub REST üzerinden komut iletmeli | AK-3.1 |
| FR-3.2 | `field-container-commands` aynı yolu kullanmalı; hata eşlemesi korunmalı | AK-3.2 |

**Kabul Senaryoları (GWT):**
1. **AK-3.1 — GIVEN** manevra isteği **WHEN** hub REST **THEN** container upstream yanıtı döner.
2. **AK-3.2 — GIVEN** container erişilemez **WHEN** komut **THEN** `system_unreachable` eşlemesi korunur.

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-3.1 | Manevra kanalı | unit | ⬜ |
| AK-3.2 | Hata eşlemesi | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-7: `TunnelManeuverChannel`'ı hub REST'e geçir
- [ ] T-8: `field-container-commands`'ı hub REST'e geçir

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Hub 503 | `system_unreachable` |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `services/web-service/src/infrastructure/container-session/tunnel-maneuver-channel.ts` | Hub REST |
| `services/web-service/src/presentation/routes/field-container-commands.ts` | Hub REST |

### 6.4 UC-4 — Tarayıcı oturum front-door + yol alias'ı

**Status:** 🟡 Geliştirmede (2026-10-16)

**Kapsam:**
- dahil: hub `POST /sessions`, cookie akışı, nginx alias, SPA base korunması.
- hariç: host-based (A4).

**Akış:**
1. Web-service kullanıcıyı doğrular (RBAC) → hub `POST /sessions` (consumer token + user).
2. Web-service `tunnel_session` cookie'sini `Path=/peers/` ile set eder; iframe `/peers/:pid/services/:sid/` açar.
3. nginx alias'ları eski SPA yollarını hub'a yönlendirir; mevcut build base'leri değişmez.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-4.1 | Hub `POST /sessions` consumer token + user ile oturum açmalı | AK-4.1 |
| FR-4.2 | Erişim rotası geçerli `tunnel_session` cookie'si ile oturumu kabul etmeli | AK-4.2 |
| FR-4.3 | `/fields/:fid/ui/*` ve `/containers/:cid/ui/*` alias'ları hub'a yönlenmeli | AK-4.3 |

**Kabul Senaryoları (GWT):**
1. **AK-4.1 — GIVEN** consumer token + user **WHEN** `POST /sessions` **THEN** session token döner.
2. **AK-4.2 — GIVEN** geçerli cookie **WHEN** `/peers/.../assets/app.js` **THEN** opak proxy 200.
3. **AK-4.3 — GIVEN** eski SPA yolu **WHEN** nginx **THEN** hub peer/service yoluna rewrite edilir.

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-4.1 | Session ucu | unit | ⬜ |
| AK-4.2 | Cookie auth | integration | ⬜ |
| AK-4.3 | Alias rewrite | gözle | ⬜ |

**T Görev Listesi:**
- [ ] T-9: Hub `OpenSession` use-case + `POST /sessions` + testler
- [ ] T-10: Hub erişim rotasına cookie modu + testler
- [ ] T-11: Web-service cookie set + iframe URL
- [ ] T-12: nginx alias config

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Cookie yok/expired | 401; web-service yeni oturum açar |
| Peer stale | 503 |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `packages/ws-tunnel-hub/src/application/open-session.ts` | YENİ — use-case |
| `packages/ws-tunnel-hub/src/infrastructure/inbound/routes/session-routes.ts` | YENİ |
| `packages/ws-tunnel-hub/src/infrastructure/inbound/routes/access-routes.ts` | Cookie modu |
| `services/web-service/src/presentation/routes/hub-session-routes.ts` | YENİ — cookie set |
| `deployment/**/nginx.conf` | Alias |

### 6.5 UC-5 — Deployment, cutover ve rollback

**Status:** 🟡 Geliştirmede (2026-10-16)

**Kapsam:**
- dahil: compose'a hub-servis imajı, env, cutover flag, rollback runbook, parity e2e.
- hariç: gerçek RevPi testi (P4).

**Akış:**
1. Boss/field compose'a hub-servis servisi eklenir (imaj + env + volume).
2. `HUB_MODE=hub` ile cutover; parity testleri (operation/telemetry/event/komut) çalıştırılır.
3. Sorun varsa `HUB_MODE=legacy` + peer uç noktası geri alınır.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-5.1 | Compose'lar hub-servis imajını içermeli; env sözleşmesi dokümante edilmeli | AK-5.1 |
| FR-5.2 | Cutover/rollback tek env ile yapılabilmeli; veri kaybı olmamalı | AK-5.2 |
| FR-5.3 | Hub modunda parity e2e (komut/telemetri/event) geçmeli | AK-5.3 |

**Kabul Senaryoları (GWT):**
1. **AK-5.1 — GIVEN** compose **WHEN** up **THEN** hub-servis sağlıklı ayağa kalkar.
2. **AK-5.2 — GIVEN** `HUB_MODE=hub` **WHEN** rollback **THEN** legacy mod çalışır, veri korunur.
3. **AK-5.3 — GIVEN** hub modu **WHEN** parity e2e **THEN** operation/telemetry/event akar.

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-5.1 | Compose + health | gözle | ⬜ |
| AK-5.2 | Rollback | gözle | ⬜ |
| AK-5.3 | Parity e2e | integration | ⬜ |

**T Görev Listesi:**
- [ ] T-13: Compose'a hub-servis (boss+field) + env örnekleri
- [ ] T-14: `HUB_MODE` flag wiring (legacy/hub)
- [ ] T-15: Parity e2e (operation/telemetry/event/komut)
- [ ] T-16: `AGENTS-DEPLOYMENT.md` cutover/rollback runbook

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Hub imajı eski sürüm | health başarısız → deploy durur |
| Peer uç noktası karışık | iki hub'a bağlanma YASAK (tek uç) |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `deployment/**/docker-compose.yml` | Hub-servis servisi |
| `deployment/**/.env.example` | Hub env |
| `services/web-service/src/config/*` | `HUB_MODE` + consumer config |
| `AGENTS-DEPLOYMENT.md` | Runbook |

### 6.6 Paket Geneli Görevler

- [ ] T-17: Parity/rollback gözle doğrulama raporu (P3 kapanışı)
- [ ] T-18: Legacy silme işini kaydet (ayrı iş — bu SPEC'te YAPILMAZ)

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| `legacy` mod | Mevcut davranış aynen |
| `hub` mod | Peer'lar hub-servis'e; web-service consumer |
| Consumer WS kopuk | backoff; komutlar fail-fast |
| Hub oturumu expired | web-service yeni oturum açar |
| Rollback | Env değişimi; peer uç noktası geri alınır |
| Karışık mod | Desteklenmez — tek uç nokta |

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | Hub modunda operation/telemetry/event/komut parity çalışır | parity e2e |
| SC-2 | v1/v2 tagli istemciler hub-servis'e bağlanmaya devam eder | e2e |
| SC-3 | Cutover/rollback tek env ile, veri kaybısız | gözle runbook |
| SC-4 | Legacy kod korunur; regresyon testleri yeşil | monorepo test seti |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC | Bu doküman (✅ Approved 2026-10-16) |
| 2. JSDoc | T-1/T-9 portları |
| 3. TEST | T-1/T-2/T-9/T-10/T-15 kırmızı testler |
| 4. IMPL | Consumer client + wiring + compose |
| 5. KAPANIŞ | `WS-TUNNEL-HUB-CONSUMER-P3-KAPANIS.md` |

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A1 | Legacy hub kodunun silinmesi | P3 kapanışı sonrası ayrı iş |
| A2 | Host-based erişim (A4) | Tetikte |
| A3 | Çoklu consumer / HA hub | İleri iş |
| A4 | Hub-servis metrik/tracing | İleri iş |
| A5 | Peer uç noktası geçiş otomasyonu | Runbook manuel; otomasyon ileri iş |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. **P4** container-field + RevPi testleri hub imajıyla.
2. **İP-4** isim/marka, LICENSE, ayrı repo.
3. Legacy hub kodunun kaldırılması.

## 12. T Görev Özeti

| Kod | Görev | UC | Dosya |
|:----|:------|:---|:------|
| T-1 | `HubConsumerClient` + transport adapter | UC-1 | `services/web-service/src/infrastructure/hub-consumer/` |
| T-2 | Consumer WS relay + reconnect | UC-1 | `.../consumer-relay.ts` |
| T-3 | Mesaj dağıtıcı + wiring | UC-1 | `.../index.ts` |
| T-4 | `OperationRequester` consumer'a | UC-2 | `.../field-uplink/operation-requester.ts` |
| T-5 | Responder/collector relay'e | UC-2 | `.../field-uplink/*` |
| T-6 | Boss keşfi hub `/peers` | UC-2 | `.../field-uplink/field-registry.ts` (legacy uyum) |
| T-7 | `TunnelManeuverChannel` hub REST | UC-3 | `.../container-session/tunnel-maneuver-channel.ts` |
| T-8 | `field-container-commands` hub REST | UC-3 | `.../presentation/routes/field-container-commands.ts` |
| T-9 | Hub `OpenSession` + `POST /sessions` | UC-4 | `hub-servis/src/application/open-session.ts`, `routes/session-routes.ts` |
| T-10 | Hub cookie auth | UC-4 | `hub-servis/src/infrastructure/inbound/routes/access-routes.ts` |
| T-11 | Web-service cookie set + iframe URL | UC-4 | `services/web-service/src/presentation/routes/hub-session-routes.ts` |
| T-12 | nginx alias | UC-4 | `deployment/**/nginx.conf` |
| T-13 | Compose hub-servis | UC-5 | `deployment/**/docker-compose.yml` |
| T-14 | `HUB_MODE` wiring | UC-5 | `services/web-service/src/config/*` |
| T-15 | Parity e2e | UC-5 | `services/web-service/src/**/*.spec.ts` |
| T-16 | Cutover/rollback runbook | UC-5 | `AGENTS-DEPLOYMENT.md` |
| T-17 | Gözle doğrulama raporu | Genel | P3 KAPANIŞ |
| T-18 | Legacy silme kaydı | Genel | İleri iş |

**review_date:** 2026-10-16 — ilk sürüm (kademeli geçiş + feature flag); ✅ onaylandı, geliştirme sürüyor.
