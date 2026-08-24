---
status: active
space: architecture
tags: [mimari, field, superadmin, auth]
review_date: 2026-08-24
---

# Field & Superadmin Apps — Architecture Plan

## Overview

Three-tier federated architecture. Each tier owns its database independently. Container telemetry data is **never duplicated** — field app queries containers on demand. Superadmin polls fields for aggregated status.

```
┌──────────────────────────────────────────────────────────────────┐
│ TIER 3: apps/superadmin (Mobile-First, Boss)                     │
│ • Own PostgreSQL (field catalog + auth + status snapshots)       │
│ • Polls field apps for aggregated status via REST                │
│ • Map of Türkiye + Field cards + Gauges                          │
│ • NO charts — simple visualizations only                         │
│ • PWA-ready                                                      │
└──────────────┬───────────────────────────────────────────────────┘
               │ REST (internet, periodic polling)
┌──────────────▼───────────────────────────────────────────────────┐
│ TIER 2: apps/field (Full Stack — Field Operator)                 │
│ • Own TimescaleDB (field-level devices only, NOT container data)  │
│ • Own device-service (reads field equipment — PCs, sensors)       │
│ • Own web-service (auth extended with fieldIds)                   │
│ • ContainerProxy: containers connect via WebSocket, pushes data   │
│ • ContainerProxy: pulls historical data from containers via REST  │
│ • PlayCanvas 3D + multi-container charts + gauges                 │
└──────┬─────────────────┬──────────────────┐
       │ WebSocket push  │ REST pull (charts)
┌──────▼──────┐   ┌──────▼──────┐   ┌──────▼──────┐
│ Container 1 │   │ Container 2 │   │ Container 3 │
│ TimescaleDB │   │ TimescaleDB │   │ TimescaleDB │
│ web-service │   │ web-service │   │ web-service │
│ (unchanged) │   │ (unchanged) │   │ (unchanged) │
│ PPC → field │   │ PPC → field │   │ PPC → field │
└─────────────┘   └─────────────┘   └─────────────┘
 TIER 1: Container (local network only, not internet-exposed)
```

**Key principle:** Container data is never duplicated at the field level. Field queries containers on demand for charts and detail views. Containers push only the latest telemetry snapshot via WebSocket for live gauges.

**Remote UI access (2026-08-19):** The same outbound container→field WebSocket is made duplex and carries a multiplexed HTTP/WS tunnel. Field users open the full container-web UI inside an iframe at `/containers/:containerId/ui`. Full protocol, session/audit model and implementation phases: [KONTEYNER-UZAKTAN-ERISIM-MIMARISI.md](./KONTEYNER-UZAKTAN-ERISIM-MIMARISI.md).

---

## App 1: `apps/field` (Full Stack — Field Operator)

### Backend

Extends and reuses patterns from `services/web-service`.

#### Modules

| Module | Source | Purpose |
|--------|--------|---------|
| **Auth** | Extend `web-service` auth | JWT + RBAC + `fieldIds` on User, `boss` role added |
| **Field API** | New routes in web-service | `GET/POST /api/fields`, `GET /api/fields/:id/containers`, `GET /api/fields/:id/aggregate` |
| **Container Proxy** | **New** — `packages/core/src/container-proxy/` | WebSocket server for containers to connect to; REST client for pulling historical data; caches latest values in Redis or in-memory |
| **Device Service** | Reuse `device-service` | Configured for field-level Modbus devices (PCs, environmental sensors) |
| **Data Service** | Reuse `data-service` | Consumes field-level telemetry jobs |
| **TimescaleDB** | New instance | Field-level device data only (hypertables per field device) |

#### ContainerProxy Interface

```ts
// packages/core/src/container-proxy/interface.ts

export interface IContainerProxy {
  start(): Promise<void>;
  stop(): Promise<void>;

  // Containers connect TO field app via WebSocket
  registerContainer(containerId: string, ws: WebSocket): void;
  unregisterContainer(containerId: string): void;

  // Real-time data from containers (pushed via WS)
  latestTelemetry(containerId: string): TelemetryData[];

  // Historical data (pulled from containers via REST)
  fetchHistorical(containerId: string, params: DownsampledQuery): Promise<TelemetryData[]>;

  // Multi-container parallel fetch
  fetchAllHistorical(containerIds: string[], params: DownsampledQuery): Promise<Record<string, TelemetryData[]>>;

  // Container connection status (for PPC indicator)
  connectionStatus(): Map<string, ConnectionState>;

  // Subscribe to container data stream (for field frontend real-time)
  subscribe(observer: ContainerObserver): () => void;

  // API endpoint health check for a container
  health(containerId: string): Promise<boolean>;

  // Remote UI sessions (2026-08-19 — session tunnel over the same WS)
  openSession(containerId: string, user: SessionUser): Promise<SessionTicket>;
  closeSession(containerId: string, sessionId: string): void;
}

export interface SessionUser {
  id: string;
  username: string;
  role: Role; // field role — mapped to container role by the container
}

export interface SessionTicket {
  sessionId: string;
  token: string;       // container-signed short-lived JWT (opaque to field)
  expiresInSec: number;
}

export interface ContainerObserver {
  onData(containerId: string, telemetries: TelemetryData[]): void;
  onConnectionChange(containerId: string, state: ConnectionState): void;
}
```

#### Container Remote UI — Session Tunnel (2026-08-19)

The duplex `/ws/container` channel carries an HTTP/WS tunnel. Field UI opens the container SPA in an iframe:

```mermaid
sequenceDiagram
  participant U as Field UI
  participant F as field web-service
  participant C as Container (FieldConnector)

  U->>F: POST /api/fields/:fid/containers/:cid/session (JWT)
  F->>C: {type:"open-session", sessionId, user{role}}
  C->>F: {type:"open-session-ack", token}   %% container-signed JWT
  F-->>U: Set-Cookie: container_session; Path=/containers/:cid/ui
  U->>F: iframe GET /containers/:cid/ui/**
  F->>C: {type:"stream-open", streamId, method, path}
  C->>F: binary stream frames + FIN
  F-->>U: streamed response (SPA, /api, /ws)
```

Key properties: single outbound connection per container (discovery preserved); container web-service signs session JWTs with its own secret (no secret sharing); field stores `session_audit` rows; RBAC mapping field `admin`/`teknik` → container `admin`, `boss` → `guest`; path allowlist blocks `/api/auth/login` inside the tunnel. Full spec: [KONTEYNER-UZAKTAN-ERISIM-MIMARISI.md](./KONTEYNER-UZAKTAN-ERISIM-MIMARISI.md).

#### REST Endpoints (extended in web-service)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/fields` | List fields accessible to current user (by fieldIds) |
| `GET` | `/api/fields/:fieldId` | Field detail + container list |
| `GET` | `/api/fields/:fieldId/summary` | Aggregated metrics across all containers in field |
| `GET` | `/api/fields/:fieldId/containers` | Container list with connection status |
| `GET` | `/api/fields/:fieldId/telemetry/latest` | Latest telemetry from all containers (fetched from containers) |
| `GET` | `/api/fields/:fieldId/telemetry/downsampled` | Multi-container downsampled data (proxied in parallel) |
| `GET` | `/api/fields/:fieldId/telemetry/:containerId` | Single container telemetry (proxied) |
| `POST` | `/api/fields` | Create field (admin/boss) |
| `PUT` | `/api/fields/:fieldId` | Update field (admin) |
| `DELETE` | `/api/fields/:fieldId` | Delete field (admin) |
| `POST` | `/api/fields/:fieldId/commands/execute-multi` | Execute multi-container maneuvers |
| `POST` | `/api/fields/:fieldId/containers/:containerId/register` | Register container service token + URL in field registry (admin) |
| `POST` | `/api/fields/:fieldId/containers/:containerId/session` | Open remote UI session (302 + `container_session` cookie) |
| `GET` | `/containers/:containerId/ui/*` | Reverse-proxied container SPA + API + WS through the tunnel |

#### Field DB (TimescaleDB)

Stores **field-level device data only** — NOT container telemetry.

```sql
-- Field devices (PCs, sensors at the field level)
-- Hypertables created per field device, same pattern as container TimescaleDB

-- Metadata table
CREATE TABLE fields (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  location      JSONB NOT NULL DEFAULT '{"lat": 0, "lng": 0}',
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Container registry (which containers belong to which field)
CREATE TABLE field_containers (
  field_id       UUID REFERENCES fields(id) ON DELETE CASCADE,
  container_id   TEXT NOT NULL,
  container_url  TEXT,                                    -- REST API base URL
  layout         JSONB,                                   -- { x, y, z, rotation, scale } for 3D
  PRIMARY KEY (field_id, container_id)
);

-- Users (extended from existing users table)
ALTER TABLE users ADD COLUMN field_ids UUID[] DEFAULT '{}';
ALTER TABLE users ADD CONSTRAINT valid_role CHECK (role IN ('admin', 'teknik', 'guest', 'boss'));
```

#### Docker Deployment

```yaml
# deployment/docker-compose.field.yml
services:
  field-web-service:
    build: apps/field-backend
    ports: ["5002:5002"]
    environment:
      - DB_HOST=field-timescaledb
      - REDIS_HOST=field-redis
    depends_on: [field-timescaledb, field-redis]

  field-data-service:
    build: extensions from data-service
    depends_on: [field-timescaledb, field-redis]

  field-device-service:
    build: extensions from device-service
    depends_on: [field-redis]

  field-timescaledb:
    image: timescale/timescaledb:latest-pg16

  field-redis:
    image: redis:7-alpine

  field-web:
    build: apps/field
    ports: ["5174:5174"]
```

---

### Frontend — `apps/field`

Directory structure mirrors `apps/container-web` exactly.

```
apps/field/
├── index.html
├── package.json
├── vite.config.ts                # Port 5174, same aliases as container-web
├── project.json
├── tsconfig.json
├── vitest.config.ts
└── src/
    ├── main.tsx
    ├── app/
    │   ├── App.tsx
    │   ├── providers.tsx         # QueryClient + TransportProvider + RealtimeProvider + ErrorBoundary
    │   ├── routes.tsx            # Role-based routes + PrivateRoute with fieldId check
    │   └── router.tsx            # createBrowserRouter
    ├── lib/
    │   ├── api-client.ts         # Axios singleton with token refresh
    │   └── query-client.ts       # TanStack QueryClient (same config as container-web)
    ├── stores/
    │   ├── FieldsStore.ts        # Fields list + selected field
    │   └── ContainerStore.ts     # Container list + connection status (from ContainerProxy)
    ├── contexts/
    │   └── FieldContext.tsx       # Current field context provider
    ├── layouts/
    │   ├── FieldShell.tsx        # Sidebar with field name, container list, nav, user
    │   ├── FieldShell.styles.ts
    │   ├── Sidebar.tsx           # Collapsible sidebar (reuse pattern from container-web)
    │   ├── SystemHeader.tsx      # Field status bar: field name, PPC status, clock
    │   └── SystemHeader.styles.ts
    ├── pages/
    │   ├── LoginPage.tsx         # Login → redirect based on role
    │   ├── FieldDashboardPage.tsx     # 3D viewer + gauge cards + alert terminal
    │   ├── ContainersPage.tsx         # Container list + detail (multi-container charts)
    │   ├── FieldChartsPage.tsx         # TelemetryChart with tag-based container selection
    │   ├── FieldControlPage.tsx       # Field-level maneuvers
    │   ├── FieldEventsPage.tsx        # Multi-container log viewer
    │   ├── FieldReportsPage.tsx       # Cross-container reports (placeholder)
    │   └── FieldDevicesPage.tsx       # Field-level device management
    └── features/
        ├── auth/
        │   ├── stores/AuthStore.ts          # Extended: + fieldIds, isBoss
        │   ├── hooks/useAuth.ts
        │   └── components/
        │       ├── LoginForm.tsx
        │       └── LogoutButton.tsx
        ├── field-dashboard/
        │   ├── hooks/
        │   │   ├── useFieldSummary.ts       # React Query: GET /api/fields/:id/summary
        │   │   └── useFieldTelemetry.ts     # Merged historical + WS realtime
        │   ├── services/fieldApi.ts
        │   └── components/
        │       ├── Field3DView.tsx          # Wraps PlayCanvasViewer from UI
        │       ├── FieldGauges.tsx          # DeviceGauges for aggregate field metrics
        │       └── FieldAlertTerminal.tsx   # LogTerminal filtered to field
        ├── containers/
        │   ├── hooks/useContainersData.ts
        │   ├── services/containersApi.ts
        │   └── components/
        │       ├── ContainerCard.tsx        # Per-container summary with PPC status
        │       └── ContainerDetail.tsx      # Full telemetry view drill-down
        ├── field-control/
        │   ├── maneuvers.ts                # Field-level maneuver definitions
        │   └── components/ManeuverPanel.tsx # Reuses ManeuverCard from UI
        ├── field-charts/
        │   ├── hooks/useContainerTelemetry.ts
        │   └── services/chartApi.ts
        ├── field-events/
        │   ├── hooks/useFieldLogs.ts
        │   └── services/fieldLogsApi.ts
        └── field-devices/
            ├── hooks/useFieldDevices.ts
            └── services/fieldDevicesApi.ts
```

#### Page Details

| Route | Page | Content |
|-------|------|---------|
| `/login` | `LoginPage` | Login form. On success: boss→/map, admin/teknik→/field/:firstFieldId |
| `/field/:fieldId` | `FieldDashboardPage` | PlayCanvas 3D viewer, field-level DeviceGauges (total power, avg SoC), LogTerminal (field alerts) |
| `/field/:fieldId/containers` | `ContainersPage` | Grid of ContainerCards (PPC status, latest metrics), click → ContainerDetail modal with full telemetry |
| `/field/:fieldId/charts` | `FieldChartsPage` | TelemetryChart with tag-based container selector. Multiple containers = multiple series. Color from chart palette. |
| `/field/:fieldId/control` | `FieldControlPage` | ManeuverPanel with field-level maneuvers (charge all, emergency stop field, sequential start) |
| `/field/:fieldId/events` | `FieldEventsPage` | Dual LogTerminal: system events + user actions, filtered to field scope |
| `/field/:fieldId/reports` | `FieldReportsPage` | Placeholder (same pattern as container-web) |
| `/field/:fieldId/devices` | `FieldDevicesPage` | Table of field-level devices (PCs, sensors) from field device-service |

#### FieldShell Layout

```
┌─────────────┬──────────────────────────────────────────────────┐
│ Sidebar     │ SystemHeader                                    │
│ (collapsed  │ Field: "Solar Park 1"    PPC: ✓ Bağlı   14:32   │
│  70px,      ├──────────────────────────────────────────────────┤
│  expanded   │                                                  │
│  260px)     │  Page Content                                    │
│             │                                                  │
│ ┌─────────┐ │  {children}                                     │
│ │Field    │ │                                                  │
│ │Name     │ │                                                  │
│ ├─────────┤ │                                                  │
│ │◉ Cont 1 │ │                                                  │
│ │◉ Cont 2 │ │                                                  │
│ │◉ Cont 3 │ │                                                  │
│ │◉ Cont 4 │ │                                                  │
│ ├─────────┤ │                                                  │
│ │&#x25CF; Pano    │ │                                                  │
│ │&#x25CF; Kontrol │ │                                                  │
│ │&#x25CF; Grafik  │ │                                                  │
│ │&#x25CF; Olaylar │ │                                                  │
│ │&#x25CF; Rapor   │ │                                                  │
│ │&#x25CF; Cihaz   │ │                                                  │
│ ├─────────┤ │                                                  │
│ │ACIL DUR │ │                                                  │
│ │Çıkış    │ │                                                  │
│ └─────────┘ │                                                  │
└─────────────┴──────────────────────────────────────────────────┘
```

#### Role-Based Routing

| Role | Default Redirect | Accessible Routes |
|------|-----------------|-------------------|
| `boss` | → `/map` (to superadmin app) | Login only (boss uses superadmin app) |
| `admin` | → `/field/:firstFieldId` | All field routes |
| `teknik` | → `/field/:firstFieldId` | All field routes (restricted to their fieldIds) |
| `guest` | → `/login` | Login only (no guest access in field app) |

---

### Data Flow (Field ↔ Container)

**Real-time (push):**
```
Container web-service
  → WebSocket connect to ws://field-app/ws/container?token=...
  → Periodically sends: { type: "telemetry", containerId, data: [...latest telemetry] }
  → Field ContainerProxy caches in memory/Redis
  → Field frontend RealtimeProvider pushes to subscribers
  → Live gauges update without polling
```

**Historical (pull on demand):**
```
Field frontend: user opens chart with 3 containers, 24h range
  → Field backend: GET /api/fields/:id/telemetry/downsampled?from=&to=&points=120
  → ContainerProxy.fetchAllHistorical:
      Promise.all([
        fetch("http://container-1/api/data/bsc-1/downsampled?..."),
        fetch("http://container-2/api/data/bsc-2/downsampled?..."),
        fetch("http://container-3/api/data/bsc-3/downsampled?..."),
      ])
   → Merge results, tag each with containerId
   → Return to frontend → TelemetryChart renders multi-series
```

> 2026-08-19: `fetchAllHistorical` transport moves to the session tunnel (registry URL + service token) — the self-reported `containerUrl` in `register` is no longer trusted (SSRF). Transport details: [KONTEYNER-UZAKTAN-ERISIM-MIMARISI.md](./KONTEYNER-UZAKTAN-ERISIM-MIMARISI.md).

**PPC Status (container → field connection):**
```
Container web-service:
  → Tracks WebSocket connection to field app
  → Exposes via /api/status → { fieldConnected: true/false }
  → container-web header shows PPC indicator

Field ContainerProxy:
  → Tracks all registered container WebSocket connections
  → Exposes connectionStatus() map
  → field frontend shows container connection dots in sidebar
```

---

## App 2: `apps/superadmin` (Mobile-First — Boss)

### Backend — `apps/superadmin-backend`

Lightweight Fastify server. No TimescaleDB needed — plain PostgreSQL for metadata only.

#### Modules

| Module | Purpose |
|--------|---------|
| Fastify | Minimal REST API (port 5003) |
| Auth | Boss login only, JWT. No guest/teknik. |
| Field Registry | PostgreSQL table: `fields` with connection URLs |
| Field Poller | `setInterval` polls `/api/fields/status` from each registered field app every 30s |

#### REST Endpoints

| Method | Path | Auth | Purpose |
|--------|------|:----:|---------|
| `POST` | `/api/auth/login` | No | Boss login → returns `{ accessToken, refreshToken, user }` |
| `POST` | `/api/auth/logout` | Yes | Clear refresh token |
| `POST` | `/api/auth/refresh` | No | Refresh access token |
| `GET` | `/api/fields` | Yes | All fields with status + aggregated metrics (from poller cache) |
| `GET` | `/api/fields/:id` | Yes | Single field detail |
| `GET` | `/api/fields/:id/summary` | Yes | Live field summary (fetched from field app on demand) |
| `POST` | `/api/fields` | Yes | Register new field |
| `PUT` | `/api/fields/:id` | Yes | Update field |
| `DELETE` | `/api/fields/:id` | Yes | Remove field |

#### PostgreSQL Schema

```sql
CREATE TABLE fields (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  location      JSONB NOT NULL DEFAULT '{"lat": 0, "lng": 0}',
  api_url       TEXT,                                    -- Field app base URL
  status        TEXT DEFAULT 'offline',                  -- online | warning | offline
  container_count      INTEGER DEFAULT 0,
  online_containers    INTEGER DEFAULT 0,
  total_power_mw       DOUBLE PRECISION,
  avg_soc              DOUBLE PRECISION,
  active_alarms        INTEGER DEFAULT 0,
  last_seen_at  TIMESTAMPTZ,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT DEFAULT 'boss' CHECK (role IN ('boss')),
  refresh_token TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Seed boss user
INSERT INTO users (username, password_hash, name, role)
VALUES ('boss', '<hash>', 'Yönetici', 'boss');
```

#### Field Poller

```ts
// Polls each registered field app every 30 seconds
class FieldPoller {
  constructor(
    private fieldRegistry: IFieldRegistry,
    private intervalMs: number = 30000,
  ) {}

  async start() {
    setInterval(() => this.poll(), this.intervalMs);
  }

  private async poll() {
    const fields = await this.fieldRegistry.all();
    const results = await Promise.allSettled(
      fields.map(async (f) => {
        if (!f.apiUrl) return null;
        const resp = await fetch(`${f.apiUrl}/api/fields/${f.id}/summary`);
        const summary = await resp.json();
        await this.fieldRegistry.updateStatus(f.id, summary);
      })
    );
  }
}
```

---

### Frontend — `apps/superadmin`

Mobile-first React app. Single-column layout. Touch-friendly. PWA-ready.

```
apps/superadmin/
├── index.html
├── package.json              # react, react-router-dom, @tanstack/react-query, zustand,
│                             #   axios, react-leaflet, leaflet, @playcanvas/react,
│                             #   @emotion/react, @emotion/styled, react-hot-toast,
│                             #   @gd-monorepo/ui, @gd-monorepo/shared-types
├── vite.config.ts            # Port 5175, proxy to superadmin-backend:5003
├── project.json
├── tsconfig.json
├── vitest.config.ts
├── public/
│   ├── manifest.json         # PWA manifest
│   └── sw.js                 # Service worker for PWA
└── src/
    ├── main.tsx
    ├── app/
    │   ├── App.tsx
    │   ├── providers.tsx     # QueryClient + ErrorBoundary + PWA registration
    │   ├── routes.tsx        # 3 routes: login, dashboard, field-detail
    │   └── router.tsx
    ├── lib/
    │   ├── api-client.ts     # Axios singleton
    │   └── query-client.ts
    ├── features/
    │   └── auth/
    │       ├── stores/AuthStore.ts   # Boss-only auth (no guest, no teknik)
    │       └── components/
    │           ├── LoginForm.tsx      # Boss login form
    │           └── LogoutButton.tsx
    ├── pages/
    │   ├── LoginPage.tsx         # Boss login (no guest option, no demo credentials)
    │   ├── DashboardPage.tsx     # Map of Türkiye + field card grid
    │   └── FieldDetailPage.tsx   # Drill-down: DeviceGauges + container statuses
    ├── layouts/
    │   └── MobileShell.tsx       # TopBar + scrollable content
    └── hooks/
        └── useFieldStatus.ts    # React Query: field status polling
```

#### Page Details

| Route | Page | Content |
|-------|------|---------|
| `/login` | `LoginPage` | Boss login only. Clean form. No guest/demo. On success → `/dashboard` |
| `/dashboard` | `DashboardPage` | FieldMap (top 40vh) + FieldCard grid (scrollable below). Pull-to-refresh on mobile. |
| `/fields/:id` | `FieldDetailPage` | Field name header. DeviceGauges for total power / avg SoC / active alarms. Container list with status dots. Refresh button for live data. |

#### MobileShell Layout

```
┌──────────────────────┐
│ ☰  CCC     👤 Boss   │  ← TopBar (fixed, 48px)
├──────────────────────┤
│                      │
│  {children}           │  ← Scrollable content area
│                      │
└──────────────────────┘
```

No sidebar. TopBar has app logo + logout button. Content is single-column, max-width 480px on larger screens.

#### Dashboard Layout (Mobile)

```
┌─────────────────────┐
│ ☰  CCC   👤 Boss    │
├─────────────────────┤
│                     │
│   [Türkiye Map]     │  ← 38vh, Leaflet, fixed markers
│   ● Field 1         │
│   ● Field 2         │
│   ● Field 3         │
│                     │
├─────────────────────┤
│ Sahalar (3)    ↻    │  ← Section header + refresh
├─────────────────────┤
│ ┌─────────────────┐ │
│ │ Field 1  ✓ Aktif│ │  ← FieldCard (touch-friendly)
│ │ 4/4 Konteyner   │ │
│ │ ⚡ 12.4 MW       │ │
│ │ 🔋 %82 SoC       │ │
│ │ ⚠ 0 Alarm       │ │
│ └─────────────────┘ │
│ ┌─────────────────┐ │
│ │ Field 2  ⚠ Uyarı│ │
│ │ 3/4 Konteyner    │ │
│ │ ⚡ 8.1 MW        │ │
│ │ 🔋 %65 SoC        │ │
│ │ ⚠ 2 Alarm       │ │
│ └─────────────────┘ │
└─────────────────────┘
```

#### PWA Configuration

```json
// public/manifest.json
{
  "name": "CCC Field Manager",
  "short_name": "CCC",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#0a0a0a",
  "background_color": "#0a0a0a",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

---

## New Shared Packages (Additions to existing packages)

### `packages/shared-types` — New Types

```ts
// src/field.ts (NEW FILE)

export interface FieldLocation {
  lat: number;
  lng: number;
}

export interface Field {
  id: string;
  name: string;
  location: FieldLocation;
  apiUrl?: string;
  status: "online" | "warning" | "offline";
  containerCount: number;
  onlineContainerCount: number;
  totalPowerMw?: number;
  avgSoc?: number;
  activeAlarms?: number;
  createdAt: string;
  updatedAt: string;
}

export interface FieldSummary {
  field: Field;
  containers: ContainerStatus[];
  telemetries: TelemetryData[];       // Latest from all containers
}

export interface ContainerStatus {
  containerId: string;
  containerUrl: string;
  connected: boolean;                 // PPC: WebSocket to field is active
  lastSeenAt: string;
  latestTelemetry: TelemetryData[];
}

export interface ContainerLayout {
  containerId: string;
  position: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  scale?: number;
}

export interface FieldConfig {
  id: string;
  name: string;
  location: FieldLocation;
  containers: ContainerConfig[];
}

export interface ContainerConfig {
  containerId: string;
  baseUrl: string;                    // REST API base URL
  wsUrl: string;                      // WebSocket URL
}
```

```ts
// src/auth.ts (EXTEND EXISTING FILE)

export type Role = "admin" | "teknik" | "guest" | "boss";  // ADD "boss"

export interface User {
  id: string;
  username: string;
  role: Role;
  name: string;
  fieldIds?: string[];               // ADD: which fields this user can access
  createdAt: string;
  updatedAt: string;
}
```

### `packages/core` — New Module

```
packages/core/src/container-proxy/
├── index.ts                   # Barrel exports
├── interface.ts               # IContainerProxy + ContainerObserver
├── container-proxy.ts         # ContainerProxyAdapter implementation
└── README.md
```

```
packages/core/src/tunnel/      # NEW (2026-08-19)
├── index.ts                   # Barrel exports
├── types.ts                   # Control message union + stream types
└── frame-codec.ts             # Binary stream frame encode/decode (9-byte header)
```

### `packages/ui` — New Components

#### `PlayCanvasViewer`

```
packages/ui/src/components/PlayCanvasViewer/
├── index.ts
├── PlayCanvasViewer.tsx         # Main component with <Application>
├── PlayCanvasViewer.types.ts
├── PlayCanvasViewer.styles.ts
└── PlayCanvasViewer.stories.tsx
```

```ts
// PlayCanvasViewer.types.ts
export interface Container3DState {
  id: string;
  label: string;
  position: [number, number, number];  // x, y, z
  rotation?: [number, number, number];
  scale?: number;
  status: "online" | "warning" | "offline" | "idle";
  telemetry?: {
    soc?: number;        // 0-100
    power?: number;      // kW
    temperature?: number; // °C
  };
}

export interface PlayCanvasViewerProps {
  containers: Container3DState[];
  onContainerClick?: (containerId: string) => void;
  selectedContainerId?: string;
  orbitControls?: boolean;
  showGrid?: boolean;
  showLabels?: boolean;
  height?: number | string;
}
```

**Implementation notes:**
- Uses `@playcanvas/react`: `<Application>`, `<Entity>`, `<Camera>`, `<OrbitControls>`, `<Light>`, `<Gltf>`
- Loads a container GLB model via `useModel('/assets/container.glb')` (or falls back to `<Render type="box">`)
- Each container entity colored by telemetry status: green→online, amber→warning, red→offline
- `onClick` pointer events on container entities for selection
- Orbit controls for camera navigation (pinch-zoom on mobile)
- Labels via HTML overlays or PlayCanvas text elements
- Suspense fallback for model loading

#### `FieldMap`

```
packages/ui/src/components/FieldMap/
├── index.ts
├── FieldMap.tsx
├── FieldMap.types.ts
├── FieldMap.styles.ts
└── FieldMap.stories.tsx
```

```ts
// FieldMap.types.ts
export interface FieldMarker {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: "online" | "warning" | "offline";
  containerCount: number;
  onlineContainerCount: number;
  totalPowerMw?: number;
  avgSoc?: number;
  activeAlarms?: number;
}

export interface FieldMapProps {
  fields: FieldMarker[];
  onFieldClick?: (fieldId: string) => void;
  selectedFieldId?: string;
  height?: number | string;
  zoom?: number;
  center?: [number, number];          // Turkey center default: [39.0, 35.0]
}
```

**Implementation notes:**
- Leaflet + `react-leaflet` (`MapContainer`, `TileLayer`, `Marker`, `Popup`, `Tooltip`)
- OpenStreetMap tiles (free, no API key)
- Custom `divIcon` markers: colored circle (status) + container count badge
- Popup: field name, status, container count, key metrics
- Auto-fit bounds to all markers on mount
- Touch-friendly: disable map zoom until tap, then allow pinch

#### `FieldCard`

```
packages/ui/src/components/FieldCard/
├── index.ts
├── FieldCard.tsx
├── FieldCard.types.ts
├── FieldCard.styles.ts
└── FieldCard.stories.tsx
```

```ts
// FieldCard.types.ts
export interface FieldCardProps {
  field: FieldMarker;
  onClick?: () => void;
  size?: "small" | "medium";
}
```

**Layout (touch-friendly):**
```
┌──────────────────────────────┐
│ ● Field Name           Aktif │  ← status dot + name + status text
│ 4/4 Konteyner                │  ← container count (online/total)
│ ⚡ 12.4 MW      🔋 %82 SoC   │  ← power + SoC side by side
│ ⚠ 0 Alarm                    │  ← alarm count
└──────────────────────────────┘
```

Min height: 72px for touch targets. Tap → `onClick`. Status color: green=online, amber=warning, red=offline.

#### `ContainerConnectionBadge`

```
packages/ui/src/components/ContainerConnectionBadge/
├── index.ts
├── ContainerConnectionBadge.tsx
├── ContainerConnectionBadge.types.ts
└── ContainerConnectionBadge.styles.ts
```

```ts
export interface ContainerConnectionBadgeProps {
  connected: boolean;
  label: string;
  size?: "small" | "medium";
}
```

Green dot + "Bağlı" when connected. Red dot + "Bağlantı Yok" when disconnected. Used in field sidebar container list and field dashboard.

---

## Implementation Order

### Phase 1: Foundation (packages)

| # | Task | Files |
|---|------|-------|
| 1.1 | Add `Field`, `FieldSummary`, `FieldLocation`, `ContainerStatus`, `ContainerLayout`, `FieldConfig`, `ContainerConfig` types | `packages/shared-types/src/field.ts` |
| 1.2 | Barrel export new types | `packages/shared-types/src/index.ts` (add `export * from "./field"`) |
| 1.3 | Extend `Role` with `"boss"`, `User` with `fieldIds?: string[]` | `packages/shared-types/src/auth.ts` |
| 1.4 | Create `IContainerProxy` interface + `ContainerObserver` | `packages/core/src/container-proxy/interface.ts` |
| 1.5 | Create barrel exports | `packages/core/src/container-proxy/index.ts` |

### Phase 2: `apps/field` Frontend Scaffold

| # | Task | Depends |
|---|------|---------|
| 2.1 | Create `apps/field` via Vite scaffold | — |
| 2.2 | Configure Nx `project.json` (dev, build, test, lint) | 2.1 |
| 2.3 | Configure `vite.config.ts` (aliases, proxy, port 5174) | 2.1 |
| 2.4 | Set up `package.json` dependencies | 2.1 |
| 2.5 | Create `main.tsx` entry point | 2.1 |
| 2.6 | Create `providers.tsx` (QueryClient + ErrorBoundary) | 2.5 |
| 2.7 | Create `routes.tsx` with empty page stubs | 2.6 |
| 2.8 | Create `router.tsx` | 2.7 |
| 2.9 | Build `FieldShell` layout (Sidebar + SystemHeader + PageContent) | 2.7 |
| 2.10 | Build `LoginPage` with extended AuthStore | 1.3, 2.9 |
| 2.11 | Wire up auth + role-based redirects | 2.10 |

### Phase 3: `apps/field` Pages

| # | Task | Depends |
|---|------|---------|
| 3.1 | `FieldDashboardPage` — DeviceGauges + LogTerminal (no 3D yet) | 2.9 |
| 3.2 | `ContainersPage` — ContainerCard grid + PPC status dots | 2.9 |
| 3.3 | `FieldChartsPage` — TelemetryChart with tag-based container selector | 2.9 |
| 3.4 | `FieldControlPage` — ManeuverPanel with field-level maneuvers | 2.9 |
| 3.5 | `FieldEventsPage` — Dual LogTerminal | 2.9 |
| 3.6 | `FieldReportsPage` — Placeholder | 2.9 |
| 3.7 | `FieldDevicesPage` — Device table | 2.9 |

### Phase 4: New UI Components

| # | Task | Depends |
|---|------|---------|
| 4.1 | Create `FieldCard` component in `packages/ui` | — |
| 4.2 | Create `FieldMap` component (Leaflet) in `packages/ui` | — |
| 4.3 | Create `ContainerConnectionBadge` in `packages/ui` | — |
| 4.4 | Create `PlayCanvasViewer` in `packages/ui` | — |
| 4.5 | Barrel export all new components | 4.1–4.4 |
| 4.6 | Integrate `PlayCanvasViewer` into `FieldDashboardPage` | 3.1, 4.4 |

### Phase 5: `apps/superadmin` Scaffold

| # | Task | Depends |
|---|------|---------|
| 5.1 | Create `apps/superadmin` via Vite scaffold | — |
| 5.2 | Configure Nx `project.json` | 5.1 |
| 5.3 | Configure `vite.config.ts` (aliases, proxy, port 5175, PWA plugin) | 5.1 |
| 5.4 | Set up `package.json` dependencies | 5.1 |
| 5.5 | Create `main.tsx` with mobile viewport meta | 5.1 |
| 5.6 | Create `providers.tsx` (QueryClient + ErrorBoundary + PWA register) | 5.5 |
| 5.7 | Create `routes.tsx` (3 routes: login, dashboard, field-detail) | 5.6 |
| 5.8 | Build `MobileShell` layout (TopBar + scrollable content) | 5.7 |
| 5.9 | Build `LoginPage` with boss-only auth | 5.8 |
| 5.10 | Wire up auth + redirect to dashboard | 5.9 |

### Phase 6: `apps/superadmin` Pages

| # | Task | Depends |
|---|------|---------|
| 6.1 | `DashboardPage` — FieldMap + FieldCard grid | 4.1, 4.2, 4.3, 5.8 |
| 6.2 | `FieldDetailPage` — DeviceGauges + container list | 5.8, 4.3 |
| 6.3 | PWA manifest + service worker | 5.3 |
| 6.4 | Mobile responsiveness polish (touch targets, pull-to-refresh) | 6.1, 6.2 |

### Phase 7: Superadmin Backend

| # | Task | Depends |
|---|------|---------|
| 7.1 | Scaffold `apps/superadmin-backend` (Fastify) | — |
| 7.2 | Implement boss auth (login/refresh/logout) | 1.3 |
| 7.3 | Create PostgreSQL schema (fields + users tables) | — |
| 7.4 | Implement `FieldPoller` service | 7.3 |
| 7.5 | Implement REST endpoints (fields CRUD + status) | 7.2, 7.3, 7.4 |
| 7.6 | Seed boss user | 7.2 |
| 7.7 | Docker Compose for superadmin stack | 7.3 |

### Phase 8: Field Backend (ContainerProxy + API)

| # | Task | Depends |
|---|------|---------|
| 8.1 | Implement `ContainerProxyAdapter` in `packages/core` | 1.4 |
| 8.2 | Extend web-service auth with `fieldIds` + `boss` role | 1.3 |
| 8.3 | Add field-related REST endpoints to web-service | 1.1, 1.2 |
| 8.4 | Create field TimescaleDB schema | — |
| 8.5 | Wire ContainerProxy into field web-service | 8.1, 8.3 |
| 8.6 | Docker Compose for field stack | 8.4 |
| 8.7 | Configure device-service for field equipment | — |
| 8.8 | Integration test: field ↔ container data flow | 8.5, 8.6 |

### Phase 9+: Remote UI Tunnel (2026-08-19)

Security baseline → FieldConnector → session tunnel → container-web subpath support → field UI iframe → NIS-2 closure. Detailed task breakdown with acceptance criteria: [KONTEYNER-UZAKTAN-ERISIM-MIMARISI.md](./KONTEYNER-UZAKTAN-ERISIM-MIMARISI.md) (Faz 1–6).

---

## Key Package Dependencies

### `apps/field/package.json`

```json
{
  "dependencies": {
    "react": "^19.2.5",
    "react-dom": "^19.2.5",
    "react-router-dom": "^7.17.0",
    "@tanstack/react-query": "^5.99.2",
    "axios": "^1.15.1",
    "zustand": "^5.0.13",
    "@emotion/react": "^11.14.0",
    "@emotion/styled": "^11.14.1",
    "react-hot-toast": "^2.6.0",
    "recharts": "^3.8.1",
    "@playcanvas/react": "^latest",
    "@gd-monorepo/shared-types": "*",
    "@gd-monorepo/shared-utils": "*",
    "@gd-monorepo/ui": "*"
  }
}
```

### `apps/superadmin/package.json`

```json
{
  "dependencies": {
    "react": "^19.2.5",
    "react-dom": "^19.2.5",
    "react-router-dom": "^7.17.0",
    "@tanstack/react-query": "^5.99.2",
    "axios": "^1.15.1",
    "zustand": "^5.0.13",
    "@emotion/react": "^11.14.0",
    "@emotion/styled": "^11.14.1",
    "react-hot-toast": "^2.6.0",
    "react-leaflet": "^4.2.0",
    "leaflet": "^1.9.0",
    "vite-plugin-pwa": "^latest",
    "@gd-monorepo/shared-types": "*",
    "@gd-monorepo/ui": "*"
  },
  "devDependencies": {
    "@types/leaflet": "^1.9.0"
  }
}
```

### `apps/superadmin-backend/package.json`

```json
{
  "dependencies": {
    "fastify": "^5.0.0",
    "@fastify/websocket": "^latest",
    "@fastify/cors": "^latest",
    "pg": "^latest",
    "jose": "^5.0.0",
    "zod": "^3.0.0",
    "@gd-monorepo/shared-types": "*",
    "@gd-monorepo/core": "*"
  }
}
```

---

## Dev Commands

```
bun run dev:field            # Apps/field frontend (Vite, port 5174)
bun run dev:superadmin       # Apps/superadmin frontend (Vite, port 5175)
nx run field-backend:dev     # Field web-service (Fastify, port 5002)
nx run superadmin-backend:dev # Superadmin API (Fastify, port 5003)
bun run dev:container        # Container full stack (Docker, port 5001/5173)
```

---

## Reuse from Existing Codebase

| Pattern | Source | Used By |
|---------|--------|---------|
| Feature-based directory layout | `apps/container-web` | `apps/field`, `apps/superadmin` |
| `MainLayout` (sidebar + header + content) | `apps/container-web/src/layouts/` | `apps/field/src/layouts/FieldShell.tsx` |
| `AuthStore` (Zustand persist, JWT login/logout) | `apps/container-web/src/features/auth/` | Both apps (extended) |
| `api-client.ts` (Axios + interceptors + refresh) | `apps/container-web/src/lib/` | Both apps |
| `query-client.ts` (TanStack Query config) | `apps/container-web/src/lib/` | Both apps |
| `TelemetryChart` | `packages/ui/src/components/` | `apps/field` |
| `MultiLineChartV2` (uPlot) | `packages/ui/src/components/` | `apps/field` |
| `LogTerminal` | `packages/ui/src/components/` | `apps/field` |
| `DeviceGauges`, `TelemetryGauge` | `packages/ui/src/core/` | Both apps |
| `ManeuverCard`, `ManeuverPanel` | `packages/ui/src/components/` | `apps/field` |
| `RackCard` | `packages/ui/src/components/` | `apps/field` (as ContainerCard) |
| `SCADA_ICONS`, `COLORS` | `packages/ui/src/` | Both apps |
| `ITelemetryTransport` | `packages/shared-types` | `apps/field` (ContainerProxy wraps this) |
| `WebSocketTransport` | `packages/ui/src/transports/` | `apps/field` |
| Auth middleware (JWT + RBAC) | `services/web-service` | Both backends |
| TimescaleDB adapter | `packages/core` | `apps/field` backend |
| awilix DI container pattern | `services/web-service` | Both backends |
