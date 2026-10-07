import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import type { ManeuverRecord } from "@gd-monorepo/shared-types";
import {
  ManeuverRegistry,
  OperationExecutor,
  type CommandStepResult,
  type ICommandChannel,
  type IOperationRunStore,
  type OperationRunDraft,
  type ResolvedCommandStep,
} from "@gd-monorepo/platform-commands";

/**
 * Z katmanı (zincir entegrasyon) — UC-7/T-30, FR-7.4.
 *
 * Gerçek demo FL config'i (`deployment/dev/field/maneuvers/maneuvers.json`)
 * yüklenir; ManeuverRegistry → OperationExecutor → kanal zinciri uçtan uca
 * çalıştırılır. Kanal/hedef/depo test double'dır (harici IO yok); kanıt:
 * FL-01…FL-05 her biri beklenen komutu çözer ve run terminal duruma ulaşır.
 */

const configUrl = new URL(
  "../../../../../deployment/dev/field/maneuvers/maneuvers.json",
  import.meta.url,
);
const { maneuvers } = JSON.parse(readFileSync(configUrl, "utf8")) as {
  maneuvers: ManeuverRecord[];
};

function buildHarness() {
  const registry = new ManeuverRegistry({ maneuvers });
  const executed: ResolvedCommandStep[] = [];
  const channel = {
    execute: vi.fn(async (step: ResolvedCommandStep): Promise<CommandStepResult> => {
      executed.push(step);
      return { deviceId: step.deviceId, command: step.command, success: true };
    }),
    schedule: vi.fn(async () => undefined),
  } as unknown as ICommandChannel;
  const finished: Array<{ id: string; status: string }> = [];
  const runs = {
    begin: vi.fn(async (_run: OperationRunDraft) => undefined),
    finish: vi.fn(async (id: string, status: string) => {
      finished.push({ id, status });
    }),
  } as unknown as IOperationRunStore;
  const executor = new OperationExecutor({
    registry,
    targets: {
      resolveAvailable: async () => ["PCS-1", "PCS-2"],
      filterAvailable: async (ids: string[]) => ids,
    },
    channel,
    runs,
    logger: { log: vi.fn(async () => undefined) } as never,
    now: () => new Date("2026-10-07T12:00:00.000Z"),
    generateId: () => "run-fl",
  });
  return { executor, executed, finished };
}

const FL_CASES: Array<{ name: string; commands: string[] }> = [
  { name: "fl01_startup", commands: ["start", "start"] },
  { name: "fl01_shutdown", commands: ["stop", "stop"] },
  { name: "fl03_idle", commands: ["set_power_zero", "set_power_zero"] },
  { name: "fl04_calibration", commands: ["standby", "standby"] },
  {
    name: "fl05_emergency_stop",
    commands: ["stop", "set_power_zero", "stop", "set_power_zero"],
  },
];

describe("demo-maneuver-integration.spec — FL-01…FL-05 zinciri (Z)", () => {
  it("config FL-01…FL-05 kayıtlarını taşır", () => {
    const names = maneuvers.map((m) => m.name);
    for (const c of FL_CASES) expect(names).toContain(c.name);
  });

  for (const c of FL_CASES) {
    it(`${c.name}: beklenen komutları çözer ve completed olur`, async () => {
      const h = buildHarness();
      const result = await h.executor.execute("maneuver", c.name);

      expect(result.status).toBe("completed");
      expect(h.finished).toEqual([{ id: "run-fl", status: "completed" }]);
      const got = h.executed.map((s) => s.command).sort();
      expect(got).toEqual([...c.commands].sort());
      expect(h.executed.every((s) => s.deviceId === "PCS-1" || s.deviceId === "PCS-2")).toBe(true);
    });
  }
});
