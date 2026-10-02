---
status: active
space: agents
tags: [agents, referans, frontend, transport]
review_date: 2026-12-01
---

# AGENTS Detay Referansı — Frontend Data Contracts

> Bu doküman `AGENTS.md`'den taşınan **referans** içeriktir; her oturumda yüklenmez.
> `packages/ui` transport/provider kontratlarına veya app-layer veri akışına
> dokunacaksan oku. MANDATORY kural özeti `AGENTS.md`'de kalır.

**All UI components in `packages/ui` MUST be state-library-agnostic.** They receive data via props or React Context — never by importing TanStack Query, Zustand, SWR, or any state management library directly.

## Transport contracts (`packages/shared-types/src/telemetry/transport.ts`)

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

## Transport implementations (`packages/ui/src/transports/`)

| Transport              | Use Case                | Constructor                                                      |
| ---------------------- | ----------------------- | ---------------------------------------------------------------- |
| `WebSocketTransport`   | Production realtime     | `new WebSocketTransport(wsUrl, getToken?)`                       |
| `HttpPollingTransport` | Fallback, simple setup  | `new HttpPollingTransport({ endpoint, intervalMs?, getToken? })` |
| `MockTransport`        | Storybook, tests, demos | `new MockTransport(definitions, intervalMs?)`                    |

All implement `ITelemetryTransport`. Import from `@gd-monorepo/ui`:

```ts
import {
  WebSocketTransport,
  HttpPollingTransport,
  MockTransport,
} from "@gd-monorepo/ui";
```

## UI provider contracts (`packages/ui/src/interfaces/`)

| Interface                  | Purpose                                                   | Consumed By                 |
| -------------------------- | --------------------------------------------------------- | --------------------------- |
| `TelemetryProvider`        | Time-series telemetry data + range/points/filter controls | `TelemetryChart`            |
| `LogProvider`              | Log entries + add/clear actions                           | `LogTerminal`               |
| `EventAnnotationsProvider` | Event annotations for chart vertical lines                | `TelemetryChart` (optional) |

These are **interfaces only** — no implementations exist in `packages/ui`. Implementations live in `apps/container-web` (using TanStack Query, Zustand, etc.).

## Compound component contracts (`packages/ui/src/core/`)

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

## Transport wiring in apps (`apps/container-web/src/contexts/TransportContext.tsx`)

```tsx
// App-level transport selection:
<TransportProvider>
  <RealtimeProvider>
    {" "}
    ← uses useTransport('ws') internally
    <RouterProvider>...</RouterProvider>
  </RealtimeProvider>
</TransportProvider>
```

Any component can access transports via `useTransport('ws')` or `useTransport('http')`. This allows swapping transports at the app level without touching individual components.

## Data flow rules (MANDATORY)

| Package              | Allowed Imports                                    | Forbidden Imports                             |
| -------------------- | -------------------------------------------------- | --------------------------------------------- |
| `packages/ui`        | `react`, `@gd-monorepo/shared-types`, browser APIs | TanStack Query, Zustand, SWR, Axios, `apps/*` |
| `apps/container-web` | `@gd-monorepo/ui`, TanStack Query, Zustand, Axios  | — (app layer can use anything)                |

**UI components never:**

- Import `useQuery` or `useMutation` directly
- Await `fetch()` or `apiClient.get()` directly
- Manage their own data fetching lifecycle

**UI components always:**

- Accept a provider object via props (IoC)
- Or consume data from a parent compound component's Context
- Or receive fully-resolved data via props

## Existing contracts (frontend)

| Contract                   | Location                                  | Implementations                                                                        |
| :------------------------- | :---------------------------------------- | :------------------------------------------------------------------------------------- |
| `ITelemetryTransport`      | `shared-types/src/telemetry/transport.ts` | `WebSocketTransport`, `HttpPollingTransport`, `MockTransport` (all in `ui/transports`) |
| `TelemetryProvider`        | `ui/src/interfaces/telemetry-provider.ts` | `useTelemetryProvider` (in `apps/container-web/src/hooks/`)                            |
| `LogProvider`              | `ui/src/interfaces/log-provider.ts`       | `useLogStore` (Zustand, in `apps/container-web/src/stores/`)                           |
| `EventAnnotationsProvider` | `ui/src/interfaces/event-annotations.ts`  | `useEventAnnotations` (in `apps/container-web/src/hooks/`)                             |

## Adding a new data source

1. Implement `ITelemetryTransport` in `packages/ui/src/transports/` (e.g., `SseTransport`, `MqttTransport`)
2. Export from `transports/index.ts` — automatically available via `@gd-monorepo/ui`
3. Register in `TransportProvider` (or create custom provider)
4. All existing UI components now work with the new transport — **zero component changes**

## Vite resolves packages to source

`apps/container-web` and `apps/container-desktop` Vite config aliases map `@gd-monorepo/*` to `packages/*/src/` (not `dist/`) for HMR. Library builds are not required for frontend dev.
