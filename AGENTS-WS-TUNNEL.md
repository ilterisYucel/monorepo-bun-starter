---
status: active
space: agents
tags: [agents, referans, tunnel, connector, ws]
review_date: 2026-12-01
---

# AGENTS Detay Referansı — WS Tunnel / Connector

> Bu doküman `AGENTS.md`'den ayrılan **referans** içeriktir; her oturumda yüklenmez.
> `ws-tunnel`, `TunnelConnector`, tünel protokolü veya tünel oturumuna dokunacaksan
> **önce bu dokümanı oku** (sözleşmeler MANDATORY'dir).
>
> Authoritative kaynaklar:
> [WS-TUNNEL-URUN-TESCILI.md](docs/architecture/WS-TUNNEL-URUN-TESCILI.md),
> [deprecated/KONTEYNER-UZAKTAN-ERISIM-MIMARISI.md](docs/architecture/deprecated/KONTEYNER-UZAKTAN-ERISIM-MIMARISI.md),
> [BOSS-UYGULAMA-MIMARISI.md](docs/architecture/BOSS-UYGULAMA-MIMARISI.md) §7.4,
> [WS-TUNNEL-KAPASITE-DEGERLENDIRMESI.md](docs/architecture/WS-TUNNEL-KAPASITE-DEGERLENDIRMESI.md).

## TunnelConnector sözleşmesi (MANDATORY — Faz 2)

- **Tek outbound WS (tasarım R4/R5):** Client→hub yalnızca `FIELD_WS_URL`'e outbound WSS; inbound TCP/HTTP YOKTUR. Kontrol mesajları + (Faz 3) tünel stream'leri AYNI kanaldan geçer.
- **Durum makinesi (tasarım §6):** `offline → connecting → registered → connected ↔ backoff`. Geçişler: register-ack ok → ilk heartbeat → connected; hata/401/register-timeout → backoff (`exp(2^n·1s)+jitter`, tavan 60 sn — `ReconnectDelay`); `stop()` → offline. Soket olaylarında `generation` koruması (bayat soket olayları yok sayılır).
- **Register (v2):** `{ type:"register", peerId, peerType:"container"|"field", protocolVersion:2 }` — nötr şema; **v2-ONLY** (v1 `containerId` desteği 2026-09-08'de kaldırıldı — fallback YOK). Bootstrap env (container tier): `FIELD_CONNECT_ENABLED` (default false), `FIELD_WS_URL` (virgüllü liste — ana+yedek), `CONTAINER_TOKEN` (secret, redacted), `CONTAINER_ID` (→ `peerId`). Etkinse eksik env → **fail-fast açılış reddi** (`fieldConnectorConfig`). Yalnızca container tier'da geçerli.
- **Operational config (canlı):** `register-ack.config` / `config-update` frame'leri → zod (`tunnelOperationalConfigSchema`, bilinmeyen anahtar strip) → geçerliyse heartbeat aralığı **restart'sız** uygulanır; geçersiz → enjekte edilen `configRejected` kodu + eski config korunur. Hub tarafı: `ContainerProxy.pushConfigUpdate()` (DB saklama Faz 3/6 — DOGRULAMA S5).
- **Liveness:** client her heartbeat'te ping atar; 60 sn pong yoksa bağlantı yarı-ölü → kapat + backoff. Hub tarafı: heartbeat → `lastSeenAt`; son liveness işaretinden tam 45 sn sonra `"stale"` (per-entry zamanlayıcı); WS kapanırsa `"idle"` (kayıt korunur — §12.4).
- **Domain mesajları pakette DEĞİL:** telemetri/operation/event tipleri ve snapshot push `tunnel-extensions` (tüketici) modülündedir; paket yalnız transport taşır. Log kodları `eventCodes` ile enjekte edilir (varsayılan nötr).
- **Test:** tunnel-connector branch kapısı ≥%90 (şu an %100); zaman davranışları `vi.useFakeTimers` ile; K2.1 gerçek-WS integration spec'i (`tunnel-connector.spec.ts`) + `bun tools/field-connector-demo.mjs` gözle demosu.

## Tünel sözleşmesi (MANDATORY — Faz 3)

- **Tek kanal:** Tünel stream'leri TunnelConnector'ın AYNI WS kanalından geçer; ayrı bağlantı YOKTUR. Text frame = kontrol mesajı, binary frame = akış verisi.
- **Binary frame (§4.2):** 9 bayt başlık (streamId u32 BE + seq u32 BE + flags); flags `FIN 0x01 | RST 0x02 | WS_OP 0x04`; WS*OP varken yüksek 4 bit opcode. Codec `packages/ws-tunnel/src/codec/frame-codec.ts` (2026-09-01'de ayrı jenerik pakete taşındı) — `decode` **asla throw etmez** (yerel `Result<*,FrameDecodeError>`); encode programcı hatasında throw eder. `seq` her iki tarafça AYRI sayaçtır.
- **Stream yaşam döngüsü:** streamId'yi HUB atar (monoton). Akış: `stream-open` → `stream-open-ack {statusCode, headers}` → BINARY gövde (≤64 KiB parça) → `FIN`; hata → `RST`; iki taraf da `stream-close` gönderebilir. HTTP akışlarında `stream-window` kredisi zorunludur (kredi yoksa gövde DURUR — deadlock yok: idle sweep kapatır).
- **Yönlendirme (client):** varsayılan `/api/*` + `/ws/*` → `TUNNEL_API_UPSTREAM`; diğer her şey → `TUNNEL_STATIC_UPSTREAM`. Tüketici `routeUpstream` ile kendi kuralını enjekte edebilir. WS köprüsü aynı upstream'in `ws://` türevine bağlanır.
- **Oturum (§5.4-§5.7):** `open-session` → client KENDİ secret'iyle JWT üretir (`ITokenSigner` sözleşmesi; monorepo `JoseTokenSigner` implementasyonu `type:"container-session"` etiketi basar — access token'la karışmaz) → `open-session-ack`; cookie adı tüketici enjekte eder (paket varsayılanı nötr `tunnel_session`); tüketici **Path-scoped** `/containers/<cid>/ui`, HttpOnly uygular. Hub tarafı cookie'yi `HubSessionStore`'a eşler; client tarafı `ClientSessionStore`'a. Kullanıcı client DB'sine ASLA yazılmaz. Rol eşlemesi hub'da: admin/teknik→admin, boss→guest, guest→oturum YOK.
- **Allowlist (hub, §5.6):** paket varsayılanı yalnız jenerik yollar (`/api/*`, `/ws/*`, `/assets/*`, `/favicon*`, `/`); domain yasaklıları (`/api/auth/*`) TÜKETİCİ enjekte eder (paket varsayılan blocklist BOŞ). Limitler: 1 etkileşimli oturum/peer, 16 eşzamanlı stream, pencere 256 KiB, TTL 4 sa, idle 15 dk. Allowlist/cookie adı deployment-bazlı config'le enjekte edilir (`PathAllowlist`, `cookieName`).
- **Audit fail-closed:** `SessionAudit.open` security logu yazılamazsa oturum AÇILMAZ; `session_audit` INSERT açılışta, UPDATE kapanışta.
- **Test:** codec + session-gateway + tunnel-client + tunnel-proxy branch ≥%90 (şu an %92.5-100); uçtan uca `tunnel.spec.ts` (K3.1-K3.3) + `bun tools/tunnel-demo.mjs` gözle demosu.
- **İkinci deployment (boss uplink):** Aynı paket field→boss topolojisinde de çalışır (`peerType:"field"`; boss'ta `SessionGateway`+`TunnelProxy`, field'da `TunnelConnector`) — ayrıntı: [BOSS-UYGULAMA-MIMARISI.md](docs/architecture/BOSS-UYGULAMA-MIMARISI.md) §7.4 + [WS-TUNNEL-URUN-TESCILI.md](docs/architecture/WS-TUNNEL-URUN-TESCILI.md).
- **Operasyon komut kanalı (tüketici):** boss→field `operation-execute` / `operation-result` mesaj tipleri `tunnel-extensions`'ta; jenerik kontrol kanalından taşınır — sözleşme [KOMUT-MANEVRA-OPERASYON-MIMARISI.md](docs/architecture/KOMUT-MANEVRA-OPERASYON-MIMARISI.md) §5 + WS-TUNNEL spec §5; kanal adaptörü `TunnelManeuverChannel`, rota `operation-boss-routes.ts`.

## Paket sınırı sözleşmesi (MANDATORY — bağımsız paket)

> Kaynak: [WS-TUNNEL-DOMAIN-KALINTI-ARINDIRMA-MIMARISI.md](docs/architecture/WS-TUNNEL-DOMAIN-KALINTI-ARINDIRMA-MIMARISI.md).

- **Bağımlılık:** `packages/ws-tunnel` yalnız `ws` + `zod` kullanır (test yardımcısı `jose` devDep). `@gd-monorepo/*` importu **YASAK** — paket monorepo'dan bağımsız/ayrı ürün olarak import edilir.
- **Result:** yerel `src/result/` (monorepo result paketi DEĞİL); `Result` + `DomainError` taksonomisi birebir API.
- **Telemetri/operation/event:** pakette YOKTUR; `tunnel-extensions` (tüketici) modülünde yaşar. Wire JSON şekilleri değişmez (eski peer'lar uyumlu).
- **Enjeksiyon:** cookie adı, allowlist blocklist, connector log kodları (`eventCodes`), upstream kuralı (`routeUpstream`) tüketicide tanımlanır; paket varsayılanları nötr.
- **İsim:** `fieldId` → `hubId` (audit + `SessionOpenInput`).
- **Paketleme:** `build` JS + `dist/index.d.ts` üretir; `exports` dist'i gösterir.

## Opak servis erişimi sözleşmesi (MANDATORY — jenerik peer servis keşfi/erişimi)

> Kaynak: [WS-TUNNEL-OPAK-SERVIS-ERISIMI-MIMARISI.md](docs/architecture/WS-TUNNEL-OPAK-SERVIS-ERISIMI-MIMARISI.md). Bu bölüm, AI ajanlarının pakete domain/telemetri/endpoint sızdırmasını engeller.

- **Pakete girmez:** `packages/ws-tunnel` core'una **TelemetryData/telemetri tipi, HTTP route/web-endpoint kodu, domain kelimesi (BESS/konteyner/field/revpi)** EKLENEMEZ. Keşif + erişim tüketicide (web-service) yaşar.
- **Duyuru opaktır:** `register.services[]` yalnız `id` + kozmetik `meta{title?,icon?}` taşır. Hedef adres / `protocol` / `health` / `endpoint` alanı **YASAK** — `serviceAnnouncementSchema` STRICT reddeder. Hedef adres peer'ın lokal config'inde kalır (SSRF ilkesi).
- **Erişim ≠ keşif:** Erişim (`/peers/:peerId/services/:serviceId/*` → opak proxy) ile keşif (`GET /peers`, `GET /peers/:id/services` — hub'ın kendi REST API'si) ayrıdır. Yabancı peer uygulamasından hiçbir API beklenmez; yalnız yanında peer agent çalışır.
- **Peer tipleri enum'da:** `TunnelPeerType = "container" | "field" | "device"` — serbest string DEĞİL. Yeni tip yalnız kayıtlı ihtiyaçla eklenir; domain anlamı `meta`'da yaşar.
- **Push-based keşif:** Peer kendini duyurur; **ağ taraması (mDNS/ARP/port scan) YASAK**. Peer↔peer doğrudan erişim YOK — tüm trafik hub üzerinden (istisna: nested hub; field kendi konteynerlerinin hub'ıdır).
- **Saf kayıt:** `HubPeerRegistry` (paket) saftır — WS/timer/HTTP/persistence bağımlılığı taşımaz. Taşıma (`FieldRegistry`: WS + token + stale) onu kompoze eder; Faz 3 hub-servis ayrımında birlikte taşınır.
- **Var olan akışlar korunur:** v1 iframe (`/containers/:cid/ui/*`) ve v2 makine erişimi (`execute-multi`, `TunnelManeuverChannel`) değişmez; jenerik erişim additive'dir.

## Hub-servis sözleşmesi (MANDATORY — hexagonal)

> Kaynak: [WS-TUNNEL-HUB-SERVIS-MIMARISI.md](docs/architecture/WS-TUNNEL-HUB-SERVIS-MIMARISI.md).

- **Hexagonal zorunlu:** `packages/ws-tunnel-hub/src/{domain,application}` altında **Fastify/ws/bun:sqlite/env importu YASAK**. Dış bağımlılık yalnız portlardan (`IHubChannel`, `IPeerCredentialsStore`, `IConsumerCredentials`, `IConsumerRelay`, `IAuditSink`, `ILogger`).
- **Use-case önce:** Yeni davranış eklenirken önce use-case + port sözleşmesi yazılır; adapter yalnız taşıma/çeviri yapar.
- **Wire uyumu:** `/ws/peer` register/ack/heartbeat/session/stream frame'leri paketle birebir; hub domain mesajlarını yorumlamaz (opak relay).
- **Kanal izolasyonu:** Peer token'ı `/ws/peer`; consumer token'ı `/control` + `/ws/consumer`. Ayrı env değerleri, kesişemez.
- **Docker:** İmaj monorepo kök bağlamından derlenir (`-f packages/ws-tunnel-hub/Dockerfile .`); runtime `oven/bun:slim`, `HEALTHCHECK /health`, volume `/data`.

## Bootstrap ve peer kimliği sözleşmesi (MANDATORY — hub-servis)

> Kaynak: [WS-TUNNEL-BOOTSTRAP-KIMLIK-MIMARISI.md](docs/architecture/WS-TUNNEL-BOOTSTRAP-KIMLIK-MIMARISI.md).

- **Kimlik otoritesi hub-servis'tir.** Bootstrap üretimi/claim/revoke use-case + port (`IPeerBootstrapRepository`, `IPeerDisconnector`); sqlite yalnız outbound adapter.
- **Bootstrap tek kullanımlık + TTL (24h)**; token/secret yalnız **hash** olarak saklanır, düz metin yalnız yanıtta bir kez. Sır loglanmaz.
- **Wire değişmez:** claim HTTP üzerinden; `/ws/peer` register/ack/heartbeat aynı. Paket (`@gd-monorepo/ws-tunnel`) bu akışta DEĞİŞMEZ.
- **Auth modu:** `PEER_TOKEN` → env (dev/simple); yoksa sqlite + bootstrap (prod). İkisi de yoksa açılış fail-fast.
- **Revocation:** önce kimlik iptali, sonra aktif WS kapatma; re-enrollment yalnız yeni bootstrap ile.
- **Runtime ayrımı:** sqlite DB porttan enjekte edilir — prod `bun:sqlite`, vitest/Node `node:sqlite` (test helper). Adapter runtime bilmez.
