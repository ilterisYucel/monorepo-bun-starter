---
status: active
space: agents
tags: [agents, referans, monorepo, altyapi]
review_date: 2026-12-01
---

# AGENTS Detay Referansı — Altyapı (Monorepo / Paket / Pattern)

> Bu doküman `AGENTS.md`'den taşınan **referans** içeriktir; her oturumda yüklenmez.
> Monorepo yapısı, paket tablosu, DI arayüzleri, tasarım desenleri veya build sırasına
> dokunacaksan oku. Kurallar (MANDATORY) `AGENTS.md`'de kalır.

## Monorepo structure

- **Bun** is the package manager. Workspaces: `apps/*` + `packages/**` + `services/*`.
- **Nx** v22 orchestrates build order via `"dependsOn": ["^build"]` in `nx.json`.
- Cached Nx targets: `build`, `test`, `lint`.

### Three-layer model (MANDATORY mental model)

| Layer                 | What                                                                                                  | Physical location                                  | Examples                                                                                                            |
| :-------------------- | :---------------------------------------------------------------------------------------------------- | :------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------ |
| **Platform (engine)** | Reusable libraries — imported, never deployed                                                         | `packages/`                                        | core, platform/\_, plugin-sdk, plugins/\_, shared-types, shared-utils, simulators, ui                               |
| **Capabilities**      | Deployable, config-driven parts — runnable alone but not a product; composed into products via config | `services/` (backend) + `apps/` (frontend/desktop) | web-service, data-service, device-service, integration-service \| field, superadmin, container-web, desktop, editor |
| **Products**          | Assembled composition of capabilities + configs                                                       | `deployment/` (compose files + configs)            | field stack, boss stack, container stack, customer variants                                                         |

- **`packages/core` JENERİKTİR** — başka şirkette başka projede yeniden kullanılabilir olmalı. GD-PMS'ye özgü kod (`JobType` kuyrukları, tier defaults, konteyner uzaktan erişim sözleşmeleri) `packages/platform/*`'da yaşar. Bağımlılık yönü: `core → platform` YASAK; `platform/* → core` serbest. Ayrıntı: `docs/roadmap/platform-paket-yapisi.md`.
- Services are **not** products — a product is the configured composition (e.g. field product = device-service + data-service + web-service + field app + compose + device configs + `SERVICE_TIER=field`).
- Low-code/no-code evolution: the editor generates the **product layer** (compose compositions + configs); capabilities stay generic; customer-specific behavior belongs in product configs/plugins — never in the platform.
- `packages/` = import-only. If something has a `run.ts`/Dockerfile and gets deployed, it belongs in `services/` or `apps/`.

### Build order (implicit from Nx `^build`)

```
shared-types, result (leaf, no deps)
  → shared-utils, core, tamper-logger, simulators, plugin-sdk, ws-tunnel (depends on result)
    → platform/messaging, platform/container-access (depend on core, shared-types, ws-tunnel)
    → platform/logging (depends on shared-types, tamper-logger)
      → epias-client (depends on plugin-sdk)
        → plugins/epias-market-prices (depends on epias-client), ui
          → demo-backend (depends on core, platform/*, tamper-logger, shared-types, simulators)
          → web-service (depends on core, platform/*, tamper-logger, shared-types, ws-tunnel)
          → data-service (depends on core, platform/*, tamper-logger, shared-types)
          → device-service (depends on core, platform/*, tamper-logger, shared-types, simulators)
          → integration-service (depends on core, platform/*, plugin-sdk, plugins/*)
          → web (depends on shared-types, shared-utils, ui)
          → desktop (depends on shared-types, shared-utils)
```

### Package ownership

| Package                     | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| :-------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shared-types`              | Pure TS type definitions (telemetry, jobs, device interfaces, auth, integration contracts)                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `shared-utils`              | ConfigLoader, env sources, config definitions                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `core`                      | **JENERİK** backend logic: Modbus, CANbus(stub), MQTT(stub), TimescaleDB, SQL adapters, RedisConnection, **generic** `BullMQAdapter`/`BullMQQueue` — GD-PMS kavramı İÇERMEZ                                                                                                                                                                                                                                                                                                                                                          |
| `result`                    | **JENERİK** yaprak paket: `Result<T,E>` (Railway — ok/err, map, andThen, match, `okVoid`) + `DomainError` ailesi (kind → 4xx/5xx eşlemesi). Tüm paketler/servisler buradan import eder (2026-09-01: core/errors + ws-tunnel kopyası + shared-types basit Result birleşti)                                                                                                                                                                                                                                                         |
| `tamper-logger`             | **JENERİK** tamper-evident log kütüphanesi (ayrı ürün): `TamperLogger` (HMAC zinciri, fail-closed audit/security), sink'ler (console/file/timescale/syslog/webhook/smtp/sms), `verifyChain`, signing key. eventCode SERBEST string — sözlük `eventCodeValidator` ile enjekte edilir                                                                                                                                                                                                                                                 |
| `platform/messaging`        | `PlatformMessageQueue` (IMessageQueue implementasyonu) + `QUEUE_NAMES` + `JOB_RETRY_OPTIONS` — JobType'ı bilen TEK yer                                                                                                                                                                                                                                                                                                                                                                                                              |
| `ws-tunnel`                 | **JENERİK** çoklanmış WebSocket tüneli (ayrı ürün — tamper-logger deseni; **iki deployment: field→container + field→boss**): `FrameCodec` (9 bayt başlık), kontrol mesaj protokolü (`protocol/messages.ts`, v2: `peerId`+`peerType`; olay bildirimi: `EventMessage`), `TunnelConnector` (durum makinesi + backoff), `TunnelClient` (stream multiplex + kredi + WS köprüsü), `ClientSessionStore/Server` (client oturumu — `ITokenSigner` enjeksiyonu), `SessionGateway`/`HubSessionStore`/`TunnelProxy` (hub tarafı — `IHubChannel`/`IStreamSink`/`IAuditSink` enjeksiyonu), jenerik `TunnelRole`/`TunnelUser`/`TunnelTelemetryPoint` (types.ts), paket içi loopback demo (`src/demo/` + `examples/loopback-demo.mjs`). Bağımlılık: yalnızca `ws` + `zod` — TAM BAĞIMSIZ. Domain adapter'leri monorepo'da: `ContainerProxyFieldChannel`, `FastifyStreamSink`, `JoseTokenSigner`, `SessionAudit`, `SessionUserMap` |
| `platform/container-access` | Konteyner uzaktan erişim sözleşmeleri: `IContainerProxy`/`ContainerObserver` (tunnel frame codec/tipler 2026-09-01'de `@gd-monorepo/ws-tunnel`'a taşındı)                                                                                                                                                                                                                                                                                                                                                                           |
| `platform/logging`          | `TIER_LOGGER_DEFAULTS` + `loggerConfigForTier` (container/field/boss tier varsayılanları) + GD-PMS olay sözlüğü (`LOG_EVENT_CODES`/`isLogEventCode`)                                                                                                                                                                                                                                                                                                                                                                                |
| `plugin-sdk`                | Plugin framework: IPlugin, PluginContext, PluginRegistry, PluginLoader + domain-agnostic `HttpClient` (see `docs/architecture/PLUGIN-MIMARISI.md`)                                                                                                                                                                                                                                                                                                                                                                                  |
| `epias-client`              | EPIAŞ HTTP client: CAS TGT yaşam döngüsü (`EpiasTicketStore` — dosya önbelleği), `EpiasClient` (TGT header + EPIAŞ tarih formatı + tipli yardımcılar), endpoint sabitleri. Plugin değil — kütüphane; EPIAŞ plugin'leri paylaşır                                                                                                                                                                                                                                                                                                     |
| `plugins/*`                 | Built-in plugin packages (e.g. `epias-market-prices`) — loaded via StaticPluginSource                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `simulators`                | BSC/HVAC/XRack/CB/DC-Output device simulators — register-accurate                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `ui`                        | Shared React components (PixiJS graphics, Recharts, Emotion)                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `web`                       | React v19 frontend (Vite v8, TanStack Query, Zustand)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `desktop`                   | Electron v39 + React v19 (electron-vite)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `demo-backend`              | Fastify v5 backend (REST + WebSocket) — legacy                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `web-service`               | Hexagonal Fastify 5 API — Auth/JWT, TimescaleDB queries, awilix, zod (in `services/`)                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `data-service`              | BullMQ consumer — writes telemetry to TimescaleDB (in `services/`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `device-service`            | Modbus poller — reads device configs, produces BullMQ jobs (in `services/`)                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `integration-service`       | Plugin host — EPIAŞ etc. periodic data collection (BullMQ repeatable) (in `services/`)                                                                                                                                                                                                                                                                                                                                                                                                                                               |

## Existing DI contracts (interfaces)

| Interface                 | Location                                                 | Purpose                    |
| :------------------------ | :------------------------------------------------------- | :------------------------- |
| `IMessageQueue`           | `packages/core/src/messaging/interface.ts`               | Job queue abstraction      |
| `ITimeseriesDatabase`     | `packages/core/src/timeseries/interface.ts`              | Time-series DB abstraction |
| `IModbusSimulatorAdapter` | `packages/shared-types/src/modbus/adapter.ts`            | Modbus simulator contract  |
| `IUserRepository`         | `web-service/src/domain/repositories/IUserRepository.ts` | User persistence contract  |
| `ITokenService`           | `web-service/src/domain/services/ITokenService.ts`       | JWT token sign/verify      |
| `IPasswordHasher`         | `web-service/src/domain/services/IPasswordHasher.ts`     | Password hashing contract  |

### Concrete DI examples

```ts
// GOOD: inject constructed instance, config object
class BullMQAdapter implements IMessageQueue {
  constructor(private connection: RedisConnection) {}
}
class TimescaleDBAdapter implements ITimeseriesDatabase {
  constructor(config: TimescaleDBConfig) {} // creates own pg.Pool
}
class ModbusDevice {
  constructor(config: ModbusDeviceConfig, transport?: IModbusTransport) {}
}

// BAD: global singleton, decorators, hardcoded deps
```

## Architecture: Clean Architecture (backend)

```
apps/demo-backend/src/
  config/              # Constants, config factories
  application/         # Use-case / service classes (no I/O)
  infrastructure/      # External adapters (Fastify, simulator wrappers)
```

- `application/` classes never import from `infrastructure/`.
- All I/O (HTTP, DB, queues) lives in `infrastructure/`.
- Routes use Fastify's plugin pattern — dependencies passed as an `options` object.

## Design patterns in use (packages/core)

| Pattern       | Where                                                                       | Detail                                                                        |
| :------------ | :-------------------------------------------------------------------------- | :---------------------------------------------------------------------------- |
| Strategy      | `IMessageQueue`/`BullMQAdapter`, `ITimeseriesDatabase`/`TimescaleDBAdapter` | Interface defines contract; concrete adapter swaps backend                    |
| Adapter       | `ModbusTcpClient` (wraps jsmodbus), `BullMQAdapter` (wraps bullmq)          | Adapts 3rd-party libs to internal interfaces                                  |
| Facade        | `ModbusDevice`                                                              | High-level `read()`/`write()` API hides register tables, batching, byte order |
| Transactional | `ModbusDevice.writeAtomic()`                                                | Manual read-backup + rollback on failure                                      |

## Key framework versions

- **Runtime:** Bun (latest)
- **Backend:** Fastify v5
- **Web:** React v19, Vite v8, TanStack Query v5, Zustand v5, React Router v7, Recharts v3
- **Desktop:** Electron v39, electron-vite v5, electron-builder
- **UI lib:** PixiJS v8, Emotion CSS-in-JS
- **DB/MQ:** TimescaleDB (pg npm), Redis + BullMQ
- **Auth/DI/Validation:** jose v5 (JWT), awilix v11 (DI container), zod v3 (validation)

## SIGILL / runtime stability fixes (implemented)

> Tam liste ve gerekçeler: [docs/process/24h-stability-fixes.md](docs/process/24h-stability-fixes.md)

24/7 çalışmada Chrome SIGILL çökmelerini önlemek için uygulanan optimizasyonlar:

| Category                          | Fix                                                                                              | File(s)                                                  |
| :-------------------------------- | :----------------------------------------------------------------------------------------------- | :------------------------------------------------------- |
| **WS message shaping**            | Backend batches telemetry into `{ type: "telemetry", data: [...] }` — N separate `ws.send()` → 1 | `web-service/src/index.ts`                               |
| **Client message batching**       | `requestAnimationFrame` batching — N state updates/second → 1 per frame                          | `useRealtimeTelemetry.ts`                                |
| **WebGL context lifecycle**       | Ref callback destroys old PIXI `Application` on key change (resize)                              | `BSC.tsx`, `TMS.tsx`, `BSCGraphic.tsx`, `TMSGraphic.tsx` |
| **PixiJS ticker throttle**        | `setFrameCount` throttled from 60fps → 6fps                                                      | `BSCGraphic.hooks.ts`, `TMSGraphic.hooks.ts`             |
| **WS ping/pong**                  | `@fastify/websocket` configured with `pingInterval: 30000`                                       | `server.ts` (web-service, demo-backend)                  |
| **Dead WS sweep**                 | `RealtimeManager` sweeps CLOSED/CLOSING sockets every 60s                                        | `realtime-manager.ts`                                    |
| **Zustand localStorage throttle** | Debounced storage wrapper: writes max once per 2s                                                | `LogStore.ts`                                            |
| **Token refresh**                 | `RealtimeProvider` auto-refreshes expired JWT, breaks reconnect loop                             | `RealtimeContext.tsx`                                    |
| **Error Boundary**                | React error boundary catches WebGL/React crashes, shows reload UI                                | `ErrorBoundary.tsx`                                      |
| **Electron crash handler**        | `render-process-gone`, `crashed`, `unresponsive` handlers with auto-reload                       | `apps/container-desktop/src/main/index.ts`               |

## What's missing

- No PR-level unit-test CI workflow (`.github/workflows/` has `e2e.yml`, `perf.yml`, `sonar.yml`, `storybook.yml`, but no `test.yml`).
- No pre-commit hooks, no centralized linting/formatting.
- `shared-utils` package is empty.
- CANbus and MQTT are empty stubs in core.
- `reports` feature in web is a placeholder.
