import { describe, it, expect } from "vitest";
import { buildFieldManeuvers, stepsFor } from "./maneuvers";

/**
 * field-control/maneuvers sözleşmesi (2026-08-30 — konteyner başına TEK PCS):
 * - Sabit PCS listesi YOKTUR: adımlar dışarıdan verilen pcsIds'ten üretilir
 *   (saha device-service kayıt defterinin önizlemesi).
 * - buildFieldManeuvers: 3 saha manevrası (charge/discharge/emergency-stop),
 *   her adım bir PCS'e gider; mode parallel, onFailure continue.
 * - Boş pcsIds → boş steps (çalıştırılacak hedef yok).
 */

describe("stepsFor", () => {
  it("her PCS kimliği için bir komut adımı üretir", () => {
    expect(stepsFor("charge", ["PCS-1", "PCS-2"])).toEqual([
      { deviceId: "PCS-1", command: "charge" },
      { deviceId: "PCS-2", command: "charge" },
    ]);
  });

  it("boş liste → boş adım listesi", () => {
    expect(stepsFor("stop", [])).toEqual([]);
  });
});

describe("buildFieldManeuvers", () => {
  it("3 manevra üretir ve adımları pcsIds'e yayar", () => {
    const maneuvers = buildFieldManeuvers(["PCS-1", "PCS-2", "PCS-3"]);
    expect(Object.keys(maneuvers)).toEqual([
      "field_charge_all",
      "field_discharge_all",
      "field_emergency_stop",
    ]);
    const charge = maneuvers.field_charge_all;
    expect(charge.mode).toBe("parallel");
    expect(charge.onFailure).toBe("continue");
    expect(charge.steps.map((s) => s.command)).toEqual([
      "charge",
      "charge",
      "charge",
    ]);
    expect(charge.steps.map((s) => s.deviceId)).toEqual([
      "PCS-1",
      "PCS-2",
      "PCS-3",
    ]);
    const stop = maneuvers.field_emergency_stop;
    expect(stop.steps.map((s) => s.command)).toEqual(["stop", "stop", "stop"]);
  });

  it("boş pcsIds → manevralar boş adımlı üretilir", () => {
    const maneuvers = buildFieldManeuvers([]);
    expect(maneuvers.field_charge_all.steps).toEqual([]);
    expect(maneuvers.field_discharge_all.steps).toEqual([]);
    expect(maneuvers.field_emergency_stop.steps).toEqual([]);
  });
});
