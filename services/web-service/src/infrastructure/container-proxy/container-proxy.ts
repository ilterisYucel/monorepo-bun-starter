import { WebSocket } from "ws";
import type { TelemetryData } from "@gd-monorepo/shared-types";
import type { ConnectionState } from "@gd-monorepo/shared-types";
import type { IContainerProxy, ContainerObserver } from "@gd-monorepo/core";
import type { DownsampleOptions } from "@gd-monorepo/core";

interface ContainerEntry {
  ws: WebSocket;
  url: string;
  latest: TelemetryData[];
  status: ConnectionState;
}

export class ContainerProxy implements IContainerProxy {
  private containers: Map<string, ContainerEntry> = new Map();
  private observers: Set<ContainerObserver> = new Set();
  private sweepTimer?: ReturnType<typeof setInterval>;

  start(): Promise<void> {
    this.sweepTimer = setInterval(() => this.sweep(), 60000);
    console.log("[ContainerProxy] Baslatildi");
    return Promise.resolve();
  }

  stop(): Promise<void> {
    if (this.sweepTimer) clearInterval(this.sweepTimer);
    this.containers.forEach((entry) => {
      if (entry.ws.readyState === entry.ws.OPEN) {
        entry.ws.close();
      }
    });
    this.containers.clear();
    this.observers.clear();
    console.log("[ContainerProxy] Durduruldu");
    return Promise.resolve();
  }

  registerContainer(containerId: string, ws: WebSocket): void {
    const existing = this.containers.get(containerId);
    if (existing) {
      existing.ws.close();
    }

    this.containers.set(containerId, {
      ws,
      url: "",
      latest: [],
      status: "connected",
    });

    this.notifyConnectionChange(containerId, "connected");

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "telemetry" && Array.isArray(msg.data)) {
          const telems = msg.data as TelemetryData[];
          const entry = this.containers.get(containerId);
          if (entry) {
            entry.latest = telems;
            this.notifyData(containerId, telems);
          }
        }
      } catch {
        // gecersiz mesajlari yoksay
      }
    });

    ws.on("close", () => {
      const entry = this.containers.get(containerId);
      if (entry) {
        entry.status = "idle";
        this.notifyConnectionChange(containerId, "idle");
      }
    });

    ws.on("error", () => {
      const entry = this.containers.get(containerId);
      if (entry) {
        entry.status = "error";
        this.notifyConnectionChange(containerId, "error");
      }
    });

    console.log(`[ContainerProxy] Konteyner kaydedildi: ${containerId}`);
  }

  unregisterContainer(containerId: string): void {
    const entry = this.containers.get(containerId);
    if (entry && entry.ws.readyState === entry.ws.OPEN) {
      entry.ws.close();
    }
    this.containers.delete(containerId);
  }

  latestTelemetry(containerId: string): TelemetryData[] {
    return this.containers.get(containerId)?.latest ?? [];
  }

  async historical(
    containerId: string,
    params: Omit<DownsampleOptions, "deviceId">,
  ): Promise<TelemetryData[]> {
    const entry = this.containers.get(containerId);
    if (!entry || !entry.url) return [];

    const url = new URL(`${entry.url}/api/data/${containerId}/downsampled`);
    if (params.from) url.searchParams.set("from", params.from.toISOString());
    if (params.to) url.searchParams.set("to", params.to.toISOString());
    if (params.points) url.searchParams.set("points", String(params.points));

    try {
      const resp = await fetch(url.toString());
      if (!resp.ok) return [];
      return (await resp.json()) as TelemetryData[];
    } catch {
      return [];
    }
  }

  async allHistorical(
    containerIds: string[],
    params: Omit<DownsampleOptions, "deviceId">,
  ): Promise<Record<string, TelemetryData[]>> {
    const results: Record<string, TelemetryData[]> = {};
    const settled = await Promise.allSettled(
      containerIds.map(async (id) => {
        results[id] = await this.historical(id, params);
      }),
    );
    return results;
  }

  connectionStatus(): Map<string, ConnectionState> {
    const status = new Map<string, ConnectionState>();
    this.containers.forEach((entry, id) => {
      status.set(id, entry.status);
    });
    return status;
  }

  setContainerUrl(containerId: string, url: string): void {
    const entry = this.containers.get(containerId);
    if (entry) {
      entry.url = url;
    }
  }

  addObserver(observer: ContainerObserver): void {
    this.observers.add(observer);
  }

  removeObserver(observer: ContainerObserver): void {
    this.observers.delete(observer);
  }

  async health(containerId: string): Promise<boolean> {
    const entry = this.containers.get(containerId);
    if (!entry || !entry.url) return false;

    try {
      const resp = await fetch(`${entry.url}/health`);
      return resp.ok;
    } catch {
      return false;
    }
  }

  containerIds(): string[] {
    return Array.from(this.containers.keys());
  }

  private sweep(): void {
    this.containers.forEach((entry, id) => {
      if (entry.ws.readyState === WebSocket.CLOSED || entry.ws.readyState === WebSocket.CLOSING) {
        entry.status = "idle";
        this.notifyConnectionChange(id, "idle");
      }
    });
  }

  private notifyData(containerId: string, telemetries: TelemetryData[]): void {
    this.observers.forEach((obs) => obs.onData(containerId, telemetries));
  }

  private notifyConnectionChange(containerId: string, state: ConnectionState): void {
    this.observers.forEach((obs) => obs.onConnectionChange(containerId, state));
  }
}
