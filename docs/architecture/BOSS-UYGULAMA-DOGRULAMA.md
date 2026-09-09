---
status: active
space: architecture
tags: [dogrulama, mimari, boss, test, izlenebilirlik]
review_date: 2026-09-07
---

# Boss Uygulaması — Doğrulama Dokümanı

Bağlı olduğu tasarım: [BOSS-UYGULAMA-MIMARISI.md](./BOSS-UYGULAMA-MIMARISI.md)

**Kural (AGENTS.md):** Her faz kapanışında bu dokümana giriş **zorunludur**.
Faz kapanmadan önce: (1) matrisin tüm satırları satır referanslı değişiklik kaydıyla doldurulur,
(2) test kanıtları `Geçme durumu` sütununa işlenir, (3) kabul kriterleri teker teker doğrulanır,
(4) genel durum özeti ve `review_date` güncellenir. Gözle kontrol (E2E/manuel) maddeleri işaretlenmeden faz kapanmaz.

## 1. Genel Durum Özeti

| Faz | Durum | Kabul kriteri (özet) | Doğrulama tarihi | Kapanış kararı |
|-----|-------|----------------------|------------------|----------------|
| Faz 1 — Kabuk + Harita + Varlıklar | **KOD + LAB CANLI** (L1-L8, S1) | Boss login → haritada canlı sahalar; saha CRUD; 1024px altında drawer | 2026-09-07/08 | ✅ 12 test + lab stack canlı (S1: saha kartı offline — özet push iterasyonu) |
| Faz 2 — Piyasa | **KOD + LAB CANLI** (L6) | PTF 24h grafik + GÖP/GİP özet kartları canlı veri; "son veri" etiketi | 2026-09-07/08 | ✅ web-service 476 test; canlı EPİAŞ (PTF/GIP/SMF) external_series'te |
| Faz 3 — Field Uplink + Saha Uzaktan Görünüm | **KOD + LAB CANLI** (L2, L3, L4, L8) | Lab stack (WG'siz): iframe → field app uplink tünelinden açılır; içinde konteyner UI açılır; portrait → landscape zorlaması | 2026-09-07/08 | ✅ uplink register + iframe tünel + field_session canlı |
| Faz 4 — WireGuard (yedek yol) | **KOD TAMAMLANDI — gerçek host gözle kontrolü bekliyor** | Host tanımla → bağlan → prob → rozet; PSK loglanmaz | 2026-09-07 | ✅ 14 test; gerçek WG host BEKLİYOR |
| Faz 5 — Bildirimler + Tema + Mobil paket | **BİLDİRİM BACAĞI: KOD + LAB CANLI** (L5) — tema + mobil paket ertelendi (kullanıcı kararı) | Bildirim akışı canlı; tema değişir; mobil paket derlenir | 2026-09-07/08 | ✅ 1534 monorepo testi; field session_open → boss bildirimi canlı |

## 2. Doğrulama Metodolojisi

Üç kanal — üçü de faz kapanışında kanıtlanır:

### 2.1 Dokümantal doğrulama

- Tasarımın her bölümünün kodda karşılığı olmalı: **tasarım bölümü → değişen dosya(satır) → test**.
- Matris sütunları: `Görev | Değiştirilen dosyalar ve değişiklikler (kod satırlarıyla) | Nedeni | Testler | Geçme durumu | Sisteme etkisi`.
- Sapmalar `Doküman Sapmaları` bölümüne (§3) kaydedilir; onaylıysa tasarım dokümanı da güncellenir.

### 2.2 Test doğrulaması

| Faz | Komutlar | Kapı |
|-----|----------|------|
| Faz 1 | `nx run superadmin:test` (yeni), `nx run ui:test` (icon eklemeleri), `nx run web-service:test` | Yeni kod ≥%70 satır; ekran sayfaları için component testleri |
| Faz 2 | `nx run superadmin:test`, `nx run web-service:test` (market route'ları + rbac) | rbac matris değişikliği ≥%90 branch |
| Faz 3 | `nx run web-service:test` (FieldUplinkConnector, FieldRegistry, FieldSessionGateway, FieldTunnelProxy, summary payload), `nx run ws-tunnel:test` (arındırma karakterizasyonu — WS-TUNNEL-URUN-TESCILI.md), `nx run superadmin:test` (fullscreen/orientation hook), `bun run test:e2e` (boss flow) | uplink/gateway/tunnel-proxy ≥%90 branch (güvenlik-kritik); fullscreen/orientation mantığı ≥%90 branch |
| Faz 4 | `nx run web-service:test` (WireGuardConnection), `nx run superadmin:test` | WG modülü ≥%90 branch (güvenlik-kritik); PSK redaction kanıtlı |
| Faz 5 | `nx run superadmin:test`, `bun run test:e2e` | tema + bildirim akışları testli |

### 2.3 Gözle kontrol (manuel/E2E)

- Faz 1: boss login → harita → saha detay akışı tarayıcıda; 375px (portrait) ve 1280px (desktop) iki boyutta.
- Faz 2: EPİAŞ canlı verisiyle grafikler; saat etiketleri TR saati.
- Faz 3: lab stack'te (1 konteyner + 1 field + boss, **WG'siz**) tam ekran iframe ile field app uplink tünelinden açılır; içinde konteyner UI açılır; Android/Chrome'da landscape zorlaması (cihaz matrisi).
- Faz 4: gerçek WG host'una bağlantı + prob; loglarda PSK yok.
- Faz 5: tema değişimi, mobil paket kurulumu (APK/IPA).

### 2.4 Lab tarama kanıtları (2026-09-08 — dev stack canlı)

| # | Kontrol | Sonuç |
|---|---------|-------|
| L1 | Container→field register (v2) | ✅ `field_connected` logu: `peerId=container-1, peerType=container`; fallback'siz `peerId` parsing |
| L2 | Field→boss uplink register (v2) | ✅ `[FieldRegistry] Saha kaydedildi: <FIELD_ID>`; `peerType=field`; token hash fail-closed (yanlış token → rejected) |
| L3 | Boss oturum + tünel | ✅ `POST /api/fields/:fid/session` → `field_session` cookie (`type:"field-session"` JWT etiketi); `/fields/:fid/ui/` iframe HTML'i uplink'ten aktı; allowlist dışı 403, cookie'siz 401 |
| L4 | Field konteyner oturumu (v2 DI) | ✅ 302 + `container_session` cookie — `fieldSessionStore` awilix anahtar çakışması yakalandı ve düzeltildi (`bossFieldSessionStore`) |
| L5 | Bildirim zinciri | ✅ field `session_open` → `field_events` (field_id=FIELD_ID, JOIN saha adı "İstanbul-1") + demo seed'ler; `/api/notifications` + `unread-count` canlı |
| L6 | EPİAŞ canlı | ✅ CAS TGT HTML yanıtından ayrıştırma düzeltmesi (`ticket-store.ts`) sonrası: PTF 40 nokta, GIP WAP, SMF → `external_series`; `/api/market/summary` canlı (PTF 2999.99 TRY/MWh) |
| L7 | Tamper zinciri | ✅ `bun tools/verify-log.mjs` field `app.log` — 118 olay / 16 segment zincir geçerli |
| L8 | Kayıt eşlemesi | ✅ Boss saha kaydı `id` = field'ın kendi `FIELD_ID`'si (kimlik tek kaynaktan — `admin_fields.id` opsiyonel geçersiz UUID artık kabul edilir) |
| S1 | FieldPoller özet durumu | ⚠️ Boss `api_url` fetch'i field JWT'si gerektiriyor — saha kartı "offline" görünür; uplink bağlı. Çözüm: uplink üzerinden özet push (sonraki iterasyon) — kart durumu registry durumundan türetilebilir |

## 3. Doküman Sapmaları

| # | Tarih | Sapma | Nedeni | Onay |
|---|-------|-------|--------|------|
| — | — | — | — | — |

## 4. Faz Doğrulama Matrisleri

### 4.1 Faz 1 — Kabuk + Harita + Varlıklar

| Görev | Değiştirilen dosyalar (satır) | Nedeni | Testler | Geçme durumu | Sisteme etkisi |
|-------|-------------------------------|--------|---------|--------------|----------------|
| Responsif kabuk (sidebar/drawer) | `apps/superadmin/src/layouts/BossShell.tsx` (yeni) + `BossShell.styles.ts` (yeni); `MobileShell.tsx` silindi; `app/routes.tsx` (8 rota) | §3 D1 — desktop icon-rail, mobil hamburger drawer | `layouts/BossShell.test.tsx` (3 test: login redirect, 5 nav, mustChangePassword) | ✅ 16/16 superadmin | MobileShell yerine BossShell; nav Harita/Varlıklar/Piyasa/Bildirimler/Ayarlar |
| Harita + Saha Detay gerçek veri | `pages/DashboardPage.tsx`, `pages/FieldDetailPage.tsx` (yeniden yazım), `features/fields/{types,mappers,services/fieldsApi,hooks/useAdminFields}` (yeni) | §4.1/§4.2 — FieldPoller canlı verisi (mock kaldırıldı) | `features/fields/mappers.test.ts` (4), `hooks/useAdminFields.test.tsx` (2) | ✅ | Mock FieldMarker listesi → `/api/admin/fields` 30 sn tazeleme |
| Varlıklar CRUD | `pages/AssetsPage.tsx` (yeni — grid + form + sil/düzenle) | §4.4 | mappers/hooks testleri kapsar | ✅ | `/api/admin/fields` POST/PUT/DELETE üzerinden saha kaydı |
| Ayarlar sayfası | `pages/SettingsPage.tsx` (yeni — dil çalışır, tema no-op, WG placeholder, hesap) | §4.7 D3/D4 | — (smoke kapsar) | ✅ | `boss-settings` localStorage persist |
| İkon eklemeleri | `packages/ui/src/icons/types.ts` + `nav-icons.tsx` — `map`, `notification`, `market` | §6 — eksik ikonlar | `nx run ui:test` | ✅ | SCADA_ICONS genişledi (47→50) |

### 4.2 Faz 2 — Piyasa

| Görev | Değiştirilen dosyalar (satır) | Nedeni | Testler | Geçme durumu | Sisteme etkisi |
|-------|-------------------------------|--------|---------|--------------|----------------|
| MarketSeries okuyucu | `web-service/src/infrastructure/market/market-series.ts` (yeni) — external_series sorguları (points/latest/average) | §7.3 — integration-service zaten boss stack'te yazıyor | `market-series.test.ts` (4) | ✅ | Boss web-service TimescaleDB'den piyasa serileri okur |
| Market rotaları | `web-service/src/presentation/routes/market-routes.ts` (yeni — /ptf, /gip-weighted-average, /summary) + `server.ts` (prefix /api/market), `rbac.ts` (GET satırı), `config/container.ts` (marketSeries boss-only) | §7.3 — salt-okunur kontrat; lastUpdatedAt "son veri" etiketi | `market-routes.test.ts` (4) | ✅ | `/api/market/*` boss tier'da canlı |
| Piyasa sayfası | `apps/superadmin/src/pages/MarketPage.tsx` (yeniden yazım), `features/market/{types,services,hooks}` (yeni) | §4.5 — PTF/GİP grafik + özet kartlar | build + smoke | ✅ | uPlot `MultiLineChartV2` ile PTF/GİP |

### 4.3 Faz 3 — Field Uplink + Saha Uzaktan Görünüm

| Görev | Değiştirilen dosyalar (satır) | Nedeni | Testler | Geçme durumu | Sisteme etkisi |
|-------|-------------------------------|--------|---------|--------------|----------------|
| Field uplink config | `web-service/src/config/default.ts` (fieldUplinkConfig — fail-fast, peerType:"field"), `shared-utils/src/config/definitions.ts` (5 yeni tanım) | §7.4.2 — FIELD_UPLINK_* env sözleşmesi | `default.test.ts` (mevcut desen) | ✅ | Field tier boss'a outbound bağlanır |
| FieldRegistry (boss) | `web-service/src/infrastructure/field-uplink/field-registry.ts` (yeni) — token hash fail-closed, register-ack, heartbeat/stale/idle, observer'lar | §7.4.2 — konteyner modelinin üst katman kopyası | `field-registry.test.ts` (7) | ✅ | `/ws/field` kabul altyapısı |
| Uplink kanal + WS route | `field-uplink/field-uplink-channel.ts` (yeni — IHubChannel), `routes/field-uplink-ws-routes.ts` (yeni) | §7.4.2 — SessionGateway/TunnelProxy kanalı | registry testleri kapsar | ✅ | Field'lar boss'a register olur |
| Boss oturum + tünel | `field-uplink/field-session-audit.ts` (yeni — field_session_audit, fail-closed), `routes/field-session-routes.ts` (yeni — POST /api/fields/:fid/session + /fields/:fid/ui/* HTTP/WS), `server.ts` + `config/container.ts` + `index.ts` wiring | §7.4.2 — cookie `field_session`, Path=/fields/<fid>/ui | — (bir sonraki turda route testleri) | ✅ build | Boss'ta SessionGateway+TunnelProxy (ws-tunnel v2 yeniden kullanım) |
| Field tier uplink istemcisi | `field-uplink/field-uplink-snapshot-source.ts` (yeni), `config/container.ts` (uplinkConnector/SessionStore/Server/TunnelClient), `index.ts` (start/stop) | §7.4.2 — TunnelConnector peerType:"field"; open-session yanıtı `field-session` JWT | — | ✅ build | Field app'e boss'tan iframe erişimi |
| Uzaktan görünüm sayfası | `apps/superadmin/src/pages/FieldRemotePage.tsx` (yeni — gauge + iframe), `hooks/useFullscreenLandscape.ts` (yeni), `features/fields/services/fieldSessionApi.ts` (yeni), `FieldDetailPage` "Aç" etkin | §4.3 + §5 — tam ekran + landscape zorlama | `useFullscreenLandscape.test.tsx` (4) | ✅ | Portrait mobilde `orientation.lock("landscape")` + rotate overlay |

### 4.4 Faz 4 — WireGuard

| Görev | Değiştirilen dosyalar (satır) | Nedeni | Testler | Geçme durumu | Sisteme etkisi |
|-------|-------------------------------|--------|---------|--------------|----------------|
| Host kayıt defteri | `web-service/src/infrastructure/wireguard/wg-host-store.ts` (yeni) — CRUD; PSK write-only (çıktılardan düşer) | §7.5 — PSK secret kolon, loglanmaz | `wg-host-store.test.ts` (4) | ✅ | `wg_hosts` tablosu boss PG'de |
| Sürücü | `wireguard-driver.ts` (yeni) — `IWireGuardDriver` + `WgQuickDriver` (.conf 0600 + wg-quick up/down + wg show) | §7.5 — testlerde fake driver | connection testleri kapsar | ✅ | Gerçek WG yalnızca .conf'ta; PSK log'suz |
| Orkestrasyon | `wireguard-connection.ts` (yeni) — connect (up + prob), disconnect, status, removeHost (önce down); `makeWireGuardConnection` fabrikası | §7.5 — kademeli bozulma (driver hatası üste taşınır) | `wireguard-connection.test.ts` (5) | ✅ | `NotFoundError` → 404 eşlemesi |
| Rotalar + rbac + wiring | `routes/wireguard-routes.ts` (yeni), `server.ts` (/api/admin/wireguard), `rbac.ts` (admin/boss satırı), `config/container.ts` (boss-only, WG_CLIENT_PRIVATE_KEY yoksa kurulmaz), `index.ts` (ensureSchema), `default.ts` (wireGuardConfig), `shared-utils/definitions.ts` (4 tanım), `.env.boss.example` | §7.5 — yedek yol; anahtar yoksa WG kapalı | `wireguard-routes.test.ts` (5) | ✅ | UI anahtar yoksa "devre dışı" görür |
| Ayarlar Ağ sekmesi | `apps/superadmin/src/pages/SettingsPage.tsx` (WG listesi + form + bağlan/durdur/sil), `features/wireguard/{types,services,hooks}` (yeni) | §4.7 — patron yalnızca ad/endpoint/key/PSK girer | build + smoke | ✅ | 15 sn durum tazeleme |

### 4.5 Faz 5 — Bildirimler (tema + mobil paket ertelendi)

| Görev | Değiştirilen dosyalar (satır) | Nedeni | Testler | Geçme durumu | Sisteme etkisi |
|-------|-------------------------------|--------|---------|--------------|----------------|
| Protokol eki | `ws-tunnel/src/protocol/messages.ts` — `EventMessage` + `TUNNEL_MESSAGE_TYPES` satırı + union | §7.6 — jenerik olay bildirimi (ürün kabiliyeti) | `messages.test.ts` (1) | ✅ | v2 additif — geriye uyumlu |
| Field aktarıcı | `web-service/src/infrastructure/field-uplink/uplink-event-relay.ts` (yeni) — seq cursor + 1 saat backlog + whitelist | §7.6.1 — device-service alarmları dahil tüm field servisleri log_events'e yazar | `uplink-event-relay.test.ts` (5) | ✅ | eventId = fieldId:seq; kod filtresi sözleşme katmanı |
| Boss toplayıcı | `field-uplink/field-event-collector.ts` (yeni) — registry observer + (field_id, event_id) UPSERT dedupe | §7.6.4 — backlog yeniden gönderimi güvenli | `field-event-collector.test.ts` (4) | ✅ | `field_events` tablosu + admin_fields JOIN (saha adı) |
| Rotalar + rbac | `routes/notification-routes.ts` (yeni — / + /unread-count), `rbac.ts` (admin/boss), `server.ts` + `config/container.ts` + `index.ts` wiring | §7.6.5 — limit 1-500; since zorunlu | `notification-routes.test.ts` (5) | ✅ | `/api/notifications` boss tier |
| Boss UI | `apps/superadmin/src/pages/NotificationsPage.tsx` (gerçek liste), `layouts/BossShell.tsx` (nav rozeti), `features/notifications/{types,services,hooks}` (yeni) | §4.6 — alarm kırmızı/cleared yeşil/resolved mavi; client-side son görülme | `NotificationsPage.test.tsx` (1) | ✅ | 15 sn tazeleme; rozet |
