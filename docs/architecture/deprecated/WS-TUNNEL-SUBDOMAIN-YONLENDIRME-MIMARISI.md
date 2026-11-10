---
status: plan
space: architecture
tags: [mimari, ws-tunnel, subdomain, host-routing, iframe, spec]
review_date: 2026-10-16
---

# ws-tunnel Host-Based Erişim (Subdomain Yönlendirme) — Mimarisi (SPEC)

> **İş akışı aşaması:** 1/5 — SPEC (AGENTS.md "Geliştirme İş Akışı").
> **Durum:** ERTELENDİ — tetik koşulunda aktive edilir; aktive edildiğinde developer onay kapısı işletilir.
> **İlişkili:** [WS-TUNNEL-OPAK-SERVIS-ERISIMI-MIMARISI.md](./WS-TUNNEL-OPAK-SERVIS-ERISIMI-MIMARISI.md) (A4), [WS-TUNNEL-BOOTSTRAP-KIMLIK-MIMARISI.md](./WS-TUNNEL-BOOTSTRAP-KIMLIK-MIMARISI.md), [WS-TUNNEL-URUN-TESCILI.md](./WS-TUNNEL-URUN-TESCILI.md) §8, [AGENTS-DEPLOYMENT.md](../../AGENTS-DEPLOYMENT.md)

## 1. Amaç ve Bağlam

Path-prefix erişim modeli (`/peers/:peerId/services/:serviceId/*`) **relative-path** SPA'larda çalışır. Ancak **dokunamadığımız** (foreign) uygulamalarda üç kırılganlık doğar:

1. **Absolute asset path:** uygulama `/assets/app.js` üretirse tarayıcı bunu hub origin köküne çözer → beyaz ekran + MIME hatası (TESCIL §8 dersi).
2. **Cookie çakışması/domain:** aynı hub origin'inde çoklu peer aynı cookie adını kullanırsa çakışır; uygulama `Domain=.revpi.local` set ederse cookie reddedilir.
3. **Absolute redirect:** login sonrası `Location: /dashboard` tarayıcıyı prefix dışına çıkarır.

Host-based model (`<serviceId>.<peerId>.hub.<domain>`) uygulamayı **kökte** çalıştırır: absolute path'ler doğru çözülür, cookie **per-host first-party** olur, redirect'ler doğaldır. Bu SPEC, path-prefix'in yerini almayan, onunla **yan yana** çalışan ve **config-based** tetiklenen bir geçiş tanımlar.

### Kapsam

| Katman | Bu SPEC'te |
|:-------|:-----------|
| Consumer HostRouter + host→(peerId, serviceId) config eşlemesi | ✅ dahil |
| Cookie/header uyumluluğu (XFO/CSP/Location) host modu | ✅ dahil |
| Deployment: wildcard DNS + wildcard TLS + SNI host routing | ✅ dahil |
| `packages/ws-tunnel` değişikliği | ❌ hariç — lib host-agnostik (K2) |
| Yeni protokol mesajı | ❌ hariç |
| Path-prefix modelinin kaldırılması | ❌ hariç — ikisi yan yana (K6) |

## 2. Kararlar (kullanıcı onaylı, tarihli)

| Kod | Karar | Sonuç |
|:----|:------|:------|
| K1 | Erişim host'u `<serviceId>.<peerId>.hub.<domain>`; routing **consumer HTTP katmanında** | Fastify host match / nginx `server_name` — pakete girmez |
| K2 | `packages/ws-tunnel` DEĞİŞMEZ | Paket host-agnostiktir: Host hop-by-hop strip; allowlist + cookieName zaten config (F4/F5) |
| K3 | Cookie **per-host first-party**, `Path=/`; `cookieName` config | Foreign uygulamanın cookie'si host bazında izole olur — çakışma biter |
| K4 | host→`{peerId, serviceId}` eşlemesi **config-based** (DB/YAML); bilinmeyen host fail-closed | Dinamik peer'lar host'unu config'ten alır; wildcard eşleme YOK |
| K5 | Geçiş **tetikli**: absolute asset path kırılması / cookie çakışması / absolute redirect / NIS-2 HTTPS geçişi | Şimdi inşa EDİLMEZ; tetikte aktive |
| K6 | Aynı `resolveAccessContext` sözleşmesi | İP-1'de path parametrelerinden, burada Host'tan beslenir — route mantığı tek nokta |

## 3. Mevcut Durum / Kök Nedenler

| Kod | Bulgu | Kanıt |
|:----|:------|:------|
| B1 | Paket Host başlığını yorumlamıyor/doğrulamıyor — hop-by-hop strip | `packages/ws-tunnel/src/proxy/tunnel-proxy.ts#HOP_BY_HOP_HEADERS` |
| B2 | Allowlist ve cookie adı zaten config enjeksiyonu | `packages/ws-tunnel/src/proxy/tunnel-proxy.ts#isPathAllowed`; `#sessionCookieValue` |
| B3 | Path-prefix kırılganlıkları (absolute path / cookie çakışması / redirect) | `docs/architecture/WS-TUNNEL-OPAK-SERVIS-ERISIMI-MIMARISI.md` §7; `WS-TUNNEL-URUN-TESCILI.md` §8 |
| B4 | Cookie path'i tüketici route'unda set ediliyor (host modunda `/` olur) | `services/web-service/src/presentation/routes/field-session-routes.ts#fieldSessionRoutes` |

## 4. Mimari

### 4.1 Host-based erişim

```
Tarayıcı ── https://revpi-001.local-admin.hub.example.com/dashboard ──► nginx (TLS/SNI)
                                                                          │ server_name eşleşir
                                                                          ▼
                                                            Consumer HostRouter: host → {peerId, serviceId}
                                                                          │
                                                            opak proxy (kökte: "/dashboard") ──► peer agent ──► localhost fetch
                                                                          │
                                                            Set-Cookie (host-only, Path=/) ──► tarayıcı (first-party)
```

- Uygulama kendini **kök**'te sanar → absolute asset/redirect/WS URL'leri doğal çalışır.
- Cookie host bazında izole → çoklu peer çakışması ve `Domain` reddi ortadan kalkar.
- Paket aynı `IHubChannel`/`IStreamSink`/`TunnelProxy` sözleşmelerini kullanır — **lib değişmez**.

### 4.2 Geçiş stratejisi

| Ortam | Model |
|:------|:------|
| Dev | Path-prefix (mevcut; DNS/cert gerekmez) |
| Prod (tetik öncesi) | Path-prefix + NIS-2 HTTPS |
| Prod (tetik sonrası) | Host-based (+ path-prefix geriye uyum için yan yana) |

Geçiş geri alınabilir: host eşlemesi config'te olduğundan path-prefix rotaları korunur.

## 5. Purity Kuralları

1. `packages/ws-tunnel` DEĞİŞMEZ — host çözümlemesi ve eşleme tüketicide yaşar.
2. Domain/tenant bilgisi pakete girmez; host şablonu config'dir.
3. Bilinmeyen host fail-closed (404); joker host eşlemesi YASAK (K4).
4. Cookie/sır kuralları İP-1/İP-2 sözleşmelerine tabidir (hash, redacted, fail-closed).
5. Tek erişim çözümleyici sözleşmesi (`resolveAccessContext`) — path ve host modları aynı fonksiyonu besler.
6. Deployment (DNS/cert/nginx) `AGENTS-DEPLOYMENT.md` sözleşmesine uyar; sırlar repoda tutulmaz.

## 6. Use Case'ler

### 6.1 UC-1 — Host → bağlam çözümleme (consumer)

**Status:** ⛔ Defer (A1 — tetik koşulunda aktive)

**Kapsam:**
- dahil: Host başlığını config eşlemesinden `{peerId, serviceId}`'ye çözme; bilinmeyen host reddi; path moduyla tek sözleşme.
- hariç: proxy akışı (UC-2); deployment (UC-3); lib değişikliği.

**Akış:**
1. İstek gelir; Host başlığı okunur.
2. Config eşlemesi (`host → {peerId, serviceId}`) çözülür.
3. Bilinmeyen host → 404; bilinen → erişim bağlamı üretilir.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-1.1 | Host başlığı config eşlemesinden `{peerId, serviceId}`'ye çözülmeli; bilinmeyen host 404 dönmeli (joker YOK) | AK-1.1 |
| FR-1.2 | Çözümleme, İP-1 path moduyla aynı `resolveAccessContext` sözleşmesini kullanmalı | AK-1.2 |

**Kabul Senaryoları (GWT):**
1. **AK-1.1 — GIVEN** config'te `revpi-001.local-admin.hub.example.com → {revpi-001, local-admin}` **WHEN** istek bu host'a gelir **THEN** bağlam çözülür; bilinmeyen host 404 alır.
2. **AK-1.2 — GIVEN** aynı peer/servis için path ve host modu **WHEN** çözümleme çalışır **THEN** ikisi de aynı `resolveAccessContext` çıktısını üretir.

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-1.1 | Host→bağlam config eşlemesi + 404 | unit | ⬜ |
| AK-1.2 | Tek çözümleyici sözleşmesi paylaşılır | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-1: `resolveAccessContext` host sürümü (config eşlemesi)
- [ ] T-2: Host çözümleme + bilinmeyen host testleri

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Host başlığı yok/bozuk | 400/404 (fail-closed) |
| Aynı host iki eşleme | Config hatası; açılış reddi |
| Path ve host aynı anda | Host öncelikli (config kararı) |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `services/web-service/src/presentation/routes/peer-service-routes.ts` | Host çözümleme (ortak çözümleyici) |
| `services/web-service/src/config/*` | host→bağlam eşleme config kaynağı |

### 6.2 UC-2 — Host-based opak erişim

**Status:** ⛔ Defer (A1 — tetik koşulunda aktive)

**Kapsam:**
- dahil: kök path opak proxy; per-host first-party cookie; XFO/CSP/Location uyumluluğu.
- hariç: Host çözümleme (UC-1); TLS/DNS (UC-3).

**Akış:**
1. Host çözülür (UC-1) → peer/servis belirlenir.
2. İstek kök path'iyle (`/...`) opak proxy'ye verilir.
3. Yanıt uyumluluk modunda (XFO/CSP/Location) döner; cookie host-only.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-2.1 | İstek kök path (`/...`) host'a göre peer servisine opak iletilmeli (prefix strip gerekmez) | AK-2.1 |
| FR-2.2 | Yanıt cookie'si per-host first-party, `Path=/` olmalı; `cookieName` config'ten gelmeli | AK-2.2 |
| FR-2.3 | Embedded uyumluluk: `X-Frame-Options`/`CSP frame-ancestors` strip + `Location` rewrite host modunda uygulanmalı (config'le) | AK-2.3 |

**Kabul Senaryoları (GWT):**
1. **AK-2.1 — GIVEN** host-based istek `/assets/app.js` **WHEN** işlenir **THEN** kök path peer'a iletilir, prefix strip gerekmez.
2. **AK-2.2 — GIVEN** uygulama `Set-Cookie` döner **WHEN** yanıt tarayıcıya ulaşır **THEN** cookie host-only first-party ve `Path=/` olur.
3. **AK-2.3 — GIVEN** yanıt `X-Frame-Options: DENY` taşır **WHEN** embedded mod açık **THEN** header strip edilir ve iframe yüklenir.

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-2.1 | Kök path opak proxy | integration | ⬜ |
| AK-2.2 | Per-host first-party cookie | integration | ⬜ |
| AK-2.3 | Embedded header uyumluluğu | integration | ⬜ |

**T Görev Listesi:**
- [ ] T-3: Host-based proxy rotası (kök path)
- [ ] T-4: Cookie/header uyumluluk modu (XFO/CSP/Location)
- [ ] T-5: Host-based erişim + cookie + header testleri

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| WS upgrade | Host modunda da Upgrade köprülenir |
| Uygulama `Domain=.x` cookie set eder | Tarayıcı reddeder → uygulama config'i düzeltilir (not) |
| Absolute redirect | Location rewrite ile host içinde kalır |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `services/web-service/src/presentation/routes/peer-service-routes.ts` | Host-based opak proxy |
| `services/web-service/src/infrastructure/container-session/fastify-stream-sink.ts` | Header/cookie uyumluluk adaptörü |

### 6.3 UC-3 — Deployment (wildcard DNS + TLS + SNI)

**Status:** ⛔ Defer (A1 — tetik koşulunda aktive)

**Kapsam:**
- dahil: wildcard DNS, wildcard TLS cert, nginx/hub SNI host routing, dinamik host türetme.
- hariç: uygulama kodu; lib değişikliği.

**Akış:**
1. `*.hub.<domain>` DNS + wildcard cert kurulur.
2. nginx `server_name` ile host'u hub'a yönlendirir (SNI).
3. Yeni peer için host config'ten üretilir.

**Gereksinimler (FR-x):**
| Kod | Gereksinim | Eşleşme |
|:----|:-----------|:--------|
| FR-3.1 | Wildcard DNS + wildcard TLS cert + SNI host routing kurulmalı | AK-3.1 |
| FR-3.2 | Yeni peer/servis host'u config'ten dinamik türetilmeli | AK-3.2 |

**Kabul Senaryoları (GWT):**
1. **AK-3.1 — GIVEN** wildcard DNS+TLS kurulu **WHEN** `https://x.hub.<domain>` açılır **THEN** SNI ile doğru servise yönlenir.
2. **AK-3.2 — GIVEN** yeni peer bağlandı **WHEN** host üretilir **THEN** config'ten dinamik atanır.

**Kabul Kriterleri:**
| Kod | Kriter | Kanıt | Durum |
|:----|:-------|:------|:------|
| AK-3.1 | Wildcard DNS/TLS/SNI | gözle | ⬜ |
| AK-3.2 | Dinamik host türetme | unit | ⬜ |

**T Görev Listesi:**
- [ ] T-6: nginx wildcard `server_name` + SNI config
- [ ] T-7: DNS/cert runbook + dinamik host config

**Edge Cases:**
| Durum | Davranış |
|:------|:---------|
| Cert süresi doldu | Erişim durur; yenileme runbook'ta |
| Host config yok | 404 (fail-closed) |

**Involved Files:**
| Dosya | Rol / Değişiklik |
|:------|:----------------|
| `AGENTS-DEPLOYMENT.md` | Wildcard DNS/cert/SNI sözleşmesi |
| `deployment/**` | nginx host routing config |

### 6.4 Paket Geneli Görevler

- [ ] T-8: `AGENTS-DEPLOYMENT.md` host-based geçiş bölümü + host-based loopback demo

## 7. Yaşam Döngüsü ve Hata Kategorileri

| Durum | Davranış |
|:------|:---------|
| Bilinen host | Bağlam çözülür; opak proxy |
| Bilinmeyen host | 404 (fail-closed, joker yok) |
| Peer stale/idle | Erişim reddi (İP-1 §7 ile aynı) |
| Cookie | Host-only first-party, `Path=/` |
| Embedded header | Uyumluluk modu açıkken XFO/CSP strip + Location rewrite |
| Geçiş geri alma | Path-prefix rotaları korunur (yan yana) |

Beklenen hata → `Result`; beklenmeyen → `DomainError`. Host çözümleme fail-closed'dır.

## 8. Başarı Kriterleri (SC-x)

| Kod | Kriter | Ölçüm |
|:----|:-------|:------|
| SC-1 | Host-based erişim path kırılganlıklarını (absolute path / cookie çakışması / absolute redirect) ortadan kaldırır | canlı foreign uygulama (RevPi) ile gözle kanıt |
| SC-2 | `packages/ws-tunnel` bu SPEC kapsamında DEĞİŞMEZ | `git diff` (paket boş) |
| SC-3 | Mevcut path-prefix akışları (v1 iframe + v2 makine erişimi) host-based ile yan yana bozulmadan çalışır | regresyon test seti yeşil |

## 9. Aşama Eşlemesi (iş akışı)

| Aşama | Ürün |
|:------|:-----|
| 1. SPEC | Bu doküman (⛔ Defer — tetik bekliyor) |
| 2. JSDoc | T-1/T-3 sözleşmeleri |
| 3. TEST | T-2, T-5 kırmızı testler |
| 4. IMPL | T-1, T-3, T-4, T-6, T-7 |
| 5. KAPANIŞ | `WS-TUNNEL-SUBDOMAIN-YONLENDIRME-KAPANIS.md` |

## 10. Açık Kararlar

| # | Konu | Durum |
|:--|:-----|:------|
| A1 | Geçiş tetiği (aktivasyon) | Tetik: absolute path/cookie/redirect kırılması veya NIS-2 HTTPS geçişi — aktive kararı developer'da |
| A2 | Host şablonu (`<service>.<peer>.*` vs `<peer>.*`) | Aktivasyonda kararlaştırılır |
| A3 | Wildcard cert sağlayıcı (kurumsal CA vs Let's Encrypt DNS-01) | Aktivasyonda |

## 11. İleri İş (bu pakette YAPILMAZ — referans)

1. Host şablonu optimizasyonu / çok-seviyeli subdomain.
2. Host bazlı RBAC policy'si (peer/service kapsamı genişletme).
3. mTLS — `WS-TUNNEL-BOOTSTRAP-KIMLIK-MIMARISI.md` A1 ile ortak konu.

## 12. T Görev Özeti

| Kod | Görev | UC | Dosya |
|:----|:------|:---|:------|
| T-1 | `resolveAccessContext` host sürümü | UC-1 | `services/web-service/src/presentation/routes/peer-service-routes.ts` |
| T-2 | Host çözümleme + bilinmeyen host testleri | UC-1 | `services/web-service/src/presentation/routes/peer-service-routes.test.ts` |
| T-3 | Host-based proxy rotası (kök path) | UC-2 | `services/web-service/src/presentation/routes/peer-service-routes.ts` |
| T-4 | Cookie/header uyumluluk modu | UC-2 | `services/web-service/src/infrastructure/container-session/fastify-stream-sink.ts` |
| T-5 | Host-based erişim testleri | UC-2 | `services/web-service/src/presentation/routes/peer-service-routes.test.ts` |
| T-6 | nginx wildcard `server_name` + SNI | UC-3 | `deployment/**` |
| T-7 | DNS/cert runbook + dinamik host config | UC-3 | `AGENTS-DEPLOYMENT.md` |
| T-8 | Deployment host-based bölümü + loopback demo | Genel | `AGENTS-DEPLOYMENT.md`, `tools/` |

**review_date:** 2026-10-16 — ilk sürüm (ertelenmiş, tetikte aktive); lib değişikliği yok.
