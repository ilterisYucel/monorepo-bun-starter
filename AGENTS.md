# AGENTS.md

## Quick commands
```
bun install                     # Install deps (Bun only, no npm/pnpm/yarn)
bun run dev                     # All apps in parallel (max 5)
bun run dev:web                 # Web only (Vite, port 5173)
bun run dev:desktop             # Electron only
nx run demo-backend:dev         # Backend only (Fastify, port 5000)
bun run build                   # Build all (Nx orders by ^build deps)
nx run web:test                 # Vitest (no test files written yet)
nx run <proj>:<target>          # Run any Nx target
nx graph                        # Dependency graph visualizer
```
No root `test`, `lint`, or `format` scripts exist. Linting is per-project.
Only `web` has a `test` Nx target (vitest); no test files exist anywhere.

## Monorepo structure
- **Bun** is the package manager. Workspaces: `apps/*` + `packages/*`.
- **Nx** v22 orchestrates build order via `"dependsOn": ["^build"]` in `nx.json`.
- Cached Nx targets: `build`, `test`, `lint`.

### Build order (implicit from Nx `^build`)
```
shared-types (leaf, no deps)
  → shared-utils, core, simulators
    → ui
      → demo-backend (depends on core, shared-types, simulators)
      → web (depends on shared-types, shared-utils, ui)
      → desktop (depends on shared-types, shared-utils)
```

### Package ownership
| Package | Purpose |
|:--------|:--------|
| `shared-types` | Pure TS type definitions (telemetry, jobs, device interfaces) |
| `shared-utils` | Empty placeholder — exports nothing |
| `core` | Backend logic: Modbus, CANbus(stub), MQTT(stub), TimescaleDB, BullMQ |
| `simulators` | BSC/X Rack device simulator |
| `ui` | Shared React components (PixiJS graphics, Recharts, Emotion) |
| `web` | React v19 frontend (Vite v8, TanStack Query, Zustand) |
| `desktop` | Electron v39 + React v19 (electron-vite) |
| `demo-backend` | Fastify v5 backend (REST + WebSocket) |

## Dependency injection rules (MANDATORY)

**Every new class MUST follow these rules.** awilix is planned for later; currently there is no DI container.

1. **Plain constructor injection only.** All dependencies are passed via `constructor(private dep: Type)`. No `@Injectable()`, no decorators, no service locator globals.
2. **No default exports.** Every file uses named exports exclusively.
3. **Config objects, not primitives.** When a class needs >2 primitive config values, define a `*Config` interface (e.g. `TimescaleDBConfig`, `ModbusClientConfig`) and pass that single object.
4. **Interfaces for swappable backends.** Use `I`-prefixed interface contracts in `shared-types` (e.g. `IMessageQueue`, `ITimeseriesDatabase`, `IModbusSimulatorAdapter`). Concrete adapters implement them.
5. **Inject constructed instances, not raw configs, when the resource may be shared.** Example: `BullMQAdapter` receives a `RedisConnection` instance (not `RedisConfig`) — so one Redis connection can be reused across queues.
6. **Wiring happens in `main()`.** In `apps/demo-backend/src/index.ts`, all `new X(...)` calls happen in a single bootstrap function. Keep it that way.
7. **Lifecycle methods.** Classes that manage external resources must expose `connect()`/`disconnect()` or `close()` + `health()` patterns. All startup/shutdown sequences go in `main()`.

### Existing DI contracts (interfaces)
| Interface | Location | Purpose |
|:----------|:---------|:--------|
| `IMessageQueue` | `packages/core/src/messaging/interface.ts` | Job queue abstraction |
| `ITimeseriesDatabase` | `packages/core/src/timeseries/interface.ts` | Time-series DB abstraction |
| `IModbusSimulatorAdapter` | `packages/shared-types/src/modbus-adapter.ts` | Modbus simulator contract |

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
  constructor(config: ModbusDeviceConfig, adapter?: IModbusSimulatorAdapter) {}
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
| Pattern | Where | Detail |
|:--------|:------|:-------|
| Strategy | `IMessageQueue`/`BullMQAdapter`, `ITimeseriesDatabase`/`TimescaleDBAdapter` | Interface defines contract; concrete adapter swaps backend |
| Adapter | `ModbusTcpClient` (wraps jsmodbus), `BullMQAdapter` (wraps bullmq) | Adapts 3rd-party libs to internal interfaces |
| Facade | `ModbusDevice` | High-level `read()`/`write()` API hides register tables, batching, byte order |
| Transactional | `ModbusDevice.writeAtomic()` | Manual read-backup + rollback on failure |

## Coding conventions (repo-wide)
- **File names:** kebab-case in backend (`device-job-handler.ts`), PascalCase in web components (`ControlPanel.tsx`)
- **Exports:** Named exports only. No default exports anywhere.
- **Interfaces:** `I` prefix for abstractions (`IMessageQueue`). No `I` for DTO/struct types (`ServerConfig`, `RedisConfig`).
- **Config types:** `*Config` suffix (`TimescaleDBConfig`, `ModbusClientConfig`).
- **Adapter classes:** `*Adapter` suffix (`BullMQAdapter`, `TimescaleDBAdapter`).
- **TypeScript:** `import type { X }` for type-only imports. `private` parameter properties in constructors.
- **Logging:** `[ModuleName]` prefix convention on console.log/error/warn (no structured logging yet).
- **Comments/docstrings:** Turkish throughout.
- **Barrel exports:** Every package subdirectory has `index.ts` re-exporting all sibling files.

## Web app conventions
- **Feature-based** directory layout: `features/<name>/components/, hooks/, services/, types/, stores/`
- **Data fetching:** React Query v5 (`useQuery`). `QueryClient` singleton at `src/lib/query-client.ts`.
- **Client state:** Zustand with `persist` middleware (`AuthStore`, `LogStore`).
- **HTTP client:** Axios singleton at `src/lib/api-client.ts` with interceptors.
- **Styling:** Plain CSS (not CSS Modules). Co-located `.css` per component. Global variables in `index.css`.
- **UI components** from `@gd-monorepo/ui` receive data/callbacks via props — no hook imports into the UI package.
- **Router:** React Router v7 with `createBrowserRouter`. Protected routes check localStorage.

## Vite resolves packages to source
`apps/web` and `apps/desktop` Vite config aliases map `@gd-monorepo/*` to `packages/*/src/` (not `dist/`) for HMR. Library builds are not required for frontend dev.

## Docker / deployment
- Compose files: `deployment/docker-compose.demo-backend.yml` (prod) and `.dev.yml` (hot-reload).
- Stack: TimescaleDB + Redis + demo-backend (Fastify) + web (nginx).
- Backend Dockerfiles: `apps/demo-backend/deployment/`.
- Web Dockerfiles: `apps/web/deployment/`.

## Key framework versions
- **Runtime:** Bun (latest)
- **Backend:** Fastify v5
- **Web:** React v19, Vite v8, TanStack Query v5, Zustand v5, React Router v7, Recharts v3
- **Desktop:** Electron v39, electron-vite v5, electron-builder
- **UI lib:** PixiJS v8, Emotion CSS-in-JS
- **DB/MQ:** TimescaleDB (pg npm), Redis + BullMQ

## Package manager lock-in
- **Bun only.** `bun install`, `bun run`, `bun build`, `bun --watch`.
- `bun.lock` is committed. No `package-lock.json`, `yarn.lock`, or `pnpm-lock.yaml`.
- Workspace dependencies use `"*"` version (e.g. `"@gd-monorepo/core": "*"`).

## What's missing
- No test files exist anywhere (vitest configured but unused).
- No CI/CD workflows (no `.github/` directory).
- No pre-commit hooks, no centralized linting/formatting.
- `shared-utils` package is empty.
- CANbus and MQTT are empty stubs in core.
- `reports` feature in web is a placeholder.
