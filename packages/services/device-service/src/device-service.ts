import type {
  IDevice,
  ReadDeviceJob,
  CommandDeviceJob,
  TelemetryData,
  ServiceConfigFile,
} from "@gd-monorepo/shared-types";
import type { IMessageQueue, ISqlDatabase } from "@gd-monorepo/core";
import { PostgresAdapter } from "@gd-monorepo/core";
import { DeviceConfigLoader } from "./config-loader";
import { DeviceFactory } from "./device-factory";
import { SimulatorProvider } from "./simulator-provider";
import { DeviceScheduler } from "./device-scheduler";

interface DeviceEntry {
  device: IDevice;
  pollIntervalMs: number;
  name: string;
  manufacturer: string | undefined;
  model: string | undefined;
  protocol: string;
  type: string;
  rackCount: number;
  configConnection: Record<string, unknown>;
}

const CREATE_DEVICES_TABLE = `
  CREATE TABLE IF NOT EXISTS devices (
    id                VARCHAR(255) PRIMARY KEY,
    name              VARCHAR(255) NOT NULL,
    manufacturer      VARCHAR(255),
    model             VARCHAR(255),
    protocol          VARCHAR(50) NOT NULL,
    type              VARCHAR(50) DEFAULT 'unknown',
    rack_count        INTEGER DEFAULT 0,
    status            VARCHAR(50) DEFAULT 'offline',
    poll_interval_ms  INTEGER,
    connection        JSONB DEFAULT '{}',
    last_seen         TIMESTAMPTZ,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
  );
`;

const UPSERT_DEVICE = `
  INSERT INTO devices (id, name, manufacturer, model, protocol, type, rack_count, status, poll_interval_ms, connection, last_seen, updated_at)
  VALUES ($1, $2, $3, $4, $5, $6, $7, 'online', $8, $9::jsonb, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    manufacturer = EXCLUDED.manufacturer,
    model = EXCLUDED.model,
    protocol = EXCLUDED.protocol,
    type = EXCLUDED.type,
    rack_count = EXCLUDED.rack_count,
    status = 'online',
    poll_interval_ms = EXCLUDED.poll_interval_ms,
    connection = EXCLUDED.connection,
    last_seen = NOW(),
    updated_at = NOW();
`;

const SET_DEVICE_OFFLINE = `UPDATE devices SET status = 'offline', updated_at = NOW() WHERE id = $1`;

export class DeviceService {
  private readonly devices: Map<string, DeviceEntry>;
  private running: boolean;
  private readonly mq: IMessageQueue;
  private readonly scheduler: DeviceScheduler;
  private readonly simulators: SimulatorProvider;
  private readonly sql: ISqlDatabase | undefined;

  constructor(
    devices: {
      device: IDevice;
      pollIntervalMs: number;
      name: string;
      manufacturer: string | undefined;
      model: string | undefined;
      protocol: string;
      type: string;
      rackCount: number;
      configConnection: Record<string, unknown>;
    }[],
    mq: IMessageQueue,
    scheduler: DeviceScheduler,
    simulators: SimulatorProvider,
    sql?: ISqlDatabase,
  ) {
    this.devices = new Map();
    this.running = false;
    this.mq = mq;
    this.scheduler = scheduler;
    this.simulators = simulators;
    this.sql = sql;

    for (const d of devices) {
      this.devices.set(d.device.id, d);
    }
  }

  static async fromConfigDir(
    configDir: string,
    mq: IMessageQueue,
  ): Promise<DeviceService> {
    const loader = new DeviceConfigLoader(configDir);
    const { service, devices: configs } = loader.load();

    const simulators = new SimulatorProvider();
    simulators.createFromConfigs(configs);

    const factory = new DeviceFactory(simulators);
    const scheduler = new DeviceScheduler(mq, service);

    const sql = await this.buildSqlAdapter(service);

    const defaultInterval = service.servicePollIntervalMs ?? 5000;

    const deviceEntries = configs.map((c) => {
      const device = factory.create(c);
      const pollIntervalMs = c.pollIntervalMs ?? defaultInterval;
      const type = c.simulator?.type ?? "unknown";
      const rackCount = c.simulator?.rackCount ?? 0;
      return {
        device,
        pollIntervalMs,
        name: c.name,
        manufacturer: c.manufacturer,
        model: c.model,
        protocol: c.protocol,
        type,
        rackCount,
        configConnection: c.connection,
      };
    });

    return new DeviceService(deviceEntries, mq, scheduler, simulators, sql);
  }

  private static async buildSqlAdapter(
    service: ServiceConfigFile,
  ): Promise<ISqlDatabase | undefined> {
    if (!service.postgresql) return undefined;

    const sql = new PostgresAdapter(service.postgresql);
    await sql.connect();
    await sql.execute(CREATE_DEVICES_TABLE);
    await sql.execute("CREATE INDEX IF NOT EXISTS idx_devices_status ON devices (status)");
    console.log("[DeviceService] Cihaz tablosu hazir");
    return sql;
  }

  async start(): Promise<void> {
    this.running = true;

    this.simulators.start();

    const entries = Array.from(this.devices.values());
    const results = await Promise.allSettled(entries.map((e) => e.device.connect()));
    const connected = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed > 0) {
      console.warn(`[DeviceService] ${failed}/${entries.length} cihaza baglanilamadi, ${connected} baglandi`);
    } else {
      console.log(`[DeviceService] ${entries.length} cihaza baglanildi`);
    }

    for (const entry of entries) {
      await this.scheduler.scheduleRead(entry.device.id, entry.pollIntervalMs);

      if (this.sql) {
        await this.sql.execute(UPSERT_DEVICE, [
          entry.device.id,
          entry.name,
          entry.manufacturer ?? null,
          entry.model ?? null,
          entry.protocol,
          entry.type,
          entry.rackCount,
          entry.pollIntervalMs,
          JSON.stringify(entry.configConnection),
        ]);
      }
    }

    await this.scheduler.scheduleManagement();

    await this.mq.registerWorker(async (job) => {
      if (!this.running) return;

      if (job.type === "READ_DEVICE") {
        await this.readDevice(job);
      } else if (job.type === "COMMAND_DEVICE") {
        await this.executeCommand(job);
      }
    });

    console.log(`[DeviceService] ${this.devices.size} cihaz baslatildi`);
  }

  async stop(): Promise<void> {
    this.running = false;

    this.simulators.stop();

    const disconnectPromises = Array.from(this.devices.values()).map(async (entry) => {
      if (this.sql) {
        try {
          await this.sql.execute(SET_DEVICE_OFFLINE, [entry.device.id]);
        } catch {
          /* status guncelleme hatasi yoksay */
        }
      }
      try {
        await entry.device.disconnect();
      } catch {
        /* baglanti kesme hatasi yoksay */
      }
    });
    await Promise.all(disconnectPromises);

    await this.scheduler.close();

    if (this.sql) {
      await this.sql.disconnect();
    }

    this.devices.clear();
    console.log("[DeviceService] Tum cihazlar durduruldu");
  }

  health(): boolean {
    return this.running && this.devices.size > 0;
  }

  private async readDevice(job: ReadDeviceJob): Promise<void> {
    const entry = this.devices.get(job.deviceId);
    if (!entry) {
      console.warn(
        `[DeviceService] Bilinmeyen cihaz okuma istegi: ${job.deviceId}`,
      );
      return;
    }

    const data: TelemetryData[] = await entry.device.read();
    const bitfields = (await entry.device.readBitfields?.()) ?? [];
    const allData = [...data, ...bitfields];

    await this.scheduler.publishTelemetry(job.deviceId, allData);
  }

  private async executeCommand(job: CommandDeviceJob): Promise<void> {
    const entry = this.devices.get(job.deviceId);
    if (!entry) {
      console.warn(
        `[DeviceService] Bilinmeyen cihaz komut istegi: ${job.deviceId}`,
      );
      return;
    }

    console.log(
      `[DeviceService] Komut: ${job.deviceId} (${job.telemetries.length} telemetry)`,
    );

    if (job.atomic && entry.device.writeAtomic) {
      await entry.device.writeAtomic(job.telemetries);
    } else {
      await entry.device.write(job.telemetries);
    }
  }
}
