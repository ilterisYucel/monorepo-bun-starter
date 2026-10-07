// packages/simulators/src/host.ts
//
// SimulatorHost — config listesindeki `kind === "simulator"` cihazları ve BSC
// config'i içindeki `connector` (BSC→PCS link simülasyonu) örnekleyip self-host
// Modbus TCP sunucularını açar (SIMULATOR-MIMARISI UC-3/UC-4). device-service
// simülatör kavramını görmez; yalnız bu host'u başlatır/durdurur ve TCP'den bağlanır.
//
// Yeni simülatör tipi = `builders` haritasına 1 kayıt satırı (K4/FR-3.3).

import { readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import type { DeviceConfigFile } from "@gd-monorepo/shared-types";
import type { SimulatorNetworkConfig } from "./server";
import { BSCSimulator, parseBSCMap } from "./bsc";
import { HvacSimulator } from "./hvac";
import { CbSimulator } from "./cb";
import { DcOutputSimulator } from "./dc-output";
import { DcMeterSimulator } from "./dc-meter";
import { EnergyAnalyzerSimulator } from "./energy-analyzer";
import { ControlPanelIoSimulator } from "./control-panel-io";
import { ImdSimulator } from "./imd";
import { WattoxPcsSimulator } from "./wattox-pcs";
import { DemoMvStationSimulator } from "./demo-mv-station";
import { BscPcsConnectorAdapter, parseBscPcsMapping, TcpSourceReader } from "./bsc-pcs-connector";
import type { BscPcsMapping } from "./bsc-pcs-connector";

/** Host tarafından yönetilen, self-host edilebilen simülatör yüzeyi. */
export interface SelfHostedSimulator {
  start(): Promise<void>;
  stop(): Promise<void>;
  port(): number;
}

/** Çalışan bir simülatör sunucusu. */
export interface RunningSimulator {
  deviceId: string;
  port: number;
  stop(): Promise<void>;
}

/** Builder'a geçen bağlam. */
export interface SimulatorBuildContext {
  readonly deviceId: string;
  readonly network: SimulatorNetworkConfig;
  readonly rackCount: number;
  readonly registerMap: string | undefined;
  readonly bmsPort: number | undefined;
}

export type SimulatorBuilder = (context: SimulatorBuildContext) => SelfHostedSimulator;

/** SimulatorHost yapılandırması. */
export interface SimulatorHostOptions {
  /** BSC→PCS connector BMS hedef override (env PCS_BMS_TARGET_*). */
  readonly bmsTarget?: { readonly host?: string; readonly port?: number };
  /** Bağıl registerMap yollarını çözmek için config dizini. */
  readonly configDir?: string;
}

interface PlannedSimulator {
  readonly deviceId: string;
  readonly build: () => SelfHostedSimulator;
}

/**
 * SimulatorHost — sözleşme:
 * - `start()` config'lerdeki simülatörleri + BSC `connector` sim'lerini örnekler,
 *   sunucularını açar ve `RunningSimulator[]` döner. Bilinmeyen tip veya port
 *   çakışması → fail-fast (kısmen açılanlar kapatılır).
 * - `stopAll()` tüm sunucuları kapatır (idempotent).
 * - `portFor(deviceId)` çalışan simülatörün portunu döner.
 */
export class SimulatorHost {
  private readonly builders = new Map<string, SimulatorBuilder>();
  private readonly configs: readonly DeviceConfigFile[];
  private readonly options: SimulatorHostOptions;
  private readonly index = new Map<string, number>();
  private running: RunningSimulator[] = [];

  constructor(configs: readonly DeviceConfigFile[], options: SimulatorHostOptions = {}) {
    this.configs = configs;
    this.options = options;
    this.registerDefaults();
  }

  private registerDefaults(): void {
    this.builders.set("bsc", (ctx) => {
      const registers = ctx.registerMap
        ? parseBSCMap(
            JSON.parse(readFileSync(ctx.registerMap, "utf-8")) as Record<string, unknown>[],
          ).registers
        : [];
      return new BSCSimulator({ rackCount: ctx.rackCount, registers, network: ctx.network });
    });
    this.builders.set("hvac", (ctx) => new HvacSimulator({ network: ctx.network }));
    this.builders.set("cb", (ctx) => new CbSimulator({ network: ctx.network }));
    this.builders.set("dc-output", (ctx) => new DcOutputSimulator({ network: ctx.network }));
    this.builders.set("dc-meter", (ctx) => new DcMeterSimulator({ network: ctx.network }));
    this.builders.set(
      "energy-analyzer",
      (ctx) => new EnergyAnalyzerSimulator({ network: ctx.network }),
    );
    this.builders.set(
      "control-panel-io",
      (ctx) => new ControlPanelIoSimulator({ network: ctx.network }),
    );
    this.builders.set("imd", (ctx) => new ImdSimulator({ network: ctx.network }));
    this.builders.set(
      "demo-mv-station",
      (ctx) => new DemoMvStationSimulator({ network: ctx.network }),
    );
    this.builders.set(
      "wattox-pcs",
      (ctx) =>
        new WattoxPcsSimulator({
          ...(ctx.bmsPort !== undefined ? { bmsPort: ctx.bmsPort } : {}),
          network: ctx.network,
        }),
    );
  }

  /** Komut — simülatör sunucularını açar; fail-fast (hata → kısmen açılanlar kapanır). */
  async start(): Promise<RunningSimulator[]> {
    const planned = this.plan();
    const running: RunningSimulator[] = [];
    try {
      for (const item of planned) {
        const simulator = item.build();
        await simulator.start();
        const port = simulator.port();
        this.index.set(item.deviceId, port);
        running.push({ deviceId: item.deviceId, port, stop: () => simulator.stop() });
      }
    } catch (error) {
      await Promise.allSettled(running.map((entry) => entry.stop()));
      this.index.clear();
      throw error;
    }
    this.running = running;
    return running;
  }

  /** Komut — tüm sunucuları kapatır (idempotent). */
  async stopAll(): Promise<void> {
    await Promise.allSettled(this.running.map((entry) => entry.stop()));
    this.running = [];
    this.index.clear();
  }

  /** Sorgu — çalışan simülatörün portu. */
  portFor(deviceId: string): number | undefined {
    return this.index.get(deviceId);
  }

  private plan(): PlannedSimulator[] {
    const seenPorts = new Map<number, string>();
    const planned: PlannedSimulator[] = [];
    const claim = (port: number, owner: string): void => {
      if (port === 0) return;
      const previous = seenPorts.get(port);
      if (previous !== undefined) {
        throw new Error(`[SimulatorHost] port cakismasi: ${port} (${previous}, ${owner})`);
      }
      seenPorts.set(port, owner);
    };

    for (const config of this.configs) {
      const transport = config.transport;
      if (transport?.kind !== "simulator") continue;

      const simType = transport.type ?? config.type;
      if (simType === undefined || simType.length === 0) {
        throw new Error(`[SimulatorHost] ${config.deviceId}: simulator tipi belirtilmemis`);
      }
      const builder = this.builders.get(simType);
      if (builder === undefined) {
        throw new Error(`[SimulatorHost] Bilinmeyen simulator tipi: ${simType} (${config.deviceId})`);
      }

      const network = readNetwork(config, config.deviceId);
      claim(network.port, config.deviceId);

      const context: SimulatorBuildContext = {
        deviceId: config.deviceId,
        network,
        rackCount: detailNumber(config, "rackCount") ?? 8,
        registerMap: this.resolveMap(transport.registerMap),
        bmsPort: transport.bmsPort,
      };
      planned.push({ deviceId: config.deviceId, build: () => builder(context) });
    }

    for (const config of this.configs) {
      const connector = config.connector;
      if (connector?.sim === undefined || config.transport?.kind !== "simulator") continue;

      const monitoring = readNetworkLike(
        connector.device.connection,
        connector.device.deviceId,
      );
      claim(monitoring.port, connector.device.deviceId);

      const source = readNetwork(config, config.deviceId);
      const mappingPath = this.resolveMap(connector.sim.registerMap);
      if (mappingPath === undefined) {
        throw new Error(`[SimulatorHost] ${config.deviceId}: connector registerMap yok`);
      }
      const mapping = resolveBscPcsTarget(
        parseBscPcsMapping(readFileSync(mappingPath, "utf-8")),
        connector.sim.target,
        this.options.bmsTarget,
      );
      const sourceIds = new Set<string>();
      for (const entry of mapping.mappings) {
        const from = (entry as { from?: { deviceId: string } }).from;
        if (from !== undefined) sourceIds.add(from.deviceId);
      }
      if (sourceIds.size === 0) sourceIds.add(config.deviceId);
      const endpoints = new Map(
        [...sourceIds].map(
          (id) => [id, { host: source.host ?? "127.0.0.1", port: source.port }] as const,
        ),
      );
      const adapter = new BscPcsConnectorAdapter({
        mapping,
        source: new TcpSourceReader(endpoints),
        network: monitoring,
      });
      planned.push({ deviceId: connector.device.deviceId, build: () => adapter });
    }

    return planned;
  }

  private resolveMap(path: string | undefined): string | undefined {
    if (path === undefined) return undefined;
    if (isAbsolute(path)) return path;
    return resolve(this.options.configDir ?? ".", path);
  }
}

/**
 * BSC→PCS connector hedef çözümü (SPEC K12/T-36): env (`bmsTarget`) uygulanır,
 * ardından connector config (`connector.sim.target`) env'i EZER. Her ikisi de
 * tanımsızsa mapping dosyasının hedefi aynen korunur.
 */
export function resolveBscPcsTarget(
  mapping: BscPcsMapping,
  connectorTarget: { host?: string; port?: number } | undefined,
  envTarget: { host?: string; port?: number } | undefined,
): BscPcsMapping {
  return mergeTarget(mergeTarget(mapping, envTarget), connectorTarget);
}

function mergeTarget(
  mapping: BscPcsMapping,
  target: { host?: string; port?: number } | undefined,
): BscPcsMapping {
  if (target === undefined) return mapping;
  return {
    ...mapping,
    target: {
      ...mapping.target,
      ...(target.host !== undefined ? { host: target.host } : {}),
      ...(target.port !== undefined ? { port: target.port } : {}),
    },
  };
}

function readNetwork(config: DeviceConfigFile, deviceId: string): SimulatorNetworkConfig {
  return readNetworkLike(config.connection, deviceId);
}

/** Opak `details` objesinden sayısal bir nitelik okur (yorum tüketicide). */
function detailNumber(config: DeviceConfigFile, key: string): number | undefined {
  const raw = config.details?.[key];
  const value = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

function readNetworkLike(
  connection: Record<string, unknown>,
  deviceId: string,
): SimulatorNetworkConfig {
  const rawPort = connection["port"];
  const port = typeof rawPort === "number" ? rawPort : Number(rawPort);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`[SimulatorHost] ${deviceId}: gecersiz connection.port (${String(rawPort)})`);
  }
  const rawHost = connection["host"];
  const host = typeof rawHost === "string" && rawHost.length > 0 ? rawHost : "127.0.0.1";
  return { host, port };
}
