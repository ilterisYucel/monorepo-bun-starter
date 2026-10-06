import type { ITelemetryTransport, ConnectParams, TelemetryObserver, ConnectionState, TelemetryData } from "@gd-monorepo/shared-types";

/**
 * WebSocketTransport — TEK soket üzerinden çok-abone (multipleks) gerçek-zamanlı
 * telemetri taşıması. `addDevices`/`removeDevices` ile abonelikler referans
 * sayılır; bir bileşen unmount olunca diğerlerinin akışı KESİLMEZ.
 *
 * Sözleşme:
 * - `connect()` idempotenttir — açık soketi YENİDEN AÇMAZ; yalnız eksik
 *   deviceId abonelikleri gönderir.
 * - `addDevices(ids)`: refcount++ ; 0→1 geçişte (soket açıksa) `subscribe`.
 * - `removeDevices(ids)`: refcount-- ; 1→0 geçişte `unsubscribe`.
 * - Soket açılışında tüm mevcut abonelikler `subscribe` ile gönderilir (reconnect dahil).
 * - `disconnect()` tam teardown (provider unmount) — abonelikleri temizler.
 * - Açılmadan kapanma → "error" (reconnect YOK); açıldıktan sonra → üstel backoff.
 */
export class WebSocketTransport implements ITelemetryTransport {
  private ws: WebSocket | null = null;
  private readonly observers = new Set<TelemetryObserver>();
  private state: ConnectionState = "idle";
  private reconnectTimeout: ReturnType<typeof setTimeout> | undefined;
  private reconnectAttempts = 0;
  private wasEverOpened = false;
  private cancelled = false;
  private currentParams: ConnectParams | null = null;
  /** deviceId → abone sayısı (multipleks). */
  private readonly subscriptions = new Map<string, number>();
  /** deviceId → istenen telemetri isimleri (sunucu tarafı filtre; boş = tümü). */
  private readonly nameFilters = new Map<string, readonly string[]>();

  constructor(
    private readonly wsUrl: string,
    private readonly getToken?: () => string | null,
  ) {}

  async connect(params: ConnectParams): Promise<void> {
    this.currentParams = params;
    this.cancelled = false;
    this.addDevices(params.deviceId.split(",").filter((id) => id.length > 0));

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    await this._doConnect();
  }

  addDevices(deviceIds: readonly string[], names?: readonly string[]): void {
    for (const id of deviceIds) {
      const next = (this.subscriptions.get(id) ?? 0) + 1;
      this.subscriptions.set(id, next);
      if (names !== undefined && names.length > 0) {
        this.nameFilters.set(id, names);
      }
      if (next === 1 && this.ws?.readyState === WebSocket.OPEN) {
        this._subscribe(id);
      }
    }
  }

  removeDevices(deviceIds: readonly string[]): void {
    for (const id of deviceIds) {
      const current = this.subscriptions.get(id);
      if (current === undefined) continue;
      if (current <= 1) {
        this.subscriptions.delete(id);
        this.nameFilters.delete(id);
        if (this.ws?.readyState === WebSocket.OPEN) {
          this._send({ type: "unsubscribe", deviceId: id });
        }
      } else {
        this.subscriptions.set(id, current - 1);
      }
    }
  }

  async disconnect(): Promise<void> {
    this.cancelled = true;
    this._clearReconnect();
    this.subscriptions.clear();
    this.nameFilters.clear();
    this._closeSocket();
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

  private _send(payload: { type: string; deviceId: string }): void {
    this.ws?.send(JSON.stringify(payload));
  }

  /** deviceId aboneliğini (varsa isim filtresiyle) gönderir. */
  private _subscribe(deviceId: string): void {
    const names = this.nameFilters.get(deviceId);
    const payload =
      names !== undefined && names.length > 0
        ? { type: "subscribe", deviceId, names }
        : { type: "subscribe", deviceId };
    this.ws?.send(JSON.stringify(payload));
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

  private _closeSocket(): void {
    if (!this.ws) return;
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

        for (const id of this.subscriptions.keys()) {
          this._subscribe(id);
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
