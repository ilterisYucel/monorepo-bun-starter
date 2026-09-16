import { describe, it, expect } from "vitest";
import {
  buildFieldManeuvers,
  buildFieldManeuverControls,
  resolveSteps,
  FIELD_HIDDEN_MANEUVER_NAMES,
  stepsFor,
} from "./maneuvers";

/**
 * field manevra kataloğu REV.01 sözleşmesi (FIELD-MANEVRA-KATALOGU-REV01-MIMARISI):
 * - Sabit PCS listesi YOKTUR — adımlar dışarıdan verilen pcsIds'ten üretilir.
 * - Kartlar: FL-01 (start/shutdown), FL-02 (charge/discharge — santral gücü
 *   eşit dağıtım), FL-03 (idle = set_power_zero), FL-04 (kalibrasyon — timer'lı,
 *   ön koşul standby), FL-05 (emergency stop), FL-11 (maintenance).
 * - GİZLİ (UI'da gösterilmez): FL-06 recovery, FL-07 comm loss, FL-10 islanding —
 *   otomasyon/koşul manevraları (doküman: frontend'de GÖSTERİLMEYECEK).
 * - Grup seçimi: controls'ta select input ("" = santral seviyesi); resolveSteps
 *   seçili gruba göre adımları daraltır + transform'u uygular.
 * - Dağıtım: santral gücü adım sayısına eşit bölünür (küsürat yuvarlanır).
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

describe("buildFieldManeuvers (REV.01)", () => {
  const pcsIds = ["PCS-1", "PCS-2"];

  it("kart manevraları + gizli manevralar birlikte üretilir", () => {
    const maneuvers = buildFieldManeuvers(pcsIds);
    expect(Object.keys(maneuvers)).toEqual([
      "fl01_startup",
      "fl01_shutdown",
      "fl02_charge",
      "fl02_discharge",
      "fl03_idle",
      "fl04_calibration",
      "fl05_emergency_stop",
      "fl11_maintenance",
      "fl06_recovery",
      "fl07_comm_loss",
      "fl10_islanding",
    ]);
  });

  it("FL-01 başlatma tüm PCS'lere start gönderir", () => {
    const m = buildFieldManeuvers(pcsIds).fl01_startup;
    expect(m.mode).toBe("parallel");
    expect(m.steps.map((s) => s.command)).toEqual(["start", "start"]);
  });

  it("FL-03 idle: set_power_zero (şarj/deşarj yok — güç sıfır)", () => {
    const m = buildFieldManeuvers(pcsIds).fl03_idle;
    expect(m.steps.map((s) => s.command)).toEqual([
      "set_power_zero",
      "set_power_zero",
    ]);
  });

  it("FL-05 emergency stop: stop + rollback yok", () => {
    const m = buildFieldManeuvers(pcsIds).fl05_emergency_stop;
    expect(m.steps.map((s) => s.command)).toEqual(["stop", "stop"]);
    expect(m.rollbackSteps ?? []).toEqual([]);
  });

  it("FL-02 şarj: rollback = stop (güvenli geri dönüş)", () => {
    const m = buildFieldManeuvers(pcsIds).fl02_charge;
    expect(m.steps.map((s) => s.command)).toEqual(["charge", "charge"]);
    expect((m.rollbackSteps ?? []).map((s) => s.command)).toEqual([
      "stop",
      "stop",
    ]);
  });

  it("gizli manevralar: FL-06 fault_reset+standby, FL-07/FL-10 stop", () => {
    const m = buildFieldManeuvers(pcsIds);
    expect(m.fl06_recovery.steps.map((s) => s.command)).toEqual([
      "fault_reset",
      "fault_reset",
      "standby",
      "standby",
    ]);
    expect(m.fl07_comm_loss.steps.map((s) => s.command)).toEqual(["stop", "stop"]);
    expect(m.fl10_islanding.steps.map((s) => s.command)).toEqual(["stop", "stop"]);
  });

  it("gizli set: FL-06/FL-07/FL-10", () => {
    expect(FIELD_HIDDEN_MANEUVER_NAMES.has("fl06_recovery")).toBe(true);
    expect(FIELD_HIDDEN_MANEUVER_NAMES.has("fl07_comm_loss")).toBe(true);
    expect(FIELD_HIDDEN_MANEUVER_NAMES.has("fl10_islanding")).toBe(true);
    expect(FIELD_HIDDEN_MANEUVER_NAMES.has("fl02_charge")).toBe(false);
  });

  it("boş pcsIds → tüm manevralar boş adımlı", () => {
    const m = buildFieldManeuvers([]);
    expect(m.fl01_startup.steps).toEqual([]);
    expect(m.fl05_emergency_stop.steps).toEqual([]);
  });
});

describe("buildFieldManeuverControls (REV.01)", () => {
  it("FL-02 için grup seçimi + güç girdisi + dağıtım transform'u", () => {
    const controls = buildFieldManeuverControls(["PCS-1", "PCS-2"]);
    const c = controls.fl02_charge;
    expect(c).toBeDefined();
    expect(c.inputs?.map((i) => i.name)).toEqual(["group", "powerKw"]);
    const groupInput = c.inputs![0]!;
    expect(groupInput.options?.map((o) => o.value)).toEqual([-1, 0, 1]);
    const powerInput = c.inputs![1]!;
    expect(powerInput.type).toBe("number");
    expect(powerInput.default).toBe(500);
  });

  it("FL-04 kalibrasyon timer'lıdır", () => {
    const controls = buildFieldManeuverControls(["PCS-1"]);
    expect(controls.fl04_calibration?.timerConfig).toBe(true);
  });
});

describe("resolveSteps (grup + dağıtım)", () => {
  const pcsIds = ["PCS-1", "PCS-2"];
  const maneuvers = buildFieldManeuvers(pcsIds);
  const controls = buildFieldManeuverControls(pcsIds);

  it("santral seviyesi: güç adım sayısına eşit bölünür", () => {
    const steps = resolveSteps(
      maneuvers.fl02_charge,
      { group: -1, powerKw: 500 },
      controls.fl02_charge?.transform,
      pcsIds,
    );
    expect(steps).toHaveLength(2);
    expect(steps[0]!.params).toEqual({ powerKw: 250 });
    expect(steps[1]!.params).toEqual({ powerKw: 250 });
  });

  it("grup seçili: yalnızca o grup + gücün tamamı", () => {
    const steps = resolveSteps(
      maneuvers.fl02_discharge,
      { group: 1, powerKw: 500 },
      controls.fl02_discharge?.transform,
      pcsIds,
    );
    expect(steps).toHaveLength(1);
    expect(steps[0]!.deviceId).toBe("PCS-2");
    expect(steps[0]!.params).toEqual({ powerKw: 500 });
  });

  it("transform yoksa adımlar aynen döner (param eklenmez)", () => {
    const steps = resolveSteps(
      maneuvers.fl05_emergency_stop,
      { group: -1, powerKw: 0 },
      undefined,
      pcsIds,
    );
    expect(steps).toHaveLength(2);
    expect(steps[0]!.params).toBeUndefined();
  });

  it("tek PCS'e dağıtım: küsürat aşağı yuvarlanır, toplam korunur", () => {
    const steps = resolveSteps(
      maneuvers.fl02_charge,
      { group: -1, powerKw: 1000 },
      controls.fl02_charge?.transform,
      pcsIds,
    );
    expect(steps).toHaveLength(2);
    expect(steps[0]!.params).toEqual({ powerKw: 500 });
    expect(steps[1]!.params).toEqual({ powerKw: 500 });
  });
});
