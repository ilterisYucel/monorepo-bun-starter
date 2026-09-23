import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  loadManeuversFile,
  loadOperationsFile,
} from "@gd-monorepo/shared-types";
import { ManeuverRegistry } from "./maneuver-registry";

/**
 * A3 migrasyon sözleşmesi (KOMUT-MANEVRA-OPERASYON §5, A3):
 *
 * - Tier config dosyaları (services/web-service/deployment/config-docker ve
 *   config-field) fail-fast yüklenir (bozuk kayıt → THROW; servis açılmaz).
 * - Konteyner kataloğu İP-1/İP-2 temizliğinin birebir yansımasıdır:
 *   BSC charge/discharge YOK (K12); koruma kartları kurallara taşındı (K-A5);
 *   bsc_prepare (K12: güç paramı YOK) + bsc_stop uzak adım kayıtları.
 * - Field kataloğu REV.01 §7: FL-02 → OPERASYON (field_charge/discharge);
 *   pcs_charge deviceTypes seçicili + divideTotal; FL-11 → field_maintenance.
 */

const CONTAINER_MANEUVERS_PATH = fileURLToPath(
  new URL(
    "../../../../services/web-service/deployment/config-docker/maneuvers.json",
    import.meta.url,
  ),
);
const FIELD_MANEUVERS_PATH = fileURLToPath(
  new URL(
    "../../../../services/web-service/deployment/config-field/maneuvers.json",
    import.meta.url,
  ),
);
const FIELD_OPERATIONS_PATH = fileURLToPath(
  new URL(
    "../../../../services/web-service/deployment/config-field/operations.json",
    import.meta.url,
  ),
);

function read(path: string): string {
  return readFileSync(path, "utf-8");
}

describe("konteyner maneuvers.json (A3 migrasyon)", () => {
  it("fail-fast yüklenir — 11 kayıt", () => {
    const file = loadManeuversFile(read(CONTAINER_MANEUVERS_PATH));
    expect(file.maneuvers).toHaveLength(11);
  });

  it("registry isimle çözer (bsc_prepare, fl03, fl05 force)", async () => {
    const registry = new ManeuverRegistry({
      maneuvers: loadManeuversFile(read(CONTAINER_MANEUVERS_PATH)).maneuvers,
    });
    for (const name of [
      "fl01_start",
      "fl03_emergency_stop",
      "fl05_tms_cooling_force",
      "fl05_tms_heating_force",
      "fl09_comm_loss",
      "fl10_maintenance_shutdown",
      "fl_dc_breaker_close",
      "fl_contactor_close",
      "fl_idle",
      "bsc_stop",
      "bsc_prepare",
    ]) {
      expect((await registry.resolve("maneuver", name)).isOk(), name).toBe(true);
    }
  });

  it("K12: hiçbir adımda BSC charge/discharge komutu YOK", () => {
    const file = loadManeuversFile(read(CONTAINER_MANEUVERS_PATH));
    for (const record of file.maneuvers) {
      for (const step of record.steps) {
        expect(step.command, record.name).not.toBe("charge");
        expect(step.command, record.name).not.toBe("discharge");
      }
    }
  });

  it("bsc_prepare güç param'ı TAŞIMAZ (K12 sözleşmesi)", () => {
    const file = loadManeuversFile(read(CONTAINER_MANEUVERS_PATH));
    const prepare = file.maneuvers.find((m) => m.name === "bsc_prepare")!;
    expect(prepare.steps.some((s) => s.command === "close_contactors")).toBe(true);
    expect(prepare.steps.some((s) => s.command === "start")).toBe(true);
    for (const step of prepare.steps) {
      expect(step.params?.powerKw).toBeUndefined();
    }
  });
});

describe("field maneuvers.json (A3 migrasyon — REV.01)", () => {
  it("fail-fast yüklenir — 11 kayıt", () => {
    const file = loadManeuversFile(read(FIELD_MANEUVERS_PATH));
    expect(file.maneuvers).toHaveLength(11);
  });

  it("deviceTypes seçicili adımlar (PCS tip çözümlemesi yürütücüde)", () => {
    const file = loadManeuversFile(read(FIELD_MANEUVERS_PATH));
    const charge = file.maneuvers.find((m) => m.name === "pcs_charge")!;
    expect(charge.steps[0]!.deviceTypes).toEqual(["pcs"]);
    expect(charge.steps[0]!.params).toEqual({ powerKw: "{{divideTotal}}" });
    expect(charge.ui?.transform).toBe("divideTotal");
  });

  it("fl06/fl07/fl10 gizli; fl01/fl03/fl04/fl05 görünür", () => {
    const file = loadManeuversFile(read(FIELD_MANEUVERS_PATH));
    for (const name of ["fl06_recovery", "fl07_comm_loss", "fl10_islanding"]) {
      expect(
        file.maneuvers.find((m) => m.name === name)?.ui?.hidden,
        name,
      ).toBe(true);
    }
    for (const name of ["fl01_startup", "fl03_idle", "fl04_calibration", "fl05_emergency_stop"]) {
      expect(
        file.maneuvers.find((m) => m.name === name)?.ui?.hidden ?? false,
        name,
      ).toBe(false);
    }
  });

  it("FL-02 kartları manevra kaydında YOK — OPERASYON'a taşındı (§7)", () => {
    const file = loadManeuversFile(read(FIELD_MANEUVERS_PATH));
    expect(file.maneuvers.some((m) => m.name === "fl02_charge")).toBe(false);
    expect(file.maneuvers.some((m) => m.name === "fl02_discharge")).toBe(false);
  });
});

describe("field operations.json (A3 migrasyon — §6.1)", () => {
  it("fail-fast yüklenir — 3 operasyon", () => {
    const file = loadOperationsFile(read(FIELD_OPERATIONS_PATH));
    expect(file.operations).toHaveLength(3);
  });

  it("field_charge: uzak bsc_prepare ×2 + yerel pcs_charge; rollback ters set", () => {
    const file = loadOperationsFile(read(FIELD_OPERATIONS_PATH));
    const op = file.operations.find((o) => o.name === "field_charge")!;
    expect(op.mode).toBe("sequential");
    expect(op.onFailure).toBe("rollback");
    expect(op.steps).toHaveLength(3);
    expect(op.steps[0]).toMatchObject({
      system: "container-1",
      maneuver: "bsc_prepare",
    });
    expect(op.steps[2]).toMatchObject({
      maneuver: "pcs_charge",
      params: { powerKw: 200 },
    });
    expect(op.rollback?.map((r) => "maneuver" in r ? r.maneuver : "chain")).toEqual(
      ["pcs_stop", "bsc_stop", "bsc_stop"],
    );
  });

  it("field_maintenance (FL-11): uzak bakım kapatması + yerel stop", () => {
    const file = loadOperationsFile(read(FIELD_OPERATIONS_PATH));
    const op = file.operations.find((o) => o.name === "field_maintenance")!;
    expect(op.steps[0]).toMatchObject({
      system: "container-1",
      maneuver: "fl10_maintenance_shutdown",
    });
    expect(op.steps[1]).toMatchObject({ maneuver: "pcs_stop" });
  });

  it("registry operasyon isimlerini çözer", async () => {
    const registry = new ManeuverRegistry({
      operations: loadOperationsFile(read(FIELD_OPERATIONS_PATH)).operations,
    });
    for (const name of ["field_charge", "field_discharge", "field_maintenance"]) {
      expect((await registry.resolve("operation", name)).isOk(), name).toBe(true);
    }
  });
});
