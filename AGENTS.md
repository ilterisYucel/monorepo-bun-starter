# AGENTS.md

## Runtime & Toolchain

- **Bun** is the package manager and runtime. Use `bun run`, `bun build`, `bun --watch`. Never use npm/pnpm/yarn.
- **Nx** is the monorepo task runner. Always run tasks through `bun nx` (e.g. `bun nx run web:build`), not raw scripts.
- Root `package.json` `scripts` delegate to Nx: `bun run dev`, `bun run build`, `bun run dev:web`, etc.

## Workspace Layout

```
apps/
  web/            React SPA (Vite, port 5173)
  desktop/        Electron app (electron-vite)
  demo-backend/   Fastify server that wires everything together (the primary demo app)
  backend/        Empty placeholder (exists only in tsconfig paths)
packages/
  shared-types/   Foundational types — no runtime deps, depends on nothing
  shared-utils/   Empty placeholder
  core/           Business logic: modbus, timeseries (PostgreSQL), messaging (Redis/BullMQ)
  simulators/     Device simulators (XRackSimulator) implementing IModbusSimulatorAdapter
  ui/             Shared React components, built as a Vite library
```

**Dependency direction:** `shared-types` ← `core`/`simulators`/`shared-utils` ← `demo-backend`/`web`/`desktop`/`ui`

`apps/backend` exists in `tsconfig.base.json` paths but is an empty directory — do not reference it.

## Commands

| Task | Command |
|------|---------|
| Dev all projects | `bun run dev` |
| Dev web only | `bun run dev:web` |
| Dev desktop only | `bun run dev:desktop` |
| Dev demo-backend | `bun nx run demo-backend:dev` |
| Build all | `bun run build` |
| Build specific | `bun nx run <project>:build` |
| Clean all dists | `bun run clean` |
| Lint web | `bun nx run web:lint` (or `bun nx run desktop:lint`) |
| Typecheck core | `bun nx run core:typecheck` |

Build depends on upstream (`"^build"` in nx.json) — building an app first builds its library deps.

## TypeScript

- `moduleResolution: "bundler"` with `allowImportingTsExtensions` — imports can include `.ts` extensions.
- `verbatimModuleSyntax: true` — **must use `import type` for type-only imports**. Plain `import` of a type that is not a value will be elided.
- `jsx: "react-jsx"` — no need to `import React` for JSX.
- Root `tsconfig.json` sets `noEmit: true`. Sub-projects that need emit set it to `false`.
- Multiple TypeScript versions in use: `5.x` in backend/simulators/core/desktop; `~6.0.2` in web/ui.

## Key Architecture

- **Simulator/Real mode switching:** `ModbusDevice` in `core` accepts an optional `IModbusSimulatorAdapter`. If provided, it delegates to the simulator; otherwise it creates a real TCP client. The adapter interface lives in `shared-types`, implementation in `simulators`.
- **Atomic writes with rollback:** `ModbusDevice.writeAtomic()` reads current values as backup, attempts write, rolls back on failure.
- **Desktop has its own UI copies:** `apps/desktop` does **not** import from `@gd-monorepo/ui`. It has its own component implementations. Changes to one may need mirroring in the other.
- **Provider/Consumer pattern in UI:** `packages/ui` exports `TelemetryProvider`/`LogProvider` interfaces. Concrete data fetching lives in the app layer.
- **Three job queue types** (BullMQ): `queue_read_device`, `queue_write_telemetry`, `queue_command_device`.

## Dev Environment Quirks

- Web's Vite config uses **polling file watch** (`usePolling: true, interval: 100`) and **force dep optimization** (`force: true`). These are intentional for dev.
- Web proxies `/api` requests to `demo-backend:5000` (env override: `VITE_API_URL`).
- The UI package uses `@vitejs/plugin-react-swc` with `@swc/plugin-emotion` for CSS-in-JS.
- Desktop uses `electron-vite` with separate build configs for main/preload/renderer.

## Testing

- **viTest** is a dependency in `web` and `ui`, but no test files or vitest configs exist yet. When adding tests, create `vitest.config.ts` in the project root.
- Run a single project's tests: `bun nx run <project>:test`

## Linting

- No root-level eslint config. Each app that needs linting has its own (`apps/web/eslint.config.js`, `apps/desktop/eslint.config.mjs`).
- Packages (`core`, `simulators`, etc.) have no lint setup.

## Style Notes

- Comments and documentation are in **Turkish**.
- Use `bun.lock` as the lockfile (not `package-lock.json` or `pnpm-lock.yaml`).
- Environment files: `.env.*` is gitignored except `.env.example` and `.env.sample`.

## Hexagonal Architecture (demo-backend)

`apps/demo-backend` is the primary orchestration app and follows a hexagonal/clean architecture:

- **`application/`** — Use-case orchestrators (`DeviceJobHandler`, `PowerCommandHandler`). Pure logic, no I/O or framework imports.
- **`domain/`** — Intentionally empty. All domain types (`TelemetryData`, `DeviceJob`, etc.) live in `@gd-monorepo/shared-types`, the foundational zero-dependency package.
- **`infrastructure/`** — Adapters that touch frameworks/external systems: `FastifyServer` (HTTP), `racksRoutes` (REST handlers), `XRackManager` (simulator lifecycle wrapper).
- **`config/`** — Static constants and factory functions (`createModbusConfig()` generates the complete 161-entry Modbus device definition).
- **`main()` in `index.ts` is the single composition root** — all DI wiring happens in one sequential bootstrap function:
  1. Start `XRackManager` (16 racks, tick every 5s)
  2. Create `ModbusDevice` with the simulator adapter
  3. Create `TimescaleDBAdapter` (PostgreSQL)
  4. Connect Redis + create `BullMQAdapter`
  5. Register worker (captures handler via closure)
  6. Create `PowerCommandHandler`
  7. Start Fastify server with rack routes
  8. Add repeatable CRON job for periodic reads
- **Graceful shutdown** reverses the bootstrap order: server → queue → redis → timescale → modbus → simulator.

## Dependency Injection Conventions

**No DI container** — manual, constructor-based DI everywhere:

- **Primary pattern:** `constructor(config: XxxConfig, optionalDep?: Interface)` — typed config object first, optional dependency second. Examples: `ModbusDevice(config, adapter?)`, `FastifyServer(config)`.
- **Config interfaces** are co-located in the same file as the class, use flat nullable optionals with `??` defaults (e.g. `config.timeout ?? 3000`).
- **Closure-based DI** for BullMQ workers: `messageQueue.registerWorker(async (job) => { await handler.handle(job) })` — the lambda captures the handler from outer scope.
- **Options-object DI** for route registration: `racksRoutes(fastify, { timescale, powerHandler, deviceId })`.
- **Internal composition** in `XRackManager`: creates `XRackSimulator` + `XRackSimulatorAdapter` internally, exposes only the adapter via `getAdapter()`.
- **Known gap:** The app layer imports concrete classes (`TimescaleDBAdapter`, `BullMQAdapter`) directly rather than their interfaces (`ITimeseriesDatabase`, `IMessageQueue`). The interfaces exist in `@gd-monorepo/core` but are not consumed at the composition boundary.

## Simulator/Real Mode Switching (Detail)

`ModbusDevice` uses a `private isSimulator: boolean` flag derived from the optional second constructor argument:

- If `adapter` is provided → `isSimulator = true`, stores adapter, no TCP client created.
- If absent → creates a real `ModbusTcpClient` from `config.connection`.
- **Every** read/write method branches: `if (this.isSimulator) { await this.adapter!.readX() } else { await this.client!.readX() }`.
- `connect()` and `disconnect()` are no-ops in simulator mode.
- No common interface exists between `ModbusTcpClient` and `IModbusSimulatorAdapter` — their method signatures differ (e.g. simulator reads single coils, real client requires address+count).
- Non-null assertions (`!`) are used on every branch since the boolean guarantees exactly one path is valid.

## UI Component Architecture

- **Provider/Consumer IoC:** `TelemetryProvider` and `LogProvider` are plain data-bag interfaces (not hooks). Components receive them as props, destructure data/loading/error/action fields directly. The actual data fetching (TanStack Query, fetch, etc.) lives in the app layer.
- Components **never** import hooks or data-fetching libraries — they only import their own types and UI primitives.
- **Strict per-component directory structure:**
  ```
  ComponentName/
    index.ts              — Re-exports: component, types, styles, utils
    ComponentName.tsx     — The React component
    ComponentName.types.ts — Props interface
    ComponentName.styles.ts — CSS-in-JS styled components
    ComponentName.utils.ts  — Pure helper functions (optional)
  ```
- Every module directory has an **`index.ts`** with explicit named barrel exports — no glob re-exports.

## Error Handling Conventions

- **ModbusTcpClient:** Precondition guard (`if (!connected) throw`) + try/catch + re-throw with contextual prefix: `throw new Error(\`Read holding registers failed: ${error}\`)`.
- **Health checks** on interfaces return `Promise<boolean>` — catch-all errors → `false` with `console.error` log.
- **`writeAtomic()` backup-rollback:** Read current values → write new values → on failure, iterate written addresses, restore backup values (each rollback step individually try/caught) → re-throw original error. This is the most sophisticated error path in the system.
- **No custom error types** — all errors are plain `Error` with string messages.
- BullMQ workers use `attempts: 3` with exponential backoff, plus optional `onCompleted`/`onFailed` callbacks.

## Coding Style Details

- **Interface naming:** `I`-prefix for adapter contracts (`IModbusSimulatorAdapter` in shared-types), no prefix for domain/provider types (`TelemetryProvider`, `ITimeseriesDatabase` — note core interfaces use `I` to match the adapter convention).
- **Private I/O methods** in `ModbusDevice` use `_` prefix (`_readBatchByType`, `_decodeRegisters`); pure-transform helpers omit the prefix (`sortByPriority`, `groupByAddress`).
- **Constants**: `UPPER_SNAKE_CASE` at module level (`DEFAULT_JOB_OPTIONS`, `QUEUE_NAMES`); `as const` assertions on register maps and type unions for literal-type preservation.
- **Lazy initialization** via `Map`/`Set` caches: `BullMQAdapter` lazily creates queues on first `getQueue()`; `TimescaleDBAdapter` caches hypertable creation with `Set<string>`.
- **Connection state:** Every network class tracks a `private` boolean (`connected`/`isConnected`). Connection methods are idempotent guards, write methods throw if not connected.
- **Double byte-order implementation:** `BinaryPayloadDecoder` (core/modbus) and `ModbusDevice.applyByteOrderToBuffer` both implement byte-swapping with subtle differences in the `LITTLE_ENDIAN_SWAP` case — be careful when modifying either.

## Interface Ownership Map

| Interface | Defined In | Implemented By |
|-----------|-----------|----------------|
| `IModbusSimulatorAdapter` | `packages/shared-types` | `XRackSimulatorAdapter` (simulators) |
| `ITimeseriesDatabase` | `packages/core/timeseries` | `TimescaleDBAdapter` (core) |
| `IMessageQueue` | `packages/core/messaging` | `BullMQAdapter` (core) |
| `TelemetryProvider` / `LogProvider` | `packages/ui/interfaces` | App layer (web/desktop hooks) |
