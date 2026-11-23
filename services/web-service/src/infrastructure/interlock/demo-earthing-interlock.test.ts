import { describe, it, expect, vi } from "vitest";
import type { ManeuverRecord, TelemetryData } from "@gd-monorepo/shared-types";
import type { ITimeseriesDatabase } from "@gd-monorepo/core";
import {
  ManeuverRegistry,
  OperationExecutor,
  type CommandStepResult,
  type ICommandChannel,
  type IOperationRunStore,
  type ResolvedCommandStep,
} from "@gd-monorepo/platform-commands";
import { DemoEarthingInterlock } from "./demo-earthing-interlock";

/**
 * I-1 toprak interlock entegrasyonu (SPEC UC-10/T-29, AK-10.2/AK-10.3):
 * gerçek DemoEarthingInterlock + gerçek OperationExecutor; toprak KAPALI iken
 * şarj reddedilir, AÇIK iken yürütülür. Telemetri kaynağı test double'dır.
 */

const CHARGE: ManeuverRecord = {
  name: "pcs_charge",
  label: "PCS Şarj",
  mode: "parallel",
  steps: [{ deviceTypes: ["pcs"], command: "charge" }],
};

const STOP: ManeuverRecord = {
  name: "pcs_stop",
  label: "PCS Durdur",
  mode: "parallel",
  steps: [{ deviceTypes: ["pcs"], command: "stop" }],
};

function t(name: string, value: unknown): TelemetryData {
  return {
    deviceId: "DEMO-MV-1",
    name,
    description: name,
    value: value as never,
    unit: "",
    timestamp: "2026-10-07T12:00:00.000Z",
  };
}

function build(rows: TelemetryData[] | Error) {
  const timescale = {
    getLatestN: vi.fn(async () => {
      if (rows instanceof Error) throw rows;
      return rows;
    }),
  } as unknown as ITimeseriesDatabase;
  const interlock = new DemoEarthingInterlock(timescale, {
    mvDeviceId: "DEMO-MV-1",
    earthingTelemetry: ["H04 Earth", "H05 Earth"],
  });
  const executed: ResolvedCommandStep[] = [];
  const channel = {
    execute: vi.fn(async (s: ResolvedCommandStep): Promise<CommandStepResult> => {
      executed.push(s);
      return { deviceId: s.deviceId, command: s.command, success: true };
    }),
    schedule: vi.fn(async () => undefined),
  } as unknown as ICommandChannel;
  const executor = new OperationExecutor({
    registry: new ManeuverRegistry({ maneuvers: [CHARGE, STOP] }),
    targets: {
      resolveAvailable: async () => ["PCS-1", "PCS-2"],
      filterAvailable: async (ids: string[]) => ids,
    },
    channel,
    runs: {
      begin: vi.fn(async () => undefined),
      finish: vi.fn(async () => undefined),
    } as unknown as IOperationRunStore,
    preconditions: interlock.hook(),
    logger: { log: vi.fn(async () => undefined) } as never,
    now: () => new Date("2026-10-07T12:00:00.000Z"),
    generateId: () => "run-i1",
  });
  return { executor, executed };
}

describe("DemoEarthingInterlock + OperationExecutor (UC-10)", () => {
  it("AK-10.2: H05 toprak kapalı → charge reddedilir (interlock_earthed)", async () => {
    const h = build([t("H05 Earth", true)]);
    const result = await h.executor.execute("maneuver", "pcs_charge");
    expect(result.status).toBe("rejected");
    expect(result.reason).toBe("interlock_earthed");
    expect(h.executed).toHaveLength(0);
  });

  it("AK-10.3: toprak açık → charge completed", async () => {
    const h = build([t("H05 Earth", false), t("H04 Earth", false)]);
    const result = await h.executor.execute("maneuver", "pcs_charge");
    expect(result.status).toBe("completed");
    expect(h.executed).toHaveLength(2);
  });

  it("toprak kapalı ama adım şarj/deşarj değil → izin (stop)", async () => {
    const h = build([t("H05 Earth", true)]);
    const result = await h.executor.execute("maneuver", "pcs_stop");
    expect(result.status).toBe("completed");
  });

  it("MV telemetrisi okunamazsa nötr (izin) — kademeli", async () => {
    const h = build(new Error("cihaz yok"));
    const result = await h.executor.execute("maneuver", "pcs_charge");
    expect(result.status).toBe("completed");
  });
});
