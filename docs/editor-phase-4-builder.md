# Phase 4: Application Builder

## Package: `packages/app-builder/`

### Purpose
Generates packaged, deployable applications from a validated `ProjectFile`. Outputs:
- **Desktop app** — Electron + React, pre-configured with the project's devices, dashboards, and alarms
- **Web app** — Vite + React SPA, pre-configured with the project's devices, dashboards, and alarms
- **Docker image** — Containerized web app with all dependencies

### Architecture

```
ProjectFile (validated JSON)
       │
       ▼
┌──────────────────────────────────────────┐
│              AppBuilder                   │
│                                           │
│  build(target: BuildTarget): BuildResult  │
│    │                                      │
│    ├─► generateDashboard(project)         │
│    │   Renders single-line diagram as     │
│    │   SVG/HTML, data tables, alarm panel │
│    │                                      │
│    ├─► embedProjectConfig(project)        │
│    │   Inlines project.json into the      │
│    │   generated app's assets             │
│    │                                      │
│    ├─► compilePlugins(plugins)           │
│    │   Bundles user-defined plugins      │
│    │                                      │
│    └─► packageApp(target)                │
│        Electron: electron-builder         │
│        Web: vite build + nginx config     │
│        Docker: Dockerfile generation      │
└──────────────────────────────────────────┘
       │
       ▼
  BuildResult { outputPath, size, checksum }
```

### Generated App Structure (Web Target Example)

```
output/my-scada-app/
├── index.html
├── assets/
│   ├── index.js          # Bundled React app
│   ├── style.css         # Emotion-extracted CSS
│   └── project.json      # Embedded project configuration
├── package.json          # Auto-generated from project metadata
├── vite.config.ts        # Pre-configured with proxies to web-service
├── src/
│   ├── main.tsx          # Entry with RuntimeProvider
│   ├── app/
│   │   └── routes.tsx    # Auto-generated routes (dashboards, alarms, control)
│   ├── pages/
│   │   ├── SingleLineDiagram.tsx  # From project's diagram canvas
│   │   ├── AlarmPanel.tsx         # From project's alarm rules
│   │   └── DataTable.tsx          # From project's devices
│   └── project.json               # Embedded config
└── nginx.conf            # Web deployment config
```

### Template System

The builder uses a template engine to generate apps. Templates are stored in:

```
packages/app-builder/templates/
├── web-vite/             # Web app template (Vite + React)
│   ├── Dockerfile
│   ├── nginx.conf
│   └── src/              # Template source (filled by builder)
├── desktop-electron/     # Desktop app template (Electron)
│   ├── package.json
│   └── src/              # Template source
└── docker/               # Docker-specific template
    └── Dockerfile
```

Template variables (replaced at build time):
| Variable | Source |
|----------|--------|
| `{{PROJECT_NAME}}` | `project.metadata.name` |
| `{{DEVICE_IDS}}` | `project.devices.map(d => d.id)` |
| `{{DASHBOARD_HTML}}` | Generated from project diagram |
| `{{REGISTER_LIST}}` | All register definitions |
| `{{ALARM_RULES}}` | `project.alarms` |
| `{{API_BASE_URL}}` | User-specified during build |

### Dashboard Generation

The builder converts the editor's ReactFlow state into static dashboards:

```ts
function generateDashboard(project: ProjectFile): DashboardConfig {
  return {
    pages: [
      {
        name: 'Tek Hat Semasi',
        type: 'single-line-diagram',
        config: {
          devices: project.devices.map(d => ({
            id: d.id,
            position: d.position,
            renderer: getDeviceRenderer(d.type), // Reuses PixiJS components
            dataBindings: getDataBindings(d.registers),
          })),
          connections: project.connections,
        }
      },
      {
        name: 'Alarm Paneli',
        type: 'alarm-panel',
        config: { alarms: project.alarms }
      },
      {
        name: 'Veri Tablosu',
        type: 'data-table',
        config: {
          columns: getDataColumns(project.devices),
          refreshInterval: 1000,
        }
      }
    ]
  };
}
```

### Build Pipeline

```
1. Validate ProjectFile      ──► ConfigValidator
2. Copy template              ──► templates/<target>/
3. Generate dashboards        ──► renderers (SVG, HTML, PixiJS)
4. Embed project.json         ──► inlines into assets/
5. Compile plugins (if any)   ──► WASM / bundled JS
6. Run package tool           ──► electron-builder / vite build / docker build
7. Return BuildResult         ──► { outputPath, size, checksum }
```

### Implementation Plan

| Week | Task | Output |
|------|------|--------|
| 1-2 | Template engine — variable substitution + file copy | `TemplateEngine` class, web template |
| 2-3 | Dashboard generation — single-line diagram renderer | `generateDashboard()`, SVG + PixiJS renderers |
| 3-4 | Electron packaging — Tauri/Electron template + electron-builder | Desktop output target |
| 4-5 | Docker packaging — Dockerfile generation + image build | Docker output target |
| 5-6 | Plugin compilation — bundle user-defined plugins into app | Plugin bundling pipeline |

### Dependencies
- `@gd-monorepo/shared-types` — ProjectFile, DeviceConfig types
- `@gd-monorepo/device-library` — Device type registry
- `@gd-monorepo/ui` — PixiJS components for dashboard rendering
- External: `electron-builder`, `dockerode` (Docker API), `handlebars` (templating)
