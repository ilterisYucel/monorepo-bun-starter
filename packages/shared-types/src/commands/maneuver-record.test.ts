import { describe, it, expect } from "vitest";
import {
  commandStepSchema,
  maneuverRecordSchema,
  operationStepSchema,
  operationRecordSchema,
  maneuversFileSchema,
  operationsFileSchema,
  loadManeuversFile,
  loadOperationsFile,
} from "./maneuver";

/**
 * Manevra/operasyon kayıt şemaları sözleşmesi (KOMUT-MANEVRA-OPERASYON
 * MIMARISI §5-§7, REV.02/REV.03):
 *
 * - STRICT: bilinmeyen anahtar her seviyede RED (fail-fast).
 * - CommandStep (REV.02 §5.1): hedef seçicilerden TAM BİRİ; command VEYA
 *   telemetries en az biri; timer {durationMs>0, stopCommand?}.
 * - Manevra: onFailure "rollback" + rollbackSteps YOK → RED (§7.1).
 * - Operasyon: adım union (uzak/local-manevra/local-zincir); onFailure
 *   "rollback" + üst seviye rollback YOK → RED.
 * - Yükleyiciler: bozuk JSON / şema ihlali → ValidationError THROW.
 */

function validStep(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    deviceId: "BSC-1",
    command: "stop",
    ...overrides,
  };
}

describe("commandStepSchema (REV.02 §5.1)", () => {
  it("deviceId'li adım kabul edilir", () => {
    expect(commandStepSchema.safeParse(validStep()).success).toBe(true);
  });

  it("deviceIds / deviceTypes seçicileri kabul edilir", () => {
    expect(
      commandStepSchema.safeParse({
        deviceIds: ["BSC-1", "BSC-2"],
        command: "stop",
      }).success,
    ).toBe(true);
    expect(
      commandStepSchema.safeParse({
        deviceTypes: ["pcs"],
        command: "charge",
        params: { powerKw: "{{divideTotal}}" },
      }).success,
    ).toBe(true);
  });

  it("ham telemetries adımı (komutsuz) kabul edilir", () => {
    expect(
      commandStepSchema.safeParse({
        deviceId: "BSC-1",
        telemetries: [{ name: "Command Request", value: 3 }],
      }).success,
    ).toBe(true);
  });

  it("hiçbir hedef seçici YOK → RED (tam biri zorunlu)", () => {
    const r = commandStepSchema.safeParse({ command: "stop" });
    expect(r.success).toBe(false);
  });

  it("iki seçici birden → RED (tam biri zorunlu)", () => {
    const r = commandStepSchema.safeParse({
      deviceId: "BSC-1",
      deviceIds: ["BSC-2"],
      command: "stop",
    });
    expect(r.success).toBe(false);
  });

  it("command ve telemetries İKİSİ DE yok → RED", () => {
    const r = commandStepSchema.safeParse({ deviceId: "BSC-1" });
    expect(r.success).toBe(false);
  });

  it("timer (REV.03 §10): durationMs pozitif + opsiyonel stopCommand", () => {
    expect(
      commandStepSchema.safeParse({
        deviceId: "BSC-1",
        command: "charge",
        params: { powerKw: 50 },
        timer: { durationMs: 60000, stopCommand: "stop" },
      }).success,
    ).toBe(true);
    const bad = commandStepSchema.safeParse({
      deviceId: "BSC-1",
      command: "stop",
      timer: { durationMs: 0 },
    });
    expect(bad.success).toBe(false);
  });

  it("bilinmeyen anahtar RED (strict)", () => {
    const r = commandStepSchema.safeParse({
      deviceId: "BSC-1",
      command: "stop",
      extra: true,
    });
    expect(r.success).toBe(false);
  });
});

describe("maneuverRecordSchema (§5 + §7.1)", () => {
  it("geçerli kayıt kabul edilir (ui meta dahil)", () => {
    const r = maneuverRecordSchema.safeParse({
      name: "bsc_prepare",
      label: "BSC Hazırlık",
      description: "Kontaktör + start — güç param YOK (K12)",
      mode: "parallel",
      onFailure: "stop",
      steps: [
        { deviceId: "BSC-1", command: "close_contactors" },
        { deviceId: "BSC-1", command: "start" },
      ],
      rollbackSteps: [{ deviceId: "BSC-1", command: "stop" }],
      ui: { inputs: [], timer: false, transform: "divideTotal", hidden: true },
    });
    expect(r.success).toBe(true);
  });

  it("steps boş → RED", () => {
    expect(
      maneuverRecordSchema.safeParse({
        name: "x",
        label: "X",
        mode: "parallel",
        steps: [],
      }).success,
    ).toBe(false);
  });

  it("onFailure 'rollback' + rollbackSteps YOK → RED (§7.1 fail-fast)", () => {
    const r = maneuverRecordSchema.safeParse({
      name: "x",
      label: "X",
      mode: "parallel",
      onFailure: "rollback",
      steps: [validStep()],
    });
    expect(r.success).toBe(false);
  });

  it("rollbackSteps VARSA onFailure rollback kabul edilir", () => {
    const r = maneuverRecordSchema.safeParse({
      name: "x",
      label: "X",
      mode: "parallel",
      onFailure: "rollback",
      steps: [validStep()],
      rollbackSteps: [validStep({ command: "stop" })],
    });
    expect(r.success).toBe(true);
  });

  it("bilinmeyen üst seviye anahtar RED (strict)", () => {
    const r = maneuverRecordSchema.safeParse({
      name: "x",
      label: "X",
      mode: "parallel",
      steps: [validStep()],
      bogus: 1,
    });
    expect(r.success).toBe(false);
  });
});

describe("operationStepSchema / operationRecordSchema (§6)", () => {
  it("uzak adım (system + maneuver) kabul edilir", () => {
    const r = operationStepSchema.safeParse({
      system: "container-1",
      maneuver: "bsc_prepare",
    });
    expect(r.success).toBe(true);
  });

  it("yerel manevra adımı kabul edilir", () => {
    const r = operationStepSchema.safeParse({
      maneuver: "pcs_charge",
      params: { powerKw: 200 },
    });
    expect(r.success).toBe(true);
  });

  it("yerel ham komut zinciri adımı kabul edilir", () => {
    const r = operationStepSchema.safeParse({
      commands: [validStep()],
      mode: "parallel",
    });
    expect(r.success).toBe(true);
  });

  it("system'i OLMAYAN manevra adımı ile boş nesne RED", () => {
    expect(operationStepSchema.safeParse({}).success).toBe(false);
  });

  it("geçerli operasyon: field_charge deseni (§6.1)", () => {
    const r = operationRecordSchema.safeParse({
      name: "field_charge",
      label: "Saha Şarj",
      mode: "sequential",
      onFailure: "rollback",
      steps: [
        { system: "container-1", maneuver: "bsc_prepare" },
        { system: "container-2", maneuver: "bsc_prepare" },
        { maneuver: "pcs_charge", params: { powerKw: 200 } },
      ],
      rollback: [
        { maneuver: "pcs_stop" },
        { system: "container-1", maneuver: "bsc_stop" },
        { system: "container-2", maneuver: "bsc_stop" },
      ],
    });
    expect(r.success).toBe(true);
  });

  it("onFailure 'rollback' + üst seviye rollback YOK → RED", () => {
    const r = operationRecordSchema.safeParse({
      name: "op",
      label: "Op",
      mode: "sequential",
      onFailure: "rollback",
      steps: [{ maneuver: "pcs_charge" }],
    });
    expect(r.success).toBe(false);
  });
});

describe("dosya kökleri + fail-fast yükleyiciler", () => {
  it("maneuvers.json kök şeması: maneuvers min 1; bilinmeyen anahtar RED", () => {
    expect(
      maneuversFileSchema.safeParse({
        maneuvers: [{ name: "a", label: "A", mode: "parallel", steps: [validStep()] }],
      }).success,
    ).toBe(true);
    expect(maneuversFileSchema.safeParse({ maneuvers: [] }).success).toBe(false);
    expect(
      maneuversFileSchema.safeParse({
        maneuvers: [],
        extra: 1,
      }).success,
    ).toBe(false);
  });

  it("loadManeuversFile: bozuk JSON → throw", () => {
    expect(() => loadManeuversFile("{ bozuk")).toThrow();
  });

  it("loadManeuversFile: şema ihlali → throw (fail-fast)", () => {
    expect(() =>
      loadManeuversFile(
        JSON.stringify({
          maneuvers: [
            { name: "a", label: "A", mode: "parallel", onFailure: "rollback", steps: [] },
          ],
        }),
      ),
    ).toThrow();
  });

  it("loadOperationsFile: geçerli dosya parse edilir", () => {
    const file = loadOperationsFile(
      JSON.stringify({
        operations: [
          {
            name: "field_charge",
            label: "Saha Şarj",
            mode: "sequential",
            steps: [{ maneuver: "pcs_charge", params: { powerKw: 200 } }],
          },
        ],
      }),
    );
    expect(file.operations[0]!.name).toBe("field_charge");
  });
});
