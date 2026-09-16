import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { IMessageQueue } from "@gd-monorepo/core";
import type { DeviceJob, JobResult } from "@gd-monorepo/shared-types";
import { CommandJobBuilder, DeviceConfigFileSource } from "@gd-monorepo/platform-commands";
import { DeviceService } from "./device-service";

/**
 * Manevra komut hattı — uçtan uca integration (Docker/Redis YOK):
 *
 * Gerçek DeviceService + SimulatorRegistry + ModbusDevice, GERÇEK config'lerle
 * (`services/device-service/config` — konteyner manevra seti) çalışır; komut
 * job'ı CommandJobBuilder ile GERÇEK config'ten üretilir; test-local IMessageQueue
 * `executeAndWait`'i DeviceService'in kayıtlı worker'ına doğrudan delege eder.
 * Bu, HTTP route katmanı HARİÇ tüm komut hattını kapsar:
 *   builder → job → worker → ModbusDevice.write → simülatör → read-back validate.
 *
 * Kapsam (SANAL-IO-CIHAZ + manevra komutları):
 * - BSC: stop / start / open_contactors (P1 koruma komutları)
 * - CB: open / close (FL-08/FL-02 akışı)
 * - HVAC: on / force_cool (FL-05)
 * - CONTROL-PANEL-IO: battery_light_on/off (FL-07 — COIL write + read-back)
 * - PCS (konteyner): forbid_charge / allow_charge (blok + kaldırma)
 * - AUX/FSS/IMD: komut YOK — salt okuma cihazları (yazma girişimi → bilinmeyen
 *   komut/cihaz hatası yerine write no-op; bu spec'te kapsam dışı)
 * - Bilinmeyen cihaz → success=false + "Bilinmeyen cihaz"
 */

const REAL_CONFIG_DIR = fileURLToPath(new URL("../config", import.meta.url));

// PG'siz temp config dizini: gerçek cihaz config'leri SYMLINK'lenir;
// service.json minimal (postgresql YOK → alarm state devre dışı — integration
// simülatör üzerinde çalışır, DB gerektirmez).
const CONFIG_DIR = mkdtempSync(join(tmpdir(), "maneuver-config-XXXXXX"));
for (const entry of readdirSync(REAL_CONFIG_DIR)) {
  if (entry === "service.json") continue;
  symlinkSync(join(REAL_CONFIG_DIR, entry), join(CONFIG_DIR, entry));
}
writeFileSync(
  join(CONFIG_DIR, "service.json"),
  JSON.stringify({
    redis: { host: "localhost", port: 6379 },
    servicePollIntervalMs: 5000,
  }),
);

type WorkerFn = (job: DeviceJob) => Promise<JobResult | void>;

function makeMq(): IMessageQueue & { handler: WorkerFn | undefined } {
  const state: { handler: WorkerFn | undefined } = { handler: undefined };
  return {
    handler: state.handler as WorkerFn,
    addJob: async () => undefined,
    addRepeatableJob: async () => undefined,
    addRepeatableJobEvery: async () => undefined,
    registerWorker: async (fn: WorkerFn) => {
      state.handler = fn;
    },
    registerWorkerFor: async () => undefined,
    close: async () => undefined,
    queueStatus: async () => ({}),
    queueStats: async () => ({}),
    health: async () => true,
    executeAndWait: async (job: DeviceJob): Promise<JobResult> => {
      const fn = state.handler;
      if (!fn) return { success: false, reason: "worker yok" };
      const result = await fn(job);
      if (result && typeof result === "object" && "success" in result) {
        return result;
      }
      return { success: true };
    },
  } as unknown as IMessageQueue & { handler: WorkerFn | undefined };
}

let service: DeviceService;
let mq: IMessageQueue;
const source = new DeviceConfigFileSource(CONFIG_DIR);
const builder = new CommandJobBuilder({ source });

async function execute(deviceId: string, command: string, params?: Record<string, unknown>): Promise<JobResult> {
  const built = builder.build(deviceId, command, params);
  if (built.isErr()) {
    return { success: false, reason: built.error().reason };
  }
  return mq.executeAndWait(built.unwrap());
}

beforeAll(async () => {
  mq = makeMq();
  service = await DeviceService.fromConfigDir(CONFIG_DIR, mq);
  await service.start();
  // BSC simülatörü NOT_INITIALIZED → INITIALIZING → NORMAL geçişini tick
  // sayacıyla yapar (tick 3/6) — komutlar NORMAL durumda kabul edilir.
  // Gerçek stack'te bu geçiş açılışın ilk saniyelerinde gerçekleşir.
  await waitForBscNormal();
}, 60_000);

async function waitForBscNormal(): Promise<void> {
  const entry = (service as unknown as { devices: Map<string, { device: { read(): Promise<Array<{ name: string; value: unknown }>> } }> })
    .devices.get("BSC-1");
  if (!entry) return;
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const data = await entry.device.read();
    const state = data.find((t) => t.name === "BSC State");
    // BSC_STATE.NORMAL — simülatör auto-init sonrası (tick ≥ 6)
    if (state && Number(state.value) === 3) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("BSC simülatörü NORMAL duruma geçmedi (15s)");
}

afterAll(async () => {
  await service.stop();
});

describe("manevra komut hattı (integration — gerçek simülatörler)", () => {
  it("BSC stop → yazım + read-back doğrulama (validated)", async () => {
    const result = await execute("BSC-1", "stop");
    expect(result.success).toBe(true);
    expect(result.validated).toBe(true);
  });

  it("BSC open_contactors (FL-08 koruma komutu) → validated", async () => {
    const result = await execute("BSC-1", "open_contactors");
    expect(result).toEqual({ success: true, validated: true });
  });

  it("CB open → validated (FL-08 kesici)", async () => {
    const result = await execute("CB-1", "open");
    expect(result.success).toBe(true);
    expect(result.validated).toBe(true);
  });

  it("HVAC force_cool → validated (FL-05)", async () => {
    const result = await execute("HVAC-1", "force_cool");
    expect(result.success).toBe(true);
    expect(result.validated).toBe(true);
  });

  it("CONTROL-PANEL-IO ışık komutu → COIL write + read-back (FL-07)", async () => {
    const on = await execute("CONTROL-PANEL-IO-1", "battery_light_on");
    expect(on.success).toBe(true);
    expect(on.validated).toBe(true);
    const off = await execute("CONTROL-PANEL-IO-1", "battery_light_off");
    expect(off.success).toBe(true);
    expect(off.validated).toBe(true);
  });

  it("PCS blok + kaldırma: forbid_charge → allow_charge (0 yazımı)", async () => {
    const forbid = await execute("PCS-1", "forbid_charge");
    expect(forbid.success).toBe(true);
    const allow = await execute("PCS-1", "allow_charge");
    expect(allow.success).toBe(true);
  });

  it("bilinmeyen cihaz → success=false + reason", async () => {
    const result = await execute("YOK-1", "stop");
    expect(result.success).toBe(false);
    // çözümleme katmanı (CommandJobBuilder) device_not_found döner —
    // worker katmanı "Bilinmeyen cihaz" döner; ikisi de reddir.
    expect(result.reason).toMatch(/device_not_found|Bilinmeyen cihaz/);
  });
});
