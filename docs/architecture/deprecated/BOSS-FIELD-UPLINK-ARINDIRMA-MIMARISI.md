---
status: active
space: architecture
tags: [mimari, boss, field-uplink, arindirma, web-service, spec]
review_date: 2026-10-22
---

# Boss / Field-Uplink Eski Model Arındırması — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/5 — SPEC (AGENTS.md "Geliştirme İş Akışı").
> **Durum:** ✅ Approved (2026-10-22) — uygulandı; doğrulama KAPANIŞ'ta.
> **Commit/push:** Bu paket kapsamında **YAPILMAZ** — değişiklikler çalışma ağacında
> bırakılır; push kararı developer'a aittir.
> **İlişkili:** [KONTEYNER-AGENT-KAYIT-MIMARISI.md](./KONTEYNER-AGENT-KAYIT-MIMARISI.md),
> [WS-TUNNEL-AGENT-MIMARISI.md](./WS-TUNNEL-AGENT-MIMARISI.md),
> [WS-TUNNEL-DOMAIN-KALINTI-ARINDIRMA-MIMARISI.md](./WS-TUNNEL-DOMAIN-KALINTI-ARINDIRMA-MIMARISI.md),
> [AGENTS-DEPLOYMENT.md](../../AGENTS-DEPLOYMENT.md).

## 1. Amaç ve Bağlam

**Yeni topoloji (gerçek):** Konteyner bilgisayarları uygulamalarını `ws-tunnel-agent` ile
field hub'ına peer olarak kaydeder; field bilgisayarı hub + field API + SPA ile internete
açıktır. Field, konteyner verisini hub tüketicisi olarak çeker (UC-4/UC-5 + HubContainerView).
**Boss** da ileride field'dan veriyi aynı yolla çekecek: field'ın hub'ına tüketici olarak
bağlanıp `field-api` servisini kullanacak (ayrı SPEC — kapsam dışı).

**Sorun:** web-service hâlâ **eski boss-cloud modelinin** tesisatını taşıyor:
field→boss outbound uplink (peer connector + oturum server'ı + tunnel client + telemetry
push) ve boss tier'ın eski saha/piyasa/WireGuard yönetimi. Bu parçalar yeni modelde
kullanılmıyor; boss app kapsamı da henüz tanımlı olmadığından test edilemezler.

**Çözüm:** İki grup legacy kaldırılır — (A) field→boss uplink kompleksi, (B) boss tier'ın
eski yönetim parçaları. Yeni modelin boss veri yolu (hub access operasyon + olay poller +
cookie front-door) korunur.

**Kapsam tablosu:**

| Katman | Dahil | Hariç |
|:-------|:------|:------|
| `services/web-service` | A + B gruplarının silinmesi, `/api/status` sadeleştirme, config temizliği | Yeni boss özellikleri, `field-api` duyurusu |
| `packages/ws-tunnel*` | **0 satır** (K0) | — |
| `deployment/v2/dev/field` | `FIELD_UPLINK_*` env temizliği | Hub/agent topolojisi (değişmez) |
| Dış API'ler | — (field/container şekilleri sabit) | Superadmin uygulaması (kırılır — kabul) |

## 2. Kararlar (ZORUNLU — kullanıcı onaylı, 2026-10-22)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K0 | **`packages/ws-tunnel*` değişmez — 0 satır** | Tüm iş web-service + deployment + doküman |
| K1 | **A grubu (field→boss uplink) tamamen silinir:** `FIELD_UPLINK_*`, `uplinkConnector`, `uplinkSessionStore/Server`, `uplinkTunnelClient`, `telemetrySnapshotPusher`, `tunnel-extensions/` modülü, `fieldTunnelPathAllowlist`, `resolveTelemetryIntervalMs`, `GD_PMS_TUNNEL_EVENT_CODES`, rbac `field_session` dalı | UC-1 |
| K2 | **B grubu (eski boss yönetimi) silinir:** `fieldPoller` + `adminRoutes`, `marketSeries` + `marketRoutes`, WireGuard kompleksi, `HubFieldRegistry` | UC-2 |
| K3 | **Yeni boss modeli KALIR:** `operationRequester` + `operationBossRoutes`, `fieldEventCollector` + `notificationRoutes`, `hubSessionRoutes`, `hubConsumerClient/access` | UC-3 |
| K4 | `/api/status` **sabit `offline`** döner; `TunnelConnector` bağımlılığı tamamen kopar (endpoint container-web için korunur) | UC-3 |
| K5 | Superadmin uygulamasının fields/wireguard/market uçlarının kırılması **kabul** (boss app yeniden yazılacak) | UC-2 |
| K6 | Field/container dış API şekilleri ve hub erişimi DEĞİŞMEZ | UC-3 |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | Field→boss uplink (peer connector + oturum server + tunnel client + push) eski boss-cloud modelinden kalma; demo'da kapalı | `config/container.ts#uplinkConnector`, `#uplinkSessionServer`, `#uplinkTunnelClient`, `#telemetrySnapshotPusher` |
| B2 | Telemetri push mesaj tipleri yalnız uplink'i besliyor; başka tüketicisi yok | `infrastructure/tunnel-extensions/messages.ts#TelemetryMessage`; `field-uplink/field-uplink-snapshot-source.ts` |
| B3 | Boss tier eski saha kaydı (admin_fields CRUD + polling), EPİAŞ piyasa ve WireGuard yönetimi taşıyor | `presentation/routes/admin-routes.ts#adminRoutes`; `#marketRoutes`; `#wireGuardRoutes`; `infrastructure/field-poller.ts#FieldPoller` |
| B4 | `HubFieldRegistry` yalnız adminRoutes tarafından kullanılıyor | `infrastructure/hub-consumer/hub-field-registry.ts#HubFieldRegistry` |
| B5 | Boss'un yeni veri yolu zaten hub-tabanlı | `field-uplink/operation-requester.ts#OperationRequester` (HTTP access), `field-uplink/field-event-collector.ts#FieldEventCollector` (poller) |
| B6 | `status-route` hâlâ hiçbir tier'da kayıtlı olmayan `TunnelConnector` tipine bağlı (son KAPANIŞ S-2 kalıntısı) | `presentation/routes/status-route.ts#makeStatusRoute` |

## 4. Mimari

### 4.1 Hedef topoloji (değişmez)

```
KONTEYNER PC (x2)                      FIELD PC (hub sahibi, internete acik)          BOSS (gelecek)
container-agent ──► hub-servis ◄──── field web-service (consumer)                 boss web-service
                    (peer kaydi)      field SPA                                        (consumer)
                                          │
                                          └── konteyner verisi: hub access (UC-4/UC-5)
                                              boss verisi (gelecek): field-api servisi — ayri SPEC
```

### 4.2 Silinecekler

**A. Field→boss uplink kompleksi**

| Bileşen | Dosya |
|:--------|:------|
| Uplink connector + oturum + tunnel client + telemetry push | `config/container.ts#uplinkConnector`, `#uplinkSessionStore`, `#uplinkSessionServer`, `#uplinkTunnelClient`, `#telemetrySnapshotPusher` |
| Snapshot kaynağı | `infrastructure/field-uplink/field-uplink-snapshot-source.ts` |
| Domain telemetri push modülü | `infrastructure/tunnel-extensions/` (tamamı) |
| Config fonksiyonları/sabitler | `config/default.ts#fieldUplinkConfig`, `#fieldTunnelPathAllowlist`, `#resolveTelemetryIntervalMs`, `#GD_PMS_TUNNEL_EVENT_CODES`, `#serviceAnnouncement` |
| Config tanımları | `fieldUplinkEnabled/WsUrl/Token`, `uplinkApiUpstream`, `uplinkStaticUpstream`, `fieldTunnelAllowedPrefixes`, `tunnelApiUpstream`, `tunnelStaticUpstream` |
| rbac field dalı | `presentation/server.ts#sessionRbacOptions` (`field_session`) |
| Lifecycle | `index.ts` uplink start/stop blokları |

**B. Boss tier eski parçaları**

| Bileşen | Dosya |
|:--------|:------|
| Saha kaydı + polling | `infrastructure/field-poller.ts`; `presentation/routes/admin-routes.ts` (+test) |
| EPİAŞ piyasa | `infrastructure/market/market-series.ts` (+test); `presentation/routes/market-routes.ts` (+test) |
| WireGuard | `infrastructure/wireguard/*` (3 dosya + 2 test); `presentation/routes/wireguard-routes.ts` (+test); `wireGuardConfig` + `wg*` config tanımları |
| Hub saha registry | `infrastructure/hub-consumer/hub-field-registry.ts` (+test) |
| server/index wiring | `presentation/server.ts` deps + route blokları; `index.ts` lifecycle |

### 4.3 Kalacaklar (yeni model)

- `operationRequester` + `operationBossRoutes`; `fieldEventCollector` + `notificationRoutes`
- `hubSessionRoutes`, `hubConsumerClient`, `hubConsumerServiceId`
- Field tier: `HubContainerView` + `HubTtlCache` + `HubManeuverChannel`
- Container tier: `containerSessionAuthenticator` (stateless doğrulama)

### 4.4 `/api/status`

`makeStatusRoute()` konnektörsüz, her zaman `{ connected:false, state:"offline" }` döner.
Endpoint korunur (container-web `useFieldConnection` kullanıyor); `TunnelConnector` tipi
web-service'ten tamamen çıkar.

## 5. Purity Kuralları (ZORUNLU)

1. `packages/ws-tunnel*` içine **0 satır** değişiklik (K0).
2. Web-service'te field→boss uplink/peer/session-server/tunnel-client kodu **kalmaz**.
3. Web-service'te boss'un eski saha/piyasa/WireGuard yönetimi **kalmaz**.
4. Silinen config anahtarları `ALL_CONFIG_DEFINITIONS`'dan da çıkarılır; ölü anahtar bırakılmaz.
5. Field/container dış API yanıt şekilleri ve hub erişim yolu değişmez.

## 6. Use Case'ler

### 6.1 UC-1 — Field→boss uplink kompleksinin kaldırılması

**Status:** 🟢 Doğrulanmış

**Kapsam:**
- dahil: A grubu DI kayıtları, lifecycle, rbac dalı, tunnel-extensions modülü, config/sabitler
- hariç: hub/agent topolojisi, field tüketici yolu

**Akış:**
1. `fieldUplinkConfig` + `FIELD_UPLINK_*` tanımları kaldırılır.
2. `uplinkConnector`, `uplinkSessionStore/Server`, `uplinkTunnelClient`, `telemetrySnapshotPusher` kayıtları + lifecycle silinir.
3. `tunnel-extensions/` + `field-uplink-snapshot-source.ts` silinir.
4. rbac'ten `field_session` dalı ve ilgili importlar kaldırılır.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | `FIELD_UPLINK_*` config/kayıt/lifecycle KALMAMALI | AK-1.1 |
| FR-1.2 | `uplinkSessionServer/Store`, `uplinkTunnelClient` ve rbac `field_session` dalı KALMAMALI | AK-1.2 |
| FR-1.3 | Telemetri push + `tunnel-extensions` modülü KALMAMALI | AK-1.3 |
| FR-1.4 | `fieldTunnelPathAllowlist`, `resolveTelemetryIntervalMs`, `GD_PMS_TUNNEL_EVENT_CODES`, `serviceAnnouncement` KALMAMALI | AK-1.4 |

**Kabul Senaryoları (GWT):**
1. **AK-1.1 — GIVEN** kod tabanı **WHEN** `FIELD_UPLINK` aranır **THEN** yalnız deployment geçmişi notu kalır (kod/config yok)
2. **AK-1.2 — GIVEN** field tier açılışı **WHEN** DI incelenir **THEN** uplink oturum/tunnel kayıtları yoktur; rbac yalnız container authenticator kullanır
3. **AK-1.3 — GIVEN** kod tabanı **WHEN** `tunnel-extensions` aranır **THEN** modül ve push timer'ı yoktur
4. **AK-1.4 — GIVEN** config **WHEN** tanımlar listelenir **THEN** uplink/allowlist/telemetry-interval anahtarları yoktur

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | Uplink kaydı yok | grep + DI | ⬜ |
| AK-1.2 | Oturum/tunnel yok | unit + DI | ⬜ |
| AK-1.3 | Push modülü yok | dosya/grep | ⬜ |
| AK-1.4 | Config temiz | `default.test.ts` | ⬜ |

**T Görev Listesi:**
- [ ] T-1: A grubu DI/lifecycle/rbac temizliği + dosya silmeleri
- [ ] T-2: A grubu config/sabit temizliği (`default.ts` + `definitions.ts`)

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| `.env`'de eski `FIELD_UPLINK_*` kalsa | Yüklenmez (tanım yok); zararsız |
| Boss cloud'a bağlanma ihtiyacı doğarsa | Yeni modelde boss, field hub'ına tüketici olur (ayrı SPEC) |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `services/web-service/src/config/container.ts` | Uplink kayıtları silinir |
| `services/web-service/src/index.ts` | Uplink lifecycle silinir |
| `services/web-service/src/presentation/server.ts` | `field_session` dalı silinir |
| `services/web-service/src/config/default.ts` | Uplink/allowlist/telemetry sabitleri silinir |
| `services/web-service/src/infrastructure/tunnel-extensions/` | SİLİNİR |
| `services/web-service/src/infrastructure/field-uplink/field-uplink-snapshot-source.ts` | SİLİNİR |

### 6.2 UC-2 — Boss tier eski yönetim parçalarının kaldırılması

**Status:** 🟢 Doğrulanmış

**Kapsam:**
- dahil: fieldPoller/adminRoutes, marketSeries/marketRoutes, WireGuard kompleksi, HubFieldRegistry
- hariç: yeni boss veri yolu (UC-3)

**Akış:**
1. `adminRoutes` + `FieldPoller` + `HubFieldRegistry` silinir.
2. `marketRoutes` + `MarketSeries` silinir.
3. WireGuard bağlantısı/routes/config silinir.
4. `index.ts` ve `server.ts` wiring temizlenir.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-2.1 | `fieldPoller` + `adminRoutes` KALMAMALI | AK-2.1 |
| FR-2.2 | `marketSeries` + `marketRoutes` KALMAMALI | AK-2.2 |
| FR-2.3 | WireGuard kompleksi (kod/routes/config) KALMAMALI | AK-2.3 |
| FR-2.4 | `HubFieldRegistry` KALMAMALI | AK-2.4 |

**Kabul Senaryoları (GWT):**
1. **AK-2.1 — GIVEN** server route kayıtları **WHEN** incelenir **THEN** `/api/admin/fields` yoktur
2. **AK-2.2 — GIVEN** server route kayıtları **WHEN** incelenir **THEN** `/api/market` yoktur
3. **AK-2.3 — GIVEN** kod tabanı **WHEN** `wireguard` aranır **THEN** web-service'te iz yoktur
4. **AK-2.4 — GIVEN** hub-consumer modülü **WHEN** incelenir **THEN** `HubFieldRegistry` yoktur

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-2.1 | Admin uçları yok | grep + route testleri silinir | ⬜ |
| AK-2.2 | Market uçları yok | grep + test silinir | ⬜ |
| AK-2.3 | WireGuard yok | grep + testler silinir | ⬜ |
| AK-2.4 | Registry yok | grep | ⬜ |

**T Görev Listesi:**
- [ ] T-3: B grubu dosya + test silmeleri
- [ ] T-4: server/index wiring + config temizliği

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| superadmin app bu uçları çağırır | 404 — kabul (boss app yeniden yazılacak, K5) |
| Boss ileride saha keşfi ister | Hub peer listesi (`/peers`) + yeni boss SPEC'i |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `services/web-service/src/infrastructure/field-poller.ts` | SİLİNİR |
| `services/web-service/src/presentation/routes/admin-routes.ts` (+test) | SİLİNİR |
| `services/web-service/src/infrastructure/market/` (+test) | SİLİNİR |
| `services/web-service/src/presentation/routes/market-routes.ts` (+test) | SİLİNİR |
| `services/web-service/src/infrastructure/wireguard/` (+testler) | SİLİNİR |
| `services/web-service/src/presentation/routes/wireguard-routes.ts` (+test) | SİLİNİR |
| `services/web-service/src/infrastructure/hub-consumer/hub-field-registry.ts` (+test) | SİLİNİR |

### 6.3 UC-3 — Yeni model + doğrulama

**Status:** 🟢 Doğrulanmış

**Kapsam:**
- dahil: korunan boss veri yolu, statü sadeleştirme, dış API/hub erişimi regresyonu
- hariç: yeni özellik

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-3.1 | `operationRequester`/`fieldEventCollector`/`hubSessionRoutes` KALMALI ve çalışmalı | AK-3.1 |
| FR-3.2 | Field/container dış API + hub erişimi DEĞİŞMEMELİ (108/108) | AK-3.2 |
| FR-3.3 | `/api/status` sabit `offline` dönmeli | AK-3.3 |

**Kabul Senaryoları (GWT):**
1. **AK-3.1 — GIVEN** boss tier testleri **WHEN** koşulur **THEN** operation/event yolları yeşildir
2. **AK-3.2 — GIVEN** hub stack **WHEN** `test:demo-integration` **THEN** 108/108
3. **AK-3.3 — GIVEN** `/api/status` **WHEN** çağrılır **THEN** `{connected:false,state:"offline"}`

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-3.1 | Yeni boss yolu çalışır | unit | ⬜ |
| AK-3.2 | 108/108 | `test:demo-integration` | ⬜ |
| AK-3.3 | Statü sabit | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-5: `/api/status` sadeleştirme + test güncellemesi
- [ ] T-6: Field `.env.example` + compose `FIELD_UPLINK_*` temizliği; doküman senkronu
- [ ] T-7: Tam test + canlı doğrulama

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Container-web `/api/status` bekler | `offline` (davranış aynı, kaynak yok) |
| Boss app henüz yok | Endpoint'ler korunur; istemci geldiğinde kullanılır |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `services/web-service/src/presentation/routes/status-route.ts` (+test) | Sabit offline |
| `deployment/v2/dev/field/docker-compose.yml`, `.env.example` | `FIELD_UPLINK_*` silinir |
| `docs/process/DEMO-STACK-ISLETIM-RUNBOOK.md`, `AGENTS-DEPLOYMENT.md` | Uplink/boss notları güncellenir |

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| Eski env anahtarları mevcut | Tanım yok → yüklenmez (zararsız) |
| Superadmin eski uçları çağırır | 404 (kabul) |
| `/api/status` | Her zaman offline |
| Field/container hub erişimi | Değişmez |
| Boss veri yolu | operation HTTP + event poller (hub access) |

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | `packages/ws-tunnel*` altında 0 satır değişiklik | `git diff` |
| SC-2 | A + B gruplarında kod/config kalıntısı yok | grep |
| SC-3 | Yeni boss veri yolu testleri yeşil | `nx run web-service:test` |
| SC-4 | Tam test seti yeşil | `bun run test` |
| SC-5 | Demo entegrasyon 108/108 | `bun run test:demo-integration` |
| SC-6 | `bun run spec:check` temiz | komut |
| SC-7 | Net silme ≥ 1500 satır | `git diff --stat` |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC | Bu doküman |
| 2. JSDoc | Kalan sınıfların sözleşmeleri (değişiklik yok) + silinenlerin referans temizliği |
| 3. TEST | Silinen testler + `status-route`/`default.test` güncellemeleri |
| 4. IMPL | T-1..T-7 |
| 5. KAPANIŞ | `BOSS-FIELD-UPLINK-ARINDIRMA-KAPANIS.md`; T-7 |

> **Commit/push bu pakette YOK** — değişiklikler çalışma ağacında bırakılır.

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A-1 | Boss→field hub erişimi (`field-api` duyurusu) | Ayrı SPEC — boss app kapsamı netleşince |
| A-2 | Superadmin uygulaması (eski boss UI) | Bu SPEC dışı; uçlar silindiği için kırılır (K5) |
| A-3 | `/api/status` endpoint'inin kalıcılığı | Container-web kullanıyor; boss UI yenilendiğinde gözden geçirilir |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. Boss'un field servislerine hub üzerinden erişimi (`field-api` duyurusu) — ayrı SPEC.
2. Yeni boss uygulaması (kapsam tanımı sonrası).

## 12. T Görev Özeti

| # | Görev | UC |
|:--|:------|:---|
| T-1 | A grubu DI/lifecycle/rbac + dosya silmeleri | UC-1 |
| T-2 | A grubu config/sabit temizliği | UC-1 |
| T-3 | B grubu dosya + test silmeleri | UC-2 |
| T-4 | server/index wiring + config temizliği | UC-2 |
| T-5 | `/api/status` sadeleştirme | UC-3 |
| T-6 | Deployment env + doküman senkronu | UC-3 |
| T-7 | Tam test + canlı doğrulama | UC-3 |
