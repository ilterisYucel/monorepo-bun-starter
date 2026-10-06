# AGENTS.md

## Quick commands

```
bun install                     # Install deps (Bun only, no npm/pnpm/yarn)
bun run dev                     # All apps in parallel (max 5)
bun run dev:container-web                 # Web only (Vite, port 5173)
bun run dev:container-desktop             # Electron only
bun run dev:container             # Full stack (Docker dev mode)
bun run start:container           # Full stack (Docker prod mode)
bun run stop:container            # Stop container stack
bun run start:aws-edge            # AWS edge stack (container+field, Makine A)
bun run stop:aws-edge
bun run start:aws-boss            # AWS boss stack (Makine B)
bun run stop:aws-boss
nx run demo-backend:dev         # Demo Backend (Fastify, port 5000)
nx run web-service:dev          # Web Service (Fastify, port 5001)
nx run device-service:dev       # Device Service (Modbus poller)
nx run data-service:dev         # Data Service (BullMQ consumer)
bun run build                   # Build all (Nx orders by ^build deps)
bun run test                    # All unit/component/integration tests (vitest workspace)
bun run test:coverage           # With coverage report
bun run test:e2e                # Playwright (requires docker stack)
bun run test:perf               # k6 smoke tests
bun run spec:check <dosya...>   # SPEC/KAPANIŞ doküman lint'i (şablon + ID + GWT + referans kapısı)
bun run test:inventory          # Test envanterini test dosyalarından OTOMATİK üretir (docs/roadmap/test-envanteri.otomatik.md)
nx run <proj>:test              # Single project tests
nx run <proj>:<target>          # Run any Nx target
nx graph                        # Dependency graph visualizer
```

No root `lint` or `format` scripts exist. Linting is per-project.

## Detay referansları (ihtiyaç anında oku)

Bu dosya yalnızca **her göreve uygulanan kuralları** taşır. Aşağıdaki referanslar
her oturumda yüklenmez; **görev başında dokunulacak yollar/semboller tablonun Tetik
sütunuyla eşleştirilir; eşleşen TÜM satırlar ve `Birlikte oku` sütunundakiler okunur.**
Eşleşme belirsizse referans dosyası okunur (küçük dosya, maliyet düşük).

| Dosya | Konu | Tetik (yol / sembol / görev) | Birlikte oku |
| :--- | :--- | :--- | :--- |
| `AGENTS-INFRA.md` | Monorepo, paket tablosu, DI, desenler, sürümler, SIGILL | Yeni paket/workspace; `nx.json`; tsconfig build; DI arayüzü; framework sürümü | — |
| `AGENTS-DEVICE-CONFIG.md` | Telemetry tagging & canonical metrics | `deployment/**/device-configs/*.json`; `services/device-service/deployment/sample-config/`; kök `configs/`; `canonical`; `TelemetryTagger` akışı; telemetri/tag/bitfield alanı | `AGENTS-DEVICE-SERVICE.md` |
| `AGENTS-WS-TUNNEL.md` | Tunnel / TunnelConnector sözleşmeleri | `packages/ws-tunnel/**`; `TunnelConnector`; `FrameCodec`; `SessionGateway`; `TunnelProxy`; frame/stream/session işi | `AGENTS-KOMUT-MANEVRA.md` (boss→field kanalı) |
| `AGENTS-DEVICE-SERVICE.md` | Device transport strategy | `packages/core/src/modbus/**`; `packages/simulators/**`; `services/device-service/**`; `ModbusDevice`; `IModbusTransport`; `SimulatorHost` | `AGENTS-DEVICE-CONFIG.md` |
| `AGENTS-KOMUT-MANEVRA.md` | Komut config / manevra / operasyon | `packages/platform/commands/**`; `maneuver-routes.ts`; `operation-boss-routes.ts`; `maneuvers.json`; `operations.json` | `AGENTS-WS-TUNNEL.md`, `AGENTS-DEVICE-CONFIG.md` |
| `AGENTS-FRONTEND.md` | Frontend transport & provider kontratları | `packages/ui/src/transports/**`; `packages/ui/src/interfaces/**`; `TransportContext.tsx`; `ITelemetryTransport`; provider/hook veri akışı | `AGENTS-UI.md` |
| `AGENTS-UI.md` | Icon / renk token / sprite pipeline | `packages/ui/src/icons/**`; `packages/ui/src/colors/**`; `packages/ui/src/assets/**`; `packages/ui/src/graphics/**`; `SCADA_ICONS`; `COLORS`; `sprite:*`; `sprites-spec.mjs` | `AGENTS-FRONTEND.md` |

## Testing

- **`TESTING.md` is the authoritative testing reference** — layers, file naming, mocking rules, coverage targets, and commands. Read it before writing or running any test.
- Unit/component/integration: Vitest workspace (`vitest.workspace.ts`).
- E2E: Playwright (`e2e/`). Perf: k6 (`deployment/k6/`). Both via root scripts.
- Mocking rules: external deps (redis, pg, bullmq) via `vi.mock()` + root-level `__mocks__/`; `@gd-monorepo/*` internal packages are never mocked.

### Geliştirme İş Akışı (MANDATORY for new code)

**Yeni modüller** (her yeni sınıf/modül/fonksiyon) katı TDD ile, **5 aşamalı iş akışıyla** geliştirilir — **2 doküman/modül** (SPEC + KAPANIŞ):

```
1. SPEC     docs/architecture/<MODUL>-MIMARISI.md      — kapsam, bileşenler, kontratlar, FR-x gereksinimler,
                                                         GWT kabul senaryoları, AK kabul kriterleri, T görev listesi
                                                         (kanonik format: `docs/architecture/SPEC-SABLONU.md`)
2. JSDoc    interface/tip + davranış sözleşmesi        — state'ler, edge-case'ler, hata kategorisi, yan etkiler, limitler
3. TEST     *.test.ts (KIRMIZI)                        — sözleşmeyi sabitler; implementasyon yokken kırmızı verir
4. IMPL     minimal implementasyon (YEŞİL) + refactor  — yalnızca testi yeşile çeviren kod; Elegant Object + DI kuralları
5. KAPANIŞ  docs/architecture/<MODUL>-KAPANIS.md       — §A DOĞRULAMA (değişiklik matrisi, test kanıtları, AK kanıtları,
                                                         sapmalar, gözle kontrol) + §B TEST KAPSAMI (senaryo matrisi +
                                                         KAPSANMAYAN boşluklar) — TEK dokümanda, review_date ile
```

- **Kapılar (gözlemlenebilir):** SPEC yoksa test yazılmaz; test yoksa implementasyon başlamaz; KAPANIŞ güncel değilse modül kapanmaz (PR merge edilmez). Geriye dönük zorunluluk YOK — kural yeni modüller ve dokunulan modüller için geçerlidir.
- **SPEC onay kapısı (MANDATORY):** SPEC dokümanı yazıldıktan/revize edildikten sonra implementasyon **developer onayı BEKLER** — onay alınmadan test/implementasyon başlamaz. SPEC'i yazan ajan, developer'ı dokümanı incelemesi için **açıkça uyarır** (doküman yolu + "onay bekliyor" durumuyla); iş ancak developer onayı sonrası sürer.
- **SPEC revizyon kapısı (MANDATORY):** Build modunda (flash) SPEC içerik kararları (K-x, FR-x, AK-x, GWT) yeniden yazılmaz — flash SPEC'i yalnızca tüketir. Implementasyon sırasında revize ihtiyacı doğarsa iş durur; developer plan moduna (pro) döner, SPEC orada revize edilir ve **SPEC onay kapısı** yeniden işletilir.
- **SPEC formatı (kanonik):** Tüm yeni/revize SPEC'ler `docs/architecture/SPEC-SABLONU.md` şablonunu kullanır — doküman iskeleti (metadata, kararlar K-x, purity, yaşam döngüsü, başarı kriterleri SC-x, aşama eşlemesi, açık kararlar A-x) + use-case blokları (Status, Kapsam dahil/hariç, Akış, **FR-x gereksinim tablosu**, **GWT kabul senaryoları** — her AK için en az 1 Given/When/Then —, AK tablosu Kanıt+Durum sütunlu, T görevleri, Edge Cases, Involved Files). **Status değerleri:** `✏️ Specified` (onay bekliyor) → `✅ Approved` → `🟡 Geliştirmede` → `🟢 Doğrulanmış` → `⛔ Defer`. Geriye dönük dönüşüm YOKTUR — yalnızca yeni/dokunulan SPEC'ler.
- **KAPANIŞ otomasyonu:** Aşama 5 (KAPANIŞ) başladığında ana agent, `@reviewer` subagent'ını otomatik çağırır. Reviewer, diff'i analiz eder ve `<MODUL>-KAPANIS.md` dosyasını §A DOĞRULAMA + §B TEST KAPSAMI formatında üretir. Ana agent reviewer çıktısını doğrudan kullanır.
- **Kod referansı (MANDATORY):** Dokümanlarda kod `#sembol` çapasıyla referanslanır — `path/file.ts#fonksiyonAdı` (+ denetim için opsiyonel `@<git-short-hash>`). **Satır numarası referansı (`file.ts:123`) YASAKTIR** — edit sonrası bayatlar (yalnızca aynı PR içi geçici analiz notlarında serbest).
- **Lint kapısı (MANDATORY):** SPEC/KAPANIŞ kapanmadan `bun run spec:check <dosya...>` temiz olmalıdır — şablon bölümleri, ID benzersizliği (K/B/FR/SC/AK/T/A/UC), AK↔GWT eşleşmesi, FR→AK eşleşmesi, T özet kapsaması, status enum'u, satır-referans yasağı.
- **JSDoc önce:** Test yazılmadan önce davranış sözleşmesi JSDoc ile yazılır: state'ler, edge-case'ler, hata kategorisi (beklenen → `Result<T,E>`, beklenmeyen → `DomainError`), yan etkiler, limitler.
- **Test sonra:** `*.test.ts` sözleşmeyi sabitler ve kırmızı verir; implementasyon testi yeşile çevirir. Test yoksa implementasyon başlamaz.
- **Legacy karakterizasyon testleri:** Değiştirilecek testsiz modüllerde (örn. `rbac.ts`, `field-routes.ts`, `ws-routes.ts`, `bullmq-adapter.ts`) önce **mevcut davranış** testle sabitlenir — bug/delik dahil — sonra değişiklik yapılır.
- **Kapılar:** Yeni kodda ≥%70 satır (SonarCloud kapısı); **güvenlik-kritik modüllerde ≥%90 branch**: rbac, token-adapter, ws/auth doğrulama, session-gateway, tunnel frame codec, field-connector, komut validasyonu.
- **Test dokümantasyonu:** KAPANIŞ §B **yaşayan çalışma dokümanıdır** — test genişletileceği zaman üzerinde çalışılır (KAPSANMAYAN boşluk listesi birincil girdidir). Test envanteri **otomatiktir**: `bun run test:inventory` test dosyalarından `docs/roadmap/test-envanteri.otomatik.md`'yi üretir — elle it-by-it kopya YAPILMAZ; `test-envanteri.md` elle yazılan indeks/bağlam notları için kalır. Test değişince envanter komutu tekrar koşulur.
- **Güvenlik hedef standardı:** OWASP ASVS **Level 2** — kategori → check eşleme matrisi, SAST'in doğrulayamadıkları ve release kontrol listesi: `docs/standards/owasp-asvs-level2.md`.
- **Kural: testsiz PR merge edilmez.**
- **Test borcu:** Dokunulacak testsiz dosya → önce testi yazılır. Sıra: dokunulacaklar > güvenlik/altyapı kritik > geri kalan (bkz. TESTING.md mevcut durum envanteri).
- **Faz kapanışı doğrulaması (MANDATORY):** `KONTEYNER-UZAKTAN-ERISIM-MIMARISI.md` Faz 0-6 görevlerinde her faz kapanışında `docs/architecture/KONTEYNER-UZAKTAN-ERISIM-DOGRULAMA.md`'ye giriş zorunludur (legacy özel kural — geriye dönük). KONTEYNER fazları dışındaki yeni modüller yukarıdaki 5 aşamalı akışı kullanır ve kendi `<MODUL>-KAPANIS.md` dosyalarını üretir.

## Dependency injection rules (MANDATORY)

**Every new class MUST follow these rules.** awilix is used in `web-service`; other packages use manual constructor injection.

1. **Plain constructor injection only.** All dependencies are passed via `constructor(private dep: Type)`. No `@Injectable()`, no decorators, no service locator globals.
2. **No default exports.** Every file uses named exports exclusively.
3. **Config objects, not primitives.** When a class needs >2 primitive config values, define a `*Config` interface (e.g. `TimescaleDBConfig`, `ModbusClientConfig`) and pass that single object.
4. **Interfaces for swappable backends.** Use `I`-prefixed interface contracts (e.g. `IMessageQueue`, `ITimeseriesDatabase`). Concrete adapters implement them. Interfaces live in `domain/` (services) or `shared-types` (cross-package). Mevcut liste + örnekler: `AGENTS-INFRA.md`.
5. **Inject constructed instances, not raw configs, when the resource may be shared.** Example: `BullMQAdapter` receives a `RedisConnection` instance (not `RedisConfig`) — so one Redis connection can be reused across queues.
6. **Wiring happens in `main()` or DI container.** In `web-service`, awilix `asFunction` registers all dependencies (see `src/config/container.ts`). In other packages, all `new X(...)` calls happen in a single bootstrap function.
7. **Lifecycle methods.** Classes that manage external resources must expose `connect()`/`disconnect()` or `close()` + `health()` patterns. All startup/shutdown sequences go in `main()`.

## Cihaz alarm sözleşmesi (MANDATORY — Faz 0 eki)

> Detay: `docs/architecture/DEVICE-SERVICE-MIMARISI.md` §4.2 + `KONTEYNER-UZAKTAN-ERISIM-MIMARISI.md` (Faz 0 alarm sözleşmesi).

- **Tek kaynak — config kuralı:** Alarm tanımları YALNIZCA device config'teki üst seviye `alarms` bölümündedir: `{ telemetry: <ad>, severity: "error"|"warning"|"info", description?, activeLow? }`. Alarm adı = telemetri adı. Config dışında (kod, tag, enum) alarm kaynağı YOKTUR.
- **Cihaz tipinden bağımsız:** Değerlendirme yalnızca device-service'te, standart `TelemetryData[]` akışı üzerinde yapılır (`AlarmTransitionDetector` + `alarmSamples`). `IDevice` alarm API'si taşımaz (ISP). Modbus, CANbus, MQTT, simülatör — hepsi aynı yoldan geçer; telemetri üretmek yeterlidir.
- **Dedup (geçiş-odaklı):** `device_alarm` logu YALNIZCA yükselen kenarda basılır (aktifken saniyelik poll'lar sessizdir); düşen kenarda `device_alarm_cleared`; koşul bitip yeniden başlarsa YENİ oluşum = yeniden tek log. Aynı isimli birden fazla telemetri satırı (örn. rack başına) OR ile birleşir.
- **Kalıcılık — 3 katman:** (1) `device_alarms` durum tablosu (tek satır/(device_id, alarm_name), yalnızca geçişlerde UPSERT; `resolved/resolved_by/resolved_at` TEIAŞ işareti), (2) geçiş logları TamperLogger'dan imzalı (geçmiş = `log_events`, `verify-log.mjs` ile denetlenebilir), (3) telemetri alarm metadata'sı TAŞIMAZ.
- **Resolve akışı:** `POST /api/unified/alarms/resolve` — admin/teknik; audit `alarm_resolved` (fail-closed — audit yazılamazsa çözme reddedilir); aktif olmayan alarm 409. Teknisyen bit=1'ken "çözüldü" işaretlese bile yeni log basılmaz (loglama fiziksel kenara bağlıdır; resolved satır meta verisidir).
- **Restart:** device-service `start()` bayat aktif satırları kapatır + dedup state'ini sıfırlar (aktif koşul yeniden yükselen kenar sayılır).

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

## Docker / deployment

- Compose files: site/tier bazlı — `deployment/{dev,prod}/{container,field,boss}/docker-compose.yml`, `deployment/aws/{edge,boss}/docker-compose.yml` (prod + dev) — the **product layer**. Site config'leri compose'un yanındaki `device-configs/`, `maneuvers/`, `rules/`, `plugins/` dizinlerinde; servis `deployment/` dizinleri yalnızca örnek taşır.
- Stack: TimescaleDB + Redis + web-service + device-service + data-service (+ integration-service in boss) + web frontend.
- **Env convention (MANDATORY):** env dosyası ilgili stack dizininde compose'un yanında yaşar — `deployment/<site>/<tier>/.env` (gitignore'lu). Her `docker compose` çağrısı ilgili dosyayı `--env-file deployment/<site>/<tier>/.env` ile geçer (script'ler `package.json`'da hazır). Kökte yalnızca commit'lenen şablonlar kalır: `deployment/.env.<tier>.example` (sır yok; tier dizinine `.env` olarak kopyalanıp doldurulur). Tier dosyasına ait olmayan alan YAZILMAZ (örn. `CONTAINER_TOKEN` yalnızca `container/.env`'de; field token'ı register API'siyle hash olarak DB'de tutar).
- Backend Dockerfiles: `services/*/deployment/` (prod) + `Dockerfile.dev` (hot-reload).
- Web Dockerfiles: `apps/container-web/deployment/`.
- Customer plugins: `deployment/customer-plugins/` (mounted into integration-service at runtime).

## Package manager lock-in

- **Bun only.** `bun install`, `bun run`, `bun build`, `bun --watch`.
- `bun.lock` is committed. No `package-lock.json`, `yarn.lock`, or `pnpm-lock.yaml`.
- Workspace dependencies use `"*"` version (e.g. `"@gd-monorepo/core": "*"`).

## Build artifacts rule

- Paket dizinlerinde bare `tsc` çalıştırılmaz — composite projeler `outDir` yerine src'e emit edebilir. Nx hedefleri (`nx run <p>:build/test`) veya `tsc -b` kullanılır.
- `*.d.ts`, `*.d.ts.map`, `*.tsbuildinfo` build çıktısıdır ve gitignore'dadır; el yazımı tip dosyaları yalnızca `src/preload/index.d.ts` (Electron) ve `vite-env.d.ts`/`vite.env.d.ts` (Vite env) kalıplarıdır.

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
- **Instead, name the class for what it _is_ (a noun) or what it _does_ (a verb with -er/-or) in the domain:**
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
- **But follow YAGNI:** Only write tests for behavior you need _now_, not for every possible edge case.

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

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:

- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
