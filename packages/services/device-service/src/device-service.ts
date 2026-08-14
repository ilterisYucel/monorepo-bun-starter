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
import { SimulatorRegistry } from "./simulator-registry";
import { DeviceScheduler } from "./device-scheduler";
import { TelemetryTagger } from "./telemetry-tagger";

interface DeviceEntry {
  device: IDevice;
  pollIntervalMs: number;
  name: string;
  manufacturer: string | undefined;
  model: string | undefined;
  protocol: string;
  type: string;
  rackCount?: number;
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
  private readonly simulators: SimulatorRegistry;
  private readonly sql: ISqlDatabase | undefined;
  private readonly taggers: Map<string, TelemetryTagger>;

  constructor(
    devices: {
      device: IDevice;
      pollIntervalMs: number;
      name: string;
      manufacturer: string | undefined;
      model: string | undefined;
      protocol: string;
      type: string;
      rackCount?: number;
      configConnection: Record<string, unknown>;
    }[],
    mq: IMessageQueue,
    scheduler: DeviceScheduler,
    simulators: SimulatorRegistry,
    sql?: ISqlDatabase,
    identity?: { containerId?: string; fieldId?: string },
  ) {
    this.devices = new Map();
    this.taggers = new Map();
    this.running = false;
    this.mq = mq;
    this.scheduler = scheduler;
    this.simulators = simulators;
    this.sql = sql;

    for (const d of devices) {
      this.devices.set(d.device.id, d);
      this.taggers.set(
        d.device.id,
        new TelemetryTagger({ deviceId: d.device.id, ...identity }),
      );
    }
  }

  static async fromConfigDir(
    configDir: string,
    mq: IMessageQueue,
    identity?: { containerId?: string; fieldId?: string },
  ): Promise<DeviceService> {
    const loader = new DeviceConfigLoader(configDir);
    const { service, devices: configs } = loader.load();

    const simulators = new SimulatorRegistry();
    simulators.createFromConfigs(configs);

    const factory = new DeviceFactory(simulators);
    const scheduler = new DeviceScheduler(mq, service);

    const sql = await this.buildSqlAdapter(service);

    const defaultInterval = service.servicePollIntervalMs ?? 5000;

    const deviceEntries = configs.map((c) => {
      const device = factory.create(c);
      const pollIntervalMs = c.pollIntervalMs ?? defaultInterval;
      // Cihaz tipi ve rack sayısı config'in kendi alanlarıdır —
      // generic servis transport/simülatör bilgisine DOKUNMAZ.
      const type = c.type ?? "unknown";
      const rackCount = c.rackCount;
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

    return new DeviceService(deviceEntries, mq, scheduler, simulators, sql, identity);
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

    const entries = Array.from(this.devices.values());
    const results = await Promise.allSettled(entries.map((e) => e.device.connect()));
    const connected = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed > 0) {
      console.warn(`[DeviceService] ${failed}/${entries.length} cihaza baglanilamadi, ${connected} baglandi`);
    } else {
      console.log(`[DeviceService] ${entries.length} cihaza baglanildi`);
    }

    // Tüm cihazlar saniye sınırına hizalanır (generic):
    // LG BSC gibi cihazlar register'ları saniye sınırında günceller; hizalı poll
    // en taze değeri minimum gecikmeyle okur ve olay analizinde çapraz cihaz
    // karşılaştırmayı tutarlı kılar. Izgara sabit 1000 ms'dir (sıra-bağımsız):
    // 1 sn'lik cihaz her saniyede, 5 sn'lik cihaz her 5. saniyede aynı fazda poll eder.
    const alignedStart = new Date(Math.ceil(Date.now() / 1000) * 1000);

    const scheduleResults = await Promise.allSettled(
      entries.map((entry) =>
        this.scheduler.scheduleRead(
          entry.device.id,
          entry.pollIntervalMs,
          alignedStart,
        ),
      ),
    );
    const scheduleFailed = scheduleResults.filter((r) => r.status === "rejected").length;
    if (scheduleFailed > 0) {
      console.warn(
        `[DeviceService] ${scheduleFailed}/${entries.length} cihaz zamanlanamadi`,
      );
    }

    if (this.sql) {
      const upsertResults = await Promise.allSettled(
        entries.map((entry) =>
          this.sql!.execute(UPSERT_DEVICE, [
            entry.device.id,
            entry.name,
            entry.manufacturer ?? null,
            entry.model ?? null,
            entry.protocol,
            entry.type,
            entry.rackCount ?? null,
            entry.pollIntervalMs,
            JSON.stringify(entry.configConnection),
          ]),
        ),
      );
      const upsertFailed = upsertResults.filter((r) => r.status === "rejected").length;
      if (upsertFailed > 0) {
        console.warn(
          `[DeviceService] ${upsertFailed}/${entries.length} cihaz kaydi yapilamadi`,
        );
      }
    }

    await this.scheduler.scheduleManagement();

    await this.mq.registerWorker(async (job) => {
      if (!this.running) return;

      if (job.type === "READ_DEVICE") {
        await this.readDevice(job);
      } else if (job.type === "COMMAND_DEVICE") {
        return await this.executeCommand(job);
      }
    }, { concurrency: 10 });

    console.log(`[DeviceService] ${this.devices.size} cihaz baslatildi`);
  }

  async stop(): Promise<void> {
    this.running = false;

    const disconnectPromises = Array.from(this.devices.values()).map(async (entry) => {
      if (this.sql) {
        try {
          await this.sql.execute(SET_DEVICE_OFFLINE, [entry.device.id]);
        } catch {
          console.warn(`[DeviceService] Status update failed for ${entry.device.id}`);
        }
      }
      try {
        await entry.device.disconnect();
      } catch {
        console.warn(`[DeviceService] Disconnect failed for ${entry.device.id}`);
      }
    });
    await Promise.allSettled(disconnectPromises);

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

    await this.publish(job.deviceId, allData);
  }

  private async publish(deviceId: string, data: TelemetryData[]): Promise<void> {
    const tagger = this.taggers.get(deviceId);
    const enriched = tagger ? tagger.enrich(data) : data;
    await this.scheduler.publishTelemetry(deviceId, enriched);
  }

  private async executeCommand(job: CommandDeviceJob): Promise<{ success: boolean; validated?: boolean; reason?: string }> {
    const entry = this.devices.get(job.deviceId);
    if (!entry) {
      const msg = `Bilinmeyen cihaz: ${job.deviceId}`;
      console.warn(`[DeviceService] ${msg}`);
      return { success: false, reason: msg };
    }

    console.log(`[DeviceService] Komut: ${job.deviceId} (${job.telemetries.length} telemetry)`);

    try {
      if (job.atomic && entry.device.writeAtomic) {
        await entry.device.writeAtomic(job.telemetries);
      } else {
        await entry.device.write(job.telemetries);
      }
    } catch (err) {
      const msg = `Write failed: ${String(err)}`;
      console.error(`[DeviceService] ${msg}`);
      return { success: false, reason: msg };
    }

    try {
      const allData = await entry.device.read();
      const bitfields = (await entry.device.readBitfields?.()) ?? [];
      await this.publish(job.deviceId, [...allData, ...bitfields]);
    } catch (err) {
      console.error(`[DeviceService] Read+broadcast after command failed: ${String(err)}`);
    }

    const validate = job.validate;
    if (validate) {
      const minWaitMs = validate.minWaitMs ?? 0;
      if (minWaitMs > 0) {
        await new Promise((r) => setTimeout(r, minWaitMs));
      }
      const start = Date.now();
      while (Date.now() - start < validate.timeoutMs) {
        try {
          const readBack = await entry.device.read();
          const allMatch = validate.reads.every((expected) => {
            const actual = readBack.find((r) => r.name === expected.name);
            return actual && actual.value === expected.expect;
          });
          if (allMatch) return { success: true, validated: true };
        } catch {
          // ELEGANT-EXCEPTION: validation read-back failure; retry in next poll cycle
        }
        await new Promise((r) => setTimeout(r, 50));
      }
      return { success: true, validated: false, reason: "Validation timeout" };
    }

    return { success: true };
  }
}
