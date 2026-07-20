import type {
  ITelemetryTransport,
  ConnectParams,
  TelemetryObserver,
  ConnectionState,
  TelemetryData,
} from "@gd-monorepo/shared-types";

export class WebSocketTransport implements ITelemetryTransport {
  private ws: WebSocket | null = null;
  private observers = new Set<TelemetryObserver>();
  private state: ConnectionState = "idle";
  private reconnectTimeout: ReturnType<typeof setTimeout> | undefined;
  private reconnectAttempts = 0;
  private wasEverOpened = false;
  private cancelled = false;
  private currentParams: ConnectParams | null = null;

  constructor(
    private readonly wsUrl: string,
    private readonly getToken?: () => string | null,
  ) {}

  async connect(params: ConnectParams): Promise<void> {
    await this.disconnect();
    this.cancelled = false;
    this.currentParams = params;
    await this._doConnect();
  }

  async disconnect(): Promise<void> {
    this.cancelled = true;
    this._clearReconnect();
    if (this.ws) {
      const ws = this.ws;
      ws.onclose = null;
      ws.onerror = null;
      ws.onmessage = null;
      ws.onopen = null;
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
      this.ws = null;
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

  private _notifyData(batch: TelemetryData[]): void {
    for (const o of this.observers) {
      o.onData(batch);
    }
  }

  private _notifyError(error: Error): void {
    for (const o of this.observers) {
      o.onError(error);
    }
  }

  private async _doConnect(): Promise<void> {
    if (this.cancelled || !this.currentParams) return;

    this._setState("connecting");

    const token = this.getToken?.();
    const url = token
      ? `${this.wsUrl}?token=${encodeURIComponent(token)}`
      : this.wsUrl;

    try {
      const ws = new WebSocket(url);
      this.ws = ws;

      ws.onopen = () => {
        if (this.cancelled) {
          ws.close();
          return;
        }
        this.wasEverOpened = true;
        this.reconnectAttempts = 0;
        this._setState("connected");

        const deviceIds = this.currentParams!.deviceId.split(",");
        for (const id of deviceIds) {
          ws.send(
            JSON.stringify({
              type: "subscribe",
              deviceId: id,
            }),
          );
        }
      };

      ws.onmessage = (event: MessageEvent) => {
        if (this.cancelled) return;
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === "initial" && Array.isArray(msg.data)) {
            this._notifyData(msg.data);
          } else if (msg.type === "telemetry" && Array.isArray(msg.data)) {
            this._notifyData(msg.data);
          }
        } catch {
          this._notifyError(new Error("Failed to parse WebSocket message"));
        }
      };

      ws.onclose = () => {
        if (this.cancelled) return;
        this.ws = null;

        if (!this.wasEverOpened) {
          this._setState("error");
          this._notifyError(new Error("WebSocket connection rejected"));
          return;
        }

        this._scheduleReconnect();
      };

      ws.onerror = () => {
        if (this.cancelled) return;
        this.ws = null;
        this._setState("error");
        this._notifyError(new Error("WebSocket connection error"));
        this._scheduleReconnect();
      };
    } catch {
      if (!this.cancelled) {
        this._setState("error");
        this._notifyError(new Error("Failed to create WebSocket connection"));
      }
    }
  }

  private _scheduleReconnect(): void {
    if (this.cancelled) return;
    this.reconnectAttempts += 1;
    const delay = Math.min(3000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
    this.reconnectTimeout = setTimeout(() => {
      this._doConnect();
    }, delay);
  }

  private _clearReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = undefined;
    }
  }
}
