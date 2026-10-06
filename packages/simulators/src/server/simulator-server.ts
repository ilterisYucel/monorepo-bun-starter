// packages/simulators/src/server/simulator-server.ts
//
// SimulatorServer — bir simülatörün self-host Modbus TCP yaşam döngüsünü yönetir:
// köprüyü ağ config'iyle açar + periyodik tick çalıştırır. Simülatör sınıfları
// `start()`/`stop()` ile bunu delege eder (SIMULATOR-MIMARISI UC-2).

import type { IModbusSimulatorAdapter } from "@gd-monorepo/shared-types";
import { ModbusServerBridge } from "./modbus-server-bridge";
import type { ReadProtection, WriteProtection } from "./modbus-server-bridge";

/** Simülatörün self-host ağ yapılandırması (config'ten gelir). */
export interface SimulatorNetworkConfig {
  readonly host?: string;
  readonly port: number;
  readonly tickIntervalMs?: number;
}

/** SimulatorServer yapılandırması — tek obje (DI kuralı 3). */
export interface SimulatorServerConfig {
  readonly adapter: IModbusSimulatorAdapter;
  readonly network: SimulatorNetworkConfig;
  readonly tick: (elapsedSeconds: number) => void;
  /** Tick başına ilerletilecek sanal saniye (default 1). */
  readonly tickSeconds?: number;
  readonly writeProtected?: WriteProtection;
  readonly readProtected?: ReadProtection;
}

/**
 * SimulatorServer — sözleşme:
 * - `start()` köprüyü açar + tick interval'ını başlatır (idempotent).
 * - `stop()` tick'i durdurur + köprüyü kapatır (idempotent).
 * - `port()` dinlenen gerçek portu döner (start öncesi config portu).
 */
export class SimulatorServer {
  private bridge: ModbusServerBridge | undefined;
  private timer: ReturnType<typeof setInterval> | undefined;

  constructor(private readonly config: SimulatorServerConfig) {}

  port(): number {
    return this.bridge?.port() ?? this.config.network.port;
  }

  async start(): Promise<void> {
    if (this.bridge) return;
    const network = this.config.network;
    this.bridge = new ModbusServerBridge({
      adapter: this.config.adapter,
      host: network.host ?? "127.0.0.1",
      port: network.port,
      ...(this.config.writeProtected ? { writeProtected: this.config.writeProtected } : {}),
      ...(this.config.readProtected ? { readProtected: this.config.readProtected } : {}),
    });
    await this.bridge.start();
    const seconds = this.config.tickSeconds ?? 1;
    this.timer = setInterval(
      () => this.config.tick(seconds),
      network.tickIntervalMs ?? 1000,
    );
  }

  async stop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
    await this.bridge?.stop();
    this.bridge = undefined;
  }
}
