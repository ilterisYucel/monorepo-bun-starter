# Testing Strategy — GD PMS Monorepo

## 1. Standards Reference

### International Standards for EMS/SCADA Testing

| Standard | Domain | Testing Requirement |
|----------|--------|---------------------|
| **IEC 60870-5-6** | Telecontrol conformance | Protocol frame format, data integrity, timeout behavior |
| **IEC 60870-5-601/604** | 101/104 conformance test cases | Specific test scenarios for telecontrol protocols |
| **IEC 61850-10** | Substation conformance | Data model correctness, GOOSE messaging, SCL validation |
| **IEC 62351** | Power system security | Authentication, TLS encryption, RBAC, key management |
| **IEC 61508** | Functional safety (SIL) | Fault injection, failure mode analysis, redundancy verification |
| **IEC 62443** | Industrial network security | Network segmentation, intrusion detection, patch management |
| **ISO/IEC 25010** | Software quality model | 8 quality characteristics (see below) |
| **ISO/IEC 29119** | Software testing | Test processes, documentation, design techniques |

### ISO/IEC 25010 Quality Characteristics

| Characteristic | Our Testing Approach |
|----------------|---------------------|
| **Functional suitability** | Unit tests for domain logic, integration tests for API correctness |
| **Performance efficiency** | k6 load tests (API, WebSocket), telemetry throughput benchmarks |
| **Compatibility** | Playwright cross-browser E2E, Modbus protocol conformance tests |
| **Usability** | Storybook visual tests, component interaction tests |
| **Reliability** | Fault injection (connection drop, Redis failure), reconnect logic tests |
| **Security** | Auth bypass tests, input validation, JWT token tests, RBAC verification |
| **Maintainability** | Code coverage (SonarCloud), no code smells, consistent patterns |
| **Portability** | Docker-based CI, platform-agnostic Bun runtime |

### National Requirements (TEIAS / Turkish Grid)

- SCADA poll cycle < 1s for critical devices
- Data integrity validation (CRC, checksum)
- Redundancy / failover testing (dual server, hot standby)
- Historical data retention and query performance
- Alarm handling: correct priority, acknowledgment flow, escalation
- Command execution: atomic operations, rollback on failure
- Real-time data accuracy: register map validation, byte order correctness

---

## 2. Testing Layers

```
┌────────────────────────────────────────────────────────┐
│ Layer 5: E2E (Playwright)                    ~15 tests │
│ Full docker-compose stack, real browser, critical paths│
├────────────────────────────────────────────────────────┤
│ Layer 4: Performance (k6)                    ~5 scripts│
│ API load, WS load, throughput, stress                  │
├────────────────────────────────────────────────────────┤
│ Layer 3: Integration (Vitest + Testing Library) ~80    │
│ API routes, component interactions, data pipelines     │
├────────────────────────────────────────────────────────┤
│ Layer 2: Component (Vitest + Storybook)       ~30      │
│ Isolated renders, interaction tests, visual regression │
├────────────────────────────────────────────────────────┤
│ Layer 1: Unit (Vitest)                       ~250      │
│ Pure functions, class methods, schema validation       │
└────────────────────────────────────────────────────────┘
```

### Layer 1: Unit Tests

**Runner:** Vitest | **Target:** Fast (<5s per project) | **Mock strategy:** In-memory stubs

| Project | Test Scope | Examples |
|---------|-----------|----------|
| `shared-types` | Zod schema validation, type guards | `TelemetryDataSchema.parse()` accepts valid / rejects invalid |
| `shared-utils` | Pure utility functions (when added) | `formatValue(12.34, "V")` → `"12.34 V"` |
| `core` | Domain classes with mocked externals | `ModbusDevice.read()` decodes registers; `BullMQAdapter.add()` serializes job |
| `simulators` | Device state machines | BSC transitions Charge→Idle→Discharge correctly; register values update |
| `web-service` (domain) | Domain services, entities | `PasswordHasher.hash()` / `.verify()`; `TokenService.sign()` / `.verify()` |
| `web-service` (application) | Use cases with mocked repos | `LoginUseCase` returns tokens on valid credentials, throws on invalid |
| `data-service` | Job handler logic | `TelemetryWriter.write()` formats SQL INSERT correctly |
| `device-service` | Config loader, poller | `ConfigLoader.load()` parses device JSON; poller produces correct job payload |
| `demo-backend` | Route handlers, service logic | Simulator adapter returns expected telemetry |
| `ui` | Utilities, transports, hooks | `hexToNumber()`, `WebSocketTransport` state machine, `useRealtimeTelemetry()` |
| `web` | Zustand stores, maneuver transforms | `LogStore.add()` deduplicates; maneuver transform splits power across devices |
| `desktop` | Main process utilities | Crash handler, auto-updater logic |
| `editor` | Config editor logic | JSON schema validation, graph node operations |
| `device-library` | Device definitions | Registry lookup, device type resolution |
| `eslint-plugin-energy` | ESLint rule logic | Custom rule detects forbidden patterns |

### Layer 2: Component Tests

**Runner:** Vitest + @testing-library/react | **Env:** jsdom | **Scope:** UI components only

| Component Type | Test Strategy |
|---------------|---------------|
| **Stateless components** | Render with props, verify output | `ManeuverCard` shows correct buttons per state |
| **Compound components** | Render with context providers | `DeviceTelemetryProvider` isolates streams |
| **PixiJS graphics** | Canvas mock snapshot | `BSCGraphic` fill color changes on alarm |
| **Charts (Recharts)** | Render with mock data | `MultiLineChart` renders correct series count |
| **Colors/Icons** | Snapshot tests | All 104 tokens are valid hex; all 35 icons resolve |

### Layer 3: Integration Tests

**Runner:** Vitest | **Mock strategy:** MSW (frontend), in-memory stubs (backend)

| Integration Point | Test Approach |
|------------------|---------------|
| **Fastify API routes** | `app.inject()` with in-memory DI container | Login → JWT → protected route |
| **WebSocket messages** | Mock WS server, verify client parsing | Telemetry batch → observer.onData called correctly |
| **BullMQ pipeline** | Stub Redis, verify job shape | Produce → consume → TimescaleDB write |
| **Modbus round-trip** | Simulator adapter as stub | Write register → read back → value matches |
| **React component + store** | Render with real Zustand store | Device list renders from store, filter updates list |
| **React component + API** | MSW intercepts fetch | Login form → MSW returns 200 → redirect to dashboard |

### Layer 4: Performance Tests

**Runner:** k6 | **Trigger:** Weekly CI | **Targets:**

| Scenario | VUs | Duration | Threshold |
|----------|-----|----------|-----------|
| API smoke (GET /api/telemetry) | 50 | 1m | p95 < 500ms |
| API load (POST /api/auth/login) | 100 | 2m | p95 < 1s |
| WebSocket connect + subscribe | 50 | 1m | connect < 200ms |
| Telemetry throughput | — | 5m | 10K msg/min processed |
| Maneuver execution | 10 | 1m | p95 < 2s |

### Layer 5: End-to-End Tests

**Runner:** Playwright | **Browsers:** Chromium, Firefox, WebKit

| Scenario | Path | Assertions |
|----------|------|-----------|
| **Auth flow** | Login → Dashboard | JWT stored, user info displayed, redirect works |
| **Dashboard telemetry** | Dashboard loads | Live data renders, gauges update, chart shows points |
| **Device navigation** | Devices → BSC-1 | Device list renders, click navigates to detail |
| **Maneuver execution** | Control → Run FL-03 | Steps execute, status badge updates, rollback shows on failure |
| **WebSocket resilience** | Kill WS → reconnect | Disconnected overlay → auto-reconnect → data resumes |
| **Alarm handling** | Simulator injects alarm | Alarm badge shows count, log terminal scrolls, chart annotation appears |
| **Session expiry** | Expired token → API call | 401 → redirect to login, no data leak |

---

## 3. CI/CD Pipeline

### PR Pipeline (every push/PR)

```yaml
.github/workflows/test.yml:
  checkout → setup-bun → bun install → nx build all → nx test all --coverage
  → upload coverage (lcov + junit) → sonar scan (quality gate)
```

### E2E Pipeline (PR + main)

```yaml
.github/workflows/e2e.yml:
  checkout → setup-bun → start docker-compose stack
  → Playwright tests (3 browsers) → upload screenshots/videos → teardown
```

### Performance Pipeline (weekly + manual)

```yaml
.github/workflows/perf.yml:
  checkout → start docker-compose stack → k6 run scenarios
  → upload report → teardown
```

### SonarCloud Integration

| Config | Value |
|--------|-------|
| `sonar.tests` | `apps,packages` |
| `sonar.test.inclusions` | `**/*.test.ts,**/*.spec.ts,**/*.test.tsx,**/*.spec.tsx` |
| `sonar.javascript.lcov.reportPaths` | `**/coverage/lcov.info` |
| `sonar.testExecutionReportPaths` | `**/test-results/junit.xml` |
| Quality gate | 70% line coverage on new code |

---

## 4. Test Conventions

### File naming
- `*.test.ts` — Unit tests (co-located with source)
- `*.spec.ts` — Integration/spec tests
- `__tests__/` — Alternative location for complex test suites
- `__mocks__/` — Manual mocks for external modules

### Test structure
```ts
import { describe, it, expect, beforeEach, vi } from "vitest";

describe("ModbusDevice", () => {
  describe("read()", () => {
    it("returns decoded values for holding registers", () => { ... });
    it("throws on timeout after configured duration", () => { ... });
  });
});
```

### Mocking rules
- **External deps** (redis, pg, modbus): Use `vi.mock()` + `__mocks__/`
- **Internal deps** (@gd-monorepo/*): Never mock — use real implementations
- **Fastify**: Use `app.inject()` for HTTP tests (no network)
- **React**: Use `@testing-library/react` + `jsdom` environment
- **Frontend HTTP**: Use MSW (`msw`) for API mocking in component tests

### Coverage targets
| Layer | Target | Enforcement |
|-------|--------|-------------|
| Lines | 70% | SonarCloud quality gate (new code) |
| Branches | 60% | SonarCloud quality gate (new code) |
| Functions | 70% | Informational only |
| Statements | 70% | Informational only |

---

## 5. Running Tests

### Local development
```bash
bun run test              # All projects (via vitest workspace)
bun run test:unit         # Unit tests only
bun run test:integration  # Integration tests only
nx run web:test           # Single project
nx run-many --target=test --all  # All projects via Nx
```

### With coverage
```bash
bun run test:coverage     # All projects with coverage report
```

### With watch mode
```bash
nx run web:test --watch   # Watch mode for single project
```

### E2E
```bash
bun run test:e2e          # Playwright (requires docker-compose stack)
```

### Performance
```bash
bun run test:perf         # k6 smoke tests
```

---

## 6. Project-Specific Config

All projects use the same vitest base config pattern. See each project's `vitest.config.ts`.

Key differences:
- **React projects** (ui, web, desktop, editor): `environment: "jsdom"`, React plugin
- **Backend projects**: `environment: "node"`
- **Pure type packages** (shared-types): `environment: "node"`, no special setup

---

## 7. Compliance Checklist

- [x] No test files excluded from SonarCloud analysis
- [x] Coverage reports in lcov format (SonarCloud compatible)
- [x] Test execution reports in JUnit XML format
- [x] CI pipeline runs tests before SonarCloud scan
- [x] Quality gate enforces coverage on new code
- [x] E2E tests cover critical user paths
- [x] Performance baselines established
- [x] All 15 projects have `test` Nx target
