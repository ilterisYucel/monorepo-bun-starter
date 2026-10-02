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
> [KONTEYNER-UZAKTAN-ERISIM-MIMARISI.md](docs/architecture/KONTEYNER-UZAKTAN-ERISIM-MIMARISI.md),
> [BOSS-UYGULAMA-MIMARISI.md](docs/architecture/BOSS-UYGULAMA-MIMARISI.md) §7.4,
> [WS-TUNNEL-KAPASITE-DEGERLENDIRMESI.md](docs/architecture/WS-TUNNEL-KAPASITE-DEGERLENDIRMESI.md).

## TunnelConnector sözleşmesi (MANDATORY — Faz 2)

- **Tek outbound WS (tasarım R4/R5):** Client→hub yalnızca `FIELD_WS_URL`'e outbound WSS; inbound TCP/HTTP YOKTUR. Kontrol mesajları + (Faz 3) tünel stream'leri AYNI kanaldan geçer.
- **Durum makinesi (tasarım §6):** `offline → connecting → registered → connected ↔ backoff`. Geçişler: register-ack ok → ilk heartbeat → connected; hata/401/register-timeout → backoff (`exp(2^n·1s)+jitter`, tavan 60 sn — `ReconnectDelay`); `stop()` → offline. Soket olaylarında `generation` koruması (bayat soket olayları yok sayılır).
- **Register (v2):** `{ type:"register", peerId, peerType:"container"|"field", protocolVersion:2 }` — nötr şema; **v2-ONLY** (v1 `containerId` desteği 2026-09-08'de kaldırıldı — fallback YOK). Bootstrap env (container tier): `FIELD_CONNECT_ENABLED` (default false), `FIELD_WS_URL` (virgüllü liste — ana+yedek), `CONTAINER_TOKEN` (secret, redacted), `CONTAINER_ID` (→ `peerId`). Etkinse eksik env → **fail-fast açılış reddi** (`fieldConnectorConfig`). Yalnızca container tier'da geçerli.
- **Operational config (canlı):** `register-ack.config` / `config-update` frame'leri → zod (`tunnelOperationalConfigSchema`, bilinmeyen anahtar strip) → geçerliyse heartbeat/telemetry aralıkları **restart'sız** uygulanır; geçersiz → `field_config_rejected` + eski config korunur. Hub tarafı: `ContainerProxy.pushConfigUpdate()` (DB saklama Faz 3/6 — DOGRULAMA S5).
- **Liveness:** client her heartbeat'te ping atar; 60 sn pong yoksa bağlantı yarı-ölü → kapat + backoff. Hub tarafı: heartbeat → `lastSeenAt`; son liveness işaretinden tam 45 sn sonra `"stale"` (per-entry zamanlayıcı); WS kapanırsa `"idle"` (kayıt + son telemetri korunur — §12.4).
- **Telemetri push:** `RealtimeSnapshotSource` = devices tablosu (`status='online'`) + RealtimeManager ring buffer başı; (deviceId,name) başına en yeni; hata → boş dizi (kademeli bozulma).
- **Test:** tunnel-connector branch kapısı ≥%90 (şu an %100); zaman davranışları `vi.useFakeTimers` ile; K2.1 gerçek-WS integration spec'i (`tunnel-connector.spec.ts`) + `bun tools/field-connector-demo.mjs` gözle demosu.

## Tünel sözleşmesi (MANDATORY — Faz 3)

- **Tek kanal:** Tünel stream'leri TunnelConnector'ın AYNI WS kanalından geçer; ayrı bağlantı YOKTUR. Text frame = kontrol mesajı, binary frame = akış verisi.
- **Binary frame (§4.2):** 9 bayt başlık (streamId u32 BE + seq u32 BE + flags); flags `FIN 0x01 | RST 0x02 | WS_OP 0x04`; WS*OP varken yüksek 4 bit opcode. Codec `packages/ws-tunnel/src/codec/frame-codec.ts` (2026-09-01'de ayrı jenerik pakete taşındı) — `decode` **asla throw etmez** (`Result<*,FrameDecodeError>`); encode programcı hatasında throw eder. `seq` her iki tarafça AYRI sayaçtır.
- **Stream yaşam döngüsü:** streamId'yi HUB atar (monoton). Akış: `stream-open` → `stream-open-ack {statusCode, headers}` → BINARY gövde (≤64 KiB parça) → `FIN`; hata → `RST`; iki taraf da `stream-close` gönderebilir. HTTP akışlarında `stream-window` kredisi zorunludur (kredi yoksa gövde DURUR — deadlock yok: idle sweep kapatır).
- **Yönlendirme (client):** `/api/*` + `/ws/*` → `TUNNEL_API_UPSTREAM`; diğer her şey → `TUNNEL_STATIC_UPSTREAM` (nginx SPA). WS köprüsü aynı upstream'in `ws://` türevine bağlanır.
- **Oturum (§5.4-§5.7):** `open-session` → client KENDİ secret'iyle JWT üretir (`ITokenSigner` sözleşmesi; monorepo `JoseTokenSigner` implementasyonu `type:"container-session"` etiketi basar — access token'la karışmaz) → `open-session-ack`; cookie `container_session` **Path-scoped** `/containers/<cid>/ui`, HttpOnly. Hub tarafı cookie'yi `HubSessionStore`'a eşler; client tarafı `ClientSessionStore`'a. Kullanıcı client DB'sine ASLA yazılmaz. Rol eşlemesi hub'da: admin/teknik→admin, boss→guest, guest→oturum YOK.
- **Allowlist (hub, §5.6):** `/api/*`, `/ws/*`, `/assets/*`, `/favicon*`, `/`; YASAKLILAR: `/api/auth/login`, `/api/auth/refresh`, `/api/auth/users`. Limitler: 1 etkileşimli oturum/peer, 16 eşzamanlı stream, pencere 256 KiB, TTL 4 sa, idle 15 dk. Allowlist/cookie adı deployment-bazlı config'le enjekte edilir (`PathAllowlist`, `cookieName`).
- **Audit fail-closed:** `SessionAudit.open` security logu yazılamazsa oturum AÇILMAZ; `session_audit` INSERT açılışta, UPDATE kapanışta.
- **Test:** codec + session-gateway + tunnel-client + tunnel-proxy branch ≥%90 (şu an %92.5-100); uçtan uca `tunnel.spec.ts` (K3.1-K3.3) + `bun tools/tunnel-demo.mjs` gözle demosu.
- **İkinci deployment (boss uplink):** Aynı paket field→boss topolojisinde de çalışır (`peerType:"field"`; boss'ta `SessionGateway`+`TunnelProxy`, field'da `TunnelConnector`) — ayrıntı: [BOSS-UYGULAMA-MIMARISI.md](docs/architecture/BOSS-UYGULAMA-MIMARISI.md) §7.4 + [WS-TUNNEL-URUN-TESCILI.md](docs/architecture/WS-TUNNEL-URUN-TESCILI.md).
- **Operasyon komut kanalı:** boss→field `operation-execute` / `operation-result` kontrol mesajları ile uzak manevra/operasyon yürütme — sözleşme [KOMUT-MANEVRA-OPERASYON-MIMARISI.md](docs/architecture/KOMUT-MANEVRA-OPERASYON-MIMARISI.md) §5 + WS-TUNNEL spec §5; kanal adaptörü `TunnelManeuverChannel`, rota `operation-boss-routes.ts`.
