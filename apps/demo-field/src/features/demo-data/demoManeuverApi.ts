import type {
  ManeuverRecord,
  OperationRecord,
  OperationRunRecord,
} from "@gd-monorepo/shared-types";
import type {
  DemoActiveRun,
  DemoExecutePayload,
  DemoManeuverInput,
  DemoManeuverItem,
} from "@gd-monorepo/ui";
import { demoApi } from "./demoApi";

/**
 * Demo manevra kataloğu istemcisi (SPEC UC-5/T-21, FR-5.1).
 * Sunucudan `GET /api/maneuvers|operations` çekilir; yalnızca `demo_*` kayıtlar
 * gösterilir (mevcut katalog DEĞİŞMEZ — K8). Tüm sanal üniteler tek gerçek
 * cihaz setine indirgenir (K6).
 */

/** Sanal ünite kapsamı → gerçek cihaz kimlikleri (tekilleştirilmiş). */
export function scopeToDeviceIds(_scope: number[]): string[] {
  // Tüm sanal üniteler aynı gerçek konteynerin PCS'lerini paylaşır.
  return ["PCS-1", "PCS-2"];
}

/**
 * Sihirbazda gösterilen demo kayıtları (mevcut `field_charge` vb. gizlenir).
 * FL-01…FL-05 kayıtları demo manevralarıyla birlikte listelenir (UC-7, FR-7.1).
 */
export const DEMO_CATALOG_NAMES = [
  "fl01_startup",
  "fl01_shutdown",
  "fl03_idle",
  "fl04_calibration",
  "fl05_emergency_stop",
  "charge",
  "discharge",
  "full_charge",
  "full_discharge",
  "calibration",
  "standby",
] as const;

function mapInput(raw: Record<string, unknown>): DemoManeuverInput | undefined {
  const name = raw.name;
  if (typeof name !== "string") return undefined;
  const type = raw.type === "string" || raw.type === "boolean" ? raw.type : "number";
  return {
    name,
    ...(typeof raw.label === "string" ? { label: raw.label } : {}),
    type,
    ...(typeof raw.min === "number" ? { min: raw.min } : {}),
    ...(typeof raw.max === "number" ? { max: raw.max } : {}),
    ...(typeof raw.step === "number" ? { step: raw.step } : {}),
    ...(raw.default !== undefined ? { default: raw.default as number | string | boolean } : {}),
  };
}

function toItem(
  rec: ManeuverRecord | OperationRecord,
  kind: "maneuver" | "operation",
): DemoManeuverItem {
  const ui = rec.ui;
  return {
    name: rec.name,
    label: rec.label,
    ...(rec.description ? { description: rec.description } : {}),
    kind,
    inputs: (ui?.inputs ?? [])
      .map(mapInput)
      .filter((i): i is DemoManeuverInput => i !== undefined),
    timer: ui?.timer === true,
    hidden: ui?.hidden === true,
  };
}

export const demoManeuverApi = {
  /** Demo katalog: allowlist isimleri + hidden olmayan kayıtlar. */
  listDemoCatalog: async (signal?: AbortSignal): Promise<DemoManeuverItem[]> => {
    const allowed = new Set<string>(DEMO_CATALOG_NAMES);
    const [maneuvers, operations] = await Promise.all([
      demoApi.listManeuvers(signal),
      demoApi.listOperations(signal),
    ]);
    const pick = <T extends { name: string }>(recs: T[]): T[] =>
      recs.filter((r) => allowed.has(r.name));
    return [
      ...pick(maneuvers).map((m) => toItem(m, "maneuver")),
      ...pick(operations).map((o) => toItem(o, "operation")),
    ];
  },

  /** Katalog kaydını yürütür (kapsam → deviceIds). */
  execute: async (payload: DemoExecutePayload): Promise<void> => {
    const body = {
      params: payload.params,
      deviceIds: scopeToDeviceIds(payload.scope),
      ...(payload.timer ? { timer: payload.timer } : {}),
    };
    if (payload.kind === "maneuver") {
      await demoApi.executeManeuver(payload.name, body);
    } else {
      await demoApi.executeOperation(payload.name, body);
    }
  },

  /** En son çalışan run'ı aktif manevra olarak döner. */
  activeRun: async (signal?: AbortSignal): Promise<DemoActiveRun | undefined> => {
    const runs = await demoApi.listRuns(signal);
    const active = runs.find((r) => r.status === "running") ?? runs[0];
    if (!active) return undefined;
    return runToActive(active);
  },

  /** Aktif manevrayı durdurur — `standby` operasyonu (FR-5.6). */
  stop: async (): Promise<void> => {
    await demoApi.executeOperation("standby", {});
  },
};

function runToActive(run: OperationRunRecord): DemoActiveRun {
  const raw = run.steps;
  const steps = Array.isArray(raw)
    ? raw.map((s, i) => {
        const o = s as Record<string, unknown>;
        const label =
          typeof o.label === "string"
            ? o.label
            : typeof o.name === "string"
              ? o.name
              : `Adım ${i + 1}`;
        const status = typeof o.status === "string" ? o.status : "pending";
        return { label, status };
      })
    : [];
  return {
    name: run.name,
    label: run.name,
    status: run.status,
    steps,
  };
}
