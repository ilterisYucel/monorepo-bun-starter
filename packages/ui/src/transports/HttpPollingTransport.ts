import type {
  ITelemetryTransport,
  ConnectParams,
  TelemetryObserver,
  ConnectionState,
  TelemetryData,
} from "@gd-monorepo/shared-types";

export interface HttpPollingConfig {
  endpoint: string;
  intervalMs?: number;
  getToken?: () => string | null;
}

export class HttpPollingTransport implements ITelemetryTransport {
  private interval: ReturnType<typeof setInterval> | undefined;
  private observers = new Set<TelemetryObserver>();
  private state: ConnectionState = "idle";
  private currentParams: ConnectParams | null = null;

  constructor(private readonly config: HttpPollingConfig) {}

  async connect(params: ConnectParams): Promise<void> {
    this.currentParams = params;

    const intervalMs = this.config.intervalMs ?? 5000;
    this._setState("connected");

    this._fetch();

    this.interval = setInterval(() => {
      this._fetch();
    }, intervalMs);
  }

  async disconnect(): Promise<void> {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
    this.currentParams = null;
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

  private async _fetch(): Promise<void> {
    if (!this.currentParams) return;

    try {
      const token = this.config.getToken?.();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const url = `${this.config.endpoint}?deviceIds=${encodeURIComponent(this.currentParams.deviceId)}`;
      const response = await fetch(url, { headers });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const json = await response.json();
      const data: TelemetryData[] = json?.telemetries ?? json?.data ?? [];

      if (Array.isArray(data) && data.length > 0) {
        for (const o of this.observers) {
          o.onData(data);
        }
      }
    } catch (err) {
      for (const o of this.observers) {
        o.onError(err instanceof Error ? err : new Error(String(err)));
      }
    }
  }
}
