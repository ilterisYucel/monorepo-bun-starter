import type { IMessageQueue } from "@gd-monorepo/core";
import type {
  PluginContext,
  PluginContextFactory,
  PluginRegistry,
} from "@gd-monorepo/plugin-sdk";
import type { FetchExternalJob, FetchWindow, IIntegrationPlugin } from "@gd-monorepo/shared-types";
import { ExternalSeriesWriter } from "./external-series-writer";

const DEFAULT_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Entegrasyon servisi core'u.
 *
 * Sorumluluklar:
 * - pluginleri aktive etme (per-plugin context ile)
 * - plugin schedule() bildirimlerini BullMQ repeatable job'a cevirme
 * - FETCH_EXTERNAL job'larini isleme: fetch → validate → TimescaleDB yazim
 *
 * Pluginler zamanlamayi sahiplenmez — declare eder, loop burada calisir.
 */
export class IntegrationService {
  private running: boolean;
  private readonly plugins = new Map<string, IIntegrationPlugin<PluginContext>>();
  private readonly contexts = new Map<string, PluginContext>();

  constructor(
    private readonly registry: PluginRegistry<PluginContext>,
    private readonly contextFactory: PluginContextFactory,
    private readonly mq: IMessageQueue,
    private readonly writer: ExternalSeriesWriter,
  ) {
    this.running = false;
  }

  /** Komut — servisi baslatir: activate → zamanlama → worker. */
  async start(): Promise<void> {
    this.running = true;

    const registrations = this.registry.registrations();
    const activationResults = await Promise.allSettled(
      registrations.map(async (registration) => {
        const manifest = registration.plugin.manifest();
        if (manifest.kind !== "integration") {
          console.warn(
            `[IntegrationService] "${manifest.name}" atlandi (kind: ${manifest.kind})`,
          );
          return;
        }
        const context = await this.contextFactory.create(
          manifest.name,
          registration.dir ?? process.cwd(),
        );
        await registration.plugin.activate(context);
        // ELEGANT-EXCEPTION: tek tip sinir noktasi — kind veri olarak dogrulanir,
        // cast calisma zamaninda tip denetimi (instanceof) degildir.
        this.plugins.set(
          manifest.name,
          registration.plugin as IIntegrationPlugin<PluginContext>,
        );
        this.contexts.set(manifest.name, context);
      }),
    );
    for (const result of activationResults) {
      if (result.status === "rejected") {
        console.warn(`[IntegrationService] Plugin aktive edilemedi: ${String(result.reason)}`);
      }
    }

    const scheduleResults = await Promise.allSettled(
      Array.from(this.plugins.entries()).map(async ([name, plugin]) => {
        const spec = plugin.schedule();
        const job: FetchExternalJob = {
          jobId: `integration-fetch-${name}`,
          type: "FETCH_EXTERNAL",
          // BaseJob zorunlu alani — queue'da pluginName olarak kullanilir
          deviceId: name,
          pluginName: name,
          timestamp: new Date().toISOString(),
        };
        if (spec.mode === "interval") {
          const everyMs = spec.everyMs ?? DEFAULT_INTERVAL_MS;
          const startDate = spec.startDate ? new Date(spec.startDate) : undefined;
          await this.mq.addRepeatableJobEvery(
            `integration-fetch:${name}`,
            job,
            everyMs,
            startDate,
          );
          console.log(`[IntegrationService] "${name}" her ${everyMs}ms'de planlandi`);
        } else if (spec.mode === "cron") {
          if (!spec.cron) {
            throw new Error(`[IntegrationService] "${name}" cron mode'da ama cron pattern yok`);
          }
          await this.mq.addRepeatableJob(`integration-fetch:${name}`, job, spec.cron);
          console.log(`[IntegrationService] "${name}" cron ile planlandi: ${spec.cron}`);
        } else {
          console.log(`[IntegrationService] "${name}" manuel modda — zamanlama kaydedilmedi`);
        }
      }),
    );
    for (const result of scheduleResults) {
      if (result.status === "rejected") {
        console.warn(`[IntegrationService] Zamanlama basarisiz: ${String(result.reason)}`);
      }
    }

    await this.mq.registerWorkerFor(
      "FETCH_EXTERNAL",
      async (job) => {
        if (job.type === "FETCH_EXTERNAL") {
          await this.handleFetchJob(job);
        }
      },
      { concurrency: 2 },
    );

    console.log(
      `[IntegrationService] ${this.plugins.size} plugin baslatildi`,
    );
  }

  private async handleFetchJob(job: FetchExternalJob): Promise<void> {
    if (!this.running) {
      return;
    }
    const plugin = this.plugins.get(job.pluginName);
    const context = this.contexts.get(job.pluginName);
    if (!plugin || !context) {
      console.warn(
        `[IntegrationService] Bilinmeyen plugin isi: ${job.pluginName}`,
      );
      return;
    }

    const points = await plugin.fetch(context, job.window);
    await this.writer.write(points);
    console.log(
      `[IntegrationService] ${job.pluginName}: ${points.length} nokta yazildi`,
    );
  }

  /** Sorgu — manuel/backfill calistirma, yazilan nokta sayisini dondurur. */
  async runPlugin(pluginName: string, window?: FetchWindow): Promise<number> {
    const plugin = this.plugins.get(pluginName);
    const context = this.contexts.get(pluginName);
    if (!plugin || !context) {
      throw new Error(`[IntegrationService] Plugin bulunamadi: ${pluginName}`);
    }
    const points = await plugin.fetch(context, window);
    await this.writer.write(points);
    return points.length;
  }

  /** Komut — servisi durdurur. */
  async stop(): Promise<void> {
    this.running = false;
    await this.registry.deactivateAll();
    this.plugins.clear();
    this.contexts.clear();
    await this.mq.close();
    await this.writer.close();
    console.log("[IntegrationService] Durduruldu");
  }

  /** Sorgu — servis saglik durumu. */
  async health(): Promise<boolean> {
    if (!this.running) {
      return false;
    }
    try {
      const [mqOk, writerOk] = await Promise.all([
        this.mq.health(),
        this.writer.health(),
      ]);
      return mqOk && writerOk;
    } catch {
      console.warn("[IntegrationService] Health check failed");
      return false;
    }
  }
}
