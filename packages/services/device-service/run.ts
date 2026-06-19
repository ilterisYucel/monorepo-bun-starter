import { readFileSync, existsSync } from "fs";
import { ModbusDevice, CANBusDevice, MQTTDevice } from "@gd-monorepo/core";
import { BullMQAdapter, RedisConnection } from "@gd-monorepo/core";
import type {
  ModbusTelemetryData,
  BitfieldConfig,
  Device,
  BaseTelemetryData,
  IDevice,
} from "@gd-monorepo/shared-types";
import {
  BSCSimulator,
  BSCSimulatorAdapter,
  parseBSCMap,
} from "@gd-monorepo/simulators";
import { TMSSimulator, TMSSimulatorAdapter } from "@gd-monorepo/simulators";
import { DeviceService } from "./src/device-service";
import type { DeviceServiceDevice } from "./src/types";

interface RuntimeDeviceConfig extends Device {
  pollIntervalMs: number;
  bitfieldConfigs?: BitfieldConfig[];
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
  devices: RuntimeDeviceConfig[];
}

type DriverFactory = (raw: RuntimeDeviceConfig, adapter?: unknown) => Promise<IDevice>;

const driverRegistry = new Map<string, DriverFactory>([
  [
    "MODBUS",
    async (raw, adapter) => {
      const telemetryList: ModbusTelemetryData[] = raw.telemetryMap.map(
        (m) => {
          const base: Required<Pick<BaseTelemetryData, "name" | "description" | "value" | "unit" | "timestamp" | "deviceId">> = {
            name: m.telemetryName,
            description: m.telemetryName,
            value: 0,
            unit: "",
            timestamp: new Date().toISOString(),
            deviceId: raw.id,
          };
          return {
            ...base,
            ...m.protocolSpecific,
          } as ModbusTelemetryData;
        },
      );

      return new ModbusDevice(
        {
          id: raw.id,
          name: raw.name,
          manufacturer: raw.manufacturer,
          model: raw.model,
          connection: raw.connectionParams as {
            host: string;
            port: number;
            slaveId?: number;
            timeout?: number;
          },
          telemetryList,
          bitfieldConfigs: raw.bitfieldConfigs,
        },
        adapter as any,
      );
    },
  ],
  ["CANBUS", async (raw) => new CANBusDevice(raw.id)],
  ["MQTT", async (raw) => new MQTTDevice(raw.id)],
]);

function parseArgs(): string {
  const arg = process.argv[2];
  if (!arg) {
    console.log("[run] No config path provided, using: ./config/devices.json");
    return "./config/devices.json";
  }
  return arg;
}

function loadConfig(path: string): ServiceConfig {
  if (!existsSync(path)) throw new Error(`Config file not found: ${path}`);
  return JSON.parse(readFileSync(path, "utf-8")) as ServiceConfig;
}

async function createSimulators(
  config: ServiceConfig,
): Promise<Map<string, unknown>> {
  const map = new Map<string, unknown>();

  for (const sim of config.simulators) {
    if (sim.type === "bsc") {
      const rackCount = sim.rackCount ?? 8;
      if (sim.registerMap) {
        const raw = JSON.parse(readFileSync(sim.registerMap, "utf-8")) as any[];
        const parsed = parseBSCMap(raw);
        const bsc = new BSCSimulator({ rackCount, registers: parsed.registers });
        map.set(sim.id, new BSCSimulatorAdapter(bsc));
        console.log(`[run] BSC simulator: ${sim.id} (${rackCount} racks)`);
      } else {
        const bsc = new BSCSimulator({ rackCount, registers: [] });
        map.set(sim.id, new BSCSimulatorAdapter(bsc));
        console.log(`[run] BSC simulator: ${sim.id} (${rackCount} racks, default)`);
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

  const devices: DeviceServiceDevice[] = await Promise.all(
    config.devices.map(async (d) => {
      const factory = driverRegistry.get(d.protocol);
      if (!factory) throw new Error(`[run] Unknown protocol: ${d.protocol}`);

      const adapter = simulators.get(d.id);
      const device = await factory(d, adapter);

      console.log(`[run] Device: ${d.id} (${d.protocol}, ${adapter ? "sim" : "real"}, ${d.pollIntervalMs}ms)`);
      return { device, pollIntervalMs: d.pollIntervalMs };
    }),
  );

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
