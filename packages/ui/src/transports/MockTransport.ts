import type {
  ITelemetryTransport,
  ConnectParams,
  TelemetryObserver,
  ConnectionState,
  TelemetryData,
} from "@gd-monorepo/shared-types";

export interface MockTelemetryDef {
  name: string;
  unit: string;
  min: number;
  max: number;
}

export class MockTransport implements ITelemetryTransport {
  private interval: ReturnType<typeof setInterval> | undefined;
  private observers = new Set<TelemetryObserver>();
  private state: ConnectionState = "idle";

  constructor(
    private readonly definitions: MockTelemetryDef[],
    private readonly intervalMs = 1000,
  ) {}

  async connect(params: ConnectParams): Promise<void> {
    this._setState("connected");

    const deviceId = params.deviceId;

    this.interval = setInterval(() => {
      const now = new Date().toISOString();
      const batch: TelemetryData[] = this.definitions.map((def) => ({
        name: def.name,
        value: +(def.min + Math.random() * (def.max - def.min)).toFixed(2),
        unit: def.unit,
        timestamp: now,
        deviceId,
        description: `Simulated ${def.name}`,
      }));

      for (const o of this.observers) {
        o.onData(batch);
      }
    }, this.intervalMs);
  }

  async disconnect(): Promise<void> {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
    this._setState("idle");
  }

  connectionState(): ConnectionState {
    return this.state;
  }

  subscribe(observer: TelemetryObserver): () => void {
    this.observers.add(observer);
    return () => {
      this.observers.delete(observer);
    };
  }

  private _setState(state: ConnectionState): void {
    this.state = state;
    for (const o of this.observers) {
      o.onConnectionChange(state);
    }
  }
}
