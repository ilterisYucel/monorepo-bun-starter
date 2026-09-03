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
| **OWASP ASVS 4.0** | Application security verification | **Level 2 hedef** — kategori → test/check eşlemesi: `docs/standards/owasp-asvs-level2.md` |
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
| **Security** | Auth bypass tests, input validation, JWT token tests, RBAC verification (ASVS L2: V2/V3/V4/V5/V13 — bkz. `docs/standards/owasp-asvs-level2.md`) |
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

### Current Coverage Reality (2026-08-30 — test-gelistirme-plani T1-T6 sonrası güncellendi)

Yukarıdaki sayılar hedeftir. Gerçek envanter (backend yoğun katmanlar):

| Paket/Servis | Test dosyası | Test sayısı | Verdict |
|---|---|---|---|
| shared-types | 8 | 111 | En iyi — Result + tüm zod şemaları |
| core | 23 | 223 | Logging/tamper/frame-codec/decoder tam; **ModbusDevice write/writeAtomic rollback + ModbusTcpClient/RTU + RedisConnection artık testli (T1.1/T3)**; TimescaleDBAdapter write/INSERT testli (downsampling perf'i hâlâ açık — S11) |
| shared-utils | 2 | 17 | definitions + **ConfigLoader/sources/units testli (T3)** |
| simulators | 7 | 54 | PCS/EMU/HVAC/CB/DC tam; **BSC temel karakterizasyon testli (T4)**; XRack/EnergyAnalyzer + Modbus adapter'ları hâlâ açık |
| plugin-sdk | 5 | 25 | İyi; timeout/abort eksik |
| epias-client | 2 | 13 | Ticket store iyi; 8/9 endpoint metodu testsiz |
| plugins/epias-market-prices | 1 | 7 | Fetch akışı iyi; health/deactivate/parseSeries eksik |
| editor | 1 | 4 | device-catalog smoke + registry invariant'leri |
| web-service | 47 | 569 | **RBAC (38), token-adapter güvenlik ekleri (16), ws-routes (7), TOTP throttle (5), bun-password-hasher (4), user-repository MFA (10) testli (T1)**; route/use-case/middleware katmanı tam |
| device-service | 7 | 25 | Loader/factory/scheduler/tagger/alarm tam; **canonical tag testli (T3)** |
| data-service | 1 | 11 | Tek sınıf tam; failure propagation kısmen |
| integration-service | 2 | 17 | **error branch'leri + boş fetch + bilinmeyen plugin testli (T3)** |
| field | 16 | 100 | **AuthStore otomatik guest, api-client 401-refresh interceptor, useContainerTelemetry/sparkline testli (T2)**; page katmanı açık |
| container-web | 9 | 82 | **api-client interceptor (7), LogStore debounce (6), controlApi+transform (7), RealtimeContext (4) testli (T2)**; page/features katmanları açık |
| ui | 10 | 66 | **WebSocket/HttpPolling transport'ları (13), TranslationProvider (5), RackCard (5) testli (T2/T4)**; kart komponentlerinin çoğu açık (Storybook var) |
| superadmin | 1 | 3 | **Smoke testli (T4)** — sayfa katmanı açık |
| container-desktop | 0 | 0 | Vitest config/setup hazırlandı (matchMedia + alias); renderer import'u vite:import-analysis alias sınırı nedeniyle AÇIK (plan notu) |
| demo-backend | 1 | 1 | Smoke only — legacy |

**Toplam: 140 test dosyası / 1354 test** (root `bun run test:unit` — workspace'e field+superadmin eklendi, T6).

**Test borcu sırası (AGENTS.md TDD kuralı):** (1) dokunulacaklar (2) güvenlik/altyapı kritik — T1/T3 ile büyük ölçüde kapandı; kalan: simulators XRack/EnergyAnalyzer, ui kart komponentleri, container-web page/features, materialized-view-manager, awilix container smoke, (3) geri kalan.

**NIS-2 kanıt fabrikası (T6):** `@nis2-security` etiketli testler `nx run <proj>:test-nis2` ile ayrı koşar (core 29 + web-service 49 test); CI `.github/workflows/test.yml` (unit + nis2-security işleri); Playwright `security` projesi (`e2e/security/*` — TOTP kilit 429, alarm uçları KE, otomatik guest).

**Aksiyon:** `packages/shared-utils` test hedefi düzeltildi (T3) — ConfigLoader/sources/units/definitions testli.

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
| `editor` | Config editor logic | JSON schema validation, graph node operations, device-catalog registry |
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
- [x] All workspace projects have `test` Nx target
- [ ] `shared-utils` test script fixed (currently exits 1 — no test files)

---

## 8. TDD Workflow (MANDATORY)

### 8.1 Döngü

```
interface/tip → JSDoc kontratı → test (kırmızı) → minimal implementasyon (yeşil) → refactor
```

1. **JSDoc kontratı:** Davranış sözleşmesi kod yazılmadan yazılır — state'ler, edge-case'ler, hata kategorisi (beklenen → `Result<T,E>`, beklenmeyen → `DomainError`), yan etkiler, limitler. Test dosyasının başına bu kontrat referans olarak konur.
2. **Kırmızı test:** `*.test.ts` sözleşmeyi sabitler; implementasyon yokken kırmızı verir.
3. **Minimal implementasyon:** Yalnızca testi yeşile çevirecek kod; spekülasyon yok.
4. **Refactor:** Elegant Object + DI kurallarına uygun temizlik; testler yeşil kalmalı.

### 8.2 Legacy karakterizasyon testleri

Değiştirilecek testsiz modüllerde önce **mevcut davranış** sabitlenir — bug/delik dahil — sonra değişiklik yapılır. Kapsam (Faz 0-3 değişiklik listesi): `rbac.ts`, `field-routes.ts`, `ws-routes.ts`, `bullmq-adapter.ts`, `container-proxy.ts`, `device-service.ts`, `data-service.ts`, `token-adapter.ts`, `command-routes.ts`.

### 8.3 Kapılar

| Kapsam | Kapı |
|---|---|
| Yeni kod | ≥%70 satır (SonarCloud) |
| Güvenlik-kritik modüller | ≥%90 branch — rbac, token-adapter, ws/auth doğrulama, session-gateway, tunnel frame codec, field-connector, komut validasyonu |
| PR | Testsiz PR merge edilmez |

### 8.4 Test yazım kuralları

- Testler davranışı sabitler, implementasyonu değil — public API'den test et.
- Edge-case listesi JSDoc kontratından türetilir: sıfır değerler, sınır değerleri, boş girdiler, hata kategorileri.
- Zaman tabanlı davranışlar (backoff, TTL, tick) `vi.useFakeTimers` ile deterministik test edilir.
- Hata yolları: beklenen hatalar `Result` dönüşüyle, beklenmeyenler throw ile — ikisi de ayrı ayrı test edilir (bkz. docs/architecture/KONTEYNER-UZAKTAN-ERISIM-MIMARISI.md Faz 0 ek 2).

### 8.5 Yol haritası eşlemesi (test-önce görevler)

| Faz | Test-önce görevler |
|---|---|
| Faz 0 | `Result`/`DomainError` kontratları, TamperLogger pipeline (imza, zincir, drop politikası), sink'ler, frame codec öncesi shared-utils düzeltmesi |
| Faz 1 | RBAC/fieldIds/komut validasyonu karakterizasyon testleri → değişiklik |
| Faz 2 | ✅ **Tamamlandı (2026-08-25):** BullMQAdapter `JobType → JobsOptions` retry haritası testleri (Faz 0 T0.12) + FieldConnector (register, backoff, heartbeat, liveness, stale, config-update) — integration spec'i gerçek WS ile K2.1 ölçümlü |
| Faz 3 | ✅ **Tamamlandı (2026-08-25):** Tunnel frame codec round-trip + fuzz (kırmızı→yeşil, %96.4 branch) → session-gateway akışları (uçtan uca spec: K3.1-K3.3 gerçek WS ile) |
| Faz 4-5 | ✅ **Faz 4+5 tamamlandı (2026-08-25):** Faz 4: `session-auth` (storage izolasyonu + hydrate), `api-base` URL türetimi, tünel E2E. Faz 5: gerçek veri hook'ları (summarizeContainer testli), ContainerFrame + session-end, mock temizliği, **K5.1 canlı E2E (kart→özet→tam ekran→komut→audit)** |
| Faz 6 | ✅ **Tamamlandı (2026-08-26):** MFA akışı (TOTP RFC 6238 vektörleri + login-mfa/enroll/confirm/reset route'ları), rate-limit/hesap kilidi kuralları (RedisLoginThrottle — eşik/pencere/kilidi), SIEM sink'leri (RFC 5424 frame, webhook imza/retry), notifier adapterleri (SMTP/SMS) + TamperLogger alertRules (cooldown) |

### 8.6 Faz kapanışı doğrulaması (MANDATORY)

Her faz kapanışında [KONTEYNER-UZAKTAN-ERISIM-DOGRULAMA.md](../docs/architecture/KONTEYNER-UZAKTAN-ERISIM-DOGRULAMA.md) güncellenir:

1. Matrisin tüm satırları doldurulur: değişen dosyalar (satır ref'li + commit hash), nedeni, testler, geçme durumu, sisteme etkisi.
2. Kabul kriterleri teker teker kanıtla işaretlenir (test çıktısı, curl, DB kaydı, Playwright trace).
3. Gözle kontrol maddeleri tamamlanmadan faz kapanmaz.
4. Genel durum özeti + `review_date` güncellenir; sapma varsa doküman sapmaları bölümüne kaydedilir.
