# Web-Service Hub / Agent / Tunnel Yüzeyi — Envanter ve Sadeleştirme Raporu

> **Amaç:** `services/web-service` içinde hub, agent ve tunnel ile ilgili tüm parçaların
> envanteri; her parçanın işlevi, bağımlılıkları, olmazsa ne kaybedileceği ve
> sadeleştirme fırsatları (Paket A / Paket B).
> **Durum:** 📋 Analiz — uygulama bekliyor (developer kararı).
> **Kod referansları** `path/file.ts#sembol` çapasıyla verilir; satır numarası kullanılmaz.

---

## 1. Bağlam — web-service'in tüneldeki konumu

KONTEYNER-AGENT-KAYIT ve BOSS-FIELD-UPLINK-ARINDIRMA sonrası web-service **hiçbir
tier'da tunnel peer'ı değildir**. İki rolü vardır:

- **Field/boss tier → hub'ın REST tüketicisi:** konteyner servislerine
  `HubConsumerClient.access()` (opak relay) ile erişir; kendi API'sini frontend'e sunar.
- **Container tier → agent'ın ardındaki saf HTTP API:** yalnızca agent'ın imzaladığı
  `container_session` JWT'sini stateless doğrular.

Tüm yüzey tek bir çekirdeğe inmiştir: **`HubConsumerClient.access`**. Aşağıdaki
envanter bu çekirdeğin etrafındaki parçaları durum damgasıyla listeler.

---

## 2. Envanter

### 2.1 Hub tüketici çekirdeği

| Bileşen | İş | Bağımlılık | Tüketiciler | Durum |
|---|---|---|---|---|
| `infrastructure/hub-consumer/hub-consumer-client.ts#HubConsumerClient` | Hub REST istemcisi: `peers()` (keşif), `access()` (opak relay: `/peers/:pid/services/:sid/*`), `openSession()`, `sendControl()`, `servicesOf()`, `createPeer()/revokePeer()` | `fetch`; `hubConsumerConfig` | Aşağıdaki tüm yol | **Kısmen ölü:** `sendControl`, `servicesOf`, `createPeer`, `revokePeer` prod'da tüketilmiyor (yalnız client testi) |
| `config/default.ts#hubConsumerConfig` | `HUB_CONSUMER_URL/TOKEN` — container hariç tier'larda eksikse fail-fast | ConfigLoader | `container.ts` → `hubConsumerClient` | Aktif |

### 2.2 Field tier — konteyner veri yolu

| Bileşen | İş | Bağımlılık | Tüketiciler | Durum |
|---|---|---|---|---|
| `container-session/hub-container-view.ts#HubContainerView` | `IContainerProxy` uyarlaması: presence poll (15 sn → `connectionStatus`/`lastSeenAt` + geçiş olayı), `latestQuery` → `latest-per-name` (TTL 2 sn), `historical` → `downsampled`, `latestTelemetry` (peek, fail-safe boş) | `HubConsumerClient`, `HubTtlCache`, `hub.containerServiceId`, `tunnel.latestCacheTtlMs` | `containerProxy` DI kaydı; `field-routes` | **Aktif — sözleşme eksiği var (§3)** |
| `container-session/hub-ttl-cache.ts#HubTtlCache` | 2 sn TTL; TTL'siz peek son değeri döner | — | HubContainerView | Aktif |
| `container-proxy/container-connection-telemetry-publisher.ts` | Bağlantı durum geçişi → sentetik telemetri → `mq` (R-07/FL-07 sinyali) | BullMQ | HubContainerView observer'ı | Aktif |
| `presentation/routes/field-routes.ts` | Dış sözleşme: `/containers`, `/telemetry/latest` (`apps/field`), `/telemetry/downsampled` (**🔴 trend**), `/telemetry/:containerId` (`apps/field/containersApi` — çalışıyor) | `containerProxy` | `demoApi` (demo-field), `fieldApi`/`containersApi` (field) | Aktif |

### 2.3 Komut / manevra / operasyon yolu

| Bileşen | İş | Bağımlılık | Tüketici | Durum |
|---|---|---|---|---|
| `container-session/hub-maneuver-channel.ts#HubManeuverChannel` | Uzak manevra adımı → access POST `/api/maneuvers/:name/execute` (konteynerin kendi ucu) | `HubConsumerClient`, `hub.containerServiceId` | `OperationExecutor.remoteChannel` (field) | Aktif |
| `presentation/routes/field-container-commands.ts` | Field→konteyner cihaz komut proxy'si (iç token + access) | `HubConsumerClient`, `hubConsumerServiceId` | field API | Aktif |
| `field-uplink/operation-requester.ts#OperationRequester` (boss) | boss→field operasyon: access POST `/api/operations/:name/execute`, terminal eşleme (UC-4) | `HubConsumerClient`, `hub.fieldServiceId` | `operation-boss-routes` | Aktif |

### 2.4 Olay yolu

| Bileşen | İş | Bağımlılık | Tüketici | Durum |
|---|---|---|---|---|
| `presentation/routes/event-routes.ts#eventRoutes` (field) | `GET /api/events?after&limit` — whitelist'li `log_events` deltası | `postgres`, `site.fieldId` | Boss poller | Aktif |
| `field-uplink/field-event-collector.ts#FieldEventCollector` (boss) | Poller: `peers()` → field peer'ları, access GET `/api/events`, cursor + dedupe (`field_events`) | `HubConsumerClient`, `hub.fieldServiceId`, `fieldEvents.demoSeed` | `notification-routes` | Aktif |

### 2.5 Oturum katmanı

| Bileşen | İş | Bağımlılık | Durum |
|---|---|---|---|
| `presentation/routes/hub-session-routes.ts` | Tarayıcı adına hub oturumu + `tunnel_session` cookie (Path=/peers) | `HubConsumerClient.openSession`, `hub.containerServiceId` | Aktif |
| `container-session/stateless-session-authenticator.ts` (container tier) | Agent imzalı `container_session` JWT'sini yerel kayıtsız doğrular; rbac + telemetry WS kullanır | `ITokenSigner` → `JoseTokenSigner(jwtSecret)`; `sessionCookieValue` | Aktif |
| `auth/jose-token-signer.ts#JoseTokenSigner` | HS256 `ITokenSigner` (`container-session`/`field-session` etiketli) | jose | Aktif |
| `container-session/session-user-map.ts` | `TunnelUser`/`ClientSessionUser` ↔ `User` sınır eşlemesi | shared-types | Aktif |
| `middleware/rbac.ts#createRbacHook` | `sessionAuthenticator` hook'u (cookie → user) | `containerSessionAuthenticator` | Aktif |

### 2.6 Statü ve kalıntılar

| Parça | Durum |
|---|---|
| `routes/status-route.ts` — sabit `{connected:false,state:"offline"}`; `TunnelConnectionStatus` tipini kullanıyor | Aktif (minimal) |
| `presentation/server.ts` import'ları: `SessionGateway`, `TunnelProxy`, `PathAllowlist` — kullanılmıyor | **Ölü** |
| `container-session/index.ts` yorumu (HubSessionStore/SessionGateway/TunnelProxy @gd-monorepo/ws-tunnel'da) | Bayat yorum |
| `SYSTEM_USER_HEADERS` sabiti — 4 kopya (`hub-container-view.ts`, `hub-maneuver-channel.ts`, `operation-requester.ts`, `field-event-collector.ts`) | Paket B2 ile tekilleştirildi |
| Config: `hub.consumerUrl/Token`, `hub.containerServiceId`, `hub.fieldServiceId`, `tunnel.latestCacheTtlMs`, `fieldEvents.demoSeed` | Aktif |

---

## 3. 🔴 Trend sorunu — zincir ve kök neden

```
DemoTrendsSection (SPA, 2 sn refresh)
  └─ demoApi.downsampled(fieldId, { containerIds:["container-1"],
                                    names:["BSC SOC","Rack Max Pack Temp R1..R8"] })
       └─ GET /api/fields/:id/telemetry/downsampled          [field-routes.ts]
            └─ deps.containerProxy.allHistorical(containerIds, params)
                 └─ containerProxy = HubContainerView
                      → allHistorical UYGULANMAMIŞ → TypeError → HTTP 500
```

- **Kanıt (web-service log):** `deps.containerProxy.allHistorical is not a function.
  (In 'deps.containerProxy.allHistorical(containerIds, params)')`.
- `IContainerProxy` (`packages/platform/container-access/src/container-proxy/interface.ts#IContainerProxy`)
  `allHistorical`'ı **sözleşme** olarak istiyor; `HubContainerView` yalnız per-container
  `historical`'ı uygulamış.
- Arayüzün `sendControl`/`sendBinary` metotları da `HubContainerView`'ta yok ancak
  **çağrıcısı yok** — runtime'da patlamıyorlar; yalnız tip seviyesinde boşluk.
- Çalışan kardeş yollar sorunun lokal olduğunu kanıtlıyor: `/telemetry/:containerId`
  (historical, `apps/field` kullanıyor) ve `/containers` (latest + TTL).

---

## 4. Sadeleştirme paketleri

### 4.1 Paket A — bug + ölü yüzey temizliği

| Kod | İş | Dosyalar | Test | Kazanım | Risk |
|---|---|---|---|---|---|
| **A1** | `HubContainerView#allHistorical`: konteyner başına `historical`, `Promise.allSettled` → `Record<string, TelemetryData[]>` | `infrastructure/container-session/hub-container-view.ts`; `hub-container-view.test.ts` | Toplama + kısmi hata | Trend grafikleri düzelir; `IContainerProxy` sözleşmesi tamamlanır | Yok — yeni uç yok, ws-tunnel 0 satır |
| **A2** | `HubConsumerClient` ölü metotları sil: `sendControl`, `servicesOf`, `createPeer`, `revokePeer` | `infrastructure/hub-consumer/hub-consumer-client.ts`; `hub-consumer-client.test.ts` | İlgili test blokları silinir | İstemci tam kullanılan yüzeye iner (`peers/access/openSession`) | Yok — prod tüketicisi yok |
| **A3** | Ölü import/yorum: `SessionGateway`, `TunnelProxy`, `PathAllowlist` (server.ts) + bayat `container-session/index.ts` yorumu | `presentation/server.ts`; `container-session/index.ts` | — | Eski boss-hub modelinin gölgesi kalkar | Yok |
| **A4** | `status-route`'un `TunnelConnectionStatus` tipini lokal literal tipe çevir | `presentation/routes/status-route.ts` (+test) | Şekil sabit testi | ws-tunnel tip bağımlılığı azalır | Yok (yanıt şekli aynı) |
| **A5** | TS uyarıları: `HubAccessRequest.body` → `string \| null` (global `BodyInit` yok); `peers()`/`access()` async/await'e çevrildi (TS80006) | `infrastructure/hub-consumer/hub-consumer-client.ts` | Client testleri | Tip güvenliği + lint gürültüsü azalır | Yok |

### 4.2 Paket B — incelik (opsiyonel)

| Kod | İş | Dosyalar | Kazanım | Risk |
|---|---|---|---|---|
| **B1** | `field-routes#/telemetry/:containerId` → `allHistorical([containerId])` üzerinden (A1 sonrası) — iki kod yolu tek yola iner | `presentation/routes/field-routes.ts` (+test) | ~10 satır; tek doğruluk noktası | Düşük — dış API şekli aynı |
| **B2** | `SYSTEM_USER_HEADERS` tekilleştirme: ortak sabit modülü, 4 kopya import'a döner | `infrastructure/hub-consumer/system-headers.ts` (YENİ) + 4 dosya | Drift biter | Yok |

---

## 5. Dokunulmayacaklar ve nedeni

| Parça | Neden |
|---|---|
| `HubTtlCache` | Kaldırılırsa her `/containers` çağrısı konteyner başına HTTP atar — daha önce konteyner web-service'i kilitleyen sorgu fırtınası geri döner |
| `ContainerConnectionTelemetryPublisher` | FL-07 iletişim-kaybı otomasyonunun tek sinyal kaynağı |
| `hubSessionRoutes` + `StatelessSessionAuthenticator` | Tarayıcı iframe erişimi ve agent-cookie doğrulaması; alternatifler fail-open (güvenlik geri adımı) |
| `HubManeuverChannel`, `field-container-commands`, `OperationRequester`, `FieldEventCollector` | İş akışlarının kendisi — uzak manevra, komut, boss operasyon/olay |
| `field-routes` dış şekilleri | Frontend sözleşmesi (yalnız B1'deki iç uygulama sadeleşir) |

---

## 6. Doğrulama planı (uygulandığında)

1. `nx run web-service:test` — unit/component.
2. `bun run test` — tam workspace (305 dosya).
3. `bun run test:demo-integration` — **108/108**.
4. Canlı: `GET /api/fields/:id/telemetry/downsampled?containerIds=container-1&names=BSC%20SOC,Rack%20Max%20Pack%20Temp%20R1&points=5`
   → satırlar + `tags.canonical` döner; iki istasyonun SOC/temp grafikleri çizer.
5. `packages/ws-tunnel*` diff'i **boş** kalmalı.

---

## 7. Açık kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A-1 | Paket A uygulansın mı? | Bekliyor |
| A-2 | Paket B aynı işte mi, sonra mı? | Bekliyor |
| A-3 | `IContainerProxy`'nin hub'da anlamsız WS metotlarının (`registerContainer`, `sendControl`, `sendBinary`, `pushConfigUpdate`) ayrı bir "hub proxy" arayüzüne ayrılması | İleri iş (paket değişikliği; bu raporda kapsam dışı) |
| A-4 | Commit/push | Developer kararı |

---

## 8. Uygulama Notu (2026-10-23)

Paket A (A1–A5) ve Paket B (B1–B2) uygulandı: trend bug'ı (`allHistorical`) giderildi,
ölü istemci yüzeyi/importlar temizlendi, TS uyarıları düzeltildi, `SYSTEM_USER_HEADERS`
tek kaynağa indirildi. Commit/push developer kararına bırakıldı.
