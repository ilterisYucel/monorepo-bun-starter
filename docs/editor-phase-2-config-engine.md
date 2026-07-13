# Phase 2: Configuration Engine

## Package: `packages/config-engine/`

### Purpose
Transforms the visual editor state (ReactFlow nodes/edges) into validated, runnable project configuration files. This is the bridge between the no-code editor and the runtime engine.

### Architecture

```
Editor Store (Zustand)
       │
       ▼
┌──────────────────────────┐
│  SCADAConfigBuilder      │   Transforms nodes → DeviceConfig[]
│  + buildProject(state)   │   Transforms edges  → Connection[]
│  + buildDevices(nodes)   │   Merges alarms, sequences from UI
│  + buildConnections(edges)│
└──────────┬───────────────┘
           │  ProjectFile (JSON/YAML)
           ▼
┌──────────────────────────┐
│  ConfigValidator         │   Validates the generated project
│  + validate(project)     │   Checks:
│  + checkIpConflicts()    │     - IP address overlaps
│  + checkRegisterConflicts()│   - Register address overlaps
│  + checkConnectionHealth()│   - Missing preconditions
│  + validateSchema()      │     - Schema conformity
└──────────┬───────────────┘
           │  ValidationResult { valid, errors[] }
           ▼
       Save to DB / Export to file
```

### Key Types

```ts
export interface ProjectFile {
  version: string;
  metadata: { name: string; created: string; modified: string };
  devices: DeviceConfig[];
  connections: Connection[];
  alarms?: AlarmRule[];
  sequences?: Sequence[];
  dashboards?: DashboardConfig[];
}

export interface DeviceConfig {
  id: string;
  type: DeviceType;
  name: string;
  position: { x: number; y: number };
  protocol: {
    type: ProtocolType;
    config: ModbusConfig | CanbusConfig | MqttConfig | TimeseriesConfig;
  };
  registers: RegisterMapping[];
  alarms?: AlarmRule[];
}

export interface ValidationError {
  type: string;
  deviceId?: string;
  message: string;
  severity: 'warning' | 'error';
}
```

### Validation Rules

| Rule | Check | Severity |
|------|-------|----------|
| IP conflict | Two Modbus TCP devices on same host:port | error |
| Register overlap | Two devices reading same register address | warning |
| Missing protocol | Device with no protocol configured | error |
| Missing registers | Device with no register mappings | warning |
| Connection dead-end | Power/comms edge without both endpoints | error |
| Name duplicate | Two devices with same name | warning |

### Implementation Plan

| Week | Task | Output |
|------|------|--------|
| 1 | `SCADAConfigBuilder` — node/edge → config transform | `buildProject()`, `buildDevices()`, `buildConnections()` |
| 2 | `ConfigValidator` — validation rules | `validate()`, all check methods |
| 3 | JSON Schema generation from device definitions | Auto-generated schema for IDE validation |
| 4 | YAML export support | `serde_yaml`-style output alongside JSON |

### Dependencies
- `@gd-monorepo/shared-types` — DeviceJob, TelemetryData types
- `@gd-monorepo/device-library` — DeviceDefinition defaults for schema generation
