---
status: active
space: architecture
tags: [kapanis, dogrulama, test-kapsami, ws-tunnel, opak-proxy, servis-kesfi]
review_date: 2026-10-16
---

# ws-tunnel Opak Servis Erişimi — Kapanış (Doğrulama + Test Kapsamı)

> **İş akışı aşaması:** 5/5 — KAPANIŞ (AGENTS.md "Geliştirme İş Akışı").
> **SPEC:** [WS-TUNNEL-OPAK-SERVIS-ERISIMI-MIMARISI.md](./WS-TUNNEL-OPAK-SERVIS-ERISIMI-MIMARISI.md) (✅ Approved 2026-10-16 — AK/FR/SC kaynağı).
> **Doğrulama tarihi:** 2026-10-16 — T-1…T-16 tamam.

## A. DOĞRULAMA

### A.1 Değişiklik Matrisi

| # | Dosya | Değişiklik | Neden (SPEC ref) |
|:--|:------|:-----------|:-----------------|
| 1 | `AGENTS-WS-TUNNEL.md` | "Opak servis erişimi sözleşmesi (MANDATORY)" bölümü — opaklık, erişim≠keşif, push-based, enum tipleri, `HubPeerRegistry` saflığı, mevcut akış korunumu | T-15 / K1/K3/K5 |
| 2 | `packages/ws-tunnel/src/protocol/messages.ts#ServiceAnnouncement` | YENİ tip + `serviceAnnouncementSchema` (STRICT: `id` zorunlu, `meta{title?,icon?}`, bilinmeyen alan RED) | T-1 / FR-1.1/1.2 / K1 |
| 3 | `packages/ws-tunnel/src/protocol/messages.ts#TunnelPeerType` | `"device"` eklendi; `TUNNEL_PEER_TYPES` güncellendi | T-1 / FR-1.4 / K3 |
| 4 | `packages/ws-tunnel/src/protocol/messages.ts#RegisterMessage` | opsiyonel `services?: ServiceAnnouncement[]` eklendi (v2 kırılmaz) | T-1 / FR-1.1/1.3 / K2 |
| 5 | `packages/ws-tunnel/src/protocol/messages.test.ts` | services parse, opaklık reddi, geriye uyum, `device` tipi | T-2 / AK-1.1..1.4 |
| 6 | `packages/ws-tunnel/src/connector/tunnel-connector.ts#registerFrame` | config `services` yalnızca doluysa register frame'ine eklenir | T-3 / FR-1.5 |
| 7 | `packages/ws-tunnel/src/connector/tunnel-connector.test.ts` | register frame services iletimi | T-4 / AK-1.5 |
| 8 | `packages/ws-tunnel/src/hub/registry.ts#HubPeerRegistry` | YENİ — saf registry (`register`/`updateServices`/`unregister` komut, `peers`/`servicesOf`/`isConnected` sorgu; WS/timer/HTTP/persistence YOK) | T-5 / FR-1.7 / K4 |
| 9 | `packages/ws-tunnel/src/hub/registry.test.ts` | saf registry komut/query testleri | T-6 / AK-1.7/1.8 |
| 10 | `packages/ws-tunnel/src/hub/index.ts` | YENİ — hub yüzeyi barrel (`./registry` + `../proxy`) | T-7 / FR-1.6 |
| 11 | `packages/ws-tunnel/src/index.ts` | kök export `./proxy` → `./hub` (çakışma önlenir, proxy korunur) | T-7 / FR-1.6 |
| 12 | `packages/ws-tunnel/src/session/index.ts` | stale `./session-store` → `./client-session-store` import düzeltmesi | Sapma S-1 (pre-existing TS2307) |
| 13 | `services/web-service/src/infrastructure/field-uplink/field-registry.ts#FieldRegistry` | `HubPeerRegistry` kompozisyonu + `parseServices` (şema doğrulama) + `peers`/`servicesOf` delege; `register` meta imzası | T-8 / FR-2.1 / K5 |
| 14 | `services/web-service/src/infrastructure/field-uplink/field-registry.test.ts` | kompozisyon/servis kaydı/device tipi testleri | T-13 / AK-2.1/2.4 |
| 15 | `services/web-service/src/presentation/routes/field-uplink-ws-routes.ts#fieldUplinkWsRoutes` | `peerType === "field"` sabiti kaldırıldı → `isKnownPeerType` (TUNNEL_PEER_TYPES) + services aktarımı | T-9 / FR-2.4 |
| 16 | `services/web-service/src/presentation/routes/peer-service-routes.ts#peerServiceRoutes` | YENİ — `GET /peers` + `GET /peers/:id/services` (keşif) + `/peers/:pid/services/:sid/*` opak HTTP + WS köprüsü + `resolveAccessContext` | T-10/T-11 / FR-2.2/2.3/2.5/2.6/2.7 |
| 17 | `services/web-service/src/presentation/routes/peer-service-routes.test.ts` | keşif + erişim + stale(503)/404/403 testleri | T-14 / AK-2.2/2.3/2.5/2.6/2.7 |
| 18 | `services/web-service/src/presentation/server.ts#WebServiceServer` | `peerServiceRoutes` mount (fieldRegistry+gateway+tunnelProxy varsa) | T-12 |
| 19 | `tools/peer-service-demo.mjs` | YENİ — loopback uçtan uca (duyuru → keşif → oturum → opak erişim) | T-16 / SC-1 |

> Tüm değişiklikler base commit `@b1cf4b2` üzerinde (working tree).

### A.2 Test Kanıtları

| Kapsam | Komut | Sonuç |
|:-------|:------|:------|
| ws-tunnel tip denetimi | `nx run ws-tunnel:typecheck` | yeşil |
| ws-tunnel birim testleri | `nx run ws-tunnel:test` | 13 dosya / 239 test yeşil |
| web-service birim testleri | `nx run web-service:test` | 72 dosya / 631 test yeşil |
| etkilenen projeler + bağımlılıklar | `nx affected -t test build --base=HEAD` | 4 proje + 10 bağımlılık başarılı |
| uçtan uca loopback | `bun tools/peer-service-demo.mjs` | 5/5 PASS (A register+duyuru, B keşif, C oturum, D opak erişim GET /assets/app.js) |
| ws-tunnel coverage | `nx run ws-tunnel:test` (coverage raporu) | %97.08 stmts / %95.14 branch / %100 funcs; `registry.ts` + `messages.ts` %100 (≥%90 kapısı aşıldı) |
| dokümantasyon lint kapısı | `bun tools/spec-check.mjs` (3 SPEC) | 0 hata |

### A.3 Kabul Kriteri Kanıtları

| Kod | Kriter (SPEC özeti) | Kanıt (test/dosya) | Durum |
|:----|:--------------------|:-------------------|:------|
| AK-1.1 | Servis duyurusu register frame'inde taşınır | `messages.test.ts` + `tunnel-connector.test.ts` | 🟢 |
| AK-1.2 | Opak olmayan alan şemada reddedilir (STRICT) | `messages.test.ts` (`serviceAnnouncementSchema`) | 🟢 |
| AK-1.3 | services'siz v2 mesaj geçerli | `messages.test.ts` | 🟢 |
| AK-1.4 | `device` tipi geçerli | `messages.test.ts` (`TUNNEL_PEER_TYPES`) | 🟢 |
| AK-1.5 | services yoksa alan gönderilmez | `tunnel-connector.test.ts` | 🟢 |
| AK-1.6 | Hub barrel + kök export korunur | `hub/index.ts#HubPeerRegistry` + `ws-tunnel:typecheck` | 🟢 |
| AK-1.7 | `HubPeerRegistry` saf ve çalışır | `registry.test.ts` | 🟢 |
| AK-1.8 | Yeniden register servis listesini DEĞİŞTİRİR (birleşmez) | `registry.test.ts` | 🟢 |
| AK-2.1 | Servisler registry'ye kaydedilir (kompozisyon) | `field-registry.test.ts` | 🟢 |
| AK-2.2 | `GET /peers` peer listeler (id/type/status/services) | `peer-service-routes.test.ts` | 🟢 |
| AK-2.3 | `GET /peers/:id/services` servisleri döner (bilinmeyen → 404) | `peer-service-routes.test.ts` | 🟢 |
| AK-2.4 | `device` tipi register kabul edilir (field-only kısıtı kalkar) | `field-registry.test.ts` + `messages.test.ts` (`TUNNEL_PEER_TYPES`); rota-katmanı WS testi → B.2/G1 | 🟢 |
| AK-2.5 | Opak proxy uçtan uca akar | `peer-service-routes.test.ts` (HTTP) + `tools/peer-service-demo.mjs` (D) | 🟢 |
| AK-2.6 | Stale peer erişimi reddedilir (stream açılmaz) | `peer-service-routes.test.ts` (503) | 🟢 |
| AK-2.7 | Duyurulmamış servis 404 (yorum yok) | `peer-service-routes.test.ts` | 🟢 |
| SC-1 | Loopback uçtan uca: duyuru → keşif → opak erişim | `tools/peer-service-demo.mjs` 5/5 PASS | 🟢 |
| SC-2 | Mevcut field→container / field→boss akışları bozulmadan `device` eklenir | `nx affected -t test build` (4 proje + 10 bağımlılık yeşil) | 🟢 |
| SC-3 | ws-tunnel branch ≥%90 + build yeşil korunur | coverage %95.14 branch (`registry.ts`/`messages.ts` %100) + build yeşil | 🟢 |

### A.4 Sapmalar

| # | Sapma | Açıklama |
|:--|:------|:---------|
| 1 | `session/index.ts` stale import düzeltmesi (pre-existing TS2307) | `./session-store` → `./client-session-store`. Bu SPEC'in görevi değil; `ws-tunnel:typecheck` kapısının yeşil olması için gerekliydi. Davranış değişikliği yok. |
| 2 | `web-service:typecheck` baseline'da kırmızı | Workspace paketlerinin `dist/*.d.ts` çıktısı yok (TS6305) + `@fastify/websocket` augmentation eksik. Dokunulmayan dosyalarda da mevcut; bu SPEC'ten bağımsız. Gerçek kapılar: `ws-tunnel:typecheck` + `build` + testler yeşil (SC-2/SC-3). |
| 3 | Ayrı session-open rotası yok | SPEC'te erişim için ayrı session açma rotası tanımlı değil; `peer-service-routes.ts#ensureSession` erişim sırasında `SessionGateway` ile oturum açar/yeniden kullanır (T-10/T-11 tasarım notu §4.3). |

### A.5 Gözle Kontrol Maddeleri

- [x] Purity 1 — paket core'unda domain kelimesi yok (BESS/container/field/revpi); anlam `meta`'da, enum değeri `device` rol nötr
- [x] Purity 2 — duyuru opaktır: yalnız `id` + `meta`; hedef/protokol/health/endpoint YOK — `serviceAnnouncementSchema` STRICT reddeder
- [x] Purity 3 — `HubPeerRegistry` saftır: WS/timer/HTTP/persistence bağımlılığı yok (`registry.ts`)
- [x] Purity 4 — pakete HTTP route kodu girmedi; keşif/erişim web-service'te (`peer-service-routes.ts`)
- [x] Purity 5 — push-based keşif; ağ taraması (mDNS/ARP/port scan) yok
- [x] Purity 6 — peer↔peer doğrudan erişim yok; trafik hub üzerinden
- [x] Purity 7 — yeni paket bağımlılığı eklenmedi (yalnız `ws` + `zod` + `@gd-monorepo/result`)
- [x] DI — `HubPeerRegistry` `FieldRegistry`'ye constructor alanı olarak kompoze edildi (plain, dekoratör YOK); `peerServiceRoutes` deps obje kontratı
- [x] Elegant Object — komut/query ayrımı: `register`/`updateServices`/`unregister` → `void`; `peers`/`servicesOf`/`isConnected` → sorgu
- [x] Async loop — `for...of await` yok; handler akışları `await`/`Promise` tek nokta

### A.6 Genel Durum Özeti

ws-tunnel paketine tek yeni protokol parçası eklendi: peer'ın kendini tanıtırken duyurduğu **opak servis listesi** (`register.services[]` + `ServiceAnnouncement`, `TunnelPeerType "device"`). Paket tarafında saf `HubPeerRegistry` (WS/timer/HTTP/persistence'siz) ve hub yüzeyi barrel'ı kuruldu; tüketici tarafında `FieldRegistry` bu registry'yi kompoze etti, `/ws/field` tip sabiti kaldırıldı ve `peer-service-routes.ts` ile keşif (`GET /peers`, `GET /peers/:id/services`) + opak erişim (`/peers/:pid/services/:sid/*` — HTTP + WS köprüsü) rotaları açıldı. T-1…T-16 tamam: ws-tunnel 239 test, web-service 631 test, `nx affected` 4 proje + 10 bağımlılık, loopback demo 5/5 yeşil; ws-tunnel branch kapsamı %95.14 (kapı ≥%90). `resolveAccessContext` tek çözümleyicisi A4 (subdomain) geçişine hazır; opaklık (K1) şema STRICT ile, mevcut v2 akışları (K2) geriye uyumla korunuyor. Kalan boşluklar B.2'de (rota-katmanı WS testi, WS köprüsü, stale→yeniden açılma). **review_date:** 2026-10-16.

## B. TEST KAPSAMI

### B.1 Kapsam Matrisi (durum → koşul → beklenen → test ref'i)

| Durum | Koşul | Beklenen (THEN) | Test ref'i |
|:------|:------|:----------------|:-----------|
| Register (services ile) | `register` frame'i `services` taşır | frame'de `services` dizi + id/meta | `tunnel-connector.test.ts` |
| Register (services'siz) | config `services` boş/undefined | gövdede `services` alanı YOK (v2 birebir) | `tunnel-connector.test.ts` |
| Şema — opaklık | duyuruda bilinmeyen alan (`target`) | şema RED (STRICT) | `messages.test.ts` |
| Şema — geriye uyum | `services` alanı olmayan v2 mesaj | geçerli; `services` yok | `messages.test.ts` |
| Şema — tip | `peerType:"device"` | geçerli tip (`TUNNEL_PEER_TYPES`) | `messages.test.ts` |
| Registry — kayıt | `register` + `servicesOf` | kayıt döner | `registry.test.ts` |
| Registry — yeniden kayıt | peer `[A]` → `[B]` ile register | `servicesOf` `[B]` (birleşmez) | `registry.test.ts` |
| Registry — saflık | argümansız kurulum | taşıma bağımlılığı yok | `registry.test.ts` |
| Registry — geçersiz | boş `peerId` | `ValidationError` (fail-closed) | `registry.test.ts` |
| Registry — dedup | aynı `id` iki kez | son değer kazanır (idempotent) | `registry.test.ts` |
| Registry — yok sorgu | kayıtsız peer | `servicesOf` boş dizi; `isConnected` false | `registry.test.ts` |
| FieldRegistry — servis kaydı | register meta `services` | `HubPeerRegistry`'ye yazılır; `peers`/`servicesOf` döner | `field-registry.test.ts` |
| FieldRegistry — geçersiz servis | şema reddi | register reddi (`invalid-services`) | `field-registry.test.ts` |
| Keşif — `GET /peers` | iki peer bağlı | id/type/status/services listelenir | `peer-service-routes.test.ts` |
| Keşif — `GET /peers/:id/services` | peer servis bildirdi | servis listesi döner | `peer-service-routes.test.ts` |
| Keşif — bilinmeyen peer | `GET /peers/:id/services` | 404 | `peer-service-routes.test.ts` |
| Erişim — bağlı + duyurulmuş | `GET /peers/p/services/s/*` | opak stream açılır, yanıt akar | `peer-service-routes.test.ts` |
| Erişim — allowlist dışı | yol allowlist'te yok | 403 (stream açılmaz) | `peer-service-routes.test.ts` |
| Erişim — bağlı değil (stale) | `isConnected` false | 503 (fail-fast) | `peer-service-routes.test.ts` |
| Erişim — oturum yok | kimliksiz akışlı erişim | 401 (kimlik gerekli) | `peer-service-routes.test.ts` |
| Erişim — duyurulmamış servis | `GET /peers/p/services/ghost/*` | 404 (yorum yok) | `peer-service-routes.test.ts` |
| E2E — loopback | duyuru → keşif → oturum → opak erişim | 5/5 adım PASS | `tools/peer-service-demo.mjs` |

### B.2 KAPSANMAYAN Boşluklar

| # | Boşluk | Risk | İleri iş |
|:--|:-------|:-----|:---------|
| G1 | `/ws/field` rota seviyesinde `device` register WS upgrade testi YOK (inject WS upgrade desteklemiyor — AK-2.4'ün rota katmanı yalnız `field-registry` + `messages` ünite testiyle örtülü) | orta | `field-uplink-ws-routes` için gerçek WS upgrade testi (e2e) veya `isKnownPeerType` ünite testi |
| G2 | WS köprüsü erişimi (`/peers/:pid/services/:sid/ws/*` — `startWsBridge`) test edilmedi; yalnız HTTP opak akış testli | orta | `peer-service-routes.test.ts`'ye WS köprüsü akışı (oturum açılımı + mesaj iletimi + kapanış) ekle |
| G3 | Stale peer erişim reddi (503) testli, ama stale→heartbeat geri gelince erişimin yeniden açılması test edilmedi | düşük | heartbeat tazeleme sonrası `isConnected` → erişim geçişi testi |

**review_date:** 2026-10-16
