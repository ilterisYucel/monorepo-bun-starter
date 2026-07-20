import { readFileSync } from "fs";
import {
  BSCSimulator,
  BSCSimulatorAdapter,
  parseBSCMap,
  HvacSimulator,
  HvacSimulatorAdapter,
  XRackSimulator,
  XRackSimulatorAdapter,
  CbSimulator,
  CbSimulatorAdapter,
  DcOutputSimulator,
  DcOutputSimulatorAdapter,
} from "@gd-monorepo/simulators";
import type { IModbusSimulatorAdapter, DeviceConfigFile, SimulatorConfig } from "@gd-monorepo/shared-types";

const TICK_INTERVAL_MS = 1000;

interface SimulatorEntry {
  adapter: IModbusSimulatorAdapter;
  tick: () => void;
}

export interface SimulatorFactory {
  build(deviceId: string, sim: SimulatorConfig, elapsed: number): SimulatorEntry;
}

export class SimulatorProvider {
  private readonly entries: Map<string, SimulatorEntry>;
  private readonly registry: Map<string, SimulatorFactory>;
  private tickTimer: ReturnType<typeof setInterval> | undefined;

  constructor() {
    this.entries = new Map();
    this.registry = new Map();
    this.registerDefaults();
  }

  private registerDefaults(): void {
    this.registry.set("bsc", {
      build: (_deviceId: string, sim: SimulatorConfig, elapsed: number): SimulatorEntry => {
        const rackCount = sim.rackCount ?? 8;
        if (sim.registerMap) {
          const raw = JSON.parse(readFileSync(sim.registerMap, "utf-8")) as Record<string, unknown>[];
          const parsed = parseBSCMap(raw);
          const bsc = new BSCSimulator({ rackCount, registers: parsed.registers });
          return { adapter: new BSCSimulatorAdapter(bsc), tick: () => bsc.tick(elapsed) };
        }
        const bsc = new BSCSimulator({ rackCount, registers: [] });
        return { adapter: new BSCSimulatorAdapter(bsc), tick: () => bsc.tick(elapsed) };
      },
    });

    this.registry.set("hvac", {
      build: (_deviceId: string, _sim: SimulatorConfig, elapsed: number): SimulatorEntry => {
        const hvac = new HvacSimulator();
        return { adapter: new HvacSimulatorAdapter(hvac), tick: () => hvac.tick(elapsed) };
      },
    });

    this.registry.set("xrack", {
      build: (_deviceId: string, sim: SimulatorConfig, elapsed: number): SimulatorEntry => {
        const rackCount = sim.rackCount ?? 16;
        const xrack = new XRackSimulator(rackCount);
        return { adapter: new XRackSimulatorAdapter(xrack), tick: () => xrack.tick(elapsed) };
      },
    });

    this.registry.set("cb", {
      build: (_deviceId: string, _sim: SimulatorConfig, elapsed: number): SimulatorEntry => {
        const cb = new CbSimulator();
        return { adapter: new CbSimulatorAdapter(cb), tick: () => cb.tick(elapsed) };
      },
    });

    this.registry.set("dc-output", {
      build: (_deviceId: string, _sim: SimulatorConfig, elapsed: number): SimulatorEntry => {
        const dc = new DcOutputSimulator();
        return { adapter: new DcOutputSimulatorAdapter(dc), tick: () => dc.tick(elapsed) };
      },
    });
  }

  register(type: string, factory: SimulatorFactory): void {
    this.registry.set(type, factory);
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

  forceTick(deviceId: string): void {
    const entry = this.entries.get(deviceId);
    if (entry) {
      entry.tick();
    }
  }

  count(): number {
    return this.entries.size;
  }

  private buildEntry(deviceId: string, sim: SimulatorConfig): SimulatorEntry {
    const elapsed = TICK_INTERVAL_MS / 1000;
    const factory = this.registry.get(sim.type);

    if (!factory) {
      throw new Error(`Bilinmeyen simulator tipi: ${sim.type}. SimulatorProvider.register() ile kaydedilmesi gerekiyor.`);
    }

    return factory.build(deviceId, sim, elapsed);
  }
}
