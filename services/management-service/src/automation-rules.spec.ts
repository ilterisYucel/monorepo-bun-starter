import { describe, it, expect, vi, beforeEach } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { TamperLogger } from "@gd-monorepo/tamper-logger";
import type { IMessageQueue } from "@gd-monorepo/core";
import type { DeviceConfigFile, DeviceJob, TelemetryData } from "@gd-monorepo/shared-types";
import { CommandJobBuilder } from "@gd-monorepo/platform-commands";
import { RuleConfigLoader } from "./rule-config-loader";
import { CycleSnapshotStore } from "./cycle-snapshot-store";
import { RuleEvaluator } from "./rule-evaluator";
import { ActionExecutor } from "./action-executor";

/**
 * Otomasyon kural zinciri — integration (K9; Docker/Redis YOK):
 *
 * GERÇEK rules.json + GERÇEK device config-docker ile telemetri → kural
 * ateşleme → ActionExecutor → CommandJobBuilder (GERÇEK config'ten job
 * üretimi) → test-local IMessageQueue'ya COMMAND_DEVICE job'ı + TamperLogger
 * audit zinciri. Kapı: KONTEYNER-MANEVRA-KATALOGU-REV03 K-A1/K-A2/K-A3
 * uçtan uca kanıtı.
 *
 * Zaman: RuleEvaluator + CycleSnapshotStore `now` enjeksiyonu ile debounce
 * deterministik ilerletilir (vi.useFakeTimers yerine kontrollü saat).
 */

const RULES_PATH = fileURLToPath(
  new URL("../../../deployment/dev/container/rules/rules.json", import.meta.url),
);
const DEVICE_CONFIG_DIR = fileURLToPath(
  new URL("../../../configs", import.meta.url),
);

/** Kök configs/ (source of truth) taraması — kanonik dosya adları alet adıdır;
 *  testler dosya adına değil deviceId/içeriğe bakar. */
function loadDeviceConfigs(dir: string): DeviceConfigFile[] {
  return readdirSync(dir)
    .filter((file) => file.endsWith(".json") && !file.startsWith("service."))
    .map((file) => JSON.parse(readFileSync(join(dir, file), "utf-8")) as DeviceConfigFile);
}

function configSourceFrom(configs: DeviceConfigFile[]) {
  const byId = new Map(configs.map((c) => [c.deviceId.toLowerCase(), c]));
  return { load: (deviceId: string) => byId.get(deviceId.toLowerCase()) };
}

interface DeviceCounts {
  cb: number;
  bsc: number;
  hvac: number;
}

interface Harness {
  evaluator: RuleEvaluator;
  executor: ActionExecutor;
  store: CycleSnapshotStore;
  jobs: DeviceJob[];
  log: ReturnType<typeof vi.fn>;
  advance: (ms: number) => void;
  fire: (deviceId: string, rows: TelemetryData[]) => Promise<void>;
  counts: DeviceCounts;
}

function countDevices(configs: DeviceConfigFile[]): DeviceCounts {
  return {
    cb: configs.filter((c) => c.deviceId.startsWith("CB-")).length,
    bsc: configs.filter((c) => c.deviceId.startsWith("BSC-")).length,
    hvac: configs.filter((c) => c.type === "hvac").length,
  };
}

let nowMs = 0;

function telemetry(deviceId: string, name: string, value: number): TelemetryData {
  return {
    deviceId,
    name,
    value,
    unit: "",
    timestamp: new Date(nowMs).toISOString(),
  };
}

function fakeLogger(): { logger: TamperLogger; log: ReturnType<typeof vi.fn> } {
  const log = vi.fn().mockResolvedValue(undefined);
  return { logger: { log } as unknown as TamperLogger, log };
}

function harness(): Harness {
  const loader = new RuleConfigLoader({
    rulesPath: RULES_PATH,
    deviceConfigDir: DEVICE_CONFIG_DIR,
  });
  const catalog = loader.loadCatalog();
  const configs = loadDeviceConfigs(DEVICE_CONFIG_DIR);
  const counts = countDevices(configs);
  const evaluator = new RuleEvaluator(catalog, { now: () => nowMs });
  const store = new CycleSnapshotStore({ maxAgeMs: 3600_000, now: () => nowMs });
  const builder = new CommandJobBuilder({
    source: configSourceFrom(configs),
  });
  const jobs: DeviceJob[] = [];
  const mq: IMessageQueue = {
    addJob: async () => undefined,
    executeAndWait: async (job: DeviceJob) => {
      jobs.push(job);
      return { success: true };
    },
    addRepeatableJob: async () => undefined,
    addRepeatableJobEvery: async () => undefined,
    registerWorker: async () => undefined,
    registerWorkerFor: async () => undefined,
    close: async () => undefined,
    queueStatus: async () => ({}),
    queueStats: async () => ({}),
    health: async () => true,
  };
  const { logger, log } = fakeLogger();
  const executor = new ActionExecutor({ builder, mq, logger });

  const advance = (ms: number): void => {
    nowMs += ms;
  };

  const fire = async (deviceId: string, rows: TelemetryData[]): Promise<void> => {
    store.record(deviceId, rows);
    const fired = evaluator.evaluate(loader.loadRules().rules, store.snapshot());
    for (const rule of fired) {
      await executor.execute(rule);
    }
  };

  return { evaluator, executor, store, jobs, log, advance, fire, counts };
}

describe("otomasyon kural zinciri (K9 — gerçek config'lerle)", () => {
  beforeEach(() => {
    nowMs = 1_000_000;
  });

  describe("FL-08 — DC kısa devre (DC-METER-1)", () => {
    it("V>1500 + debounce 1 sn → CB open + BSC open_contactors (tüm aktif cihazlar) + audit", async () => {
      const h = harness();

      await h.fire("DC-METER-1", [
        telemetry("DC-METER-1", "DC Voltage", 1600),
        telemetry("DC-METER-1", "DC Current", 100),
        telemetry("DC-METER-1", "DC Power", 75),
      ]);
      h.advance(1000);
      await h.fire("DC-METER-1", [
        telemetry("DC-METER-1", "DC Voltage", 1600),
        telemetry("DC-METER-1", "DC Current", 100),
        telemetry("DC-METER-1", "DC Power", 75),
      ]);

      // K-A10: job'lar GERÇEK config register yazımlarıdır. Beklenen adet,
      // kaynak config setindeki CB/BSC cihaz sayısından türetilir (generic).
      const cbJobs = h.jobs.filter((j) => j.deviceId.startsWith("CB-"));
      const bscJobs = h.jobs.filter((j) => j.deviceId.startsWith("BSC-"));
      expect(cbJobs).toHaveLength(h.counts.cb);
      expect(
        cbJobs.every(
          (j) => j.telemetries[0]?.name === "Open" && j.telemetries[0]?.value === 1,
        ),
      ).toBe(true);
      expect(bscJobs).toHaveLength(h.counts.bsc);
      expect(bscJobs.every((j) => j.telemetries[0]?.value === 4)).toBe(true);
      // Audit zinciri: auto_rule_fired + aksiyon ok'ları
      expect(h.log).toHaveBeenCalledWith(
        expect.objectContaining({ eventCode: "auto_rule_fired" }),
      );
      expect(h.log).toHaveBeenCalledWith(
        expect.objectContaining({ eventCode: "auto_rule_action_ok" }),
      );
      expect(h.log).toHaveBeenCalledWith(
        expect.objectContaining({ eventCode: "auto_rule_fl08_scf" }),
      );
    });
  });

  describe("FL-02 — AUX kaybı (PM5340-1)", () => {
    it("Voltage L-N Avg < 180 + debounce 5 sn → şalter AÇ + kontaktör AÇ (tüm aktif cihazlar)", async () => {
      const h = harness();

      await h.fire("PM5340-1", [
        telemetry("PM5340-1", "Voltage L-N Avg", 170),
      ]);
      h.advance(5000);
      await h.fire("PM5340-1", [
        telemetry("PM5340-1", "Voltage L-N Avg", 170),
      ]);

      const cbJobs = h.jobs.filter((j) => j.deviceId.startsWith("CB-"));
      const bscJobs = h.jobs.filter((j) => j.deviceId.startsWith("BSC-"));
      expect(cbJobs).toHaveLength(h.counts.cb);
      expect(bscJobs).toHaveLength(h.counts.bsc);
      expect(bscJobs.every((j) => j.telemetries[0]!.value === 4)).toBe(true);
    });
  });

  describe("FL-05 koruma — aşırı sıcak", () => {
    it("Max Pack Temp > 50 + debounce 5 dk → tüm HVAC force_cool + tüm BSC stop", async () => {
      const h = harness();

      await h.fire("BSC-1", [telemetry("BSC-1", "Max Pack Temp", 51)]);
      h.advance(300000);
      await h.fire("BSC-1", [telemetry("BSC-1", "Max Pack Temp", 51)]);

      const cool = h.jobs.filter((j) =>
        j.telemetries.some((t) => t.name === "Cooling Setpoint"),
      );
      expect(cool).toHaveLength(h.counts.hvac);
      const stops = h.jobs.filter(
        (j) => j.deviceId.startsWith("BSC-") && j.telemetries[0]!.value === 3,
      );
      expect(stops).toHaveLength(h.counts.bsc);
    });
  });

  describe("FL-05 normal — HVAC hysteresis", () => {
    it("HVAC-1 25.2°C → force_cool job'ı GERÇEK config'ten üretilir", async () => {
      const h = harness();

      // Hysteresis bandının altından başla (24°C: heat_off kenarı tüketilir).
      await h.fire("HVAC-1", [telemetry("HVAC-1", "Current Temp", 24)]);
      h.jobs.length = 0;
      await h.fire("HVAC-1", [telemetry("HVAC-1", "Current Temp", 25.2)]);

      const cool = h.jobs.find((j) =>
        j.telemetries.some((t) => t.name === "Cooling Setpoint"),
      );
      expect(cool).toBeDefined();
      // GERÇEK config sözleşmesi: Remote On/Off ← 1 + Cooling Setpoint ← 10
      const byName = Object.fromEntries(
        cool!.telemetries.map((t) => [t.name, t.value]),
      );
      expect(byName["Remote On/Off"]).toBe(1);
      expect(byName["Cooling Setpoint"]).toBe(10);
    });
  });

  describe("FL-07 — kapı DI (control-panel-io)", () => {
    it("Battery Door Open 1 → ışık AÇ + tüm BSC stop", async () => {
      const h = harness();

      await h.fire("CONTROL-PANEL-IO-1", [
        telemetry("CONTROL-PANEL-IO-1", "Battery Door Open", 1),
      ]);

      const io = h.jobs.find((j) => j.deviceId === "CONTROL-PANEL-IO-1");
      expect(io?.telemetries[0]).toEqual(
        expect.objectContaining({ name: "Battery Room Light", value: true }),
      );
      const stops = h.jobs.filter((j) => j.deviceId.startsWith("BSC-"));
      expect(stops).toHaveLength(h.counts.bsc);
      expect(stops.every((j) => j.telemetries[0]!.value === 3)).toBe(true);
    });

    it("kenar-tetik: kapı kapalıyken KAPATMA kuralı ateşler (ışık söner)", async () => {
      const h = harness();

      await h.fire("CONTROL-PANEL-IO-1", [
        telemetry("CONTROL-PANEL-IO-1", "Battery Door Open", 0),
      ]);

      expect(h.jobs).toHaveLength(1);
      expect(h.jobs[0]!.deviceId).toBe("CONTROL-PANEL-IO-1");
      expect(h.jobs[0]!.telemetries[0]).toEqual(
        expect.objectContaining({ name: "Battery Room Light", value: false }),
      );
    });
  });

  describe("FL-11 — toprak direnci (IMD-1)", () => {
    it("Insulation Alarm 4 + debounce 2 sn → CB open + kontaktör AÇ (tüm aktif cihazlar)", async () => {
      const h = harness();

      await h.fire("IMD-1", [telemetry("IMD-1", "Insulation Alarm", 4)]);
      h.advance(2000);
      await h.fire("IMD-1", [telemetry("IMD-1", "Insulation Alarm", 4)]);

      const cbJobs = h.jobs.filter((j) => j.deviceId.startsWith("CB-"));
      const bscJobs = h.jobs.filter((j) => j.deviceId.startsWith("BSC-"));
      expect(cbJobs).toHaveLength(h.counts.cb);
      expect(bscJobs).toHaveLength(h.counts.bsc);
    });
  });

  describe("fail-safe (K-A4)", () => {
    it("FL-06/09/12 senaryosu kural üretmez — job listesi boş", async () => {
      const h = harness();

      await h.fire("BSC-1", [telemetry("BSC-1", "BSC State", 9)]);

      expect(h.jobs).toHaveLength(0);
    });
  });
});
