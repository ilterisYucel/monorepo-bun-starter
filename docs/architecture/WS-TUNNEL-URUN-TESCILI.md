---
status: active
space: architecture
tags: [mimari, ws-tunnel, urun, paket, yeniden-kullanim, arindirma]
review_date: 2026-09-07
---

# ws-tunnel Ürün Tescili ve Uygulama-Bazlı Kırılganlık Arındırma Planı

Tarih: 2026-09-07
Durum: ARINDIRMA TAMAMLANDI (2026-09-07) — v2 yayında; F1-F7 çözüldü, deprecated alias YOK (tek seferde geçiş)
İlgili dokümanlar: [BOSS-UYGULAMA-MIMARISI.md](./BOSS-UYGULAMA-MIMARISI.md) (§7.4), [KUTUPHANE-CIKARMA-PLANI.md](./KUTUPHANE-CIKARMA-PLANI.md), [KONTEYNER-UZAKTAN-ERISIM-MIMARISI.md](./KONTEYNER-UZAKTAN-ERISIM-MIMARISI.md)

---

## 1. Amaç

`@gd-monorepo/ws-tunnel` bugüne kadar **tek bir topolojide** (field→container) kullanıldı. Boss uygulamasının **Field Uplink** kararı (BOSS-UYGULAMA-MIMARISI.md D7) ile paket ilk kez **ikinci, bağımsız bir topolojide** (field→boss) kurulacak. Bu doküman iki şeyi tescil eder:

1. **Ürün iddiası:** Aynı jenerik paketin, kod çatallanmadan iki farklı deployment'a hizmet etmesi — paketin "ayrı ürün" niteliğinin (tamper-logger deseni) ilk üretim kanıtı.
2. **Arındırma fırsatı:** İkinci kurulum, paketteki **ilk kurulumdan miras kalan uygulama-bazlı kırılganlıkları** (isimler, sabitler, şemalar) görünür kılar. Bunları sürümlü ve geriye uyumlu biçimde çözüp üstüne düşünmek için en uygun an tam şimdidir.

## 2. Tescil Argümanı

Paket, ikinci deployment'a hangi parçalarla girer (BOSS-UYGULAMA-MIMARISI.md §7.4.2 tablosu özeti):

| ws-tunnel parçası | Mevcut kullanım (field→container) | Yeni kullanım (field→boss) |
|---|---|---|
| `FrameCodec` + stream multiplex + kredi + WS köprüsü | Konteyner UI akışı | Field app SPA akışı — **sıfır değişiklik** |
| `FieldConnector` (durum makinesi, backoff, generation) | Konteyner field'a bağlanır | **Field boss'a bağlanır** — aynı sınıf, farklı uç nokta |
| `TunnelProxy` + `FieldSessionStore` + `ContainerSessionGateway` | Field tier'da | Boss tier'da — yalnızca `IFieldChannel` adapter'ı değişir |
| Monorepo adapter'leri (`FastifyStreamSink`, `JoseTokenSigner`, `SessionAudit`) | Field tier'da | Boss tier'da — `ITokenSigner` etiketi `type:"field-session"` olur |

Kanıt zinciri: paket yalnızca `ws` + `zod`'a bağımlıdır; domain parçaları enjeksiyonla gelir (`IFieldChannel`, `IStreamSink`, `IAuditSink`, `ITokenSigner`). İkinci kurulumda **paket koduna dokunulmadan** çalışması beklenir; dokunulacak yerler yalnızca aşağıdaki kırılganlık envanteridir — ve bunlar da "çalışmıyor" değil, "isim/sabit olarak ilk kuruluma yapışık" durumdadır.

## 3. Uygulama-Bazlı Kırılganlık Envanteri

Hepsi `packages/ws-tunnel/src/` içinde; satır referansları güncel koddandır.

| # | Kırılganlık | Konum | Yeni deployment'ta etkisi | Önerilen çözüm |
|---|-------------|-------|---------------------------|----------------|
| F1 | `RegisterMessage.containerId` — register şemasındaki tek domain-bazlı alan | `protocol/messages.ts:111` (kullanım: `connector/field-connector.ts:282,410`) | Field, boss'a `fieldId` ile register olmalı; `containerId` alanına `fieldId` doldurmak protokol yalanı olur | **Karar (a):** alanı `peerId`'ye genelle; protokol sürümü yükselt (bkz. §4) |
| F2 | `FIELD_*` isim ailesi: `FIELD_PROTOCOL_VERSION`, `FIELD_MESSAGE_TYPES`, `FieldOperationalConfig`, `DEFAULT_FIELD_OPERATIONAL_CONFIG`, `FieldConnectorState`, `FieldConnectionStatus` | `protocol/messages.ts:12,53,68,82,89,292` | İkinci deployment'ta "field" isimleri yanlış okunur | Nötr `TUNNEL_*` isimler; eskiler deprecated alias kalır |
| F3 | Sınıf isimleri ilk kuruluma yapışık: `FieldConnector`, `FieldSessionStore`, `ContainerSessionStore`, `ContainerSessionGateway` | `connector/field-connector.ts`, `proxy/field-session-store.ts`, `session/session-store.ts`, `proxy/session-gateway.ts` | Boss tier'da "ContainerSessionGateway" kullanmak kafa karıştırır | Nötr adlandırma (örn. `TunnelConnector`, `SessionRegistry`…) — adlar AGENTS.md sözleşmelerinde yerleşik olduğundan **alias + kademeli geçiş** |
| F4 | Cookie adı sabiti `"container_session"` | `proxy/tunnel-proxy.ts:74-81` (`containerSessionCookie`) | Boss oturumu farklı cookie (`field_session`) kullanmalı — karışmazlık A8 riski | `cookieName` config'e taşınır (varsayılan korunur) |
| F5 | Path allowlist sabitleri — `isPathAllowed(path)` deployment-bazlı yasaklıları bilmiyor | `proxy/tunnel-proxy.ts:86-87` | Boss tarafı farklı uçları yasaklamalı (örn. `/api/admin/*`) | Allowlist/blocklist config enjeksiyonu (varsayılanlar korunur) |
| F6 | Limit sabitleri: pencere 256 KiB, 16 stream, idle 15 dk, TTL 4 sa, oturum/konteyner=1 | `proxy/tunnel-proxy.ts:37-40,140-143`, `proxy/session-gateway.ts:43,86`, `proxy/field-session-store.ts:29-47` | Çoğu **zaten config'le aşılabilir** (`config.x ?? DEFAULT`); kırılganlık yalnızca isimlerde (`maxSessionsPerContainer`) | Doğrula; `maxSessionsPerContainer` → `maxSessionsPerPeer` |
| F7 | `telemetry` push mesajı ve `FieldConnectionStatus` yalnızca konteyner telemetri anlamını taşır | `protocol/messages.ts:292` | Field summary push'u da "telemetry" olarak taşınır — anlam daralması | Mesaj adını nötr tut (örn. `telemetry` korunur, payload tipi genişler) veya `status-push` ekle — Faz 3 tasarımında karar |

Kapsam dışı (kırılganlık değil): `ws`+`zod` bağımlılık sınırı, `decode` hiç throw etmez garantisi, branch kapıları (%92.5-100) — bunlar zaten ürün nitelikleridir.

## 4. Arındırma Stratejisi (sürümlü, geriye uyumlu)

1. **Protokol sürümü:** `TUNNEL_PROTOCOL_VERSION = 2` tanımlanır; `FIELD_PROTOCOL_VERSION` (1) deprecated alias olarak kalır. V2'de register şeması `peerId` taşır; v1 mesajları eski `containerId` ile çalışmaya devam eder (sunucu her ikisini de kabul eder — sunucu sürümü geriye uyumludur).
2. **İsimler:** Yeni `TUNNEL_*`/nötr isimler asıl, eski `FIELD_*` isimler `@deprecated` alias. JS tarafında `export const TUNNEL_PROTOCOL_VERSION = ...; /** @deprecated */ export const FIELD_PROTOCOL_VERSION = TUNNEL_PROTOCOL_VERSION;` deseni.
3. **Sınıflar:** Nötr adlar eklenir; eski adlar yeniden-export alias. AGENTS.md kontrat bölümleri yeni adlarla güncellenir. Mevcut field/container deployment'ları hiçbir kırıcı değişiklik almaz (Faz kapanışında `bun run test` tüm monorepo yeşil şartı).
4. **Config'ler:** F4 (cookieName), F5 (allowlist/blocklist) varsayılanları koruyarak config'e taşınır.
5. **Adımlama:** (1) bu envanterin karakterizasyon testleriyle sabitlenmesi (mevcut testler zaten kapsıyor — rename öncesi yeşil doğrulanır), (2) Faz 3 tasarımında nötr şema/versiyon kararları, (3) rename + config genellemesi tek PR'da değil, bağımsız görevlerde, (4) monorepo adapter'lerinin (web-service) yeni adlara geçişi.
6. **Bloklamama kuralı:** Uplink, paket **olduğu haliyle** çalışabilir (F1 `fieldId → containerId` geçici eşlemesiyle bile). Arındırma, uplink'i bloklayan bir ön şart DEĞİLDİR; paralel görevdir. Kırılganlıkla yaşamak istemiyorsak düzeltiriz, teslim tarihini değil.

## 5. Ürünleştirme Kontrol Listesi (Faz A/B'den kalan + yeni)

| # | Madde | Durum |
|---|-------|-------|
| P1 | LICENSE + CHANGELOG + sürüm politikası | Açık (Faz B'de ticari gerekçeyle ertelendi) |
| P2 | CI publish akışı (npm/özel registry) | Açık |
| P3 | README ürün beyanı: "tek paket, iki topoloji" (loopback demo + field→container + field→boss) | Boss uplink kapanışında güncellenir |
| P4 | Nötr isimlendirme (F1-F7) | ✅ 2026-09-07 — v2 tek seferde geçirildi; alias yok; tüm monorepo yeşil (1490 test, 23 build) |
| P5 | Üçüncü taraf benimseme kanıtı (monorepo dışı kullanım) | İleride; öncelik değil |
| P6 | Boss uplink uçtan uca demosu (`tools/` deseni — field-connector-demo.mjs benzeri) | Faz 3 görev listesinde |

## 6. Doğrulama

- Karakterizasyon: rename öncesi `nx run ws-tunnel:test` (1471 monorepo testinin parçası) tamamen yeşil; rename sonrası aynı davranış testlerle kanıtlı.
- Kapı: ws-tunnel branch ≥%90 (mevcut %92.5-100 korunur).
- Gözle kontrol: boss uplink demodan sonra hem field→container hem field→boss akışlarının aynı paket sürümüyle çalıştığının canlı kanıtı (BOSS-UYGULAMA-DOGRULAMA.md Faz 3).

## 7. Açık Kararlar

| # | Konu | Ne zaman |
|---|------|----------|
| K1 | Nötr isim seti | ✅ KARARLANDI: `TunnelConnector`, `SessionGateway`, `HubSessionStore`, `ClientSessionStore/Server`, `IHubChannel`, `sessionCookieValue` |
| K2 | V2 register şeması | ✅ KARARLANDI: `peerId` + zorunlu `peerType` (`container`\|`field`); `TUNNEL_PROTOCOL_VERSION=2`; **v2-ONLY** — hub'daki v1 `containerId` fallback'i 2026-09-08'de kaldırıldı |
| K3 | `telemetry` mesaj adı | ✅ KORUNDU (payload `TunnelTelemetryPoint[]` — field uplink snapshot kaynağı aynı çerçeveden push eder); olay aktarımı için additif jenerik `EventMessage` eklendi (Boss Faz 5) — telemetri ile karıştırılmadı |
| K4 | Alias yönetimi | ✅ TEK SEFERDE geçiş — alias hiç yayımlanmadı; tüm tüketiciler aynı turda v2'ye alındı |
