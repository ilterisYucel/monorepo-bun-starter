# @gd-monorepo/ws-tunnel

Jenerik, çoklanmış WebSocket tüneli — tek outbound bağlantı üzerinden HTTP/WS
reverse proxy + oturum yönetimi. GD-PMS monorepo'sundan **bağımsız bir
kütüphanedir** (tamper-logger deseni; ayrıntı:
`docs/architecture/KUTUPHANE-CIKARMA-PLANI.md`). Domain adapter'leri
(Fastify/PG/ContainerProxy) tüketici projede yaşar.

**İki deployment, tek paket (v2):** aynı jenerik paket hem
**field→container** hem **field→boss** topolojisinde çalışır — register şeması
nötr `peerId`+`peerType`, oturum/cookie/allowlist config'le enjekte edilir
(ayrıntı: `docs/architecture/WS-TUNNEL-URUN-TESCILI.md`).

## İçerik

| Modül | Görev |
|---|---|
| `codec` | Binary frame codec — 9 bayt başlık (streamId u32 BE + seq u32 BE + flags FIN/RST/WS_OP); `decode` asla throw etmez (`Result`) |
| `protocol` | Kontrol mesaj tipleri + zod şemaları (register/ack — v2 `peerId`+`peerType`, heartbeat, telemetry, stream-*, open-session/*); `TUNNEL_PROTOCOL_VERSION = 2` |
| `connector` | `TunnelConnector` — outbound WS istemcisi + durum makinesi + üstel backoff (`ReconnectDelay`) |
| `channel` | `ISocketClient`/`WsSocketClient` (ws adapter), `ITunnelChannel` (client ucu), `IHubChannel` (hub ucu — peerId'li) |
| `client` | `TunnelClient` — stream multiplex, kredi bazlı backpressure, çift upstream yönlendirme, WS köprüsü |
| `session` | `ClientSessionStore` + `ClientSessionServer` — geçici oturum JWT'si (`ITokenSigner` enjeksiyonu) |
| `proxy` | `SessionGateway` + `HubSessionStore` + `TunnelProxy` — hub tarafı oturum + HTTP/WS proxy (`IHubChannel`/`IStreamSink`/`IAuditSink` enjeksiyonu; cookieName + PathAllowlist config'i) |
| `logger` / `token` / `audit` / `snapshot` / `types` | Bağımsızlık sözleşmeleri — minimal `ILogger`, `ITokenSigner`, `IAuditSink`, `ISnapshotSource`, jenerik `TunnelRole`/`TunnelUser`/`TunnelTelemetryPoint` |

## Bağımlılıklar

`ws`, `zod`, `@gd-monorepo/result` — başka bir şey yok. (`jose` yalnızca
devDependency — test yardımcısı; üretim kodu `ITokenSigner` enjeksiyonuyla
çalışır.)

## Örnek — loopback uçtan uca (monorepo'suz)

```bash
bun packages/ws-tunnel/examples/loopback-demo.mjs
```

Paket içi demo: `FieldHarness` (hub ucu) ↔ `TunnelConnector` + `TunnelClient`
(client ucu) ↔ `SessionGateway` + `TunnelProxy` — tek gerçek WS kanalında
register → oturum → tünel HTTP → WS köprüsü. Aynı akış test olarak da çalışır:

```bash
bun nx run ws-tunnel:test   # loopback.spec.ts dahil
```

## Test & kalite kapıları

- `nx run ws-tunnel:test` — unit + spec + loopback uçtan uca
- `nx run ws-tunnel:typecheck` — `tsc --noEmit` (test dosyaları hariç)
- Güvenlik-kritik modüller (codec, connector, client, proxy) branch kapsamı ≥ %90 hedeflenir

## Sözleşme özeti

```ts
// Client ucu: TunnelConnector zaten ITunnelChannel'dır
const client = TunnelClient.create({ webServiceUrl, staticUrl });
client.attach(connector);

// Hub ucu: IHubChannel adapter'i (ör. paket içi FieldHarness veya
// tüketicinin ContainerProxy sarmalayıcısı) + IStreamSink (tüketicinin
// HTTP framework adapter'i) + IAuditSink + ITokenSigner enjekte edilir
const gateway = new SessionGateway(channel, store, audit, logger);
const proxy = new TunnelProxy(channel, store, logger);
```

Tünel rolü YORUMLAMAZ: `TunnelRole` serbest string'dir — eşleme ve RBAC
tüketiciye aittir. Detaylı protokol: `docs/architecture/KONTEYNER-UZAKTAN-ERISIM-MIMARISI.md`.
