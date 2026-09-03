import { readFileSync } from "fs";
import type { IModbusTransport } from "@gd-monorepo/core";
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
  EnergyAnalyzerSimulator,
  EnergyAnalyzerSimulatorAdapter,
  PcsSimulator,
  PcsSimulatorAdapter,
  EmuSimulator,
  EmuSimulatorAdapter,
  SimulatorTransport,
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

/**
 * Simülatör kayıt defteri: config'de transport.kind === "simulator" olan cihazlar
 * için IModbusTransport döndürür. Tick yaşam döngüsü SimulatorTransport'un
 * kendisindedir (connect → başlar, disconnect → durur).
 */
export class SimulatorRegistry {
  private readonly transports: Map<string, IModbusTransport>;
  private readonly registry: Map<string, SimulatorFactory>;

  constructor() {
    this.transports = new Map();
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

    this.registry.set("energy-analyzer", {
      build: (_deviceId: string, _sim: SimulatorConfig, elapsed: number): SimulatorEntry => {
        const meter = new EnergyAnalyzerSimulator();
        return { adapter: new EnergyAnalyzerSimulatorAdapter(meter), tick: () => meter.tick(elapsed) };
      },
    });

    this.registry.set("pcs", {
      build: (_deviceId: string, _sim: SimulatorConfig, elapsed: number): SimulatorEntry => {
        const pcs = new PcsSimulator();
        return { adapter: new PcsSimulatorAdapter(pcs), tick: () => pcs.tick(elapsed) };
      },
    });

    this.registry.set("emu", {
      build: (_deviceId: string, sim: SimulatorConfig, elapsed: number): SimulatorEntry => {
        const emu = new EmuSimulator(sim.pcsCount ?? 3);
        return { adapter: new EmuSimulatorAdapter(emu), tick: () => emu.tick(elapsed) };
      },
    });
  }

  register(type: string, factory: SimulatorFactory): void {
    this.registry.set(type, factory);
  }

  createFromConfigs(configs: DeviceConfigFile[]): void {
    for (const config of configs) {
      const transport = config.transport;
      if (transport?.kind !== "simulator") continue;

      const simType = transport.type ?? config.type;
      if (!simType) {
        console.warn(`[SimulatorRegistry] ${config.deviceId}: simulator tipi belirtilmemis`);
        continue;
      }

      const factory = this.registry.get(simType);
      if (!factory) {
        console.warn(`[SimulatorRegistry] Bilinmeyen simulator tipi: ${simType} (${config.deviceId})`);
        continue;
      }

      const elapsed = TICK_INTERVAL_MS / 1000;
      const sim: SimulatorConfig = {
        type: simType as SimulatorConfig["type"],
        rackCount: transport.rackCount,
        registerMap: transport.registerMap,
        pcsCount: transport.pcsCount,
      };
      const entry = factory.build(config.deviceId, sim, elapsed);

      this.transports.set(
        config.deviceId,
        new SimulatorTransport(entry.adapter, entry.tick, TICK_INTERVAL_MS),
      );
      console.log(`[SimulatorRegistry] Simulator transport hazir: ${config.deviceId} (${simType})`);
    }
  }

  /** Config'de simulator transport'u olan cihaz için transport döndürür; yoksa undefined. */
  transportFor(deviceId: string): IModbusTransport | undefined {
    return this.transports.get(deviceId);
  }

  count(): number {
    return this.transports.size;
  }
}
