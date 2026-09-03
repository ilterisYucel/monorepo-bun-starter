# @gd-monorepo/ws-tunnel

Jenerik, çoklanmış WebSocket tüneli — tek outbound bağlantı üzerinden HTTP/WS
reverse proxy + oturum yönetimi. GD-PMS monorepo'sundan **bağımsız bir
kütüphanedir** (tamper-logger deseni; ayrıntı:
`docs/architecture/KUTUPHANE-CIKARMA-PLANI.md`). Domain adapter'leri
(Fastify/PG/ContainerProxy) tüketici projede yaşar.

## İçerik

| Modül | Görev |
|---|---|
| `codec` | Binary frame codec — 9 bayt başlık (streamId u32 BE + seq u32 BE + flags FIN/RST/WS_OP); `decode` asla throw etmez (`Result`) |
| `protocol` | Kontrol mesaj tipleri + zod şemaları (register/ack, heartbeat, telemetry, stream-*, open-session/*) |
| `connector` | `FieldConnector` — outbound WS istemcisi + durum makinesi + üstel backoff (`ReconnectDelay`) |
| `channel` | `ISocketClient`/`WsSocketClient` (ws adapter), `ITunnelChannel` (konteyner ucu), `IFieldChannel` (field ucu — containerId'li) |
| `client` | `TunnelClient` — stream multiplex, kredi bazlı backpressure, çift upstream yönlendirme, WS köprüsü |
| `session` | `ContainerSessionStore` + `ContainerSessionServer` — geçici oturum JWT'si (`ITokenSigner` enjeksiyonu) |
| `proxy` | `ContainerSessionGateway` + `FieldSessionStore` + `TunnelProxy` — field tarafı oturum + HTTP/WS proxy (`IFieldChannel`/`IStreamSink`/`IAuditSink` enjeksiyonu) |
| `errors` / `logger` / `token` / `audit` / `snapshot` / `types` | Bağımsızlık sözleşmeleri — `Result`/`DomainError`, minimal `ILogger`, `ITokenSigner`, `IAuditSink`, `ISnapshotSource`, jenerik `TunnelRole`/`TunnelUser`/`TunnelTelemetryPoint` |

## Bağımlılıklar

`ws`, `zod`, `@gd-monorepo/result` — başka bir şey yok. (`jose` yalnızca
devDependency — test yardımcısı; üretim kodu `ITokenSigner` enjeksiyonuyla
çalışır.)

## Örnek — loopback uçtan uca (monorepo'suz)

```bash
bun packages/ws-tunnel/examples/loopback-demo.mjs
```

Paket içi demo: `FieldHarness` (field ucu) ↔ `FieldConnector` + `TunnelClient`
(konteyner ucu) ↔ `ContainerSessionGateway` + `TunnelProxy` — tek gerçek WS
kanalında register → oturum → tünel HTTP → WS köprüsü. Aynı akış test olarak
da çalışır:

```bash
bun nx run ws-tunnel:test   # loopback.spec.ts dahil
```

## Test & kalite kapıları

- `nx run ws-tunnel:test` — unit + spec + loopback uçtan uca
- `nx run ws-tunnel:typecheck` — `tsc --noEmit` (test dosyaları hariç)
- Güvenlik-kritik modüller (codec, connector, client, proxy) branch kapsamı ≥ %90 hedeflenir

## Sözleşme özeti

```ts
// Konteyner ucu: FieldConnector zaten ITunnelChannel'dır
const client = TunnelClient.create({ webServiceUrl, staticUrl });
client.attach(connector);

// Field ucu: IFieldChannel adapter'i (ör. paket içi FieldHarness veya
// tüketicinin ContainerProxy sarmalayıcısı) + IStreamSink (tüketicinin
// HTTP framework adapter'i) + IAuditSink + ITokenSigner enjekte edilir
const gateway = new ContainerSessionGateway(channel, store, audit, logger);
const proxy = new TunnelProxy(channel, store, logger);
```

Tünel rolü YORUMLAMAZ: `TunnelRole` serbest string'dir — eşleme ve RBAC
tüketiciye aittir. Detaylı protokol: `docs/architecture/KONTEYNER-UZAKTAN-ERISIM-MIMARISI.md`.
