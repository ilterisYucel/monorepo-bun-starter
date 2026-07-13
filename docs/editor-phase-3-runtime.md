# Phase 3: Runtime Engine

## Package: `packages/runtime-engine/`

### Purpose
Loads a validated `ProjectFile`, boots all device connections, starts the data pipeline, and manages the alarm/sequence engines. This is what makes a "project" actually run against real or simulated devices.

### Architecture

```
┌─────────────────────────────────────────────────┐
│                  SCADARuntime                    │
│                                                  │
│  loadProject(ProjectFile)                        │
│    │                                             │
│    ├─► DeviceFactory.create(config) → Device[]   │
│    │   Uses existing IDevice + ModbusDevice from │
│    │   packages/core                              │
│    │                                             │
│    ├─► DataPipeline                              │
│    │   RingBuffer (in-memory)                    │
│    │   TimescaleDB via ITimeseriesDatabase       │
│    │   Redis ring buffer (existing)              │
│    │                                             │
│    ├─► AlarmEngine                               │
│    │   Evaluates rules against live data         │
│    │   Triggers: notifications, sequences        │
│    │                                             │
│    ├─► SequenceEngine                            │
│    │   Executes multi-step automation sequences  │
│    │   (emergency stop, load shedding, etc.)      │
│    │                                             │
│    └─► WebSocket realtime (existing)             │
│        Broadcasts device data to frontend        │
└─────────────────────────────────────────────────┘
```

### Integration with Existing Services

The runtime engine leverages the existing service infrastructure:

```
SCADARuntime
    │
    ├── uses: IDevice (packages/core)
    │        ModbusDevice, SimDevice etc.
    │
    ├── uses: IMessageQueue (packages/core)
    │        Publishes READ_DEVICE, WRITE_TELEMETRY, WS_BROADCAST
    │
    ├── uses: ITimeseriesDatabase (packages/core)
    │        TimescaleDBAdapter for telemetry storage
    │
    ├── uses: ISqlDatabase (packages/core)
    │        PostgresAdapter for metadata
    │
    └── uses: RealtimeManager (packages/services/web-service)
             WebSocket broadcast + Redis ring buffer
```

### Key Types

```ts
export class SCADARuntime {
  private devices: Map<string, IDevice>;
  private dataPipeline: DataPipeline;
  private alarmEngine: AlarmEngine;
  private sequenceEngine: SequenceEngine;

  async loadProject(project: ProjectFile): Promise<void>;
  async start(): Promise<void>;
  async stop(): Promise<void>;
  health(): RuntimeHealth;
}

export class AlarmEngine {
  private rules: AlarmRule[];
  evaluate(deviceId: string, data: TelemetryData[]): Alarm[];
  acknowledge(alarmId: string): void;
}

export class SequenceEngine {
  private sequences: Sequence[];
  async execute(sequenceId: string, ctx: SequenceContext): Promise<void>;
}

export interface SequenceContext {
  devices: Map<string, IDevice>;
  dataPipeline: DataPipeline;
  log: (msg: string) => void;
}
```

### Device Factory

Reuses the existing `ModbusDevice`, `SimDevice` from `packages/core`:

```ts
export class DeviceFactory {
  static create(config: DeviceConfig): IDevice {
    switch (config.protocol.type) {
      case 'modbus':
        return new ModbusDevice(
          modbusConfigFromProjectConfig(config),
          config.simulator ? new ModbusSimulatorAdapter(config) : undefined
        );
      case 'canbus':
        // Uses existing CAN stub, full implementation in phase 3
        return new CanbusDevice(config);
      case 'timeseries':
        // Read-only — queries TimescaleDB via ITimeseriesDatabase
        return new TimeseriesReader(config);
      default:
        throw new Error(`Unknown protocol: ${config.protocol.type}`);
    }
  }
}
```

### Sequence Example (User-Defined Automation)

```json
{
  "name": "Acil Durdurma",
  "steps": [
    { "action": "write_register", "device": "pcs-1", "register": "EmergencyStop", "value": 1 },
    { "action": "write_register", "device": "breaker-1", "register": "Trip", "value": 1 },
    { "action": "wait", "duration": 5000 },
    { "action": "read_register", "device": "battery-1", "register": "SOC" }
  ]
}
```

### Implementation Plan

| Week | Task | Output |
|------|------|--------|
| 1-2 | DeviceFactory — protocol routing + device creation | `DeviceFactory.create()` for modbus, canbus, timeseries |
| 2-3 | DataPipeline — ring buffer + TimescaleDB batch writes | `DataPipeline` class, migration of downsampling logic |
| 3-4 | AlarmEngine — rule evaluator | Expression evaluator for conditions like `SOC < 20`, notification system |
| 4-5 | SequenceEngine — step-by-step automation | `SequenceEngine` with wait/write/read actions |
| 5-6 | Integration with existing web-service for live preview | Route: `/api/runtime/start`, `/api/runtime/stop`, WebSocket live feed |

### Dependencies
- `@gd-monorepo/core` — IDevice, IMessageQueue, ITimeseriesDatabase, ISqlDatabase
- `@gd-monorepo/shared-types` — TelemetryData, DeviceJob
- `@gd-monorepo/device-library` — DeviceDefinition for lookup
