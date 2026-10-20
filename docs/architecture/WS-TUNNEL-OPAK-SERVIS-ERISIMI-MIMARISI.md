---
status: active
space: architecture
tags: [mimari, ws-tunnel, servis-kesfi, opak-proxy, peer, spec]
review_date: 2026-10-16
---

# ws-tunnel Opak Servis Erişimi — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/5 — SPEC (AGENTS.md "Geliştirme İş Akışı").
> **Durum:** ✅ ONAYLANDI (2026-10-16) — geliştirme sürüyor (aşama 2-4).
> **İlişkili:** [WS-TUNNEL-URUN-TESCILI.md](./WS-TUNNEL-URUN-TESCILI.md), [WS-TUNNEL-KAPASITE-DEGERLENDIRMESI.md](./WS-TUNNEL-KAPASITE-DEGERLENDIRMESI.md), [KUTUPHANE-CIKARMA-PLANI.md](./KUTUPHANE-CIKARMA-PLANI.md), [../roadmap/ws-tunnel-kutuphane-yol-haritasi.md](../roadmap/ws-tunnel-kutuphane-yol-haritasi.md)

## 1. Amaç ve Bağlam

`@gd-monorepo/ws-tunnel` bugün iki topolojide (field→container, field→boss) çalışan kanıtlanmış bir transport. Ancak paket **yalnızca bilinen iki peer tipini** ve **telemetri/kontrol mesajlarını** tanır; bir peer **kendi servislerini hub'a duyuramaz**. Bu yüzden hub, peer'ın arkasındaki web uygulamalarına (örn. dokunamadığımız üçüncü taraf RevPi yönetim arayüzü) jenerik olarak erişemez ve tünel her yeni kullanımda domain şekline (container/field, `/containers/:cid/ui/*`) yapışır.

**Çözüm yönü:** Peer hub'a kendini tanıtırken **opak servis listesini** duyurur (`id` + kozmetik meta). Hub bu servisin **içini — endpoint, path, API, hedef adres — bilmez**; yalnızca "hangi peer, hangi servis" kaydını tutar ve o servise gelen HTTP/WS trafiğini opak olarak peer'a akar. Erişim kararı (auth/RBAC/audit) hub'da kalır; servis semantiği hub'a asla girmez.

Bu, mevcut stream katmanının (`StreamOpenMessage` method/path/headers taşır, peer yerel `fetch` ile yanıtlar, hub path'i anlamaz) üzerine oturan **tek yeni protokol parçasıdır**: isimli, çoklu, opak servis duyurusu + hub tarafı kayıt/keşif/erişim.

### Kapsam

| Katman | Bu SPEC'te |
|:-------|:-----------|
| Paket protokolü + saf hub registry (duyuru, peer tipi, kayıt yapısı) | ✅ dahil |
| Hub tarafı servis kaydı + keşif + opak erişim (web-service) | ✅ dahil |
| Bootstrap + kalıcı kimlik + pin/revocation | ❌ hariç → `WS-TUNNEL-BOOTSTRAP-KIMLIK-MIMARISI.md` |
| RevPi üçüncü peer uçtan uca + ayrı hub-servis ayrımı | ❌ hariç (§10 A2) |
| Paketleme (LICENSE/CHANGELOG/publish) | ❌ hariç (§10 A3) |
| Wildcard subdomain / host-based routing | ❌ hariç (§10 A4) |

## 2. Kararlar (kullanıcı onaylı, tarihli)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K1 | Servis duyurusu **opaktır** | Yalnız `id` (zorunlu) + `meta{title?,icon?}` (opsiyonel, kozmetik). Hedef adres/protokol/health/endpoint alanı protokole eklenemez |
| K2 | `services` register'a **opsiyonel, additif** alan | v2 şeması kırılmaz; `services`'siz mesajlar geçerli kalır |
| K3 | Peer tipi enum'a **`"device"`** eklenir | Serbest string'e geçiş v3 işi; RevPi için tek değer yeter |
| K4 | Saf kayıt yapısı **pakette** (`HubPeerRegistry`) | Registry saf veri (komut+query); WS/token/timer/HTTP/persistence YOK. Faz 3 hub-servis ayrımında routes ile birlikte taşınır |
| K5 | Tüketici katmanı **web-service** | `FieldRegistry` (WS+token+stale) `HubPeerRegistry`'yi kompoze eder; HTTP route/keşif tüketicide |
| K6 | Nötr erişim yolu | `/peers/:peerId/services/:serviceId/*` → prefix strip → mevcut opak proxy |
| K7 | Servis listesi değişikliği = **reconnect** | Ayrı `services-update` mesajı YOK (YAGNI) |
| K8 | Erken URL modeli | Dev: mevcut path-prefix; Prod: NIS-2 HTTPS-only (wildcard subdomain §10 A4) |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | Register mesajında servis duyurusu yok — peer kendi servislerini sunamıyor | `packages/ws-tunnel/src/protocol/messages.ts#RegisterMessage` |
| B2 | Peer tipi yalnız `container\|field` — cihaz (RevPi) temsil edilemiyor | `packages/ws-tunnel/src/protocol/messages.ts#TunnelPeerType` |
| B3 | Hub tarafı kayıt (Map + WS + token + stale) tek sınıfta birleşik; saf veri katmanı ayrılamıyor → Faz 3 taşıması zorlaşır | `services/web-service/src/infrastructure/field-uplink/field-registry.ts#FieldRegistry` |
| B4 | `/ws/field` rotası `peerType === "field"` sabitine bağlı; başka tip register edemez | `services/web-service/src/presentation/routes/field-uplink-ws-routes.ts#fieldUplinkWsRoutes` |
| B5 | Erişim domain-şekilli (`/containers/:cid/ui/*`); peer/servis bazlı nötr erişim yolu yok | `docs/architecture/WS-TUNNEL-URUN-TESCILI.md` §8; `services/web-service/src/infrastructure/container-proxy/container-ws-routes.ts` |

## 4. Mimari

### 4.1 Akış A — Servis duyurusu + opak erişim

```
RevPi (peer agent) ── register {peerId, peerType:"device", services:[{id:"local-admin"}] } ──► HUB
                                                                                             │ registry: peer+services
Tarayıcı ── GET /peers/revpi-001/services/local-admin/* ──► HUB ── auth/RBAC/audit ──► stream-open ──► peer agent
                                                                                        (method/path/headers)
                                                                                             │
                                                                            peer agent ──► localhost fetch
                                                                              http://127.0.0.1:<port>/*  (RevPi KENDİ backend'i)
                                                                                             │
                                                                                        yanıt opak geri akar
```

- Peer agent'ın bildiği tek şey kendi **lokal config'i** (`{id, localTarget}`); hedef adres hub'a asla duyurulmaz.
- RevPi'ye **sıfır kod** — yalnız yanında peer agent (TunnelConnector + TunnelClient) çalışır; dashboard'un API'sini bilmez.
- Konteyner web'inin bugün kullandığı opak stream mekanizmasının birebir aynısı.

### 4.2 Akış B — Keşif (hub'ın kendi REST API'si)

```
Boss/Site Admin UI ── GET /peers ──► HUB (registry okuma)
                    ── GET /peers/:peerId/services ──► HUB
```

- Bu endpoint'ler **hub'ın (web-service'in) kendi API'sidir**; peer uygulamasından hiçbir API beklenmez. Akış A (erişim) ile Akış B (keşif) kesin olarak ayrıdır.

### 4.3 Modül yerleşimi

- **Paket — protokol:** `ServiceAnnouncement`, `register.services`, `TunnelPeerType "device"`.
- **Paket — saf registry:** `src/hub/registry.ts#HubPeerRegistry` (peerId/type/status/services kaydı; `register`/`updateServices`/`unregister` komutları, `peers`/`servicesOf`/`isConnected` sorguları). WS/timer/HTTP/persistence bağımlılığı YOK.
- **Paket — hub yüzeyi:** `src/hub/index.ts` barrel (`HubPeerRegistry` + mevcut `SessionGateway`, `HubSessionStore`, `TunnelProxy`, `IHubChannel`). Fiziksel dosya taşıma yok.
- **Web-service:** `FieldRegistry` (WS+token+stale) + `HubPeerRegistry` kompozisyonu; keşif + erişim rotaları.
- **Erişim çözümleyici (A4 hazırlığı):** `/peers/...` rotası peer/servis bağlamını **tek çözümleyiciden** çözer — `resolveAccessContext(request) → { peerId, serviceId }`. Bugün path parametrelerinden beslenir; host-based geçişte (A4) aynı sözleşme Host başlığından beslenir — route mantığı path'e gömülmez, geçişte tek nokta değişir. Lib değişikliği DEĞİL, tüketici içi tasarım notu (T-10/T-11).

## 5. Purity Kuralları

1. Paket core'unda domain kelimesi (BESS/container/field/revpi) geçmez — anlam `meta`'da yaşar; enum değeri `device` domain değil, rol nötrdür.
2. Servis duyurusu opaktır: yalnız `id` + kozmetik `meta`. Hedef/protokol/health/endpoint alanı eklenemez; hub servis yapısını asla parse etmez.
3. `HubPeerRegistry` saftır: WS/timer/HTTP/persistence bağımlılığı taşıyamaz (DI kuralı — kalıcılık/taşıma tüketicide).
4. Pakete HTTP route kodu ve telemetri tipi girmez; keşif/erişim tüketicide (web-service) yaşar.
5. Keşif push-based'tir; ağ taraması (mDNS/ARP/port scan) YASAKTIR.
6. Peer↔peer doğrudan erişim yoktur; tüm trafik hub üzerinden akar. İstisna: nested hub — field, kendi konteynerlerinin hub'ıdır (iki-hop: boss→field→container).
7. Bağımlılık sınırı: yalnız `ws` + `zod` (+ test yardımcısı `jose` devDep). `@gd-monorepo/*` importu YASAK; `Result` yerel (`src/result/`).

## 6. Use Case'ler

### 6.1 UC-1 — Peer servis duyurusu + saf registry (paket)

**Status:** ✅ Approved (2026-10-16)

**Kapsam:**
- dahil: `ServiceAnnouncement` tipi, `register.services` alanı, `TunnelPeerType "device"`, connector'ın duyuruyu register frame'inde iletmesi, saf `HubPeerRegistry`, hub yüzeyi barrel'ı.
- hariç: servis keşif/erişim rotaları (UC-2); bootstrap/kimlik (İP-2); hedef adres/protokol alanları (opaklık — K1); persistence (tüketicide).

**Akış:**
1. Peer agent config'i `services: [{id, meta?}]` taşır.
2. `TunnelConnector` bağlanınca register frame'ine `services` (varsa) ekler.
3. Hub register frame'ini alır; `HubPeerRegistry` peer+servisleri kaydeder (UC-2).
4. Peer tipi `device` kabul edilir.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | `register` mesajı opsiyonel `services: ServiceAnnouncement[]` taşımalı; öğe `id` (boş olamaz) zorunlu, `meta{title?,icon?}` opsiyonel | AK-1.1 |
| FR-1.2 | `ServiceAnnouncement` hedef/protokol/health/endpoint alanı İÇERMEMELİ — şema bilinmeyen alanı reddetmeli (opaklık) | AK-1.2 |
| FR-1.3 | `services` alanı olmayan mevcut v2 register mesajları geçerli kalmalı (geriye uyum) | AK-1.3 |
| FR-1.4 | `TunnelPeerType` `"device"` içermeli; `TUNNEL_PEER_TYPES` buna göre güncellenmeli | AK-1.4 |
| FR-1.5 | `TunnelConnector` register frame'inde config `services`'ı iletmeli; yoksa alan eklenmemeli | AK-1.5 |
| FR-1.6 | Hub yüzeyi `src/hub/index.ts` barrel'ı olarak pakette sunulmalı; mevcut kök export'lar korunmalı | AK-1.6 |
| FR-1.7 | `HubPeerRegistry` saf olmalı: `register`/`updateServices`/`unregister` komutları + `peers`/`servicesOf`/`isConnected` sorguları; WS/timer/HTTP/persistence bağımlılığı YOK | AK-1.7 |
| FR-1.8 | Aynı peer yeniden register edildiğinde servis listesi yenisiyle değiştirilmeli (birleşme değil) | AK-1.8 |

**Kabul Senaryoları (GWT):**
1. **AK-1.1 — GIVEN** connector config'inde `services: [{id:"local-admin", meta:{title:"RevPi Admin"}}]` **WHEN** register frame üretilir **THEN** `services` dizisi id+meta ile taşınır.
2. **AK-1.2 — GIVEN** duyuru nesnesi `{id:"x", target:"http://10.0.0.5"}` bilinmeyen alan içeriyor **WHEN** şema doğrular **THEN** `target` reddedilir (sıkı/opak şema).
3. **AK-1.3 — GIVEN** `services` alanı olmayan v2 register mesajı **WHEN** parse edilir **THEN** geçerli sayılır, `services` yok kabul edilir.
4. **AK-1.4 — GIVEN** `peerType:"device"` **WHEN** `TUNNEL_PEER_TYPES`/tip doğrulaması yapılır **THEN** geçerli tip olarak kabul edilir.
5. **AK-1.5 — GIVEN** config `services` boş/undefined **WHEN** `registerFrame` üretilir **THEN** gövdede `services` alanı bulunmaz.
6. **AK-1.6 — GIVEN** tüketici kök paketten `TunnelProxy` import eder **WHEN** derleme çalışır **THEN** sembol çözülür ve hub barrel'ı aynı sembolleri sunar.
7. **AK-1.7 — GIVEN** `new HubPeerRegistry()` **WHEN** `register` + `servicesOf` çağrılır **THEN** kayıt döner ve sınıfın WS/timer/HTTP/persistence bağımlılığı bulunmaz.
8. **AK-1.8 — GIVEN** peer `[A]` ile kayıtlı **WHEN** `[B]` ile yeniden register **THEN** `servicesOf` `[B]` döner.

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | Servis duyurusu register frame'inde taşınır | unit | ⬜ |
| AK-1.2 | Opak olmayan alan şemada reddedilir | unit | ⬜ |
| AK-1.3 | services'siz v2 mesaj geçerli | unit | ⬜ |
| AK-1.4 | `device` tipi geçerli | unit | ⬜ |
| AK-1.5 | services yoksa alan gönderilmez | unit | ⬜ |
| AK-1.6 | Hub barrel + kök export korunur | unit | ⬜ |
| AK-1.7 | `HubPeerRegistry` saf ve çalışır | unit | ⬜ |
| AK-1.8 | yeniden register servis listesini değiştirir | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-1: `messages.ts` — `ServiceAnnouncement` + `register.services` + `TunnelPeerType "device"` + `TUNNEL_PEER_TYPES`
- [ ] T-2: `messages.test.ts` — services parse, opaklık reddi, geriye uyum, device
- [ ] T-3: `tunnel-connector.ts#registerFrame` — config `services` iletimi
- [ ] T-4: `tunnel-connector.test.ts` — register frame services testi
- [ ] T-5: `src/hub/registry.ts` — saf `HubPeerRegistry`
- [ ] T-6: `src/hub/registry.test.ts` — saf registry komut/query testleri
- [ ] T-7: `src/hub/index.ts` barrel + kök `index.ts` yönlendirmesi

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| `services` boş dizi | Geçerli; servis kaydı yok |
| `id` boş string | Şema hatası; register reddi (fail-closed) |
| Aynı `id` iki kez | Şema kabul eder; kayıt son değeri tutar (idempotent) |
| Bilinmeyen `peerType` | Reddedilir (enum dışı) |
| Kayıtlı olmayan peer sorgusu | `servicesOf` boş dizi; `isConnected` false |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `packages/ws-tunnel/src/protocol/messages.ts#RegisterMessage` | `services` alanı + `ServiceAnnouncement` |
| `packages/ws-tunnel/src/protocol/messages.ts#TunnelPeerType` | `"device"` eklenir |
| `packages/ws-tunnel/src/connector/tunnel-connector.ts#registerFrame` | `services` iletimi |
| `packages/ws-tunnel/src/hub/registry.ts` | YENİ — saf `HubPeerRegistry` |
| `packages/ws-tunnel/src/hub/index.ts` | YENİ — hub yüzeyi barrel |
| `packages/ws-tunnel/src/index.ts` | kök export yönlendirmesi |

### 6.2 UC-2 — Hub servis kaydı + keşif + opak erişim (web-service)

**Status:** ✅ Approved (2026-10-16)

**Kapsam:**
- dahil: `FieldRegistry`'nin `HubPeerRegistry`'yi kompoze etmesi, `GET /peers`, `GET /peers/:id/services`, `/peers/:pid/services/:sid/*` opak proxy, `/ws/field` tip gevşetmesi, stale/404 davranışı.
- hariç: bootstrap/kimlik (İP-2); ayrı hub-servis ayrımı (İP-3); wildcard subdomain (K8/A4); servis içeriği yorumlama (opaklık).

**Akış:**
1. Peer `/ws/field`'a token'la bağlanır (mevcut).
2. `register` frame'i `peerType` (herhangi) + `services` taşır → `FieldRegistry` → `HubPeerRegistry` kaydeder.
3. Admin `GET /peers` ve `GET /peers/:id/services` ile keşfeder.
4. Kullanıcı `/peers/:pid/services/:sid/*` ister → hub auth/RBAC/audit → prefix strip → peer'a stream-open → yanıt opak akar.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-2.1 | `FieldRegistry` register'da `services[]` alıp `HubPeerRegistry`'ye yazmalı; WS+token+stale kendi üzerinde kalmalı | AK-2.1 |
| FR-2.2 | `GET /peers` kayıtlı peer'ları (id, type, status) dönmeli | AK-2.2 |
| FR-2.3 | `GET /peers/:id/services` ilgili peer'ın duyurduğu servisleri dönmeli | AK-2.3 |
| FR-2.4 | `/ws/field` register kabulü `peerType === "field"` sabitini bırakmalı; herhangi geçerli tipi kabul etmeli (token doğrulaması korunur) | AK-2.4 |
| FR-2.5 | `/peers/:pid/services/:sid/*` prefix'i strip edip mevcut opak proxy (HTTP + WS upgrade) ile peer'a iletmeli | AK-2.5 |
| FR-2.6 | Bağlı olmayan (stale/idle) peer için erişim reddedilmeli; stream açılmamalı (fail-fast — otomatik retry YOK) | AK-2.6 |
| FR-2.7 | Duyurulmamış `serviceId` için 404 dönmeli; hub servis içeriğini yorumlamamalı | AK-2.7 |

**Kabul Senaryoları (GWT):**
1. **AK-2.1 — GIVEN** peer register frame'inde `services:[{id:"local-admin"}]` **WHEN** register tamamlanır **THEN** registry peer'i servis listesiyle tutar.
2. **AK-2.2 — GIVEN** iki peer bağlı **WHEN** `GET /peers` **THEN** yanıt ikisini id/type/status ile listeler.
3. **AK-2.3 — GIVEN** peer `local-admin` bildirdi **WHEN** `GET /peers/:id/services` **THEN** yanıt `local-admin`'ı içerir.
4. **AK-2.4 — GIVEN** `peerType:"device"` peer token'la bağlandı **WHEN** register işlenir **THEN** kabul edilir (field-only kısıtı kalkar).
5. **AK-2.5 — GIVEN** bağlı peer + bildirilmiş servis **WHEN** `GET /peers/p/services/s/status` **THEN** hub opak stream açar, peer'ın yerel yanıtı geri akar.
6. **AK-2.6 — GIVEN** peer `stale` **WHEN** servise erişim **THEN** istek reddedilir, stream açılmaz.
7. **AK-2.7 — GIVEN** peer `ghost` servisi bildirmedi **WHEN** `GET /peers/p/services/ghost/*` **THEN** 404 döner.

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-2.1 | Servisler registry'ye kaydedilir (kompozisyon) | unit | ⬜ |
| AK-2.2 | `GET /peers` peer listeler | unit | ⬜ |
| AK-2.3 | `GET /peers/:id/services` servisleri döner | unit | ⬜ |
| AK-2.4 | `device` tipi register kabul edilir | unit | ⬜ |
| AK-2.5 | Opak proxy uçtan uca akar | integration | ⬜ |
| AK-2.6 | Stale peer erişimi reddedilir | unit | ⬜ |
| AK-2.7 | Bilinmeyen servis 404 | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-8: `field-registry.ts#FieldRegistry` — `HubPeerRegistry` kompozisyonu + `servicesOf` delege
- [ ] T-9: `field-uplink-ws-routes.ts#fieldUplinkWsRoutes` — `peerType` kısıtını gevşetme + services aktarımı
- [ ] T-10: YENİ `peer-service-routes.ts` — `GET /peers` + `GET /peers/:id/services`
- [ ] T-11: YENİ `peer-service-routes.ts` — `/peers/:pid/services/:sid/*` opak proxy (stale reddi + 404)
- [ ] T-12: `presentation/server.ts` — yeni rota mount
- [ ] T-13: `field-registry.test.ts` — kompozisyon/servis kaydı testleri
- [ ] T-14: YENİ `peer-service-routes.test.ts` — keşif + erişim + stale/404 testleri

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Peer servis bildirmedi | `GET /peers/:id/services` boş dizi; erişim 404 |
| Aynı peer yeniden register | Servis listesi yenisiyle değiştirilir (AK-1.8) |
| Stale → heartbeat geri geldi | Status `connected`; erişim yeniden açılır |
| WS upgrade isteği (SPA/HMR) | Prefix strip sonrası Upgrade header'ı korunur |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `services/web-service/src/infrastructure/field-uplink/field-registry.ts#FieldRegistry` | `HubPeerRegistry` kompozisyonu + `servicesOf` |
| `services/web-service/src/presentation/routes/field-uplink-ws-routes.ts#fieldUplinkWsRoutes` | Tip gevşetmesi + services aktarımı |
| `services/web-service/src/presentation/routes/peer-service-routes.ts` | YENİ — keşif + opak erişim |
| `services/web-service/src/presentation/server.ts` | Rota mount |
| `services/web-service/src/infrastructure/field-uplink/field-registry.test.ts` | Kompozisyon/servis testleri |
| `services/web-service/src/presentation/routes/peer-service-routes.test.ts` | YENİ — keşif/erişim testleri |

### 6.3 Paket Geneli Görevler

- [ ] T-15: `AGENTS-WS-TUNNEL.md` — "Opak servis erişimi sözleşmesi (MANDATORY)" bölümü (K1/opaklık, erişim≠keşif, push-based, peer↔peer yok, `HubPeerRegistry` saflığı)
- [ ] T-16: YENİ `tools/peer-service-demo.mjs` — loopback uçtan uca (duyuru → keşif → opak erişim; SC-1 kanıtı)

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| Register (services ile) | `HubPeerRegistry`'ye peer + servis listesi yazılır; yeniden register'da liste değişir |
| Register reddi (token/tip/id) | `register-ack rejected`; bağlantı kapanır (fail-closed — mevcut) |
| Heartbeat | `lastSeenAt` tazelenir; stale→connected |
| Stale eşiği | `FieldRegistryOptions.staleTimeoutMs` (varsayılan 45 sn) — **zaten config**, değiştirilebilir |
| Stale (eşik aşımı) | Yeni erişim reddedilir (fail-fast, retry YOK); mevcut stream yok edilmez (mevcut davranış) |
| Idle / WS kapanışı | Kayıt düşer; keşifte görünmez |
| Erişim — bilinmeyen servis | 404 (yorum yok) |
| Erişim — bağlı değil | Reddedilir (stream açılmaz) |
| Erişim — peer yarı-ölü | Mevcut timeout/`system_unreachable` kademeli bozulma |
| Servis listesi değişikliği | Reconnect ile yeni register (K7) |

Beklenen hata → yerel `Result`; beklenmeyen → yerel `DomainError` (paket içi sözleşme). Paket `decode` garantisi ve branch kapıları değişmez.

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | Aynı paket sürümüyle `services` duyurusu → keşif → opak erişim uçtan uca çalışır | `tools/peer-service-demo.mjs` PASS + integration spec yeşil |
| SC-2 | Mevcut field→container ve field→boss akışları bozulmadan `device` tipi eklenir | monorepo test seti yeşil |
| SC-3 | ws-tunnel branch kapsamı ≥%90 ve monorepo build yeşil korunur | coverage + `nx run-many -t build` |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC | Bu doküman (✅ Approved 2026-10-16) |
| 2. JSDoc | T-1/T-5/T-8 sözleşmeleri (ServiceAnnouncement, HubPeerRegistry, FieldRegistry kompozisyonu) |
| 3. TEST | T-2, T-4, T-6, T-13, T-14 kırmızı testler |
| 4. IMPL | T-1, T-3, T-5, T-7, T-8, T-9, T-10, T-11, T-12, T-15, T-16 |
| 5. KAPANIŞ | `WS-TUNNEL-OPAK-SERVIS-ERISIMI-KAPANIS.md` (Doğrulama + Test Kapsamı) |

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A1 | Bootstrap + kalıcı kimlik + pin/revocation | Ayrı SPEC: `WS-TUNNEL-BOOTSTRAP-KIMLIK-MIMARISI.md` |
| A2 | RevPi üçüncü peer uçtan uca + ayrı hub-servis ayrımı (İP-3) | İP-3'te kapanır (SC-1'in dış kanıtı) |
| A3 | Paketleme P1/P3/P6 + LICENSE kararı (İP-4) | KUTUPHANE-CIKARMA-PLANI §8 kararı sonrası |
| A4 | Wildcard subdomain / host-based routing | Ayrı SPEC: `WS-TUNNEL-SUBDOMAIN-YONLENDIRME-MIMARISI.md` (şimdi yazıldı, tetikte aktive). Tetik: absolute asset path / cookie çakışması / NIS-2 HTTPS geçişi. Lib değişikliği YOK (host-agnostik + config) |
| A5 | Stale peer erişim davranışının testle sabitlenmesi (B3) | UC-2 T-14'te kapanır |
| A6 | `meta` genişletmesi (health/protocol/version) | REDDEDİLDİ — ihtiyaç (dashboard) belirince additif eklenir; opaklık (K1) korunur |
| A7 | Peer-level `labels`/`capabilities` | YAGNI — keşif UI filtrelemesi belirince additif eklenir |
| A8 | ws-tunnel domain kalıntı turu (upstream sert kural `/api/*`,`/ws/*` → `IUpstreamRouter` enjeksiyonu; `container_session` ve allowlist varsayılan sabitleri; domainli log event code'ları) | İP-1 **kapanışından SONRA** planlanır (kullanıcı kararı 2026-10-16) — tek PR'da özellik + arındırma karışmasın |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. **İP-2 — Bootstrap/kimlik:** `WS-TUNNEL-BOOTSTRAP-KIMLIK-MIMARISI.md`.
2. **İP-3 — RevPi + hub-servis:** Üçüncü peer üretim kanıtı; hub parçalarının ayrı servise çıkarılması.
3. **İP-4 — Paketleme:** LICENSE/CHANGELOG/README/demo.
4. **Generic TCP/gRPC stream:** İhtiyaç belirirse; `WS-TUNNEL-KAPASITE-DEGERLENDIRMESI.md` §7'de kayıtlı (YAGNI).

## 12. T Görev Özeti

| Kod | Görev | UC | Dosya |
|:----|:------|:---|:------|
| T-1 | `ServiceAnnouncement` + `register.services` + `TunnelPeerType "device"` | UC-1 | `packages/ws-tunnel/src/protocol/messages.ts` |
| T-2 | Protokol şema testleri (parse, opaklık, geriye uyum, device) | UC-1 | `packages/ws-tunnel/src/protocol/messages.test.ts` |
| T-3 | Connector register frame'ine `services` iletimi | UC-1 | `packages/ws-tunnel/src/connector/tunnel-connector.ts` |
| T-4 | Connector register frame testi | UC-1 | `packages/ws-tunnel/src/connector/tunnel-connector.test.ts` |
| T-5 | Saf `HubPeerRegistry` | UC-1 | `packages/ws-tunnel/src/hub/registry.ts` |
| T-6 | Saf registry komut/query testleri | UC-1 | `packages/ws-tunnel/src/hub/registry.test.ts` |
| T-7 | Hub yüzeyi barrel + kök export yönlendirmesi | UC-1 | `packages/ws-tunnel/src/hub/index.ts`, `packages/ws-tunnel/src/index.ts` |
| T-8 | `FieldRegistry` `HubPeerRegistry` kompozisyonu + `servicesOf` | UC-2 | `services/web-service/src/infrastructure/field-uplink/field-registry.ts` |
| T-9 | `/ws/field` peer tipi gevşetme + services aktarımı | UC-2 | `services/web-service/src/presentation/routes/field-uplink-ws-routes.ts` |
| T-10 | Keşif rotaları (`GET /peers`, `GET /peers/:id/services`) | UC-2 | `services/web-service/src/presentation/routes/peer-service-routes.ts` |
| T-11 | Opak erişim rotası (`/peers/:pid/services/:sid/*`) | UC-2 | `services/web-service/src/presentation/routes/peer-service-routes.ts` |
| T-12 | Rota mount | UC-2 | `services/web-service/src/presentation/server.ts` |
| T-13 | Registry kompozisyon/servis testleri | UC-2 | `services/web-service/src/infrastructure/field-uplink/field-registry.test.ts` |
| T-14 | Keşif + erişim + stale/404 testleri | UC-2 | `services/web-service/src/presentation/routes/peer-service-routes.test.ts` |
| T-15 | `AGENTS-WS-TUNNEL.md` opak servis sözleşmesi bölümü | Genel | `AGENTS-WS-TUNNEL.md` |
| T-16 | Loopback uçtan uca demo | Genel | `tools/peer-service-demo.mjs` |

**review_date:** 2026-10-16 — rev.2 (registry pakete, T-15/T-16 eklendi, stale/meta notları); ✅ onaylandı, geliştirme sürüyor.
