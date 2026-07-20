# AGENTS.md

## Quick commands
```
bun install                     # Install deps (Bun only, no npm/pnpm/yarn)
bun run dev                     # All apps in parallel (max 5)
bun run dev:web                 # Web only (Vite, port 5173)
bun run dev:desktop             # Electron only
nx run demo-backend:dev         # Demo Backend (Fastify, port 5000)
nx run web-service:dev          # Web Service (Fastify, port 5001)
nx run device-service:dev       # Device Service (Modbus poller)
nx run data-service:dev         # Data Service (BullMQ consumer)
bun run build                   # Build all (Nx orders by ^build deps)
nx run web:test                 # Vitest (no test files written yet)
nx run <proj>:<target>          # Run any Nx target
nx graph                        # Dependency graph visualizer
```
No root `test`, `lint`, or `format` scripts exist. Linting is per-project.
Only `web` has a `test` Nx target (vitest); no test files exist anywhere.

## Monorepo structure
- **Bun** is the package manager. Workspaces: `apps/*` + `packages/**`.
- **Nx** v22 orchestrates build order via `"dependsOn": ["^build"]` in `nx.json`.
- Cached Nx targets: `build`, `test`, `lint`.

### Build order (implicit from Nx `^build`)
```
shared-types (leaf, no deps)
  → shared-utils, core, simulators
    → ui
      → demo-backend (depends on core, shared-types, simulators)
      → web-service (depends on core, shared-types)
      → data-service (depends on core, shared-types)
      → device-service (depends on core, shared-types, simulators)
      → web (depends on shared-types, shared-utils, ui)
      → desktop (depends on shared-types, shared-utils)
```

### Package ownership
| Package        | Purpose                                                              |
| :---------------| :---------------------------------------------------------------------|
| `shared-types` | Pure TS type definitions (telemetry, jobs, device interfaces, auth)  |
| `shared-utils` | Empty placeholder — exports nothing                                  |
| `core`         | Backend logic: Modbus, CANbus(stub), MQTT(stub), TimescaleDB, BullMQ |
| `simulators`   | BSC/HVAC/XRack/CB/DC-Output device simulators — register-accurate                 |
| `ui`           | Shared React components (PixiJS graphics, Recharts, Emotion)         |
| `web`          | React v19 frontend (Vite v8, TanStack Query, Zustand)                |
| `desktop`      | Electron v39 + React v19 (electron-vite)                             |
| `demo-backend` | Fastify v5 backend (REST + WebSocket) — legacy                       |
| `web-service`  | Hexagonal Fastify 5 API — Auth/JWT, TimescaleDB queries, awilix, zod |
| `data-service` | BullMQ consumer — writes telemetry to TimescaleDB                    |
| `device-service`| Modbus poller — reads device configs, produces BullMQ jobs           |

## Dependency injection rules (MANDATORY)

**Every new class MUST follow these rules.** awilix is used in `web-service`; other packages use manual constructor injection.

1. **Plain constructor injection only.** All dependencies are passed via `constructor(private dep: Type)`. No `@Injectable()`, no decorators, no service locator globals.
2. **No default exports.** Every file uses named exports exclusively.
3. **Config objects, not primitives.** When a class needs >2 primitive config values, define a `*Config` interface (e.g. `TimescaleDBConfig`, `ModbusClientConfig`) and pass that single object.
4. **Interfaces for swappable backends.** Use `I`-prefixed interface contracts (e.g. `IMessageQueue`, `ITimeseriesDatabase`, `IModbusSimulatorAdapter`, `IUserRepository`). Concrete adapters implement them. Interfaces live in `domain/` (services) or `shared-types` (cross-package).
5. **Inject constructed instances, not raw configs, when the resource may be shared.** Example: `BullMQAdapter` receives a `RedisConnection` instance (not `RedisConfig`) — so one Redis connection can be reused across queues.
6. **Wiring happens in `main()` or DI container.** In `web-service`, awilix `asFunction` registers all dependencies (see `src/config/container.ts`). In other packages, all `new X(...)` calls happen in a single bootstrap function.
7. **Lifecycle methods.** Classes that manage external resources must expose `connect()`/`disconnect()` or `close()` + `health()` patterns. All startup/shutdown sequences go in `main()`.

### Existing DI contracts (interfaces)
| Interface | Location | Purpose |
|:----------|:---------|:--------|
| `IMessageQueue` | `packages/core/src/messaging/interface.ts` | Job queue abstraction |
| `ITimeseriesDatabase` | `packages/core/src/timeseries/interface.ts` | Time-series DB abstraction |
| `IModbusSimulatorAdapter` | `packages/shared-types/src/modbus-adapter.ts` | Modbus simulator contract |
| `IUserRepository` | `web-service/src/domain/repositories/IUserRepository.ts` | User persistence contract |
| `ITokenService` | `web-service/src/domain/services/ITokenService.ts` | JWT token sign/verify |
| `IPasswordHasher` | `web-service/src/domain/services/IPasswordHasher.ts` | Password hashing contract |

## Frontend data source contracts (MANDATORY)

**All UI components in `packages/ui` MUST be state-library-agnostic.** They receive data via props or React Context — never by importing TanStack Query, Zustand, SWR, or any state management library directly.

### Transport contracts (`packages/shared-types/src/telemetry-transport.ts`)

```ts
// Interface that ALL real-time data transports must implement
interface ITelemetryTransport {
  connect(params: ConnectParams): Promise<void>;
  disconnect(): Promise<void>;
  connectionState(): ConnectionState;
  subscribe(observer: TelemetryObserver): () => void;
}

type ConnectionState = "idle" | "connecting" | "connected" | "error";

interface TelemetryObserver {
  onData(batch: TelemetryData[]): void;
  onError(error: Error): void;
  onConnectionChange(state: ConnectionState): void;
}
```

**This is the Strategy pattern for frontend data.** Swap WebSocket, HTTP polling, SSE, or Mock without changing any UI code.

### Transport implementations (`packages/ui/src/transports/`)

| Transport | Use Case | Constructor |
|-----------|----------|------------|
| `WebSocketTransport` | Production realtime | `new WebSocketTransport(wsUrl, getToken?)` |
| `HttpPollingTransport` | Fallback, simple setup | `new HttpPollingTransport({ endpoint, intervalMs?, getToken? })` |
| `MockTransport` | Storybook, tests, demos | `new MockTransport(definitions, intervalMs?)` |

All implement `ITelemetryTransport`. Import from `@gd-monorepo/ui`:
```ts
import { WebSocketTransport, HttpPollingTransport, MockTransport } from "@gd-monorepo/ui";
```

### UI provider contracts (`packages/ui/src/interfaces/`)

| Interface | Purpose | Consumed By |
|-----------|---------|-------------|
| `TelemetryProvider` | Time-series telemetry data + range/points/filter controls | `TelemetryChart` |
| `LogProvider` | Log entries + add/clear actions | `LogTerminal` |
| `EventAnnotationsProvider` | Event annotations for chart vertical lines | `TelemetryChart` (optional) |

These are **interfaces only** — no implementations exist in `packages/ui`. Implementations live in `apps/web` (using TanStack Query, Zustand, etc.).

### Compound component contracts (`packages/ui/src/core/`)

```tsx
// Grafana-like isolated data context per device
<DeviceTelemetryProvider deviceId="bsc-1" transport={wsTransport}>
  <DeviceTelemetryProvider.Gauge metric="Voltage" label="Voltaj" />
  <DeviceTelemetryProvider.Gauge metric="Current" label="Akım" />
  <DeviceTelemetryProvider.StatusBadge />
</DeviceTelemetryProvider>
```

Each `DeviceTelemetryProvider`:
- Creates its OWN isolated data stream via `useRealtimeTelemetry(transport)`
- Uses `useSyncExternalStore` for React 18 concurrent-mode compatibility
- Crash in one provider's stream does NOT affect other providers (Grafana panel isolation)
- Sub-components access data via internal React Context — no prop drilling

### Transport wiring in apps (`apps/web/src/contexts/TransportContext.tsx`)

```tsx
// App-level transport selection:
<TransportProvider>
  <RealtimeProvider>           ← uses useTransport('ws') internally
    <RouterProvider>
      ...
    </RouterProvider>
  </RealtimeProvider>
</TransportProvider>
```

Any component can access transports via `useTransport('ws')` or `useTransport('http')`. This allows swapping transports at the app level without touching individual components.

### Data flow rules (MANDATORY)

| Package | Allowed Imports | Forbidden Imports |
|---------|----------------|-------------------|
| `packages/ui` | `react`, `@gd-monorepo/shared-types`, browser APIs | TanStack Query, Zustand, SWR, Axios, `apps/*` |
| `apps/web` | `@gd-monorepo/ui`, TanStack Query, Zustand, Axios | — (app layer can use anything) |

**UI components never:**
- Import `useQuery` or `useMutation` directly
- Await `fetch()` or `apiClient.get()` directly
- Manage their own data fetching lifecycle

**UI components always:**
- Accept a provider object via props (IoC)
- Or consume data from a parent compound component's Context
- Or receive fully-resolved data via props

### Existing contracts (frontend)

| Contract | Location | Implementations |
|:---------|:---------|:----------------|
| `ITelemetryTransport` | `shared-types/src/telemetry-transport.ts` | `WebSocketTransport`, `HttpPollingTransport`, `MockTransport` (all in `ui/transports`) |
| `TelemetryProvider` | `ui/src/interfaces/telemetry-provider.ts` | `useTelemetryProvider` (in `apps/web/src/hooks/`) |
| `LogProvider` | `ui/src/interfaces/log-provider.ts` | `useLogStore` (Zustand, in `apps/web/src/stores/`) |
| `EventAnnotationsProvider` | `ui/src/interfaces/event-annotations.ts` | `useEventAnnotations` (in `apps/web/src/hooks/`) |

### Adding a new data source

1. Implement `ITelemetryTransport` in `packages/ui/src/transports/` (e.g., `SseTransport`, `MqttTransport`)
2. Export from `transports/index.ts` — automatically available via `@gd-monorepo/ui`
3. Register in `TransportProvider` (or create custom provider)
4. All existing UI components now work with the new transport — **zero component changes**

### SIGILL / runtime stability fixes (implemented)

The following optimizations were applied across the codebase to prevent Chrome SIGILL crashes during 24/7 operation:

| Category | Fix | File(s) |
|----------|-----|---------|
| **WS message shaping** | Backend batches telemetry into `{ type: "telemetry", data: [...] }` — N separate `ws.send()` → 1 | `web-service/src/index.ts` |
| **Client message batching** | `requestAnimationFrame` batching — N state updates/second → 1 per frame | `useRealtimeTelemetry.ts` |
| **WebGL context lifecycle** | Ref callback destroys old PIXI `Application` on key change (resize) | `BSC.tsx`, `TMS.tsx`, `BSCGraphic.tsx`, `TMSGraphic.tsx` |
| **PixiJS ticker throttle** | `setFrameCount` throttled from 60fps → 6fps | `BSCGraphic.hooks.ts`, `TMSGraphic.hooks.ts` |
| **WS ping/pong** | `@fastify/websocket` configured with `pingInterval: 30000` | `server.ts` (web-service, demo-backend) |
| **Dead WS sweep** | `RealtimeManager` sweeps CLOSED/CLOSING sockets every 60s | `realtime-manager.ts` |
| **Zustand localStorage throttle** | Debounced storage wrapper: writes max once per 2s | `LogStore.ts` |
| **Token refresh** | `RealtimeProvider` auto-refreshes expired JWT, breaks reconnect loop | `RealtimeContext.tsx` |
| **Error Boundary** | React error boundary catches WebGL/React crashes, shows reload UI | `ErrorBoundary.tsx` |
| **Electron crash handler** | `render-process-gone`, `crashed`, `unresponsive` handlers with auto-reload | `apps/desktop/src/main/index.ts` |

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

## Command config system (device JSONs)

Every device config JSON can define a `"commands"` section. Commands reference telemetry entries by `name` to resolve register addresses and MODBUS table types.

### Pattern

```json
{
  "commands": {
    "<commandName>": {
      "label": "Human-readable label",
      "telemetries": [
        { "name": "<telemetry name>", "value": <register value> }
      ],
      "params": {
        "<paramName>": {
          "type": "number",
          "min": 0,
          "max": 3568,
          "default": 50,
          "required": true,
          "label": "Güç (kW)"
        }
      },
      "atomic": true,
      "timeoutMs": 3000,
      "validate": {
        "reads": [{ "name": "<status telemetry>", "expect": <expected value> }]
      }
    }
  }
}
```

- `telemetries[].name` — must match a telemetry entry in the config's `"telemetry"` array
- `telemetries[].value` — direct value or `"{{paramName}}"` template, resolved from user params
- `params` — user-facing inputs (shown in UI before executing)
- `validate.reads` — after write, reads back these telemetry names and compares `value === expect`
- `atomic` — if true and device supports `writeAtomic()`, uses read-backup + rollback on failure

### Per-device examples

| Device | Register Type | Validation | Commands |
|--------|--------------|------------|----------|
| BSC | `HOLDING_REGISTER` writes | `INPUT_REGISTER` read-back (e.g. `Request Acknowledge`) | `charge`, `discharge`, `stop` |
| HVAC | `HOLDING_REGISTER` writes | `INPUT_REGISTER` read-back (e.g. `Equipment Status`) | `on`, `off`, `force_cool`, `force_heat` |
| CB | `COIL` writes | `DISCRETE_INPUT` read-back (e.g. `Is Closed`, `Is Tripped`) | `open`, `close`, `reset` |
| DC Output | `COIL` writes | `DISCRETE_INPUT` read-back (e.g. `Is On`) | `on`, `off` |

**Flow:** Web → `POST /api/commands/execute` → `COMMAND_DEVICE` BullMQ job → `ModbusDevice.write()` → validates read-back.

## Maneuver system

Maneuvers are named, reusable multi-device command chains. 18 maneuvers defined from .drawio flow diagrams (FL-01 through FL-11). Replaces the old ControlPanel + Scheduler on the Control page.

### Key types (`packages/shared-types/src/telemetry.ts`)

```ts
interface CommandStep {
  deviceId: string;
  command?: string;
  telemetries?: Array<{ name: string; value: unknown; unit?: string }>;
  params?: Record<string, unknown>;
}

interface ManeuverConfig {
  name: string;
  label: string;
  description?: string;
  mode: "parallel" | "sequential";
  onFailure?: "stop" | "continue";
  steps: CommandStep[];
  rollbackSteps?: CommandStep[];
}
```

### File map

| File | Role |
|------|------|
| `apps/web/src/features/control/maneuvers.ts` | `MANEUVERS` (18 entries) + `MANEUVER_CONTROLS` (inputs, timerConfig, transform) |
| `apps/web/src/features/control/components/ManeuverPanel.tsx` | Renders masonry grid of cards, manages per-maneuver state |
| `packages/ui/src/components/ManeuverCard/` | Stateless card — inputs, timer checkbox, schedule dropdown, step list, status-aware buttons |

### ManeuverControls

Per-maneuver UI configuration, defined next to `MANEUVERS` in `maneuvers.ts`:

```ts
interface ManeuverControls {
  inputs?: InputField[];        // TelemetryInput definitions
  timerConfig?: boolean;        // show "Zamanlı" checkbox → reveals Süre input
  transform?: ManeuverTransform; // per-step param calculator
}

type ManeuverTransform = (
  values: Record<string, number>,
  steps: CommandStep[],
) => Record<string, number>[];
```

**Transform example** — divide total power across N BSC devices:
```ts
transform: (values, steps) => {
  const perDevice = Math.round(values.powerKw / steps.length);
  return steps.map(() => ({ powerKw: perDevice }));
}
```

### ManeuverCard state machine

| State | Buttons shown |
|-------|--------------|
| `idle` | `▶ Çalıştır ▾` (split: Şimdi / 📅 Zamanla) |
| `running` | `Çalışıyor...` (disabled) |
| `success` | `▶ Çalıştır` (re-run) |
| `failed` | `Tekrar Dene` + `Geri Al` (if `rollbackSteps` defined) |

Schedule dropdown: datetime-local input → `setTimeout` countdown → `onRun(values)` at target time.

### Adding a new maneuver

1. Add entry to `MANEUVERS` in `maneuvers.ts`
2. If inputs/timer needed → add entry to `MANEUVER_CONTROLS`
3. If params need per-step calculation → add `transform`
4. `ManeuverPanel` auto-renders all entries from `MANEUVERS` — no panel changes needed

### ControlPage — bare masonry grid

```tsx
// ControlPage.tsx
export const ControlPage: React.FC = () => (
  <S.ControlPageContainer>
    <ManeuverPanel />
  </S.ControlPageContainer>
);
```

Old `ControlPanel` (charge/discharge/stop buttons) and `Scheduler` (in-memory command list) removed. Charge/discharge/idle are now maneuver cards in the grid.

### Emergency Stop sidebar

`Sidebar.tsx` emergency button wired directly to `MANEUVERS.fl03_emergency_stop`:
```ts
const m = MANEUVERS.fl03_emergency_stop;
await controlApi.executeMulti(m.steps, m.mode);
```

## Icon system (`packages/ui/src/icons/`)

All icons live in `packages/ui/src/icons/`. Consumer packages import from `@gd-monorepo/ui` — never import `react-icons/tb` directly.

### File structure
| File | Purpose |
|------|---------|
| `types.ts` | `ScadaIconName` union type — canonical list of 35 allowed icon names |
| `nav-icons.tsx` | `SCADA_ICONS: Record<ScadaIconName, IconType>` — maps names to Tabler Icons components |
| `index.ts` | Barrel — `export { SCADA_ICONS }` + `export type { ScadaIconName }` |

Root barrel (`packages/ui/src/index.ts`) re-exports via `export * from "./icons"`.

### Usage
```tsx
import { SCADA_ICONS } from "@gd-monorepo/ui";
const Icon = SCADA_ICONS.dashboard;
<Icon size={18} />
```

### Adding a new icon
1. Add the name string literal to the `ScadaIconName` union in `types.ts`
2. Import the corresponding `Tb*` component in `nav-icons.tsx` and add the mapping entry to `SCADA_ICONS`
3. That's it — barrel exports expose it automatically

---

## Color token system (`packages/ui/src/colors/`)

All colors are centralized in `packages/ui/src/colors/`. **NEVER hardcode hex values** (`#1a1a2e`, `0x10b981`) in any file. Use the token system.

### File structure
| File | Purpose |
|------|---------|
| `tokens.ts` | 104 color tokens defined as hex strings (`tokens` object). Exports `COLORS` (string), `COLOR` (pre-computed 0x numbers), `hexToNumber()`, `ColorToken` type |
| `index.ts` | Barrel — `export { COLORS, COLOR, hexToNumber }` + `export type { ColorToken }` |

Root barrel re-exports via `export * from "./colors"`.

### Dual-format exports

| Export | Type | Example | Use case |
|--------|------|---------|----------|
| `COLORS` | Record of hex strings | `COLORS.success` → `"#10b981"` | Emotion styled, inline CSS, string props |
| `COLOR` | Record of 0x numbers | `COLOR.success` → `0x10b981` | PixiJS fills, strokes, text styles |
| `hexToNumber()` | `(hex: string) => number` | `hexToNumber(COLORS.error)` → `0xef4444` | Dynamic PixiJS color from hex string |

### Usage patterns
```tsx
import { COLORS, COLOR, hexToNumber } from "@gd-monorepo/ui";

// Emotion / CSS-in-JS
const Card = styled.div`
  background: ${COLORS.bgCard};
  border: 1px solid ${COLORS.borderDefault};
  color: ${COLORS.textPrimary};
`;

// PixiJS graphics (number format)
g.fill({ color: COLOR.success });
g.stroke({ width: 2, color: COLOR.borderStroke });

// Dynamic PixiJS conversion
const c = hexToNumber(someHexString);
g.fill({ color: c });

// Inline styles (plain string value, no template literal needed)
const style = { color: COLORS.textMuted };
```

### Token groups (104 tokens)
| Group | Count | Examples |
|-------|-------|----------|
| **Status** | 14 | `success`, `successGlow`, `successHover`, `warning`, `warningGlow`, `warningHover`, `error`, `errorHover`, `errorStroke`, `info`, `infoDark`, `infoLight`, `infoHover`, `idle` |
| **Surface** | 14 | `bgApp`, `bgCard`, `bgPopup`, `bgHeader`, `bgInput`, `bgPanel`, `bgRoom`, `bgSkeleton`, `bgHover`, `bgTag`, `bgVerbose`, `bgSystemBar`, `bgCodeDark`, `bgCodeLight` |
| **Border** | 5 | `borderDefault`, `borderStroke`, `borderLight`, `borderHover`, `borderDivider` |
| **Text** | 10 | `textPrimary`, `textWhite`, `textMuted`, `textDisabled`, `textLight`, `textVoltage`, `textPurple`, `textTagGray`, `textNearWhite`, `textNearBlack` |
| **Gradient** | 9 | `gradBodyTop`, `gradBodyBot`, `gradMid`, `gradMid2`, `gradLow`, `gradScreen`, `gradPanelTop`, `gradDeviceIdStart`, `gradDeviceIdEnd` |
| **Temperature** | 3 | `tempCold`, `tempChilly`, `tempHot` |
| **Special** | 7 | `cable`, `terminal`, `shadow`, `dcActiveCenter`, `dcActiveEdge`, `dcIdleCenter`, `dcIdleEdge` |
| **Alpha** | 12 | `infoAlpha8`, `infoAlpha12`, `infoAlpha25`, `successAlpha12`, `successAlpha25`, `errorAlpha12`, `errorAlpha19`, `errorAlpha25`, `errorAlpha50`, `warningAlpha12`, `warningAlpha25`, `idleAlpha12` |
| **Chart** | 16 | `chart1`..`chart16` |
| **Accent** | 2 | `accentLight`, `accentDark` |

### Adding a color token
1. Add the entry to the `tokens` object in `tokens.ts` (hex string format only — e.g. `myColor: "#ff9900"`)
2. `COLOR` (0x numbers) and `ColorToken` union type are **auto-derived** from `tokens` keys — no manual sync needed
3. Use semantic names: group prefix (`bg*`, `text*`, `border*`, `grad*`) for surfaces; adjectives for status (`success`, `warning`, `error`, `info`, `idle`); `*Hover`/`*Glow` for variants; `*AlphaXX` for opacity variants

### Migration rule
When touching any file with hardcoded hex colors:
1. Replace `#hex` with `COLORS.*` (CSS/Emotion) or `0xhex` with `COLOR.*` (PixiJS)
2. If no matching token exists, add it to `tokens.ts` **first**, then use the token
3. Never leave a one-off hex value behind

---

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
- **Async loops (MANDATORY):** Never use `for...of` with `await` inside. Always use `Promise.all` or `Promise.allSettled`. If sequential execution is required, use `Promise.allSettled` with explicit ordering or a dedicated queue mechanism.

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
- **Auth/DI/Validation:** jose v5 (JWT), awilix v11 (DI container), zod v3 (validation)

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

## Elegant Object Principles (MANDATORY for all new code & refactors)

All code MUST adhere to the following object-oriented design principles derived from "Elegant Object" by Yegor Bugayenko. These rules override any other conventions in case of conflict.

### 1. No static methods (ever)
- **Static methods are procedural, not object-oriented.** They are banned.
- Use real objects with constructors and instance methods instead.
- **Exception:** Factory methods (e.g., `public static MyClass create(...)`) are allowed ONLY for simple object instantiation when the constructor signature is complex or overloaded. They must return a new instance.

### 2. No NULLs (use Optional or Null Object Pattern)
- **Returning `null` is forbidden.**
- For optional values, use `T | undefined` or `null` only for performance-critical internal code with explicit `// @ts-ignore` comment explaining why.
- For public APIs and interfaces, use `Optional<T>` (from `fp-ts` or similar) or a Null Object implementation (e.g., `class NullLogger implements ILogger { log() {} }`).
- **Validation:** Always validate constructor arguments. Throw `IllegalArgumentException` (or `new Error()`) on invalid input—never accept `null` silently.

### 3. Immutable objects (prefer `readonly`)
- **Make objects immutable whenever possible.** Mark all fields as `readonly` or `private readonly`.
- State changes should produce **new objects**, not mutate existing ones (e.g., `withState(newState): ThisClass` returns a new instance).
- **Mutable objects are allowed only** if they are clearly state machines (e.g., `ModbusDevice` with `connect()`/`disconnect()` lifecycle) and explicitly documented as "mutable by design".

### 4. Never use `instanceof` or type reflection
- **Do not inspect an object's type at runtime.** Avoid `instanceof`, `typeof`, or checking for the existence of methods to decide behavior.
- Instead, use **polymorphism**: call a method on the object and let the object decide what to do.
- **Exception:** Adapter classes may use `instanceof` internally ONLY when interfacing with third-party libraries.

### 5. No getters/setters (tell, don't ask)
- **Avoid "getter" methods that expose internal state.** Do not ask an object for data and then perform logic on it outside the object.
- **Instead, tell the object what to do:** The object should contain the behavior.
- **Exception:** Data Transfer Objects (DTOs) for serialization (e.g., REST responses, database entities) MAY have public getters/setters but should be clearly separated from domain objects.

### 6. Objects are not data structures
- **Do not use objects as simple data bags.** A class must have behavior.
- Anemic models (classes with only fields and getters/setters) are prohibited.
- **Refactor rule:** If a class has no methods that operate on its own data, move the behavior into the class.

### 7. Naming: "Manager", "Processor", "Utils" are forbidden
- **Do not use generic suffixes like `*Manager`, `*Processor`, `*Handler`, `*Utils`, `*Helper`.** These are signs of procedural design.
- **Instead, name the class for what it *is* (a noun) or what it *does* (a verb with -er/-or) in the domain:**
  - ✅ `ModbusDevice`, `JobQueue`, `TimescaleWriter`
  - ❌ `DeviceManager`, `QueueProcessor`, `DBHelper`
- **For factories:** Use `*Factory` or `*Builder` (e.g., `ModbusDeviceFactory`).

### 8. One primary constructor (no overloading)
- **A class should have one primary constructor** that sets all its final fields.
- Secondary constructors are banned. Use static factory methods with descriptive names (`MyClass.withConfig(Config c)`) instead.
- All logic must be in the primary constructor—never in default values or chained calls.

### 9. Never use `@Inject` or DI containers to inject behavior (only state)
- **Dependency injection should inject state (configuration, connections), not behavior.**
- Do not inject factories or service locators. Inject concrete instances that represent state.
- In our codebase: DI container (awilix) is planned, but constructor injection is mandatory (see existing DI rules).

### 10. Code must be testable (but not over-engineered)
- **Write unit tests for all public methods.** (Existing `vitest` config is available.)
- **But follow YAGNI:** Only write tests for behavior you need *now*, not for every possible edge case.

### 11. Method naming: Command vs Query (Verb/Noun distinction)
- **Methods must be either commands or queries, never both.**
- **Command methods (verbs):** Perform an action, change state, or produce a side effect. They MUST return `void` (or `Promise<void>` for async).
  - ✅ `save()`, `delete()`, `connect()`, `send(message)`, `write(data)`
  - ❌ `saveAndReturnId()` (does both - violates CQS)
- **Query methods (nouns):** Return data about the object's state. They MUST NOT modify state or produce side effects.
  - ✅ `name()`, `total()`, `isConnected()`, `size()`, `get()` (only if returns a value, not a property)
  - ❌ `getName()` (redundant prefix - just `name()`)
  - ❌ `calculateTotal()` (if it's just returning a computed value, use `total()`)
- **Rule of thumb:** If the method name is a verb, it returns `void`. If it returns something, its name must be a noun.
- **Exception:** Factory methods (`create()`, `of()`, `with()`) and builder methods are exempt from this rule as they return new instances by design.
- **For async operations:** The same rule applies with `Promise<void>` for commands and `Promise<T>` for queries.

### Refactoring guidance for existing code
- **When touching a class for any reason, refactor it to these rules.**
- **Exceptions** to these rules must be documented with a `// ELEGANT-EXCEPTION: <reason>` comment.
- **Priority:** If a rule contradicts the existing "Coding conventions (repo-wide)", the Elegant Object rule takes precedence.


<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax


<!-- nx configuration end-->