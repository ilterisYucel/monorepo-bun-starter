import { readFileSync } from "fs";
import {
  BSCSimulator,
  BSCSimulatorAdapter,
  parseBSCMap,
  HvacSimulator,
  HvacSimulatorAdapter,
  XRackSimulator,
  XRackSimulatorAdapter,
} from "@gd-monorepo/simulators";
import type { IModbusSimulatorAdapter, DeviceConfigFile, SimulatorConfig } from "@gd-monorepo/shared-types";

const TICK_INTERVAL_MS = 1000;

interface SimulatorEntry {
  adapter: IModbusSimulatorAdapter;
  tick: () => void;
}

export class SimulatorProvider {
  private readonly entries: Map<string, SimulatorEntry>;
  private tickTimer: ReturnType<typeof setInterval> | undefined;

  constructor() {
    this.entries = new Map();
  }

  createFromConfigs(configs: DeviceConfigFile[]): void {
    for (const config of configs) {
      if (!config.simulator) continue;
      const entry = this.buildEntry(config.deviceId, config.simulator);
      this.entries.set(config.deviceId, entry);
      console.log(`[SimulatorProvider] Simulator olusturuldu: ${config.deviceId} (${config.simulator.type})`);
    }
  }

  adapter(deviceId: string): IModbusSimulatorAdapter | undefined {
    return this.entries.get(deviceId)?.adapter;
  }

  start(): void {
    if (this.entries.size === 0) return;

    this.tickTimer = setInterval(() => {
      for (const [, entry] of this.entries) {
        entry.tick();
      }
    }, TICK_INTERVAL_MS);

    console.log(`[SimulatorProvider] Tick baslatildi (${TICK_INTERVAL_MS}ms, ${this.entries.size} simulator)`);
  }

  stop(): void {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = undefined;
    }
    this.entries.clear();
    console.log("[SimulatorProvider] Tick durduruldu");
  }

  count(): number {
    return this.entries.size;
  }

  private buildEntry(deviceId: string, sim: SimulatorConfig): SimulatorEntry {
    const elapsed = TICK_INTERVAL_MS / 1000;

    if (sim.type === "bsc") {
      const rackCount = sim.rackCount ?? 8;
      if (sim.registerMap) {
        const raw = JSON.parse(readFileSync(sim.registerMap, "utf-8")) as Record<string, unknown>[];
        const parsed = parseBSCMap(raw);
        const bsc = new BSCSimulator({ rackCount, registers: parsed.registers });
        return { adapter: new BSCSimulatorAdapter(bsc), tick: () => bsc.tick(elapsed) };
      }
      const bsc = new BSCSimulator({ rackCount, registers: [] });
      return { adapter: new BSCSimulatorAdapter(bsc), tick: () => bsc.tick(elapsed) };
    }

    if (sim.type === "hvac") {
      const hvac = new HvacSimulator();
      return { adapter: new HvacSimulatorAdapter(hvac), tick: () => hvac.tick(elapsed) };
    }

    const rackCount = sim.rackCount ?? 16;
    const xrack = new XRackSimulator(rackCount);
    return { adapter: new XRackSimulatorAdapter(xrack), tick: () => xrack.tick(elapsed) };
  }
}
