import { readFileSync, existsSync } from "fs";
import { ModbusDevice } from "@gd-monorepo/core";
import { BullMQAdapter, RedisConnection } from "@gd-monorepo/core";
import type {
  IModbusSimulatorAdapter,
  ModbusTelemetryData,
  BitfieldConfig,
} from "@gd-monorepo/shared-types";
import {
  BSCSimulator,
  BSCSimulatorAdapter,
  parseBSCMap,
} from "@gd-monorepo/simulators";
import { TMSSimulator, TMSSimulatorAdapter } from "@gd-monorepo/simulators";
import { DeviceService } from "./device-service";
import type { DeviceServiceDevice } from "./types";

interface DeviceConfig {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  connection: {
    host: string;
    port: number;
    slaveId?: number;
    timeout?: number;
  };
  telemetryList: ModbusTelemetryData[];
  bitfieldConfigs?: BitfieldConfig[];
  pollIntervalMs: number;
}

interface SimulatorConfig {
  id: string;
  type: "bsc" | "tms";
  rackCount?: number;
  registerMap?: string;
}

interface ServiceConfig {
  redis: { host: string; port: number; password?: string; db?: number };
  simulators: SimulatorConfig[];
  devices: DeviceConfig[];
}

function parseArgs(): string {
  const arg = process.argv[2];
  if (!arg) {
    const fallback = "./config/devices.json";
    console.log(`[run] No config path provided, trying: ${fallback}`);
    return fallback;
  }
  return arg;
}

function loadConfig(path: string): ServiceConfig {
  if (!existsSync(path)) {
    throw new Error(`Config file not found: ${path}`);
  }
  return JSON.parse(readFileSync(path, "utf-8")) as ServiceConfig;
}

async function createSimulators(
  config: ServiceConfig,
): Promise<Map<string, IModbusSimulatorAdapter>> {
  const map = new Map<string, IModbusSimulatorAdapter>();

  for (const sim of config.simulators) {
    if (sim.type === "bsc") {
      const rackCount = sim.rackCount ?? 8;
      const registerMapPath = sim.registerMap;

      if (registerMapPath) {
        const raw = JSON.parse(readFileSync(registerMapPath, "utf-8")) as any[];
        const parsed = parseBSCMap(raw);
        const bsc = new BSCSimulator({
          rackCount,
          registers: parsed.registers,
        });
        map.set(sim.id, new BSCSimulatorAdapter(bsc));
        console.log(
          `[run] BSC simulator: ${sim.id} (${rackCount} racks, ${raw.length} reg entries)`,
        );
      } else {
        console.warn(
          `[run] BSC simulator ${sim.id}: no registerMap, using default`,
        );
        const bsc = new BSCSimulator({ rackCount, registers: [] });
        map.set(sim.id, new BSCSimulatorAdapter(bsc));
      }
    } else if (sim.type === "tms") {
      const tms = new TMSSimulator();
      map.set(sim.id, new TMSSimulatorAdapter(tms));
      console.log(`[run] TMS simulator: ${sim.id}`);
    }
  }

  return map;
}

async function main() {
  console.log("[run] Device Service starting...");

  const configPath = parseArgs();
  const config = loadConfig(configPath);
  const simulators = await createSimulators(config);

  const redis = new RedisConnection(config.redis);
  const mq = new BullMQAdapter(redis);

  const devices: DeviceServiceDevice[] = config.devices.map((d) => {
    const adapter = simulators.get(d.id);
    const device = new ModbusDevice(
      {
        id: d.id,
        name: d.name,
        manufacturer: d.manufacturer,
        model: d.model,
        connection: d.connection,
        telemetryList: d.telemetryList,
        bitfieldConfigs: d.bitfieldConfigs,
      },
      adapter,
    );
    console.log(
      `[run] Device: ${d.id} (${adapter ? "simulated" : "real"}, ${d.pollIntervalMs}ms)`,
    );
    return { device, pollIntervalMs: d.pollIntervalMs };
  });

  const service = new DeviceService(devices, mq);

  let stopping = false;
  const shutdown = async (signal: string) => {
    if (stopping) return;
    stopping = true;
    console.log(`[run] ${signal} received, shutting down...`);
    await service.stop();
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  await service.start();
  console.log("[run] Ready. Waiting for BullMQ jobs...");
}

main().catch((err) => {
  console.error("[run] Fatal:", err);
  process.exit(1);
});
