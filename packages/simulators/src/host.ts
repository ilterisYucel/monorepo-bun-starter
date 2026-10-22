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
import type { ConnectorSimSubset, DeviceConfigFile } from "@gd-monorepo/shared-types";
import type { SimulatorNetworkConfig } from "./server";
import type { ISimulator } from "./contracts";
import { BSCSimulator, parseBSCMap } from "./bsc";
import { HvacSimulator } from "./hvac";
import { CbSimulator } from "./cb";
import { DcOutputSimulator } from "./dc-output";
import { DcMeterSimulator } from "./dc-meter";
import { EnergyAnalyzerSimulator } from "./energy-analyzer";
import { ControlPanelIoSimulator } from "./control-panel-io";
import { ImdSimulator } from "./imd";
import { FssSimulator } from "./fss";
import { WattoxPcsSimulator } from "./wattox-pcs";
import { DemoMvStationSimulator } from "./demo-mv-station";
import { GridLinkBus } from "./grid-link";
import { BscPcsConnectorAdapter, parseBscPcsMapping, TcpSourceReader } from "./bsc-pcs-connector";
import type { BscPcsMapping } from "./bsc-pcs-connector";
import { TcpPcsPowerReader } from "./bsc-pcs-connector/pcs-power-reader";
import type { IBatteryPowerInput } from "./bsc/power-input";

/** PCS güç kaynağı host override'ı uygular (env PCS_EMS_TARGET_HOST). */
function resolvePcsSources(
  sources: NonNullable<ConnectorSimSubset["pcsSources"]>,
  host: string | undefined,
): Array<{ deviceId: string; host: string; port: number; unitId?: number }> {
  if (host === undefined || host.length === 0) return [...sources];
  return sources.map((source) => ({ ...source, host }));
}

/** `details.gridLink.feeder` (PCS↔fider eşleşmesi). */
function detailGridFeeder(config: DeviceConfigFile): string | undefined {
  const link = config.details?.["gridLink"];
  if (typeof link !== "object" || link === null) return undefined;
  const feeder = (link as { feeder?: unknown }).feeder;
  return typeof feeder === "string" && feeder.length > 0 ? feeder : undefined;
}

/** `details.gridLink.deviceId` — PCS'in bağlı olduğu MV simülatörü. */
function detailGridDeviceId(config: DeviceConfigFile): string | undefined {
  const link = config.details?.["gridLink"];
  if (typeof link !== "object" || link === null) return undefined;
  const deviceId = (link as { deviceId?: unknown }).deviceId;
  return typeof deviceId === "string" && deviceId.length > 0 ? deviceId : undefined;
}

/**
 * Field tier şebeke yolu: HER `demo-mv-station` için ayrı bus (istasyon başına
 * 1 MV simülatörü; iki fider aynı panonun H04/H05 hücreleridir).
 */
function createGridLinks(configs: readonly DeviceConfigFile[]): Map<string, GridLinkBus> {
  const buses = new Map<string, GridLinkBus>();
  for (const config of configs) {
    if ((config.type ?? config.transport?.type) === "demo-mv-station") {
      buses.set(config.deviceId, new GridLinkBus());
    }
  }
  return buses;
}

/**
 * Host tarafından yönetilen, self-host edilebilen simülatör yüzeyi.
 * Ortak sözleşme `ISimulator`; self-host ek olarak dinlenen portu açar.
 */
export interface SelfHostedSimulator extends ISimulator {
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
  /** BSC başlangıç SOC'u (%) — `details.initialSocPercent` (yoksa sim 50). */
  readonly initialSocPercent?: number;
  /** Demo hız çarpanı — `details.simSpeedMultiplier` (yoksa 1 = gerçek zaman). */
  readonly simSpeedMultiplier?: number;
  readonly registerMap: string | undefined;
  readonly bmsPort: number | undefined;
  /** Field tier şebeke yolu bus'ı (MV + PCS varsa). */
  readonly gridLink?: GridLinkBus;
  /** PCS'in bağlı olduğu fider hücresi. */
  readonly gridFeeder?: string;
}

export type SimulatorBuilder = (context: SimulatorBuildContext) => SelfHostedSimulator;

/** SimulatorHost yapılandırması. */
export interface SimulatorHostOptions {
  /** BSC→PCS connector BMS hedef override (env PCS_BMS_TARGET_*). */
  readonly bmsTarget?: { readonly host?: string; readonly port?: number };
  /** PCS→BSC ters kanal host override (env PCS_EMS_TARGET_HOST). */
  readonly pcsPowerHost?: string;
  /** Bağıl registerMap yollarını çözmek için config dizini. */
  readonly configDir?: string;
}

interface PlannedSimulator {
  readonly deviceId: string;
  /** Simülatör tipi (host wiring kararları için; ör. "bsc" → güç girdisi). */
  readonly simType: string;
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
  private readonly instances = new Map<string, SelfHostedSimulator>();
  /** BSC dış güç girdileri (connector ters kanalı için). */
  private readonly powerInputs = new Map<string, IBatteryPowerInput>();
  private readonly gridLinks: Map<string, GridLinkBus>;
  private running: RunningSimulator[] = [];

  constructor(configs: readonly DeviceConfigFile[], options: SimulatorHostOptions = {}) {
    this.configs = configs;
    this.options = options;
    this.gridLinks = createGridLinks(configs);
    this.registerDefaults();
  }

  private registerDefaults(): void {
    this.builders.set("bsc", (ctx) => {
      const registers = ctx.registerMap
        ? parseBSCMap(
            JSON.parse(readFileSync(ctx.registerMap, "utf-8")) as Record<string, unknown>[],
          ).registers
        : [];
      return new BSCSimulator({
        deviceId: ctx.deviceId,
        rackCount: ctx.rackCount,
        ...(ctx.initialSocPercent !== undefined ? { initialSocPercent: ctx.initialSocPercent } : {}),
        ...(ctx.simSpeedMultiplier !== undefined
          ? { simSpeedMultiplier: ctx.simSpeedMultiplier }
          : {}),
        registers,
        network: ctx.network,
      });
    });
    this.builders.set("hvac", (ctx) => new HvacSimulator({ deviceId: ctx.deviceId, network: ctx.network }));
    this.builders.set("cb", (ctx) => new CbSimulator({ deviceId: ctx.deviceId, network: ctx.network }));
    this.builders.set("dc-output", (ctx) => new DcOutputSimulator({ deviceId: ctx.deviceId, network: ctx.network }));
    this.builders.set("dc-meter", (ctx) => new DcMeterSimulator({ deviceId: ctx.deviceId, network: ctx.network }));
    this.builders.set(
      "energy-analyzer",
      (ctx) => new EnergyAnalyzerSimulator({ deviceId: ctx.deviceId, network: ctx.network }),
    );
    this.builders.set(
      "control-panel-io",
      (ctx) => new ControlPanelIoSimulator({ deviceId: ctx.deviceId, network: ctx.network }),
    );
    this.builders.set("imd", (ctx) => new ImdSimulator({ deviceId: ctx.deviceId, network: ctx.network }));
    this.builders.set("fss", (ctx) => new FssSimulator({ deviceId: ctx.deviceId, network: ctx.network }));
    this.builders.set(
      "demo-mv-station",
      (ctx) =>
        new DemoMvStationSimulator({
          deviceId: ctx.deviceId,
          network: ctx.network,
          ...(ctx.gridLink !== undefined ? { gridLink: ctx.gridLink } : {}),
        }),
    );
    this.builders.set(
      "wattox-pcs",
      (ctx) =>
        new WattoxPcsSimulator({
          deviceId: ctx.deviceId,
          ...(ctx.bmsPort !== undefined ? { bmsPort: ctx.bmsPort } : {}),
          ...(ctx.gridLink !== undefined && ctx.gridFeeder !== undefined
            ? { gridLink: ctx.gridLink, gridFeeder: ctx.gridFeeder }
            : {}),
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
        this.instances.set(item.deviceId, simulator);
        if (item.simType === "bsc") {
          this.powerInputs.set(item.deviceId, simulator as unknown as IBatteryPowerInput);
        }
        running.push({ deviceId: item.deviceId, port, stop: () => simulator.stop() });
      }
    } catch (error) {
      await Promise.allSettled(running.map((entry) => entry.stop()));
      this.index.clear();
      this.instances.clear();
      this.powerInputs.clear();
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
    this.instances.clear();
    this.powerInputs.clear();
  }

  /** Sorgu — çalışan simülatörün portu. */
  portFor(deviceId: string): number | undefined {
    return this.index.get(deviceId);
  }

  /**
   * Komut — cihazın simülatörüne senaryo enjekte eder (dev/debug).
   * Cihaz yok veya enjeksiyon desteklenmiyorsa `false` döner.
   */
  inject(deviceId: string, scenario: string): boolean {
    return this.instances.get(deviceId)?.inject?.(scenario) ?? false;
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

      const network = this.bindNetwork(config, config.deviceId);
      claim(network.port, config.deviceId);

      const context: SimulatorBuildContext = {
        deviceId: config.deviceId,
        network,
        rackCount: detailNumber(config, "rackCount") ?? 8,
        ...(detailNumber(config, "initialSocPercent") !== undefined
          ? { initialSocPercent: detailNumber(config, "initialSocPercent") }
          : {}),
        ...(detailNumber(config, "simSpeedMultiplier") !== undefined
          ? { simSpeedMultiplier: detailNumber(config, "simSpeedMultiplier") }
          : {}),
        registerMap: this.resolveMap(transport.registerMap),
        bmsPort: transport.bmsPort,
        ...(this.gridLinks.get(detailGridDeviceId(config) ?? config.deviceId) !== undefined
          ? { gridLink: this.gridLinks.get(detailGridDeviceId(config) ?? config.deviceId) }
          : {}),
        ...(detailGridFeeder(config) !== undefined
          ? { gridFeeder: detailGridFeeder(config) }
          : {}),
      };
      planned.push({ deviceId: config.deviceId, simType, build: () => builder(context) });
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
      const pcsSources = connector.sim.pcsSources;
      const powerLink =
        pcsSources !== undefined && pcsSources.length > 0
          ? {
              reader: new TcpPcsPowerReader(resolvePcsSources(pcsSources, this.options.pcsPowerHost)),
              input: {
                applyPowerKw: (kw: number): void => {
                  this.powerInputs.get(config.deviceId)?.applyPowerKw(kw);
                },
              },
              scale: connector.sim.powerScale ?? 1,
            }
          : undefined;
      const adapter = new BscPcsConnectorAdapter({
        deviceId: connector.device.deviceId,
        mapping,
        source: new TcpSourceReader(endpoints),
        network: monitoring,
        ...(powerLink !== undefined ? { powerLink } : {}),
      });
      planned.push({
        deviceId: connector.device.deviceId,
        simType: "bsc-pcs-connector",
        build: () => adapter,
      });
    }

    return planned;
  }

  private resolveMap(path: string | undefined): string | undefined {
    if (path === undefined) return undefined;
    if (isAbsolute(path)) return path;
    return resolve(this.options.configDir ?? ".", path);
  }

  /**
   * Simülatör sunucusunun BAĞLANMA (bind) adresi. Test/kapsayıcı ortamında
   * `SIMULATOR_BIND_HOST` (ör. 0.0.0.0) ile ezilebilir; varsayılan config
   * `connection.host` (127.0.0.1). Device-service istemcisi config host'una
   * (loopback) bağlanmaya devam eder.
   */
  private bindNetwork(config: DeviceConfigFile, deviceId: string): SimulatorNetworkConfig {
    const network = readNetwork(config, deviceId);
    const override = process.env.SIMULATOR_BIND_HOST;
    return override !== undefined && override.length > 0 ? { ...network, host: override } : network;
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
