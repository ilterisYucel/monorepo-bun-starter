# @gd-monorepo/ws-tunnel-hub

ws-tunnel **hub-servisi** — peer kaydı, keşif, opak servis erişimi ve consumer
relay. Hexagonal (ports & adapters) mimari; domain/application katmanları
Fastify/ws/sqlite bilmez.

> SPEC: [WS-TUNNEL-HUB-SERVIS-MIMARISI.md](../../../docs/architecture/WS-TUNNEL-HUB-SERVIS-MIMARISI.md)

## Katmanlar

```
src/
├── domain/            # saf: PeerConnectionTracker, discovery-view, portlar
├── application/       # use-case'ler: RegisterPeer, DiscoverPeers, OpenServiceAccess,
│                      #   RelayControl, AuthenticatePeerToken/ConsumerToken, HealthCheck
├── infrastructure/
│   ├── inbound/       # Fastify rotaları, /ws/peer, /ws/consumer, stream sink
│   └── outbound/      # Env/Sqlite credential store, ConsoleLogger, MemoryAuditSink
├── config/            # env → HubConfig (fail-fast)
└── main.ts            # composition root (tüm wiring)
```

**Kural:** `domain/` ve `application/` altında Fastify/ws/sqlite/env importu YOKTUR.

## Uçlar

| Uç | Kimlik | Açıklama |
|:---|:-------|:---------|
| `WS /ws/peer` | `Authorization: Bearer <PEER_TOKEN>` | Peer uplink (register/heartbeat/stream) |
| `GET /peers` | — | Peer listesi (id/type/status/services) |
| `GET /peers/:peerId/services` | — | Servis listesi |
| `GET/POST/... /peers/:pid/services/:sid/*` | consumer token + `x-tunnel-user-*` | Opak HTTP erişimi |
| `WS /peers/:pid/services/:sid/ws/*` | consumer token + `x-tunnel-user-*` | Opak WS köprüsü |
| `POST /control/:peerId` | consumer token | Peer'a opak kontrol mesajı |
| `WS /ws/consumer` | consumer token | Peer'dan gelen opak mesajlar (`{peerId, message}`) |
| `GET /health` | — | Servis sağlığı |
| `POST /admin/peers` | consumer token | Peer + tek kullanımlık bootstrap üretir (sqlite modu) |
| `POST /peers/bootstrap/claim` | bootstrap token | Bootstrap → kalıcı `peerSecret` (sqlite modu) |
| `DELETE /admin/peers/:peerId` | consumer token | Kimlik iptali + aktif bağlantı düşürme |

**Consumer token'ı peer token'ından AYRIDIR** — peer'lar consumer kanalını açamaz.

## Auth modu

| Mod | Tetik | Davranış |
|:----|:------|:---------|
| `env` | `PEER_TOKEN` tanımlı | Tek paylaşılan token (dev/simple); bootstrap uçları PASİF |
| `sqlite` | `PEER_TOKEN` yok + `HUB_DB_PATH` var | Bootstrap + kalıcı secret + revocation (prod) |

İkisi de yoksa açılış fail-fast durur.

> Tarayıcı cookie front-door'u (iframe/login) P3'te (monorepo entegrasyonu) eklenir.

## Çalıştırma

```bash
PEER_TOKEN=... CONSUMER_TOKEN=... bun run start
bun run test
bun run typecheck
```

## Docker

İmaj monorepo kök bağlamından derlenir:

```bash
docker build -f packages/ws-tunnel-hub/Dockerfile -t ws-tunnel-hub .
docker compose -f packages/ws-tunnel-hub/compose.example.yml up
```

## Env

| Değişken | Varsayılan | Not |
|:---|:---|:---|
| `PORT` / `HOST` | `5003` / `0.0.0.0` | |
| `PEER_TOKEN` | — (env modunda zorunlu) | Tek paylaşılan peer token (dev) |
| `CONSUMER_TOKEN` | — (zorunlu) | Consumer kanalı kimliği |
| `HUB_DB_PATH` | — (sqlite modunda zorunlu) | SQLite dosyası (volume) |
| `HUB_COOKIE_NAME` | `tunnel_session` | |
| `HUB_ID` | — | Audit korelasyonu |
| `HUB_STALE_TIMEOUT_MS` | `45000` | Stale eşiği |
| `HUB_SWEEP_INTERVAL_MS` | `1000` | Sweep aralığı |
| `HUB_SESSION_TTL_MS` | `14400000` (4 sa) | Tarayıcı oturumu mutlak ömrü |
| `HUB_SESSION_IDLE_MS` | `900000` (15 dk) | Tarayıcı oturumu boşta kalma süresi |
| `HUB_STREAM_IDLE_MS` | `300000` (5 dk) | Tünel akışı boşta kalma süresi (terminal WS dahil) |
| `HUB_ALLOWED_PREFIXES` | — | Virgüllü ek allowlist |
| `HUB_BLOCKED_PREFIXES` | — | Virgüllü blocklist |
