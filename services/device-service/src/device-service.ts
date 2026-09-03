import type { IDevice, ReadDeviceJob, CommandDeviceJob, TelemetryData, ServiceConfigFile, DeviceAlarmRule } from "@gd-monorepo/shared-types";

import type { IMessageQueue, ISqlDatabase } from "@gd-monorepo/core";
import { TamperLogger } from "@gd-monorepo/tamper-logger";

import { PostgresAdapter } from "@gd-monorepo/core";

import { DeviceConfigLoader } from "./config-loader";
import { DeviceFactory } from "./device-factory";
import { SimulatorRegistry } from "./simulator-registry";
import { DeviceScheduler } from "./device-scheduler";
import { TelemetryTagger } from "./telemetry-tagger";
import { AlarmTransitionDetector, alarmSamples } from "./alarm-transition-detector";
import { AlarmStateRepository } from "./alarm-state-repository";

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
  alarms?: DeviceAlarmRule[];
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

const SET_DEVICE_ONLINE = `UPDATE devices SET status = 'online', last_seen = NOW(), updated_at = NOW() WHERE id = $1`;

/** Sürekli okuma hatasında hatırlatma periyodu — spam önleme (86.4k log/gün). */
const FAILURE_REMINDER_MS = 60_000;

export class DeviceService {
  private readonly devices: Map<string, DeviceEntry>;
  private running: boolean;
  private readonly mq: IMessageQueue;
  private readonly scheduler: DeviceScheduler;
  private readonly simulators: SimulatorRegistry;
  private readonly sql: ISqlDatabase | undefined;
  private readonly taggers: Map<string, TelemetryTagger>;
  private readonly logger: TamperLogger | undefined;
  private readonly offlineSince: Map<string, number>;
  private readonly lastReminderAt: Map<string, number>;
  private readonly alarmDetector: AlarmTransitionDetector;
  private readonly alarmRepository: AlarmStateRepository | undefined;

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
      alarms?: DeviceAlarmRule[];
    }[],
    mq: IMessageQueue,
    scheduler: DeviceScheduler,
    simulators: SimulatorRegistry,
    sql?: ISqlDatabase,
    identity?: { containerId?: string; fieldId?: string },
    logger?: TamperLogger,
  ) {
    this.devices = new Map();
    this.taggers = new Map();
    this.running = false;
    this.mq = mq;
    this.scheduler = scheduler;
    this.simulators = simulators;
    this.sql = sql;
    this.logger = logger;
    this.offlineSince = new Map();
    this.lastReminderAt = new Map();
    this.alarmDetector = new AlarmTransitionDetector();
    this.alarmRepository = sql ? new AlarmStateRepository(sql) : undefined;

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
    logger?: TamperLogger,
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
        alarms: c.alarms,
      };
    });

    return new DeviceService(
      deviceEntries,
      mq,
      scheduler,
      simulators,
      sql,
      identity,
      logger,
    );
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

    // Alarm durum tablosu (Faz 0 eki): DDL + restart sonrası bayat aktiflerin
    // kapatılması + dedup state makinesinin sıfırlanması (yeni gözlem dönemi).
    if (this.alarmRepository) {
      await this.alarmRepository.initialize();
      await this.alarmRepository.resetAll(entries.map((e) => e.device.id));
    }
    for (const entry of entries) {
      this.alarmDetector.reset(entry.device.id);
    }

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
      await this.logOrWarn(
        {
          level: "warn",
          category: "app",
          eventCode: "request_rejected",
          message: "Bilinmeyen cihaz okuma isteği",
          context: { deviceId: job.deviceId },
        },
        `Bilinmeyen cihaz okuma istegi: ${job.deviceId}`,
      );
      return;
    }

    try {
      // ISP (Faz 0 eki): cihaz kendi okuma stratejisinin sahibidir —
      // read() register + bitfield dahil TÜM telemetriyi döner.
      const data: TelemetryData[] = await entry.device.read();

      await this.publish(job.deviceId, data);
      await this.markOnline(job.deviceId);
      await this.evaluateAlarms(job.deviceId, data);
    } catch (err) {
      // Açık 1 kapanışı (T0.11): okuma hatası yutulmaz — geçiş-odaklı loglanır,
      // cihaz offline işaretlenir, poll döngüsü devam eder (READ_DEVICE attempts:1).
      await this.handleReadFailure(job.deviceId, err);
    }
  }

  /**
   * Cihaz alarm değerlendirmesi (Faz 0 eki) — config kuralları telemetri
   * akışına uygulanır; yalnızca kenar geçişleri durum tablosuna + imzalı
   * loga yazılır. SQL/log hataları poll'u KESİNLEMEZ (alarm = app olayı).
   */
  private async evaluateAlarms(
    deviceId: string,
    telemetry: TelemetryData[],
  ): Promise<void> {
    const entry = this.devices.get(deviceId);
    if (!entry || !entry.alarms || entry.alarms.length === 0) return;

    const samples = alarmSamples(entry.alarms, telemetry);
    if (samples.length === 0) return;

    const transitions = this.alarmDetector.detect(deviceId, samples);
    if (transitions.length === 0) return;

    for (const transition of transitions) {
      try {
        if (transition.kind === "set") {
          await this.alarmRepository?.activate(deviceId, {
            name: transition.name,
            severity: transition.severity,
            description: transition.description,
          });
          await this.logger?.log({
            level: transition.severity === "warning" ? "warn" : transition.severity,
            category: "app",
            eventCode: "device_alarm",
            message: `Cihaz alarmi aktif: ${transition.name}`,
            context: {
              deviceId,
              alarm: transition.name,
              severity: transition.severity,
            },
          });
        } else {
          await this.alarmRepository?.deactivate(deviceId, transition.name);
          await this.logger?.log({
            level: "info",
            category: "app",
            eventCode: "device_alarm_cleared",
            message: `Cihaz alarmi kapandi: ${transition.name}`,
            context: { deviceId, alarm: transition.name },
          });
        }
      } catch {
        // alarm durumu/лого best-effort — telemetri akışı etkilenmez
      }
    }
  }

  /** İlk hatada 1× error log + devices.status='offline'; sonrası 60 sn'de 1 debug. */
  private async handleReadFailure(
    deviceId: string,
    err: unknown,
  ): Promise<void> {
    const first = !this.offlineSince.has(deviceId);
    const now = Date.now();
    this.offlineSince.set(deviceId, now);

    if (this.logger) {
      if (first) {
        this.lastReminderAt.set(deviceId, now);
        await this.logger.log({
          level: "error",
          category: "app",
          eventCode: "modbus_read_failed",
          message: "Modbus okuma hatası — cihaz offline işaretlendi",
          context: { deviceId, error: String(err) },
        });
      } else {
        const last = this.lastReminderAt.get(deviceId) ?? now;
        if (now - last >= FAILURE_REMINDER_MS) {
          this.lastReminderAt.set(deviceId, now);
          await this.logger.log({
            level: "debug",
            category: "app",
            eventCode: "modbus_read_failed",
            message: "Cihaz okuması hâlâ başarısız",
            context: { deviceId, error: String(err) },
          });
        }
      }
    }

    if (first && this.sql) {
      try {
        await this.sql.execute(SET_DEVICE_OFFLINE, [deviceId]);
      } catch {
        // offline işareti best-effort — sonraki başarılı okuma düzeltir
      }
    }
  }

  /** offline→online geçişinde 1× info log + devices.status='online'. */
  private async markOnline(deviceId: string): Promise<void> {
    if (!this.offlineSince.has(deviceId)) return;
    this.offlineSince.delete(deviceId);
    this.lastReminderAt.delete(deviceId);

    if (this.logger) {
      await this.logger.log({
        level: "info",
        category: "app",
        eventCode: "device_online",
        message: "Cihaz tekrar çevrimiçi",
        context: { deviceId },
      });
    }
    if (this.sql) {
      try {
        await this.sql.execute(SET_DEVICE_ONLINE, [deviceId]);
      } catch {
        // best-effort
      }
    }
  }

  /** Logger varsa log'lar, yoksa console.warn (geriye uyumluluk). */
  private async logOrWarn(
    event: {
      level: "warn" | "error";
      category: "app";
      eventCode: "request_rejected";
      message: string;
      context: Record<string, unknown>;
    },
    warnMessage: string,
  ): Promise<void> {
    if (this.logger) {
      try {
        await this.logger.log(event);
        return;
      } catch {
        // app kategorisi fail-closed değildir
      }
    }
    console.warn(`[DeviceService] ${warnMessage}`);
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
      await this.logOrWarn(
        {
          level: "warn",
          category: "app",
          eventCode: "request_rejected",
          message: "Bilinmeyen cihaza komut isteği",
          context: { deviceId: job.deviceId },
        },
        msg,
      );
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
      // audit (fail-closed): komut reddi kaydı tutulamazsa job hata verir
      await this.logCommand(job, false, String(err));
      if (this.logger) {
        await this.logger.log({
          level: "error",
          category: "app",
          eventCode: "modbus_write_failed",
          message: msg,
          context: { deviceId: job.deviceId, error: String(err) },
        });
      } else {
        console.error(`[DeviceService] ${msg}`);
      }
      return { success: false, reason: msg };
    }

    try {
      const allData = await entry.device.read();
      await this.publish(job.deviceId, allData);
    } catch (err) {
      await this.logger?.log({
        level: "error",
        category: "app",
        eventCode: "modbus_read_failed",
        message: "Komut sonrası okuma hatası",
        context: { deviceId: job.deviceId, error: String(err) },
      }).catch(() => undefined);
    }

    await this.logCommand(job, true);

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

  /** Komut audit'i (T0.11) — kim/hangi komut/sonuç; audit fail-closed'dur. */
  private async logCommand(
    job: CommandDeviceJob,
    success: boolean,
    error?: string,
  ): Promise<void> {
    if (!this.logger) return;
    await this.logger.log({
      level: success ? "info" : "error",
      category: "audit",
      eventCode: success ? "command_executed" : "command_rejected",
      message: success ? "Komut yürütüldü" : "Komut reddedildi",
      context: {
        deviceId: job.deviceId,
        telemetryNames: job.telemetries.map((t) => t.name),
        atomic: job.atomic ?? false,
        ...(error !== undefined ? { error } : {}),
      },
    });
  }
}
