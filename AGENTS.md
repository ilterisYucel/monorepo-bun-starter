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
| `simulators`   | BSC/HVAC/XRack device simulators — register-accurate                 |
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
