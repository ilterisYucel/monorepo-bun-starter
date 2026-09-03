import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { DeviceJob, JobResult, JobType } from "@gd-monorepo/shared-types";
import type { IMessageQueue, QueueStatus, WorkerOptions } from "@gd-monorepo/core";
import type {
  IPlugin,
  PluginConfigSource,
  PluginContext,
} from "@gd-monorepo/plugin-sdk";
import {
  PluginContextFactory,
  PluginRegistry,
} from "@gd-monorepo/plugin-sdk";
import type { FetchWindow, IIntegrationPlugin, MarketDataPoint } from "@gd-monorepo/shared-types";
import { IntegrationService } from "./integration-service";
import { ExternalSeriesWriter } from "./external-series-writer";

// ---------------------------------------------------------------- fake queue

class FakeQueue implements IMessageQueue {
  workers = new Map<string, (job: DeviceJob) => Promise<unknown>>();
  repeatableEvery: Array<{ name: string; job: DeviceJob; everyMs: number }> = [];
  repeatableCron: Array<{ name: string; job: DeviceJob; pattern: string }> = [];
  closed = false;

  async addJob(_job: DeviceJob, _opts?: { delay?: number }): Promise<void> {}
  async executeAndWait(_job: DeviceJob, _timeoutMs: number): Promise<JobResult> {
    return { success: true };
  }
  async addRepeatableJob(name: string, job: DeviceJob, pattern: string): Promise<void> {
    this.repeatableCron.push({ name, job, pattern });
  }
  async addRepeatableJobEvery(
    name: string,
    job: DeviceJob,
    everyMs: number,
    _startDate?: Date,
  ): Promise<void> {
    this.repeatableEvery.push({ name, job, everyMs });
  }
  async registerWorker(
    _processor: (job: DeviceJob) => Promise<unknown>,
    _options?: WorkerOptions,
  ): Promise<void> {}
  async registerWorkerFor(
    type: JobType,
    processor: (job: DeviceJob) => Promise<unknown>,
    _options?: WorkerOptions,
  ): Promise<void> {
    this.workers.set(type, processor);
  }
  async close(): Promise<void> {
    this.closed = true;
  }
  async queueStatus(): Promise<QueueStatus[]> {
    return [];
  }
  async queueStats(_type: JobType): Promise<QueueStatus | null> {
    return null;
  }
  async health(): Promise<boolean> {
    return true;
  }
}

// ---------------------------------------------------------------- fake writer

class FakeWriter {
  written: MarketDataPoint[][] = [];
  closed = false;

  async write(points: MarketDataPoint[]): Promise<void> {
    this.written.push(points);
  }
  async close(): Promise<void> {
    this.closed = true;
  }
  async health(): Promise<boolean> {
    return true;
  }
}

// ---------------------------------------------------------------- helpers

class MapConfigSource implements PluginConfigSource {
  constructor(private readonly values: Record<string, Record<string, unknown>> = {}) {}

  async raw(pluginName: string): Promise<Record<string, unknown>> {
    return this.values[pluginName] ?? {};
  }
}

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.allSettled(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
});

async function makeStateDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "integration-service-test-"));
  tempDirs.push(dir);
  return dir;
}

const POINTS: MarketDataPoint[] = [
  {
    source: "epias",
    series: "MCP",
    timestamp: "2026-08-14T10:00:00.000Z",
    value: 1900.5,
    unit: "TRY/MWh",
  },
];

function makeIntegrationPlugin(
  name: string,
  options?: {
    kind?: string;
    mode?: "cron" | "interval" | "manual";
    everyMs?: number;
    fetched?: (window?: FetchWindow) => MarketDataPoint[];
  },
): IIntegrationPlugin<PluginContext> {
  const manifest = {
    name,
    version: "1.0.0",
    kind: (options?.kind ?? "integration") as "integration" | "management" | "custom",
    sdkVersion: ">=1.0.0 <2.0.0",
    description: "test",
  };
  return {
    manifest: () => manifest,
    activate: async () => {},
    deactivate: async () => {},
    health: () => ({ status: "healthy" as const }),
    schedule: () => ({
      mode: options?.mode ?? "interval",
      everyMs: options?.everyMs,
      cron: options?.mode === "cron" ? "0 * * * *" : undefined,
    }),
    fetch: async (_ctx: PluginContext, window?: FetchWindow) =>
      options?.fetched ? options.fetched(window) : POINTS,
  };
}

async function makeService(options?: {
  plugins?: Array<IIntegrationPlugin<PluginContext>>;
  configs?: Record<string, Record<string, unknown>>;
}): Promise<{
  service: IntegrationService;
  queue: FakeQueue;
  writer: FakeWriter;
  stateDir: string;
}> {
  const queue = new FakeQueue();
  const writer = new FakeWriter();
  const registry = new PluginRegistry<PluginContext>();
  for (const plugin of options?.plugins ?? []) {
    registry.register(plugin as IPlugin, `static:${plugin.manifest().name}`);
  }
  const stateDir = await makeStateDir();
  const contextFactory = new PluginContextFactory(
    new MapConfigSource(options?.configs),
    stateDir,
  );
  const service = new IntegrationService(
    registry,
    contextFactory,
    queue,
    writer as unknown as ExternalSeriesWriter,
  );
  return { service, queue, writer, stateDir };
}

// ---------------------------------------------------------------- tests

describe("IntegrationService", () => {
  it("start — integration pluginlerini aktive eder ve interval job planlar", async () => {
    const { service, queue } = await makeService({
      plugins: [makeIntegrationPlugin("epias", { everyMs: 5000 })],
    });

    await service.start();

    expect(queue.repeatableEvery).toHaveLength(1);
    expect(queue.repeatableEvery[0]?.everyMs).toBe(5000);
    const job = queue.repeatableEvery[0]!.job;
    if (job.type === "FETCH_EXTERNAL") {
      expect(job.pluginName).toBe("epias");
    } else {
      throw new Error("FETCH_EXTERNAL job bekleniyordu");
    }
    expect(queue.workers.has("FETCH_EXTERNAL")).toBe(true);
  });

  it("start — integration olmayan pluginleri atlar", async () => {
    const { service, queue } = await makeService({
      plugins: [
        makeIntegrationPlugin("epias"),
        makeIntegrationPlugin("management-trigger", { kind: "management" }),
      ],
    });

    await service.start();

    expect(queue.repeatableEvery).toHaveLength(1);
    expect(queue.repeatableEvery[0]?.job).toMatchObject({ pluginName: "epias" });
  });

  it("start — cron mode'da cron job planlar", async () => {
    const { service, queue } = await makeService({
      plugins: [makeIntegrationPlugin("epias", { mode: "cron" })],
    });

    await service.start();

    expect(queue.repeatableCron).toHaveLength(1);
    expect(queue.repeatableCron[0]?.pattern).toBe("0 * * * *");
  });

  it("start — manual mode'da zamanlama kaydetmez", async () => {
    const { service, queue } = await makeService({
      plugins: [makeIntegrationPlugin("epias", { mode: "manual" })],
    });

    await service.start();

    expect(queue.repeatableEvery).toHaveLength(0);
    expect(queue.repeatableCron).toHaveLength(0);
  });

  it("worker isi — fetch eder ve yazar", async () => {
    const fetched: FetchWindow[] = [];
    const { service, queue, writer } = await makeService({
      plugins: [
        makeIntegrationPlugin("epias", {
          fetched: (window) => {
            fetched.push(window ?? {});
            return POINTS;
          },
        }),
      ],
    });
    await service.start();

    const processor = queue.workers.get("FETCH_EXTERNAL")!;
    await processor({
      jobId: "integration-fetch-epias",
      type: "FETCH_EXTERNAL",
      deviceId: "epias",
      pluginName: "epias",
      timestamp: "2026-08-14T10:00:00.000Z",
      window: { from: "2026-08-14T00:00:00Z" },
    });

    expect(fetched).toHaveLength(1);
    expect(fetched[0]).toEqual({ from: "2026-08-14T00:00:00Z" });
    expect(writer.written).toEqual([POINTS]);
  });

  it("runPlugin — manuel calistirir ve yazilan sayiyi dondurur", async () => {
    const { service, writer } = await makeService({
      plugins: [makeIntegrationPlugin("epias")],
    });
    await service.start();

    const count = await service.runPlugin("epias", {
      from: "2026-08-14T00:00:00Z",
      to: "2026-08-14T23:59:59Z",
    });

    expect(count).toBe(1);
    expect(writer.written).toHaveLength(1);
  });

  it("runPlugin — bilinmeyen pluginde firlatir", async () => {
    const { service } = await makeService();
    await service.start();

    await expect(service.runPlugin("yok")).rejects.toThrow(/bulunamadi/i);
  });

  it("stop — pluginleri deactivate eder ve kaynaklari kapatir", async () => {
    const { service, queue, writer } = await makeService({
      plugins: [makeIntegrationPlugin("epias")],
    });
    await service.start();

    await service.stop();

    expect(queue.closed).toBe(true);
    expect(writer.closed).toBe(true);
    expect(await service.health()).toBe(false);
  });

  it("2026-08-30 (T3): worker — bilinmeyen plugin job'ı YOK SAYILIR (kademeli bozulma)", async () => {
    const { service, queue, writer } = await makeService();
    await service.start();

    const processor = queue.workers.get("FETCH_EXTERNAL")!;
    await processor({
      jobId: "x",
      type: "FETCH_EXTERNAL",
      deviceId: "yok",
      pluginName: "bilinmeyen",
      timestamp: "t",
      window: { from: "f" },
    });

    expect(writer.written).toHaveLength(0);
  });

  it("2026-08-30 (T3): worker — plugin fetch HATASI job'ı düşürür, yazım YAPILMAZ (hata akışı yukarı fırlar)", async () => {
    const { service, queue, writer } = await makeService({
      plugins: [
        makeIntegrationPlugin("epias", {
          fetched: () => {
            throw new Error("network down");
          },
        }),
      ],
    });
    await service.start();

    const processor = queue.workers.get("FETCH_EXTERNAL")!;
    await expect(
      processor({
        jobId: "x",
        type: "FETCH_EXTERNAL",
        deviceId: "epias",
        pluginName: "epias",
        timestamp: "t",
        window: { from: "f" },
      }),
    ).rejects.toThrow("network down");
    expect(writer.written).toHaveLength(0);
  });

  it("2026-08-30 (T3): worker — boş fetch sonucu BOŞ listeyle yazıma gider (writer no-op'tur)", async () => {
    const { service, queue, writer } = await makeService({
      plugins: [
        makeIntegrationPlugin("epias", { fetched: () => [] }),
      ],
    });
    await service.start();

    const processor = queue.workers.get("FETCH_EXTERNAL")!;
    await processor({
      jobId: "x",
      type: "FETCH_EXTERNAL",
      deviceId: "epias",
      pluginName: "epias",
      timestamp: "t",
      window: { from: "f" },
    });

    // Mevcut davranış: write() her zaman çağrılır; boş listede writer
    // no-op yapar (bkz. external-series-writer.test.ts "boş liste").
    expect(writer.written).toHaveLength(1);
    expect(writer.written[0]).toEqual([]);
  });

  it("2026-08-30 (T3): runPlugin — fetch hatası çağırana fırlar (yutulmaz)", async () => {
    const { service } = await makeService({
      plugins: [
        makeIntegrationPlugin("epias", {
          fetched: () => {
            throw new Error("api down");
          },
        }),
      ],
    });
    await service.start();

    await expect(service.runPlugin("epias")).rejects.toThrow("api down");
  });
});
